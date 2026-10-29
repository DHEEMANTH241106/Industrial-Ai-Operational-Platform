from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    app_name: str = "Industrial AI & Operations Platform"
    app_env: str = "development"
    database_url: str = "sqlite:///./safety_monitor.db"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    
    # Model settings
    model_repo_id: str = "Hansung-Cho/yolov8-ppe-detection"
    model_revision: str | None = None
    device: str = "auto"  # auto, cpu, cuda
    
    # Detection thresholds
    person_confidence: float = 0.35
    ppe_confidence: float = 0.40
    
    # Processing
    frame_sample_fps: int = 5
    violation_confirm_frames: int = 5
    incident_cooldown_seconds: int = 30
    
    # Storage
    evidence_dir: str = "./storage/evidence"
    upload_dir: str = "./storage/uploads"
    max_upload_mb: int = 500
    max_risk_score: int = 100
    
    # Risk score bands
    risk_low_max: int = 29
    risk_medium_max: int = 59
    risk_high_max: int = 79
    # 80-100 = critical
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", protected_namespaces=())

settings = Settings()
