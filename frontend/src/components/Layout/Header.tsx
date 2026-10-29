import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  User as UserIcon, 
  Building2, 
  LogIn, 
  LogOut, 
  ChevronDown, 
  Check, 
  Settings
} from 'lucide-react';
import { modelsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const { user, logout, login } = useAuth();
  const [modelReady, setModelReady] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    modelsApi
      .getStatus()
      .then((res) => setModelReady(res.data.is_ready))
      .catch(() => setModelReady(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowUserDropdown(false);
    logout();
    navigate('/login');
  };

  const handleSwitchTenant = async (username: string, pass: string) => {
    setShowSwitchModal(false);
    setShowUserDropdown(false);
    try {
      await login(username, pass);
      window.location.reload();
    } catch (err) {
      console.error('Failed to switch tenant:', err);
    }
  };

  const org = user?.organization;
  const isPharma = org?.industry_type === 'pharma' || org?.slug === 'pharma';

  return (
    <header className="bg-slate-900 text-white h-16 flex items-center justify-between px-6 shadow-md z-20 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <Shield className="text-cyan-400 w-8 h-8" />
        <div>
          <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">
            Industrial AI & Operations Platform
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-cyan-800">
              Unified Multi-Module Suite
            </span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Organization & Industry Badge */}
        {org && (
          <div
            onClick={() => setShowSwitchModal(true)}
            className="cursor-pointer bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-cyan-500 rounded-lg px-3 py-1.5 flex items-center gap-2.5 transition-all shadow-sm"
            title="Click to switch organization or tenant account"
          >
            <div
              className={`p-1.5 rounded-md ${
                isPharma
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                  : 'bg-amber-950 text-amber-400 border border-amber-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                {org.name}
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                {isPharma ? '💊 Pharma Cleanroom' : '🏭 Hardware & Heavy Ind.'}
              </div>
            </div>
          </div>
        )}

        {/* Model Status indicator */}
        <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/60">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              modelReady ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-xs text-slate-300 font-medium">
            {modelReady ? 'Local YOLOv8 Ready' : 'Model Offline'}
          </span>
        </div>

        {/* User profile & Auth Controls */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 border-l border-slate-700 pl-4 py-1 hover:opacity-90 transition-opacity cursor-pointer focus:outline-none"
            >
              <div className="bg-slate-800 p-2 rounded-full border border-slate-700 text-cyan-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-xs font-medium block text-slate-200">
                  {user.username}
                </span>
                <span className="text-[10px] text-slate-400 capitalize block">
                  {user.role?.replace('_', ' ') || 'viewer'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-sm">
                <div className="px-4 py-2 border-b border-slate-800">
                  <p className="text-xs text-slate-400">Signed in as</p>
                  <p className="text-sm font-semibold text-white truncate">{user.username}</p>
                  <p className="text-[11px] text-cyan-400 font-medium capitalize mt-0.5">
                    {user.role?.replace('_', ' ')} • {org?.name || 'No Organization'}
                  </p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowSwitchModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Switch Tenant Company</span>
                  </button>

                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate('/admin');
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Administration</span>
                    </button>
                  )}
                </div>

                <div className="border-t border-slate-800 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border-l border-slate-700 pl-4">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-sm shadow-cyan-900/50"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          </div>
        )}
      </div>

      {/* Switch Tenant / Company Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="text-cyan-400 w-5 h-5" /> Select Company Tenant
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Each company has separate cameras, isolated incident records, and custom PPE requirements.
                </p>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 my-4">
              {/* Option 1: Pharma */}
              <div
                onClick={() => handleSwitchTenant('pharma_officer', 'pharma123')}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isPharma
                    ? 'border-emerald-500 bg-emerald-950/40 shadow-md shadow-emerald-900/20'
                    : 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 items-center">
                    <span className="text-2xl">💊</span>
                    <div>
                      <div className="font-semibold text-emerald-400 flex items-center gap-2">
                        BioHealth Pharma Labs
                        {isPharma && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="text-xs text-slate-300 mt-1 flex flex-wrap gap-1.5 items-center">
                        <strong>Required PPE:</strong>{' '}
                        <span className="bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-emerald-700">
                          😷 Face Mask
                        </span>
                        <span className="bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-emerald-700">
                          🧤 Sterile Gloves
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        User: <code className="text-cyan-300">pharma_officer</code> • Sanitary cleanroom contamination checks
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Hardware & Heavy Fabrication */}
              <div
                onClick={() => handleSwitchTenant('admin', 'admin123')}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  !isPharma
                    ? 'border-amber-500 bg-amber-950/40 shadow-md shadow-amber-900/20'
                    : 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 items-center">
                    <span className="text-2xl">🏭</span>
                    <div>
                      <div className="font-semibold text-amber-400 flex items-center gap-2">
                        Titan Hardware & Fabrication
                        {!isPharma && <Check className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div className="text-xs text-slate-300 mt-1">
                        <strong>Required PPE:</strong>{' '}
                        <span className="bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-amber-700">
                          Hardhat Helmet
                        </span>{' '}
                        +{' '}
                        <span className="bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-amber-700">
                          Safety Vest
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        User: <code className="text-cyan-300">admin</code> • Industrial impact & visibility hazard checks
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Click a company above to instantly switch session and isolate detections.
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
