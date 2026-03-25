from sqlalchemy import select

from app.db.models import ExecutionLog, Workflow


async def test_create_workflow(db_session):
    wf = Workflow(name="test workflow", nodes=[{"id": "1"}], edges=[])
    db_session.add(wf)
    await db_session.commit()
    await db_session.refresh(wf)

    stmt = select(Workflow).where(Workflow.name == "test workflow")
    result = await db_session.execute(stmt)
    loaded = result.scalars().one()
    assert loaded.id == wf.id
    assert loaded.nodes == [{"id": "1"}]
    assert loaded.enabled is True


async def test_create_execution_log(db_session):
    wf = Workflow(name="wf")
    db_session.add(wf)
    await db_session.commit()
    await db_session.refresh(wf)
    wf_id = wf.id

    log = ExecutionLog(
        workflow_id=wf_id, status="running", detail={"step": 1}
    )
    db_session.add(log)
    await db_session.commit()
    await db_session.refresh(log)

    stmt = select(ExecutionLog).where(
        ExecutionLog.workflow_id == wf_id
    )
    result = await db_session.execute(stmt)
    loaded = result.scalars().one()
    assert loaded.status == "running"
    assert loaded.detail == {"step": 1}
