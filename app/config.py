from functools import lru_cache

from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class ServerConfig(BaseModel):
    host: str = "127.0.0.1"
    port: int = 8000
    reload: bool = False
    log_level: str = "info"


class DatabaseConfig(BaseModel):
    url: str = "sqlite:///autoflow.db"


class EngineConfig(BaseModel):
    image_matcher: str = "orb"
    input_backend: str = "pyautogui"
    match_confidence: float = 0.8


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_nested_delimiter="__",
        extra="ignore",
    )

    server: ServerConfig = ServerConfig()
    database: DatabaseConfig = DatabaseConfig()
    engine: EngineConfig = EngineConfig()


@lru_cache
def get_settings() -> Settings:
    return Settings()
