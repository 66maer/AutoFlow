from io import BytesIO
from unittest.mock import MagicMock, patch

import cv2
import numpy as np
from httpx import ASGITransport, AsyncClient

from app.engine.screen import MatchResult
from app.main import create_app


def _make_client():
    app = create_app()
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@patch("app.api.screen.create_screen_capture")
async def test_capture_full_screen(mock_create):
    mock_cap = MagicMock()
    fake_img = np.zeros((100, 200, 3), dtype=np.uint8)
    mock_cap.capture.return_value = fake_img
    mock_create.return_value = mock_cap

    async with _make_client() as client:
        resp = await client.post("/api/screen/capture")

    assert resp.status_code == 200
    data = resp.json()
    assert "image" in data
    assert data["width"] == 200
    assert data["height"] == 100


@patch("app.api.screen.create_screen_capture")
async def test_capture_with_region(mock_create):
    mock_cap = MagicMock()
    fake_img = np.zeros((50, 80, 3), dtype=np.uint8)
    mock_cap.capture.return_value = fake_img
    mock_create.return_value = mock_cap

    async with _make_client() as client:
        resp = await client.post(
            "/api/screen/capture",
            json={"x": 10, "y": 20, "w": 80, "h": 50},
        )

    assert resp.status_code == 200
    # Verify region was passed
    call_args = mock_cap.capture.call_args
    region = call_args.kwargs.get("region")
    assert region is not None
    assert region.x == 10


@patch("app.api.screen.create_image_matcher")
@patch("app.api.screen.create_screen_capture")
async def test_find_on_screen(mock_cap_create, mock_matcher_create):
    mock_cap = MagicMock()
    mock_cap.capture.return_value = np.zeros(
        (100, 200, 3), dtype=np.uint8
    )
    mock_cap_create.return_value = mock_cap

    mock_matcher = MagicMock()
    mock_matcher.find_all.return_value = [
        MatchResult(x=50, y=30, w=20, h=20, confidence=0.95)
    ]
    mock_matcher_create.return_value = mock_matcher

    # Create a small PNG to upload
    tpl = np.zeros((20, 20, 3), dtype=np.uint8)
    _, buf = cv2.imencode(".png", tpl)
    file_bytes = BytesIO(buf.tobytes())

    async with _make_client() as client:
        resp = await client.post(
            "/api/screen/find",
            files={"template": ("tpl.png", file_bytes, "image/png")},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert len(data["matches"]) == 1
    assert data["matches"][0]["x"] == 50
    assert data["matches"][0]["confidence"] == 0.95
