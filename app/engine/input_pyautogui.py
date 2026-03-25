import pyautogui

from app.engine.input import InputController

# Disable pyautogui's fail-safe pause for automation
pyautogui.PAUSE = 0.05


class PyAutoGuiController(InputController):
    def move(self, x: int, y: int) -> None:
        pyautogui.moveTo(x, y)

    def click(self, x: int, y: int, button: str = "left") -> None:
        pyautogui.click(x, y, button=button)

    def double_click(self, x: int, y: int) -> None:
        pyautogui.doubleClick(x, y)

    def right_click(self, x: int, y: int) -> None:
        pyautogui.rightClick(x, y)

    def key_press(self, key: str) -> None:
        pyautogui.press(key)

    def key_down(self, key: str) -> None:
        pyautogui.keyDown(key)

    def key_up(self, key: str) -> None:
        pyautogui.keyUp(key)

    def type_text(self, text: str) -> None:
        pyautogui.typewrite(text)

    def scroll(self, x: int, y: int, amount: int) -> None:
        pyautogui.scroll(amount, x=x, y=y)
