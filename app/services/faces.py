"""face_recognition (dlib) wrapper: detect faces and produce 128-d L2-normalized embeddings."""

from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
from PIL import Image as PILImage

import face_recognition


@dataclass
class DetectedFace:
    embedding: np.ndarray  # shape (128,), L2-normalized
    bbox: dict  # {"x": int, "y": int, "w": int, "h": int}
    confidence: float


def _l2_normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v)
    return v if n == 0 else v / n


def warmup() -> None:
    """face_recognition loads dlib models lazily on first call; run a tiny op to force it."""
    dummy = np.zeros((32, 32, 3), dtype=np.uint8)
    face_recognition.face_locations(dummy, model="hog")


def _load_image(image_path: str) -> np.ndarray:
    return face_recognition.load_image_file(image_path)


def _extract(img_rgb: np.ndarray) -> list[DetectedFace]:
    # HOG detector is CPU-only and fast enough for the demo on 512 MB RAM.
    locations = face_recognition.face_locations(img_rgb, model="hog")
    if not locations:
        return []
    encodings = face_recognition.face_encodings(img_rgb, known_face_locations=locations, num_jitters=1)
    out: list[DetectedFace] = []
    for (top, right, bottom, left), enc in zip(locations, encodings):
        emb = _l2_normalize(np.asarray(enc, dtype=np.float32))
        out.append(
            DetectedFace(
                embedding=emb,
                bbox={"x": int(left), "y": int(top), "w": int(right - left), "h": int(bottom - top)},
                confidence=1.0,
            )
        )
    return out


def detect_and_embed(image_path: str) -> list[DetectedFace]:
    """Return all detected faces in the image with normalized embeddings."""
    try:
        img = _load_image(image_path)
    except Exception:
        return []
    return _extract(img)


def embed_primary_face(image_bytes: bytes) -> DetectedFace | None:
    """Decode bytes, return the largest-area detected face with embedding."""
    try:
        with PILImage.open(io.BytesIO(image_bytes)) as im:
            im = im.convert("RGB")
            img = np.array(im)
    except Exception:
        return None

    faces = _extract(img)
    if not faces:
        return None
    faces.sort(key=lambda f: f.bbox["w"] * f.bbox["h"], reverse=True)
    return faces[0]
