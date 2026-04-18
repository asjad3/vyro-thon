"""Crawl the configured storage dir and ingest images (idempotent by sha256)."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Face, Image
from app.services import faces as face_svc
from app.services.matcher import assign_grab_id


ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


@dataclass
class IngestStats:
    processed: int = 0
    skipped: int = 0
    faces_detected: int = 0
    grab_ids_created: int = 0


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _resolve_root(subpath: Optional[str]) -> Path:
    base = settings.storage_path
    if not subpath:
        return base
    target = (base / subpath).resolve()
    # Prevent escaping STORAGE_DIR.
    if base not in target.parents and target != base:
        raise ValueError("path must be within STORAGE_DIR")
    return target


def ingest_directory(db: Session, subpath: Optional[str] = None) -> IngestStats:
    root = _resolve_root(subpath)
    stats = IngestStats()
    if not root.exists():
        return stats

    for file_path in sorted(root.rglob("*")):
        if not file_path.is_file() or file_path.suffix.lower() not in ALLOWED_EXTS:
            continue

        digest = _sha256_file(file_path)
        existing = db.execute(select(Image).where(Image.sha256 == digest)).scalar_one_or_none()
        if existing is not None:
            stats.skipped += 1
            continue

        detected = face_svc.detect_and_embed(str(file_path))
        image = Image(path=str(file_path), sha256=digest)
        db.add(image)
        db.flush()

        for det in detected:
            result = assign_grab_id(db, det.embedding)
            if result.created:
                stats.grab_ids_created += 1
            face = Face(
                image_id=image.id,
                grab_id=result.grab_id,
                embedding=det.embedding.astype("float32").tolist(),
                bbox=det.bbox,
            )
            db.add(face)
            stats.faces_detected += 1

        db.commit()
        stats.processed += 1

    return stats
