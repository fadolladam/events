import React from 'react';
import { NavLink, Outlet, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { ROLE_TIERS, hasRole, type EventItem } from '../services/api';
import { useAuth } from '../services/auth';
import { paths } from '../routes/paths';
import { EventWizardModal } from '../modules/admin/EventWizardModal';
import { BrandMark } from './BrandMark';
import { GlobalSearch } from './GlobalSearch';
import { LayoutDashboard, Calendar, CalendarDays, Users, UserCog, Settings, ShieldCheck, LogOut, ExternalLink } from 'lucide-react';

const NAV_ITEMS: { to: string; label: string; icon: typeof LayoutDashboard; allow: readonly string[] }[] = [
  { to: paths.dashboard(), label: 'Dashboard', icon: LayoutDashboard, allow: ROLE_TIERS.staff },
  { to: paths.events(), label: 'Events & Operations', icon: Calendar, allow: ROLE_TIERS.staff },
  { to: paths.calendar(), label: 'Calendar', icon: CalendarDays, allow: ROLE_TIERS.staff },
  { to: paths.participants(), label: 'Participants', icon: Users, allow: ROLE_TIERS.registration },
  { to: paths.users(), label: 'Users', icon: UserCog, allow: ROLE_TIERS.governance },
  { to: paths.orgSettings(), label: 'Settings', icon: Settings, allow: ROLE_TIERS.governance },
  { to: paths.audit(), label: 'System Audit Trails', icon: ShieldCheck, allow: ROLE_TIERS.governance },
];

/** Context every admin page gets via <Outlet> — currently just the create-event action. */
export interface AdminOutletCtx {
  openCreateEvent: () => void;
}

export const useAdminUI = () => useOutletContext<AdminOutletCtx>();

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  if (!user) return null; // RequireAuth handles the redirect

  const wizardOpen = params.get('new') === '1';
  const openCreateEvent = () => {
    const next = new URLSearchParams(params);
    next.set('new', '1');
    setParams(next, { replace: false });
  };
  const closeWizard = () => {
    const next = new URLSearchParams(params);
    next.delete('new');
    setParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900">
      <aside className="w-full md:w-64 bg-rhb-navy text-slate-200 border-r border-white/10 flex flex-col justify-between shrink-0">
        <div>
          <div className="border-b border-white/10">
            <BrandMark theme="dark" size="lg" block />
          </div>

          <nav className="p-4 space-y-1.5 text-xs font-semibold">
            {NAV_ITEMS.filter((item) => hasRole(user.role, item.allow)).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === paths.dashboard()}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-3">
          <button
            onClick={() => navigate(paths.catalog())}
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
              onClick={async () => {
                await logout();
                navigate(paths.login());
              }}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-6 py-2.5 backdrop-blur">
          <GlobalSearch />
        </div>
        <Outlet context={{ openCreateEvent } satisfies AdminOutletCtx} />
      </main>

      <EventWizardModal
        isOpen={wizardOpen}
        onClose={closeWizard}
        onEventCreated={(ev: EventItem) => {
          closeWizard();
          navigate(paths.eventConsole(ev.slug, 'overview'));
        }}
      />
    </div>
  );
};
