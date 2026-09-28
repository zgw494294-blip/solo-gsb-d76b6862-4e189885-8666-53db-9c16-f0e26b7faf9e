"""LED 混光配方求解器。

以 OR-Tools CP-SAT 求解：
- 每路驱动级 d_i ∈ [0, 255] 整数
- 实际线性 RGB 分量 = Σ_i 满档读数_i * d_i / 255，不裁剪
- 约束：各分量落在 0～1000 且落在目标 ± 容差 内
- 目标：最小化总功率 Σ_i 满档功率_i * d_i / 255
- 功率相同时：按 ID 排序的驱动级序列取字典序最小
"""

from ortools.sat.python import cp_model

DRIVE_MAX = 255
READING_MAX = 1000
# 实际分量 = Σ reading * d / 255，乘以 255 后为整数约束
SCALE = DRIVE_MAX


def solve(channels, target, tolerance):
    """求解混光配方。

    Args:
        channels: list of dict, 每个含 id/r/g/b/power
        target: dict, 含 r/g/b
        tolerance: int, 共用整数容差 0～20

    Returns:
        dict: {drives, actual, power_mw} 或 None（无解）
    """
    # 按 ID 排序，用于字典序 tie-break
    channels = sorted(channels, key=lambda c: c["id"])
    n = len(channels)

    model = cp_model.CpModel()

    # 驱动级变量
    d = [model.NewIntVar(0, DRIVE_MAX, f"d_{i}") for i in range(n)]

    # 颜色约束：0 <= Σ reading*d <= SCALE*READING_MAX
    # 且 SCALE*(target - tol) <= Σ reading*d <= SCALE*(target + tol)
    for color in ("r", "g", "b"):
        expr = sum(channels[i][color] * d[i] for i in range(n))
        model.Add(expr >= 0)
        model.Add(expr <= SCALE * READING_MAX)
        model.Add(expr >= SCALE * (target[color] - tolerance))
        model.Add(expr <= SCALE * (target[color] + tolerance))

    # 总功率（乘以 SCALE，整数）
    power_expr = sum(channels[i]["power"] * d[i] for i in range(n))
    model.Minimize(power_expr)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30.0
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None

    opt_power = solver.Value(power_expr)

    # 第二阶段：功率最优的前提下，驱动级序列字典序最小
    model.Add(power_expr == opt_power)
    # 基 256 > 最大驱动级 255，加权和保持字典序
    weights = [256 ** (n - 1 - i) for i in range(n)]
    lex_expr = sum(weights[i] * d[i] for i in range(n))
    model.Minimize(lex_expr)

    status2 = solver.Solve(model)
    drives = [solver.Value(d[i]) for i in range(n)]

    # 计算实际分量与功率
    actual = {}
    for color in ("r", "g", "b"):
        actual[color] = sum(channels[i][color] * drives[i] for i in range(n)) / SCALE
    power_mw = opt_power / SCALE

    return {
        "drives": [
            {"id": channels[i]["id"], "value": drives[i]} for i in range(n)
        ],
        "actual": actual,
        "power_mw": power_mw,
    }
