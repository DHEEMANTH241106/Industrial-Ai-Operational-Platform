import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

const AnalyticsDashboard = () => {
  // Mock data for charts since we don't have full backend integration yet
  const typeData = [
    { name: 'No Helmet', count: 45 },
    { name: 'No Vest', count: 32 },
    { name: 'No Mask', count: 28 },
    { name: 'No Gloves', count: 19 },
    { name: 'Restricted Area', count: 18 },
  ];

  const severityData = [
    { name: 'Critical', value: 15, color: '#ef4444' },
    { name: 'High', value: 35, color: '#f97316' },
    { name: 'Medium', value: 45, color: '#eab308' },
    { name: 'Low', value: 12, color: '#22c55e' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Analytics & Reports</h2>
        <button className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center p-6">
          <div className="text-sm text-gray-500 mb-1">Total Incidents (30d)</div>
          <div className="text-3xl font-bold text-gray-900">107</div>
          <div className="text-sm text-green-600 mt-2">↓ 12% from last month</div>
        </div>
        <div className="card text-center p-6">
          <div className="text-sm text-gray-500 mb-1">Avg Response Time</div>
          <div className="text-3xl font-bold text-gray-900">14m</div>
          <div className="text-sm text-green-600 mt-2">↓ 2m from last month</div>
        </div>
        <div className="card text-center p-6">
          <div className="text-sm text-gray-500 mb-1">False Positive Rate</div>
          <div className="text-3xl font-bold text-gray-900">8.4%</div>
          <div className="text-sm text-red-600 mt-2">↑ 1.2% from last month</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-6">Incidents by Type</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-6">Incidents by Severity</h3>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
