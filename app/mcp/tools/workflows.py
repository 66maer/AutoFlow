import asyncio
import json
from typing import Any

from app.mcp.server import mcp_server


@mcp_server.tool()
async def workflow_list() -> str:
    """List all saved workflows.

    Returns a JSON array of workflow objects.
    """
    from sqlmodel import select

    from app.db.models import Workflow
    from app.db.session import get_session

    async for session in get_session():
        stmt = select(Workflow)
        result = await session.exec(stmt)
        workflows = result.all()
        items = [
            {
                "id": w.id,
                "name": w.name,
                "description": w.description,
                "enabled": w.enabled,
                "created_at": w.created_at.isoformat(),
                "updated_at": w.updated_at.isoformat(),
            }
            for w in workflows
        ]
        return json.dumps(items)

    return json.dumps([])


@mcp_server.tool()
async def workflow_get(workflow_id: str) -> str:
    """Get a workflow by its ID.

    Args:
        workflow_id: The workflow ID
    """
    from app.db.models import Workflow
    from app.db.session import get_session

    async for session in get_session():
        wf = await session.get(Workflow, workflow_id)
        if wf is None:
            return json.dumps({"error": f"Workflow '{workflow_id}' not found"})
        return json.dumps(
            {
                "id": wf.id,
                "name": wf.name,
                "description": wf.description,
                "nodes": wf.nodes,
                "edges": wf.edges,
                "enabled": wf.enabled,
                "repeat_count": wf.repeat_count,
                "repeat_forever": wf.repeat_forever,
                "created_at": wf.created_at.isoformat(),
                "updated_at": wf.updated_at.isoformat(),
            }
        )

    return json.dumps({"error": "Database unavailable"})


@mcp_server.tool()
async def workflow_create(name: str, description: str = "") -> str:
    """Create a new empty workflow.

    Args:
        name: Workflow name
        description: Optional description
    """
    from app.db.models import Workflow
    from app.db.session import get_session

    async for session in get_session():
        wf = Workflow(name=name, description=description)
        session.add(wf)
        await session.commit()
        await session.refresh(wf)
        return json.dumps(
            {
                "id": wf.id,
                "name": wf.name,
                "description": wf.description,
            }
        )

    return json.dumps({"error": "Database unavailable"})


@mcp_server.tool()
async def workflow_run(workflow_id: str) -> str:
    """Start running a workflow in the background.

    The workflow executes asynchronously. Use workflow_status to check
    if it is still running, and workflow_stop to cancel it.

    Args:
        workflow_id: The workflow ID to run
    """
    from app.db.models import Workflow
    from app.db.session import get_session
    from app.engine.runner import get_running
    from app.engine.runner import run_workflow as _run_workflow

    if workflow_id in get_running():
        return json.dumps({"error": "Workflow is already running"})

    async for session in get_session():
        wf = await session.get(Workflow, workflow_id)
        if wf is None:
            return json.dumps({"error": f"Workflow '{workflow_id}' not found"})
        nodes: list[dict[str, Any]] = wf.nodes or []
        edges: list[dict[str, Any]] = wf.edges or []
        break
    else:
        return json.dumps({"error": "Database unavailable"})

    asyncio.create_task(_run_workflow(workflow_id, nodes, edges))
    return json.dumps({"status": "started", "workflow_id": workflow_id})


@mcp_server.tool()
def workflow_stop(workflow_id: str) -> str:
    """Stop a running workflow.

    Args:
        workflow_id: The workflow ID to stop
    """
    from app.engine.runner import stop_workflow

    stopped = stop_workflow(workflow_id)
    if stopped:
        return json.dumps({"status": "stopping", "workflow_id": workflow_id})
    return json.dumps({"error": f"Workflow '{workflow_id}' is not running"})


@mcp_server.tool()
def workflow_status(workflow_id: str) -> str:
    """Check if a workflow is currently running.

    Args:
        workflow_id: The workflow ID to check
    """
    from app.engine.runner import get_running

    running = workflow_id in get_running()
    return json.dumps({"workflow_id": workflow_id, "running": running})
