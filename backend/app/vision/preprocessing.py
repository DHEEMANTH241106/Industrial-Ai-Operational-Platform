import cv2
import numpy as np
import base64
import time

class FrameSampler:
    def __init__(self, target_fps: int = 5):
        self.target_fps = target_fps
        self.last_process_time = 0.0

    def should_process(self, current_fps: float = None, target_fps: int = None) -> bool:
        if target_fps is not None:
            self.target_fps = target_fps
            
        current_time = time.time()
        time_between_frames = 1.0 / max(1, self.target_fps)
        
        if current_time - self.last_process_time >= time_between_frames:
            self.last_process_time = current_time
            return True
        return False

def resize_frame(frame: np.ndarray, max_width: int = 1280) -> np.ndarray:
    if frame is None:
        return frame
    height, width = frame.shape[:2]
    if width > max_width:
        scale = max_width / width
        return cv2.resize(frame, (int(width * scale), int(height * scale)))
    return frame

def validate_frame(frame: np.ndarray) -> bool:
    return isinstance(frame, np.ndarray) and frame.size > 0

def frame_to_jpeg(frame: np.ndarray, quality: int = 85) -> bytes:
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    ret, buffer = cv2.imencode('.jpg', frame, encode_param)
    if not ret:
        raise ValueError("Could not encode frame to JPEG")
    return buffer.tobytes()

def frame_to_base64(frame: np.ndarray) -> str:
    jpeg_bytes = frame_to_jpeg(frame)
    return base64.b64encode(jpeg_bytes).decode('utf-8')
