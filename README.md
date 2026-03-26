# AutoFlow

Windows 自动化工具，快速编辑工作流，完成日常重复性任务。
—— 截图识别 + 键鼠模拟，用可视化流程编辑器拖拽编排自动化任务。

附带实现 MCP Server，也可以让 AI Agent 直接操控桌面。

## 它能做什么

- **看屏幕**：在屏幕上找到需要的位置（OpenCV 模板匹配）
- **控键鼠**：点击、移动、打字、按键、滚动
- **编排流程**：拖拽式流程编辑器，支持条件分支、循环、变量
- **MCP 接入**：18 个 MCP tools，AI Agent 也能用

## 快速开始

```bash
# 后端
uv sync
uv run uvicorn app.main:app --reload

# 前端
cd webui && npm install && npm run dev
```

后端 `http://127.0.0.1:8000`，前端 `http://localhost:5173`（自动代理 API）。

## 架构

三层分离，engine 层纯 Python 零框架依赖：

```
Engine (app/engine/)     ← 纯业务逻辑，可独立测试
  ↑
Core API (app/api/ + app/ws/ + app/mcp/)  ← REST / WebSocket / MCP 三种接入
  ↑
WebUI (webui/)           ← React + ReactFlow 可视化编辑器
```

引擎层用抽象基类，实现可替换：

- 截图：`ScreenCapture` → MSS
- 找图：`ImageMatcher` → OpenCV 模板匹配
- 输入：`InputController` → PyAutoGUI

## MCP Server

如果你想让 AI Agent 接入，有两种方式：

**HTTP** — 启动后端后自动可用，端点 `http://127.0.0.1:8000/mcp`

**stdio** — 配置到 Claude Desktop / Claude Code：

```json
{
  "mcpServers": {
    "autoflow": {
      "command": "uv",
      "args": ["run", "python", "-m", "app.mcp"],
      "cwd": "/path/to/AutoFlow"
    }
  }
}
```

## 技术栈

**后端** Python 3.12+ / FastAPI / SQLModel + SQLite / MCP SDK

**引擎** mss / OpenCV / pyautogui

**前端** React 19 / TypeScript / ReactFlow / Vite

**工具链** uv / Ruff / pytest

## Roadmap

- [x] 引擎层抽象 + 实现
- [x] REST API + WebSocket 实时日志
- [x] 可视化流程编辑器（拖拽、条件、循环、变量）
- [x] MCP Server（HTTP + stdio）
- [ ] 内置截图选区工具
- [ ] 桌面打包（pywebview + PyInstaller）
- [ ] 驱动级键鼠（Interception）
- [ ] 高级图像识别（DINOv2）

## License

MIT
