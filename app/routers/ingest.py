from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db
from app.schemas import ErrorResponse, IngestRequest, IngestResponse
from app.services.ingest import ingest_directory

router = APIRouter(tags=["ingest"])


@router.post(
    "/ingest",
    response_model=IngestResponse,
    status_code=status.HTTP_200_OK,
    summary="Crawl STORAGE_DIR, detect faces, assign grab_ids",
    description=(
        "Scans `STORAGE_DIR` (or the optional `path` subpath) recursively for "
        "`.jpg/.jpeg/.png/.webp` files and, for each new image:\n\n"
        "1. Computes a **sha256**; images already indexed are skipped.\n"
        "2. Detects every face using dlib HOG, downscaling the image to 800 px "
        "max dimension to control memory use.\n"
        "3. Generates a 128-d encoding per face and assigns it to the nearest "
        "existing `grab_id` above `MATCH_THRESHOLD`, otherwise creates a new "
        "`grab_id`.\n\n"
        "Idempotent — safe to call repeatedly after uploading more photos. "
        "Runs synchronously; expect roughly 0.5–2 seconds per photo on CPU."
    ),
    responses={
        400: {"model": ErrorResponse, "description": "Path resolves outside STORAGE_DIR"},
        500: {"model": ErrorResponse, "description": "Unexpected server error"},
    },
)
def run_ingest(
    payload: IngestRequest | None = None,
    db: Session = Depends(get_db),
) -> IngestResponse:
    subpath = payload.path if payload else None
    try:
        stats = ingest_directory(db, subpath=subpath)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return IngestResponse(
        processed=stats.processed,
        skipped=stats.skipped,
        faces_detected=stats.faces_detected,
        grab_ids_created=stats.grab_ids_created,
    )
