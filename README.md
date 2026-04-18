# Grabpic — Intelligent Identity & Retrieval Engine

> *An ounce of requirements is worth a pound of coding.*

A photo-discovery backend for large-scale events: ingest thousands of raw photos,
group faces automatically into stable `grab_id`s via face-recognition embeddings
stored in Postgres + pgvector, then let an attendee **authenticate with a selfie**
to retrieve every photo they appear in.

- **Backend**: FastAPI (Python 3.11), SQLAlchemy 2, Postgres 16 + pgvector, dlib-based face recognition (128-d embeddings).
- **Frontend**: Next.js 14 (App Router) + Tailwind + shadcn-style UI in [`web/`](./web).
- **Deployment**: Render (Docker + managed Postgres) for the API, Vercel for the web UI.

---

## Table of Contents

- [Architecture](#architecture)
- [Schema](#schema)
- [API](#api)
- [Local Development](#local-development)
- [Frontend](#frontend-nextjs)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Design Notes](#design-notes)
- [Limitations & Trade-offs](#limitations--trade-offs)

---

## Architecture

```
            ┌──────────────┐         ┌──────────────────┐
  Photos ─▶ │ POST /upload │──────▶ STORAGE_DIR on disk
            └──────────────┘         └──────────────────┘
                                              │
            ┌──────────────┐                  ▼
  Trigger ─▶│ POST /ingest │──┐   ┌─────────────────────────┐
            └──────────────┘  │   │ ingest service          │
                              └──▶│  - sha256 dedupe        │
                                  │  - downscale to 800px   │
                                  │  - dlib HOG detect      │
                                  │  - 128-d encode         │
                                  │  - assign_grab_id()     │
                                  └──────────┬──────────────┘
                                             │
                 ┌────────────────────────────▼─────────────────────────┐
                 │  Postgres + pgvector                                 │
                 │  images  ◀──┐                                        │
                 │             │ 1:N                                    │
                 │  faces  ─── ┘  ─── N:1 ─── grab_ids (centroid)       │
                 │  ivfflat cosine indexes on faces.embedding,          │
                 │                             grab_ids.centroid        │
                 └────────────────────────────▲─────────────────────────┘
                                              │
            ┌──────────────────┐              │ top-1 cosine
 Selfie ─▶  │ POST /auth/selfie│──────────────┘ search, return grab_id
            └──────────────────┘
            ┌─────────────────────────────┐
            │ GET /grabs/{id}/images      │ ─▶ JSON list + /files/{id} URLs
            │ GET /files/{image_id}       │ ─▶ streams original bytes
            └─────────────────────────────┘
```

Every step is fronted by FastAPI routes with unified JSON error envelopes
(`{"error": {"code", "message"}}`), Swagger at `/docs`, ReDoc at `/redoc`.

## Schema

```sql
CREATE TABLE images (
  id         uuid        PRIMARY KEY,
  path       text        NOT NULL UNIQUE,
  sha256     text        NOT NULL UNIQUE,   -- idempotent ingest
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE grab_ids (
  id         uuid        PRIMARY KEY,
  centroid   vector(128) NOT NULL,          -- streaming mean of members, L2-normalized
  face_count int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE faces (
  id         uuid        PRIMARY KEY,
  image_id   uuid        NOT NULL REFERENCES images(id)   ON DELETE CASCADE,
  grab_id    uuid        NOT NULL REFERENCES grab_ids(id) ON DELETE CASCADE,
  embedding  vector(128) NOT NULL,
  bbox       jsonb,                                        -- {"x","y","w","h"}
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX faces_embedding_cos_idx    ON faces    USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX grab_ids_centroid_cos_idx  ON grab_ids USING ivfflat (centroid  vector_cosine_ops);
```

One image → many `faces` → each `face` → one `grab_id`. A photo of three people
becomes 1 `images` row + 3 `faces` rows pointing at (up to) 3 distinct
`grab_ids`, which directly satisfies the "one image to many grab_ids" mapping
requirement.

## API

Base URL in prod: `https://<your-render-service>.onrender.com`

**Docs:**
- 📘 **[Full endpoint reference → `docs/API.md`](./docs/API.md)**
- 🧪 **Swagger UI** (interactive, try-it-out): `/docs`
- 📕 **ReDoc**: `/redoc`
- 🤖 **OpenAPI JSON**: `/openapi.json`
- 📮 **Postman collection**: [`docs/grabpic.postman_collection.json`](./docs/grabpic.postman_collection.json) — import into Postman and set `baseUrl`.

| Method | Path                      | Purpose                                         |
|-------:|---------------------------|-------------------------------------------------|
| GET    | `/healthz`                | Liveness probe                                  |
| POST   | `/upload`                 | Multipart upload one or many photos into STORAGE_DIR |
| POST   | `/ingest`                 | Crawl STORAGE_DIR, detect faces, assign grab_ids |
| POST   | `/auth/selfie`            | Match a selfie → `{grab_id, confidence}` or 401 |
| GET    | `/grabs/{grab_id}/images` | List photos containing the given identity      |
| GET    | `/files/{image_id}`       | Stream original image bytes                     |

### Curl recipes

**Upload photos (bulk):**
```bash
curl -X POST https://grabpic-api.onrender.com/upload \
  -F 'files=@/path/to/photo1.jpg' \
  -F 'files=@/path/to/photo2.jpg'
```

**Run ingest over the whole storage dir:**
```bash
curl -X POST https://grabpic-api.onrender.com/ingest \
  -H 'Content-Type: application/json' -d '{}'
# {"processed": 42, "skipped": 0, "faces_detected": 117, "grab_ids_created": 58}
```

**Authenticate with a selfie:**
```bash
curl -X POST https://grabpic-api.onrender.com/auth/selfie \
  -F 'file=@/path/to/selfie.jpg'
# {"grab_id":"d0b2f...","confidence":0.94}
```

**Fetch every image for an identity:**
```bash
curl https://grabpic-api.onrender.com/grabs/d0b2f.../images
```

### Error shape

```json
{"error": {"code": "unauthorized", "message": "No matching identity"}}
```

Codes emitted: `bad_request` (400), `unauthorized` (401), `not_found` (404),
`payload_too_large` (413), `unsupported_media_type` (415), `validation_error` (422),
`internal_error` (500).

## Local Development

### Prerequisites

- Python **3.11** (TensorFlow/dlib wheels and many deps don't have 3.14 builds yet)
- Postgres 14+ with `pgvector` installed
- Node.js 18+ for the frontend

### Backend

```bash
# Postgres
createdb grabpic
psql grabpic -c "CREATE EXTENSION vector;"

# Python env
cp .env.example .env
/opt/homebrew/bin/python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Schema
python -m app.db

# Run
uvicorn app.main:app --reload
# Swagger: http://localhost:8000/docs
```

Drop JPG/PNG/WebP photos under `./storage/raw/` (subfolders OK), then `POST /ingest`.

### Frontend

```bash
cd web
cp .env.local.example .env.local           # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev                                  # http://localhost:3000
```

Pages:

- `/` — landing
- `/upload` — drag-drop photos → `POST /upload`, then one click → `POST /ingest`
- `/find` — webcam or file selfie → `POST /auth/selfie` → gallery

## Deployment

### Backend → Render

One-click via the included `render.yaml` (no persistent disk on free tier).

1. Push to GitHub.
2. Render Dashboard → **New → Blueprint** → connect the repo.
3. Render reads `render.yaml` and provisions:
   - `grabpic-api` — Docker web service on the **Free** plan
   - `grabpic-db` — Postgres 16 on the **Free** plan
4. Once the database is up, open its **PSQL** shell and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
5. Set `FRONTEND_ORIGIN` on `grabpic-api` to your Vercel URL (see below) and redeploy.
6. Health check path is `/healthz`.

> **First build takes ~2 min** (the Docker image uses the prebuilt `dlib-bin`
> wheel, so no C++ compilation). Subsequent deploys hit Docker layer cache and
> are faster.

### Frontend → Vercel

1. Vercel → **Import Project** from GitHub.
2. **Root Directory**: `web`.
3. Add env var: `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com` (no trailing slash).
4. Deploy. Copy the Vercel URL back into the Render backend's `FRONTEND_ORIGIN` and redeploy the API so CORS lets the browser through.

> `NEXT_PUBLIC_*` env vars are baked in at **build time**. After changing
> `NEXT_PUBLIC_API_URL`, you must click **Redeploy** on the latest deployment.

## Configuration

Everything is env-driven via `pydantic-settings`.

| Var                 | Default                                                        | Purpose                                       |
|---------------------|----------------------------------------------------------------|-----------------------------------------------|
| `DATABASE_URL`      | `postgresql+psycopg://postgres:postgres@localhost:5432/grabpic`| Postgres DSN. `postgres://` is auto-rewritten. |
| `STORAGE_DIR`       | `./storage/raw`                                                | Root dir that `/ingest` crawls               |
| `MATCH_THRESHOLD`   | `0.92`                                                         | Cosine-similarity cutoff for a grab_id match |
| `MAX_UPLOAD_MB`     | `8`                                                            | Selfie / per-file upload size cap            |
| `FRONTEND_ORIGIN`   | `*`                                                            | CORS allowlist (comma-separated)             |
| `EMBEDDING_DIM`     | `128`                                                          | Must match the DB vector dimension           |

## Design Notes

### Grab ID assignment (centroid matching)

```
for each detected face F in an image:
  (nearest_grab, sim) = top-1 cosine search on grab_ids.centroid
  if sim ≥ MATCH_THRESHOLD:
      nearest_grab.centroid = L2_normalize((centroid * N + F) / (N + 1))
      nearest_grab.face_count = N + 1
      attach F to nearest_grab
  else:
      create new grab_id with F as initial centroid
      attach F to it
```

A streaming mean keeps centroids stable as more photos of the same person
arrive, without a separate offline clustering job. `ivfflat` cosine indexes
keep retrieval sub-linear.

### Why dlib (and not InsightFace / ArcFace / DeepFace) — a forced trade-off

The short version: **Render's free tier gives a web service 512 MB of RAM, and
that's the ceiling every choice in this stack is bending around.**

The original design used **DeepFace with ArcFace** (512-d embeddings) behind
**RetinaFace** for detection. That stack is ~2.5× more accurate on benchmarks
(LFW ~99.6% vs dlib's ~99.1%), handles side profiles, occlusion, and poor
lighting far better, and produces embeddings that generalise across ages. At
50k photos and thousands of unique identities, that accuracy gap is the
difference between "my photos" and "someone else's photos". But it also needs:

- **~900 MB peak RAM** at first inference (TensorFlow graph + ArcFace +
  RetinaFace weights + image pyramids).
- **~100 MB of model weights** downloaded on first use.
- **20–30 seconds** of cold-start model loading.

On Render's 512 MB free plan, the worker was OOM-killed the moment
`/auth/selfie` or `/ingest` touched the model, returning `502 Bad Gateway`
from Cloudflare. No amount of ingest-loop optimisation rescues that.

So I swapped to **dlib's ResNet face encoder** (`face_recognition` is a thin
wrapper): 128-d embeddings, HOG-based detector, ~200 MB peak RAM, built into a
prebuilt `dlib-bin` wheel so the Docker build is ~2 min instead of ~20 min.
Accuracy is still good enough for a demo — people with clean, frontal,
well-lit photos are grouped correctly and selfie auth lands on the right
identity.

**What breaks with dlib at production scale:**

- **Profile shots** — HOG detector barely recognises faces past ~30° yaw.
- **Small faces** — in a crowd photo, anyone >10 m from the camera is
  typically missed entirely.
- **Twins / siblings / similar-looking people** — 128-d encodings cluster
  them together more often than ArcFace's 512-d ones. This is why the
  demo threshold had to be tightened to 0.92 — stricter than typical dlib
  setups.
- **Rotated / off-axis faces** — produce noisy embeddings that drift
  centroid means.

**If I had a paid tier ($25/mo Render Standard, 2 GB RAM) or a local box,
here's exactly what I'd change:**

1. Swap `face-recognition` for **InsightFace** (ONNX runtime, ArcFace
   buffalo_l model). Faster than dlib on CPU, more accurate than DeepFace.
2. Bump `EMBEDDING_DIM` in `@app/config.py` from `128` to `512` and recreate
   `faces.embedding` + `grab_ids.centroid` columns. Everything else in the
   pipeline (pgvector cosine search, centroid streaming mean, matcher logic)
   is dimension-agnostic.
3. Replace the HOG detector with **RetinaFace** or **SCRFD** — detects faces
   down to ~20 px, handles profiles.
4. Remove the 800 px image downscale. Run inference on full resolution.
5. Drop `MATCH_THRESHOLD` back to ~0.55 (ArcFace-calibrated).
6. Mount a **1 GB persistent disk** at `/data` and pin `DEEPFACE_HOME` /
   `INSIGHTFACE_HOME` there so model weights survive redeploys (eliminates
   the 20-second cold-start hit).
7. Move ingest to a **background worker** (Arq / RQ) — the API returns a job
   ID, and the worker batches embedding inference. Lets `/ingest` survive
   50k-photo runs.

None of those are architectural rewrites — they're config knobs and a few
dependency swaps. The centroid-based `grab_id` assignment, pgvector schema,
sha256 idempotency, and API surface stay exactly as they are. In other words:
**this codebase is optimised for correctness of the mental model, then
deliberately detuned for a $0 infrastructure budget.**

### Memory discipline for free-tier inference

- Every uploaded image is downscaled to **max 800 px** before dlib sees it.
- Bounding boxes are rescaled back to the original image so `faces.bbox`
  always references the source resolution.
- `gc.collect()` after each image caps heap growth during long ingest runs.

### Idempotent ingest

Each image's `sha256` is the primary dedupe key, so `POST /ingest` is safe to
call repeatedly (e.g. after adding new photos). Already-ingested files are
skipped in O(1) via a unique index.

### Image delivery

Paths in the DB reference absolute filesystem locations and are never exposed
to callers. `GET /files/{image_id}` streams bytes via FastAPI's `FileResponse`,
so clients only get opaque UUID URLs.

## Limitations & Trade-offs

- **Free-tier Postgres expires after 90 days** on Render. Grab IDs and photos
  vanish with it; re-run ingest on a new DB.
- **Free-tier web service sleeps after 15 minutes idle** — cold starts take
  30–60 seconds (DB connect + dlib model load).
- **No persistent disk on the Free plan**: uploaded photos live in `/tmp` and
  are wiped on every redeploy/cold-start. Re-upload and re-ingest within the
  same session. Add a `disk:` block to `render.yaml` + upgrade to Starter
  ($7/mo + $0.25/mo per GB) to persist.
- **dlib HOG detector** misses small or heavily rotated faces. Upgrading to
  `cnn` costs ~5× RAM; not viable on Free. Switch to InsightFace on GPU for
  production.
- **Ingest is synchronous**. For 50k photos you want a worker (Arq / Celery /
  RQ) and batch GPU inference. The API surface stays identical.
- **No auth gate on `/upload`**. Anyone with the URL can push photos to
  STORAGE_DIR. Put Cloudflare Access / an auth proxy in front before you open
  this up.

## Repository Layout

```
.
├─ app/                    FastAPI backend
│  ├─ main.py              app factory, CORS, exception handlers, lifespan
│  ├─ config.py            pydantic-settings + DB URL normalization
│  ├─ db.py                SQLAlchemy engine, init_db() with CREATE EXTENSION
│  ├─ models.py            Image / Face / GrabId ORM models
│  ├─ schemas.py           Pydantic request / response models
│  ├─ deps.py              FastAPI dependencies (get_db)
│  ├─ services/
│  │   ├─ faces.py         dlib detect + encode wrapper, image downscaling
│  │   ├─ matcher.py       pgvector cosine search + streaming centroid upsert
│  │   └─ ingest.py        filesystem crawl + idempotent ingest loop
│  └─ routers/             ingest / upload / auth / images routes
├─ web/                    Next.js 14 frontend (App Router)
│  ├─ app/                 landing / upload / find pages
│  ├─ components/          webcam capture, dropzone, gallery, UI primitives
│  └─ lib/api.ts           typed fetch client
├─ Dockerfile              Python 3.11 slim + dlib-bin runtime libs
├─ render.yaml             Render blueprint (free tier, web + Postgres)
├─ requirements.txt
└─ README.md
```

## License

MIT. Submission for Vyrothon 2026 — "Grabpic" backend problem statement.
