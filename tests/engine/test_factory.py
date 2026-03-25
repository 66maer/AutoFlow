import pytest

from app.config import get_settings
from app.engine.factory import (
    create_image_matcher,
    create_input_controller,
    create_screen_capture,
)
from app.engine.input import InputController
from app.engine.screen import ImageMatcher, ScreenCapture


def test_create_screen_capture():
    cap = create_screen_capture()
    assert isinstance(cap, ScreenCapture)


def test_create_image_matcher():
    get_settings.cache_clear()
    matcher = create_image_matcher()
    assert isinstance(matcher, ImageMatcher)


def test_create_input_controller():
    get_settings.cache_clear()
    ctrl = create_input_controller()
    assert isinstance(ctrl, InputController)


def test_unknown_matcher_raises(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("ENGINE__IMAGE_MATCHER", "unknown")
    get_settings.cache_clear()
    with pytest.raises(ValueError, match="Unknown image matcher"):
        create_image_matcher()
    get_settings.cache_clear()


def test_unknown_input_raises(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("ENGINE__INPUT_BACKEND", "unknown")
    get_settings.cache_clear()
    with pytest.raises(ValueError, match="Unknown input backend"):
        create_input_controller()
    get_settings.cache_clear()
