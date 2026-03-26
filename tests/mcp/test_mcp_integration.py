from app.mcp.server import mcp_server


async def test_mcp_tools_registered():
    """All expected MCP tools should be registered."""
    tools = await mcp_server.list_tools()
    tool_names = {t.name for t in tools}

    expected = {
        # Input tools
        "mouse_click",
        "mouse_double_click",
        "mouse_right_click",
        "mouse_move",
        "mouse_scroll",
        "keyboard_press",
        "keyboard_type",
        # Screen tools
        "screen_capture",
        "screen_find",
        # Template tools
        "template_list",
        "template_get_image",
        "template_delete",
        # Workflow tools
        "workflow_list",
        "workflow_get",
        "workflow_create",
        "workflow_run",
        "workflow_stop",
        "workflow_status",
    }
    assert expected.issubset(tool_names), f"Missing tools: {expected - tool_names}"


async def test_mcp_mounted_in_fastapi():
    """MCP server should be mounted at /mcp in the FastAPI app."""
    from app.main import create_app

    app = create_app()
    route_paths = [r.path for r in app.routes]
    # FastAPI mount shows up as /mcp path in routes
    assert any("/mcp" in p for p in route_paths)
