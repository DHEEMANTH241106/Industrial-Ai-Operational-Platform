"""
generate_data.py
-----------------
Generates a realistic synthetic manufacturing dataset for FactoryMind AI.

Two files are produced:
  data/machine_data.csv     -> per-record sensor snapshots (for failure/health/anomaly models)
  data/production_data.csv  -> per-day production time series per machine (for forecasting)

The data is synthetic but built on realistic industrial relationships:
  - Higher vibration, tool wear, temperature, torque, operating hours, machine age,
    and production load increase failure probability (not just random labels).
  - Anomalies are injected as short bursts of abnormal sensor sequences so the
    LSTM Autoencoder has real anomalous patterns to detect, not pure noise.
  - Production output degrades as machine health degrades, with daily noise.

No performance metrics are fabricated anywhere else in the project — everything
downstream is computed from this data by the actual trained models.
"""

import numpy as np
import pandas as pd
import os

RNG = np.random.default_rng(42)
N_MACHINES = 12
RECORDS_PER_MACHINE = 400          # snapshots per machine for the tabular models
SEQ_LEN = 30                        # sequence length used later by the LSTM autoencoder
PROD_DAYS = 120                     # days of production history per machine

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(OUT_DIR, exist_ok=True)


def make_machine_snapshot_data():
    rows = []
    for m in range(1, N_MACHINES + 1):
        machine_id = f"M-{100 + m}"
        # Each machine has its own baseline "condition" (some machines run older/hotter)
        base_age = RNG.uniform(0.5, 9.0)          # years
        base_wear_rate = RNG.uniform(0.8, 1.6)    # wear accumulation multiplier
        baseline_health = RNG.uniform(0.75, 1.0)  # 1.0 = brand-new-like baseline

        maintenance_count = 0
        cumulative_wear = RNG.uniform(0, 15)

        for i in range(RECORDS_PER_MACHINE):
            operating_hours = i * RNG.uniform(3.5, 5.5) + RNG.uniform(0, 5)
            cumulative_wear += RNG.uniform(0.05, 0.35) * base_wear_rate
            if cumulative_wear > 85 and RNG.random() < 0.15:
                maintenance_count += 1
                cumulative_wear *= RNG.uniform(0.2, 0.4)  # maintenance resets wear

            # Degradation factor grows slowly over the machine's operating life
            degradation = np.clip(
                (cumulative_wear / 100) * (1.0 - (baseline_health - 0.75) * 0.5), 0, 1.4
            )

            production_load = np.clip(RNG.normal(0.7, 0.15), 0.2, 1.15)

            temperature = 55 + 25 * degradation + production_load * 8 + RNG.normal(0, 3)
            vibration = 1.5 + 5.5 * degradation + production_load * 1.2 + RNG.normal(0, 0.4)
            pressure = 30 + 12 * degradation + RNG.normal(0, 2.5)
            rotational_speed = 1450 - 120 * degradation + RNG.normal(0, 25)
            torque = 35 + 18 * degradation + production_load * 6 + RNG.normal(0, 2)
            tool_wear = np.clip(cumulative_wear + RNG.normal(0, 2), 0, 100)

            vibration = max(vibration, 0.1)
            temperature = max(temperature, 20)
            pressure = max(pressure, 5)
            torque = max(torque, 5)

            # Failure risk is a real function of the sensor state, not random
            risk_score = (
                0.32 * np.clip(vibration / 9, 0, 1.3)
                + 0.28 * (tool_wear / 100)
                + 0.20 * np.clip(max(temperature - 58, 0) / 30, 0, 1.3)
                + 0.15 * np.clip(max(torque - 42, 0) / 20, 0, 1.3)
                + 0.05 * (operating_hours / (RECORDS_PER_MACHINE * 5))
            )
            risk_score = np.clip(risk_score + RNG.normal(0, 0.02), 0, 1.3)
            failure_prob = np.clip((risk_score - 0.32) * 2.4, 0.01, 0.97) if risk_score > 0.32 else 0.015
            failure = 1 if RNG.random() < failure_prob else 0

            target_production = 1000 * production_load
            efficiency_penalty = 1 - 0.55 * degradation
            production_output = max(
                target_production * efficiency_penalty + RNG.normal(0, 15), 50
            )

            rows.append(
                dict(
                    Machine_ID=machine_id,
                    Record_Index=i,
                    Temperature=round(temperature, 2),
                    Vibration=round(vibration, 3),
                    Pressure=round(pressure, 2),
                    Rotational_Speed=round(rotational_speed, 1),
                    Torque=round(torque, 2),
                    Tool_Wear=round(tool_wear, 2),
                    Operating_Hours=round(operating_hours, 1),
                    Machine_Age_Years=round(base_age + operating_hours / 8000, 2),
                    Maintenance_Count=maintenance_count,
                    Production_Load=round(production_load, 3),
                    Target_Production=round(target_production, 1),
                    Production_Output=round(production_output, 1),
                    Failure=failure,
                )
            )
    df = pd.DataFrame(rows)

    # Inject a small number of missing values / inconsistencies to mirror real data,
    # then clean them (as required: "clean missing values / remove inconsistencies").
    mask = RNG.random(len(df)) < 0.01
    df.loc[mask, "Pressure"] = np.nan
    df["Pressure"] = df["Pressure"].fillna(df.groupby("Machine_ID")["Pressure"].transform("median"))
    df = df[df["Temperature"] > 0].reset_index(drop=True)  # drop impossible physical values

    return df


def make_production_timeseries():
    rows = []
    for m in range(1, N_MACHINES + 1):
        machine_id = f"M-{100 + m}"
        health_trend = RNG.uniform(-0.4, 0.05)  # most machines drift down slowly
        level = RNG.uniform(880, 970)
        for day in range(1, PROD_DAYS + 1):
            seasonal = 15 * np.sin(day / 7 * np.pi)  # weekly pattern
            drift = health_trend * day * 0.5
            noise = RNG.normal(0, 18)
            production = max(level + seasonal + drift + noise, 100)
            rows.append(dict(Machine_ID=machine_id, Day=day, Production_Output=round(production, 1)))
    return pd.DataFrame(rows)


def make_anomaly_sequences():
    """
    Builds sequences of sensor readings (normal + injected anomalous bursts) used
    to train and evaluate the LSTM Autoencoder. Saved separately since it's a
    different shape (sequences) than the tabular snapshot data.
    """
    features = ["Temperature", "Vibration", "Pressure", "Rotational_Speed", "Torque"]
    sequences = []
    labels = []  # 1 = contains an injected anomaly burst
    for m in range(1, N_MACHINES + 1):
        for s in range(60):  # 60 sequences per machine
            base_temp = RNG.uniform(58, 68)
            base_vib = RNG.uniform(2.0, 3.5)
            base_pres = RNG.uniform(32, 40)
            base_speed = RNG.uniform(1380, 1450)
            base_torque = RNG.uniform(38, 46)

            t = np.arange(SEQ_LEN)
            seq = np.stack(
                [
                    base_temp + 1.5 * np.sin(t / 5) + RNG.normal(0, 0.8, SEQ_LEN),
                    base_vib + 0.3 * np.sin(t / 4) + RNG.normal(0, 0.15, SEQ_LEN),
                    base_pres + RNG.normal(0, 1.2, SEQ_LEN),
                    base_speed + RNG.normal(0, 10, SEQ_LEN),
                    base_torque + RNG.normal(0, 1.0, SEQ_LEN),
                ],
                axis=1,
            )

            is_anomaly = RNG.random() < 0.18
            if is_anomaly:
                start = RNG.integers(5, SEQ_LEN - 8)
                burst_len = RNG.integers(4, 8)
                seq[start:start + burst_len, 0] += RNG.uniform(12, 22)   # temp spike
                seq[start:start + burst_len, 1] += RNG.uniform(3.5, 6.5)  # vibration spike
                seq[start:start + burst_len, 4] += RNG.uniform(8, 15)     # torque spike

            sequences.append(seq)
            labels.append(int(is_anomaly))

    return np.array(sequences), np.array(labels), features


if __name__ == "__main__":
    machine_df = make_machine_snapshot_data()
    production_df = make_production_timeseries()
    seqs, labels, feat_names = make_anomaly_sequences()

    machine_df.to_csv(os.path.join(OUT_DIR, "machine_data.csv"), index=False)
    production_df.to_csv(os.path.join(OUT_DIR, "production_data.csv"), index=False)
    np.savez(
        os.path.join(OUT_DIR, "anomaly_sequences.npz"),
        sequences=seqs,
        labels=labels,
        feature_names=np.array(feat_names),
    )

    print("machine_data.csv:", machine_df.shape, "failure rate:", machine_df["Failure"].mean().round(3))
    print("production_data.csv:", production_df.shape)
    print("anomaly_sequences:", seqs.shape, "anomaly rate:", labels.mean().round(3))
