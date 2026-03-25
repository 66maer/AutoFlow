from app.config import get_settings
from app.engine.input import InputController
from app.engine.screen import ImageMatcher, ScreenCapture


def create_screen_capture() -> ScreenCapture:
    from app.engine.screen_mss import MssCapture

    return MssCapture()


def create_image_matcher() -> ImageMatcher:
    settings = get_settings()
    backend = settings.engine.image_matcher

    if backend == "orb":
        from app.engine.matcher_orb import OrbMatcher

        return OrbMatcher(confidence=settings.engine.match_confidence)

    raise ValueError(f"Unknown image matcher backend: {backend}")


def create_input_controller() -> InputController:
    settings = get_settings()
    backend = settings.engine.input_backend

    if backend == "pyautogui":
        from app.engine.input_pyautogui import PyAutoGuiController

        return PyAutoGuiController()

    raise ValueError(f"Unknown input backend: {backend}")
