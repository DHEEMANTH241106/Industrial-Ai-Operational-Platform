import io
import pandas as pd
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from .utils import (
    load_binary_model,
    load_failure_type_model,
    predict_machine_health,
    get_evaluated_metrics,
    validate_telemetry,
    validate_telemetry_dataframe,
    engineer_features
)

router = APIRouter(prefix="/api/previsio", tags=["Previsio Predictive Maintenance"])

_binary_bundle = None
_multiclass_model = None

def get_models():
    global _binary_bundle, _multiclass_model
    if _binary_bundle is None:
        _binary_bundle = load_binary_model()
    if _multiclass_model is None:
        _multiclass_model = load_failure_type_model()
    return _binary_bundle, _multiclass_model


class TelemetryInput(BaseModel):
    machine_type: str = Field("M", description="Machine Type: L, M, or H")
    air_temp: float = Field(300.0, description="Air temperature [K]")
    process_temp: float = Field(310.0, description="Process temperature [K]")
    rotational_speed: float = Field(1500.0, description="Rotational speed [rpm]")
    torque: float = Field(40.0, description="Torque [Nm]")
    tool_wear: float = Field(120.0, description="Tool wear [min]")


@router.get("/metrics")
def get_metrics():
    return get_evaluated_metrics()


@router.get("/samples")
def get_samples():
    return {
        "healthy": {
            "machine_type": "M",
            "air_temp": 298.1,
            "process_temp": 308.6,
            "rotational_speed": 1551.0,
            "torque": 42.8,
            "tool_wear": 0.0
        },
        "heat_dissipation_risk": {
            "machine_type": "L",
            "air_temp": 302.5,
            "process_temp": 310.4,
            "rotational_speed": 1380.0,
            "torque": 54.0,
            "tool_wear": 80.0
        },
        "power_failure_risk": {
            "machine_type": "L",
            "air_temp": 300.0,
            "process_temp": 310.0,
            "rotational_speed": 2800.0,
            "torque": 80.0,
            "tool_wear": 120.0
        },
        "tool_wear_failure_risk": {
            "machine_type": "H",
            "air_temp": 298.8,
            "process_temp": 308.9,
            "rotational_speed": 1450.0,
            "torque": 48.0,
            "tool_wear": 235.0
        },
        "overstrain_failure_risk": {
            "machine_type": "L",
            "air_temp": 299.5,
            "process_temp": 309.2,
            "rotational_speed": 1300.0,
            "torque": 68.0,
            "tool_wear": 215.0
        }
    }


@router.post("/predict")
def predict_single(data: TelemetryInput):
    is_valid, err_msg, validated = validate_telemetry(
        data.machine_type,
        data.air_temp,
        data.process_temp,
        data.rotational_speed,
        data.torque,
        data.tool_wear
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    (pipeline, threshold, model_name, _), multi_model = get_models()
    result = predict_machine_health(validated, pipeline, threshold=threshold)

    is_failure = result.get("failure_predicted", False)
    failure_type = "No Failure"
    if is_failure and multi_model is not None:
        try:
            df_raw = pd.DataFrame([validated])
            df_feat = engineer_features(df_raw)
            failure_type = str(multi_model.predict(df_feat)[0])
        except Exception:
            failure_type = "General Mechanical Anomaly"

    result["is_failure"] = is_failure
    result["diagnosed_failure_type"] = failure_type
    result["model_used"] = model_name
    return result


@router.post("/batch")
async def predict_batch_csv(file: UploadFile = File(...)):
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        is_valid, err_msg, df_clean = validate_telemetry_dataframe(df)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)

        (pipeline, threshold, model_name, _), multi_model = get_models()
        df_feat = engineer_features(df_clean)
        probas = pipeline.predict_proba(df_feat)[:, 1]

        records = []
        failure_count = 0
        for i, prob in enumerate(probas):
            p = float(prob)
            is_fail = bool(p >= threshold)
            if is_fail:
                failure_count += 1
            records.append({
                "row_index": i + 1,
                "failure_probability": round(p, 4),
                "is_failure": is_fail,
                "risk_tier": "CRITICAL" if p >= 0.7 else ("WARNING" if p >= 0.3 else "HEALTHY")
            })

        return {
            "total_records": len(df_clean),
            "flagged_failures": failure_count,
            "failure_rate_pct": round((failure_count / max(1, len(df_clean))) * 100, 2),
            "results": records[:200]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
