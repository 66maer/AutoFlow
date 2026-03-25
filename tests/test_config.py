from app.config import Settings, get_settings


def test_default_settings():
    s = Settings()
    assert s.server.host == "127.0.0.1"
    assert s.server.port == 8000
    assert s.database.url == "sqlite:///autoflow.db"
    assert s.engine.image_matcher == "orb"
    assert s.engine.input_backend == "pyautogui"
    assert s.engine.match_confidence == 0.8


def test_env_override(monkeypatch):
    monkeypatch.setenv("SERVER__PORT", "9000")
    monkeypatch.setenv("ENGINE__MATCH_CONFIDENCE", "0.6")
    s = Settings()
    assert s.server.port == 9000
    assert s.engine.match_confidence == 0.6


def test_get_settings_singleton():
    get_settings.cache_clear()
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2
