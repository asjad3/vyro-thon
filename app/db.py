from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def init_db() -> None:
    """Enable pgvector and create tables. Safe to call repeatedly."""
    # Import models so they register with Base.metadata.
    from app import models  # noqa: F401

    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(engine)

    # ivfflat indexes (best-effort; ignore if they already exist).
    ddl = [
        "CREATE INDEX IF NOT EXISTS faces_embedding_cos_idx "
        "ON faces USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)",
        "CREATE INDEX IF NOT EXISTS grab_ids_centroid_cos_idx "
        "ON grab_ids USING ivfflat (centroid vector_cosine_ops) WITH (lists = 100)",
    ]
    with engine.begin() as conn:
        for stmt in ddl:
            try:
                conn.execute(text(stmt))
            except Exception:
                # Index creation requires at least one row for ivfflat on some versions; non-fatal.
                pass


if __name__ == "__main__":
    init_db()
    print("DB initialized.")
