# AutoFlow

Windows 桌面自动化工具，核心能力是**屏幕感知**（截图、图像识别）和**输入控制**（键鼠模拟）。通过 REST API 对外暴露能力，用户可通过可视化流程编辑器创建自动化任务。未来提供 MCP Server，可作为 AI Agent 的眼睛和手。

## 架构

严格三层，边界清晰：

- **Layer 1 - Engine**（`app/engine/`）：纯 Python，零框架依赖，所有业务逻辑和系统操作在这里，可独立测试
- **Layer 2 - Core API**（`app/api/`、`app/ws/`，未来 `app/mcp/`）：FastAPI 薄路由层，是 Engine 的接入点之一。WebUI、开发者调用、AI Agent（MCP）平级共享同一 Engine 实例
- **Layer 3 - WebUI**（`webui/`）：React 纯前端，只通过 HTTP/WebSocket 与 Core API 交互

```
app/                  # Python 后端
├── api/              # REST API 路由层（Layer 2）
├── ws/               # WebSocket 实时日志推送（Layer 2）
├── mcp/              # MCP Server（Layer 2，第二阶段）
├── engine/           # 核心引擎（Layer 1，纯 Python，不依赖 FastAPI）
│   ├── screen.py         # ScreenCapture / ImageMatcher 抽象接口
│   ├── screen_mss.py     # mss 截图实现
│   ├── matcher_orb.py    # OpenCV ORB 特征点匹配实现
│   ├── input.py          # InputController 抽象接口
│   ├── input_pyautogui.py # pyautogui 实现
│   ├── workflow.py       # 流程执行状态机
│   ├── runner.py         # 运行管理
│   └── factory.py        # 根据配置创建引擎实例
├── db/               # SQLModel 模型 + async session
├── config.py         # pydantic-settings 嵌套配置
└── main.py           # FastAPI app 入口

webui/                # React 前端（仅通过 API 交互）
├── src/
│   ├── api/          # 后端 API 客户端封装
│   ├── components/   # Layout, FlowNode, NodeConfigPanel
│   ├── pages/        # WorkflowList, WorkflowEditor, Logs
│   └── styles/       # CSS
└── vite.config.ts    # Vite + API 代理配置
```

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Python 3.12+, FastAPI, uvicorn, SQLModel + SQLite, pydantic-settings |
| 引擎 | mss (截图), OpenCV (ORB 特征点匹配), pyautogui (键鼠) |
| 前端 | React 19, TypeScript, ReactFlow, React Router, Vite |
| 测试 | pytest + pytest-asyncio + httpx |
| Lint | Ruff |
| 包管理 | uv (Python), npm (Node.js) |

## 快速开始

### 后端

```bash
# 安装依赖
uv sync

# 复制环境变量（可选）
cp .env.example .env

# 启动服务
uv run uvicorn app.main:app --reload

# 运行测试
uv run pytest -v
```

### 前端

```bash
cd webui
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`，自动代理 `/api` 和 `/ws` 到后端 `http://127.0.0.1:8000`。

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/screen/capture` | 截图，返回 base64 |
| POST | `/api/screen/find` | 上传模板图，返回匹配坐标 |
| POST | `/api/input/click` | 点击 |
| POST | `/api/input/move` | 移动鼠标 |
| POST | `/api/input/key` | 按键 |
| POST | `/api/input/type` | 输入文字 |
| POST | `/api/input/scroll` | 滚动 |
| GET | `/api/workflows` | 工作流列表 |
| POST | `/api/workflows` | 创建工作流 |
| GET | `/api/workflows/{id}` | 工作流详情 |
| PUT | `/api/workflows/{id}` | 更新工作流 |
| DELETE | `/api/workflows/{id}` | 删除工作流 |
| POST | `/api/workflows/{id}/run` | 执行工作流 |
| POST | `/api/workflows/{id}/stop` | 停止工作流 |
| GET | `/api/logs` | 执行日志列表 |
| GET | `/api/logs/{id}` | 日志详情 |
| WS | `/ws/logs` | 实时日志推送 |

## 流程节点类型

| 类型 | 说明 |
|------|------|
| `capture` | 截图 |
| `find_image` | 在屏幕找模板图，返回坐标 |
| `click` | 点击坐标（可自动使用上一步匹配结果） |
| `key_press` | 按键 |
| `type_text` | 输入文字 |
| `wait` | 等待 N 毫秒 |
| `condition` | 分支：找到图像走 true 边，否则走 false 边 |
| `loop` | 循环：重复截图+匹配，直到条件满足 |

## 配置

通过 `.env` 文件或环境变量配置，使用 `__` 作为嵌套分隔符：

```env
SERVER__HOST=127.0.0.1
SERVER__PORT=8000
SERVER__LOG_LEVEL=info
DATABASE__URL=sqlite:///autoflow.db
ENGINE__IMAGE_MATCHER=orb
ENGINE__INPUT_BACKEND=pyautogui
ENGINE__MATCH_CONFIDENCE=0.8
```

## 开发阶段

### 第一阶段（当前）

FastAPI 骨架、引擎层抽象接口与一期实现、流程执行引擎、REST API、WebUI 流程编辑器、模板图管理、TDD 全覆盖。

### 第二阶段（规划中）

- MCP Server：将 screen/input 能力包装为 MCP tools，与 FastAPI 共享引擎实例
- 内置截图选区工具（tkinter 全屏透明选区窗口）
- 桌面打包：pywebview + PyInstaller
- 驱动级键鼠：Interception 驱动方案
- 高级图像识别：DINOv2 特征匹配

## License

MIT
