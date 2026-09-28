import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .models import SolveRequest
from .solver import solve

app = FastAPI(title="LED 混光配方台")


@app.post("/api/solve")
def api_solve(req: SolveRequest):
    channels = [c.model_dump() for c in req.channels]
    result = solve(channels, req.target.model_dump(), req.tolerance)
    if result is None:
        return {
            "status": "infeasible",
            "message": "无解：在给定容差内无法达到目标色，不返回近似配方",
        }
    return {"status": "ok", **result}


@app.get("/api/health")
def health():
    return {"status": "ok"}


# 静态页面（原生 HTML/CSS/JS）
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
