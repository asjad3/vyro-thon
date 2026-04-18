from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.db import init_db
from app.routers import auth as auth_router
from app.routers import images as images_router
from app.routers import ingest as ingest_router
from app.routers import upload as upload_router
from app.services import faces as face_svc

logger = logging.getLogger("grabpic")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing DB...")
    init_db()
    logger.info("Warming face recognition model...")
    try:
        face_svc.warmup()
    except Exception as e:  # non-fatal; first request will load
        logger.warning("Face model warmup failed: %s", e)
    yield


app = FastAPI(
    title="Grabpic",
    description="Intelligent Identity & Retrieval Engine",
    version="0.1.0",
    lifespan=lifespan,
)


@app.exception_handler(StarletteHTTPException)
async def http_exc_handler(request: Request, exc: StarletteHTTPException):
    code = {
        400: "bad_request",
        401: "unauthorized",
        404: "not_found",
        413: "payload_too_large",
        415: "unsupported_media_type",
    }.get(exc.status_code, "error")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": code, "message": exc.detail}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exc_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "validation_error", "message": exc.errors()}},
    )


@app.exception_handler(Exception)
async def unhandled_exc_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error", "message": "Internal server error"}},
    )


@app.get("/healthz", tags=["system"])
def healthz() -> dict:
    return {"status": "ok"}


_origins = [o.strip() for o in settings.FRONTEND_ORIGIN.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router.router)
app.include_router(upload_router.router)
app.include_router(auth_router.router)
app.include_router(images_router.router)
