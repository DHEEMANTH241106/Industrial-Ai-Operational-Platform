import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsApi } from '../../services/api';

const IncidentTrendChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const res = await analyticsApi.getTrends({ days: 7 });
        const chartData = res.data.dates.map((date: string, index: number) => ({
          date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          Critical: res.data.critical[index] || 0,
          High: res.data.high[index] || 0,
          Medium: res.data.medium[index] || 0,
          Low: res.data.low[index] || 0,
        }));
        setData(chartData);
      } catch (err) {
        console.error("Failed to fetch trends", err);
      }
    };
    fetchTrends();
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} />
        <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip 
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        />
        <Area type="monotone" dataKey="Critical" stroke="#ef4444" fillOpacity={1} fill="url(#colorCritical)" />
        <Area type="monotone" dataKey="High" stroke="#f97316" fillOpacity={1} fill="url(#colorHigh)" />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default IncidentTrendChart;
