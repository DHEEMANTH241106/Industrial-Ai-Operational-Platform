import io
import base64
from pathlib import Path
from fastapi import APIRouter, File, UploadFile, Query, HTTPException
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from ultralytics import YOLO

router = APIRouter(prefix="/api/defect-vision", tags=["Defect Vision"])

MODEL_PATH = Path(__file__).parent / "models" / "best.pt"
_model = None

DEFECT_CLASSES = [
    "crazing",
    "inclusion",
    "patches",
    "pitted_surface",
    "rolled-in_scale",
    "scratches"
]

def get_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise HTTPException(status_code=500, detail="Defect model file not found")
        _model = YOLO(str(MODEL_PATH))
    return _model

@router.get("/info")
def get_info():
    return {
        "module": "DefectVision",
        "description": "Steel-surface manufacturing defect detection",
        "classes": DEFECT_CLASSES,
        "model_loaded": MODEL_PATH.exists()
    }

@router.post("/detect")
async def detect_defects(
    file: UploadFile = File(...),
    conf: float = Query(0.25, ge=0.05, le=1.0)
):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        model = get_model()
        results = model.predict(img, conf=conf, verbose=False)[0]

        detections = []
        counts = {}
        for box in results.boxes:
            cls_id = int(box.cls[0])
            name = results.names.get(cls_id, f"class_{cls_id}")
            confidence = float(box.conf[0])
            xyxy = box.xyxy[0].tolist()
            detections.append({
                "class_id": cls_id,
                "class_name": name,
                "confidence": round(confidence, 3),
                "bbox": [round(coord, 1) for coord in xyxy]
            })
            counts[name] = counts.get(name, 0) + 1

        # Generate annotated image
        annotated_img = results.plot()
        _, buffer = cv2.imencode(".jpg", annotated_img)
        img_b64 = base64.b64encode(buffer).decode("utf-8")

        return {
            "total_defects": len(detections),
            "detections": detections,
            "counts": counts,
            "annotated_image": f"data:image/jpeg;base64,{img_b64}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
