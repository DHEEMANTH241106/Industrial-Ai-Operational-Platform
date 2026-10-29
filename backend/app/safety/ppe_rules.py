from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, List, Dict
from app.vision.detector import DetectionResult
from app.core.config import Settings

class PPEStatus(Enum):
    COMPLIANT = "compliant"
    VIOLATION = "violation"
    UNCERTAIN = "uncertain"

@dataclass
class PPEAssessment:
    person_track_id: Optional[int]
    person_bbox: tuple[int, int, int, int]
    helmet_status: PPEStatus
    vest_status: PPEStatus
    confidence: float
    details: dict
    # Extended dynamic violations for multi-industry rules (Pharma, Construction, Hardware)
    violations: List[str] = field(default_factory=list)
    item_statuses: Dict[str, PPEStatus] = field(default_factory=dict)

class PPERuleEngine:
    def __init__(self, settings: Settings):
        self.confirm_frames = settings.violation_confirm_frames
        # track_id -> {violation_type: count}
        self.violation_history: Dict[int, Dict[str, int]] = {}
    
    def evaluate(
        self, 
        persons: list[DetectionResult], 
        ppe_items: list[DetectionResult], 
        violations: list[DetectionResult],
        required_ppe: Optional[list[str]] = None
    ) -> list[PPEAssessment]:
        """
        Evaluate PPE compliance dynamically.
        required_ppe: list of required items, e.g. ["mask", "gloves"] for pharma,
                      or ["helmet", "vest"] for hardware/construction.
        If None, defaults to standard ["helmet", "vest"].
        """
        if required_ppe is None or len(required_ppe) == 0:
            required_ppe = ["helmet", "vest"]

        assessments = []
        for person in persons:
            if person.track_id is None:
                continue
                
            track_id = person.track_id
            if track_id not in self.violation_history:
                self.violation_history[track_id] = {}

            head_region = self._get_head_region(person.bbox)
            torso_region = self._get_torso_region(person.bbox)
            hands_region = self._get_hands_region(person.bbox)

            active_violations = []
            item_statuses = {}

            # 1. Helmet evaluation (Hardware / Construction)
            if "helmet" in required_ppe:
                no_helmet = any(v.class_name == 'no_helmet' and self._check_overlap(v.bbox, head_region) for v in violations)
                has_helmet = any(p.class_name == 'helmet' and self._check_overlap(p.bbox, head_region) for p in ppe_items)
                status = self._update_item_persistence(track_id, "missing_helmet", is_present=has_helmet, has_direct_violation=no_helmet)
                item_statuses["helmet"] = status
                if status == PPEStatus.VIOLATION:
                    active_violations.append("missing_helmet")

            # 2. Safety Vest evaluation (Hardware / Logistics)
            if "vest" in required_ppe:
                no_vest = any(v.class_name == 'no_vest' and self._check_overlap(v.bbox, torso_region) for v in violations)
                has_vest = any(p.class_name == 'vest' and self._check_overlap(p.bbox, torso_region) for p in ppe_items)
                status = self._update_item_persistence(track_id, "missing_vest", is_present=has_vest, has_direct_violation=no_vest)
                item_statuses["vest"] = status
                if status == PPEStatus.VIOLATION:
                    active_violations.append("missing_vest")

            # 3. Mask evaluation (Pharma / Cleanroom / Chemical)
            if "mask" in required_ppe:
                no_mask = any(v.class_name == 'no_mask' and self._check_overlap(v.bbox, head_region) for v in violations)
                has_mask = any(p.class_name == 'mask' and self._check_overlap(p.bbox, head_region) for p in ppe_items)
                status = self._update_item_persistence(track_id, "missing_mask", is_present=has_mask, has_direct_violation=no_mask)
                item_statuses["mask"] = status
                if status == PPEStatus.VIOLATION:
                    active_violations.append("missing_mask")

            # 4. Gloves evaluation (Pharma / Cleanroom / Laboratory)
            if "gloves" in required_ppe:
                no_gloves = any(v.class_name == 'no_gloves' and (v.track_id == track_id or self._check_overlap(v.bbox, hands_region, threshold=0.15)) for v in violations)
                has_gloves = any(p.class_name == 'gloves' and (p.track_id == track_id or self._check_overlap(p.bbox, hands_region, threshold=0.15)) for p in ppe_items)
                status = self._update_item_persistence(track_id, "missing_gloves", is_present=has_gloves, has_direct_violation=no_gloves)
                item_statuses["gloves"] = status
                if status == PPEStatus.VIOLATION:
                    active_violations.append("missing_gloves")

            # Backward compatibility for legacy tests & fields
            helmet_status = item_statuses.get("helmet", PPEStatus.COMPLIANT if "helmet" not in required_ppe else PPEStatus.UNCERTAIN)
            vest_status = item_statuses.get("vest", PPEStatus.COMPLIANT if "vest" not in required_ppe else PPEStatus.UNCERTAIN)

            assessments.append(PPEAssessment(
                person_track_id=track_id,
                person_bbox=person.bbox,
                helmet_status=helmet_status,
                vest_status=vest_status,
                confidence=person.confidence,
                details={"required_ppe": required_ppe},
                violations=active_violations,
                item_statuses=item_statuses
            ))
            
        return assessments

    def _update_item_persistence(self, track_id: int, violation_key: str, is_present: bool, has_direct_violation: bool) -> PPEStatus:
        current_count = self.violation_history[track_id].get(violation_key, 0)
        
        if is_present and not has_direct_violation:
            self.violation_history[track_id][violation_key] = 0
            return PPEStatus.COMPLIANT
        elif has_direct_violation and not is_present:
            current_count += 1
            self.violation_history[track_id][violation_key] = current_count
            if current_count >= self.confirm_frames:
                return PPEStatus.VIOLATION
            return PPEStatus.UNCERTAIN
        else:
            self.violation_history[track_id][violation_key] = max(0, current_count - 1)
            return PPEStatus.UNCERTAIN

    def _check_overlap(self, bbox1: tuple[int, int, int, int], bbox2: tuple[int, int, int, int], threshold: float = 0.3) -> bool:
        x1 = max(bbox1[0], bbox2[0])
        y1 = max(bbox1[1], bbox2[1])
        x2 = min(bbox1[2], bbox2[2])
        y2 = min(bbox1[3], bbox2[3])
        
        inter_area = max(0, x2 - x1) * max(0, y2 - y1)
        if inter_area == 0:
            return False
            
        area1 = (bbox1[2] - bbox1[0]) * (bbox1[3] - bbox1[1])
        return (inter_area / float(area1)) > threshold
    
    def _get_head_region(self, person_bbox: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
        x1, y1, x2, y2 = person_bbox
        h = y2 - y1
        return (x1, y1, x2, int(y1 + 0.3 * h))
    
    def _get_torso_region(self, person_bbox: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
        x1, y1, x2, y2 = person_bbox
        h = y2 - y1
        return (x1, int(y1 + 0.3 * h), x2, int(y1 + 0.7 * h))

    def _get_hands_region(self, person_bbox: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
        x1, y1, x2, y2 = person_bbox
        h = y2 - y1
        return (x1, int(y1 + 0.5 * h), x2, y2)
    
    def reset_track(self, track_id: int):
        if track_id in self.violation_history:
            del self.violation_history[track_id]
