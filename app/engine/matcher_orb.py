import cv2
import numpy as np

from app.engine.screen import ImageMatcher, MatchResult, Region


class OrbMatcher(ImageMatcher):
    """Image matcher using OpenCV template matching (TM_CCOEFF_NORMED).

    Named 'orb' in config for historical reasons. Uses template matching
    which is more reliable for screen automation than ORB feature matching.
    """

    def __init__(self, confidence: float = 0.8):
        self._confidence = confidence

    def find(
        self,
        template: np.ndarray,
        screen: np.ndarray,
        region: Region | None = None,
    ) -> MatchResult | None:
        search_area, offset_x, offset_y = self._crop_region(
            screen, region
        )

        gray_screen = cv2.cvtColor(search_area, cv2.COLOR_BGR2GRAY)
        gray_template = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)

        th, tw = gray_template.shape[:2]
        if th > gray_screen.shape[0] or tw > gray_screen.shape[1]:
            return None

        result = cv2.matchTemplate(
            gray_screen, gray_template, cv2.TM_CCOEFF_NORMED
        )
        _, max_val, _, max_loc = cv2.minMaxLoc(result)

        if max_val < self._confidence:
            return None

        return MatchResult(
            x=max_loc[0] + offset_x,
            y=max_loc[1] + offset_y,
            w=tw,
            h=th,
            confidence=float(max_val),
        )

    def find_all(
        self,
        template: np.ndarray,
        screen: np.ndarray,
        region: Region | None = None,
    ) -> list[MatchResult]:
        search_area, offset_x, offset_y = self._crop_region(
            screen, region
        )

        gray_screen = cv2.cvtColor(search_area, cv2.COLOR_BGR2GRAY)
        gray_template = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)

        th, tw = gray_template.shape[:2]
        if th > gray_screen.shape[0] or tw > gray_screen.shape[1]:
            return []

        result = cv2.matchTemplate(
            gray_screen, gray_template, cv2.TM_CCOEFF_NORMED
        )

        locations = np.where(result >= self._confidence)
        matches: list[MatchResult] = []

        for pt_y, pt_x in zip(*locations, strict=False):
            matches.append(
                MatchResult(
                    x=int(pt_x) + offset_x,
                    y=int(pt_y) + offset_y,
                    w=tw,
                    h=th,
                    confidence=float(result[pt_y, pt_x]),
                )
            )

        # NMS: remove overlapping matches by keeping highest confidence
        return self._nms(matches)

    def _crop_region(
        self, screen: np.ndarray, region: Region | None
    ) -> tuple[np.ndarray, int, int]:
        if region is None:
            return screen, 0, 0
        cropped = screen[
            region.y : region.y + region.h,
            region.x : region.x + region.w,
        ]
        return cropped, region.x, region.y

    def _nms(
        self, matches: list[MatchResult], overlap_thresh: float = 0.5
    ) -> list[MatchResult]:
        if not matches:
            return []

        matches.sort(key=lambda m: m.confidence, reverse=True)
        keep: list[MatchResult] = []

        for m in matches:
            overlaps = False
            for k in keep:
                if self._iou(m, k) > overlap_thresh:
                    overlaps = True
                    break
            if not overlaps:
                keep.append(m)

        return keep

    @staticmethod
    def _iou(a: MatchResult, b: MatchResult) -> float:
        x1 = max(a.x, b.x)
        y1 = max(a.y, b.y)
        x2 = min(a.x + a.w, b.x + b.w)
        y2 = min(a.y + a.h, b.y + b.h)

        inter = max(0, x2 - x1) * max(0, y2 - y1)
        if inter == 0:
            return 0.0

        area_a = a.w * a.h
        area_b = b.w * b.h
        return inter / (area_a + area_b - inter)
