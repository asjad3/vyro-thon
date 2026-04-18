from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db
from app.schemas import IngestRequest, IngestResponse
from app.services.ingest import ingest_directory

router = APIRouter(tags=["ingest"])


@router.post("/ingest", response_model=IngestResponse)
def run_ingest(payload: IngestRequest | None = None, db: Session = Depends(get_db)) -> IngestResponse:
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
