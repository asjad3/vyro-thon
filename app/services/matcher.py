"""Match an embedding to an existing grab_id centroid, or create a new one."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
import uuid

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import GrabId


@dataclass
class MatchResult:
    grab_id: uuid.UUID
    confidence: float
    created: bool


def _l2_normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v)
    return v if n == 0 else v / n


def find_best_grab(db: Session, embedding: np.ndarray) -> tuple[Optional[GrabId], float]:
    """Return (nearest GrabId, cosine similarity). (None, 0.0) if table empty."""
    emb = embedding.tolist()
    # pgvector provides cosine_distance via the <=> operator; pgvector.sqlalchemy
    # exposes .cosine_distance() on the Vector column.
    stmt = (
        select(GrabId, GrabId.centroid.cosine_distance(emb).label("dist"))
        .order_by(GrabId.centroid.cosine_distance(emb))
        .limit(1)
    )
    row = db.execute(stmt).first()
    if row is None:
        return None, 0.0
    grab, dist = row
    similarity = float(1.0 - float(dist))
    return grab, similarity


def assign_grab_id(db: Session, embedding: np.ndarray) -> MatchResult:
    """Assign embedding to nearest grab_id above threshold, else create a new one.

    Updates the grab's centroid using a streaming mean and renormalizes.
    Caller is responsible for flush/commit on the returned grab.
    """
    grab, sim = find_best_grab(db, embedding)
    if grab is not None and sim >= settings.MATCH_THRESHOLD:
        old = np.asarray(grab.centroid, dtype=np.float32)
        n = grab.face_count
        new_centroid = (old * n + embedding.astype(np.float32)) / (n + 1)
        new_centroid = _l2_normalize(new_centroid)
        grab.centroid = new_centroid.tolist()
        grab.face_count = n + 1
        db.flush()
        return MatchResult(grab_id=grab.id, confidence=sim, created=False)

    new_grab = GrabId(centroid=embedding.astype(np.float32).tolist(), face_count=1)
    db.add(new_grab)
    db.flush()
    return MatchResult(grab_id=new_grab.id, confidence=1.0, created=True)
