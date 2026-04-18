from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.deps import get_db
from app.schemas import AuthResponse, ErrorResponse
from app.services import faces as face_svc
from app.services.matcher import find_best_grab

router = APIRouter(tags=["auth"])

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}


@router.post(
    "/auth/selfie",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate a user by their selfie",
    description=(
        "**Selfie-as-a-Key.** Upload a single selfie image; the API returns the "
        "`grab_id` of the nearest matching identity (cosine similarity against "
        "each `grab_id`'s centroid, gated by `MATCH_THRESHOLD`).\n\n"
        "If the image contains several faces the **largest-area** face is used. "
        "Use the returned `grab_id` as the bearer of identity for subsequent "
        "calls to `GET /grabs/{grab_id}/images`."
    ),
    responses={
        200: {"model": AuthResponse, "description": "Match found."},
        400: {"model": ErrorResponse, "description": "No face detected in the selfie."},
        401: {"model": ErrorResponse, "description": "Face detected but no known identity above threshold."},
        413: {"model": ErrorResponse, "description": "File exceeds MAX_UPLOAD_MB."},
        415: {"model": ErrorResponse, "description": "Unsupported content type."},
    },
)
async def selfie_auth(
    file: UploadFile = File(..., description="Selfie image (JPEG/PNG/WebP)."),
    db: Session = Depends(get_db),
) -> AuthResponse:
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported content type: {file.content_type}",
        )

    data = await file.read()
    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.MAX_UPLOAD_MB} MB",
        )

    face = face_svc.embed_primary_face(data)
    if face is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No face detected")

    grab, sim = find_best_grab(db, face.embedding)
    if grab is None or sim < settings.MATCH_THRESHOLD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No matching identity")

    return AuthResponse(grab_id=grab.id, confidence=round(sim, 4))
