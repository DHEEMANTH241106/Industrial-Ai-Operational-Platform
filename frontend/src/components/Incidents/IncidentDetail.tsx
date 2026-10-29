import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X } from 'lucide-react';
import { incidentsApi } from '../../services/api';
import { Incident } from '../../types';
import EvidenceViewer from './EvidenceViewer';
import { format } from 'date-fns';

const IncidentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      incidentsApi.get(parseInt(id))
        .then(res => setIncident(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!id) return;
    try {
      const res = await incidentsApi.update(parseInt(id), { status });
      setIncident(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading incident details...</div>;
  if (!incident) return <div className="p-8 text-center text-red-500">Incident not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/incidents')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Incident #{incident.id}</h2>
        <div className="ml-auto flex gap-2">
          {incident.status === 'open' && (
            <button onClick={() => updateStatus('acknowledged')} className="btn-secondary flex items-center gap-2">
              Acknowledge
            </button>
          )}
          {['open', 'acknowledged'].includes(incident.status) && (
            <button onClick={() => updateStatus('resolved')} className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4" /> Resolve
            </button>
          )}
          <button onClick={() => updateStatus('false_positive')} className="btn-secondary flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <X className="w-4 h-4" /> False Positive
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Evidence</h3>
            <EvidenceViewer evidence={incident.evidence} />
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Timeline Events</h3>
            <div className="space-y-4">
              {incident.events?.map((evt, i) => (
                <div key={i} className="flex gap-4 border-l-2 border-gray-200 pl-4 pb-2">
                  <div className="text-sm text-gray-500 w-32 flex-shrink-0">
                    {format(new Date(evt.created_at), 'MMM d, HH:mm')}
                  </div>
                  <div>
                    <div className="font-medium capitalize">{evt.action.replace('_', ' ')}</div>
                    {evt.notes && <div className="text-gray-600 text-sm mt-1">{evt.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Details</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Type</div>
                <div className="font-medium">
                  {incident.violation_type === 'missing_mask' ? '😷 Missing Face Mask' :
                   incident.violation_type === 'missing_gloves' ? '🧤 Missing Sterile Gloves' :
                   incident.violation_type === 'missing_helmet' ? '⛑️ Missing Hardhat' :
                   incident.violation_type === 'missing_vest' ? '🦺 Missing Safety Vest' :
                   incident.violation_type === 'restricted_zone' ? '⚠️ Restricted Zone' :
                   incident.violation_type.replace('_', ' ')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Severity</div>
                <span className={`mt-1 badge badge-${incident.severity.toLowerCase()}`}>{incident.severity}</span>
              </div>
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <span className={`mt-1 badge status-${incident.status.toLowerCase()}`}>{incident.status.replace('_', ' ')}</span>
              </div>
              <div>
                <div className="text-sm text-gray-500">Risk Score</div>
                <div className="font-medium text-lg">{incident.risk_score}/100</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Time</div>
                <div className="font-medium text-sm">{format(new Date(incident.first_seen), 'PPP p')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;
