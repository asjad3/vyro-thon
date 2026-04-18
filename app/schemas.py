from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    path: Optional[str] = Field(
        default=None,
        description="Optional subpath under STORAGE_DIR. Defaults to entire STORAGE_DIR.",
    )


class IngestResponse(BaseModel):
    processed: int
    skipped: int
    faces_detected: int
    grab_ids_created: int


class AuthResponse(BaseModel):
    grab_id: uuid.UUID
    confidence: float


class ImageOut(BaseModel):
    id: uuid.UUID
    path: str
    url: str


class GrabImagesResponse(BaseModel):
    grab_id: uuid.UUID
    images: list[ImageOut]
