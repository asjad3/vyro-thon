import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import Face, GrabId, Image
from app.schemas import ErrorResponse, GrabImagesResponse, ImageOut

router = APIRouter(tags=["images"])


@router.get(
    "/grabs/{grab_id}/images",
    response_model=GrabImagesResponse,
    summary="List every image containing the given identity",
    description=(
        "Returns all photos that contain the person identified by `grab_id`. "
        "Use the `url` field of each image to fetch its bytes via "
        "`GET /files/{image_id}` — the raw `path` is exposed for debugging and "
        "should not be used directly by clients."
    ),
    responses={
        404: {"model": ErrorResponse, "description": "grab_id does not exist"},
    },
)
def list_images_for_grab(
    grab_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
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


@router.get(
    "/files/{image_id}",
    summary="Stream the original bytes of an image",
    description=(
        "Streams the raw bytes of the image stored on the server. The file is "
        "looked up by its opaque UUID (no filesystem paths are exposed to the "
        "client). Content-Type is inferred from the file extension."
    ),
    responses={
        200: {
            "description": "Image bytes streamed.",
            "content": {"image/jpeg": {}, "image/png": {}, "image/webp": {}},
        },
        404: {"model": ErrorResponse, "description": "image_id not found, or file missing on disk"},
    },
    response_class=FileResponse,
)
def serve_file(image_id: uuid.UUID, db: Session = Depends(get_db)) -> FileResponse:
    image = db.get(Image, image_id)
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="image not found")
    p = Path(image.path)
    if not p.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="image file missing")
    return FileResponse(str(p))
