from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Workflow
from app.db.session import get_session
from app.engine.runner import get_running, run_workflow, stop_workflow

router = APIRouter(prefix="/workflows", tags=["workflows"])


class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    nodes: list[Any] = []
    edges: list[Any] = []
    enabled: bool = True
    repeat_count: int = 1
    repeat_forever: bool = False


class WorkflowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    nodes: list[Any] | None = None
    edges: list[Any] | None = None
    enabled: bool | None = None
    repeat_count: int | None = None
    repeat_forever: bool | None = None


class WorkflowOut(BaseModel):
    id: str
    name: str
    description: str
    nodes: list[Any]
    edges: list[Any]
    enabled: bool
    repeat_count: int
    repeat_forever: bool
    created_at: datetime
    updated_at: datetime


@router.get("", response_model=list[WorkflowOut])
async def list_workflows(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Workflow).order_by(Workflow.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=WorkflowOut, status_code=201)
async def create_workflow(
    body: WorkflowCreate,
    session: AsyncSession = Depends(get_session),
):
    wf = Workflow(**body.model_dump())
    session.add(wf)
    await session.commit()
    await session.refresh(wf)
    return wf


@router.get("/{workflow_id}", response_model=WorkflowOut)
async def get_workflow(
    workflow_id: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Workflow).where(Workflow.id == workflow_id))
    wf = result.scalars().first()
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@router.put("/{workflow_id}", response_model=WorkflowOut)
async def update_workflow(
    workflow_id: str,
    body: WorkflowUpdate,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Workflow).where(Workflow.id == workflow_id))
    wf = result.scalars().first()
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(wf, key, value)
    wf.updated_at = datetime.now(UTC)

    session.add(wf)
    await session.commit()
    await session.refresh(wf)
    return wf


@router.delete("/{workflow_id}", status_code=204)
async def delete_workflow(
    workflow_id: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Workflow).where(Workflow.id == workflow_id))
    wf = result.scalars().first()
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow not found")

    await session.delete(wf)
    await session.commit()


@router.post("/{workflow_id}/run")
async def run_workflow_endpoint(
    workflow_id: str,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Workflow).where(Workflow.id == workflow_id))
    wf = result.scalars().first()
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if workflow_id in get_running():
        raise HTTPException(status_code=409, detail="Workflow is already running")

    # Run in background so the API responds immediately
    background_tasks.add_task(
        run_workflow,
        workflow_id,
        wf.nodes or [],
        wf.edges or [],
        repeat_count=wf.repeat_count,
        repeat_forever=wf.repeat_forever,
    )
    return {"status": "started", "workflow_id": workflow_id}


@router.post("/{workflow_id}/stop")
async def stop_workflow_endpoint(workflow_id: str):
    stopped = stop_workflow(workflow_id)
    if not stopped:
        raise HTTPException(status_code=404, detail="Workflow is not running")
    return {"status": "stopping", "workflow_id": workflow_id}
