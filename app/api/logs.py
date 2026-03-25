from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ExecutionLog
from app.db.session import get_session

router = APIRouter(prefix="/logs", tags=["logs"])


class LogOut(BaseModel):
    id: str
    workflow_id: str
    status: str
    started_at: datetime
    finished_at: datetime | None
    detail: dict[str, Any]


@router.get("", response_model=list[LogOut])
async def list_logs(
    workflow_id: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(50, le=200),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(ExecutionLog).order_by(
        ExecutionLog.started_at.desc()
    )
    if workflow_id:
        stmt = stmt.where(ExecutionLog.workflow_id == workflow_id)
    if status:
        stmt = stmt.where(ExecutionLog.status == status)
    stmt = stmt.limit(limit)

    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/{log_id}", response_model=LogOut)
async def get_log(
    log_id: str,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(ExecutionLog).where(ExecutionLog.id == log_id)
    )
    log = result.scalars().first()
    if log is None:
        raise HTTPException(status_code=404, detail="Log not found")
    return log
