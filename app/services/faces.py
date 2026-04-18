"""DeepFace wrapper: detect faces and produce L2-normalized embeddings."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from app.config import settings


@dataclass
class DetectedFace:
    embedding: np.ndarray  # shape (EMBEDDING_DIM,), L2-normalized
    bbox: dict  # {"x": int, "y": int, "w": int, "h": int}
    confidence: float


def _l2_normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v)
    if n == 0:
        return v
    return v / n


def warmup() -> None:
    """Load the DeepFace model into memory once at startup."""
    from deepface import DeepFace

    DeepFace.build_model(settings.FACE_MODEL)


def _represent(image_path_or_array: Any, enforce_detection: bool) -> list[dict]:
    from deepface import DeepFace

    return DeepFace.represent(
        img_path=image_path_or_array,
        model_name=settings.FACE_MODEL,
        detector_backend=settings.FACE_DETECTOR,
        enforce_detection=enforce_detection,
        align=True,
        normalization="base",
    )


def detect_and_embed(image_path: str) -> list[DetectedFace]:
    """Return all detected faces in the image with normalized embeddings."""
    try:
        reps = _represent(image_path, enforce_detection=True)
    except (ValueError, Exception):
        return []

    out: list[DetectedFace] = []
    for r in reps:
        emb = np.asarray(r.get("embedding", []), dtype=np.float32)
        if emb.size != settings.EMBEDDING_DIM:
            continue
        area = r.get("facial_area", {}) or {}
        bbox = {
            "x": int(area.get("x", 0)),
            "y": int(area.get("y", 0)),
            "w": int(area.get("w", 0)),
            "h": int(area.get("h", 0)),
        }
        out.append(
            DetectedFace(
                embedding=_l2_normalize(emb),
                bbox=bbox,
                confidence=float(r.get("face_confidence", 1.0) or 1.0),
            )
        )
    return out


def embed_primary_face(image_bytes: bytes) -> DetectedFace | None:
    """Decode bytes, return the largest-area detected face with embedding."""
    import cv2

    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        return None

    try:
        reps = _represent(img, enforce_detection=True)
    except Exception:
        return None

    faces: list[DetectedFace] = []
    for r in reps:
        emb = np.asarray(r.get("embedding", []), dtype=np.float32)
        if emb.size != settings.EMBEDDING_DIM:
            continue
        area = r.get("facial_area", {}) or {}
        bbox = {
            "x": int(area.get("x", 0)),
            "y": int(area.get("y", 0)),
            "w": int(area.get("w", 0)),
            "h": int(area.get("h", 0)),
        }
        faces.append(
            DetectedFace(
                embedding=_l2_normalize(emb),
                bbox=bbox,
                confidence=float(r.get("face_confidence", 1.0) or 1.0),
            )
        )
    if not faces:
        return None
    faces.sort(key=lambda f: f.bbox["w"] * f.bbox["h"], reverse=True)
    return faces[0]
