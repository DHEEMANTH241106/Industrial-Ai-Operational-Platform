import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  AlertOctagon, 
  Video, 
  CheckCircle2, 
  Scan, 
  Car, 
  Zap, 
  Wrench, 
  ArrowRight, 
  ShieldCheck,
  Cpu
} from 'lucide-react';
import StatsCard from './StatsCard';
import IncidentTrendChart from './IncidentTrendChart';
import { analyticsApi, modelsApi } from '../../services/api';
import { AnalyticsSummary, ModelStatus } from '../../types';

const Overview = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, modRes] = await Promise.all([
          analyticsApi.getSummary(),
          modelsApi.getStatus()
        ]);
        setSummary(sumRes.data);
        setModelStatus(modRes.data);
      } catch (err) {
        console.error("Failed to fetch overview data", err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const modules = [
    {
      title: "Workplace PPE & Zone Safety",
      description: "Live camera stream, helmet/vest detection, restricted zones, and risk scoring.",
      route: "/monitoring",
      icon: Video,
      color: "bg-cyan-50 text-cyan-600 border-cyan-200",
      tag: "Lead Module"
    },
    {
      title: "Steel Defect Vision",
      description: "YOLOv8 surface inspection across 6 manufacturing defect classes.",
      route: "/defect-vision",
      icon: Scan,
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
      tag: "Quality Control"
    },
    {
      title: "Vehicle & Fleet Faults",
      description: "OBD-II vehicle telemetry diagnosis, calibrated confidence & SHAP explanations.",
      route: "/car-fault",
      icon: Car,
      color: "bg-indigo-50 text-indigo-600 border-indigo-200",
      tag: "Fleet Health"
    },
    {
      title: "Semiconductor Burn-In",
      description: "Early-burn-in degradation screening and anomaly scores for silicon ICs.",
      route: "/aegis-burn",
      icon: Zap,
      color: "bg-amber-50 text-amber-600 border-amber-200",
      tag: "Silicon QA"
    },
    {
      title: "Predictive Maintenance",
      description: "Machine failure risk, AI4I root-cause diagnostics, and prescriptive actions.",
      route: "/predictive-maintenance",
      icon: Wrench,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      tag: "Machinery"
    }
  ];

  if (!summary) return <div className="p-8 text-gray-500 font-medium">Loading platform dashboard...</div>;

  return (
    <div className="space-y-8">
      {/* Platform Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-700/60">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Unified Platform
            </span>
            <span className="text-xs text-slate-400">Version 2.0</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Industrial AI & Operations Platform
          </h1>
          <p className="text-slate-300 text-sm mt-1.5 max-w-2xl">
            Single-pane operational intelligence unifying workplace personnel safety, manufacturing defect vision, machinery predictive maintenance, and automotive telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Platform Status</p>
              <p className="text-sm font-bold text-white">5 Modules Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Module Navigation Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider text-xs">
            Integrated Industrial Modules
          </h2>
          <span className="text-xs text-gray-400 font-medium">Select a module to open full workbench</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {modules.map((m) => (
            <div
              key={m.title}
              onClick={() => navigate(m.route)}
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-lg border ${m.color}`}>
                    <m.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {m.tag}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
                  {m.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {m.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                <span>Launch</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Real-time Metrics */}
      <div>
        <h2 className="text-base font-bold text-gray-800 mb-3 uppercase tracking-wider text-xs">
          Safety & Camera Live Monitoring Telemetry
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Active Cameras" value={summary.total_cameras} icon={Video} color="cyan" />
          <StatsCard title="Open Incidents" value={summary.open_incidents} icon={Activity} color="yellow" />
          <StatsCard title="High Risk Incidents" value={summary.high_risk_incidents} icon={AlertOctagon} color="red" />
          <StatsCard title="Active Sessions" value={summary.active_sessions} icon={CheckCircle2} color="green" />
        </div>
      </div>

      {/* Charts & ML Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Incident Trends (Last 7 Days)</h3>
          <div className="h-80">
            <IncidentTrendChart />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">AI Model Readiness</h3>
            {modelStatus ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">YOLOv8 PPE Vision</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    modelStatus.is_ready ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {modelStatus.is_ready ? 'Ready' : 'Offline'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">DefectVision (Steel)</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">
                    Ready
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">Car Fault OBD-II</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">
                    Ready
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">AegisBurn Semiconductor</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">
                    Ready
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-gray-500 font-medium">Predictive Maintenance</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">
                    Ready
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Loading model states...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
