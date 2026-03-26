import json
from unittest.mock import AsyncMock, MagicMock, patch

from app.db.models import Workflow


async def _mock_session_with(*workflows):
    """Create a mock async session generator that returns given workflows."""

    class FakeResult:
        def __init__(self, items):
            self._items = items

        def all(self):
            return self._items

    class FakeSession:
        def __init__(self):
            self._added = []

        async def exec(self, stmt):
            return FakeResult(list(workflows))

        async def get(self, model, pk):
            for w in workflows:
                if w.id == pk:
                    return w
            return None

        def add(self, obj):
            self._added.append(obj)

        async def commit(self):
            pass

        async def refresh(self, obj):
            pass

    session = FakeSession()

    async def gen():
        yield session

    return gen


@patch("app.db.session.get_session")
async def test_workflow_list(mock_get_session):
    from app.mcp.tools.workflows import workflow_list

    wf = Workflow(id="wf-1", name="Test Workflow", description="desc")
    mock_get_session.side_effect = await _mock_session_with(wf)

    result = json.loads(await workflow_list())

    assert len(result) == 1
    assert result[0]["id"] == "wf-1"
    assert result[0]["name"] == "Test Workflow"


@patch("app.db.session.get_session")
async def test_workflow_list_empty(mock_get_session):
    from app.mcp.tools.workflows import workflow_list

    mock_get_session.side_effect = await _mock_session_with()

    result = json.loads(await workflow_list())

    assert result == []


@patch("app.db.session.get_session")
async def test_workflow_get(mock_get_session):
    from app.mcp.tools.workflows import workflow_get

    wf = Workflow(
        id="wf-1",
        name="Test",
        nodes=[{"id": "n1", "type": "click"}],
        edges=[],
    )
    mock_get_session.side_effect = await _mock_session_with(wf)

    result = json.loads(await workflow_get("wf-1"))

    assert result["id"] == "wf-1"
    assert result["nodes"] == [{"id": "n1", "type": "click"}]


@patch("app.db.session.get_session")
async def test_workflow_get_not_found(mock_get_session):
    from app.mcp.tools.workflows import workflow_get

    mock_get_session.side_effect = await _mock_session_with()

    result = json.loads(await workflow_get("nonexistent"))

    assert "error" in result


@patch("app.db.session.get_session")
async def test_workflow_create(mock_get_session):
    from app.mcp.tools.workflows import workflow_create

    mock_get_session.side_effect = await _mock_session_with()

    result = json.loads(await workflow_create("New WF", description="my desc"))

    assert result["name"] == "New WF"
    assert result["description"] == "my desc"
    assert "id" in result


@patch("app.db.session.get_session")
@patch("app.engine.runner.get_running")
async def test_workflow_run(mock_get_running, mock_get_session):
    from app.mcp.tools.workflows import workflow_run

    wf = Workflow(
        id="wf-run",
        name="Runnable",
        nodes=[{"id": "n1", "type": "wait", "data": {"seconds": 0.01}}],
        edges=[],
    )
    mock_get_session.side_effect = await _mock_session_with(wf)
    mock_get_running.return_value = {}

    mock_run = AsyncMock()
    with (
        patch("app.engine.runner.run_workflow", mock_run),
        patch("asyncio.create_task") as mock_task,
    ):
        result = json.loads(await workflow_run("wf-run"))

    assert result["status"] == "started"
    mock_task.assert_called_once()


@patch("app.db.session.get_session")
@patch("app.engine.runner.get_running")
async def test_workflow_run_not_found(mock_get_running, mock_get_session):
    from app.mcp.tools.workflows import workflow_run

    mock_get_session.side_effect = await _mock_session_with()
    mock_get_running.return_value = {}

    result = json.loads(await workflow_run("nonexistent"))

    assert "error" in result


@patch("app.engine.runner.get_running")
async def test_workflow_run_already_running(mock_get_running):
    from app.mcp.tools.workflows import workflow_run

    mock_get_running.return_value = {"wf-1": MagicMock()}

    result = json.loads(await workflow_run("wf-1"))

    assert "error" in result
    assert "already running" in result["error"]


@patch("app.engine.runner.stop_workflow")
async def test_workflow_stop(mock_stop):
    from app.mcp.tools.workflows import workflow_stop

    mock_stop.return_value = True

    result = json.loads(workflow_stop("wf-1"))

    assert result["status"] == "stopping"


@patch("app.engine.runner.stop_workflow")
async def test_workflow_stop_not_running(mock_stop):
    from app.mcp.tools.workflows import workflow_stop

    mock_stop.return_value = False

    result = json.loads(workflow_stop("wf-1"))

    assert "error" in result


@patch("app.engine.runner.get_running")
async def test_workflow_status_running(mock_get_running):
    from app.mcp.tools.workflows import workflow_status

    mock_get_running.return_value = {"wf-1": MagicMock()}

    result = json.loads(workflow_status("wf-1"))

    assert result["running"] is True


@patch("app.engine.runner.get_running")
async def test_workflow_status_idle(mock_get_running):
    from app.mcp.tools.workflows import workflow_status

    mock_get_running.return_value = {}

    result = json.loads(workflow_status("wf-1"))

    assert result["running"] is False
