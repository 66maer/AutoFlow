# AutoFlow - Development Guide

## Project Overview

Windows 桌面自动化工具，核心：屏幕感知（截图、图像识别）+ 输入控制（键鼠模拟），通过 REST API 暴露能力，未来提供 MCP Server 供 AI Agent 调用。

## Architecture Rules

严格三层架构，违反即 bug：

- **Layer 1 - Engine**（`app/engine/`）：纯 Python，零框架依赖。所有业务逻辑在这里。**engine 层不得 import 任何 FastAPI 内容。**
- **Layer 2 - Core API**（`app/api/`、`app/ws/`、`app/mcp/`）：FastAPI 薄路由层，仅做参数校验和调用 engine。WebUI、开发者、AI Agent（MCP）平级共享同一 engine 实例。
- **Layer 3 - WebUI**（`webui/`）：React 纯前端，只通过 HTTP/WebSocket 与 Layer 2 交互。

## Engine Abstractions

引擎层使用抽象基类，实现可替换：
- `ScreenCapture`（抽象） → `MssScreenCapture`（mss 实现）
- `ImageMatcher`（抽象） → `OrbImageMatcher`（OpenCV ORB 实现）
- `InputController`（抽象） → `PyAutoGuiInputController`（pyautogui 实现）

`app/engine/factory.py` 根据配置创建具体实例。

## Development Conventions

- **TDD**：先写测试再写实现，每阶段测试全绿才推进
- **测试**：engine 单元测试 + API 测试（httpx AsyncClient）全覆盖
- **配置**：pydantic-settings，支持 `.env` 覆盖，嵌套用 `__` 分隔
- **数据层**：SQLModel + SQLite（async via aiosqlite）
- **流程数据**：Workflow 的 nodes/edges 存 ReactFlow 格式 JSON
- **Lint**：Ruff（`ruff check`、`ruff format`）

## Commands

```bash
# 后端
uv sync                                    # 安装依赖
uv run uvicorn app.main:app --reload       # 启动后端
uv run pytest -v                           # 运行全部测试
uv run pytest tests/test_xxx.py -v         # 运行单个测试文件
uv run ruff check app/ tests/              # Lint 检查
uv run ruff format app/ tests/             # 格式化

# 前端
cd webui && npm install                    # 安装前端依赖
cd webui && npm run dev                    # 启动前端开发服务器
```

## Current Phase

第一阶段（进行中）：FastAPI 骨架、引擎层抽象与一期实现、流程执行引擎、REST API、WebUI 流程编辑器、模板图管理。

第二阶段（规划中）：MCP Server、内置截图选区工具、桌面打包（pywebview + PyInstaller）、驱动级键鼠（Interception）、高级图像识别（DINOv2）。
