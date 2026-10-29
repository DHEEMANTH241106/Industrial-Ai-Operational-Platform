import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel

from .ml_engine import (
    generate_training_dataset,
    generate_new_components_dataset,
    run_python_ml_screening
)

router = APIRouter(prefix="/api/aegis-burn", tags=["AegisBurn Semiconductor Screening"])

STORAGE_DIR = Path(__file__).parent / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
HISTORY_FILE = STORAGE_DIR / "analysis_history.json"
SETTINGS_FILE = STORAGE_DIR / "settings.json"


def load_history() -> List[Dict[str, Any]]:
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return [
        {
            "analysis_id": "ANALYSIS #1042",
            "training_file": "training_dataset.csv (1,000 reference rows)",
            "new_file": "new_components_dataset.csv (1,000 device rows)",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "components": 1000,
            "high_risk": 116,
            "status": "Completed",
            "avg_anomaly_score": 29.8
        }
    ]


def save_history(data: List[Dict[str, Any]]):
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error writing history: {e}")


def load_settings() -> Dict[str, Any]:
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "user_name": "Safety & Quality Ops",
        "email": "quality@safetyops.local",
        "low_risk_threshold": 35,
        "medium_risk_threshold": 70,
        "missing_data_policy": "median",
        "model_profile": "rf_regressor_isolation_forest"
    }


def save_settings(data: Dict[str, Any]):
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error writing settings: {e}")


_demo_cache: Optional[Dict[str, Any]] = None


def get_or_create_demo_analysis() -> Dict[str, Any]:
    global _demo_cache
    if _demo_cache is None:
        train_data = generate_training_dataset(1000)
        new_data = generate_new_components_dataset(1000)
        screening = run_python_ml_screening(train_data, new_data)
        _demo_cache = {
            "analysis_id": "ANALYSIS #1042",
            "timestamp": datetime.utcnow().isoformat(),
            "training_filename": "training_dataset.csv (Historical Reference - 1,000 rows)",
            "new_filename": "new_components_dataset.csv (Unseen Batch - 1,000 DUTs)",
            "dashboard": screening["dashboard"],
            "results": screening["results"],
            "model_metrics": screening["model_metrics"],
            "batch_summaries": screening["batch_summaries"]
        }
    return _demo_cache


@router.get("/health")
def health_check():
    return {
        "status": "online",
        "module": "AegisBurn AI Semiconductor Screening",
        "engine": "Python Scikit-Learn + NumPy + Pandas"
    }


@router.get("/demo")
def get_demo_analysis():
    return get_or_create_demo_analysis()


class AnalyzeRequest(BaseModel):
    training_data: Optional[List[Dict[str, Any]]] = None
    new_data: Optional[List[Dict[str, Any]]] = None
    training_filename: Optional[str] = "training_dataset.csv"
    new_filename: Optional[str] = "new_components_dataset.csv"
    settings: Optional[Dict[str, Any]] = None


@router.post("/analyze")
def analyze_screening(req: AnalyzeRequest):
    train_rows = req.training_data if req.training_data and len(req.training_data) > 0 else generate_training_dataset(1000)
    target_rows = req.new_data if req.new_data and len(req.new_data) > 0 else generate_new_components_dataset(1000)

    user_settings = req.settings or load_settings()
    low_th = float(user_settings.get("low_risk_threshold", 35))
    med_th = float(user_settings.get("medium_risk_threshold", 70))

    screening = run_python_ml_screening(
        train_rows,
        target_rows,
        low_thresh=low_th,
        med_thresh=med_th
    )

    analysis_id = f"ANALYSIS #{int(datetime.utcnow().timestamp()) % 9000 + 1000}"
    response_data = {
        "analysis_id": analysis_id,
        "timestamp": datetime.utcnow().isoformat(),
        "training_filename": req.training_filename or "training_dataset.csv",
        "new_filename": req.new_filename or "new_components_dataset.csv",
        "dashboard": screening["dashboard"],
        "results": screening["results"],
        "model_metrics": screening["model_metrics"],
        "batch_summaries": screening["batch_summaries"]
    }

    history = load_history()
    history.insert(0, {
        "analysis_id": analysis_id,
        "training_file": f"{req.training_filename or 'training.csv'} ({len(train_rows)} rows)",
        "new_file": f"{req.new_filename or 'new_components.csv'} ({len(target_rows)} rows)",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "components": len(target_rows),
        "high_risk": screening["dashboard"]["high_risk_count"],
        "status": "Completed",
        "avg_anomaly_score": screening["dashboard"]["avg_anomaly_score"]
    })
    save_history(history[:25])

    return response_data


@router.get("/history")
def get_history():
    return load_history()


@router.get("/settings")
def get_settings():
    return load_settings()


@router.post("/settings")
def update_settings(settings: Dict[str, Any] = Body(...)):
    current = load_settings()
    current.update(settings)
    save_settings(current)
    return current
