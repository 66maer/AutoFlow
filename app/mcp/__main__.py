"""Run AutoFlow MCP server with stdio transport.

Usage: python -m app.mcp
"""

from app.mcp.server import mcp_server

if __name__ == "__main__":
    mcp_server.run(transport="stdio")
