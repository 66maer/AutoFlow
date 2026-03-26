import json
from unittest.mock import MagicMock, patch

import numpy as np

from app.engine.screen import MatchResult


@patch("app.mcp.tools.screen.create_screen_capture")
async def test_screen_capture_full(mock_create):
    from app.mcp.tools.screen import screen_capture

    mock_cap = MagicMock()
    fake_img = np.zeros((100, 200, 3), dtype=np.uint8)
    mock_cap.capture.return_value = fake_img
    mock_create.return_value = mock_cap

    result = json.loads(screen_capture())

    assert "image" in result
    assert result["width"] == 200
    assert result["height"] == 100
    mock_cap.capture.assert_called_once_with(region=None)


@patch("app.mcp.tools.screen.create_screen_capture")
async def test_screen_capture_with_region(mock_create):
    from app.mcp.tools.screen import screen_capture

    mock_cap = MagicMock()
    fake_img = np.zeros((50, 80, 3), dtype=np.uint8)
    mock_cap.capture.return_value = fake_img
    mock_create.return_value = mock_cap

    result = json.loads(screen_capture(x=10, y=20, w=80, h=50))

    assert result["width"] == 80
    assert result["height"] == 50
    call_args = mock_cap.capture.call_args
    region = call_args.kwargs.get("region")
    assert region is not None
    assert region.x == 10
    assert region.y == 20


@patch("app.mcp.tools.screen.create_image_matcher")
@patch("app.mcp.tools.screen.create_screen_capture")
async def test_screen_find(mock_cap_create, mock_matcher_create, tmp_path):
    from app.mcp.tools.screen import screen_find

    # Create a fake template file
    tpl_file = tmp_path / "test-tpl-id.png"
    # Write a small valid PNG-like file (cv2.imread will be mocked anyway)
    tpl_file.write_bytes(b"fake")

    mock_cap = MagicMock()
    mock_cap.capture.return_value = np.zeros((100, 200, 3), dtype=np.uint8)
    mock_cap_create.return_value = mock_cap

    mock_matcher = MagicMock()
    mock_matcher.find_all.return_value = [
        MatchResult(x=50, y=30, w=20, h=20, confidence=0.95)
    ]
    mock_matcher_create.return_value = mock_matcher

    with (
        patch("app.mcp.tools.screen.TEMPLATES_DIR", tmp_path),
        patch("app.mcp.tools.screen.cv2.imread") as mock_imread,
    ):
        mock_imread.return_value = np.zeros((20, 20, 3), dtype=np.uint8)
        result = json.loads(screen_find("test-tpl-id"))

    assert len(result["matches"]) == 1
    assert result["matches"][0]["x"] == 50
    assert result["matches"][0]["confidence"] == 0.95


async def test_screen_find_template_not_found(tmp_path):
    from app.mcp.tools.screen import screen_find

    with patch("app.mcp.tools.screen.TEMPLATES_DIR", tmp_path):
        result = json.loads(screen_find("nonexistent"))

    assert "error" in result
    assert "not found" in result["error"]
