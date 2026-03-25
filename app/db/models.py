import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _new_uuid() -> str:
    return str(uuid.uuid4())


class Workflow(SQLModel, table=True):
    id: str = Field(default_factory=_new_uuid, primary_key=True)
    name: str
    description: str = ""
    nodes: list[Any] = Field(default_factory=list, sa_column=Column(JSON))
    edges: list[Any] = Field(default_factory=list, sa_column=Column(JSON))
    enabled: bool = True
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


class ExecutionLog(SQLModel, table=True):
    id: str = Field(default_factory=_new_uuid, primary_key=True)
    workflow_id: str = Field(foreign_key="workflow.id")
    status: str = "running"  # running / success / failed
    started_at: datetime = Field(default_factory=_utcnow)
    finished_at: datetime | None = None
    detail: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
