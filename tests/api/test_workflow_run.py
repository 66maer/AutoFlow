from unittest.mock import AsyncMock, patch

from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlmodel import SQLModel

from app.db.session import get_session
from app.main import create_app


async def _setup():
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async def override_session():
        async with AsyncSession(engine) as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = override_session
    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test")
    return client, engine


async def test_run_workflow():
    client, engine = await _setup()
    async with client:
        # Create a workflow first
        resp = await client.post(
            "/api/workflows",
            json={
                "name": "test",
                "nodes": [
                    {"id": "1", "type": "wait", "data": {"ms": 10}}
                ],
                "edges": [],
            },
        )
        wf_id = resp.json()["id"]

        with patch(
            "app.api.workflows.run_workflow", new_callable=AsyncMock
        ) as mock_run:
            mock_run.return_value = {"status": "success"}
            resp = await client.post(f"/api/workflows/{wf_id}/run")

        assert resp.status_code == 200
        assert resp.json()["status"] == "started"
    await engine.dispose()


async def test_run_nonexistent_workflow():
    client, engine = await _setup()
    async with client:
        resp = await client.post("/api/workflows/fake-id/run")
    assert resp.status_code == 404
    await engine.dispose()


async def test_stop_not_running():
    client, engine = await _setup()
    async with client:
        resp = await client.post("/api/workflows/fake-id/stop")
    assert resp.status_code == 404
    await engine.dispose()
