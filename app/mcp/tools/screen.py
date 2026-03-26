import base64
import json
from pathlib import Path

import cv2

from app.engine.factory import create_image_matcher, create_screen_capture
from app.engine.screen import Region
from app.mcp.server import mcp_server

TEMPLATES_DIR = Path("data/templates")


@mcp_server.tool()
def screen_capture(
    x: int | None = None,
    y: int | None = None,
    w: int | None = None,
    h: int | None = None,
) -> str:
    """Capture the screen and return a base64-encoded PNG image.

    Args:
        x: Left coordinate of capture region (optional)
        y: Top coordinate of capture region (optional)
        w: Width of capture region (optional)
        h: Height of capture region (optional)
    """
    cap = create_screen_capture()
    region = None
    if all(v is not None for v in [x, y, w, h]):
        region = Region(x=x, y=y, w=w, h=h)

    img = cap.capture(region=region)
    height, width = img.shape[:2]

    _, buf = cv2.imencode(".png", img)
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")

    return json.dumps({"image": b64, "width": width, "height": height})


@mcp_server.tool()
def screen_find(template_id: str) -> str:
    """Find a template image on the current screen.

    Captures the screen and searches for the specified template image.
    Returns a list of match locations with confidence scores.

    Args:
        template_id: ID of a previously uploaded template image
    """
    # Load template from disk
    tpl_path = _find_template_file(template_id)
    if tpl_path is None:
        return json.dumps({"error": f"Template '{template_id}' not found"})

    tpl_img = cv2.imread(str(tpl_path), cv2.IMREAD_COLOR)
    if tpl_img is None:
        return json.dumps({"error": f"Failed to read template image: {tpl_path}"})

    cap = create_screen_capture()
    screen = cap.capture()

    matcher = create_image_matcher()
    results = matcher.find_all(tpl_img, screen)

    matches = [
        {"x": r.x, "y": r.y, "w": r.w, "h": r.h, "confidence": r.confidence}
        for r in results
    ]
    return json.dumps({"matches": matches})


def _find_template_file(template_id: str) -> Path | None:
    """Find a template file by its ID (stem)."""
    if not TEMPLATES_DIR.exists():
        return None
    for p in TEMPLATES_DIR.iterdir():
        if p.stem == template_id and p.suffix in (
            ".png",
            ".jpg",
            ".jpeg",
            ".bmp",
            ".webp",
        ):
            return p
    return None
