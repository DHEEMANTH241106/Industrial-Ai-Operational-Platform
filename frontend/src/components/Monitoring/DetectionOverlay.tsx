import React, { useEffect, useRef, useState } from 'react';
import { Detection } from '../../types';

interface DetectionOverlayProps {
  detections: Detection[];
  imageElement: HTMLImageElement | null;
  containerElement: HTMLDivElement | null;
}

const CLASS_COLORS: Record<string, string> = {
  person: '#3b82f6', // blue
  helmet: '#22c55e', // green
  no_helmet: '#ef4444', // red
  vest: '#22c55e',
  no_vest: '#ef4444'
};

const DetectionOverlay: React.FC<DetectionOverlayProps> = ({ detections, imageElement, containerElement }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, top: 0, left: 0 });

  useEffect(() => {
    if (!imageElement || !containerElement) return;

    const updateDimensions = () => {
      const rect = imageElement.getBoundingClientRect();
      const containerRect = containerElement.getBoundingClientRect();
      
      setDimensions({
        width: rect.width,
        height: rect.height,
        top: rect.top - containerRect.top,
        left: rect.left - containerRect.left
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // Also observe the image for layout shifts
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(imageElement);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      observer.disconnect();
    };
  }, [imageElement, containerElement, detections]); // re-run if detections change in case image size changed

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dimensions.width || !dimensions.height) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw detections
    detections.forEach(det => {
      // bbox is typically [x_min, y_min, x_max, y_max] normalized 0-1
      const [xmin, ymin, xmax, ymax] = det.bbox;
      
      const x = xmin * dimensions.width;
      const y = ymin * dimensions.height;
      const w = (xmax - xmin) * dimensions.width;
      const h = (ymax - ymin) * dimensions.height;

      const color = CLASS_COLORS[det.class_name] || '#ffffff';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Label
      const label = `${det.class_name} ${(det.confidence * 100).toFixed(0)}%`;
      ctx.fillStyle = color;
      
      // Calculate text width for background
      ctx.font = '12px Arial';
      const textWidth = ctx.measureText(label).width;
      
      ctx.fillRect(x, y > 16 ? y - 16 : y, textWidth + 8, 16);
      
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 4, y > 16 ? y - 4 : y + 12);
    });

  }, [detections, dimensions]);

  if (!dimensions.width) return null;

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      style={{
        position: 'absolute',
        top: dimensions.top,
        left: dimensions.left,
        pointerEvents: 'none'
      }}
    />
  );
};

export default DetectionOverlay;
