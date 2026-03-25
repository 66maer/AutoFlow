from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlmodel import SQLModel

from app.db.models import ExecutionLog, Workflow
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

    # Seed data
    async with AsyncSession(engine) as session:
        wf = Workflow(id="wf1", name="test")
        session.add(wf)
        await session.commit()

        log = ExecutionLog(
            id="log1",
            workflow_id="wf1",
            status="success",
            detail={"steps": 3},
        )
        session.add(log)
        await session.commit()

    return client, engine


async def test_list_logs():
    client, engine = await _setup()
    async with client:
        resp = await client.get("/api/logs")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == "log1"
    await engine.dispose()


async def test_list_logs_filter_by_workflow():
    client, engine = await _setup()
    async with client:
        resp = await client.get("/api/logs?workflow_id=wf1")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

        resp = await client.get("/api/logs?workflow_id=nonexist")
        assert resp.status_code == 200
        assert len(resp.json()) == 0
    await engine.dispose()


async def test_get_log():
    client, engine = await _setup()
    async with client:
        resp = await client.get("/api/logs/log1")
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"
    await engine.dispose()


async def test_get_log_not_found():
    client, engine = await _setup()
    async with client:
        resp = await client.get("/api/logs/nonexist")
    assert resp.status_code == 404
    await engine.dispose()
