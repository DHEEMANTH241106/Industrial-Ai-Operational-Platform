"""
anomaly_model.py
-----------------
LSTM Autoencoder for time-series anomaly detection on machine sensor sequences.

Architecture:
  Input sequence -> LSTM Encoder -> Latent vector -> RepeatVector
                  -> LSTM Decoder -> TimeDistributed(Dense) -> Reconstructed sequence

The model is trained ONLY on normal sequences to learn what "normal" looks like.
At inference, reconstruction error (MSE between input and reconstruction) is the
anomaly score. A threshold (95th percentile of normal training error) separates
normal from anomalous behavior.
"""

import os
import json
import numpy as np
import joblib
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, RepeatVector, TimeDistributed, Dense
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score

from preprocessing import load_anomaly_sequences

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

tf.random.set_seed(42)


def build_autoencoder(seq_len, n_features, latent_dim=16):
    inputs = Input(shape=(seq_len, n_features))
    encoded = LSTM(32, activation="tanh", return_sequences=True)(inputs)
    encoded = LSTM(latent_dim, activation="tanh", return_sequences=False)(encoded)

    decoded = RepeatVector(seq_len)(encoded)
    decoded = LSTM(latent_dim, activation="tanh", return_sequences=True)(decoded)
    decoded = LSTM(32, activation="tanh", return_sequences=True)(decoded)
    outputs = TimeDistributed(Dense(n_features))(decoded)

    model = Model(inputs, outputs)
    model.compile(optimizer="adam", loss="mse")
    return model


def train():
    seqs, labels, feature_names = load_anomaly_sequences(
        os.path.join(os.path.dirname(__file__), "..", "data", "anomaly_sequences.npz")
    )
    n_samples, seq_len, n_features = seqs.shape

    # Scale per-feature across all sequences (fit on normal sequences only)
    normal_seqs = seqs[labels == 0]
    scaler = StandardScaler()
    scaler.fit(normal_seqs.reshape(-1, n_features))

    def scale(x):
        shape = x.shape
        return scaler.transform(x.reshape(-1, n_features)).reshape(shape)

    X_normal = scale(normal_seqs)
    # hold out a validation split of normal sequences
    split = int(len(X_normal) * 0.85)
    X_train, X_val = X_normal[:split], X_normal[split:]

    model = build_autoencoder(seq_len, n_features)
    model.fit(
        X_train, X_train,
        validation_data=(X_val, X_val),
        epochs=30,
        batch_size=32,
        verbose=0,
        callbacks=[tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True)],
    )

    # Determine threshold from validation (normal) reconstruction error
    val_recon = model.predict(X_val, verbose=0)
    val_errors = np.mean(np.square(X_val - val_recon), axis=(1, 2))
    threshold = float(np.percentile(val_errors, 95))

    # Evaluate on the FULL labeled dataset (normal + anomalous)
    X_all = scale(seqs)
    all_recon = model.predict(X_all, verbose=0)
    all_errors = np.mean(np.square(X_all - all_recon), axis=(1, 2))
    preds = (all_errors > threshold).astype(int)

    metrics = {
        "threshold": round(threshold, 5),
        "roc_auc": round(roc_auc_score(labels, all_errors), 4),
        "precision": round(precision_score(labels, preds, zero_division=0), 4),
        "recall": round(recall_score(labels, preds, zero_division=0), 4),
        "f1": round(f1_score(labels, preds, zero_division=0), 4),
        "n_train_normal_sequences": int(len(X_train)),
    }

    model.save(os.path.join(MODEL_DIR, "lstm_autoencoder.keras"))
    joblib.dump(scaler, os.path.join(MODEL_DIR, "anomaly_scaler.pkl"))
    joblib.dump(
        {
            "metrics": metrics,
            "all_errors": all_errors.tolist(),
            "labels": labels.tolist(),
            "feature_names": feature_names,
            "seq_len": seq_len,
        },
        os.path.join(MODEL_DIR, "anomaly_eval.pkl"),
    )

    print("Anomaly model trained:", metrics)
    return model, scaler, threshold, metrics


def load_anomaly_model():
    model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "lstm_autoencoder.keras"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "anomaly_scaler.pkl"))
    eval_data = joblib.load(os.path.join(MODEL_DIR, "anomaly_eval.pkl"))
    return model, scaler, eval_data["metrics"]["threshold"], eval_data


def score_sequence(model, scaler, threshold, sequence: np.ndarray, feature_names):
    """
    sequence: array of shape (seq_len, n_features) in the ORIGINAL feature order
    (Temperature, Vibration, Pressure, Rotational_Speed, Torque).
    Returns anomaly score (0-100%), status, and per-feature contribution to error.
    """
    seq_len, n_features = sequence.shape
    scaled = scaler.transform(sequence).reshape(1, seq_len, n_features)
    recon = model.predict(scaled, verbose=0)[0]
    per_feature_error = np.mean(np.square(scaled[0] - recon), axis=0)
    overall_error = float(np.mean(per_feature_error))

    anomaly_score_pct = float(np.clip((overall_error / (threshold * 2.5)) * 100, 0, 100))
    status = "CRITICAL" if overall_error > threshold * 1.5 else (
        "ANOMALY DETECTED" if overall_error > threshold else "NORMAL"
    )

    contributions = {
        feature_names[i]: round(float(per_feature_error[i] / (per_feature_error.sum() + 1e-9) * 100), 1)
        for i in range(n_features)
    }
    return {
        "anomaly_score_pct": round(anomaly_score_pct, 1),
        "reconstruction_error": round(overall_error, 5),
        "threshold": round(threshold, 5),
        "status": status,
        "feature_contributions": contributions,
    }


if __name__ == "__main__":
    train()
