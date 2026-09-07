import React, { useCallback, useEffect, useState } from 'react';
import {
  apiClient,
  getStoredUser,
  ROLE_TIERS,
  hasRole,
  type DashboardOverview,
  type DashboardRange,
} from '../../services/api';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { WidgetBoundary } from './dashboard/primitives';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { KpiGrid } from './dashboard/KpiGrid';
import { ActionRequired } from './dashboard/ActionRequired';
import { ActiveEventsTable } from './dashboard/ActiveEventsTable';
import { EventStatusOverview } from './dashboard/EventStatusOverview';
import { RegistrationTrend, RegistrationStatusBreakdown } from './dashboard/RegistrationInsights';
import { CapacityUtilization } from './dashboard/CapacityUtilization';
import { WaitlistOverview } from './dashboard/WaitlistOverview';
import { PendingApprovals } from './dashboard/PendingApprovals';
import { UpcomingEvents } from './dashboard/UpcomingEvents';
import { TodayOperations } from './dashboard/TodayOperations';
import { AttendancePerformance } from './dashboard/AttendancePerformance';
import { RecentRegistrations, RecentActivity } from './dashboard/RecentPanels';
import { NotificationHealth } from './dashboard/NotificationHealth';
import { EventReadiness } from './dashboard/EventReadiness';
import { QuickActions } from './dashboard/QuickActions';
import type { DashboardCtx } from './dashboard/types';
import { useNavigate } from 'react-router-dom';
import { paths } from '../../routes/paths';
import { useAdminUI } from '../../components/AdminLayout';

const iso = (d: Date) => d.toISOString().slice(0, 10);

export const GlobalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { openCreateEvent } = useAdminUI();
  const role = getStoredUser()?.role;
  const canCreate = hasRole(role, ROLE_TIERS.eventManager);

  const [range, setRange] = useState<DashboardRange>('30d');
  const [customFrom, setCustomFrom] = useState(iso(new Date(Date.now() - 30 * 864e5)));
  const [customTo, setCustomTo] = useState(iso(new Date()));

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(
    async (soft = false) => {
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = { range };
        if (range === 'custom') {
          params.from = customFrom;
          params.to = customTo;
        }
        const res = await apiClient.get('/dashboard/overview', { params });
        setData(res.data);
      } catch (err: any) {
        console.error('Failed to load dashboard overview', err);
        setError(
          err.response?.status === 403
            ? 'You do not have permission to view the operations dashboard.'
            : 'Could not load the dashboard. Check your connection and retry.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range, customFrom, customTo],
  );

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const ctx: DashboardCtx = {
    onSelectEvent: (slugOrId, tab) => navigate(paths.eventConsole(slugOrId, tab ?? 'overview')),
    onNavigateToEvents: (status) => navigate(paths.events(status)),
    onCreateEvent: openCreateEvent,
    role,
    refetch: () => fetchOverview(true),
  };

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-[1600px] mx-auto">
      <DashboardHeader
        range={range}
        customFrom={customFrom}
        customTo={customTo}
        onRangeChange={setRange}
        onCustomChange={(f, t) => {
          setCustomFrom(f);
          setCustomTo(t);
        }}
        onRefresh={() => fetchOverview(true)}
        refreshing={refreshing}
        generatedAt={data?.generated_at}
        canCreate={canCreate}
        onCreateEvent={openCreateEvent}
      />

      {loading && !data ? (
        <DashboardSkeleton />
      ) : error && !data ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="w-6 h-6 text-rose-500" />
          <p className="text-sm text-rose-700">{error}</p>
          <button
            onClick={() => fetchOverview()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : data ? (
        <div className="space-y-6">
          <WidgetBoundary name="Action Required">
            <ActionRequired items={data.action_required ?? []} ctx={ctx} />
          </WidgetBoundary>

          <WidgetBoundary name="Today's Operations">
            <TodayOperations rows={data.today_operations ?? []} ctx={ctx} />
          </WidgetBoundary>

          <WidgetBoundary name="Key metrics">
            <KpiGrid kpis={data.kpis} ctx={ctx} />
          </WidgetBoundary>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <WidgetBoundary name="Active Events">
              <ActiveEventsTable rows={data.active_events ?? []} ctx={ctx} />
            </WidgetBoundary>
            <div className="space-y-6">
              <WidgetBoundary name="Event Status Overview">
                <EventStatusOverview breakdown={data.event_status_breakdown ?? {}} ctx={ctx} />
              </WidgetBoundary>
              <WidgetBoundary name="Quick Actions">
                <QuickActions overview={data} ctx={ctx} canCreate={canCreate} />
              </WidgetBoundary>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetBoundary name="Capacity Utilization">
              <CapacityUtilization rows={data.capacity_utilization ?? []} ctx={ctx} />
            </WidgetBoundary>
            <WidgetBoundary name="Waitlist Overview">
              <WaitlistOverview data={data.waitlist} ctx={ctx} />
            </WidgetBoundary>
          </div>

          {data.pending_approvals && (
            <WidgetBoundary name="Pending Approvals">
              <PendingApprovals data={data.pending_approvals} ctx={ctx} />
            </WidgetBoundary>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetBoundary name="Upcoming Events">
              <UpcomingEvents rows={data.upcoming_events ?? []} ctx={ctx} />
            </WidgetBoundary>
            <WidgetBoundary name="Event Readiness">
              <EventReadiness rows={data.readiness ?? []} ctx={ctx} />
            </WidgetBoundary>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <WidgetBoundary name="Registrations Over Time">
                <RegistrationTrend
                  data={data.registration_trend ?? []}
                  range={range}
                  onRangeChange={setRange}
                />
              </WidgetBoundary>
            </div>
            <WidgetBoundary name="Registration Status">
              <RegistrationStatusBreakdown data={data.registration_status_breakdown} />
            </WidgetBoundary>
          </div>

          <WidgetBoundary name="Attendance Performance">
            <AttendancePerformance rows={data.attendance_performance ?? []} ctx={ctx} />
          </WidgetBoundary>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <WidgetBoundary name="Recent Registrations">
                <RecentRegistrations rows={data.recent_registrations ?? []} ctx={ctx} />
              </WidgetBoundary>
            </div>
            <WidgetBoundary name="Recent Activity">
              <RecentActivity rows={data.recent_activity ?? []} />
            </WidgetBoundary>
          </div>

          <WidgetBoundary name="Notification Health">
            <NotificationHealth data={data.notification_health} />
          </WidgetBoundary>
        </div>
      ) : null}
    </div>
  );
};

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-72 bg-white rounded-2xl border border-slate-200 animate-pulse" />
      <div className="h-72 bg-white rounded-2xl border border-slate-200 animate-pulse" />
    </div>
  </div>
);
