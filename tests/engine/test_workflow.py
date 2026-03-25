from unittest.mock import MagicMock, patch

import numpy as np

from app.engine.screen import MatchResult
from app.engine.workflow import ExecutionContext, WorkflowEngine


def _make_engine(capture=None, matcher=None, input_ctrl=None):
    cap = capture or MagicMock()
    mat = matcher or MagicMock()
    inp = input_ctrl or MagicMock()
    if capture is None:
        cap.capture.return_value = np.zeros(
            (100, 200, 3), dtype=np.uint8
        )
    return WorkflowEngine(cap, mat, inp)


async def test_execute_capture_node():
    engine = _make_engine()
    nodes = [{"id": "1", "type": "capture", "data": {}}]
    ctx = await engine.execute(nodes, [])

    assert len(ctx.logs) == 1
    assert ctx.logs[0]["status"] == "success"
    assert ctx.last_capture is not None


async def test_execute_click_with_coords():
    mock_input = MagicMock()
    engine = _make_engine(input_ctrl=mock_input)
    nodes = [
        {"id": "1", "type": "click", "data": {"x": 100, "y": 200}}
    ]
    ctx = await engine.execute(nodes, [])

    assert ctx.logs[0]["status"] == "success"
    mock_input.click.assert_called_once_with(100, 200, button="left")


async def test_execute_click_uses_last_match():
    mock_input = MagicMock()
    mock_matcher = MagicMock()
    mock_matcher.find.return_value = MatchResult(
        x=50, y=60, w=20, h=20, confidence=0.9
    )
    engine = _make_engine(matcher=mock_matcher, input_ctrl=mock_input)

    nodes = [
        {
            "id": "1",
            "type": "find_image",
            "data": {"template_path": "tpl.png"},
        },
        {"id": "2", "type": "click", "data": {}},
    ]
    edges = [{"source": "1", "target": "2"}]

    with patch(
        "cv2.imread",
        return_value=np.zeros((20, 20, 3), dtype=np.uint8),
    ):
        await engine.execute(nodes, edges)

    # Click should be at center of match (50+10, 60+10)
    mock_input.click.assert_called_once_with(60, 70, button="left")


async def test_execute_key_press():
    mock_input = MagicMock()
    engine = _make_engine(input_ctrl=mock_input)
    nodes = [
        {"id": "1", "type": "key_press", "data": {"key": "enter"}}
    ]
    await engine.execute(nodes, [])
    mock_input.key_press.assert_called_once_with("enter")


async def test_execute_type_text():
    mock_input = MagicMock()
    engine = _make_engine(input_ctrl=mock_input)
    nodes = [
        {"id": "1", "type": "type_text", "data": {"text": "hello"}}
    ]
    await engine.execute(nodes, [])
    mock_input.type_text.assert_called_once_with("hello")


async def test_execute_wait():
    engine = _make_engine()
    nodes = [{"id": "1", "type": "wait", "data": {"ms": 10}}]
    ctx = await engine.execute(nodes, [])
    assert ctx.logs[0]["result"]["waited_ms"] == 10


async def test_execute_chain():
    """Test sequential execution: capture -> click."""
    mock_input = MagicMock()
    engine = _make_engine(input_ctrl=mock_input)
    nodes = [
        {"id": "1", "type": "capture", "data": {}},
        {"id": "2", "type": "click", "data": {"x": 10, "y": 20}},
    ]
    edges = [{"source": "1", "target": "2"}]
    ctx = await engine.execute(nodes, edges)

    assert len(ctx.logs) == 2
    assert all(log["status"] == "success" for log in ctx.logs)


async def test_condition_branch_true():
    """Condition should follow 'true' edge when match found."""
    mock_input = MagicMock()

    nodes = [
        {"id": "1", "type": "condition", "data": {}},
        {"id": "2", "type": "click", "data": {"x": 1, "y": 1}},
        {"id": "3", "type": "click", "data": {"x": 2, "y": 2}},
    ]
    edges = [
        {"source": "1", "target": "2", "sourceHandle": "true"},
        {"source": "1", "target": "3", "sourceHandle": "false"},
    ]

    eng = _make_engine(input_ctrl=mock_input)

    async def patched_execute(nodes, edges, on_step=None):
        ctx = ExecutionContext()
        ctx.last_match = MatchResult(
            x=0, y=0, w=10, h=10, confidence=0.9
        )
        node_map = {n["id"]: n for n in nodes}
        adj = eng._build_adjacency(edges)
        await eng._execute_from("1", node_map, adj, ctx, on_step)
        return ctx

    ctx = await patched_execute(nodes, edges)

    # Should have executed condition + the "true" branch click
    assert len(ctx.logs) == 2
    assert ctx.logs[1]["node_id"] == "2"


async def test_cancel_stops_execution():
    engine = _make_engine()
    engine.cancel()
    nodes = [
        {"id": "1", "type": "capture", "data": {}},
        {"id": "2", "type": "capture", "data": {}},
    ]
    edges = [{"source": "1", "target": "2"}]
    ctx = await engine.execute(nodes, edges)
    # Should not execute any nodes since cancelled before start
    assert len(ctx.logs) == 0
