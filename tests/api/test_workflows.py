from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlmodel import SQLModel

from app.db.session import get_session
from app.main import create_app


async def _setup_client():
    """Create test app with in-memory DB."""
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


async def test_create_workflow():
    client, engine = await _setup_client()
    async with client:
        resp = await client.post(
            "/api/workflows",
            json={"name": "test wf", "description": "desc"},
        )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "test wf"
    assert data["id"]
    await engine.dispose()


async def test_list_workflows():
    client, engine = await _setup_client()
    async with client:
        await client.post(
            "/api/workflows", json={"name": "wf1"}
        )
        await client.post(
            "/api/workflows", json={"name": "wf2"}
        )
        resp = await client.get("/api/workflows")
    assert resp.status_code == 200
    assert len(resp.json()) == 2
    await engine.dispose()


async def test_get_workflow():
    client, engine = await _setup_client()
    async with client:
        create_resp = await client.post(
            "/api/workflows", json={"name": "wf"}
        )
        wf_id = create_resp.json()["id"]
        resp = await client.get(f"/api/workflows/{wf_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "wf"
    await engine.dispose()


async def test_get_workflow_not_found():
    client, engine = await _setup_client()
    async with client:
        resp = await client.get("/api/workflows/nonexistent")
    assert resp.status_code == 404
    await engine.dispose()


async def test_update_workflow():
    client, engine = await _setup_client()
    async with client:
        create_resp = await client.post(
            "/api/workflows", json={"name": "old"}
        )
        wf_id = create_resp.json()["id"]
        resp = await client.put(
            f"/api/workflows/{wf_id}",
            json={"name": "new", "enabled": False},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "new"
    assert data["enabled"] is False
    await engine.dispose()


async def test_delete_workflow():
    client, engine = await _setup_client()
    async with client:
        create_resp = await client.post(
            "/api/workflows", json={"name": "to delete"}
        )
        wf_id = create_resp.json()["id"]
        resp = await client.delete(f"/api/workflows/{wf_id}")
        assert resp.status_code == 204

        get_resp = await client.get(f"/api/workflows/{wf_id}")
        assert get_resp.status_code == 404
    await engine.dispose()
