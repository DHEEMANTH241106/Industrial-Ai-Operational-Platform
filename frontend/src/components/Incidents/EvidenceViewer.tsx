import React, { useState } from 'react';
import { Evidence } from '../../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface EvidenceViewerProps {
  evidence: Evidence[];
}

const EvidenceViewer: React.FC<EvidenceViewerProps> = ({ evidence }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!evidence || evidence.length === 0) {
    return <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">No evidence available</div>;
  }

  const currentItem = evidence[currentIndex];

  const handlePrev = () => setCurrentIndex(prev => (prev > 0 ? prev - 1 : evidence.length - 1));
  const handleNext = () => setCurrentIndex(prev => (prev < evidence.length - 1 ? prev + 1 : 0));

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
        {currentItem.snapshot_path ? (
          <img 
            src={`http://localhost:8000/api/storage/${currentItem.snapshot_path}`} 
            alt="Evidence Snapshot" 
            className="max-w-full max-h-[500px] object-contain"
          />
        ) : (
          <div className="text-gray-500">Image not available</div>
        )}
        
        {evidence.length > 1 && (
          <>
            <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/75">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/75">
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
          <div className="text-sm">{format(new Date(currentItem.timestamp), 'MMM d, yyyy HH:mm:ss.SSS')}</div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>Snapshot {currentIndex + 1} of {evidence.length}</div>
        <div className="flex gap-1">
          {evidence.map((_, idx) => (
            <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-cyan-600' : 'bg-gray-300'}`} />
          ))}
        </div>
      </div>
      
      {currentItem.detection_data && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold mb-2">Detection Metadata</h4>
          <pre className="text-xs overflow-x-auto text-gray-700">
            {JSON.stringify(currentItem.detection_data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default EvidenceViewer;
