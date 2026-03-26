from unittest.mock import MagicMock, patch


@patch("app.mcp.tools.input.create_input_controller")
async def test_mouse_click(mock_create):
    from app.mcp.tools.input import mouse_click

    mock_ctrl = MagicMock()
    mock_create.return_value = mock_ctrl

    result = mouse_click(100, 200)

    assert result == '{"status": "ok"}'
    mock_ctrl.click.assert_called_once_with(100, 200, button="left")


@patch("app.mcp.tools.input.create_input_controller")
async def test_mouse_click_right_button(mock_create):
    from app.mcp.tools.input import mouse_click

    mock_ctrl = MagicMock()
    mock_create.return_value = mock_ctrl

    result = mouse_click(100, 200, button="right")

    assert result == '{"status": "ok"}'
    mock_ctrl.click.assert_called_once_with(100, 200, button="right")


@patch("app.mcp.tools.input.create_input_controller")
async def test_mouse_double_click(mock_create):
    from app.mcp.tools.input import mouse_double_click

    mock_ctrl = MagicMock()
    mock_create.return_value = mock_ctrl

    result = mouse_double_click(50, 60)

    assert result == '{"status": "ok"}'
    mock_ctrl.double_click.assert_called_once_with(50, 60)


@patch("app.mcp.tools.input.create_input_controller")
async def test_mouse_right_click(mock_create):
    from app.mcp.tools.input import mouse_right_click

    mock_ctrl = MagicMock()
    mock_create.return_value = mock_ctrl

    result = mouse_right_click(50, 60)

    assert result == '{"status": "ok"}'
    mock_ctrl.right_click.assert_called_once_with(50, 60)


@patch("app.mcp.tools.input.create_input_controller")
async def test_mouse_move(mock_create):
    from app.mcp.tools.input import mouse_move

    mock_ctrl = MagicMock()
    mock_create.return_value = mock_ctrl

    result = mouse_move(300, 400)

    assert result == '{"status": "ok"}'
    mock_ctrl.move.assert_called_once_with(300, 400)


@patch("app.mcp.tools.input.create_input_controller")
async def test_mouse_scroll(mock_create):
    from app.mcp.tools.input import mouse_scroll

    mock_ctrl = MagicMock()
    mock_create.return_value = mock_ctrl

    result = mouse_scroll(100, 200, 3)

    assert result == '{"status": "ok"}'
    mock_ctrl.scroll.assert_called_once_with(100, 200, 3)


@patch("app.mcp.tools.input.create_input_controller")
async def test_keyboard_press(mock_create):
    from app.mcp.tools.input import keyboard_press

    mock_ctrl = MagicMock()
    mock_create.return_value = mock_ctrl

    result = keyboard_press("enter")

    assert result == '{"status": "ok"}'
    mock_ctrl.key_press.assert_called_once_with("enter")


@patch("app.mcp.tools.input.create_input_controller")
async def test_keyboard_type(mock_create):
    from app.mcp.tools.input import keyboard_type

    mock_ctrl = MagicMock()
    mock_create.return_value = mock_ctrl

    result = keyboard_type("hello world")

    assert result == '{"status": "ok"}'
    mock_ctrl.type_text.assert_called_once_with("hello world")
