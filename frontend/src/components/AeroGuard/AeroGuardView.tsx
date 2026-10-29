import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plane,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Activity,
  BarChart2,
  TrendingDown,
  Cpu,
  ExternalLink,
  ChevronRight,
  Shield,
  Clock,
  Zap,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface EngineFleetItem {
  engine_id: number;
  engine_label: string;
  current_cycle: number;
  predicted_rul: number;
  health_score: number;
  alert_tier: 'CRITICAL' | 'WARNING' | 'NORMAL';
  failure_probability_30_cycles: number;
  op_cluster: number;
}

interface FleetSummary {
  total_engines: number;
  critical: number;
  warning: number;
  normal: number;
  average_health_score: number;
  fleet_readiness_pct: number;
}

interface FleetData {
  fleet: EngineFleetItem[];
  summary: FleetSummary;
}

interface RULPrediction {
  engine_id: number;
  current_cycle: number;
  predicted_rul: number;
  health_score: number;
  alert_tier: 'CRITICAL' | 'WARNING' | 'NORMAL';
  alert_color: string;
  failure_probability_30_cycles: number;
  recommendation: string;
  op_cluster: number;
  top_contributing_features: string[];
  sensor_snapshot: Record<string, number>;
  model_used: string;
}

interface ModelBenchmark {
  model: string;
  rmse: number;
  mae: number;
  r2: number;
}

interface MetricsData {
  dataset: string;
  training_engines: number;
  test_engines: number;
  sensors_used: number;
  best_model: string;
  benchmarks: ModelBenchmark[];
  shap_top_features: Array<{ feature: string; importance: number }>;
  rul_formulation: string;
}

interface DegradationPoint {
  cycle: number;
  predicted_rul: number;
  health_score: number;
  alert_tier: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const alertStyles = {
  CRITICAL: {
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700',
    bar: 'bg-rose-500',
    ring: 'ring-rose-200',
  },
  WARNING: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    bar: 'bg-amber-400',
    ring: 'ring-amber-200',
  },
  NORMAL: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-500',
    ring: 'ring-emerald-200',
  },
};

const HealthBar: React.FC<{ score: number; alert: 'CRITICAL' | 'WARNING' | 'NORMAL' }> = ({
  score,
  alert,
}) => (
  <div className="w-full bg-gray-100 rounded-full h-1.5">
    <div
      className={`h-1.5 rounded-full transition-all ${alertStyles[alert].bar}`}
      style={{ width: `${score}%` }}
    />
  </div>
);

const AlertBadge: React.FC<{ tier: 'CRITICAL' | 'WARNING' | 'NORMAL' }> = ({ tier }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${alertStyles[tier].badge}`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${alertStyles[tier].dot}`} />
    {tier}
  </span>
);

// ── Main Component ────────────────────────────────────────────────────────────

const AeroGuardView: React.FC = () => {
  const [fleetData, setFleetData] = useState<FleetData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loadingFleet, setLoadingFleet] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Prediction form
  const [engineId, setEngineId] = useState(7);
  const [currentCycle, setCurrentCycle] = useState(160);
  const [opSetting3, setOpSetting3] = useState(60);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<RULPrediction | null>(null);

  // Degradation curve
  const [degCurve, setDegCurve] = useState<DegradationPoint[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<number | null>(null);
  const [loadingCurve, setLoadingCurve] = useState(false);

  const [activeTab, setActiveTab] = useState<'fleet' | 'predict' | 'benchmarks'>('fleet');

  useEffect(() => {
    loadFleet();
    loadMetrics();
  }, []);

  const loadFleet = async () => {
    try {
      setLoadingFleet(true);
      const res = await axios.get<FleetData>('/api/aeroguard/fleet');
      setFleetData(res.data);
    } catch {
      // Use mock data if backend unavailable
      setFleetData(null);
    } finally {
      setLoadingFleet(false);
    }
  };

  const loadMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const res = await axios.get<MetricsData>('/api/aeroguard/metrics');
      setMetrics(res.data);
    } catch {
      setMetrics(null);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const runPrediction = async () => {
    try {
      setPredicting(true);
      const res = await axios.post<RULPrediction>('/api/aeroguard/predict', {
        engine_id: engineId,
        current_cycle: currentCycle,
        op_setting_1: 0.0,
        op_setting_2: 0.0,
        op_setting_3: opSetting3,
      });
      setPrediction(res.data);
    } catch (err) {
      console.error('Prediction failed', err);
    } finally {
      setPredicting(false);
    }
  };

  const loadDegradationCurve = async (eid: number) => {
    try {
      setLoadingCurve(true);
      setSelectedEngine(eid);
      const res = await axios.get<{ engine_id: number; curve: DegradationPoint[] }>(
        `/api/aeroguard/degradation/${eid}`
      );
      setDegCurve(res.data.curve);
    } catch {
      setDegCurve([]);
    } finally {
      setLoadingCurve(false);
    }
  };

  const summary = fleetData?.summary;
  const fleet = fleetData?.fleet ?? [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
              Module 6 · Aerospace Predictive Maintenance
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
              NASA CMAPSS FD001
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1.5 flex items-center gap-2">
            <Plane className="w-7 h-7 text-sky-600" />
            AeroGuard AI · Aircraft Engine Health Intelligence
          </h1>
          <p className="text-gray-500 text-sm mt-1 max-w-2xl">
            End-to-end Remaining Useful Life (RUL) prediction for turbofan engines using rolling
            temporal features, XGBoost regression, and SHAP explainability on the NASA CMAPSS
            dataset.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href="https://aeroguard-mlai.streamlit.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Live Streamlit App
          </a>
          <button
            onClick={loadFleet}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Fleet
          </button>
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Total Engines',
            value: summary?.total_engines ?? '–',
            sub: 'active fleet',
            icon: Plane,
            color: 'text-sky-600',
            bg: 'bg-sky-50',
          },
          {
            label: 'Fleet Readiness',
            value: summary ? `${summary.fleet_readiness_pct}%` : '–',
            sub: 'operational',
            icon: Shield,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Avg Health',
            value: summary ? `${summary.average_health_score}` : '–',
            sub: 'score / 100',
            icon: Activity,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
          },
          {
            label: 'CRITICAL',
            value: summary?.critical ?? '–',
            sub: 'grounded / urgent',
            icon: AlertTriangle,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
          },
          {
            label: 'WARNING',
            value: summary?.warning ?? '–',
            sub: 'schedule soon',
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            label: 'NORMAL',
            value: summary?.normal ?? '–',
            sub: 'flight-ready',
            icon: CheckCircle,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
          >
            <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 uppercase font-semibold tracking-wide">
              {card.label}
            </p>
            <p className="text-[10px] text-gray-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['fleet', 'predict', 'benchmarks'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize cursor-pointer ${
              activeTab === tab
                ? 'bg-white border border-b-white border-gray-200 text-sky-700 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'fleet' && '🛩  Fleet Monitor'}
            {tab === 'predict' && '🔬  RUL Predictor'}
            {tab === 'benchmarks' && '📊  Model Benchmarks'}
          </button>
        ))}
      </div>

      {/* ── Tab: Fleet Monitor ─────────────────────────────────────────────── */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          {loadingFleet ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-600 mb-3" />
              <p className="text-gray-600 font-medium">Loading Fleet Telemetry…</p>
            </div>
          ) : fleet.length > 0 ? (
            <>
              {/* Degradation Curve Viewer */}
              {selectedEngine !== null && (
                <div className="bg-slate-900 rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-sky-400" />
                      <span className="font-semibold">
                        ENG-{String(selectedEngine).padStart(3, '0')} — Lifecycle Degradation Curve
                      </span>
                    </div>
                    {loadingCurve && (
                      <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                    )}
                  </div>
                  {degCurve.length > 0 && (
                    <div className="relative h-32">
                      {/* Mini bar chart */}
                      <div className="flex items-end gap-0.5 h-full">
                        {degCurve.map((pt, i) => {
                          const heightPct = Math.max(4, (pt.predicted_rul / 125) * 100);
                          const color =
                            pt.alert_tier === 'CRITICAL'
                              ? 'bg-rose-500'
                              : pt.alert_tier === 'WARNING'
                              ? 'bg-amber-400'
                              : 'bg-emerald-500';
                          return (
                            <div
                              key={i}
                              title={`Cycle ${pt.cycle}: RUL=${pt.predicted_rul}`}
                              className={`flex-1 rounded-sm ${color} opacity-80 hover:opacity-100 transition-opacity`}
                              style={{ height: `${heightPct}%` }}
                            />
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-2">
                        <span>Cycle {degCurve[0]?.cycle}</span>
                        <span className="text-slate-300 font-medium">Predicted RUL over lifecycle</span>
                        <span>Cycle {degCurve[degCurve.length - 1]?.cycle}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fleet Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Plane className="w-4 h-4 text-sky-600" />
                    Engine Fleet — {fleet.length} Units
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Click any row to view the lifecycle degradation curve
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="py-3 px-4">Engine</th>
                        <th className="py-3 px-4">Current Cycle</th>
                        <th className="py-3 px-4">Predicted RUL</th>
                        <th className="py-3 px-4 w-40">Health Score</th>
                        <th className="py-3 px-4">Fail P(30 cyc)</th>
                        <th className="py-3 px-4">Op Cluster</th>
                        <th className="py-3 px-4">Alert</th>
                        <th className="py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fleet.map((eng) => (
                        <tr
                          key={eng.engine_id}
                          onClick={() => loadDegradationCurve(eng.engine_id)}
                          className={`hover:bg-sky-50/50 transition-colors cursor-pointer ${
                            selectedEngine === eng.engine_id ? 'bg-sky-50' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-gray-900">
                            {eng.engine_label}
                          </td>
                          <td className="py-3 px-4 font-mono">{eng.current_cycle}</td>
                          <td className="py-3 px-4 font-mono font-semibold">
                            <span
                              className={
                                eng.predicted_rul <= 20
                                  ? 'text-rose-600'
                                  : eng.predicted_rul <= 50
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                              }
                            >
                              {eng.predicted_rul} cyc
                            </span>
                          </td>
                          <td className="py-3 px-4 w-40">
                            <div className="flex items-center gap-2">
                              <HealthBar score={eng.health_score} alert={eng.alert_tier} />
                              <span className="text-[11px] font-semibold text-gray-600 w-8 shrink-0">
                                {eng.health_score}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {(eng.failure_probability_30_cycles * 100).toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-gray-500">
                            Cluster {eng.op_cluster}
                          </td>
                          <td className="py-3 px-4">
                            <AlertBadge tier={eng.alert_tier} />
                          </td>
                          <td className="py-3 px-4 text-gray-400">
                            <ChevronRight className="w-4 h-4" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-gray-500">
              <Plane className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Fleet data unavailable</p>
              <p className="text-xs mt-1">Ensure the backend is running.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: RUL Predictor ─────────────────────────────────────────────── */}
      {activeTab === 'predict' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input form */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-sky-600" />
                Engine RUL Predictor
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Simulate XGBoost inference on NASA CMAPSS sensor streams
              </p>
            </div>

            <div className="space-y-4">
              {/* Engine ID */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Engine Unit ID (1–100)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={engineId}
                  onChange={(e) => setEngineId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              {/* Current Cycle */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Current Cycle: <span className="text-sky-700 font-bold">{currentCycle}</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={350}
                  value={currentCycle}
                  onChange={(e) => setCurrentCycle(Number(e.target.value))}
                  className="w-full accent-sky-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>10 (early life)</span>
                  <span>350 (near failure)</span>
                </div>
              </div>

              {/* Op Setting 3 (TRA proxy) */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Operational Setting 3 (TRA %):{' '}
                  <span className="text-sky-700 font-bold">{opSetting3}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={opSetting3}
                  onChange={(e) => setOpSetting3(Number(e.target.value))}
                  className="w-full accent-sky-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>0 (ground ops)</span>
                  <span>100 (high altitude)</span>
                </div>
              </div>

              {/* Presets */}
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Load Preset
                </p>
                <div className="flex gap-2">
                  {[
                    { label: '✅ Healthy', eid: 1, cycle: 50, op: 100 },
                    { label: '⚠️ Warning', eid: 7, cycle: 160, op: 60 },
                    { label: '🚨 Critical', eid: 12, cycle: 240, op: 25 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => {
                        setEngineId(p.eid);
                        setCurrentCycle(p.cycle);
                        setOpSetting3(p.op);
                      }}
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium transition-colors cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={runPrediction}
              disabled={predicting}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              {predicting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running XGBoost Inference…
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  Predict Remaining Useful Life
                </>
              )}
            </button>
          </div>

          {/* Prediction result */}
          <div className="space-y-4">
            {prediction ? (
              <>
                {/* Alert banner */}
                <div
                  className={`rounded-xl p-5 border-2 ${alertStyles[prediction.alert_tier].bg} ${alertStyles[prediction.alert_tier].border}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <AlertBadge tier={prediction.alert_tier} />
                    <span className="text-xs text-gray-500 font-mono">
                      ENG-{String(prediction.engine_id).padStart(3, '0')} · Cycle{' '}
                      {prediction.current_cycle}
                    </span>
                  </div>
                  <p
                    className={`text-4xl font-black ${alertStyles[prediction.alert_tier].text} leading-none`}
                  >
                    {prediction.predicted_rul}
                    <span className="text-base font-semibold ml-1">cycles RUL</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-2">{prediction.recommendation}</p>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Health Score
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {prediction.health_score}
                      <span className="text-sm font-normal text-gray-400">/100</span>
                    </p>
                    <HealthBar score={prediction.health_score} alert={prediction.alert_tier} />
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Fail P(30 cyc)
                    </p>
                    <p className="text-2xl font-bold text-rose-600 mt-1">
                      {(prediction.failure_probability_30_cycles * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Probability of failure within next 30 cycles
                    </p>
                  </div>
                </div>

                {/* SHAP features */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-sky-600" />
                    Top Contributing Sensors (SHAP)
                  </p>
                  <ul className="space-y-1.5">
                    {prediction.top_contributing_features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {i + 1}
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Model info */}
                <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-sky-400" />
                    <span className="text-sm font-medium">{prediction.model_used}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Op Cluster {prediction.op_cluster}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                <Plane className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">Configure engine parameters</p>
                <p className="text-xs mt-1">and click Predict to see RUL results</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Model Benchmarks ──────────────────────────────────────────── */}
      {activeTab === 'benchmarks' && (
        <div className="space-y-5">
          {loadingMetrics ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-3" />
              <p className="text-gray-500">Loading metrics…</p>
            </div>
          ) : metrics ? (
            <>
              {/* Dataset info banner */}
              <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">
                    Dataset
                  </p>
                  <p className="text-lg font-bold">{metrics.dataset}</p>
                  <p className="text-xs text-slate-400 mt-1">{metrics.rul_formulation}</p>
                </div>
                <div className="flex gap-8 text-xs">
                  {[
                    { label: 'Training Engines', value: metrics.training_engines },
                    { label: 'Test Engines', value: metrics.test_engines },
                    { label: 'Active Sensors', value: metrics.sensors_used },
                    { label: 'Best Model', value: metrics.best_model },
                  ].map((m) => (
                    <div key={m.label}>
                      <p className="text-slate-400">{m.label}</p>
                      <p className="font-bold text-white text-base">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Benchmark table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-sky-600" />
                    Model Performance Comparison
                  </p>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Model</th>
                      <th className="py-3 px-4">RMSE ↓</th>
                      <th className="py-3 px-4">MAE ↓</th>
                      <th className="py-3 px-4">R² ↑</th>
                      <th className="py-3 px-4">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {metrics.benchmarks.map((bm) => {
                      const isBest = bm.model === metrics.best_model;
                      const barWidth = (bm.r2 / 1.0) * 100;
                      return (
                        <tr
                          key={bm.model}
                          className={isBest ? 'bg-sky-50' : 'hover:bg-gray-50'}
                        >
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {isBest && (
                              <span className="mr-1.5 text-[10px] font-bold px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded-full">
                                BEST
                              </span>
                            )}
                            {bm.model}
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-700">{bm.rmse}</td>
                          <td className="py-3 px-4 font-mono text-gray-700">{bm.mae}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-sky-700">
                            {bm.r2}
                          </td>
                          <td className="py-3 px-4 w-40">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${isBest ? 'bg-sky-500' : 'bg-gray-400'}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* SHAP top features */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <p className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-600" />
                  SHAP Feature Importance — XGBoost Top-10
                </p>
                <div className="space-y-2.5">
                  {metrics.shap_top_features.map((f, i) => (
                    <div key={f.feature} className="flex items-center gap-3">
                      <span className="text-[11px] text-gray-400 w-4 text-right">{i + 1}</span>
                      <span className="text-xs font-mono text-gray-700 w-44 truncate">{f.feature}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-sky-500"
                          style={{ width: `${(f.importance / 0.2) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-sky-700 w-10 text-right">
                        {(f.importance * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-gray-400">
              <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-25" />
              <p>Benchmark data unavailable. Ensure the backend is running.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Footer attribution ─────────────────────────────────────────────── */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span>AeroGuard AI · NASA CMAPSS FD001 · XGBoost + SHAP Explainability</span>
        <a
          href="https://aeroguard-mlai.streamlit.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-sky-600 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open Streamlit App
        </a>
      </div>
    </div>
  );
};

export default AeroGuardView;
