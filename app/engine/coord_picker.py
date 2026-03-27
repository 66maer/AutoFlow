"""Desktop-level coordinate picker using tkinter overlay.

Provides fullscreen semi-transparent overlay with crosshair cursor
for picking screen coordinates. Supports two modes:
1. Free pick: click anywhere on screen
2. Window pick: first select a window, then pick within it
"""

import ctypes
import logging
import threading
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class PickResult:
    x: int
    y: int
    window_title: str | None = None
    window_hwnd: int | None = None


def _get_window_at(x: int, y: int) -> tuple[int, str]:
    """Get the window handle and title at screen position (Windows only)."""
    try:
        user32 = ctypes.windll.user32
        hwnd = user32.WindowFromPoint(ctypes.wintypes.POINT(x, y))
        # Walk up to top-level window
        while True:
            parent = user32.GetParent(hwnd)
            if not parent:
                break
            hwnd = parent
        buf = ctypes.create_unicode_buffer(256)
        user32.GetWindowTextW(hwnd, buf, 256)
        return hwnd, buf.value
    except Exception:
        return 0, ""


def _get_window_rect(hwnd: int) -> tuple[int, int, int, int] | None:
    """Get window rectangle (left, top, right, bottom)."""
    try:
        import ctypes.wintypes

        rect = ctypes.wintypes.RECT()
        ctypes.windll.user32.GetWindowRect(hwnd, ctypes.byref(rect))
        return rect.left, rect.top, rect.right, rect.bottom
    except Exception:
        return None


def pick_coordinate(mode: str = "free") -> PickResult | None:
    """Launch a fullscreen overlay to pick coordinates.

    mode: "free" = pick anywhere, "window" = select window first then pick within
    Returns PickResult or None if cancelled (Escape pressed).
    """
    result_holder: list[PickResult | None] = [None]

    def _run_picker():
        import tkinter as tk

        root = tk.Tk()
        root.attributes("-fullscreen", True)
        root.attributes("-topmost", True)
        root.attributes("-alpha", 0.3)
        root.configure(bg="black")
        root.config(cursor="none")

        # Canvas for drawing crosshair and text
        canvas = tk.Canvas(root, highlightthickness=0, bg="black")
        canvas.pack(fill="both", expand=True)

        state: dict[str, Any] = {
            "phase": "pick_window" if mode == "window" else "pick_coord",
            "hwnd": None,
            "win_rect": None,
            "win_title": None,
        }

        cross_h = canvas.create_line(0, 0, 0, 0, fill="lime", width=1)
        cross_v = canvas.create_line(0, 0, 0, 0, fill="lime", width=1)
        coord_text = canvas.create_text(
            0, 0, text="", fill="lime", font=("Consolas", 14), anchor="nw"
        )
        hint_text = canvas.create_text(
            0, 0, text="", fill="white", font=("Microsoft YaHei", 12), anchor="center"
        )

        # Window highlight rectangle (for window mode)
        win_rect_id = canvas.create_rectangle(
            0, 0, 0, 0, outline="cyan", width=2, dash=(4, 4)
        )
        # Dark overlay outside window (4 rects)
        dark_rects = [
            canvas.create_rectangle(
                0, 0, 0, 0, fill="black", stipple="gray25", outline=""
            )
            for _ in range(4)
        ]

        sw = root.winfo_screenwidth()
        sh = root.winfo_screenheight()

        def _update_hint():
            canvas.coords(hint_text, sw // 2, 30)
            if state["phase"] == "pick_window":
                canvas.itemconfig(
                    hint_text,
                    text="点击选择目标窗口 | Click to select window | ESC 取消",
                )
            elif state["phase"] == "pick_in_window":
                title = state.get("win_title", "")
                canvas.itemconfig(
                    hint_text, text=f"在窗口内选择坐标 [{title}] | ESC 取消"
                )
            else:
                canvas.itemconfig(
                    hint_text, text="点击选择坐标 | Click to pick | ESC 取消"
                )

        _update_hint()

        def _hide_window_overlay():
            canvas.coords(win_rect_id, 0, 0, 0, 0)
            for r in dark_rects:
                canvas.coords(r, 0, 0, 0, 0)

        _hide_window_overlay()

        def _show_window_overlay(rect: tuple[int, int, int, int]):
            wl, t, r, b = rect
            canvas.coords(win_rect_id, wl, t, r, b)
            # Dark overlay: top, bottom, left, right
            canvas.coords(dark_rects[0], 0, 0, sw, t)  # top
            canvas.coords(dark_rects[1], 0, b, sw, sh)  # bottom
            canvas.coords(dark_rects[2], 0, t, wl, b)  # left
            canvas.coords(dark_rects[3], r, t, sw, b)  # right

        def on_motion(event):
            x, y = event.x, event.y
            # Crosshair
            canvas.coords(cross_h, 0, y, sw, y)
            canvas.coords(cross_v, x, 0, x, sh)
            # Coord label
            label_x = x + 15
            label_y = y - 25
            if label_x + 100 > sw:
                label_x = x - 115
            if label_y < 0:
                label_y = y + 15
            canvas.coords(coord_text, label_x, label_y)

            if state["phase"] == "pick_in_window":
                wr = state.get("win_rect")
                if wr:
                    wl, t, r, b = wr
                    if wl <= x <= r and t <= y <= b:
                        # Show relative coords within window
                        rx, ry = x - wl, y - t
                        canvas.itemconfig(
                            coord_text,
                            text=f"({x}, {y})  相对({rx}, {ry})",
                            fill="cyan",
                        )
                        canvas.itemconfig(cross_h, fill="cyan")
                        canvas.itemconfig(cross_v, fill="cyan")
                    else:
                        canvas.itemconfig(
                            coord_text, text="请在窗口内选择坐标", fill="red"
                        )
                        canvas.itemconfig(cross_h, fill="red")
                        canvas.itemconfig(cross_v, fill="red")
                    return

            canvas.itemconfig(coord_text, text=f"({x}, {y})", fill="lime")
            canvas.itemconfig(cross_h, fill="lime")
            canvas.itemconfig(cross_v, fill="lime")

        def on_click(event):
            x, y = event.x, event.y

            if state["phase"] == "pick_window":
                # Select window under cursor
                hwnd, title = _get_window_at(x, y)
                if hwnd:
                    rect = _get_window_rect(hwnd)
                    state["hwnd"] = hwnd
                    state["win_title"] = title
                    state["win_rect"] = rect
                    state["phase"] = "pick_in_window"
                    if rect:
                        _show_window_overlay(rect)
                    _update_hint()
                return

            if state["phase"] == "pick_in_window":
                wr = state.get("win_rect")
                if wr:
                    wl, t, r, b = wr
                    if not (wl <= x <= r and t <= y <= b):
                        return  # Outside window, ignore
                result_holder[0] = PickResult(
                    x=x,
                    y=y,
                    window_title=state.get("win_title"),
                    window_hwnd=state.get("hwnd"),
                )
                root.destroy()
                return

            # Free pick
            result_holder[0] = PickResult(x=x, y=y)
            root.destroy()

        def on_escape(event):
            root.destroy()

        canvas.bind("<Motion>", on_motion)
        canvas.bind("<Button-1>", on_click)
        root.bind("<Escape>", on_escape)

        root.mainloop()

    # Run tkinter in a separate thread to avoid blocking async loop
    thread = threading.Thread(target=_run_picker, daemon=True)
    thread.start()
    thread.join(timeout=120)  # 2 min max

    return result_holder[0]
