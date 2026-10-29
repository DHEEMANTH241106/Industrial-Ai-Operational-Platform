from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from app.core.security import get_current_user
from app.api.schemas import VideoUploadResponse
from app.core.config import settings
import os
import uuid
import shutil

router = APIRouter(prefix="/videos", tags=["videos"])

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file extension. Allowed: {ALLOWED_EXTENSIONS}")
        
    upload_directory = getattr(settings, 'upload_dir', './storage/uploads')
    os.makedirs(upload_directory, exist_ok=True)
    
    new_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(upload_directory, new_filename)
    
    size_bytes = 0
    max_mb = getattr(settings, 'max_upload_mb', 500)
    
    with open(file_path, "wb") as buffer:
        while content := await file.read(1024 * 1024):
            size_bytes += len(content)
            if size_bytes > max_mb * 1024 * 1024:
                buffer.close()
                if os.path.exists(file_path):
                    os.remove(file_path)
                raise HTTPException(status_code=400, detail="File too large.")
            buffer.write(content)
            
    return VideoUploadResponse(
        filename=new_filename,
        file_path=file_path,
        size_mb=size_bytes / (1024 * 1024),
        session_id=None
    )

@router.get("/uploads")
def list_uploads(current_user: User = Depends(get_current_user)):
    upload_directory = getattr(settings, 'upload_dir', './storage/uploads')
    if not os.path.exists(upload_directory):
        return []
    
    files = []
    for f in os.listdir(upload_directory):
        path = os.path.join(upload_directory, f)
        if os.path.isfile(path):
            files.append({
                "filename": f,
                "size_mb": os.path.getsize(path) / (1024 * 1024)
            })
    return files
