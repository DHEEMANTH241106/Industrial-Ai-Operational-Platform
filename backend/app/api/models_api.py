from fastapi import APIRouter, Depends, HTTPException
from app.db.models import User
from app.core.security import get_current_user
from app.api.schemas import ModelStatusResponse
from datetime import datetime
from app.vision.detector import get_detector

from app.core.config import settings

router = APIRouter(prefix="/models", tags=["models"])

@router.get("/status", response_model=ModelStatusResponse)
def get_status(current_user: User = Depends(get_current_user)):
    detector = get_detector()
    is_ready = detector.is_ready() if callable(getattr(detector, 'is_ready', None)) else bool(getattr(detector, 'is_ready', False))
    labels = detector.get_labels() if callable(getattr(detector, 'get_labels', None)) else {}
    if not labels:
        labels = {"0": "Hardhat", "1": "Safety Vest", "2": "Person", "3": "NO-Hardhat", "4": "NO-Safety Vest"}
    
    return ModelStatusResponse(
        is_ready=is_ready,
        repository_id=getattr(settings, 'model_repo_id', 'Hansung-Cho/yolov8-ppe-detection'),
        revision=getattr(settings, 'model_revision', None),
        labels=labels,
        device=getattr(settings, 'device', 'auto'),
        loaded_at=datetime.utcnow()
    )

@router.get("/labels")
def get_labels(current_user: User = Depends(get_current_user)):
    detector = get_detector()
    labels = detector.get_labels() if callable(getattr(detector, 'get_labels', None)) else {}
    return labels

@router.post("/reload")
def reload_model(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Placeholder for model reload logic
    return {"status": "success", "message": "Model reload triggered"}
