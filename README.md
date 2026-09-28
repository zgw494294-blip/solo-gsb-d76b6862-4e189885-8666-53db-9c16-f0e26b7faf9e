# LED 混光配方台

本地运行的 LED 混光配方求解平台：以 OR-Tools CP-SAT 求解最小总功率配方，Python/FastAPI 提供接口，页面为原生 HTML/CSS/JavaScript。

## 单条启动命令

```bash
docker compose up --build
```

启动后访问：<http://localhost:8000>

（端口映射为 `8000:8000`，如需修改宿主机端口请改 `docker-compose.yml` 的 `ports`。）

## 本地开发（不用 Docker）

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

访问 <http://localhost:8000>。

## 功能说明

- 录入 **3～6 路** LED，ID 唯一；每路满档线性 RGB 读数各为 **0～1000** 整数且不全为零，满档功率 **1～10000 mW** 整数。
- 目标线性 RGB 各为 **0～1000**，共用整数容差 **0～20**。
- 每路驱动级为 **0～255** 整数；实际各色分量 = Σ(各路满档读数 × 驱动级) / 255，**不裁剪**，须同时落在目标±容差与 0～1000 内。
- 优化目标：**总功率最小**（Σ 满档功率 × 驱动级 / 255）；功率相同时，按 ID 排序的驱动级序列取**字典序最小**。
- 无解时明确提示，不返回近似配方。
- 页面可编辑通道，对照目标与实际色块（按标准 sRGB 传递函数显示）、驱动级、误差和功率。

## API

- `POST /api/solve`：求解配方。请求体示例：

```json
{
  "channels": [
    {"id": "LED1", "r": 100, "g": 200, "b": 300, "power": 1000},
    {"id": "LED2", "r": 400, "g": 100, "b": 200, "power": 2000},
    {"id": "LED3", "r": 200, "g": 300, "b": 100, "power": 1500}
  ],
  "target": {"r": 500, "g": 500, "b": 500},
  "tolerance": 10
}
```

- `GET /api/health`：健康检查。
- 静态页面：`/`。

## 目录结构

```
app/
  main.py        # FastAPI 入口
  models.py      # Pydantic 数据模型与校验
  solver.py      # CP-SAT 求解器
  static/        # 原生前端页面
Dockerfile
docker-compose.yml
requirements.txt
```
