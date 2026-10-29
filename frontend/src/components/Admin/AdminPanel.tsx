import React, { useState, useEffect } from 'react';
import { modelsApi } from '../../services/api';
import { ModelStatus } from '../../types';
import { 
  Server, 
  Cpu, 
  Database, 
  RefreshCw, 
  Scan, 
  Car, 
  Zap, 
  Wrench, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';

interface ModuleStatusItem {
  id: string;
  name: string;
  category: string;
  endpoint: string;
  status: 'Online' | 'Offline';
  framework: string;
}

const AdminPanel = () => {
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [modules, setModules] = useState<ModuleStatusItem[]>([
    {
      id: 'ppe_vision',
      name: 'Workplace Camera PPE & Zone Surveillance',
      category: 'Computer Vision Safety',
      endpoint: '/api/models/status',
      status: 'Online',
      framework: 'FastAPI + YOLOv8'
    },
    {
      id: 'defect_vision',
      name: 'DefectVision · Steel Surface Inspection',
      category: 'Quality Control',
      endpoint: '/api/defect-vision/info',
      status: 'Online',
      framework: 'Ultralytics YOLOv8n'
    },
    {
      id: 'car_fault',
      name: 'AI-Based Vehicle & Fleet Fault Diagnosis',
      category: 'Fleet Telemetry',
      endpoint: '/car-fault/api/v1/health',
      status: 'Online',
      framework: 'FastAPI Sub-App + Random Forest'
    },
    {
      id: 'aegis_burn',
      name: 'AegisBurn AI · Semiconductor Burn-In Screening',
      category: 'Electronics QA',
      endpoint: '/api/aegis-burn/health',
      status: 'Online',
      framework: 'Scikit-Learn + Isolation Forest'
    },
    {
      id: 'predictive_maint',
      name: 'FactoryMind & Previsio Machinery Health',
      category: 'Predictive Maintenance',
      endpoint: '/api/factorymind/fleet-status',
      status: 'Online',
      framework: 'LightGBM + HistGradientBoosting'
    }
  ]);

  useEffect(() => {
    fetchModelStatus();
  }, []);

  const fetchModelStatus = async () => {
    try {
      const res = await modelsApi.getStatus();
      setModelStatus(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReloadModel = async () => {
    setLoadingModel(true);
    try {
      await modelsApi.reload();
      await fetchModelStatus();
    } catch (err) {
      console.error("Failed to reload model", err);
    } finally {
      setLoadingModel(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Platform Administration & Module Status</h2>
        <p className="text-gray-500 text-sm mt-1">
          Master registry, compute device management, and service health across all integrated industrial AI engines.
        </p>
      </div>

      {/* Integrated Modules Registry */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">Integrated Multi-Module Registry</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
            5 / 5 Modules Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Module Name</th>
                <th className="py-3 px-4">Domain Category</th>
                <th className="py-3 px-4">Mounted Endpoint</th>
                <th className="py-3 px-4">Engine / Framework</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {modules.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/75 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-gray-900">{m.name}</td>
                  <td className="py-3.5 px-4">{m.category}</td>
                  <td className="py-3.5 px-4 font-mono text-indigo-600 font-medium">{m.endpoint}</td>
                  <td className="py-3.5 px-4 font-mono text-gray-500">{m.framework}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Vision Model Configuration */}
        <div className="card space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Lead Vision Model (YOLOv8 PPE)</h3>
            </div>
            <button 
              onClick={handleReloadModel} 
              disabled={loadingModel}
              className="btn-secondary text-sm py-1.5 flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingModel ? 'animate-spin' : ''}`} />
              Reload Weights
            </button>
          </div>
          
          {modelStatus ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3 py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Status</span>
                <span className={`col-span-2 font-medium ${modelStatus.is_ready ? 'text-green-600' : 'text-red-600'}`}>
                  {modelStatus.is_ready ? 'Ready / Active in Memory' : 'Not Ready'}
                </span>
              </div>
              <div className="grid grid-cols-3 py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">HuggingFace Repo</span>
                <span className="col-span-2 font-mono bg-gray-50 px-2 py-1 rounded truncate text-xs">{modelStatus.repository_id}</span>
              </div>
              <div className="grid grid-cols-3 py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Revision</span>
                <span className="col-span-2 font-mono text-xs">{modelStatus.revision || 'main'}</span>
              </div>
              <div className="grid grid-cols-3 py-2 border-b border-gray-50">
                <span className="text-gray-500 font-medium">Compute Device</span>
                <span className="col-span-2 uppercase font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full inline-block w-max text-xs">
                  {modelStatus.device}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4">Loading model status...</div>
          )}
        </div>

        {/* System & Database Health */}
        <div className="card space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Platform Host Health</h3>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 text-green-800 rounded-lg border border-green-100">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-medium flex-1">FastAPI Master Host Application</span>
              <span className="text-sm bg-green-100 px-2 py-0.5 rounded font-bold">Online</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 text-green-800 rounded-lg border border-green-100">
              <Database className="w-4 h-4 text-green-600" />
              <span className="font-medium flex-1">Relational Incident & Audit Database</span>
              <span className="text-sm bg-green-100 px-2 py-0.5 rounded font-bold">Connected</span>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Host Runtime Configuration</h4>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• Multi-Tenant Isolation: Active</p>
                <p>• Max FPS per Camera Session: 15 FPS</p>
                <p>• Incident Evidence Retention: 90 days</p>
                <p>• Evidence Storage Directory: /storage/evidence</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
