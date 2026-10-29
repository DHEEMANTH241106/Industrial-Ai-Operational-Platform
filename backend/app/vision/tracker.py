from app.vision.detector import DetectionResult

class SimpleTracker:
    def __init__(self, max_age: int = 30, iou_threshold: float = 0.3):
        self.max_age = max_age
        self.iou_threshold = iou_threshold
        self.tracks = {}  # track_id -> {'bbox': tuple, 'age': int}
        self.next_id = 1

    def _iou(self, bbox1: tuple[int, int, int, int], bbox2: tuple[int, int, int, int]) -> float:
        x1 = max(bbox1[0], bbox2[0])
        y1 = max(bbox1[1], bbox2[1])
        x2 = min(bbox1[2], bbox2[2])
        y2 = min(bbox1[3], bbox2[3])
        
        inter_area = max(0, x2 - x1) * max(0, y2 - y1)
        if inter_area == 0:
            return 0.0
            
        area1 = (bbox1[2] - bbox1[0]) * (bbox1[3] - bbox1[1])
        area2 = (bbox2[2] - bbox2[0]) * (bbox2[3] - bbox2[1])
        return inter_area / float(area1 + area2 - inter_area)

    def update(self, detections: list[DetectionResult]) -> list[DetectionResult]:
        assigned_detections = []
        
        # Increase age of all existing tracks
        for tid in list(self.tracks.keys()):
            self.tracks[tid]['age'] += 1
            if self.tracks[tid]['age'] > self.max_age:
                del self.tracks[tid]
                
        # Simple greedy matching
        for d in detections:
            if d.class_name != 'person':
                assigned_detections.append(d)
                continue
                
            best_iou = self.iou_threshold
            best_track_id = None
            
            for tid, track_info in self.tracks.items():
                iou = self._iou(d.bbox, track_info['bbox'])
                if iou > best_iou:
                    best_iou = iou
                    best_track_id = tid
                    
            if best_track_id is not None:
                d.track_id = best_track_id
                self.tracks[best_track_id] = {'bbox': d.bbox, 'age': 0}
            else:
                d.track_id = self.next_id
                self.tracks[self.next_id] = {'bbox': d.bbox, 'age': 0}
                self.next_id += 1
                
            assigned_detections.append(d)
            
        return assigned_detections
