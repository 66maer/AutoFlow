import cv2
import numpy as np
from mss import mss

from app.engine.screen import Region, ScreenCapture


class MssCapture(ScreenCapture):
    def capture(self, region: Region | None = None) -> np.ndarray:
        with mss() as sct:
            if region is not None:
                monitor = {
                    "left": region.x,
                    "top": region.y,
                    "width": region.w,
                    "height": region.h,
                }
            else:
                monitor = sct.monitors[0]  # full virtual screen
            shot = sct.grab(monitor)
            bgra = np.asarray(shot)
        # Convert BGRA -> BGR
        return cv2.cvtColor(bgra, cv2.COLOR_BGRA2BGR)

    def capture_to_file(
        self, path: str, region: Region | None = None
    ) -> None:
        img = self.capture(region)
        cv2.imwrite(path, img)
