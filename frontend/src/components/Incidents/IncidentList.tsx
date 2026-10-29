import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { incidentsApi } from '../../services/api';
import { Incident } from '../../types';
import { Filter, Search, Download } from 'lucide-react';
import { format } from 'date-fns';

const IncidentList = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await incidentsApi.list();
      setIncidents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Incident Management</h2>
        <button className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="card p-4 flex gap-4 items-center bg-gray-50">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
          <input type="text" placeholder="Search incidents..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-cyan-500" />
        </div>
        <select className="border border-gray-300 rounded-lg p-2 bg-white">
          <option>All Severities</option>
          <option>Critical</option>
          <option>High</option>
        </select>
        <select className="border border-gray-300 rounded-lg p-2 bg-white">
          <option>All Statuses</option>
          <option>Open</option>
          <option>Resolved</option>
        </select>
        <button className="btn-secondary p-2"><Filter className="w-5 h-5" /></button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-medium text-gray-600">ID</th>
                <th className="p-4 font-medium text-gray-600">Type</th>
                <th className="p-4 font-medium text-gray-600">Severity</th>
                <th className="p-4 font-medium text-gray-600">Status</th>
                <th className="p-4 font-medium text-gray-600">Time</th>
                <th className="p-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading incidents...</td></tr>
              ) : incidents.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No incidents found.</td></tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/incidents/${inc.id}`)}>
                    <td className="p-4 text-sm font-medium text-gray-900">#{inc.id}</td>
                    <td className="p-4 text-sm font-medium">
                      {inc.violation_type === 'missing_mask' ? '😷 Missing Face Mask' :
                       inc.violation_type === 'missing_gloves' ? '🧤 Missing Sterile Gloves' :
                       inc.violation_type === 'missing_helmet' ? '⛑️ Missing Hardhat' :
                       inc.violation_type === 'missing_vest' ? '🦺 Missing Safety Vest' :
                       inc.violation_type === 'restricted_zone' ? '⚠️ Restricted Zone' :
                       inc.violation_type.replace('_', ' ')}
                    </td>
                    <td className="p-4"><span className={`badge badge-${inc.severity.toLowerCase()}`}>{inc.severity}</span></td>
                    <td className="p-4"><span className={`badge status-${inc.status.toLowerCase()}`}>{inc.status.replace('_', ' ')}</span></td>
                    <td className="p-4 text-sm text-gray-500">{format(new Date(inc.first_seen), 'MMM d, HH:mm:ss')}</td>
                    <td className="p-4 text-sm text-cyan-600 font-medium hover:text-cyan-800">View</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IncidentList;
