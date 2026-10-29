"""
failure_model.py
-----------------
Trains and serves the machine failure prediction model (binary classification).

Uses XGBoost (falls back to RandomForest automatically if xgboost is unavailable).
Reports real evaluation metrics computed on a held-out test split.
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, roc_curve,
)

from preprocessing import FAILURE_FEATURES, load_machine_data, fit_scaler, scale_features

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    from sklearn.ensemble import RandomForestClassifier
    HAS_XGB = False

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODEL_DIR, exist_ok=True)


def build_model():
    if HAS_XGB:
        return XGBClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.07,
            subsample=0.85,
            colsample_bytree=0.85,
            min_child_weight=2,
            eval_metric="logloss",
            random_state=42,
        )
    from sklearn.ensemble import RandomForestClassifier
    return RandomForestClassifier(n_estimators=300, max_depth=10, random_state=42)


def train():
    df = load_machine_data(os.path.join(os.path.dirname(__file__), "..", "data", "machine_data.csv"))
    X = df[FAILURE_FEATURES]
    y = df["Failure"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = fit_scaler(pd.concat([X_train]), FAILURE_FEATURES)
    X_train_s = scaler.transform(X_train.values)
    X_test_s = scaler.transform(X_test.values)

    model = build_model()
    model.fit(X_train_s, y_train)

    y_pred = model.predict(X_test_s)
    y_proba = model.predict_proba(X_test_s)[:, 1]

    metrics = {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
        "f1": round(f1_score(y_test, y_pred, zero_division=0), 4),
        "roc_auc": round(roc_auc_score(y_test, y_proba), 4),
        "model_type": "XGBoost" if HAS_XGB else "RandomForest",
    }
    cm = confusion_matrix(y_test, y_pred).tolist()
    fpr, tpr, _ = roc_curve(y_test, y_proba)

    joblib.dump(model, os.path.join(MODEL_DIR, "failure_model.pkl"))
    joblib.dump(scaler, os.path.join(MODEL_DIR, "failure_scaler.pkl"))
    joblib.dump(
        {"metrics": metrics, "confusion_matrix": cm, "roc_curve": (fpr.tolist(), tpr.tolist())},
        os.path.join(MODEL_DIR, "failure_eval.pkl"),
    )

    print("Failure model trained:", metrics)
    return model, scaler, metrics


def load_failure_model():
    model = joblib.load(os.path.join(MODEL_DIR, "failure_model.pkl"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "failure_scaler.pkl"))
    return model, scaler


def risk_category(prob: float) -> str:
    if prob >= 0.66:
        return "HIGH"
    if prob >= 0.33:
        return "MEDIUM"
    return "LOW"


def predict_failure(model, scaler, feature_row: dict):
    """feature_row: dict with keys matching FAILURE_FEATURES."""
    x = np.array([[feature_row[f] for f in FAILURE_FEATURES]])
    x_s = scaler.transform(x)
    prob = float(model.predict_proba(x_s)[0, 1])
    return {
        "failure_probability": round(prob, 4),
        "prediction": "Failure Risk Detected" if prob >= 0.5 else "No Immediate Failure Risk",
        "risk_level": risk_category(prob),
    }


if __name__ == "__main__":
    train()
