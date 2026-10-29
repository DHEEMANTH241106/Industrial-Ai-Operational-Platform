"""
Industrial Camera Safety Monitoring - Test Suite

Tests for core safety logic: risk scoring, zone rules, PPE rules, and detection validation.
"""

import pytest
import sys
import os
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))


class TestRiskScoring:
    """Tests for risk score calculation."""

    def test_calculate_risk_score_missing_helmet(self):
        from app.safety.risk_scoring import calculate_risk_score
        score, band = calculate_risk_score("missing_helmet", confidence=0.9, persistence_factor=1.0)
        assert 0 <= score <= 100
        assert band in ("low", "medium", "high", "critical")

    def test_calculate_risk_score_restricted_zone(self):
        from app.safety.risk_scoring import calculate_risk_score
        score, band = calculate_risk_score("restricted_zone", confidence=0.95, persistence_factor=1.5)
        assert score > 0
        assert band in ("low", "medium", "high", "critical")

    def test_risk_score_capped_at_max(self):
        from app.safety.risk_scoring import calculate_risk_score
        score, _ = calculate_risk_score("restricted_zone", confidence=1.0, persistence_factor=2.0, max_score=100)
        assert score <= 100

    def test_risk_score_zero_confidence(self):
        from app.safety.risk_scoring import calculate_risk_score
        score, band = calculate_risk_score("missing_helmet", confidence=0.0)
        assert score == 0
        assert band == "low"

    def test_severity_bands(self):
        from app.safety.risk_scoring import get_severity_band
        assert get_severity_band(0) == "low"
        assert get_severity_band(15) == "low"
        assert get_severity_band(29) == "low"
        assert get_severity_band(30) == "medium"
        assert get_severity_band(50) == "medium"
        assert get_severity_band(59) == "medium"
        assert get_severity_band(60) == "high"
        assert get_severity_band(75) == "high"
        assert get_severity_band(79) == "high"
        assert get_severity_band(80) == "critical"
        assert get_severity_band(100) == "critical"

    def test_combine_risk_scores(self):
        from app.safety.risk_scoring import combine_risk_scores
        combined = combine_risk_scores([40.0, 30.0, 50.0], max_score=100)
        assert combined <= 100

    def test_combine_empty_scores(self):
        from app.safety.risk_scoring import combine_risk_scores
        combined = combine_risk_scores([])
        assert combined == 0


class TestZoneRules:
    """Tests for restricted zone geometry."""

    def test_point_in_polygon_inside(self):
        from app.safety.zone_rules import ZoneRuleEngine
        engine = ZoneRuleEngine()
        polygon = [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]
        assert engine.point_in_polygon((0.5, 0.5), polygon) is True

    def test_point_in_polygon_outside(self):
        from app.safety.zone_rules import ZoneRuleEngine
        engine = ZoneRuleEngine()
        polygon = [[0.0, 0.0], [0.5, 0.0], [0.5, 0.5], [0.0, 0.5]]
        assert engine.point_in_polygon((0.8, 0.8), polygon) is False

    def test_point_in_polygon_on_edge(self):
        from app.safety.zone_rules import ZoneRuleEngine
        engine = ZoneRuleEngine()
        polygon = [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]
        # Edge cases may vary; just ensure no crash
        result = engine.point_in_polygon((0.0, 0.5), polygon)
        assert isinstance(result, bool)

    def test_point_in_triangle(self):
        from app.safety.zone_rules import ZoneRuleEngine
        engine = ZoneRuleEngine()
        polygon = [[0.0, 0.0], [1.0, 0.0], [0.5, 1.0]]
        assert engine.point_in_polygon((0.5, 0.3), polygon) is True
        assert engine.point_in_polygon((0.9, 0.9), polygon) is False


class TestDetectionResult:
    """Tests for detection data structure."""

    def test_detection_result_creation(self):
        from app.vision.detector import DetectionResult
        det = DetectionResult(
            class_name="helmet",
            confidence=0.95,
            bbox=(100, 200, 150, 250),
            track_id=1
        )
        assert det.class_name == "helmet"
        assert det.confidence == 0.95
        assert det.bbox == (100, 200, 150, 250)
        assert det.track_id == 1

    def test_detection_result_no_track(self):
        from app.vision.detector import DetectionResult
        det = DetectionResult(
            class_name="person",
            confidence=0.8,
            bbox=(0, 0, 100, 200)
        )
        assert det.track_id is None


class TestBboxValidation:
    """Tests for bounding box utilities."""

    def test_bbox_coordinates_valid(self):
        """Bounding box x1 < x2 and y1 < y2."""
        bbox = (100, 200, 300, 400)
        x1, y1, x2, y2 = bbox
        assert x1 < x2
        assert y1 < y2

    def test_bbox_area_positive(self):
        bbox = (100, 200, 300, 400)
        x1, y1, x2, y2 = bbox
        area = (x2 - x1) * (y2 - y1)
        assert area > 0


class TestPPERules:
    """Tests for PPE rule evaluation."""

    def test_ppe_status_enum(self):
        from app.safety.ppe_rules import PPEStatus
        assert PPEStatus.COMPLIANT.value == "compliant"
        assert PPEStatus.VIOLATION.value == "violation"
        assert PPEStatus.UNCERTAIN.value == "uncertain"

    def test_ppe_assessment_creation(self):
        from app.safety.ppe_rules import PPEAssessment, PPEStatus
        assessment = PPEAssessment(
            person_track_id=1,
            person_bbox=(100, 100, 200, 400),
            helmet_status=PPEStatus.COMPLIANT,
            vest_status=PPEStatus.VIOLATION,
            confidence=0.85,
            details={"helmet_detected": True, "vest_detected": False}
        )
        assert assessment.helmet_status == PPEStatus.COMPLIANT
        assert assessment.vest_status == PPEStatus.VIOLATION

    def test_pharma_cleanroom_mask_and_gloves(self):
        from app.safety.ppe_rules import PPERuleEngine, PPEStatus
        from app.vision.detector import DetectionResult
        from app.core.config import Settings
        
        settings = Settings()
        settings.violation_confirm_frames = 1
        engine = PPERuleEngine(settings)
        
        person = DetectionResult(class_name="person", confidence=0.9, bbox=(100, 100, 200, 400), track_id=10)
        # Person has mask and gloves
        mask = DetectionResult(class_name="mask", confidence=0.88, bbox=(120, 105, 180, 150))
        gloves = DetectionResult(class_name="gloves", confidence=0.85, bbox=(110, 280, 150, 340), track_id=10)
        
        assessments = engine.evaluate(
            persons=[person],
            ppe_items=[mask, gloves],
            violations=[],
            required_ppe=["mask", "gloves"]
        )
        assert len(assessments) == 1
        assert assessments[0].item_statuses.get("mask") == PPEStatus.COMPLIANT
        assert assessments[0].item_statuses.get("gloves") == PPEStatus.COMPLIANT
        assert len(assessments[0].violations) == 0

    def test_pharma_cleanroom_missing_gloves_and_mask_violation(self):
        from app.safety.ppe_rules import PPERuleEngine, PPEStatus
        from app.vision.detector import DetectionResult
        from app.core.config import Settings
        
        settings = Settings()
        settings.violation_confirm_frames = 1
        engine = PPERuleEngine(settings)
        
        person = DetectionResult(class_name="person", confidence=0.9, bbox=(100, 100, 200, 400), track_id=11)
        # Person missing mask and bare hands (no_gloves)
        no_mask = DetectionResult(class_name="no_mask", confidence=0.88, bbox=(120, 105, 180, 150))
        no_gloves = DetectionResult(class_name="no_gloves", confidence=0.85, bbox=(110, 280, 150, 340), track_id=11)
        
        assessments = engine.evaluate(
            persons=[person],
            ppe_items=[],
            violations=[no_mask, no_gloves],
            required_ppe=["mask", "gloves"]
        )
        assert len(assessments) == 1
        assert assessments[0].item_statuses.get("mask") == PPEStatus.VIOLATION
        assert assessments[0].item_statuses.get("gloves") == PPEStatus.VIOLATION
        assert "missing_mask" in assessments[0].violations
        assert "missing_gloves" in assessments[0].violations

    def test_hardware_helmet_and_vest_enforcement(self):
        from app.safety.ppe_rules import PPERuleEngine, PPEStatus
        from app.vision.detector import DetectionResult
        from app.core.config import Settings
        
        settings = Settings()
        settings.violation_confirm_frames = 1
        engine = PPERuleEngine(settings)
        
        person = DetectionResult(class_name="person", confidence=0.9, bbox=(100, 100, 200, 400), track_id=12)
        helmet = DetectionResult(class_name="helmet", confidence=0.9, bbox=(120, 100, 180, 150))
        no_vest = DetectionResult(class_name="no_vest", confidence=0.85, bbox=(110, 200, 190, 320))
        
        assessments = engine.evaluate(
            persons=[person],
            ppe_items=[helmet],
            violations=[no_vest],
            required_ppe=["helmet", "vest"]
        )
        assert len(assessments) == 1
        assert assessments[0].helmet_status == PPEStatus.COMPLIANT
        assert assessments[0].vest_status == PPEStatus.VIOLATION
        assert "missing_vest" in assessments[0].violations


class TestAlertDeduplication:
    """Tests for alert deduplication logic."""

    def test_dedup_key_creation(self):
        from app.services.alert_service import AlertService
        key = AlertService.create_dedup_key(session_id=1, track_id=5, violation_type="missing_helmet")
        assert "1" in key
        assert "missing_helmet" in key

    def test_should_alert_first_time(self):
        from app.services.alert_service import AlertService
        # Reset cooldowns for test
        AlertService._cooldowns = {}
        key = "test_unique_key_1"
        assert AlertService.should_alert(key, cooldown_seconds=30) is True

    def test_should_not_alert_within_cooldown(self):
        from app.services.alert_service import AlertService
        AlertService._cooldowns = {}
        key = "test_unique_key_2"
        AlertService.record_alert(key)
        assert AlertService.should_alert(key, cooldown_seconds=30) is False


class TestConfigValidation:
    """Tests for configuration loading."""

    def test_default_config_values(self):
        from app.core.config import Settings
        s = Settings()
        assert s.person_confidence == 0.35
        assert s.ppe_confidence == 0.40
        assert s.frame_sample_fps == 5
        assert s.violation_confirm_frames == 5
        assert s.incident_cooldown_seconds == 30
        assert s.max_risk_score == 100

    def test_config_confidence_range(self):
        from app.core.config import Settings
        s = Settings()
        assert 0 <= s.person_confidence <= 1
        assert 0 <= s.ppe_confidence <= 1


class TestStatusTransitions:
    """Tests for incident status transition validation."""

    VALID_TRANSITIONS = {
        "open": ["acknowledged", "resolved", "false_positive"],
        "acknowledged": ["resolved", "false_positive"],
        "resolved": [],
        "false_positive": [],
    }

    def test_open_to_acknowledged(self):
        assert "acknowledged" in self.VALID_TRANSITIONS["open"]

    def test_open_to_resolved(self):
        assert "resolved" in self.VALID_TRANSITIONS["open"]

    def test_open_to_false_positive(self):
        assert "false_positive" in self.VALID_TRANSITIONS["open"]

    def test_acknowledged_to_resolved(self):
        assert "resolved" in self.VALID_TRANSITIONS["acknowledged"]

    def test_resolved_is_terminal(self):
        assert len(self.VALID_TRANSITIONS["resolved"]) == 0

    def test_false_positive_is_terminal(self):
        assert len(self.VALID_TRANSITIONS["false_positive"]) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
