import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Wrench, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Gauge, 
  Cpu, 
  RotateCw, 
  Settings2, 
  ShieldCheck 
} from 'lucide-react';

interface MachineFleetItem {
  id: string;
  name: string;
  temperature: number;
  vibration: number;
  tool_wear: number;
  health: number;
  status: 'Healthy' | 'Warning' | 'Critical';
}

interface DiagnosisResponse {
  prediction: string;
  failure_probability: number;
  risk_level: string;
  health_score: number;
  status: string;
  root_cause_analysis: {
    detected_issues: string[];
    probable_root_cause: string;
    model_derived_top_factors: string[];
  };
  recommendations: Array<{
    severity: string;
    detected_issue: string;
    recommended_action: string;
    reason: string;
  }>;
}

export const PredictiveMaintenanceView: React.FC = () => {
  const [fleet, setFleet] = useState<MachineFleetItem[]>([]);
  const [loadingFleet, setLoadingFleet] = useState<boolean>(true);

  // Sensor Inputs for interactive diagnosis
  const [temperature, setTemperature] = useState<number>(72.0);
  const [vibration, setVibration] = useState<number>(3.5);
  const [torque, setTorque] = useState<number>(42.0);
  const [speed, setSpeed] = useState<number>(1750.0);
  const [toolWear, setToolWear] = useState<number>(30.0);
  const [pressure, setPressure] = useState<number>(35.0);

  const [diagnosing, setDiagnosing] = useState<boolean>(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResponse | null>(null);

  const loadFleet = async () => {
    try {
      setLoadingFleet(true);
      const res = await axios.get('/api/factorymind/fleet-status');
      setFleet(res.data.fleet);
    } catch (err) {
      console.error('Failed to load fleet status', err);
    } finally {
      setLoadingFleet(false);
    }
  };

  const runDiagnosis = async () => {
    try {
      setDiagnosing(true);
      const res = await axios.post<DiagnosisResponse>('/api/factorymind/predict', {
        temperature,
        vibration,
        pressure,
        speed,
        tool_wear: toolWear,
        torque,
        efficiency_pct: 88.0,
      });
      setDiagnosis(res.data);
    } catch (err) {
      console.error('Diagnosis failed', err);
    } finally {
      setDiagnosing(false);
    }
  };

  const applyPreset = (preset: 'optimal' | 'thermal' | 'bearing' | 'toolwear') => {
    if (preset === 'optimal') {
      setTemperature(68.0);
      setVibration(2.8);
      setTorque(38.0);
      setSpeed(1600.0);
      setToolWear(20.0);
      setPressure(32.0);
    } else if (preset === 'thermal') {
      setTemperature(94.5);
      setVibration(4.5);
      setTorque(50.0);
      setSpeed(1900.0);
      setToolWear(45.0);
      setPressure(38.0);
    } else if (preset === 'bearing') {
      setTemperature(82.0);
      setVibration(7.6);
      setTorque(58.0);
      setSpeed(2100.0);
      setToolWear(65.0);
      setPressure(42.0);
    } else if (preset === 'toolwear') {
      setTemperature(76.0);
      setVibration(5.2);
      setTorque(62.0);
      setSpeed(1450.0);
      setToolWear(92.0);
      setPressure(44.0);
    }
  };

  useEffect(() => {
    loadFleet();
    runDiagnosis();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Modules 5 & 6 · Machinery Health & Diagnostics
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
            <Wrench className="w-7 h-7 text-blue-600" />
            Predictive Maintenance & Root-Cause Failure Diagnostics
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Combines FactoryMind AI (production optimization) and Previsio (AI4I telemetry physical failure mechanics).
          </p>
        </div>

        <button
          onClick={loadFleet}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm transition-colors"
        >
          <RotateCw className="w-4 h-4" />
          Refresh Fleet Telemetry
        </button>
      </div>

      {/* Fleet Live Status Grid */}
      <div>
        <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Active Equipment Health Fleet
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {fleet.map((machine) => (
            <div
              key={machine.id}
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-400 transition-colors"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-semibold text-gray-400">{machine.id}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    machine.status === 'Healthy'
                      ? 'bg-emerald-100 text-emerald-700'
                      : machine.status === 'Warning'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {machine.status}
                </span>
              </div>
              <p className="font-semibold text-gray-900 text-sm mt-1 truncate">{machine.name}</p>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Temp:</span>
                  <span className="font-mono font-medium text-gray-800">{machine.temperature}°C</span>
                </div>
                <div className="flex justify-between">
                  <span>Vibration:</span>
                  <span className="font-mono font-medium text-gray-800">{machine.vibration} mm/s</span>
                </div>
                <div className="flex justify-between">
                  <span>Tool Wear:</span>
                  <span className="font-mono font-medium text-gray-800">{machine.tool_wear}%</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 flex justify-between items-center text-xs">
                <span className="text-gray-400 font-medium">Health:</span>
                <span className="font-bold text-gray-900 font-mono">{machine.health}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Telemetry Diagnostics Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-600" />
              Sensor Workbench
            </h3>
          </div>

          {/* Quick Presets */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Scenario Presets
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => applyPreset('optimal')}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer text-center"
              >
                Optimal
              </button>
              <button
                onClick={() => applyPreset('thermal')}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer text-center"
              >
                Thermal Stress
              </button>
              <button
                onClick={() => applyPreset('bearing')}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer text-center"
              >
                Bearing Wear
              </button>
              <button
                onClick={() => applyPreset('toolwear')}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer text-center"
              >
                High Tool Wear
              </button>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>Temperature (°C):</span>
                <span className="font-mono font-bold text-blue-600">{temperature}°C</span>
              </div>
              <input
                type="range"
                min="40"
                max="110"
                step="0.5"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>Vibration (mm/s):</span>
                <span className="font-mono font-bold text-blue-600">{vibration} mm/s</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.1"
                value={vibration}
                onChange={(e) => setVibration(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>Torque (Nm):</span>
                <span className="font-mono font-bold text-blue-600">{torque} Nm</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="1"
                value={torque}
                onChange={(e) => setTorque(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>Spindle Speed (RPM):</span>
                <span className="font-mono font-bold text-blue-600">{speed} RPM</span>
              </div>
              <input
                type="range"
                min="800"
                max="3000"
                step="50"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                <span>Tool Wear (%):</span>
                <span className="font-mono font-bold text-blue-600">{toolWear}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={toolWear}
                onChange={(e) => setToolWear(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={runDiagnosis}
            disabled={diagnosing}
            className="w-full py-2.5 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            {diagnosing ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                Computing ML Diagnostics...
              </>
            ) : (
              <>
                <Gauge className="w-4 h-4" />
                Diagnose Telemetry
              </>
            )}
          </button>
        </div>

        {/* Diagnosis Results Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">Failure Risk & Root Cause Diagnosis</h3>
                <p className="text-xs text-gray-500">Multi-layer ML inference + heuristic physical boundary validation</p>
              </div>
              {diagnosis && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    diagnosis.status === 'Healthy'
                      ? 'bg-emerald-100 text-emerald-800'
                      : diagnosis.status === 'Warning'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {diagnosis.status.toUpperCase()} STATUS
                </span>
              )}
            </div>

            {diagnosis ? (
              <div className="space-y-6">
                {/* Score Meters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Machine Health Score</p>
                    <p className="text-3xl font-extrabold text-gray-900 mt-1 font-mono">
                      {diagnosis.health_score} / 100
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2.5 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          diagnosis.health_score >= 70
                            ? 'bg-emerald-500'
                            : diagnosis.health_score >= 45
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${diagnosis.health_score}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Failure Probability</p>
                    <p className="text-3xl font-extrabold text-gray-900 mt-1 font-mono">
                      {(diagnosis.failure_probability * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Classification: <strong className="text-gray-800">{diagnosis.prediction}</strong>
                    </p>
                  </div>
                </div>

                {/* Root Cause Analysis */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Probable Root Cause
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {diagnosis.root_cause_analysis.probable_root_cause}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {diagnosis.root_cause_analysis.detected_issues.map((issue, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white border border-slate-300 text-slate-700"
                      >
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Prescriptive Maintenance Actions
                  </p>
                  {diagnosis.recommendations.length > 0 ? (
                    <div className="space-y-2">
                      {diagnosis.recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg border border-gray-200 bg-white flex items-start gap-3 shadow-xs"
                        >
                          <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                            rec.severity === 'HIGH' ? 'text-rose-500' : 'text-amber-500'
                          }`} />
                          <div>
                            <p className="text-xs font-bold text-gray-900">{rec.recommended_action}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{rec.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      All telemetry within safe parameters. No corrective maintenance required.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictiveMaintenanceView;
