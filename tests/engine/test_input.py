from unittest.mock import patch


class TestPyAutoGuiController:
    def _make_controller(self):
        from app.engine.input_pyautogui import PyAutoGuiController

        return PyAutoGuiController()

    @patch("app.engine.input_pyautogui.pyautogui")
    def test_move(self, mock_pag):
        ctrl = self._make_controller()
        ctrl.move(100, 200)
        mock_pag.moveTo.assert_called_once_with(100, 200)

    @patch("app.engine.input_pyautogui.pyautogui")
    def test_click(self, mock_pag):
        ctrl = self._make_controller()
        ctrl.click(100, 200, button="left")
        mock_pag.click.assert_called_once_with(100, 200, button="left")

    @patch("app.engine.input_pyautogui.pyautogui")
    def test_double_click(self, mock_pag):
        ctrl = self._make_controller()
        ctrl.double_click(50, 60)
        mock_pag.doubleClick.assert_called_once_with(50, 60)

    @patch("app.engine.input_pyautogui.pyautogui")
    def test_right_click(self, mock_pag):
        ctrl = self._make_controller()
        ctrl.right_click(50, 60)
        mock_pag.rightClick.assert_called_once_with(50, 60)

    @patch("app.engine.input_pyautogui.pyautogui")
    def test_key_press(self, mock_pag):
        ctrl = self._make_controller()
        ctrl.key_press("enter")
        mock_pag.press.assert_called_once_with("enter")

    @patch("app.engine.input_pyautogui.pyautogui")
    def test_key_down(self, mock_pag):
        ctrl = self._make_controller()
        ctrl.key_down("shift")
        mock_pag.keyDown.assert_called_once_with("shift")

    @patch("app.engine.input_pyautogui.pyautogui")
    def test_key_up(self, mock_pag):
        ctrl = self._make_controller()
        ctrl.key_up("shift")
        mock_pag.keyUp.assert_called_once_with("shift")

    @patch("app.engine.input_pyautogui.pyautogui")
    def test_type_text(self, mock_pag):
        ctrl = self._make_controller()
        ctrl.type_text("hello")
        mock_pag.typewrite.assert_called_once_with("hello")

    @patch("app.engine.input_pyautogui.pyautogui")
    def test_scroll(self, mock_pag):
        ctrl = self._make_controller()
        ctrl.scroll(100, 200, 3)
        mock_pag.scroll.assert_called_once_with(3, x=100, y=200)
