export interface Organization {
  id: number;
  name: string;
  slug: string;
  industry_type: string;
  created_at: string;
}

export interface SafetyProfile {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  required_ppe: string[];
  severity_weights: Record<string, number>;
  is_default: boolean;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  organization_id?: number | null;
  organization?: Organization | null;
  is_active: boolean;
  created_at: string;
}

export interface Camera {
  id: number;
  organization_id?: number | null;
  safety_profile_id?: number | null;
  safety_profile?: SafetyProfile | null;
  name: string;
  source_type: string;
  source_uri: string | null;
  status: string;
  location: string | null;
  configuration: Record<string, any>;
  created_at: string;
  zones?: Zone[];
}

export interface Zone {
  id: number;
  camera_id: number;
  name: string;
  polygon_json: number[][];
  is_restricted: boolean;
  severity: string;
  ppe_required: string[];
  created_at: string;
}

export interface MonitoringSession {
  id: number;
  camera_id: number;
  started_at: string;
  ended_at: string | null;
  status: string;
  video_source: string | null;
  frame_count: number;
  detection_count: number;
  incident_count: number;
  avg_fps: number;
  avg_latency_ms: number;
}

export interface Detection {
  class_name: string;
  confidence: number;
  bbox: number[];
  track_id: number | null;
}

export interface Incident {
  id: number;
  camera_id: number;
  session_id: number;
  violation_type: string;
  risk_score: number;
  severity: string;
  status: string;
  first_seen: string;
  last_seen: string;
  track_id: number | null;
  description: string | null;
  location: string | null;
  evidence: Evidence[];
  events: IncidentEvent[];
}

export interface Evidence {
  id: number;
  incident_id: number;
  snapshot_path: string | null;
  timestamp: string;
  detection_data: Record<string, any> | null;
}

export interface IncidentEvent {
  id: number;
  incident_id: number;
  actor_id: number | null;
  action: string;
  notes: string | null;
  created_at: string;
}

export interface AnalyticsSummary {
  total_incidents: number;
  open_incidents: number;
  acknowledged_incidents: number;
  resolved_incidents: number;
  false_positives: number;
  high_risk_incidents: number;
  incidents_by_type: Record<string, number>;
  incidents_by_severity: Record<string, number>;
  incidents_by_camera: Record<string, number>;
  recent_incidents: Incident[];
  active_sessions: number;
  total_cameras: number;
}

export interface ModelStatus {
  is_ready: boolean;
  repository_id: string;
  revision: string | null;
  labels: Record<string, string> | null;
  device: string;
  loaded_at: string | null;
}

export interface WSEvent {
  type: string;
  session_id: number;
  [key: string]: any;
}

export interface SessionMetrics {
  fps: number;
  latency_ms: number;
  frames_processed: number;
  detections_count: number;
}
