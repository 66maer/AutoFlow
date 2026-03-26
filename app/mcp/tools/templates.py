import json
from pathlib import Path

from app.mcp.server import mcp_server

TEMPLATES_DIR = Path("data/templates")

_IMAGE_SUFFIXES = (".png", ".jpg", ".jpeg", ".bmp", ".webp")


@mcp_server.tool()
def template_list() -> str:
    """List all uploaded template images.

    Returns a JSON array of template objects with id and filename.
    """
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    items = []
    for p in sorted(TEMPLATES_DIR.iterdir()):
        if p.is_file() and p.suffix in _IMAGE_SUFFIXES:
            items.append({"id": p.stem, "filename": p.name})
    return json.dumps(items)


@mcp_server.tool()
def template_get_image(template_id: str) -> str:
    """Get a template image as base64-encoded data.

    Args:
        template_id: ID of the template image
    """
    import base64

    path = _find_template(template_id)
    if path is None:
        return json.dumps({"error": f"Template '{template_id}' not found"})

    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    mime = "image/png" if path.suffix == ".png" else f"image/{path.suffix.lstrip('.')}"
    return json.dumps({"id": template_id, "mime": mime, "image": b64})


@mcp_server.tool()
def template_delete(template_id: str) -> str:
    """Delete a template image.

    Args:
        template_id: ID of the template image to delete
    """
    path = _find_template(template_id)
    if path is None:
        return json.dumps({"error": f"Template '{template_id}' not found"})

    path.unlink()
    return json.dumps({"ok": True})


def _find_template(template_id: str) -> Path | None:
    """Find a template file by its ID (stem)."""
    if not TEMPLATES_DIR.exists():
        return None
    for p in TEMPLATES_DIR.iterdir():
        if p.stem == template_id and p.suffix in _IMAGE_SUFFIXES:
            return p
    return None
