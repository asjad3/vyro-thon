"""Upload raw event photos into STORAGE_DIR so /ingest can pick them up."""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.config import settings

router = APIRouter(tags=["upload"])

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
EXT_FOR_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class SavedFile(BaseModel):
    filename: str
    path: str
    bytes: int


class UploadResponse(BaseModel):
    saved: list[SavedFile]


@router.post("/upload", response_model=UploadResponse)
async def upload_photos(files: list[UploadFile] = File(...)) -> UploadResponse:
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files provided")

    target_dir: Path = settings.storage_path / "uploads"
    target_dir.mkdir(parents=True, exist_ok=True)

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    saved: list[SavedFile] = []

    for f in files:
        if f.content_type not in ALLOWED_MIME:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported content type: {f.content_type}",
            )
        data = await f.read()
        if len(data) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"{f.filename} exceeds {settings.MAX_UPLOAD_MB} MB",
            )

        ext = EXT_FOR_MIME[f.content_type]
        fname = f"{uuid.uuid4().hex}{ext}"
        dest = target_dir / fname
        dest.write_bytes(data)
        saved.append(SavedFile(filename=fname, path=str(dest), bytes=len(data)))

    return UploadResponse(saved=saved)
