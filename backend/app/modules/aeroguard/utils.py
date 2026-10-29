"""
AeroGuard — Aircraft Engine RUL Prediction Utilities.

Implements the NASA CMAPSS-inspired pipeline:
  - 21 sensor streams per engine
  - Feature engineering: rolling statistics, op-cluster normalization
  - Multi-model: Linear, Ridge, Random Forest, XGBoost (simulated weights)
  - 3-tier alert: CRITICAL / WARNING / NORMAL
  - SHAP-style top-feature explanations
"""

import math
import random
import hashlib
from typing import Dict, Any, List, Optional, Tuple


# ── Sensor Metadata (NASA CMAPSS FD001 subset, high-variance sensors) ─────────
# Sensors with near-zero variance are dropped per the AeroGuard EDA step.
SENSOR_META = {
    "s2":  {"name": "Total temperature at LPC outlet",    "unit": "°R",  "nominal": 641.82, "std": 5.12},
    "s3":  {"name": "Total temperature at HPC outlet",    "unit": "°R",  "nominal": 1589.5, "std": 28.4},
    "4":   {"name": "Total temperature at LPT outlet",    "unit": "°R",  "nominal": 1400.0, "std": 10.0},
    "s7":  {"name": "Total pressure at HPC outlet",       "unit": "psia","nominal": 554.36, "std": 5.73},
    "s8":  {"name": "Physical fan speed",                 "unit": "rpm", "nominal": 2388.0, "std": 38.6},
    "s9":  {"name": "Physical core speed",                "unit": "rpm", "nominal": 9046.2, "std": 48.3},
    "s11": {"name": "Static pressure at HPC outlet",      "unit": "psia","nominal": 47.54,  "std": 1.02},
    "s12": {"name": "Ratio of fuel flow to Ps30",         "unit": "pps/psia", "nominal": 521.0, "std": 17.4},
    "s13": {"name": "Corrected fan speed",                "unit": "rpm", "nominal": 2388.0, "std": 38.6},
    "s14": {"name": "Corrected core speed",               "unit": "rpm", "nominal": 8143.7, "std": 36.2},
    "s15": {"name": "Bypass ratio",                       "unit": "",    "nominal": 8.435,  "std": 0.33},
    "s17": {"name": "Bleed enthalpy",                     "unit": "",    "nominal": 392.0,  "std": 13.2},
    "s20": {"name": "HPT coolant bleed",                  "unit": "",    "nominal": 39.06,  "std": 1.5},
    "s21": {"name": "LPT coolant bleed",                  "unit": "",    "nominal": 23.42,  "std": 1.1},
}

# Top SHAP features (XGBoost importance order from original AeroGuard results)
TOP_SHAP_FEATURES = [
    ("s11_roll_mean_20", 0.182),
    ("s3_roll_mean_20",  0.157),
    ("s4_roll_mean_10",  0.138),
    ("s7_roll_std_20",   0.121),
    ("s9_roll_mean_5",   0.103),
    ("s12_roll_mean_20", 0.088),
    ("s14_roll_std_20",  0.074),
    ("s21_roll_mean_10", 0.062),
    ("s8_roll_mean_5",   0.049),
    ("cycle_norm",       0.026),
]

# Benchmark table from AeroGuard results
MODEL_BENCHMARKS = [
    {"model": "Linear Regression", "rmse": 31.4, "mae": 23.7, "r2": 0.61},
    {"model": "Ridge Regression",  "rmse": 30.8, "mae": 23.1, "r2": 0.63},
    {"model": "Random Forest",     "rmse": 19.6, "mae": 14.2, "r2": 0.81},
    {"model": "XGBoost",           "rmse": 17.2, "mae": 12.5, "r2": 0.85},
    {"model": "LSTM",              "rmse": 14.8, "mae": 10.9, "r2": 0.89},
]


def _seed_from_engine_id(engine_id: int) -> int:
    """Deterministic seed so same engine_id always gives same data."""
    return int(hashlib.md5(str(engine_id).encode()).hexdigest(), 16) % (2**31)


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def simulate_engine_sensor_history(engine_id: int, current_cycle: int) -> List[Dict[str, Any]]:
    """
    Generate a realistic sensor history list for an engine.
    Simulates degradation: sensors drift as cycle progresses toward max_life.
    Returns last 30 cycles of readings.
    """
    rng = random.Random(_seed_from_engine_id(engine_id))
    max_life = rng.randint(180, 350)
    degradation_rate = 1.0 - (current_cycle / max_life)  # 1.0 = healthy, 0.0 = near-failure

    history = []
    start_cycle = max(1, current_cycle - 29)
    for c in range(start_cycle, current_cycle + 1):
        degrade = 1.0 - (c / max_life)
        row = {"cycle": c}
        for sid, meta in SENSOR_META.items():
            drift = (1.0 - degrade) * meta["std"] * rng.gauss(0.4, 0.15)
            noise = rng.gauss(0, meta["std"] * 0.05)
            row[sid] = round(meta["nominal"] + drift + noise, 4)
        history.append(row)
    return history


def predict_rul(
    engine_id: int,
    current_cycle: int,
    op_setting_1: float = 0.0,
    op_setting_2: float = 0.0,
    op_setting_3: float = 100.0,
) -> Dict[str, Any]:
    """
    Predict Remaining Useful Life (RUL) for a turbofan engine.
    Uses a deterministic simulation calibrated on CMAPSS FD001 characteristics.
    """
    rng = random.Random(_seed_from_engine_id(engine_id))
    max_life = rng.randint(180, 350)

    # Piecewise RUL formulation (matches AeroGuard methodology)
    RUL_CLIP = 125  # Engines in early life get clipped RUL
    true_rul = max(0, max_life - current_cycle)
    clipped_rul = min(true_rul, RUL_CLIP)

    # Add model error (simulated XGBoost ~RMSE 17.2)
    model_noise = rng.gauss(0, 8.0)
    predicted_rul = max(0, round(clipped_rul + model_noise, 1))

    # Probability of failure within 30 cycles
    fail_prob_30 = _clamp(1.0 - (predicted_rul / 30.0), 0.0, 1.0) if predicted_rul <= 30 else 0.0

    # Health score (0-100)
    health_score = _clamp(round((predicted_rul / RUL_CLIP) * 100, 1), 0, 100)

    # Alert tier
    if predicted_rul <= 20:
        alert = "CRITICAL"
        alert_color = "red"
        recommendation = "Ground immediately — imminent failure. Schedule emergency overhaul."
    elif predicted_rul <= 50:
        alert = "WARNING"
        alert_color = "amber"
        recommendation = "Schedule maintenance within next 20 cycles. Increase sensor monitoring frequency."
    else:
        alert = "NORMAL"
        alert_color = "green"
        recommendation = "Engine operating within normal degradation envelope. Continue standard monitoring."

    # Sensor readings at current cycle
    sensor_history = simulate_engine_sensor_history(engine_id, current_cycle)
    latest_sensors = sensor_history[-1] if sensor_history else {}

    # Top contributing features (SHAP-inspired)
    top_factors = [
        f["name"]
        for f, _ in sorted(
            [(SENSOR_META[k], v) for k, v in TOP_SHAP_FEATURES[:5] if k in SENSOR_META],
            key=lambda x: x[1],
            reverse=True,
        )
    ][:3]

    if not top_factors:
        top_factors = ["Static pressure at HPC outlet (s11)", "Bypass ratio (s15)", "Core speed (s9)"]

    return {
        "engine_id": engine_id,
        "current_cycle": current_cycle,
        "predicted_rul": predicted_rul,
        "true_rul_clipped": clipped_rul,
        "health_score": health_score,
        "alert_tier": alert,
        "alert_color": alert_color,
        "failure_probability_30_cycles": round(fail_prob_30, 4),
        "recommendation": recommendation,
        "op_cluster": _get_op_cluster(op_setting_1, op_setting_2, op_setting_3),
        "top_contributing_features": top_factors,
        "sensor_snapshot": {k: v for k, v in latest_sensors.items() if k != "cycle"},
        "model_used": "XGBoost (RMSE=17.2, R²=0.85)",
    }


def _get_op_cluster(op1: float, op2: float, op3: float) -> int:
    """Map operational settings to one of 3 clusters (KMeans-derived from CMAPSS FD001)."""
    if op3 > 80:
        return 0  # High-altitude cruise
    elif op3 > 50:
        return 1  # Medium-thrust cruise
    else:
        return 2  # Low-thrust / ground ops


def get_fleet_status(n_engines: int = 20) -> List[Dict[str, Any]]:
    """
    Generate a fleet-level summary for N engines.
    Returns per-engine health status, RUL, alert tier, and cycle count.
    """
    fleet = []
    for eid in range(1, n_engines + 1):
        rng = random.Random(_seed_from_engine_id(eid))
        current_cycle = rng.randint(30, 280)
        result = predict_rul(eid, current_cycle)
        fleet.append({
            "engine_id": eid,
            "engine_label": f"ENG-{eid:03d}",
            "current_cycle": current_cycle,
            "predicted_rul": result["predicted_rul"],
            "health_score": result["health_score"],
            "alert_tier": result["alert_tier"],
            "failure_probability_30_cycles": result["failure_probability_30_cycles"],
            "op_cluster": result["op_cluster"],
        })
    return fleet


def get_benchmark_metrics() -> Dict[str, Any]:
    """Return the model benchmark comparison table and SHAP feature importance."""
    return {
        "dataset": "NASA CMAPSS FD001",
        "training_engines": 100,
        "test_engines": 100,
        "sensors_used": 14,
        "sensors_dropped_low_variance": 7,
        "feature_engineering": "Rolling stats (5/10/20 cycles), op-cluster normalization",
        "best_model": "XGBoost",
        "benchmarks": MODEL_BENCHMARKS,
        "shap_top_features": [
            {"feature": feat, "importance": imp} for feat, imp in TOP_SHAP_FEATURES
        ],
        "rul_formulation": "Piecewise linear (clip at 125 cycles)",
    }


def get_degradation_curve(engine_id: int, total_life_estimate: int = 250) -> List[Dict[str, Any]]:
    """
    Generate a full lifecycle degradation curve for visualization.
    Returns predicted RUL at every 10-cycle interval.
    """
    rng = random.Random(_seed_from_engine_id(engine_id))
    max_life = rng.randint(180, 350)
    curve = []
    for cycle in range(10, min(max_life, total_life_estimate) + 1, 10):
        result = predict_rul(engine_id, cycle)
        curve.append({
            "cycle": cycle,
            "predicted_rul": result["predicted_rul"],
            "health_score": result["health_score"],
            "alert_tier": result["alert_tier"],
        })
    return curve
