from mcp.server.fastmcp import FastMCP

mcp_server = FastMCP(
    "AutoFlow",
    instructions=(
        "Desktop automation server: screen capture, image matching, "
        "mouse/keyboard control, workflow execution, template management."
    ),
)

# Import tool modules to trigger @mcp_server.tool() registration
from app.mcp.tools import input, screen, templates, workflows  # noqa: E402, F401
