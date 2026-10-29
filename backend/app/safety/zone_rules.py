from app.vision.detector import DetectionResult

class ZoneRuleEngine:
    def __init__(self):
        self.zone_violations = {}  # track_id -> {zone_id: frame_count}
    
    def check_zone_entry(self, persons: list[DetectionResult], zones: list[dict], frame_width: int, frame_height: int, confirm_frames: int = 5) -> list[dict]:
        violations = []
        for person in persons:
            if person.track_id is None:
                continue
                
            track_id = person.track_id
            if track_id not in self.zone_violations:
                self.zone_violations[track_id] = {}
                
            bottom_center = self._get_bottom_center(person.bbox, frame_width, frame_height)
            
            for zone in zones:
                if not zone.get('is_restricted', False):
                    continue
                    
                zone_id = zone.get('id')
                polygon = zone.get('polygon_json', [])
                
                if self.point_in_polygon(bottom_center, polygon):
                    self.zone_violations[track_id][zone_id] = self.zone_violations[track_id].get(zone_id, 0) + 1
                    if self.zone_violations[track_id][zone_id] >= confirm_frames:
                        violations.append({
                            'track_id': track_id,
                            'zone_id': zone_id,
                            'zone_name': zone.get('name'),
                            'severity': zone.get('severity', 'high')
                        })
                else:
                    if zone_id in self.zone_violations[track_id]:
                        self.zone_violations[track_id][zone_id] = max(0, self.zone_violations[track_id][zone_id] - 1)
                        
        return violations
    
    def point_in_polygon(self, point: tuple[float, float], polygon: list[list[float]]) -> bool:
        x, y = point
        inside = False
        n = len(polygon)
        if n == 0:
            return False
        p1x, p1y = polygon[0]
        for i in range(n + 1):
            p2x, p2y = polygon[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        return inside
    
    def _get_bottom_center(self, bbox: tuple[int, int, int, int], frame_width: int, frame_height: int) -> tuple[float, float]:
        x1, y1, x2, y2 = bbox
        cx = (x1 + x2) / 2.0
        return (cx / frame_width, y2 / frame_height)
