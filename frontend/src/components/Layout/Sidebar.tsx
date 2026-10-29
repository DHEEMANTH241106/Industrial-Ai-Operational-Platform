import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Video, 
  AlertTriangle, 
  Camera, 
  BarChart3, 
  Settings, 
  LogOut, 
  User as UserIcon,
  LogIn,
  Scan,
  Car,
  Zap,
  Wrench,
  Plane
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const safetyItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/monitoring', label: 'Live Monitoring', icon: Video },
    { to: '/incidents', label: 'Incidents & Alerts', icon: AlertTriangle },
    { to: '/cameras', label: 'Cameras & Zones', icon: Camera },
    { to: '/analytics', label: 'Safety Analytics', icon: BarChart3 },
  ];

  const teamModules = [
    { to: '/defect-vision', label: 'Steel Defect Vision', icon: Scan, tag: 'YOLOv8' },
    { to: '/car-fault', label: 'Vehicle Fault Diagnosis', icon: Car, tag: 'OBD-II' },
    { to: '/aegis-burn', label: 'Semiconductor Burn-In', icon: Zap, tag: 'Silicon' },
    { to: '/predictive-maintenance', label: 'Predictive Maintenance', icon: Wrench, tag: 'Sensors' },
    { to: '/aeroguard', label: 'AeroGuard Engine RUL', icon: Plane, tag: 'CMAPSS' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full justify-between">
      <nav className="flex-1 py-5 px-3 space-y-6 overflow-y-auto">
        {/* Safety Monitoring Section */}
        <div>
          <p className="px-3 text-[11px] font-bold tracking-wider uppercase text-gray-400 mb-2">
            Safety & Computer Vision
          </p>
          <div className="space-y-1">
            {safetyItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-cyan-50 text-cyan-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Industrial AI Team Modules */}
        <div>
          <p className="px-3 text-[11px] font-bold tracking-wider uppercase text-gray-400 mb-2">
            Industrial AI Suite
          </p>
          <div className="space-y-1">
            {teamModules.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <div className="flex items-center gap-3 truncate">
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                  {item.tag}
                </span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* System Administration */}
        <div>
          <p className="px-3 text-[11px] font-bold tracking-wider uppercase text-gray-400 mb-2">
            System
          </p>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-cyan-50 text-cyan-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Settings className="w-4 h-4 shrink-0" />
            Administration
          </NavLink>
        </div>
      </nav>

      {/* Auth user footer */}
      <div className="p-3.5 border-t border-gray-100 bg-gray-50/50">
        {isAuthenticated && user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-xs shrink-0">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-gray-800 truncate">{user.username}</p>
                <p className="text-[11px] text-gray-500 capitalize truncate">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
