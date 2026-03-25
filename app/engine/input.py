from abc import ABC, abstractmethod


class InputController(ABC):
    @abstractmethod
    def move(self, x: int, y: int) -> None:
        """Move mouse to position."""

    @abstractmethod
    def click(
        self, x: int, y: int, button: str = "left"
    ) -> None:
        """Click at position."""

    @abstractmethod
    def double_click(self, x: int, y: int) -> None:
        """Double click at position."""

    @abstractmethod
    def right_click(self, x: int, y: int) -> None:
        """Right click at position."""

    @abstractmethod
    def key_press(self, key: str) -> None:
        """Press and release a key."""

    @abstractmethod
    def key_down(self, key: str) -> None:
        """Hold a key down."""

    @abstractmethod
    def key_up(self, key: str) -> None:
        """Release a key."""

    @abstractmethod
    def type_text(self, text: str) -> None:
        """Type text string."""

    @abstractmethod
    def scroll(self, x: int, y: int, amount: int) -> None:
        """Scroll at position."""
