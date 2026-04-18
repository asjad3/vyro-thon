from __future__ import annotations

import uuid
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class IngestRequest(BaseModel):
    """Body for `POST /ingest`. All fields optional."""

    path: Optional[str] = Field(
        default=None,
        description=(
            "Subpath *under* `STORAGE_DIR` to restrict the crawl. "
            "If omitted or empty, the entire `STORAGE_DIR` is scanned recursively. "
            "Paths that resolve outside `STORAGE_DIR` are rejected with 400."
        ),
        examples=["day1", "clients/acme"],
    )

    model_config = ConfigDict(json_schema_extra={"examples": [{}, {"path": "day1"}]})


class IngestResponse(BaseModel):
    """Summary of an ingest run."""

    processed: int = Field(description="Number of new images successfully ingested.")
    skipped: int = Field(description="Images skipped because their sha256 was already indexed.")
    faces_detected: int = Field(description="Total faces detected across processed images.")
    grab_ids_created: int = Field(description="New identities created during this run.")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"processed": 42, "skipped": 3, "faces_detected": 117, "grab_ids_created": 58}
        }
    )


class AuthResponse(BaseModel):
    """Result of a successful selfie match."""

    grab_id: uuid.UUID = Field(description="Matched identity. Use it as the authorizer for /grabs/{grab_id}/images.")
    confidence: float = Field(
        description="Cosine similarity (0..1) against the nearest grab_id centroid.",
        ge=0.0,
        le=1.0,
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"grab_id": "d0b2fbb6-9f11-4a9a-8a3b-3d0e6a4a8f21", "confidence": 0.94}
        }
    )


class ImageOut(BaseModel):
    id: uuid.UUID = Field(description="Opaque image identifier.")
    path: str = Field(description="Server-side absolute path (debug only — not used by clients).")
    url: str = Field(description="Stable URL that streams the original bytes via GET /files/{id}.")


class GrabImagesResponse(BaseModel):
    grab_id: uuid.UUID
    images: list[ImageOut]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "grab_id": "d0b2fbb6-9f11-4a9a-8a3b-3d0e6a4a8f21",
                "images": [
                    {
                        "id": "c1a1e0b8-2b31-4c5a-92aa-8a9b12e7c0a1",
                        "path": "/data/storage/raw/uploads/abc123.jpg",
                        "url": "https://grabpic-api.onrender.com/files/c1a1e0b8-2b31-4c5a-92aa-8a9b12e7c0a1",
                    }
                ],
            }
        }
    )


class SavedFile(BaseModel):
    filename: str = Field(description="Server-generated filename (UUID + original extension).")
    path: str = Field(description="Absolute filesystem path where the file was written.")
    bytes: int = Field(description="File size on disk.")


class UploadResponse(BaseModel):
    saved: list[SavedFile]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "saved": [
                    {
                        "filename": "abc123def456.jpg",
                        "path": "/data/storage/raw/uploads/abc123def456.jpg",
                        "bytes": 184321,
                    }
                ]
            }
        }
    )


class ErrorBody(BaseModel):
    code: str = Field(description="Machine-readable error code.", examples=["unauthorized"])
    message: Any = Field(description="Human-readable description or validation details.")


class ErrorResponse(BaseModel):
    """Standard error envelope returned by every non-2xx response."""

    error: ErrorBody

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"error": {"code": "unauthorized", "message": "No matching identity"}}
        }
    )


class HealthResponse(BaseModel):
    status: str = Field(description="'ok' when the API process is live.", examples=["ok"])
