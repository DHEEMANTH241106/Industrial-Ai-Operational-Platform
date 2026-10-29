import React, { useState } from 'react';
import axios from 'axios';
import { Scan, Upload, AlertCircle, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';

interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: number[];
}

interface DefectResult {
  total_defects: number;
  detections: Detection[];
  counts: Record<string, number>;
  annotated_image: string;
}

export const DefectVisionView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0.25);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<DefectResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select an image first.');
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await axios.post<DefectResult>(
        `/api/defect-vision/detect?conf=${confidence}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to detect defects.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Module 2 · Quality Assurance
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
            <Scan className="w-7 h-7 text-cyan-600" />
            DefectVision · Steel Surface Defect Detection
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            YOLOv8 AI detection for manufacturing surface defects (crazing, inclusion, patches, pitted surfaces, scale, scratches).
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-600" />
            Upload Sample
          </h2>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-cyan-500 transition-colors cursor-pointer relative bg-gray-50/50">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center">
              <Upload className="w-10 h-10 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">
                {selectedFile ? selectedFile.name : 'Choose steel surface image'}
              </p>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG, BMP up to 20MB</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center text-sm font-medium text-gray-700 mb-1">
              <span>Confidence Threshold:</span>
              <span className="font-bold text-cyan-600">{Math.round(confidence * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.90"
              step="0.05"
              value={confidence}
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
              className="w-full accent-cyan-600 cursor-pointer"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !selectedFile}
            className={`w-full py-2.5 px-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 shadow-sm transition-all ${
              loading || !selectedFile
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-cyan-600 hover:bg-cyan-700 cursor-pointer'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyzing Surface...
              </>
            ) : (
              <>
                <Scan className="w-4 h-4" />
                Run Defect Detection
              </>
            )}
          </button>

          {/* Model information card */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800">Detectable Defect Classes:</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Crazing', 'Inclusion', 'Patches', 'Pitted Surface', 'Rolled-in Scale', 'Scratches'].map((name) => (
                <span key={name} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Inspection & Analysis</h2>
              {result && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    result.total_defects > 0
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {result.total_defects > 0 ? (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      {result.total_defects} Defect(s) Detected
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Surface Clear · No Defects
                    </>
                  )}
                </span>
              )}
            </div>

            {/* Display Area */}
            <div className="min-h-[340px] flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden border border-gray-800 relative">
              {result ? (
                <img
                  src={result.annotated_image}
                  alt="Defect Annotation"
                  className="max-h-[460px] w-auto object-contain mx-auto"
                />
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Original Preview"
                  className="max-h-[460px] w-auto object-contain mx-auto opacity-80"
                />
              ) : (
                <div className="text-center text-gray-400 p-8">
                  <Scan className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm font-medium">No image loaded</p>
                  <p className="text-xs text-gray-500 mt-1">Upload a steel specimen to inspect surface flaws</p>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown summary */}
          {result && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Defect Breakdown
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {Object.entries(result.counts).map(([name, count]) => (
                  <div key={name} className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-center">
                    <p className="text-xs text-gray-500 capitalize">{name.replace('_', ' ')}</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DefectVisionView;
