"""
AeroGuard FastAPI Router — Aircraft Engine RUL Prediction.

Endpoints:
  GET  /api/aeroguard/fleet         → Fleet status for 20 engines
  GET  /api/aeroguard/metrics       → Model benchmarks & SHAP features
  POST /api/aeroguard/predict       → Single-engine RUL prediction
  GET  /api/aeroguard/degradation/{engine_id}  → Lifecycle degradation curve
  GET  /api/aeroguard/sensors       → Sensor metadata reference
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from .utils import (
    predict_rul,
    get_fleet_status,
    get_benchmark_metrics,
    get_degradation_curve,
    SENSOR_META,
)

router = APIRouter(prefix="/api/aeroguard", tags=["AeroGuard — Aircraft Engine RUL"])


class RULInput(BaseModel):
    engine_id: int = Field(1, description="Engine unit ID (1–100)", ge=1, le=9999)
    current_cycle: int = Field(150, description="Current operational cycle count", ge=1, le=500)
    op_setting_1: float = Field(0.0, description="Operational setting 1 (altitude/Mach proxy)")
    op_setting_2: float = Field(0.0, description="Operational setting 2 (throttle resolver angle proxy)")
    op_setting_3: float = Field(100.0, description="Operational setting 3 (TRA proxy)")


@router.get("/fleet")
def get_fleet():
    """Return health status for a simulated fleet of 20 aircraft engines."""
    fleet = get_fleet_status(n_engines=20)
    critical = sum(1 for e in fleet if e["alert_tier"] == "CRITICAL")
    warning = sum(1 for e in fleet if e["alert_tier"] == "WARNING")
    normal = sum(1 for e in fleet if e["alert_tier"] == "NORMAL")
    avg_health = round(sum(e["health_score"] for e in fleet) / len(fleet), 1)
    return {
        "fleet": fleet,
        "summary": {
            "total_engines": len(fleet),
            "critical": critical,
            "warning": warning,
            "normal": normal,
            "average_health_score": avg_health,
            "fleet_readiness_pct": round((normal / len(fleet)) * 100, 1),
        },
    }


@router.get("/metrics")
def get_metrics():
    """Return model benchmark table, SHAP feature importance, and dataset info."""
    return get_benchmark_metrics()


@router.post("/predict")
def predict_engine_rul(data: RULInput):
    """
    Predict Remaining Useful Life (RUL) for a specific engine at a given cycle.
    Returns health score, alert tier, top contributing sensor features, and recommendations.
    """
    try:
        result = predict_rul(
            engine_id=data.engine_id,
            current_cycle=data.current_cycle,
            op_setting_1=data.op_setting_1,
            op_setting_2=data.op_setting_2,
            op_setting_3=data.op_setting_3,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/degradation/{engine_id}")
def get_engine_degradation(engine_id: int):
    """
    Return the full lifecycle degradation curve for an engine (RUL vs cycle).
    Useful for time-series visualization.
    """
    if engine_id < 1 or engine_id > 9999:
        raise HTTPException(status_code=400, detail="engine_id must be between 1 and 9999")
    curve = get_degradation_curve(engine_id)
    return {
        "engine_id": engine_id,
        "engine_label": f"ENG-{engine_id:03d}",
        "curve": curve,
    }


@router.get("/sensors")
def get_sensors():
    """Return metadata for all 14 high-variance sensors used in the AeroGuard pipeline."""
    return {
        "dataset": "NASA CMAPSS FD001",
        "total_raw_sensors": 21,
        "sensors_dropped_low_variance": 7,
        "active_sensors": [
            {"id": sid, **meta}
            for sid, meta in SENSOR_META.items()
        ],
    }


@router.get("/samples")
def get_sample_inputs():
    """Return example engine inputs for different health states."""
    return {
        "healthy_engine": {
            "engine_id": 1,
            "current_cycle": 50,
            "op_setting_1": 0.0,
            "op_setting_2": 0.0,
            "op_setting_3": 100.0,
        },
        "warning_engine": {
            "engine_id": 7,
            "current_cycle": 160,
            "op_setting_1": 10.0,
            "op_setting_2": 0.25,
            "op_setting_3": 60.0,
        },
        "critical_engine": {
            "engine_id": 12,
            "current_cycle": 240,
            "op_setting_1": 20.0,
            "op_setting_2": 0.7,
            "op_setting_3": 25.0,
        },
    }
