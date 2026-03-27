import asyncio
import base64

import cv2
import numpy as np
from fastapi import APIRouter, UploadFile
from pydantic import BaseModel

from app.engine.factory import create_image_matcher, create_screen_capture
from app.engine.screen import Region

router = APIRouter(prefix="/screen", tags=["screen"])


class CaptureRequest(BaseModel):
    x: int | None = None
    y: int | None = None
    w: int | None = None
    h: int | None = None


class CaptureResponse(BaseModel):
    image: str  # base64 encoded PNG
    width: int
    height: int


class MatchItem(BaseModel):
    x: int
    y: int
    w: int
    h: int
    confidence: float


class FindResponse(BaseModel):
    matches: list[MatchItem]


@router.post("/capture", response_model=CaptureResponse)
async def capture_screen(body: CaptureRequest | None = None):
    cap = create_screen_capture()
    region = None
    if body and all(
        v is not None for v in [body.x, body.y, body.w, body.h]
    ):
        region = Region(x=body.x, y=body.y, w=body.w, h=body.h)

    img = cap.capture(region=region)
    h, w = img.shape[:2]

    _, buf = cv2.imencode(".png", img)
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")

    return CaptureResponse(image=b64, width=w, height=h)


@router.post("/find", response_model=FindResponse)
async def find_on_screen(template: UploadFile):
    # Read uploaded template image
    data = await template.read()
    arr = np.frombuffer(data, dtype=np.uint8)
    tpl_img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    if tpl_img is None:
        return FindResponse(matches=[])

    cap = create_screen_capture()
    screen = cap.capture()

    matcher = create_image_matcher()
    results = matcher.find_all(tpl_img, screen)

    return FindResponse(
        matches=[
            MatchItem(
                x=r.x, y=r.y, w=r.w, h=r.h, confidence=r.confidence
            )
            for r in results
        ]
    )


class PickCoordRequest(BaseModel):
    mode: str = "free"  # "free" or "window"


class PickCoordResponse(BaseModel):
    x: int | None = None
    y: int | None = None
    window_title: str | None = None
    window_hwnd: int | None = None
    cancelled: bool = False


@router.post("/pick-coord", response_model=PickCoordResponse)
async def pick_coordinate(body: PickCoordRequest | None = None):
    """Launch desktop overlay for coordinate picking."""
    from app.engine.coord_picker import pick_coordinate as _pick

    mode = body.mode if body else "free"
    result = await asyncio.to_thread(_pick, mode)

    if result is None:
        return PickCoordResponse(cancelled=True)

    return PickCoordResponse(
        x=result.x,
        y=result.y,
        window_title=result.window_title,
        window_hwnd=result.window_hwnd,
    )
