import React, { useEffect, useState } from 'react';
import { Camera as CameraIcon, Plus, Trash2, Activity, X, ShieldCheck } from 'lucide-react';
import { camerasApi, organizationsApi } from '../../services/api';
import { Camera, SafetyProfile } from '../../types';
import ZoneEditor from './ZoneEditor';

const CameraManager = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [safetyProfiles, setSafetyProfiles] = useState<SafetyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    source_type: 'rtsp',
    source_uri: '',
    location: '',
    safety_profile_id: undefined as number | undefined,
  });

  useEffect(() => {
    fetchCameras();
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const res = await organizationsApi.getSafetyProfiles();
      setSafetyProfiles(res.data);
      if (res.data.length > 0 && !formData.safety_profile_id) {
        setFormData(prev => ({ ...prev, safety_profile_id: res.data[0].id }));
      }
    } catch (err) {
      console.error("Failed to fetch safety profiles", err);
    }
  };

  const fetchCameras = async () => {
    try {
      const res = await camerasApi.list();
      setCameras(res.data);
      if (res.data.length > 0 && !selectedCamera) {
        setSelectedCamera(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await camerasApi.create(formData);
      setCameras([...cameras, res.data]);
      setSelectedCamera(res.data);
      setIsModalOpen(false);
      setFormData({ name: '', source_type: 'rtsp', source_uri: '', location: '', safety_profile_id: undefined });
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to add camera");
    }
  };

  const handleDeleteCamera = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this camera?")) return;
    try {
      await camerasApi.delete(id);
      const updated = cameras.filter(c => c.id !== id);
      setCameras(updated);
      setSelectedCamera(updated.length > 0 ? updated[0] : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestConnection = async (id: number) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await camerasApi.test(id);
      setTestResult("✅ Connection Successful!");
    } catch (err: any) {
      setTestResult("❌ Could not connect to camera stream.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Camera Management</h2>
          <p className="text-sm text-gray-500 mt-1">Configure hostel corridor IP/RTSP streams or webcams</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Corridor / IP Camera
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-0 overflow-hidden">
            <div className="bg-slate-50 border-b border-gray-200 p-4 font-semibold text-gray-700">
              Registered Cameras ({cameras.length})
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : cameras.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No cameras configured</div>
              ) : (
                cameras.map(cam => (
                  <div 
                    key={cam.id} 
                    onClick={() => { setSelectedCamera(cam); setTestResult(null); }}
                    className={`p-4 cursor-pointer hover:bg-cyan-50 transition-colors flex justify-between items-center ${selectedCamera?.id === cam.id ? 'bg-cyan-50 border-l-4 border-cyan-500' : ''}`}
                  >
                    <div>
                      <div className="font-medium text-gray-900">{cam.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <span className="capitalize text-cyan-700 font-semibold">{cam.source_type}</span>
                        <span>•</span>
                        <span>{cam.location || 'No location'}</span>
                      </div>
                      {cam.safety_profile && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {cam.safety_profile.required_ppe.map((item, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded font-mono border border-slate-200">
                              {item === 'mask' ? '😷 Mask' : item === 'helmet' ? '⛑️ Helmet' : item === 'vest' ? '🦺 Vest' : item === 'gloves' ? '🧤 Gloves' : item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <CameraIcon className="w-5 h-5 text-gray-400" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedCamera ? (
            <div className="space-y-6">
              <div className="card">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold">{selectedCamera.name}</h3>
                    <p className="text-gray-500">{selectedCamera.location || 'Corridor'}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteCamera(selectedCamera.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete Camera"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Safety Profile Banner */}
                {selectedCamera.safety_profile && (
                  <div className="bg-cyan-50/70 border border-cyan-200 rounded-lg p-3.5 mb-6 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-cyan-700 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-cyan-900">
                        Active Safety Profile: {selectedCamera.safety_profile.name}
                      </div>
                      <p className="text-xs text-cyan-800 mt-0.5">
                        {selectedCamera.safety_profile.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-semibold text-cyan-900">Mandatory PPE:</span>
                        {selectedCamera.safety_profile.required_ppe.map((item, idx) => (
                          <span key={idx} className="bg-white text-cyan-900 border border-cyan-300 text-xs px-2 py-0.5 rounded-md font-medium shadow-2xs">
                            {item === 'mask' ? '😷 Face Mask' : item === 'helmet' ? '⛑️ Hardhat Helmet' : item === 'vest' ? '🦺 Safety Vest' : item === 'gloves' ? '🧤 Sterile Gloves' : item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-6 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <span className="text-gray-500 block text-xs uppercase font-semibold">Source Type</span>
                    <span className="font-medium uppercase text-slate-800">{selectedCamera.source_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs uppercase font-semibold">RTSP / URI Address</span>
                    <span className="font-mono text-xs text-slate-800 truncate block">{selectedCamera.source_uri}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleTestConnection(selectedCamera.id)}
                    disabled={testing}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Activity className="w-4 h-4" /> {testing ? "Testing..." : "Test Connection"}
                  </button>
                  {testResult && (
                    <span className="text-sm font-medium">{testResult}</span>
                  )}
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Restricted Monitoring Zones</h3>
                <ZoneEditor camera={selectedCamera} />
              </div>
            </div>
          ) : (
            <div className="card h-full flex flex-col items-center justify-center text-gray-500 py-20">
              <CameraIcon className="w-16 h-16 mb-4 opacity-20" />
              <p>Select a camera from the list to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Camera Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800">Add Corridor / IP Camera</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCamera} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Camera Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. 1st Floor Corridor North" 
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  value={formData.source_type}
                  onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
                >
                  <option value="rtsp">RTSP IP Stream (Corridor CCTV / NVR)</option>
                  <option value="webcam">USB / Local Camera Index</option>
                  <option value="file">Saved Video File Path (.mp4)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.source_type === 'rtsp' ? 'RTSP Stream URL' : formData.source_type === 'webcam' ? 'Camera Device Index' : 'Video File Path'}
                </label>
                <input 
                  type="text" 
                  placeholder={
                    formData.source_type === 'rtsp' 
                      ? 'rtsp://username:password@192.168.1.50:554/stream1' 
                      : formData.source_type === 'webcam' 
                      ? '0 (or 1, 2)' 
                      : 'storage/uploads/corridor.mp4'
                  }
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm font-mono"
                  value={formData.source_uri}
                  onChange={(e) => setFormData({ ...formData, source_uri: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  {formData.source_type === 'rtsp' 
                    ? 'Standard RTSP protocol stream from Hikvision, Dahua, CP Plus, or NVR.' 
                    : formData.source_type === 'webcam'
                    ? 'Device 0 is built-in camera, 1 is external USB webcam.'
                    : 'Relative or absolute video file path on disk.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Safety Detection Profile (Required PPE)
                </label>
                <select 
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  value={formData.safety_profile_id || ''}
                  onChange={(e) => setFormData({ ...formData, safety_profile_id: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <option value="">Default Company Profile</option>
                  {safetyProfiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.required_ppe.join(', ')})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Defines the specific PPE requirements (e.g., Mask for Pharma vs Helmet/Vest for Hardware).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location / Notes</label>
                <input 
                  type="text" 
                  placeholder="e.g. Cleanroom Unit 2 or Workshop Floor" 
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Camera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraManager;
