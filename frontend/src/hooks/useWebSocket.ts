import { useState, useEffect, useCallback } from 'react';
import { wsService } from '../services/websocket';
import { SessionMetrics, Detection } from '../types';

export function useWebSocket(sessionId: number | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [frameData, setFrameData] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    wsService.connect(sessionId);
    setIsConnected(true);

    const unsubscribe = wsService.onMessage((data) => {
      setLastEvent(data);
      if (data.type === 'frame' || data.type === 'frame_update') {
        const b64 = data.frame_base64 || data.frame;
        if (b64) setFrameData(b64);
        if (data.detections) setDetections(data.detections);
        if (data.metrics) setMetrics(data.metrics);
      } else if (data.type === 'metrics' || data.type === 'metrics_update') {
        setMetrics(data.metrics || data);
      } else if (data.type === 'detection_update' && data.detections) {
        setDetections(data.detections);
      }
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
      setIsConnected(false);
    };
  }, [sessionId]);

  const sendMessage = useCallback((data: any) => {
    wsService.send(data);
  }, []);

  return { isConnected, lastEvent, detections, metrics, frameData, sendMessage };
}
