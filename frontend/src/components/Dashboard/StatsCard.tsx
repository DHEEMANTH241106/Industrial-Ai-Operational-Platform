import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'cyan' | 'red' | 'green' | 'yellow';
  trend?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color = 'cyan', trend }) => {
  const colorClasses = {
    cyan: 'bg-cyan-100 text-cyan-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
  };

  return (
    <div className="card flex items-center p-6">
      <div className={`p-4 rounded-full ${colorClasses[color]} mr-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-500">{title}</h4>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {trend && <div className="text-sm text-gray-500 mt-1">{trend}</div>}
      </div>
    </div>
  );
};

export default StatsCard;
