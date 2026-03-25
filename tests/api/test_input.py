from unittest.mock import MagicMock, patch

from httpx import ASGITransport, AsyncClient

from app.main import create_app


def _make_client():
    app = create_app()
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@patch("app.api.input.create_input_controller")
async def test_click(mock_create):
    mock_ctrl = MagicMock()
    mock_create.return_value = mock_ctrl

    async with _make_client() as client:
        resp = await client.post(
            "/api/input/click", json={"x": 100, "y": 200}
        )

    assert resp.status_code == 200
    mock_ctrl.click.assert_called_once_with(100, 200, button="left")


@patch("app.api.input.create_input_controller")
async def test_click_right(mock_create):
    mock_ctrl = MagicMock()
    mock_create.return_value = mock_ctrl

    async with _make_client() as client:
        resp = await client.post(
            "/api/input/click",
            json={"x": 100, "y": 200, "button": "right"},
        )

    assert resp.status_code == 200
    mock_ctrl.click.assert_called_once_with(100, 200, button="right")


@patch("app.api.input.create_input_controller")
async def test_move(mock_create):
    mock_ctrl = MagicMock()
    mock_create.return_value = mock_ctrl

    async with _make_client() as client:
        resp = await client.post(
            "/api/input/move", json={"x": 50, "y": 60}
        )

    assert resp.status_code == 200
    mock_ctrl.move.assert_called_once_with(50, 60)


@patch("app.api.input.create_input_controller")
async def test_key_press(mock_create):
    mock_ctrl = MagicMock()
    mock_create.return_value = mock_ctrl

    async with _make_client() as client:
        resp = await client.post(
            "/api/input/key", json={"key": "enter"}
        )

    assert resp.status_code == 200
    mock_ctrl.key_press.assert_called_once_with("enter")


@patch("app.api.input.create_input_controller")
async def test_type_text(mock_create):
    mock_ctrl = MagicMock()
    mock_create.return_value = mock_ctrl

    async with _make_client() as client:
        resp = await client.post(
            "/api/input/type", json={"text": "hello world"}
        )

    assert resp.status_code == 200
    mock_ctrl.type_text.assert_called_once_with("hello world")


@patch("app.api.input.create_input_controller")
async def test_scroll(mock_create):
    mock_ctrl = MagicMock()
    mock_create.return_value = mock_ctrl

    async with _make_client() as client:
        resp = await client.post(
            "/api/input/scroll",
            json={"x": 100, "y": 200, "amount": 3},
        )

    assert resp.status_code == 200
    mock_ctrl.scroll.assert_called_once_with(100, 200, 3)
