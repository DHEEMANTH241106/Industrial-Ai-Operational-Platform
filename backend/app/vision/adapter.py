from app.vision.detector import Detector, DetectionResult
import numpy as np
import cv2

class ModelAdapter:
    def __init__(self, detector: Detector):
        self.detector = detector

    def predict(self, frame: np.ndarray, required_ppe: list[str] | None = None) -> list[DetectionResult]:
        detections = self.detector.predict(frame)
        
        # If gloves are required (e.g. Pharma cleanrooms), analyze hand regions for sterile gloves vs bare skin
        if required_ppe and "gloves" in required_ppe:
            persons = [d for d in detections if d.class_name == 'person']
            glove_results = self.detect_gloves_for_persons(frame, persons)
            detections.extend(glove_results)
            
        return detections

    def detect_gloves_for_persons(self, frame: np.ndarray, persons: list[DetectionResult]) -> list[DetectionResult]:
        """
        Computer-vision detector for cleanroom sterile gloves vs bare skin on hands.
        Detects medical/cleanroom nitrile/latex gloves (cyan, blue, purple) and bare skin.
        """
        results = []
        if frame is None or len(persons) == 0:
            return results

        h_img, w_img = frame.shape[:2]

        for p in persons:
            x1, y1, x2, y2 = p.bbox
            pw = max(1, x2 - x1)
            ph = max(1, y2 - y1)

            # Potential hand locations around lower torso & sides
            hand_boxes = [
                # Left hand region
                (
                    max(0, x1 - int(pw * 0.05)),
                    min(h_img, y1 + int(ph * 0.45)),
                    min(w_img, x1 + int(pw * 0.38)),
                    min(h_img, y1 + int(ph * 0.88))
                ),
                # Right hand region
                (
                    max(0, x2 - int(pw * 0.38)),
                    min(h_img, y1 + int(ph * 0.45)),
                    min(w_img, x2 + int(pw * 0.05)),
                    min(h_img, y1 + int(ph * 0.88))
                ),
                # Mid work zone (hands held together / typing / working)
                (
                    max(0, x1 + int(pw * 0.22)),
                    min(h_img, y1 + int(ph * 0.48)),
                    min(w_img, x2 - int(pw * 0.22)),
                    min(h_img, y1 + int(ph * 0.82))
                )
            ]

            detected_for_person = False
            for hx1, hy1, hx2, hy2 in hand_boxes:
                if detected_for_person:
                    break
                if hx2 <= hx1 + 10 or hy2 <= hy1 + 10:
                    continue

                patch = frame[hy1:hy2, hx1:hx2]
                if patch.size == 0:
                    continue

                hsv = cv2.cvtColor(patch, cv2.COLOR_BGR2HSV)
                ycrcb = cv2.cvtColor(patch, cv2.COLOR_BGR2YCrCb)
                total_pixels = max(1, patch.shape[0] * patch.shape[1])

                # 1. Nitrile Cleanroom Gloves (Blue / Cyan / Purple)
                blue_mask = cv2.inRange(hsv, np.array([80, 40, 40]), np.array([135, 255, 255]))
                purple_mask = cv2.inRange(hsv, np.array([135, 35, 35]), np.array([168, 255, 255]))
                glove_mask = cv2.bitwise_or(blue_mask, purple_mask)
                glove_ratio = cv2.countNonZero(glove_mask) / float(total_pixels)

                # 2. Bare Skin (Hand with NO gloves)
                # YCrCb range
                skin_ycrcb = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))
                # HSV range
                skin_hsv1 = cv2.inRange(hsv, np.array([0, 25, 40]), np.array([25, 230, 255]))
                skin_hsv2 = cv2.inRange(hsv, np.array([170, 25, 40]), np.array([180, 230, 255]))
                skin_hsv = cv2.bitwise_or(skin_hsv1, skin_hsv2)
                skin_mask = cv2.bitwise_and(skin_ycrcb, skin_hsv)
                skin_ratio = cv2.countNonZero(skin_mask) / float(total_pixels)

                if glove_ratio > 0.07:
                    conf = min(0.95, round(0.55 + glove_ratio, 2))
                    results.append(DetectionResult(
                        class_name='gloves',
                        confidence=conf,
                        bbox=(hx1, hy1, hx2, hy2),
                        track_id=p.track_id
                    ))
                    detected_for_person = True
                elif skin_ratio > 0.07:
                    conf = min(0.92, round(0.50 + skin_ratio, 2))
                    results.append(DetectionResult(
                        class_name='no_gloves',
                        confidence=conf,
                        bbox=(hx1, hy1, hx2, hy2),
                        track_id=p.track_id
                    ))
                    detected_for_person = True

        return results

    def get_persons(self, detections: list[DetectionResult]) -> list[DetectionResult]:
        return [d for d in detections if d.class_name == 'person']

    def get_ppe_items(self, detections: list[DetectionResult]) -> list[DetectionResult]:
        ppe_classes = ['helmet', 'vest', 'mask', 'gloves']
        return [d for d in detections if d.class_name in ppe_classes]

    def get_violations(self, detections: list[DetectionResult]) -> list[DetectionResult]:
        violation_classes = ['no_helmet', 'no_vest', 'no_mask', 'no_gloves']
        return [d for d in detections if d.class_name in violation_classes]

    def annotate_frame(self, frame: np.ndarray, detections: list[DetectionResult]) -> np.ndarray:
        annotated = frame.copy()
        
        for d in detections:
            color = (0, 255, 255) # yellow default
            if d.class_name in ['helmet', 'vest', 'mask', 'gloves']:
                color = (0, 255, 0) # green for compliant PPE
            elif d.class_name in ['no_helmet', 'no_vest', 'no_mask', 'no_gloves']:
                color = (0, 0, 255) # red for violations
            elif d.class_name == 'person':
                color = (255, 128, 0) # cyan/blue for person
                
            x1, y1, x2, y2 = d.bbox
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            
            # Label
            label_name = d.class_name.replace('_', ' ')
            label = f"{label_name} {d.confidence:.2f}"
            if d.track_id is not None:
                label = f"#{d.track_id} {label}"
                
            cv2.putText(annotated, label, (x1, max(15, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
        return annotated
