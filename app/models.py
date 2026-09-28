from typing import List

from pydantic import BaseModel, Field, field_validator


class Channel(BaseModel):
    id: str
    r: int
    g: int
    b: int
    power: int

    @field_validator("id")
    @classmethod
    def id_nonempty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("ID 不能为空")
        return v

    @field_validator("r", "g", "b")
    @classmethod
    def rgb_range(cls, v: int) -> int:
        if not (0 <= v <= 1000):
            raise ValueError("RGB 必须在 0～1000 之间")
        return v

    @field_validator("power")
    @classmethod
    def power_range(cls, v: int) -> int:
        if not (1 <= v <= 10000):
            raise ValueError("满档功率必须在 1～10000 mW 之间")
        return v


class Target(BaseModel):
    r: int
    g: int
    b: int

    @field_validator("r", "g", "b")
    @classmethod
    def rgb_range(cls, v: int) -> int:
        if not (0 <= v <= 1000):
            raise ValueError("目标 RGB 必须在 0～1000 之间")
        return v


class SolveRequest(BaseModel):
    channels: List[Channel] = Field(..., min_length=3, max_length=6)
    target: Target
    tolerance: int

    @field_validator("tolerance")
    @classmethod
    def tol_range(cls, v: int) -> int:
        if not (0 <= v <= 20):
            raise ValueError("容差必须在 0～20 之间")
        return v

    @field_validator("channels")
    @classmethod
    def channels_check(cls, v: List[Channel]) -> List[Channel]:
        ids = [c.id for c in v]
        if len(set(ids)) != len(ids):
            raise ValueError("通道 ID 必须唯一")
        for c in v:
            if c.r == 0 and c.g == 0 and c.b == 0:
                raise ValueError(f"通道 {c.id} 的满档 RGB 读数不全为零")
        return v
