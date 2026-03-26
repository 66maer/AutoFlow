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
    from app.api.input import router as input_router
    from app.api.logs import router as logs_router
    from app.api.screen import router as screen_router
    from app.api.templates import router as templates_router
    from app.api.workflows import router as workflows_router
    from app.ws.logs import router as ws_router

    app.include_router(health_router, prefix="/api")
    app.include_router(screen_router, prefix="/api")
    app.include_router(input_router, prefix="/api")
    app.include_router(templates_router, prefix="/api")
    app.include_router(workflows_router, prefix="/api")
    app.include_router(logs_router, prefix="/api")
    app.include_router(ws_router)

    # Mount MCP server at /mcp (Streamable HTTP transport)
    from app.mcp import mcp_server

    app.mount("/mcp", mcp_server.streamable_http_app())

    return app


app = create_app()
