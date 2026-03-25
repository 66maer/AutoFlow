from abc import ABC, abstractmethod
from dataclasses import dataclass

import numpy as np


@dataclass
class Region:
    x: int
    y: int
    w: int
    h: int


@dataclass
class MatchResult:
    x: int
    y: int
    w: int
    h: int
    confidence: float


class ScreenCapture(ABC):
    @abstractmethod
    def capture(self, region: Region | None = None) -> np.ndarray:
        """Capture screen, return BGR image as numpy array."""

    @abstractmethod
    def capture_to_file(
        self, path: str, region: Region | None = None
    ) -> None:
        """Capture screen and save to file."""


class ImageMatcher(ABC):
    @abstractmethod
    def find(
        self,
        template: np.ndarray,
        screen: np.ndarray,
        region: Region | None = None,
    ) -> MatchResult | None:
        """Find template in screen image. Return best match or None."""

    @abstractmethod
    def find_all(
        self,
        template: np.ndarray,
        screen: np.ndarray,
        region: Region | None = None,
    ) -> list[MatchResult]:
        """Find all occurrences of template in screen image."""
