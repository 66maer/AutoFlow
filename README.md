# AutoFlow

桌面自动化工具，核心能力是**屏幕识别**和**键鼠控制**。通过可视化流程编辑器编排自动化任务，REST API 暴露所有能力，可作为 AI Agent 的底层工具。

## 架构

两层架构，边界严格：

```
app/                  # Python 后端（FastAPI + 业务引擎）
├── api/              # REST API 路由层
├── ws/               # WebSocket 实时日志推送
├── engine/           # 核心引擎（纯 Python，不依赖 FastAPI）
│   ├── screen.py         # ScreenCapture / ImageMatcher 抽象接口
│   ├── screen_mss.py     # mss 截图实现
│   ├── matcher_orb.py    # OpenCV 模板匹配实现
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
| 引擎 | mss (截图), OpenCV (模板匹配), pyautogui (键鼠) |
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

## License

MIT
