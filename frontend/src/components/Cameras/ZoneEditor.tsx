import React, { useState, useEffect } from 'react';
import { Zone, Camera } from '../../types';
import { zonesApi } from '../../services/api';
import { Trash2, Plus } from 'lucide-react';

interface ZoneEditorProps {
  camera: Camera;
}

const ZoneEditor: React.FC<ZoneEditorProps> = ({ camera }) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchZones();
  }, [camera.id]);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const res = await zonesApi.list(camera.id);
      setZones(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#22c55e';
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative bg-gray-900 rounded-lg aspect-video flex items-center justify-center overflow-hidden border border-gray-200">
        <div className="text-gray-500">Preview not available</div>
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {zones.map(zone => (
            <polygon 
              key={zone.id}
              points={zone.polygon_json.map(p => `${p[0] * 100}%,${p[1] * 100}%`).join(' ')}
              fill={`${getSeverityColor(zone.severity)}33`}
              stroke={getSeverityColor(zone.severity)}
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-gray-700">Configured Zones ({zones.length})</h4>
          <button className="text-cyan-600 text-sm font-medium flex items-center gap-1 hover:text-cyan-800">
            <Plus className="w-4 h-4" /> Add Zone
          </button>
        </div>
        
        {loading ? (
          <div className="text-sm text-gray-500">Loading zones...</div>
        ) : zones.length === 0 ? (
          <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded text-center">No zones defined for this camera.</div>
        ) : (
          <div className="grid gap-3">
            {zones.map(zone => (
              <div key={zone.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center bg-white hover:border-cyan-300 transition-colors">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getSeverityColor(zone.severity) }}></div>
                    {zone.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex gap-2">
                    {zone.is_restricted && <span className="bg-red-50 text-red-600 px-1.5 rounded">Restricted Area</span>}
                    {zone.ppe_required?.length > 0 && <span>PPE: {zone.ppe_required.join(', ')}</span>}
                  </div>
                </div>
                <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ZoneEditor;
