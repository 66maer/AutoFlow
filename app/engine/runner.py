"""Manages running workflow instances."""

import logging
from datetime import UTC, datetime
from typing import Any

from app.engine.factory import (
    create_image_matcher,
    create_input_controller,
    create_screen_capture,
)
from app.engine.workflow import WorkflowEngine, WorkflowExecutionError

logger = logging.getLogger(__name__)

# Active engines keyed by workflow_id
_running: dict[str, WorkflowEngine] = {}


def get_running() -> dict[str, WorkflowEngine]:
    return _running


async def _save_log(
    workflow_id: str,
    status: str,
    started_at: datetime,
    detail: dict[str, Any],
) -> None:
    """Persist an ExecutionLog to the database."""
    try:
        from app.db.models import ExecutionLog
        from app.db.session import get_session

        async for session in get_session():
            log = ExecutionLog(
                workflow_id=workflow_id,
                status=status,
                started_at=started_at,
                finished_at=datetime.now(UTC),
                detail=detail,
            )
            session.add(log)
            await session.commit()
            break
    except Exception:
        logger.exception("Failed to save execution log")


async def _broadcast_step(
    workflow_id: str,
    node_id: str,
    status: str,
    detail: dict[str, Any],
) -> None:
    """Broadcast a step event to WebSocket clients."""
    try:
        from app.ws.logs import broadcast_log

        await broadcast_log(
            {
                "type": "step",
                "workflow_id": workflow_id,
                "node_id": node_id,
                "status": status,
                "detail": detail,
            }
        )
    except Exception:
        logger.debug("Failed to broadcast step", exc_info=True)


async def run_workflow(
    workflow_id: str,
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    on_step: Any = None,
) -> dict[str, Any]:
    """Run a workflow, returning execution result summary."""
    if workflow_id in _running:
        raise RuntimeError(
            f"Workflow {workflow_id} is already running"
        )

    engine = WorkflowEngine(
        capture=create_screen_capture(),
        matcher=create_image_matcher(),
        input_ctrl=create_input_controller(),
    )
    _running[workflow_id] = engine

    async def step_callback(
        node_id: str, status: str, detail: dict[str, Any]
    ) -> None:
        # Find node type from nodes list
        node_type = ""
        for n in nodes:
            if n["id"] == node_id:
                node_type = n.get("type", "")
                break
        await _broadcast_step(
            workflow_id,
            node_id,
            status,
            {**detail, "node_type": node_type},
        )
        if on_step:
            await on_step(node_id, status, detail)

    # Broadcast workflow start
    try:
        from app.ws.logs import broadcast_log

        await broadcast_log(
            {
                "type": "workflow",
                "workflow_id": workflow_id,
                "status": "running",
            }
        )
    except Exception:
        pass

    started_at = datetime.now(UTC)
    try:
        ctx = await engine.execute(
            nodes, edges, on_step=step_callback
        )
        result = {
            "status": "success",
            "started_at": started_at.isoformat(),
            "finished_at": datetime.now(UTC).isoformat(),
            "logs": ctx.logs,
        }
        await _save_log(
            workflow_id, "success", started_at, {"logs": ctx.logs}
        )
        # Broadcast workflow complete
        try:
            from app.ws.logs import broadcast_log

            await broadcast_log(
                {
                    "type": "workflow",
                    "workflow_id": workflow_id,
                    "status": "success",
                }
            )
        except Exception:
            pass
        return result
    except WorkflowExecutionError as exc:
        # Save partial step logs so user can see where it broke
        partial_logs = []
        if engine.context:
            partial_logs = engine.context.logs
        result = {
            "status": "failed",
            "started_at": started_at.isoformat(),
            "finished_at": datetime.now(UTC).isoformat(),
            "error": str(exc),
            "logs": partial_logs,
        }
        await _save_log(
            workflow_id,
            "failed",
            started_at,
            {"error": str(exc), "logs": partial_logs},
        )
        # Broadcast workflow failed
        try:
            from app.ws.logs import broadcast_log

            await broadcast_log(
                {
                    "type": "workflow",
                    "workflow_id": workflow_id,
                    "status": "failed",
                    "error": str(exc),
                }
            )
        except Exception:
            pass
        return result
    finally:
        _running.pop(workflow_id, None)


def stop_workflow(workflow_id: str) -> bool:
    engine = _running.get(workflow_id)
    if engine is None:
        return False
    engine.cancel()
    return True
