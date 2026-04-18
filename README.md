# Grabpic — Intelligent Identity & Retrieval Engine

FastAPI backend that ingests event photos, groups faces into stable `grab_id`s via
DeepFace (ArcFace) embeddings stored in Postgres + pgvector, and exposes a
selfie-based authentication and image-retrieval API.

## Architecture

```
+-------------------+     +----------------------+     +---------------------+
|  POST /ingest     | --> |  ingest service      | --> |  DeepFace (ArcFace) |
|  (crawl dir)      |     |  - sha256 dedupe     |     |  512-d embeddings   |
+-------------------+     |  - per-face loop     |     +---------------------+
                          |  - assign_grab_id()  |                |
                          +----------+-----------+                v
                                     |                +-------------------------+
                                     v                | Postgres + pgvector     |
                           +---------------------+    |  images / faces /       |
                           |  matcher (cosine)   |<-->|  grab_ids (centroid)    |
                           |  streaming centroid |    |  ivfflat cosine indexes |
                           +---------------------+    +-------------------------+
                                     ^                           ^
+-------------------+                |                           |
| POST /auth/selfie | ---------------+                           |
+-------------------+                                            |
+----------------------------+                                   |
| GET /grabs/{id}/images     | ----------------------------------+
| GET /files/{image_id}      |
+----------------------------+
```

## Schema

- `images(id uuid pk, path text unique, sha256 text unique, created_at)`
- `grab_ids(id uuid pk, centroid vector(512), face_count int, created_at)`
- `faces(id uuid pk, image_id fk, grab_id fk, embedding vector(512), bbox jsonb, created_at)`
- Indexes: `ivfflat` cosine on `faces.embedding` and `grab_ids.centroid`.

**Design note.** Each `grab_id` keeps a running-mean centroid of its member
embeddings (L2 renormalized). Matching is top-1 cosine search against centroids,
gated by `MATCH_THRESHOLD` (default `0.55` for ArcFace). This avoids an offline
clustering job while still converging to stable identities.

## Prerequisites

- Python 3.11+
- Postgres 14+ with the `pgvector` extension available
  - `CREATE DATABASE grabpic;`
  - `psql grabpic -c "CREATE EXTENSION vector;"` (also attempted automatically at startup)

## Setup

```bash
cp .env.example .env
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Put some event photos under `./storage/raw/` (JPG/PNG/WebP). Subdirectories OK.

Initialize the DB schema:

```bash
python -m app.db
```

Run the API:

```bash
uvicorn app.main:app --reload
```

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

### `POST /ingest`

Crawls `STORAGE_DIR` (or a subpath), extracts faces, assigns `grab_id`s.

```bash
curl -X POST http://localhost:8000/ingest \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Optional subpath:

```bash
curl -X POST http://localhost:8000/ingest \
  -H 'Content-Type: application/json' \
  -d '{"path":"day1"}'
```

Response:

```json
{"processed": 42, "skipped": 0, "faces_detected": 117, "grab_ids_created": 58}
```

### `POST /auth/selfie`

Upload a selfie; returns the matching `grab_id` (which acts as the authorizer).

```bash
curl -X POST http://localhost:8000/auth/selfie \
  -F 'file=@/path/to/selfie.jpg'
```

Response:

```json
{"grab_id": "d0b2...-...-...", "confidence": 0.81}
```

`401` if no identity is above threshold, `400` if no face detected.

### `GET /grabs/{grab_id}/images`

Returns every image containing the given identity.

```bash
curl http://localhost:8000/grabs/d0b2.../images
```

Response:

```json
{
  "grab_id": "d0b2...",
  "images": [
    {"id": "c1...", "path": "/abs/storage/raw/day1/IMG_0001.jpg",
     "url": "http://localhost:8000/files/c1..."}
  ]
}
```

### `GET /files/{image_id}`

Streams the original image bytes (so raw paths are not exposed to clients).

### `GET /healthz`

Liveness.

## Error format

All errors are JSON of the form:

```json
{"error": {"code": "unauthorized", "message": "No matching identity"}}
```

## Configuration (`.env`)

| Var | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+psycopg://postgres:postgres@localhost:5432/grabpic` | Postgres DSN |
| `STORAGE_DIR` | `./storage/raw` | Root crawl directory |
| `MATCH_THRESHOLD` | `0.55` | Cosine similarity cutoff for grab_id match |
| `MAX_UPLOAD_MB` | `8` | Selfie upload size cap |
| `FACE_MODEL` | `ArcFace` | DeepFace model |
| `FACE_DETECTOR` | `retinaface` | DeepFace detector |

## Frontend (Next.js)

A Next.js App Router + Tailwind UI lives in `web/`. Pages:

- `/` — landing
- `/upload` — drag-drop photos → `POST /upload` → trigger `POST /ingest`
- `/find` — webcam or file selfie → `POST /auth/selfie` → gallery via `GET /grabs/{id}/images`

Local dev:

```bash
cd web
cp .env.local.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev                          # http://localhost:3000
```

## Deployment

### Backend → Render (Docker + Postgres + persistent disk)

1. Push this repo to GitHub.
2. In Render, click **New → Blueprint** and point at the repo. The included
   `render.yaml` provisions:
   - `grabpic-api` web service (Docker) with a 1 GB persistent disk at `/data`
   - `grabpic-db` Postgres (Starter)
3. On first deploy, open the Postgres instance shell and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
   (The app also attempts this on startup; doing it up-front avoids a race on
   the first ingest.)
4. Set `FRONTEND_ORIGIN` on the web service to your Vercel URL once it's live.
5. Health check path is `/healthz`.

Key env vars (see `render.yaml`):

| Var | Value |
| --- | --- |
| `DATABASE_URL` | from Render Postgres (auto) |
| `STORAGE_DIR` | `/data/storage/raw` |
| `DEEPFACE_HOME` | `/data/.deepface` (model cache survives redeploys) |
| `MATCH_THRESHOLD` | `0.55` |
| `FRONTEND_ORIGIN` | `https://<your-app>.vercel.app` |

### Frontend → Vercel

1. In Vercel, **Import Project** from GitHub.
2. Set **Root Directory** to `web`.
3. Add env var `NEXT_PUBLIC_API_URL=https://<render-service>.onrender.com`.
4. Deploy. Copy the final Vercel URL back into the backend's `FRONTEND_ORIGIN`
   and redeploy the backend.

## Notes & limitations

- DeepFace downloads model weights on first use (~100 MB). Startup calls
  `warmup()` to front-load this cost; `DEEPFACE_HOME` on the persistent disk
  keeps them across deploys.
- Ingest is synchronous for demo simplicity; for production move to a worker
  queue (e.g. RQ/Celery/Arq) and batch embedding inference on GPU.
- `/upload` has no auth gate — anyone hitting the API can write to
  `STORAGE_DIR`. Put Cloudflare / an auth proxy in front before going public.
