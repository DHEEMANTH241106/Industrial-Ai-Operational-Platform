"""
production_model.py
--------------------
Trains and serves the production performance regression model.

Predicts expected production output from machine conditions, and derives
an efficiency percentage against the target production for that load.
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from preprocessing import PRODUCTION_FEATURES, load_machine_data, fit_scaler

try:
    from xgboost import XGBRegressor
    HAS_XGB = True
except ImportError:
    from sklearn.ensemble import RandomForestRegressor
    HAS_XGB = False

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODEL_DIR, exist_ok=True)


def build_model():
    if HAS_XGB:
        return XGBRegressor(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.07,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=42,
        )
    from sklearn.ensemble import RandomForestRegressor
    return RandomForestRegressor(n_estimators=300, max_depth=10, random_state=42)


def train():
    df = load_machine_data(os.path.join(os.path.dirname(__file__), "..", "data", "machine_data.csv"))
    X = df[PRODUCTION_FEATURES]
    y = df["Production_Output"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = fit_scaler(X_train, PRODUCTION_FEATURES)
    X_train_s = scaler.transform(X_train.values)
    X_test_s = scaler.transform(X_test.values)

    model = build_model()
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    metrics = {
        "mae": round(mean_absolute_error(y_test, y_pred), 2),
        "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 2),
        "r2": round(r2_score(y_test, y_pred), 4),
        "model_type": "XGBoost" if HAS_XGB else "RandomForest",
    }

    joblib.dump(model, os.path.join(MODEL_DIR, "production_model.pkl"))
    joblib.dump(scaler, os.path.join(MODEL_DIR, "production_scaler.pkl"))
    joblib.dump(metrics, os.path.join(MODEL_DIR, "production_eval.pkl"))

    print("Production model trained:", metrics)
    return model, scaler, metrics


def load_production_model():
    model = joblib.load(os.path.join(MODEL_DIR, "production_model.pkl"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "production_scaler.pkl"))
    return model, scaler


def predict_production(model, scaler, feature_row: dict, target_production: float):
    x = np.array([[feature_row[f] for f in PRODUCTION_FEATURES]])
    x_s = scaler.transform(x)
    predicted = float(model.predict(x_s)[0])
    efficiency = float(np.clip(predicted / target_production * 100, 0, 150)) if target_production > 0 else 0.0
    return {
        "target_production": round(target_production, 1),
        "predicted_production": round(predicted, 1),
        "efficiency_pct": round(efficiency, 1),
    }


if __name__ == "__main__":
    train()
