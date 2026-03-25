from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="AutoFlow", version="0.1.0", lifespan=lifespan)

    from app.api.health import router as health_router

    app.include_router(health_router, prefix="/api")

    return app


app = create_app()
