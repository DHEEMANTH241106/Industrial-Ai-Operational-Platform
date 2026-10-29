"""
recommendations.py
-------------------
Three related, rule-based decision layers that sit on top of the ML/DL model
outputs (these are deliberately rule-based, not model-derived, and are labeled
as such in the UI to keep the distinction clear per the product spec):

  1. compute_health_score  -> overall 0-100 machine health score
  2. root_cause_analysis   -> plain-language detected issues + likely root cause
  3. generate_recommendations -> concrete maintenance actions with severity
"""

SENSOR_THRESHOLDS = {
    "Vibration": {"warning": 5.0, "critical": 7.0},
    "Temperature": {"warning": 78, "critical": 92},
    "Tool_Wear": {"warning": 60, "critical": 82},
    "Torque": {"warning": 52, "critical": 62},
    "Pressure": {"warning": 42, "critical": 50},
}


def compute_health_score(failure_probability: float, anomaly_score_pct: float,
                          efficiency_pct: float, tool_wear: float) -> dict:
    """
    Weighted blend of the model outputs into a single 0-100 health score.
    Higher failure probability / anomaly score / tool wear -> lower health.
    Higher efficiency -> higher health.
    """
    failure_component = (1 - failure_probability) * 100
    anomaly_component = 100 - anomaly_score_pct
    efficiency_component = min(efficiency_pct, 100)
    wear_component = 100 - tool_wear

    health = (
        0.35 * failure_component
        + 0.25 * anomaly_component
        + 0.20 * efficiency_component
        + 0.20 * wear_component
    )
    health = round(max(0, min(100, health)), 1)

    if health >= 75:
        status = "Healthy"
    elif health >= 45:
        status = "Warning"
    else:
        status = "Critical"

    return {"health_score": health, "status": status}


def root_cause_analysis(sensor_values: dict, top_risk_factors: list) -> dict:
    """
    sensor_values: dict with raw sensor readings (Temperature, Vibration, etc.)
    top_risk_factors: output of explainability.explain_prediction (model-derived)
    """
    detected_issues = []

    for sensor, thresholds in SENSOR_THRESHOLDS.items():
        value = sensor_values.get(sensor)
        if value is None:
            continue
        if value >= thresholds["critical"]:
            detected_issues.append(f"Critical {sensor.replace('_', ' ').lower()} ({value})")
        elif value >= thresholds["warning"]:
            detected_issues.append(f"Elevated {sensor.replace('_', ' ').lower()} ({value})")

    # Determine a plain-language probable root cause from the strongest signals
    if sensor_values.get("Tool_Wear", 0) >= SENSOR_THRESHOLDS["Tool_Wear"]["warning"] and \
       sensor_values.get("Vibration", 0) >= SENSOR_THRESHOLDS["Vibration"]["warning"]:
        probable_cause = "Mechanical component wear"
    elif sensor_values.get("Temperature", 0) >= SENSOR_THRESHOLDS["Temperature"]["warning"]:
        probable_cause = "Thermal stress / cooling system inefficiency"
    elif sensor_values.get("Torque", 0) >= SENSOR_THRESHOLDS["Torque"]["warning"]:
        probable_cause = "Excessive mechanical load"
    elif detected_issues:
        probable_cause = "Sensor readings trending outside normal operating range"
    else:
        probable_cause = "No significant issues detected"

    return {
        "detected_issues": detected_issues if detected_issues else ["No threshold violations detected"],
        "probable_root_cause": probable_cause,
        "model_derived_top_factors": [f["feature"] for f in top_risk_factors],
    }


def generate_recommendations(sensor_values: dict, failure_probability: float, anomaly_status: str) -> list:
    """Returns a list of {severity, detected_issue, recommended_action, reason} dicts."""
    recs = []

    vib = sensor_values.get("Vibration", 0)
    if vib >= SENSOR_THRESHOLDS["Vibration"]["critical"]:
        recs.append({
            "severity": "HIGH", "detected_issue": f"Vibration critically high ({vib})",
            "recommended_action": "Inspect rotating components and bearings immediately.",
            "reason": "Sustained high vibration is a leading indicator of bearing or shaft wear.",
        })
    elif vib >= SENSOR_THRESHOLDS["Vibration"]["warning"]:
        recs.append({
            "severity": "MEDIUM", "detected_issue": f"Vibration elevated ({vib})",
            "recommended_action": "Inspect rotating components and bearings.",
            "reason": "Vibration trending above normal operating range.",
        })

    temp = sensor_values.get("Temperature", 0)
    if temp >= SENSOR_THRESHOLDS["Temperature"]["critical"]:
        recs.append({
            "severity": "HIGH", "detected_issue": f"Temperature critically high ({temp})",
            "recommended_action": "Inspect cooling system and reduce operating load immediately.",
            "reason": "Excess heat accelerates wear and increases failure likelihood.",
        })
    elif temp >= SENSOR_THRESHOLDS["Temperature"]["warning"]:
        recs.append({
            "severity": "MEDIUM", "detected_issue": f"Temperature elevated ({temp})",
            "recommended_action": "Inspect cooling system and reduce operating load.",
            "reason": "Temperature trending above normal operating range.",
        })

    wear = sensor_values.get("Tool_Wear", 0)
    if wear >= SENSOR_THRESHOLDS["Tool_Wear"]["critical"]:
        recs.append({
            "severity": "HIGH", "detected_issue": f"Tool wear critically high ({wear}%)",
            "recommended_action": "Schedule immediate tool replacement.",
            "reason": "Tool at end of usable life; continued use risks quality and failure.",
        })
    elif wear >= SENSOR_THRESHOLDS["Tool_Wear"]["warning"]:
        recs.append({
            "severity": "MEDIUM", "detected_issue": f"Tool wear elevated ({wear}%)",
            "recommended_action": "Schedule tool replacement or maintenance.",
            "reason": "Tool wear approaching end-of-life threshold.",
        })

    if failure_probability >= 0.66:
        recs.append({
            "severity": "HIGH", "detected_issue": f"High failure probability ({failure_probability:.0%})",
            "recommended_action": "Schedule preventive maintenance before the next production cycle.",
            "reason": "Model predicts high likelihood of failure based on current sensor state.",
        })

    if anomaly_status in ("ANOMALY DETECTED", "CRITICAL"):
        recs.append({
            "severity": "HIGH" if anomaly_status == "CRITICAL" else "MEDIUM",
            "detected_issue": f"Abnormal sensor pattern detected ({anomaly_status})",
            "recommended_action": "Flag for manual inspection; behavior deviates from learned normal operation.",
            "reason": "LSTM Autoencoder reconstruction error exceeds the normal-behavior threshold.",
        })

    if not recs:
        recs.append({
            "severity": "LOW", "detected_issue": "No significant issues detected",
            "recommended_action": "Continue routine monitoring.",
            "reason": "All sensor readings and model outputs are within normal operating ranges.",
        })

    severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    recs.sort(key=lambda r: severity_order[r["severity"]])
    return recs
