from app.engine.factory import create_input_controller
from app.mcp.server import mcp_server


@mcp_server.tool()
def mouse_click(x: int, y: int, button: str = "left") -> str:
    """Click at the specified screen coordinates.

    Args:
        x: X coordinate
        y: Y coordinate
        button: Mouse button - "left", "right", or "middle"
    """
    ctrl = create_input_controller()
    ctrl.click(x, y, button=button)
    return '{"status": "ok"}'


@mcp_server.tool()
def mouse_double_click(x: int, y: int) -> str:
    """Double-click at the specified screen coordinates.

    Args:
        x: X coordinate
        y: Y coordinate
    """
    ctrl = create_input_controller()
    ctrl.double_click(x, y)
    return '{"status": "ok"}'


@mcp_server.tool()
def mouse_right_click(x: int, y: int) -> str:
    """Right-click at the specified screen coordinates.

    Args:
        x: X coordinate
        y: Y coordinate
    """
    ctrl = create_input_controller()
    ctrl.right_click(x, y)
    return '{"status": "ok"}'


@mcp_server.tool()
def mouse_move(x: int, y: int) -> str:
    """Move the mouse to the specified screen coordinates.

    Args:
        x: X coordinate
        y: Y coordinate
    """
    ctrl = create_input_controller()
    ctrl.move(x, y)
    return '{"status": "ok"}'


@mcp_server.tool()
def mouse_scroll(x: int, y: int, amount: int) -> str:
    """Scroll the mouse wheel at the specified coordinates.

    Args:
        x: X coordinate
        y: Y coordinate
        amount: Scroll amount (positive = up, negative = down)
    """
    ctrl = create_input_controller()
    ctrl.scroll(x, y, amount)
    return '{"status": "ok"}'


@mcp_server.tool()
def keyboard_press(key: str) -> str:
    """Press and release a keyboard key.

    Args:
        key: Key name (e.g. "enter", "tab", "a", "ctrl")
    """
    ctrl = create_input_controller()
    ctrl.key_press(key)
    return '{"status": "ok"}'


@mcp_server.tool()
def keyboard_type(text: str) -> str:
    """Type a string of text.

    Args:
        text: The text to type
    """
    ctrl = create_input_controller()
    ctrl.type_text(text)
    return '{"status": "ok"}'
