from collections.abc import AsyncGenerator

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


async def init_db():
    engine = _get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession]:
    engine = _get_engine()
    async with AsyncSession(engine) as session:
        yield session


def reset_engine():
    """For testing: reset the global engine."""
    global _engine
    _engine = None
