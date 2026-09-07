import React from 'react';
import { Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { ROLE_TIERS, type User } from './services/api';
import { useAuth } from './services/auth';
import { paths, EVENT_TABS } from './routes/paths';
import { RequireAuth, RequireRole, NotFound } from './routes/guards';
import {
  CatalogRoute,
  PublicEventRoute,
  RegisterRoute,
  LookupRoute,
  TicketRoute,
} from './routes/publicRoutes';
import { LoginPage } from './modules/auth/LoginPage';
import { AdminLayout } from './components/AdminLayout';
import { GlobalDashboard } from './modules/admin/GlobalDashboard';
import { EventsManagement } from './modules/admin/EventsManagement';
import { EventDetailManage } from './modules/admin/EventDetailManage';
import { AuditLogsPage } from './modules/audit/AuditLogsPage';

/* -------- /login -------- */
const LoginRoute: React.FC = () => {
  const { user, setSession } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get('next') || paths.dashboard();

  if (user) return <Navigate to={next} replace />;

  return (
    <LoginPage
      onLoginSuccess={(u: User) => {
        setSession(u);
        navigate(next, { replace: true });
      }}
      onCancel={() => navigate(paths.catalog())}
    />
  );
};

export const App: React.FC = () => (
  <Routes>
    {/* Public */}
    <Route path={paths.catalog()} element={<CatalogRoute />} />
    <Route path="/events/:slug" element={<PublicEventRoute />} />
    <Route path="/events/:slug/register" element={<RegisterRoute />} />
    <Route path={paths.lookup()} element={<LookupRoute />} />
    <Route path="/ticket/:token" element={<TicketRoute />} />
    <Route path={paths.login()} element={<LoginRoute />} />

    {/* Admin (auth-gated, rendered inside AdminLayout) */}
    <Route element={<RequireAuth />}>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to={paths.dashboard()} replace />} />
        <Route path="dashboard" element={<GlobalDashboard />} />
        <Route path="events" element={<EventsManagement />} />
        <Route
          path="events/:slug"
          element={<Navigate to={EVENT_TABS[0]} replace />}
        />
        <Route path="events/:slug/:tab" element={<EventDetailManage />} />
        <Route element={<RequireRole allow={ROLE_TIERS.governance} />}>
          <Route path="audit" element={<AuditLogsPage />} />
        </Route>
      </Route>
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);
