from datetime import datetime, timezone

class AlertService:
    _cooldowns: dict[str, datetime] = {}  # dedup key -> last alert time
    
    @classmethod
    def should_alert(cls, dedup_key: str, cooldown_seconds: int = 30) -> bool:
        now = datetime.now(timezone.utc)
        
        if dedup_key not in cls._cooldowns:
            return True
            
        last_alert = cls._cooldowns[dedup_key]
        if (now - last_alert).total_seconds() >= cooldown_seconds:
            return True
            
        return False
    
    @classmethod
    def record_alert(cls, dedup_key: str):
        cls._cooldowns[dedup_key] = datetime.now(timezone.utc)
    
    @classmethod
    def create_dedup_key(cls, session_id: int, track_id: int | None, violation_type: str) -> str:
        tid = "unknown" if track_id is None else str(track_id)
        return f"sess_{session_id}_track_{tid}_{violation_type}"
