# Grabpic API Reference

> **Interactive docs**
> - Swagger UI: `${API_URL}/docs`
> - ReDoc: `${API_URL}/redoc`
> - OpenAPI JSON: `${API_URL}/openapi.json`
>
> A [Postman collection](./grabpic.postman_collection.json) is also available in this directory. Import it directly into Postman and set the `baseUrl` variable.

Replace `${API_URL}` below with your deployment, e.g. `https://grabpic-api.onrender.com`.

## Conventions

### Content types

- Request: `application/json` or `multipart/form-data` as noted per endpoint.
- Success response: `application/json` (except `/files/{id}` which streams image bytes).

### Authentication

Grabpic issues an opaque `grab_id` (UUID v4) as the **authorizer** for all
identity-bound reads. Obtain it via [`POST /auth/selfie`](#post-authselfie)
and pass it in path parameters of `/grabs/{grab_id}/images`. There is no API
key or session cookie in this MVP.

### Error envelope

Every non-2xx response has this exact shape:

```json
{
  "error": {
    "code": "unauthorized",
    "message": "No matching identity"
  }
}
```

| HTTP | `code`                   | When                                                              |
|-----:|--------------------------|-------------------------------------------------------------------|
| 400  | `bad_request`            | Malformed input (e.g. `path` escapes `STORAGE_DIR`, no face).     |
| 401  | `unauthorized`           | Selfie face detected but no `grab_id` matches above threshold.    |
| 404  | `not_found`              | `grab_id` or `image_id` does not exist, or file missing on disk.  |
| 413  | `payload_too_large`      | Uploaded file exceeds `MAX_UPLOAD_MB`.                            |
| 415  | `unsupported_media_type` | Content type not in `{image/jpeg, image/png, image/webp}`.        |
| 422  | `validation_error`       | Pydantic validation rejected the request body.                    |
| 500  | `internal_error`         | Uncaught server exception (details are logged, not returned).     |

### Rate limits

None enforced in-app. Render's edge may 502 cold-starts on the free tier while
the worker wakes up.

### Versioning

Unversioned today. Breaking changes will be announced in the CHANGELOG and a
`/v2/*` prefix introduced.

---

## Endpoint Index

| Method | Path                      | Summary                                                      |
|-------:|---------------------------|--------------------------------------------------------------|
| GET    | `/healthz`                | [Liveness probe](#get-healthz)                               |
| POST   | `/upload`                 | [Push photos into storage](#post-upload)                     |
| POST   | `/ingest`                 | [Index photos, assign grab_ids](#post-ingest)                |
| POST   | `/auth/selfie`            | [Authenticate via selfie](#post-authselfie)                  |
| GET    | `/grabs/{grab_id}/images` | [List photos for an identity](#get-grabsgrab_idimages)       |
| GET    | `/files/{image_id}`       | [Stream image bytes](#get-filesimage_id)                     |

---

## GET `/healthz`

Liveness probe. Used by Render to decide whether the service is up.

**Response 200** `application/json`

```json
{"status": "ok"}
```

**Curl**

```bash
curl ${API_URL}/healthz
```

---

## POST `/upload`

Upload one or many photos into `STORAGE_DIR`. They are written to
`STORAGE_DIR/uploads/<uuid>.<ext>` and can then be discovered by
[`POST /ingest`](#post-ingest).

**Request** `multipart/form-data`

| Field   | Type                | Required | Description                                       |
|---------|---------------------|:--------:|---------------------------------------------------|
| `files` | File[] (one or more)| yes      | JPEG/PNG/WebP. Each must be ≤ `MAX_UPLOAD_MB` MB. |

**Response 200** `application/json`

```json
{
  "saved": [
    {
      "filename": "abc123def456.jpg",
      "path": "/data/storage/raw/uploads/abc123def456.jpg",
      "bytes": 184321
    }
  ]
}
```

**Errors**

| Code | Reason                                          |
|-----:|-------------------------------------------------|
| 400  | `files` field missing or empty.                 |
| 413  | At least one file exceeds `MAX_UPLOAD_MB`.      |
| 415  | At least one file has an unsupported MIME type. |

**Curl**

```bash
curl -X POST ${API_URL}/upload \
  -F 'files=@./photo1.jpg' \
  -F 'files=@./photo2.jpg' \
  -F 'files=@./photo3.png'
```

---

## POST `/ingest`

Crawl `STORAGE_DIR` (or a `path` subfolder), detect every face in each new
image, and assign / update `grab_id`s.

**Request** `application/json`

| Field  | Type             | Required | Description                                           |
|--------|------------------|:--------:|-------------------------------------------------------|
| `path` | string \| null   | no       | Subpath under `STORAGE_DIR`. Defaults to entire root. |

Example:

```json
{}
```

or:

```json
{ "path": "day1" }
```

**Response 200** `application/json`

```json
{
  "processed": 42,
  "skipped": 3,
  "faces_detected": 117,
  "grab_ids_created": 58
}
```

Semantics:

- `processed` — images newly ingested this call.
- `skipped` — images already indexed (by sha256).
- `faces_detected` — faces across `processed` images.
- `grab_ids_created` — new identities minted. `faces_detected - grab_ids_created`
  equals how many faces were mapped into **existing** identities.

**Errors**

| Code | Reason                                           |
|-----:|--------------------------------------------------|
| 400  | `path` resolves outside `STORAGE_DIR`.           |
| 500  | Model load / database failure (see server logs). |

**Curl**

```bash
curl -X POST ${API_URL}/ingest \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Notes**

- Idempotent: safe to call repeatedly after `/upload`.
- Synchronous; expect ≈ 0.5–2 seconds per photo on CPU.
- For each detected face:
  1. Top-1 cosine search on `grab_ids.centroid`.
  2. If similarity ≥ `MATCH_THRESHOLD` → attach face to that grab_id and
     update its centroid (streaming mean, renormalized).
  3. Otherwise → create a new grab_id seeded by this face's embedding.

---

## POST `/auth/selfie`

**Selfie-as-a-Key.** Submit a selfie; the API returns the `grab_id` of the
nearest matching identity.

**Request** `multipart/form-data`

| Field  | Type | Required | Description                                      |
|--------|------|:--------:|--------------------------------------------------|
| `file` | File | yes      | Single selfie (JPEG/PNG/WebP, ≤ `MAX_UPLOAD_MB`). |

If the image has multiple faces, the **largest-area** face is used.

**Response 200** `application/json`

```json
{
  "grab_id": "d0b2fbb6-9f11-4a9a-8a3b-3d0e6a4a8f21",
  "confidence": 0.94
}
```

- `confidence` is cosine similarity (0..1). `MATCH_THRESHOLD` gates this.

**Errors**

| Code | Reason                                         |
|-----:|------------------------------------------------|
| 400  | No face detected in the image.                 |
| 401  | Face detected but no known identity ≥ threshold.|
| 413  | File exceeds `MAX_UPLOAD_MB`.                  |
| 415  | Unsupported content type.                      |

**Curl**

```bash
curl -X POST ${API_URL}/auth/selfie \
  -F 'file=@./my-selfie.jpg'
```

---

## GET `/grabs/{grab_id}/images`

List every photo that contains the identity `grab_id`.

**Path params**

| Name      | Type     | Description                     |
|-----------|----------|---------------------------------|
| `grab_id` | UUID v4  | Returned by `/auth/selfie`.     |

**Response 200** `application/json`

```json
{
  "grab_id": "d0b2fbb6-9f11-4a9a-8a3b-3d0e6a4a8f21",
  "images": [
    {
      "id": "c1a1e0b8-2b31-4c5a-92aa-8a9b12e7c0a1",
      "path": "/data/storage/raw/uploads/abc123.jpg",
      "url": "${API_URL}/files/c1a1e0b8-2b31-4c5a-92aa-8a9b12e7c0a1"
    }
  ]
}
```

- `path` is server-side only; **do not** use it from a browser.
- `url` hits [`GET /files/{image_id}`](#get-filesimage_id) which streams the
  bytes.

**Errors**

| Code | Reason                     |
|-----:|----------------------------|
| 404  | `grab_id` does not exist.  |

**Curl**

```bash
curl ${API_URL}/grabs/d0b2fbb6-9f11-4a9a-8a3b-3d0e6a4a8f21/images
```

---

## GET `/files/{image_id}`

Stream the original bytes of a photo. The file is looked up by its opaque
UUID; filesystem paths are never exposed to clients.

**Path params**

| Name       | Type     | Description                           |
|------------|----------|---------------------------------------|
| `image_id` | UUID v4  | From `/grabs/{grab_id}/images.images[].id`. |

**Response 200** `image/jpeg` | `image/png` | `image/webp`

Raw image bytes.

**Errors**

| Code | Reason                                       |
|-----:|----------------------------------------------|
| 404  | `image_id` unknown, or file missing on disk. |

**Curl**

```bash
curl -o photo.jpg ${API_URL}/files/c1a1e0b8-2b31-4c5a-92aa-8a9b12e7c0a1
```

---

## End-to-end walkthrough

```bash
API=${API_URL}

# 1. Upload three photos
curl -X POST "$API/upload" \
  -F 'files=@./photo1.jpg' -F 'files=@./photo2.jpg' -F 'files=@./photo3.jpg'

# 2. Index them
curl -X POST "$API/ingest" -H 'Content-Type: application/json' -d '{}'

# 3. Match a selfie
GRAB=$(curl -s -X POST "$API/auth/selfie" -F 'file=@./selfie.jpg' | jq -r .grab_id)

# 4. Get my photos
curl -s "$API/grabs/$GRAB/images" | jq

# 5. Download one of them
IMG=$(curl -s "$API/grabs/$GRAB/images" | jq -r '.images[0].id')
curl -o mine.jpg "$API/files/$IMG"
```

## OpenAPI

The full machine-readable contract lives at `${API_URL}/openapi.json`. Regenerate
client SDKs from it with [openapi-generator](https://openapi-generator.tech/):

```bash
openapi-generator-cli generate \
  -i ${API_URL}/openapi.json \
  -g typescript-fetch \
  -o ./clients/ts
```
