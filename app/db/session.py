from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlmodel import SQLModel

from app.config import get_settings

_engine = None


def _get_engine():
    global _engine
    if _engine is None:
        url = get_settings().database.url.replace("sqlite:///", "sqlite+aiosqlite:///")
        _engine = create_async_engine(url, echo=False)
    return _engine


async def _migrate(conn) -> None:
    """Add missing columns to existing tables (SQLite has no ALTER TYPE)."""
    # Columns to ensure exist: (table, column, type, default)
    migrations: list[tuple[str, str, str, str]] = [
        ("workflow", "repeat_count", "INTEGER", "1"),
        ("workflow", "repeat_forever", "BOOLEAN", "0"),
    ]
    for table, column, col_type, default in migrations:
        try:
            stmt = (
                f"ALTER TABLE {table} "
                f"ADD COLUMN {column} {col_type} DEFAULT {default}"
            )
            await conn.execute(text(stmt))
        except Exception:
            # Column already exists
            pass


async def init_db():
    engine = _get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        await _migrate(conn)


async def get_session() -> AsyncGenerator[AsyncSession]:
    engine = _get_engine()
    async with AsyncSession(engine) as session:
        yield session


def reset_engine():
    """For testing: reset the global engine."""
    global _engine
    _engine = None
