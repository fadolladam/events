import React, { useCallback, useEffect, useState } from 'react';
import {
  apiClient,
  ROLE_TIERS,
  hasRole,
  type EventItem,
  type EventAnalyticsDetail,
  type DashboardRange,
} from '../../services/api';
import {
  AlertTriangle,
  RefreshCw,
  FileEdit,
  ExternalLink,
  Clock,
  QrCode,
  ClipboardCheck,
  Bell,
  ArrowRight,
  Activity,
  Check,
  X,
} from 'lucide-react';
import { Section, StatTile, ProgressBar, WidgetBoundary } from './dashboard/primitives';
import { TrendChart } from './dashboard/charts';
import { fmtInt, fmtPct, fmtDate, fmtDateTime, relTime } from './dashboard/format';

interface Props {
  eventId: string;
  event: EventItem;
  role?: string;
  onOpenTab: (tab: string) => void;
  onEditForm: () => void;
}

const TREND_RANGES: { key: Exclude<DashboardRange, 'today' | 'this_month' | 'this_year' | 'custom'> | 'all'; label: string; days: number | null }[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: 'all', label: 'All', days: null },
];

export const EventOverviewTab: React.FC<Props> = ({ eventId, role, onOpenTab, onEditForm }) => {
  const canCheckin = hasRole(role, ROLE_TIERS.checkin);
  const canRegistrations = hasRole(role, ROLE_TIERS.registration);

  const [data, setData] = useState<EventAnalyticsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<(typeof TREND_RANGES)[number]['key']>('30d');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/events/${eventId}/analytics`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load event analytics', err);
      setError('Could not load the event dashboard.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  if (loading && !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="w-6 h-6 text-rose-500" />
        <p className="text-sm text-rose-700">{error}</p>
        <button onClick={fetch} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const utilTone =
    data.confirmed > data.capacity ? 'bad' : data.capacity_utilization >= 90 ? 'warn' : 'good';
  const form = data.form_summary;
  const q = data.queue_summary;
  const att = data.attendance;
  const trendDays = TREND_RANGES.find((r) => r.key === trendRange)?.days ?? null;
  const trendData = trendDays
    ? data.trend.filter((p) => new Date(p.date).getTime() >= Date.now() - trendDays * 864e5)
    : data.trend;

  return (
    <div className="space-y-6">
      {/* §32 KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <StatTile label="Capacity" value={fmtInt(data.capacity)} />
        <StatTile label="Confirmed" value={fmtInt(data.confirmed)} tone="good" />
        <StatTile
          label="Available"
          value={fmtInt(data.available_capacity)}
          tone={data.available_capacity === 0 ? 'bad' : 'default'}
        />
        <StatTile label="Pending" value={fmtInt(data.pending)} tone={data.pending ? 'warn' : 'default'} />
        <StatTile label="Waitlisted" value={fmtInt(data.waitlisted)} tone={data.waitlisted ? 'warn' : 'default'} />
        <StatTile label="Cancelled" value={fmtInt(data.cancelled)} />
        <StatTile label="Checked In" value={fmtInt(att.present)} tone="good" />
        <StatTile label="Attendance" value={fmtPct(att.attendance_rate, 1)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* §33 Registration health */}
        <WidgetBoundary name="Registration Health">
          <Section title="Registration Health">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Capacity Utilization</span>
                  <span className="font-bold">
                    {data.confirmed} / {data.capacity} · {fmtPct(data.capacity_utilization, 1)}
                  </span>
                </div>
                <ProgressBar pct={data.capacity_utilization} tone={utilTone} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Field label="Registration State">
                  <StateBadge state={data.registration_state} />
                </Field>
                <Field label="Registration Deadline">
                  {data.registration_close_at ? (
                    <span className="text-slate-700">
                      {fmtDate(data.registration_close_at)}{' '}
                      <span className="text-slate-400">({relTime(data.registration_close_at)})</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">Not set</span>
                  )}
                </Field>
                <Field label="Registration Form">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      form.status === 'ready'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {form.status === 'ready'
                      ? `${form.active_fields} fields`
                      : form.status === 'empty'
                        ? 'No active fields'
                        : 'Missing'}
                  </span>
                </Field>
                <Field label="Queue">
                  <span className="text-slate-700">{data.waitlisted} waiting</span>
                </Field>
              </div>
            </div>
          </Section>
        </WidgetBoundary>

        {/* §34 Form summary */}
        <WidgetBoundary name="Registration Form">
          <Section
            title="Registration Form"
            actions={
              <div className="flex gap-1.5">
                <button
                  onClick={onEditForm}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1"
                >
                  <FileEdit className="w-3.5 h-3.5" /> Edit Form
                </button>
                <button
                  onClick={() => window.open(window.location.origin, '_blank', 'noopener')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-[11px] flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Preview
                </button>
              </div>
            }
          >
            {data.registration_state !== 'closed' && form.active_fields === 0 && (
              <div className="mb-3 flex items-center gap-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Registration is open but the form has no active questions.
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatTile label="Status" value={<span className="capitalize text-sm">{form.status}</span>} />
              <StatTile label="Active Fields" value={form.active_fields} />
              <StatTile label="Required" value={form.required_fields} />
              <StatTile label="Optional" value={form.optional_fields} />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Last updated {form.updated_at ? fmtDateTime(form.updated_at) : '—'}
            </p>
          </Section>
        </WidgetBoundary>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* §35 Queue summary */}
        <WidgetBoundary name="Queue Summary">
          <Section
            title="Queue Summary"
            actions={
              canRegistrations && (
                <button
                  onClick={() => onOpenTab('queue')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1"
                >
                  View Full Queue <ArrowRight className="w-3 h-3" />
                </button>
              )
            }
            empty={q.count === 0}
            emptyLabel="No one is waiting."
          >
            <div className="grid grid-cols-3 gap-2 mb-3">
              <StatTile label="In Queue" value={q.count} tone="warn" />
              <StatTile label="Oldest Wait" value={relTime(q.oldest_wait_at)} />
              <StatTile label="Promoted Today" value={q.promoted_today} tone="good" />
            </div>
            <ol className="space-y-1.5">
              {q.first_five.map((p) => (
                <li key={p.registration_number} className="flex items-center gap-2 text-[11px]">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center">
                    {p.position}
                  </span>
                  <span className="font-semibold text-slate-800">{p.participant ?? 'Participant'}</span>
                  <span className="font-mono text-slate-400">{p.registration_number}</span>
                  <span className="text-slate-300 ml-auto">{relTime(p.waitlisted_at)}</span>
                </li>
              ))}
            </ol>
          </Section>
        </WidgetBoundary>

        {/* §37 Attendance */}
        <WidgetBoundary name="Attendance">
          <Section
            title="Attendance"
            actions={
              canCheckin && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onOpenTab('checkin')}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Open Check-In
                  </button>
                  <button
                    onClick={() => onOpenTab('attendance')}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-[11px] flex items-center gap-1"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" /> Roster
                  </button>
                </div>
              )
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              <StatTile label="Confirmed" value={att.confirmed} />
              <StatTile label="Checked In" value={att.present} tone="good" />
              <StatTile label="Not Checked In" value={att.not_checked_in} tone={att.not_checked_in ? 'warn' : 'default'} />
              <StatTile label="No Show" value={att.no_show} tone={att.no_show ? 'bad' : 'default'} />
              <StatTile label="Rate" value={fmtPct(att.attendance_rate, 1)} />
              <StatTile label="Last Check-In" value={relTime(att.last_check_in_at)} />
            </div>
            <ProgressBar pct={att.attendance_rate} tone="good" />
          </Section>
        </WidgetBoundary>
      </div>

      {/* §36 Registration trend */}
      <WidgetBoundary name="Registrations Over Time">
        <Section
          title="Registrations Over Time"
          actions={
            <div className="flex gap-1">
              {TREND_RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setTrendRange(r.key)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold border ${
                    trendRange === r.key
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          }
          empty={trendData.length === 0}
        >
          <TrendChart data={trendData} series={['total', 'confirmed', 'waitlisted', 'cancelled']} />
        </Section>
      </WidgetBoundary>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* §38 Notifications */}
        <WidgetBoundary name="Notifications">
          <Section
            title="Notifications"
            actions={
              <button
                onClick={() => onOpenTab('reports')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-[11px] flex items-center gap-1"
              >
                <Bell className="w-3.5 h-3.5" /> Manage
              </button>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatTile label="Sent" value={data.notifications.sent} tone="good" />
              <StatTile label="Scheduled" value={data.notifications.scheduled} />
              <StatTile label="Pending" value={data.notifications.pending} />
              <StatTile
                label="Failed"
                value={data.notifications.failed}
                tone={data.notifications.failed ? 'bad' : 'default'}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Last notification {data.notifications.last_at ? fmtDateTime(data.notifications.last_at) : '—'}
            </p>
          </Section>
        </WidgetBoundary>

        {/* §39 Activity */}
        <WidgetBoundary name="Event Activity">
          <Section title="Event Activity" empty={data.activity.length === 0}>
            <ul className="space-y-2.5">
              {data.activity.map((a, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[11px]">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Activity className="w-3 h-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-slate-700">
                      <span className="font-bold text-slate-900">{a.actor}</span> — {a.summary}
                    </div>
                    <div className="text-slate-300">{fmtDateTime(a.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </WidgetBoundary>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</div>
    {children}
  </div>
);

const StateBadge: React.FC<{ state: EventAnalyticsDetail['registration_state'] }> = ({ state }) => {
  const map = {
    open: { cls: 'bg-emerald-50 text-emerald-700', label: 'Open', Icon: Check },
    closing_soon: { cls: 'bg-amber-50 text-amber-700', label: 'Closing soon', Icon: Clock },
    closed: { cls: 'bg-slate-100 text-slate-600', label: 'Closed', Icon: X },
  }[state];
  const Icon = map.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${map.cls}`}>
      <Icon className="w-3 h-3" /> {map.label}
    </span>
  );
};
