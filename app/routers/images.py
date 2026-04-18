import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import Face, GrabId, Image
from app.schemas import GrabImagesResponse, ImageOut

router = APIRouter(tags=["images"])


@router.get("/grabs/{grab_id}/images", response_model=GrabImagesResponse)
def list_images_for_grab(
    grab_id: uuid.UUID, request: Request, db: Session = Depends(get_db)
) -> GrabImagesResponse:
    grab = db.get(GrabId, grab_id)
    if grab is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="grab_id not found")

    stmt = (
        select(Image)
        .join(Face, Face.image_id == Image.id)
        .where(Face.grab_id == grab_id)
        .distinct()
        .order_by(Image.created_at.desc())
    )
    images = db.execute(stmt).scalars().all()

    base = str(request.base_url).rstrip("/")
    return GrabImagesResponse(
        grab_id=grab_id,
        images=[ImageOut(id=img.id, path=img.path, url=f"{base}/files/{img.id}") for img in images],
    )


@router.get("/files/{image_id}")
def serve_file(image_id: uuid.UUID, db: Session = Depends(get_db)) -> FileResponse:
    image = db.get(Image, image_id)
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="image not found")
    p = Path(image.path)
    if not p.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="image file missing")
    return FileResponse(str(p))
