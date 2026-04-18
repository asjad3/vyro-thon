"""face_recognition (dlib) wrapper: detect faces and produce 128-d L2-normalized embeddings.

Images are downscaled before inference to keep memory usage small (Render free tier = 512 MB).
Bounding boxes are rescaled back to the original image coordinates.
"""

from __future__ import annotations

import gc
import io
from dataclasses import dataclass

import numpy as np
from PIL import Image as PILImage

import face_recognition

# Max dimension (px) fed into dlib. 800px keeps peak RAM for a 4K photo under ~50 MB
# while preserving enough detail for HOG face detection.
MAX_SIDE = 800


@dataclass
class DetectedFace:
    embedding: np.ndarray  # shape (128,), L2-normalized
    bbox: dict  # {"x": int, "y": int, "w": int, "h": int} in original image coords
    confidence: float


def _l2_normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v)
    return v if n == 0 else v / n


def warmup() -> None:
    """face_recognition loads dlib models lazily on first call; run a tiny op to force it."""
    dummy = np.zeros((32, 32, 3), dtype=np.uint8)
    face_recognition.face_locations(dummy, model="hog")


def _load_and_downscale(path_or_bytes) -> tuple[np.ndarray, float] | None:
    """Return (downscaled RGB array, scale factor) or None on failure.

    scale = original_dim / downscaled_dim (>= 1.0). Multiply downscaled bbox coords by this
    to recover coordinates in the original image.
    """
    try:
        if isinstance(path_or_bytes, (bytes, bytearray)):
            src = PILImage.open(io.BytesIO(path_or_bytes))
        else:
            src = PILImage.open(path_or_bytes)
        with src as im:
            im = im.convert("RGB")
            w, h = im.size
            longest = max(w, h)
            if longest > MAX_SIDE:
                scale = longest / MAX_SIDE
                new_size = (int(round(w / scale)), int(round(h / scale)))
                im = im.resize(new_size, PILImage.BILINEAR)
            else:
                scale = 1.0
            arr = np.asarray(im, dtype=np.uint8)
        return arr, scale
    except Exception:
        return None


def _extract(img_rgb: np.ndarray, scale: float) -> list[DetectedFace]:
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
                bbox={
                    "x": int(round(left * scale)),
                    "y": int(round(top * scale)),
                    "w": int(round((right - left) * scale)),
                    "h": int(round((bottom - top) * scale)),
                },
                confidence=1.0,
            )
        )
    return out


def detect_and_embed(image_path: str) -> list[DetectedFace]:
    """Return all detected faces in the image with normalized embeddings."""
    loaded = _load_and_downscale(image_path)
    if loaded is None:
        return []
    img, scale = loaded
    try:
        return _extract(img, scale)
    finally:
        del img
        gc.collect()


def embed_primary_face(image_bytes: bytes) -> DetectedFace | None:
    """Decode bytes, return the largest-area detected face with embedding."""
    loaded = _load_and_downscale(image_bytes)
    if loaded is None:
        return None
    img, scale = loaded
    try:
        faces = _extract(img, scale)
    finally:
        del img
        gc.collect()
    if not faces:
        return None
    faces.sort(key=lambda f: f.bbox["w"] * f.bbox["h"], reverse=True)
    return faces[0]
