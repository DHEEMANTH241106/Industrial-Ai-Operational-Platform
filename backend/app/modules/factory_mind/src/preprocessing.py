"""
preprocessing.py
-----------------
Shared preprocessing utilities used by the failure, production, and anomaly models.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler

FAILURE_FEATURES = [
    "Temperature", "Vibration", "Pressure", "Rotational_Speed", "Torque",
    "Tool_Wear", "Operating_Hours", "Machine_Age_Years", "Maintenance_Count",
    "Production_Load",
]

PRODUCTION_FEATURES = [
    "Temperature", "Vibration", "Pressure", "Rotational_Speed", "Torque",
    "Tool_Wear", "Operating_Hours", "Production_Load",
]

ANOMALY_FEATURES = ["Temperature", "Vibration", "Pressure", "Rotational_Speed", "Torque"]


def load_machine_data(path="../data/machine_data.csv"):
    df = pd.read_csv(path)
    df = df.dropna().reset_index(drop=True)
    return df


def load_production_data(path="../data/production_data.csv"):
    return pd.read_csv(path)


def load_anomaly_sequences(path="../data/anomaly_sequences.npz"):
    data = np.load(path, allow_pickle=True)
    return data["sequences"], data["labels"], list(data["feature_names"])


def fit_scaler(df: pd.DataFrame, feature_cols: list) -> StandardScaler:
    scaler = StandardScaler()
    scaler.fit(df[feature_cols].values)
    return scaler


def scale_features(df: pd.DataFrame, feature_cols: list, scaler: StandardScaler) -> np.ndarray:
    return scaler.transform(df[feature_cols].values)
