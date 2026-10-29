VIOLATION_SEVERITY = {
    'missing_helmet': 40,
    'missing_vest': 30,
    'missing_mask': 25,
    'missing_gloves': 35,
    'restricted_zone': 50,
}

def calculate_risk_score(violation_type: str, confidence: float, persistence_factor: float = 1.0, max_score: int = 100) -> tuple[float, str]:
    base_severity = VIOLATION_SEVERITY.get(violation_type, 20)
    normalized_s = base_severity / 50.0  # max base is 50
    p = max(0.5, min(2.0, persistence_factor))
    
    score = max_score * normalized_s * confidence * p
    score = min(max_score, score)
    
    return float(score), get_severity_band(score)

def combine_risk_scores(scores: list[float], max_score: int = 100) -> float:
    if not scores:
        return 0.0
    combined = sum(scores)
    return min(max_score, combined)

def get_severity_band(score: float) -> str:
    if score <= 29:
        return 'low'
    elif score <= 59:
        return 'medium'
    elif score <= 79:
        return 'high'
    return 'critical'
