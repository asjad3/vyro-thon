from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/grabpic"
    STORAGE_DIR: str = "./storage/raw"
    MATCH_THRESHOLD: float = 0.92
    MAX_UPLOAD_MB: int = 8
    EMBEDDING_DIM: int = 128
    FRONTEND_ORIGIN: str = "*"  # comma-separated list or "*" for dev

    @property
    def storage_path(self) -> Path:
        p = Path(self.STORAGE_DIR).expanduser().resolve()
        p.mkdir(parents=True, exist_ok=True)
        return p


def _normalize_db_url(url: str) -> str:
    # Render/Heroku-style URLs start with postgres:// or postgresql://.
    # SQLAlchemy + psycopg v3 needs the postgresql+psycopg:// scheme.
    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url[len("postgres://") :]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


settings = Settings()
settings.DATABASE_URL = _normalize_db_url(settings.DATABASE_URL)
