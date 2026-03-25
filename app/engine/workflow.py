"""Workflow execution engine — pure business logic, no FastAPI imports."""

import asyncio
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import cv2

from app.engine.input import InputController
from app.engine.screen import ImageMatcher, ScreenCapture

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path("data/templates")


@dataclass
class ExecutionContext:
    """State passed between nodes during execution."""

    last_capture: Any = None  # np.ndarray or None
    last_match: Any = None  # MatchResult or None
    variables: dict[str, Any] = field(default_factory=dict)
    logs: list[dict[str, Any]] = field(default_factory=list)


class WorkflowExecutionError(Exception):
    pass


def _load_template(data: dict[str, Any]):
    """Load template image from template_id or template_path."""
    template_id = data.get("template_id", "")
    if template_id:
        for p in TEMPLATES_DIR.iterdir():
            if p.stem == template_id:
                tpl = cv2.imread(str(p))
                if tpl is not None:
                    return tpl
                raise WorkflowExecutionError(
                    f"Cannot decode template: {p}"
                )
        raise WorkflowExecutionError(
            f"Template not found: {template_id}"
        )

    # Fallback: legacy template_path
    tpl_path = data.get("template_path", "")
    if tpl_path:
        tpl = cv2.imread(tpl_path)
        if tpl is not None:
            return tpl
        raise WorkflowExecutionError(
            f"Cannot read template: {tpl_path}"
        )

    raise WorkflowExecutionError("No template specified")


class WorkflowEngine:
    """Interprets workflow nodes/edges and executes them."""

    def __init__(
        self,
        capture: ScreenCapture,
        matcher: ImageMatcher,
        input_ctrl: InputController,
    ):
        self._capture = capture
        self._matcher = matcher
        self._input = input_ctrl
        self._cancelled = False

    def cancel(self):
        self._cancelled = True

    async def execute(
        self,
        nodes: list[dict[str, Any]],
        edges: list[dict[str, Any]],
        on_step: Any = None,
    ) -> ExecutionContext:
        """Execute workflow.

        on_step: optional async callback(node_id, status, detail).
        """
        ctx = ExecutionContext()

        node_map = {n["id"]: n for n in nodes}
        adj = self._build_adjacency(edges)

        # Find start nodes (no incoming edges)
        targets = {e["target"] for e in edges}
        start_nodes = [
            n["id"] for n in nodes if n["id"] not in targets
        ]

        if not start_nodes and nodes:
            start_nodes = [nodes[0]["id"]]

        for start_id in start_nodes:
            await self._execute_from(
                start_id, node_map, adj, ctx, on_step
            )

        return ctx

    def _build_adjacency(
        self, edges: list[dict[str, Any]]
    ) -> dict[str, list[dict[str, Any]]]:
        adj: dict[str, list[dict[str, Any]]] = {}
        for e in edges:
            src = e["source"]
            adj.setdefault(src, []).append(e)
        return adj

    async def _execute_from(
        self,
        node_id: str,
        node_map: dict[str, dict],
        adj: dict[str, list[dict]],
        ctx: ExecutionContext,
        on_step: Any,
    ):
        if self._cancelled:
            return

        node = node_map.get(node_id)
        if node is None:
            return

        node_type = node.get("type", "")
        node_data = node.get("data", {})

        step_log = {
            "node_id": node_id,
            "type": node_type,
            "status": "running",
        }
        ctx.logs.append(step_log)

        if on_step:
            await on_step(node_id, "running", {})

        try:
            result = await self._execute_node(
                node_type, node_data, ctx
            )
            step_log["status"] = "success"
            step_log["result"] = result
            if on_step:
                await on_step(node_id, "success", result or {})
        except Exception as exc:
            step_log["status"] = "failed"
            step_log["error"] = str(exc)
            if on_step:
                await on_step(node_id, "failed", {"error": str(exc)})
            raise WorkflowExecutionError(
                f"Node {node_id} ({node_type}) failed: {exc}"
            ) from exc

        # Follow edges
        next_edges = adj.get(node_id, [])

        if node_type == "condition":
            found = ctx.last_match is not None
            for edge in next_edges:
                label = edge.get(
                    "sourceHandle", edge.get("label", "")
                )
                if (found and label == "true") or (
                    not found and label == "false"
                ):
                    await self._execute_from(
                        edge["target"],
                        node_map,
                        adj,
                        ctx,
                        on_step,
                    )
        else:
            for edge in next_edges:
                await self._execute_from(
                    edge["target"],
                    node_map,
                    adj,
                    ctx,
                    on_step,
                )

    async def _execute_node(
        self,
        node_type: str,
        data: dict[str, Any],
        ctx: ExecutionContext,
    ) -> dict[str, Any] | None:
        if node_type == "capture":
            ctx.last_capture = self._capture.capture()
            return {"captured": True}

        elif node_type == "find_image":
            ctx.last_capture = self._capture.capture()
            tpl = _load_template(data)
            match = self._matcher.find(tpl, ctx.last_capture)
            ctx.last_match = match

            if data.get("save_to"):
                ctx.variables[data["save_to"]] = match

            if match:
                return {
                    "x": match.x,
                    "y": match.y,
                    "w": match.w,
                    "h": match.h,
                    "confidence": match.confidence,
                }
            return {"found": False}

        elif node_type == "click":
            x, y = self._resolve_click(data, ctx)
            button = data.get("button", "left")
            self._input.click(int(x), int(y), button=button)
            return {"clicked": True, "x": x, "y": y}

        elif node_type == "key_press":
            key = data.get("key", "")
            self._input.key_press(key)
            return {"key": key}

        elif node_type == "type_text":
            text = data.get("text", "")
            self._input.type_text(text)
            return {"text": text}

        elif node_type == "wait":
            ms = data.get("ms", 1000)
            await asyncio.sleep(ms / 1000.0)
            return {"waited_ms": ms}

        elif node_type == "condition":
            return {"found": ctx.last_match is not None}

        elif node_type == "loop":
            tpl = _load_template(data)
            max_iter = data.get("max_iterations", 10)
            iterations = 0
            for _i in range(max_iter):
                if self._cancelled:
                    break
                iterations = _i + 1
                ctx.last_capture = self._capture.capture()
                match = self._matcher.find(tpl, ctx.last_capture)
                ctx.last_match = match

                stop_when = data.get("stop_when", "found")
                if stop_when == "found" and match:
                    break
                if stop_when == "not_found" and not match:
                    break

                wait_ms = data.get("interval_ms", 1000)
                await asyncio.sleep(wait_ms / 1000.0)
            return {"iterations": iterations}

        else:
            logger.warning("Unknown node type: %s", node_type)
            return None

    def _resolve_click(
        self,
        data: dict[str, Any],
        ctx: ExecutionContext,
    ) -> tuple[int, int]:
        """Resolve click target coordinates."""
        mode = data.get("click_mode")
        # Backward compat: if x/y present without click_mode, use coord
        if mode is None:
            mode = "coord" if data.get("x") is not None else "image"

        if mode == "coord":
            x = data.get("x")
            y = data.get("y")
            if x is None or y is None:
                raise WorkflowExecutionError(
                    "Coordinate click requires x and y"
                )
            return int(x), int(y)

        if mode == "window":
            # TODO: implement window handle lookup
            raise WorkflowExecutionError(
                "Window mode not yet implemented"
            )

        # mode == "image" (default): use last_match center
        if ctx.last_match is None:
            raise WorkflowExecutionError(
                "Image click requires a prior find_image match"
            )
        cx = ctx.last_match.x + ctx.last_match.w // 2
        cy = ctx.last_match.y + ctx.last_match.h // 2

        # Apply offset
        ox = data.get("offset_x", 0) or 0
        oy = data.get("offset_y", 0) or 0
        offset_type = data.get("offset_type", "px")
        if offset_type == "pct":
            ox = int(ctx.last_match.w * ox / 100)
            oy = int(ctx.last_match.h * oy / 100)
        return cx + int(ox), cy + int(oy)
