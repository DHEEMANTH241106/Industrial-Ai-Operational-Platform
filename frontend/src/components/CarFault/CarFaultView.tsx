import React, { useState } from 'react';
import { Car, ExternalLink, RefreshCw, Activity, ShieldAlert, Cpu } from 'lucide-react';

export const CarFaultView: React.FC = () => {
  const [key, setKey] = useState<number>(0);

  const handleReload = () => {
    setKey((prev) => prev + 1);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
              Module 3 · Fleet & Telemetry
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
            <Car className="w-7 h-7 text-indigo-600" />
            AI-Based Vehicle & Fleet Fault Diagnosis
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            OBD-II vehicle telemetry classification across 8 fault classes with calibrated confidence & SHAP explainability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReload}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Feed
          </button>
          <a
            href="/car-fault/ui/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shadow-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Full Standalone
          </a>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Telemetry Engine</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">8 Fault Classes Diagnosed</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Confidence Tuning</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">Isotonic Calibrated Probabilities</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Alert Persistence</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">Suppresses False Transients</p>
          </div>
        </div>
      </div>

      {/* Embedded App View */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[720px] flex flex-col">
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono">Mounted Sub-App: /car-fault/ui/</span>
          </div>
          <span className="text-gray-400 font-medium">FastAPI Integrated Instance</span>
        </div>
        <iframe
          key={key}
          src="/car-fault/ui/"
          title="Car Fault Diagnosis UI"
          className="w-full flex-1 border-0 min-h-[700px]"
        />
      </div>
    </div>
  );
};

export default CarFaultView;
