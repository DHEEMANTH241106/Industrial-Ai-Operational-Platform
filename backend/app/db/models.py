from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, nullable=False) # e.g. "Pharma Solutions", "Steel & Hardware Corp"
    slug = Column(String(100), unique=True, nullable=False) # "pharma", "hardware"
    industry_type = Column(String(100), default="general") # pharma, hardware, construction
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="organization")
    cameras = relationship("Camera", back_populates="organization")
    safety_profiles = relationship("SafetyProfile", back_populates="organization", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="organization")

class SafetyProfile(Base):
    __tablename__ = "safety_profiles"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    name = Column(String(200), nullable=False) # e.g. "Cleanroom Standard", "Heavy Machinery Area"
    description = Column(Text, nullable=True)
    required_ppe = Column(JSON, default=list) # e.g. ["mask", "gloves"] or ["helmet", "vest"]
    severity_weights = Column(JSON, default=dict) # e.g. {"missing_mask": 40, "missing_helmet": 40}
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="safety_profiles")
    cameras = relationship("Camera", back_populates="safety_profile")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="viewer")  # admin, safety_officer, supervisor, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="users")

class Camera(Base):
    __tablename__ = "cameras"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    safety_profile_id = Column(Integer, ForeignKey("safety_profiles.id"), nullable=True)
    name = Column(String(200), nullable=False)
    source_type = Column(String(50), nullable=False)  # webcam, rtsp, file
    source_uri = Column(String(500))
    status = Column(String(50), default="offline")  # online, offline, error
    configuration = Column(JSON, default=dict)
    location = Column(String(200))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="cameras")
    safety_profile = relationship("SafetyProfile", back_populates="cameras")
    zones = relationship("Zone", back_populates="camera", cascade="all, delete-orphan")
    sessions = relationship("MonitoringSession", back_populates="camera")

class Zone(Base):
    __tablename__ = "zones"
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    name = Column(String(200), nullable=False)
    polygon_json = Column(JSON, nullable=False)  # [[x1,y1],[x2,y2],...] normalized 0-1
    is_restricted = Column(Boolean, default=False)
    severity = Column(String(50), default="high")
    ppe_required = Column(JSON, default=lambda: ["helmet", "vest"])  # list of required PPE
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    camera = relationship("Camera", back_populates="zones")

class MonitoringSession(Base):
    __tablename__ = "monitoring_sessions"
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="running")  # running, completed, error, stopped
    video_source = Column(String(500), nullable=True)
    frame_count = Column(Integer, default=0)
    detection_count = Column(Integer, default=0)
    incident_count = Column(Integer, default=0)
    avg_fps = Column(Float, default=0.0)
    avg_latency_ms = Column(Float, default=0.0)
    camera = relationship("Camera", back_populates="sessions")
    detections = relationship("Detection", back_populates="session", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="session")

class Detection(Base):
    __tablename__ = "detections"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("monitoring_sessions.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    frame_number = Column(Integer)
    track_id = Column(Integer, nullable=True)
    class_name = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    bbox_json = Column(JSON, nullable=False)  # [x1, y1, x2, y2]
    session = relationship("MonitoringSession", back_populates="detections")

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("monitoring_sessions.id"), nullable=False)
    violation_type = Column(String(100), nullable=False)  # missing_helmet, missing_vest, missing_mask, restricted_zone
    risk_score = Column(Float, default=0.0)
    severity = Column(String(50), default="medium")  # low, medium, high, critical
    status = Column(String(50), default="open")  # open, acknowledged, resolved, false_positive
    first_seen = Column(DateTime, nullable=False)
    last_seen = Column(DateTime, nullable=False)
    track_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    location = Column(String(200), nullable=True)

    organization = relationship("Organization", back_populates="incidents")
    camera = relationship("Camera")
    session = relationship("MonitoringSession", back_populates="incidents")
    evidence = relationship("IncidentEvidence", back_populates="incident", cascade="all, delete-orphan")
    events = relationship("IncidentEvent", back_populates="incident", cascade="all, delete-orphan")

class IncidentEvidence(Base):
    __tablename__ = "incident_evidence"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    snapshot_path = Column(String(500), nullable=True)
    clip_path = Column(String(500), nullable=True)
    timestamp = Column(DateTime, nullable=False)
    detection_data = Column(JSON, nullable=True)
    incident = relationship("Incident", back_populates="evidence")

class IncidentEvent(Base):
    __tablename__ = "incident_events"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # created, acknowledged, resolved, false_positive, note_added, reopened
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    incident = relationship("Incident", back_populates="events")

class ModelRegistry(Base):
    __tablename__ = "model_registry"
    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(String(300), nullable=False)
    revision = Column(String(100), nullable=True)
    labels_json = Column(JSON, nullable=True)
    model_config_json = Column(JSON, nullable=True)
    validation_status = Column(String(50), default="pending")  # pending, validated, failed
    loaded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(200), nullable=False)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
