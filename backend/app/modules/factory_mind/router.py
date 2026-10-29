import sys
import os
from pathlib import Path
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# Ensure src is in sys.path
MODULE_SRC = str(Path(__file__).parent / "src")
if MODULE_SRC not in sys.path:
    sys.path.insert(0, MODULE_SRC)

from preprocessing import FAILURE_FEATURES
from failure_model import load_failure_model, predict_failure
from recommendations import compute_health_score, root_cause_analysis, generate_recommendations

router = APIRouter(prefix="/api/factorymind", tags=["FactoryMind Predictive Maintenance"])

_failure_model = None
_failure_scaler = None

def get_model():
    global _failure_model, _failure_scaler
    if _failure_model is None:
        _failure_model, _failure_scaler = load_failure_model()
    return _failure_model, _failure_scaler


class MachineSensorInput(BaseModel):
    temperature: float = Field(72.0, description="Temperature (°C)")
    vibration: float = Field(3.5, description="Vibration (mm/s)")
    pressure: float = Field(35.0, description="Pressure (psi)")
    speed: float = Field(1750.0, description="Operating speed (rpm)")
    tool_wear: float = Field(30.0, description="Tool wear index (0-100)")
    torque: float = Field(42.0, description="Torque (Nm)")
    efficiency_pct: float = Field(88.0, description="Machine Efficiency %")
    operating_hours: float = Field(250.0, description="Operating Hours")
    machine_age_years: float = Field(3.0, description="Machine Age in Years")
    maintenance_count: int = Field(2, description="Maintenance Count")
    production_load: float = Field(85.0, description="Production Load %")


@router.get("/fleet-status")
def get_fleet_status():
    """Returns sample status for a factory machine fleet."""
    machines = [
        {"id": "M-101", "name": "CNC Milling Alpha", "temperature": 68.5, "vibration": 3.1, "tool_wear": 24, "health": 92.4, "status": "Healthy"},
        {"id": "M-102", "name": "Lathe Spindle Beta", "temperature": 81.2, "vibration": 5.4, "tool_wear": 68, "health": 61.8, "status": "Warning"},
        {"id": "M-103", "name": "Hydraulic Press 03", "temperature": 94.0, "vibration": 7.8, "tool_wear": 89, "health": 28.5, "status": "Critical"},
        {"id": "M-104", "name": "Stamping Unit Gamma", "temperature": 71.0, "vibration": 3.8, "tool_wear": 35, "health": 88.0, "status": "Healthy"},
        {"id": "M-105", "name": "Packaging Arm Delta", "temperature": 75.4, "vibration": 4.2, "tool_wear": 42, "health": 79.5, "status": "Healthy"},
    ]
    return {
        "total_machines": len(machines),
        "healthy_count": 3,
        "warning_count": 1,
        "critical_count": 1,
        "fleet": machines
    }


@router.post("/predict")
def predict_machine(input_data: MachineSensorInput):
    try:
        model, scaler = get_model()
        feature_dict = {
            "Temperature": input_data.temperature,
            "Vibration": input_data.vibration,
            "Pressure": input_data.pressure,
            "Rotational_Speed": input_data.speed,
            "Torque": input_data.torque,
            "Tool_Wear": input_data.tool_wear,
            "Operating_Hours": input_data.operating_hours,
            "Machine_Age_Years": input_data.machine_age_years,
            "Maintenance_Count": input_data.maintenance_count,
            "Production_Load": input_data.production_load,
        }

        # Predict failure probability
        pred_res = predict_failure(model, scaler, feature_dict)
        prob = pred_res["failure_probability"]

        # Rule-based health score
        anomaly_score = round(prob * 75, 1)
        health = compute_health_score(prob, anomaly_score, input_data.efficiency_pct, input_data.tool_wear)

        # Recommendations and root causes
        fake_top_factors = []
        if input_data.temperature > 78: fake_top_factors.append({"feature": "Temperature"})
        if input_data.vibration > 5: fake_top_factors.append({"feature": "Vibration"})
        if input_data.tool_wear > 60: fake_top_factors.append({"feature": "Tool_Wear"})

        rca = root_cause_analysis(feature_dict, fake_top_factors)
        recs = generate_recommendations(feature_dict, prob, "Elevated" if prob > 0.4 else "Normal")

        return {
            "prediction": pred_res["prediction"],
            "failure_probability": prob,
            "risk_level": pred_res["risk_level"],
            "health_score": health["health_score"],
            "status": health["status"],
            "root_cause_analysis": rca,
            "recommendations": recs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
