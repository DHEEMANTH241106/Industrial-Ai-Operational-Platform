from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional

# Organization & Multi-tenancy
class OrganizationResponse(BaseModel):
    id: int
    name: str
    slug: str
    industry_type: str
    created_at: datetime
    class Config:
        from_attributes = True

class SafetyProfileCreate(BaseModel):
    name: str
    description: str | None = None
    required_ppe: list[str] = ["helmet", "vest"]
    severity_weights: dict[str, int] = {}
    is_default: bool = False

class SafetyProfileResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    description: str | None = None
    required_ppe: list[str]
    severity_weights: dict
    is_default: bool
    created_at: datetime
    class Config:
        from_attributes = True

# Auth
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    organization_id: int | None = None
    organization: Optional[OrganizationResponse] = None
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

# Camera
class CameraCreate(BaseModel):
    name: str
    source_type: str = Field(..., pattern="^(webcam|rtsp|file)$")
    source_uri: str | None = None
    location: str | None = None
    configuration: dict = {}
    safety_profile_id: int | None = None

class CameraResponse(BaseModel):
    id: int
    organization_id: int | None = None
    safety_profile_id: int | None = None
    safety_profile: Optional[SafetyProfileResponse] = None
    name: str
    source_type: str
    source_uri: str | None
    status: str
    location: str | None
    configuration: dict
    created_at: datetime
    class Config:
        from_attributes = True

# Zone
class ZoneCreate(BaseModel):
    camera_id: int
    name: str
    polygon_json: list[list[float]]  # [[x1,y1],[x2,y2],...]
    is_restricted: bool = False
    severity: str = "high"
    ppe_required: list[str] = ["helmet", "vest"]

class ZoneResponse(BaseModel):
    id: int
    camera_id: int
    name: str
    polygon_json: list
    is_restricted: bool
    severity: str
    ppe_required: list
    created_at: datetime
    class Config:
        from_attributes = True

# Session
class SessionCreate(BaseModel):
    camera_id: int
    video_source: str | None = None  # path or 'webcam'

class SessionResponse(BaseModel):
    id: int
    camera_id: int
    started_at: datetime
    ended_at: datetime | None
    status: str
    video_source: str | None
    frame_count: int
    detection_count: int
    incident_count: int
    avg_fps: float
    avg_latency_ms: float
    class Config:
        from_attributes = True

# Incident
class IncidentResponse(BaseModel):
    id: int
    organization_id: int | None = None
    camera_id: int
    session_id: int
    violation_type: str
    risk_score: float
    severity: str
    status: str
    first_seen: datetime
    last_seen: datetime
    track_id: int | None
    description: str | None
    location: str | None
    evidence: list["EvidenceResponse"] = []
    events: list["EventResponse"] = []
    class Config:
        from_attributes = True

class IncidentUpdate(BaseModel):
    status: str = Field(..., pattern="^(acknowledged|resolved|false_positive)$")
    notes: str | None = None

class EvidenceResponse(BaseModel):
    id: int
    incident_id: int
    snapshot_path: str | None
    timestamp: datetime
    detection_data: dict | None
    class Config:
        from_attributes = True

class EventResponse(BaseModel):
    id: int
    incident_id: int
    actor_id: int | None
    action: str
    notes: str | None
    created_at: datetime
    class Config:
        from_attributes = True

# Analytics
class AnalyticsSummary(BaseModel):
    total_incidents: int
    open_incidents: int
    acknowledged_incidents: int
    resolved_incidents: int
    false_positives: int
    high_risk_incidents: int
    incidents_by_type: dict[str, int]
    incidents_by_severity: dict[str, int]
    incidents_by_camera: dict[str, int]
    recent_incidents: list[IncidentResponse]
    active_sessions: int
    total_cameras: int

class ModelStatusResponse(BaseModel):
    is_ready: bool
    repository_id: str
    revision: str | None
    labels: dict | None
    device: str
    loaded_at: datetime | None

class HealthResponse(BaseModel):
    status: str
    model_ready: bool
    database: str
    active_sessions: int
    version: str = "1.0.0"

# Video upload
class VideoUploadResponse(BaseModel):
    filename: str
    file_path: str
    size_mb: float
    session_id: int | None = None
