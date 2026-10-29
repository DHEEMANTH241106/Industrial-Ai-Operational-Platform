import React, { useRef, useEffect } from 'react';
import DetectionOverlay from './DetectionOverlay';
import { Detection } from '../../types';

interface VideoFeedProps {
  frameData: string | null;
  detections: Detection[];
}

const VideoFeed: React.FC<VideoFeedProps> = ({ frameData, detections }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!frameData) {
    return (
      <div className="text-white flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Waiting for video feed...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      <img
        ref={imgRef}
        src={`data:image/jpeg;base64,${frameData}`}
        alt="Live feed"
        className="max-w-full max-h-full object-contain"
      />
      <DetectionOverlay 
        detections={detections} 
        imageElement={imgRef.current} 
        containerElement={containerRef.current}
      />
    </div>
  );
};

export default VideoFeed;
