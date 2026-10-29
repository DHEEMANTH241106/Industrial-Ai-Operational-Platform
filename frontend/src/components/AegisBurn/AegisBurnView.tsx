import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  ShieldCheck, 
  RefreshCw, 
  Filter, 
  Cpu, 
  BarChart2, 
  TrendingUp 
} from 'lucide-react';

interface ComponentResult {
  Component_ID: string;
  Wafer_Batch: string;
  Part_Type: string;
  Anomaly_Score: number;
  Risk_Level: 'Low' | 'Medium' | 'High';
  Predicted_168h_Iddq: number;
  Predicted_Fail_168h: number;
  Recommendation?: string;
}

interface AegisData {
  analysis_id: string;
  timestamp: string;
  dashboard: {
    total_components: number;
    high_risk_count: number;
    med_risk_count: number;
    low_risk_count: number;
    avg_anomaly_score: number;
  };
  model_metrics: {
    r2_score: number;
    mae: number;
    rmse: number;
    trained_samples: number;
  };
  results: ComponentResult[];
}

export const AegisBurnView: React.FC = () => {
  const [data, setData] = useState<AegisData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get<AegisData>('/api/aegis-burn/demo');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load AegisBurn data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      const res = await axios.post<AegisData>('/api/aegis-burn/analyze', {});
      setData(res.data);
    } catch (err) {
      console.error('Failed to run analysis', err);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredResults = data?.results.filter((c) => {
    const matchesFilter = filterRisk === 'ALL' || c.Risk_Level.toUpperCase() === filterRisk;
    const matchesSearch =
      c.Component_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.Wafer_Batch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.Part_Type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              Module 4 · Electronics & Silicon QA
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
            <Zap className="w-7 h-7 text-amber-500" />
            AegisBurn AI · Semiconductor Early-Burn-In Screening
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Predictive degradation analysis and unsupervised anomaly scoring for silicon ICs during thermal burn-in stress.
          </p>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer shadow-sm transition-colors"
        >
          {analyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running ML Screening...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Trigger Full 1000-DUT Batch
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-600 mb-3" />
          <p className="text-gray-600 font-medium">Loading AegisBurn Models & Telemetry...</p>
        </div>
      ) : data ? (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center text-gray-500 text-xs font-semibold uppercase">
                <span>Total DUTs Tested</span>
                <Cpu className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {data.dashboard.total_components.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">168-hour accelerated cycle</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center text-rose-600 text-xs font-semibold uppercase">
                <span>High Risk Outliers</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-bold text-rose-600 mt-2">
                {data.dashboard.high_risk_count}
              </p>
              <p className="text-xs text-rose-400 mt-1">Requires immediate rejection/re-test</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center text-amber-600 text-xs font-semibold uppercase">
                <span>Medium Risk (Marginal)</span>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-2">
                {data.dashboard.med_risk_count}
              </p>
              <p className="text-xs text-amber-400 mt-1">Under strict thermal monitoring</p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center text-emerald-600 text-xs font-semibold uppercase">
                <span>Nominal Pass Rate</span>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                {Math.round((data.dashboard.low_risk_count / data.dashboard.total_components) * 100)}%
              </p>
              <p className="text-xs text-emerald-500 mt-1">{data.dashboard.low_risk_count} passing units</p>
            </div>
          </div>

          {/* Model Health / Audit Banner */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Trained ML Degradation Model</p>
                <p className="text-xs text-slate-400">RandomForest Regressor + Isolation Forest Outlier Detector</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-slate-400">Model R²:</span>{' '}
                <span className="font-mono font-bold text-emerald-400">
                  {data.model_metrics.r2_score.toFixed(3)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Mean Abs Error:</span>{' '}
                <span className="font-mono font-bold text-cyan-400">
                  {data.model_metrics.mae.toFixed(3)} mA
                </span>
              </div>
              <div>
                <span className="text-slate-400">Training Samples:</span>{' '}
                <span className="font-mono font-bold text-white">
                  {data.model_metrics.trained_samples}
                </span>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <div className="flex gap-1.5">
                  {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setFilterRisk(r)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        filterRisk === r
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                placeholder="Search component ID, wafer, part..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
              />
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="py-3 px-4">Component ID</th>
                    <th className="py-3 px-4">Wafer Batch</th>
                    <th className="py-3 px-4">Part Type</th>
                    <th className="py-3 px-4">Anomaly Score</th>
                    <th className="py-3 px-4">Predicted 168h Iddq</th>
                    <th className="py-3 px-4">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResults.slice(0, 50).map((row) => (
                    <tr key={row.Component_ID} className="hover:bg-gray-50/75 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-gray-900">
                        {row.Component_ID}
                      </td>
                      <td className="py-3 px-4">{row.Wafer_Batch}</td>
                      <td className="py-3 px-4">{row.Part_Type}</td>
                      <td className="py-3 px-4 font-mono">
                        <span className={`font-semibold ${
                          row.Anomaly_Score > 60 ? 'text-rose-600' : 'text-gray-700'
                        }`}>
                          {row.Anomaly_Score.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{row.Predicted_168h_Iddq.toFixed(2)} mA</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            row.Risk_Level === 'High'
                              ? 'bg-rose-100 text-rose-700'
                              : row.Risk_Level === 'Medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {row.Risk_Level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500">
              Showing {Math.min(filteredResults.length, 50)} of {filteredResults.length} records
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default AegisBurnView;
