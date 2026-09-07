import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { hasRole } from '../services/api';
import { useAuth } from '../services/auth';
import { paths } from './paths';

/** Blocks a subtree unless signed in; bounces to /login?next=… */
export const RequireAuth: React.FC = () => {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) {
    return <Navigate to={paths.login(loc.pathname + loc.search)} replace />;
  }
  return <Outlet />;
};

/** Further restricts a subtree to a role tier; else back to the dashboard. */
export const RequireRole: React.FC<{ allow: readonly string[] }> = ({ allow }) => {
  const { user } = useAuth();
  if (!user || !hasRole(user.role, allow)) {
    return <Navigate to={paths.dashboard()} replace />;
  }
  return <Outlet />;
};

export const NotFound: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-100 text-center px-6">
    <div className="text-5xl font-extrabold text-slate-300">404</div>
    <p className="text-sm text-slate-600">This page doesn’t exist.</p>
    <a
      href={paths.catalog()}
      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
    >
      Back to Events
    </a>
  </div>
);

export const RouteSpinner: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="min-h-[40vh] flex items-center justify-center text-xs text-slate-400">{label}</div>
);
