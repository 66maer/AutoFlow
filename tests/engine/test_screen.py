from unittest.mock import MagicMock, patch

import numpy as np

from app.engine.screen import Region


class TestMssCapture:
    def _make_capture(self):
        from app.engine.screen_mss import MssCapture

        return MssCapture()

    @patch("app.engine.screen_mss.mss")
    def test_capture_full_screen(self, mock_mss_cls):
        # Arrange: mock mss to return a fake screenshot
        fake_bgra = np.zeros((100, 200, 4), dtype=np.uint8)
        fake_bgra[:, :, 0] = 255  # B channel
        mock_sct = MagicMock()
        mock_sct.grab.return_value.size.width = 200
        mock_sct.grab.return_value.size.height = 100
        mock_sct.__enter__ = MagicMock(return_value=mock_sct)
        mock_sct.__exit__ = MagicMock(return_value=False)
        mock_mss_cls.return_value = mock_sct

        # Mock numpy conversion
        with patch("numpy.asarray", return_value=fake_bgra):
            cap = self._make_capture()
            img = cap.capture()

        assert isinstance(img, np.ndarray)
        # Should be BGR (3 channels), not BGRA (4 channels)
        assert img.shape[2] == 3

    @patch("app.engine.screen_mss.mss")
    def test_capture_with_region(self, mock_mss_cls):
        fake_bgra = np.zeros((50, 80, 4), dtype=np.uint8)
        mock_sct = MagicMock()
        mock_sct.__enter__ = MagicMock(return_value=mock_sct)
        mock_sct.__exit__ = MagicMock(return_value=False)
        mock_mss_cls.return_value = mock_sct

        with patch("numpy.asarray", return_value=fake_bgra):
            cap = self._make_capture()
            region = Region(x=10, y=20, w=80, h=50)
            cap.capture(region=region)

        # Verify grab was called with correct monitor dict
        call_args = mock_sct.grab.call_args[0][0]
        assert call_args["left"] == 10
        assert call_args["top"] == 20
        assert call_args["width"] == 80
        assert call_args["height"] == 50

    @patch("app.engine.screen_mss.mss")
    def test_capture_to_file(self, mock_mss_cls, tmp_path):
        fake_bgra = np.zeros((100, 200, 4), dtype=np.uint8)
        mock_sct = MagicMock()
        mock_sct.__enter__ = MagicMock(return_value=mock_sct)
        mock_sct.__exit__ = MagicMock(return_value=False)
        mock_mss_cls.return_value = mock_sct

        out_path = str(tmp_path / "shot.png")

        with (
            patch("numpy.asarray", return_value=fake_bgra),
            patch("cv2.imwrite") as mock_imwrite,
        ):
            cap = self._make_capture()
            cap.capture_to_file(out_path)

        mock_imwrite.assert_called_once()
        assert mock_imwrite.call_args[0][0] == out_path
