import React, { useState } from 'react';
import { apiClient, User } from '../../services/api';
import { Shield, KeyRound, UserCheck, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onCancel?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    const loginEmail = customEmail || email;
    const loginPass = customPass || password;

    if (!loginEmail || !loginPass) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.post('/auth/login', {
        email: loginEmail,
        password: loginPass,
      });

      localStorage.setItem('rhb_events_token', res.data.token);
      localStorage.setItem('rhb_events_user', JSON.stringify(res.data.user));
      onLoginSuccess(res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    handleLogin(undefined, demoEmail, 'password123');
  };

  return (
    <div className="min-h-screen bg-rhb-navy text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-white/10 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center px-5 py-3.5 rounded-2xl bg-white mb-3 shadow-lg">
            <img src="/rhb-logo.png" alt="RHB Bank" className="h-9 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Events Portal</h1>
          <p className="text-sm text-slate-400 mt-1">RHB Internal Events Administration</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@rhbgroup.com"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Admin</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Switcher */}
        <div className="mt-8 pt-6 border-t border-slate-700/60">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
            Quick Demo Accounts
          </p>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => selectDemoAccount('superadmin@rhbgroup.com')}
              className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-xs text-slate-200 border border-slate-600/50 transition-all"
            >
              <span className="flex items-center gap-2 font-medium text-indigo-300">
                <Shield className="w-3.5 h-3.5" /> Super Admin
              </span>
              <span className="text-slate-400">superadmin@rhbgroup.com</span>
            </button>

            <button
              onClick={() => selectDemoAccount('manager@rhbgroup.com')}
              className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-xs text-slate-200 border border-slate-600/50 transition-all"
            >
              <span className="flex items-center gap-2 font-medium text-emerald-300">
                <UserCheck className="w-3.5 h-3.5" /> Event Admin
              </span>
              <span className="text-slate-400">manager@rhbgroup.com</span>
            </button>

            <button
              onClick={() => selectDemoAccount('staff@rhbgroup.com')}
              className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-xs text-slate-200 border border-slate-600/50 transition-all"
            >
              <span className="flex items-center gap-2 font-medium text-amber-300">
                <KeyRound className="w-3.5 h-3.5" /> Check-In Staff
              </span>
              <span className="text-slate-400">staff@rhbgroup.com</span>
            </button>
          </div>
        </div>

        {onCancel && (
          <div className="text-center mt-6">
            <button
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              ← Back to Public Events
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
