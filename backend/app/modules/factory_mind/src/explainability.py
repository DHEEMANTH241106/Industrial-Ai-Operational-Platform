"""
explainability.py
------------------
Explainable AI layer for the failure prediction model using SHAP.

Provides:
  - A background SHAP TreeExplainer built once from the trained failure model
  - Per-prediction feature contribution breakdown ("why is this machine at risk?")
  - Global feature importance for the Model Performance / Explainability pages
"""

import os
import numpy as np
import pandas as pd
import joblib
import shap

from preprocessing import FAILURE_FEATURES, load_machine_data

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

_explainer_cache = {}


def get_explainer(model):
    """Cache the SHAP explainer since building it is the expensive part."""
    key = id(model)
    if key not in _explainer_cache:
        _explainer_cache[key] = shap.TreeExplainer(model)
    return _explainer_cache[key]


def explain_prediction(model, scaler, feature_row: dict, top_n=4):
    """
    Returns the top contributing risk factors for a single prediction, as
    positive-normalized percentages that sum to 100 (only positive/risk-increasing
    contributions are shown, matching the "Top Risk Factors" product requirement).
    """
    x = np.array([[feature_row[f] for f in FAILURE_FEATURES]])
    x_s = scaler.transform(x)

    explainer = get_explainer(model)
    shap_values = explainer.shap_values(x_s)
    if isinstance(shap_values, list):  # some sklearn-wrapped models return a list per class
        shap_values = shap_values[-1]
    values = np.array(shap_values).flatten()

    contributions = list(zip(FAILURE_FEATURES, values))
    # Keep only factors pushing risk UP (positive SHAP value)
    positive = [(f, v) for f, v in contributions if v > 0]
    positive.sort(key=lambda t: t[1], reverse=True)
    positive = positive[:top_n]

    total = sum(v for _, v in positive) or 1e-9
    factors = [
        {"feature": f, "contribution_pct": round(float(v) / float(total) * 100, 1)}
        for f, v in positive
    ]
    return factors


def global_feature_importance(model, sample_size=300):
    """Global SHAP-based feature importance across a sample of the dataset."""
    df = load_machine_data(os.path.join(os.path.dirname(__file__), "..", "data", "machine_data.csv"))
    sample = df[FAILURE_FEATURES].sample(min(sample_size, len(df)), random_state=42)

    scaler = joblib.load(os.path.join(MODEL_DIR, "failure_scaler.pkl"))
    x_s = scaler.transform(sample.values)

    explainer = get_explainer(model)
    shap_values = explainer.shap_values(x_s)
    if isinstance(shap_values, list):
        shap_values = shap_values[-1]

    mean_abs = np.abs(np.array(shap_values)).mean(axis=0)
    total = mean_abs.sum() or 1e-9
    importance = sorted(
        [{"feature": f, "importance_pct": round(float(v) / float(total) * 100, 1)} for f, v in zip(FAILURE_FEATURES, mean_abs)],
        key=lambda d: d["importance_pct"], reverse=True,
    )
    return importance


if __name__ == "__main__":
    from failure_model import load_failure_model

    model, scaler = load_failure_model()
    print("Global importance:", global_feature_importance(model))

    sample_row = {
        "Temperature": 88, "Vibration": 7.8, "Pressure": 45, "Rotational_Speed": 1300,
        "Torque": 58, "Tool_Wear": 82, "Operating_Hours": 1400, "Machine_Age_Years": 6.2,
        "Maintenance_Count": 3, "Production_Load": 0.9,
    }
    print("Explanation for sample high-risk row:", explain_prediction(model, scaler, sample_row))
