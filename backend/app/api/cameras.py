from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Camera, User
from app.core.security import get_current_user
from app.api.schemas import CameraCreate, CameraResponse
import cv2

router = APIRouter(prefix="/cameras", tags=["cameras"])

@router.get("/", response_model=list[CameraResponse])
def list_cameras(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Camera)
    if current_user.organization_id and current_user.role != "superadmin":
        query = query.filter(Camera.organization_id == current_user.organization_id)
    return query.all()

@router.post("/", response_model=CameraResponse)
def create_camera(camera_in: CameraCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = camera_in.model_dump()
    if not data.get("organization_id") and current_user.organization_id:
        data["organization_id"] = current_user.organization_id
    db_camera = Camera(**data)
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera

@router.get("/{id}", response_model=CameraResponse)
def get_camera(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Camera).filter(Camera.id == id)
    if current_user.organization_id and current_user.role != "superadmin":
        query = query.filter(Camera.organization_id == current_user.organization_id)
    camera = query.first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera

@router.put("/{id}", response_model=CameraResponse)
def update_camera(id: int, camera_in: CameraCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Camera).filter(Camera.id == id)
    if current_user.organization_id and current_user.role != "superadmin":
        query = query.filter(Camera.organization_id == current_user.organization_id)
    camera = query.first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    for key, value in camera_in.model_dump().items():
        setattr(camera, key, value)
    
    db.commit()
    db.refresh(camera)
    return camera

@router.delete("/{id}")
def delete_camera(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Camera).filter(Camera.id == id)
    if current_user.organization_id and current_user.role != "superadmin":
        query = query.filter(Camera.organization_id == current_user.organization_id)
    camera = query.first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    db.delete(camera)
    db.commit()
    return {"ok": True}

@router.post("/{id}/test")
def test_camera(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    camera = db.query(Camera).filter(Camera.id == id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    source = camera.source_uri if camera.source_type != "webcam" else 0
    if isinstance(source, str) and source.isdigit():
        source = int(source)
        
    cap = cv2.VideoCapture(source)
    is_opened = cap.isOpened()
    if is_opened:
        cap.release()
        return {"status": "success", "message": "Camera connection successful"}
    else:
        raise HTTPException(status_code=400, detail="Could not connect to camera")
