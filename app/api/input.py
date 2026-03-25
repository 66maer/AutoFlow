from fastapi import APIRouter
from pydantic import BaseModel

from app.engine.factory import create_input_controller

router = APIRouter(prefix="/input", tags=["input"])


class ClickRequest(BaseModel):
    x: int
    y: int
    button: str = "left"


class MoveRequest(BaseModel):
    x: int
    y: int


class KeyRequest(BaseModel):
    key: str


class TypeRequest(BaseModel):
    text: str


class ScrollRequest(BaseModel):
    x: int
    y: int
    amount: int


class OkResponse(BaseModel):
    status: str = "ok"


@router.post("/click", response_model=OkResponse)
async def click(body: ClickRequest):
    ctrl = create_input_controller()
    ctrl.click(body.x, body.y, button=body.button)
    return OkResponse()


@router.post("/move", response_model=OkResponse)
async def move(body: MoveRequest):
    ctrl = create_input_controller()
    ctrl.move(body.x, body.y)
    return OkResponse()


@router.post("/key", response_model=OkResponse)
async def key_press(body: KeyRequest):
    ctrl = create_input_controller()
    ctrl.key_press(body.key)
    return OkResponse()


@router.post("/type", response_model=OkResponse)
async def type_text(body: TypeRequest):
    ctrl = create_input_controller()
    ctrl.type_text(body.text)
    return OkResponse()


@router.post("/scroll", response_model=OkResponse)
async def scroll(body: ScrollRequest):
    ctrl = create_input_controller()
    ctrl.scroll(body.x, body.y, body.amount)
    return OkResponse()
