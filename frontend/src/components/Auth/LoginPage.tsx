import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Shield, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowRight, 
  Building2, 
  HardHat, 
  Sparkles,
  CheckCircle2,
  Scan,
  Car,
  Wrench,
  Zap,
  Cpu
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await login(username.trim(), password);
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      const message =
        err?.response?.data?.detail ||
        (err?.response?.status === 401
          ? 'Invalid username or password'
          : 'Unable to connect to the platform server. Please ensure the backend is running.');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    try {
      setIsSubmitting(true);
      setError(null);
      await login(user, pass);
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Quick login error:', err);
      setError(err?.response?.data?.detail || 'Login failed. Please check backend status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center p-4 sm:p-6 text-white select-none relative overflow-hidden">
      {/* Background ambient decorative glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Brand / Logo Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-b from-cyan-500/20 to-slate-800/80 border border-cyan-500/30 rounded-2xl shadow-lg shadow-cyan-950/50 mb-3 backdrop-blur-md">
            <Cpu className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            Industrial AI & Operations Platform
          </h1>
          <p className="text-xs text-cyan-400/90 font-semibold mt-1 tracking-wide">
            Unified Multi-Module Suite · Safety, Quality, Fleet & Machinery Intelligence
          </p>

          {/* Module Pill Tags */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
            {[
              { label: 'PPE Safety', icon: Shield },
              { label: 'DefectVision', icon: Scan },
              { label: 'Fleet OBD-II', icon: Car },
              { label: 'Burn-In QA', icon: Zap },
              { label: 'Predictive Maint.', icon: Wrench },
            ].map((mod) => (
              <span
                key={mod.label}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/80"
              >
                <mod.icon className="w-3 h-3 text-cyan-400" />
                {mod.label}
              </span>
            ))}
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">Platform Sign In</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your authorized credentials to access the unified operations suite
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-950/60 border border-rose-700/60 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or pharma_officer"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg text-sm text-white placeholder-slate-500 outline-none transition-all disabled:opacity-50"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg text-sm text-white placeholder-slate-500 outline-none transition-all disabled:opacity-50"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-md shadow-cyan-950 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Enter Operations Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Quick Demo Access Roles</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin123')}
                disabled={isSubmitting}
                className="w-full text-left p-3 rounded-lg border border-slate-700/70 bg-slate-800/40 hover:bg-slate-800/80 hover:border-cyan-500/70 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-cyan-950/60 border border-cyan-800 text-cyan-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                      Operations Director / System Admin
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Full access to all 5 AI modules + Administration
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      User: <code className="text-cyan-300 font-mono">admin</code> • Pass: <code className="text-cyan-300 font-mono">admin123</code>
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-cyan-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Log in <ArrowRight className="w-3 h-3" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('pharma_officer', 'pharma123')}
                disabled={isSubmitting}
                className="w-full text-left p-3 rounded-lg border border-slate-700/70 bg-slate-800/40 hover:bg-slate-800/80 hover:border-emerald-500/70 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                      Safety & Cleanroom QA Inspector
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Pharma Cleanroom tenant profile (Mask + Gloves)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      User: <code className="text-emerald-300 font-mono">pharma_officer</code> • Pass: <code className="text-emerald-300 font-mono">pharma123</code>
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-emerald-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                  Log in <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Security & System Info Footer */}
        <div className="mt-5 text-center text-xs text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            Unified Industrial AI Operations Platform
          </p>
          <p>© 2026 Integrated Engineering Team Project</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
