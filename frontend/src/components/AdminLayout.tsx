import React from 'react';
import { User, ROLE_TIERS, hasRole } from '../services/api';
import {
  LayoutDashboard,
  Calendar,
  ShieldCheck,
  LogOut,
  ExternalLink,
} from 'lucide-react';

export type AdminNav = 'dashboard' | 'events' | 'audit';

interface AdminLayoutProps {
  user: User;
  activeNav: AdminNav;
  onNavigate: (nav: AdminNav) => void;
  onLogout: () => void;
  onSwitchToPublic: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { key: AdminNav; label: string; icon: typeof LayoutDashboard; allow: readonly string[] }[] = [
  { key: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard, allow: ROLE_TIERS.staff },
  { key: 'events', label: 'Events & Operations', icon: Calendar, allow: ROLE_TIERS.staff },
  { key: 'audit', label: 'System Audit Trails', icon: ShieldCheck, allow: ROLE_TIERS.governance },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  user,
  activeNav,
  onNavigate,
  onLogout,
  onSwitchToPublic,
  children,
}) => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-rhb-navy text-slate-200 border-r border-white/10 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Logo */}
          <div className="px-5 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-xl px-3 py-2 flex items-center shadow-md shrink-0">
                <img src="/rhb-logo.png" alt="RHB Bank" className="h-6 w-auto" />
              </div>
              <div className="leading-tight">
                <span className="block text-sm font-bold text-white tracking-tight">Events</span>
                <span className="block text-[10px] text-sky-300 font-semibold tracking-[0.12em] whitespace-nowrap">
                  INTERNAL ADMIN
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links — filtered by the signed-in user's role */}
          <nav className="p-4 space-y-1.5 text-xs font-semibold">
            {NAV_ITEMS.filter((item) => hasRole(user.role, item.allow)).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                    activeNav === item.key
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer User Profile & Actions */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <button
            onClick={onSwitchToPublic}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 border border-white/10 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-indigo-300" />
              <span>Staff Events Portal</span>
            </span>
          </button>

          <div className="flex items-center justify-between px-2 pt-2">
            <div className="truncate pr-2">
              <div className="text-xs font-bold text-white truncate">{user.name}</div>
              <div className="text-[10px] text-indigo-300 uppercase font-mono">{user.role.replace('_', ' ')}</div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </main>
    </div>
  );
};
