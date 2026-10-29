"""
forecast_model.py
------------------
GRU-based time-series forecasting for future production trends, trained on the
per-machine daily production history in production_data.csv.

A single global model is trained across all machines (with per-machine
normalization) so it generalizes to any machine's recent window at inference time.
"""

import os
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, GRU, Dense
from sklearn.metrics import mean_absolute_error

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

WINDOW = 14      # days of history used to forecast
HORIZON = 3      # days forecast ahead

tf.random.set_seed(42)


def build_windows(series: np.ndarray, window=WINDOW, horizon=HORIZON):
    X, y = [], []
    for i in range(len(series) - window - horizon + 1):
        X.append(series[i:i + window])
        y.append(series[i + window:i + window + horizon])
    return np.array(X), np.array(y)


def build_model():
    inputs = Input(shape=(WINDOW, 1))
    x = GRU(32, activation="tanh", return_sequences=True)(inputs)
    x = GRU(16, activation="tanh")(x)
    x = Dense(16, activation="relu")(x)
    outputs = Dense(HORIZON)(x)
    model = Model(inputs, outputs)
    model.compile(optimizer="adam", loss="mse")
    return model


def train():
    df = pd.read_csv(os.path.join(os.path.dirname(__file__), "..", "data", "production_data.csv"))

    all_X, all_y = [], []
    per_machine_stats = {}
    for machine_id, g in df.groupby("Machine_ID"):
        series = g.sort_values("Day")["Production_Output"].values.astype(float)
        mean, std = series.mean(), series.std() + 1e-6
        per_machine_stats[machine_id] = (float(mean), float(std))
        norm = (series - mean) / std
        X, y = build_windows(norm)
        all_X.append(X)
        all_y.append(y)

    X = np.concatenate(all_X)[..., np.newaxis]
    y = np.concatenate(all_y)

    split = int(len(X) * 0.85)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = build_model()
    model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=40, batch_size=32, verbose=0,
        callbacks=[tf.keras.callbacks.EarlyStopping(patience=6, restore_best_weights=True)],
    )

    y_pred = model.predict(X_test, verbose=0)
    mae_norm = mean_absolute_error(y_test.flatten(), y_pred.flatten())

    model.save(os.path.join(MODEL_DIR, "forecast_gru.keras"))
    joblib.dump(
        {"per_machine_stats": per_machine_stats, "mae_normalized": round(float(mae_norm), 4),
         "window": WINDOW, "horizon": HORIZON},
        os.path.join(MODEL_DIR, "forecast_meta.pkl"),
    )
    print("Forecast model trained. Normalized MAE:", round(float(mae_norm), 4))
    return model


def load_forecast_model():
    model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "forecast_gru.keras"))
    meta = joblib.load(os.path.join(MODEL_DIR, "forecast_meta.pkl"))
    return model, meta


def forecast_next(model, meta, machine_id: str, recent_values: np.ndarray):
    """recent_values: last WINDOW actual production values for this machine."""
    stats = meta["per_machine_stats"].get(machine_id, (float(recent_values.mean()), float(recent_values.std() + 1e-6)))
    mean, std = stats
    norm = (recent_values[-WINDOW:] - mean) / std
    x = norm.reshape(1, WINDOW, 1)
    pred_norm = model.predict(x, verbose=0)[0]
    pred = pred_norm * std + mean
    trend = "DECLINING" if pred[-1] < recent_values[-1] * 0.97 else (
        "IMPROVING" if pred[-1] > recent_values[-1] * 1.03 else "STABLE"
    )
    return {"forecast": [round(float(v), 1) for v in pred], "trend": trend}


if __name__ == "__main__":
    train()
