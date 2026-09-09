import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiClient, EventItem, Registration, getStoredUser, ROLE_TIERS, hasRole } from '../../services/api';
import { paths } from '../../routes/paths';
import { QrScannerConsole } from '../checkin/QrScannerConsole';
import { WaitlistQueuePage } from '../queue/WaitlistQueuePage';
import { AttendanceRoster } from '../attendance/AttendanceRoster';
import { EventReportsPage } from '../reports/EventReportsPage';
import { FormBuilderModal } from '../forms/FormBuilderModal';
import { ManualRegistrationModal } from '../registration/ManualRegistrationModal';
import { RegistrationImportModal } from '../registration/RegistrationImportModal';
import { EventOverviewTab } from './EventOverviewTab';
import { EventStaffTab } from './EventStaffTab';
import { EventAuditTab } from './EventAuditTab';
import { EventSettingsModal } from './EventSettingsModal';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  LayoutDashboard,
  Users,
  FileEdit,
  Clock,
  QrCode,
  CheckSquare,
  BarChart3,
  Settings,
  UserCog,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  UserPlus,
  Upload,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
} from 'lucide-react';

/** "06 Sep 2026, 02:22:31 PM" — full date + time to the second, so two
 *  registrations in the same minute can still be told apart. */
const fmtRegisteredAt = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${date}, ${time}`;
};

const PER_PAGE_OPTIONS = [25, 50, 100, 200];

export const EventDetailManage: React.FC = () => {
  const navigate = useNavigate();
  const { slug = '', tab: routeTab = 'overview' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const panel = searchParams.get('panel'); // 'form' | 'settings' | null

  const [event, setEvent] = useState<EventItem | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regPage, setRegPage] = useState(1);
  const [regPerPage, setRegPerPage] = useState(25);
  const [regMeta, setRegMeta] = useState<{ total: number; last_page: number; from: number | null; to: number | null }>({
    total: 0,
    last_page: 1,
    from: null,
    to: null,
  });
  const [regLoading, setRegLoading] = useState(false);
  const [expandedRegId, setExpandedRegId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Registration | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showManualReg, setShowManualReg] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [regFlash, setRegFlash] = useState<string | null>(null);
  const [regFilters, setRegFilters] = useState<{ status: string; department: string; checked_in: string; date_from: string }>({
    status: '',
    department: '',
    checked_in: '',
    date_from: '',
  });
  const [selectedRegIds, setSelectedRegIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const role = getStoredUser()?.role;
  const canManage = hasRole(role, ROLE_TIERS.eventManager);
  const canRegistrations = hasRole(role, ROLE_TIERS.registration);
  const canCheckin = hasRole(role, ROLE_TIERS.checkin);

  // The real UUID for every downstream call (the URL may carry the slug).
  const eventUuid = event?.id ?? '';

  // Navigate between tabs = navigate between URLs. form/settings are ?panel= modals.
  const goToTab = (key: string) => {
    if (key === 'form' || key === 'settings') {
      const next = new URLSearchParams(searchParams);
      next.set('panel', key);
      setSearchParams(next);
    } else {
      navigate(paths.eventConsole(slug, key));
    }
  };
  const closePanel = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('panel');
    setSearchParams(next, { replace: true });
  };

  // Load the event when the :slug segment changes (NOT on tab change — that
  // would remount every embedded tab, e.g. churn the QR scanner).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEvent(null);
    setNotFound(false);
    setRegPage(1);
    setRegistrations([]);
    apiClient
      .get(`/events/${slug}`)
      .then((res) => {
        if (cancelled) return;
        setEvent(res.data);
        // Pretty up the URL: if we were linked by UUID, swap to the slug form.
        if (res.data?.slug && res.data.slug !== slug) {
          navigate(paths.eventConsole(res.data.slug, routeTab) + (panel ? `?panel=${panel}` : ''), {
            replace: true,
          });
        }
      })
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (routeTab === 'registrations' && eventUuid) {
      fetchRegistrations(eventUuid, regPage, regPerPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeTab, eventUuid, regPage, regPerPage, regFilters]);

  const fetchEvent = async () => {
    try {
      const res = await apiClient.get(`/events/${eventUuid || slug}`);
      setEvent(res.data);
    } catch (err) {
      console.error('Failed to load event', err);
    }
  };

  const fetchRegistrations = async (id: string, page = 1, perPage = 25) => {
    setRegLoading(true);
    try {
      const res = await apiClient.get(`/events/${id}/registrations`, {
        params: {
          page,
          per_page: perPage,
          ...(regFilters.status ? { status: regFilters.status } : {}),
          ...(regFilters.department ? { department: regFilters.department } : {}),
          ...(regFilters.checked_in ? { checked_in: regFilters.checked_in } : {}),
          ...(regFilters.date_from ? { date_from: regFilters.date_from } : {}),
        },
      });
      setSelectedRegIds(new Set());
      setRegistrations(res.data.data || []);
      setRegMeta({
        total: res.data.total ?? (res.data.data || []).length,
        last_page: res.data.last_page ?? 1,
        from: res.data.from ?? null,
        to: res.data.to ?? null,
      });
    } catch (err) {
      console.error('Failed to load registrations', err);
    } finally {
      setRegLoading(false);
    }
  };

  const saveAsTemplate = async () => {
    const name = window.prompt('Name this template (e.g. "Standard CSR Run"):');
    if (!name || !name.trim()) return;
    try {
      await apiClient.post(`/events/${eventUuid}/save-as-template`, { name: name.trim() });
      alert('Saved. It now appears in the "Start from a template" list when creating an event.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not save the template.');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await apiClient.patch(`/events/${eventUuid}/status`, { status: newStatus });
      fetchEvent();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  // Cancel a registration. If the person held a confirmed seat, the backend
  // auto-promotes the next person off the waiting list into it.
  const confirmCancelRegistration = async (reason: string) => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await apiClient.post(`/registrations/${cancelTarget.id}/cancel`, {
        reason: reason || 'Cancelled by administrator',
      });
      setCancelTarget(null);
      await Promise.all([fetchRegistrations(eventUuid, regPage, regPerPage), fetchEvent()]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel this registration.');
    } finally {
      setCancelling(false);
    }
  };

  const regColSpan = canRegistrations ? 9 : 8;

  const toggleRegSelected = (id: string) =>
    setSelectedRegIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runBulk = async (action: 'approve' | 'reject' | 'cancel') => {
    const ids = Array.from(selectedRegIds);
    if (ids.length === 0) return;
    if (action !== 'approve' && !confirm(`${action[0].toUpperCase()}${action.slice(1)} ${ids.length} selected registration(s)?`)) return;
    setBulkBusy(true);
    try {
      const res = await apiClient.post(`/events/${eventUuid}/registrations/bulk`, { action, ids });
      const { processed, skipped } = res.data as { processed: number; skipped: unknown[] };
      setRegFlash(`${action} — ${processed} done${skipped.length ? `, ${skipped.length} skipped` : ''}.`);
      window.setTimeout(() => setRegFlash(null), 6000);
      await Promise.all([fetchRegistrations(eventUuid, regPage, regPerPage), fetchEvent()]);
    } catch (err: any) {
      alert(err.response?.data?.message || `Bulk ${action} failed.`);
    } finally {
      setBulkBusy(false);
    }
  };

  const reissueTicket = async (id: string) => {
    try {
      await apiClient.post(`/registrations/${id}/reissue-ticket`);
      setRegFlash('Ticket reissued — the old QR no longer scans.');
      window.setTimeout(() => setRegFlash(null), 6000);
      await fetchRegistrations(eventUuid, regPage, regPerPage);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not reissue the ticket.');
    }
  };

  const saveNotes = async (id: string, notes: string) => {
    try {
      await apiClient.patch(`/registrations/${id}`, { notes });
      setRegFlash('Note saved.');
      window.setTimeout(() => setRegFlash(null), 4000);
      await fetchRegistrations(eventUuid, regPage, regPerPage);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not save the note.');
    }
  };

  if (notFound) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-slate-600">That event could not be found.</p>
        <button
          onClick={() => navigate(paths.events())}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
        >
          Back to All Events
        </button>
      </div>
    );
  }

  if (loading || !event) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading event management dashboard...</div>;
  }

  // Body tabs the current role may open. `form` / `settings` are modals, not
  // body tabs. Anything else (stale value, deep link the role can't use) falls
  // back to Overview so the console never renders a blank body.
  const tabAccess: Record<string, boolean> = {
    overview: true,
    registrations: canRegistrations,
    queue: canRegistrations,
    checkin: canCheckin,
    attendance: canCheckin,
    reports: true,
    staff: canManage,
    audit: canManage,
  };
  const currentTab = tabAccess[routeTab] ? routeTab : 'overview';

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(paths.events())}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Events</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{event.title}</h1>
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
              {event.event_code}
            </span>
          </div>
        </div>

        {/* Status Toggle Dropdown — editable only for event managers */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">Event Status:</span>
          {canManage ? (
            <select
              value={event.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold uppercase bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="draft">Draft</option>
              <option value="upcoming">Upcoming</option>
              <option value="registration_open">Registration Open</option>
              <option value="full">Full</option>
              <option value="registration_closed">Registration Closed</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="archived">Archived</option>
            </select>
          ) : (
            <span className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-600">
              {event.status.replace('_', ' ')}
            </span>
          )}
          {canManage && (
            <button
              onClick={saveAsTemplate}
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
              title="Save this event's settings + form as a reusable template"
            >
              Save as template
            </button>
          )}
        </div>
      </div>

      {/* Compact event header strip (visible on every tab) */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600 shadow-xs">
        <span><span className="text-slate-400">Date</span> {new Date(event.start_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        <span><span className="text-slate-400">Venue</span> {event.venue_name || (event.event_type === 'virtual' ? 'Virtual' : '—')}</span>
        <span><span className="text-slate-400">Capacity</span> {event.confirmed_count ?? 0}/{event.capacity}{event.over_capacity ? ' ⚠' : ''}</span>
        <span><span className="text-slate-400">Waitlist</span> {event.waitlist_count ?? 0}</span>
        <span><span className="text-slate-400">Checked in</span> {event.checked_in_count ?? 0}</span>
      </div>

      {/* Tab Navigation — filtered by the signed-in user's role */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold overflow-x-auto pb-px custom-scrollbar">
        {[
          { key: 'overview', label: 'Overview', icon: LayoutDashboard, show: true, onClick: () => goToTab('overview') },
          { key: 'registrations', label: 'Registrations', icon: Users, show: canRegistrations, onClick: () => goToTab('registrations') },
          { key: 'form', label: 'Form Builder', icon: FileEdit, show: canManage, onClick: () => goToTab('form') },
          { key: 'queue', label: `Queue & Waitlist (${event.waitlist_count || 0})`, icon: Clock, show: canRegistrations, onClick: () => goToTab('queue') },
          { key: 'checkin', label: 'QR Check-In Console', icon: QrCode, show: canCheckin, onClick: () => goToTab('checkin') },
          { key: 'attendance', label: 'Attendance Roster', icon: CheckSquare, show: canCheckin, onClick: () => goToTab('attendance') },
          { key: 'reports', label: 'Analytics & Reports', icon: BarChart3, show: true, onClick: () => goToTab('reports') },
          { key: 'staff', label: 'Team', icon: UserCog, show: canManage, onClick: () => goToTab('staff') },
          { key: 'audit', label: 'Audit', icon: ShieldCheck, show: canManage, onClick: () => goToTab('audit') },
          { key: 'settings', label: 'Settings', icon: Settings, show: canManage, onClick: () => goToTab('settings') },
        ]
          .filter((t) => t.show)
          .map((t) => {
            const Icon = t.icon;
            const isActive = currentTab === t.key || panel === t.key;
            return (
              <button
                key={t.key}
                onClick={t.onClick}
                className={`pb-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
      </div>

      <ErrorBoundary label="This tab" resetKey={currentTab}>
      {/* OVERVIEW TAB */}
      {currentTab === 'overview' && (
        <div className="space-y-6">
          {event.readiness && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Event Readiness</h3>
                <span className={`text-xs font-bold ${event.readiness.ready_count === event.readiness.total ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {Math.round((event.readiness.ready_count / event.readiness.total) * 100)}% · {event.readiness.ready_count}/{event.readiness.total}
                </span>
              </div>
              <div className="mb-3 h-1.5 rounded-full bg-slate-100">
                <div
                  className={`h-1.5 rounded-full ${event.readiness.ready_count === event.readiness.total ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${(event.readiness.ready_count / event.readiness.total) * 100}%` }}
                />
              </div>
              <ul className="grid gap-1.5 text-xs sm:grid-cols-2">
                {event.readiness.items.map((it) => (
                  <li key={it.label} className="flex items-start gap-2">
                    <span className={it.ok ? 'text-emerald-600' : 'text-slate-300'}>{it.ok ? '✓' : '○'}</span>
                    <span className={it.ok ? 'text-slate-700' : 'text-slate-500'}>
                      {it.label}
                      {!it.ok && <span className="text-slate-400"> — {it.hint}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <EventOverviewTab
            eventId={eventUuid}
            event={event}
            role={role}
            onOpenTab={goToTab}
            onEditForm={() => goToTab('form')}
          />

          {/* Quick Operations Launchpad */}
          <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl space-y-4">
            <h3 className="text-lg font-bold">Event Operations Launchpad</h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Conduct live onsite attendee check-ins, manage queue auto-promotions, or adjust dynamic registration questions.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              {canCheckin && (
              <button
                onClick={() => goToTab('checkin')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>Launch QR Check-In Console</span>
              </button>
              )}

              {canRegistrations && (
              <button
                onClick={() => goToTab('queue')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-2 transition-all"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Manage FIFO Waitlist Queue</span>
              </button>
              )}

              {canManage && (
              <button
                onClick={() => goToTab('form')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-2 transition-all"
              >
                <FileEdit className="w-4 h-4 text-emerald-400" />
                <span>Edit Registration Questions</span>
              </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REGISTRATIONS TAB */}
      {currentTab === 'registrations' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900">
              Registered Participants{' '}
              <span className="font-normal text-slate-400">
                ({regMeta.total}
                {regMeta.total > 0 && regMeta.from ? ` · showing ${regMeta.from}–${regMeta.to}` : ''})
              </span>
            </h3>
            <div className="flex items-center gap-2">
              {canRegistrations && (
                <>
                  <button
                    onClick={() => setShowManualReg(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add participant
                  </button>
                  <button
                    onClick={() => setShowImport(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Import CSV
                  </button>
                  <button
                    onClick={() => {
                      const p = new URLSearchParams();
                      Object.entries(regFilters).forEach(([k, v]) => { if (v) p.set(k, v); });
                      const qs = p.toString();
                      window.open(`/api/events/${eventUuid}/export/csv${qs ? `?${qs}` : ''}`, '_blank');
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    <Upload className="h-3.5 w-3.5 rotate-180" />
                    Export CSV
                  </button>
                </>
              )}
              <label className="text-[11px] text-slate-400">Per page</label>
              <select
                value={regPerPage}
                onChange={(e) => {
                  setRegPage(1);
                  setRegPerPage(Number(e.target.value));
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white"
              >
                {PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <button
                onClick={() => fetchRegistrations(eventUuid, regPage, regPerPage)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${regLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {regFlash && (
            <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700">
              {regFlash}
            </div>
          )}

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-xs">
            <select
              value={regFilters.status}
              onChange={(e) => { setRegPage(1); setRegFilters((f) => ({ ...f, status: e.target.value })); }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1"
            >
              <option value="">All statuses</option>
              {['pending', 'confirmed', 'waitlisted', 'approved', 'rejected', 'cancelled'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={regFilters.checked_in}
              onChange={(e) => { setRegPage(1); setRegFilters((f) => ({ ...f, checked_in: e.target.value })); }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1"
            >
              <option value="">Any check-in</option>
              <option value="yes">Checked in</option>
              <option value="no">Not checked in</option>
            </select>
            <input
              value={regFilters.department}
              onChange={(e) => { setRegPage(1); setRegFilters((f) => ({ ...f, department: e.target.value })); }}
              placeholder="Department"
              className="w-32 rounded-lg border border-slate-200 px-2 py-1"
            />
            <label className="flex items-center gap-1 text-slate-400">
              From
              <input
                type="date"
                value={regFilters.date_from}
                onChange={(e) => { setRegPage(1); setRegFilters((f) => ({ ...f, date_from: e.target.value })); }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-slate-700"
              />
            </label>
            {(regFilters.status || regFilters.department || regFilters.checked_in || regFilters.date_from) && (
              <button
                onClick={() => { setRegPage(1); setRegFilters({ status: '', department: '', checked_in: '', date_from: '' }); }}
                className="text-slate-400 hover:text-slate-700 underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Bulk action bar */}
          {canRegistrations && selectedRegIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-indigo-100 bg-indigo-50 px-4 py-2 text-xs">
              <span className="font-bold text-indigo-900">{selectedRegIds.size} selected</span>
              <button disabled={bulkBusy} onClick={() => runBulk('approve')} className="rounded-lg bg-emerald-600 px-2.5 py-1 font-bold text-white hover:bg-emerald-500 disabled:opacity-50">Approve</button>
              <button disabled={bulkBusy} onClick={() => runBulk('reject')} className="rounded-lg bg-amber-600 px-2.5 py-1 font-bold text-white hover:bg-amber-500 disabled:opacity-50">Reject</button>
              <button disabled={bulkBusy} onClick={() => runBulk('cancel')} className="rounded-lg bg-rose-600 px-2.5 py-1 font-bold text-white hover:bg-rose-500 disabled:opacity-50">Cancel</button>
              <button onClick={() => setSelectedRegIds(new Set())} className="text-indigo-500 hover:text-indigo-800 underline">Clear selection</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                  {canRegistrations && (
                    <th className="py-3 px-4 w-8">
                      <input
                        type="checkbox"
                        aria-label="Select all on this page"
                        checked={registrations.length > 0 && selectedRegIds.size === registrations.length}
                        onChange={(e) =>
                          setSelectedRegIds(e.target.checked ? new Set(registrations.map((r) => r.id)) : new Set())
                        }
                      />
                    </th>
                  )}
                  <th className="py-3 px-4 w-8"></th>
                  <th className="py-3 px-4">Permanent Reg #</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4 whitespace-nowrap">Registered On <span className="normal-case font-normal text-slate-300">(local time)</span></th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {regMeta.total === 0 ? (
                  <tr>
                    <td colSpan={regColSpan} className="py-12 text-center text-slate-400">No registrations recorded yet.</td>
                  </tr>
                ) : registrations.length === 0 ? (
                  <tr>
                    <td colSpan={regColSpan} className="py-12 text-center text-slate-400">
                      {regLoading ? 'Loading…' : 'No registrations on this page.'}
                    </td>
                  </tr>
                ) : (
                  registrations.map((r) => {
                    const isOpen = expandedRegId === r.id;
                    const answers = r.answers || [];
                    const answerLabels = new Set(
                      answers.map((a) => (a.field_label || a.field_key).toLowerCase())
                    );
                    // Don't repeat a participant field that's also a form answer.
                    const extras: [string, string | undefined][] = (
                      [
                        ['Phone', r.participant.phone],
                        ['Employee ID', r.participant.employee_id],
                        ['Department', r.participant.department],
                        ['Country', r.participant.country],
                      ] as [string, string | undefined][]
                    ).filter(([label]) => !answerLabels.has(label.toLowerCase()));
                    return (
                      <React.Fragment key={r.id}>
                        <tr
                          className="hover:bg-slate-50/80 cursor-pointer"
                          onClick={() => setExpandedRegId(isOpen ? null : r.id)}
                        >
                          {canRegistrations && (
                            <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                aria-label={`Select ${r.registration_number}`}
                                checked={selectedRegIds.has(r.id)}
                                onChange={() => toggleRegSelected(r.id)}
                              />
                            </td>
                          )}
                          <td className="py-3.5 px-4 text-slate-400">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{r.registration_number}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{r.participant.name}</td>
                          <td className="py-3.5 px-4 text-slate-500">{r.participant.email}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                r.status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'waitlisted'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 uppercase text-[10px] font-semibold text-slate-600">
                            {r.attendance_status.replace('_', ' ')}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap tabular-nums">{fmtRegisteredAt(r.registered_at)}</td>
                          <td className="py-3.5 px-4 text-right">
                            {['confirmed', 'waitlisted', 'pending', 'approved'].includes(r.status) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCancelTarget(r);
                                }}
                                className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-[11px]"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>

                        {isOpen && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={regColSpan} className="px-4 py-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                                {extras
                                  .filter(([, v]) => v)
                                  .map(([label, v]) => (
                                    <div key={label} className="flex flex-col">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                                      <span className="text-slate-800 font-medium">{v}</span>
                                    </div>
                                  ))}

                                {answers.map((a) => {
                                  const val = Array.isArray(a.value_json)
                                    ? a.value_json.join(', ')
                                    : a.value_json != null
                                    ? JSON.stringify(a.value_json)
                                    : a.value_text;
                                  return (
                                    <div key={a.field_key} className="flex flex-col">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {a.field_label || a.field_key}
                                      </span>
                                      <span className="text-slate-800 font-medium break-words">{val || '—'}</span>
                                    </div>
                                  );
                                })}

                                {extras.every(([, v]) => !v) && answers.length === 0 && (
                                  <span className="text-slate-400 italic">No additional registration answers.</span>
                                )}
                              </div>

                              {canRegistrations && (
                                <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-end">
                                  <label className="flex-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Internal note
                                    <textarea
                                      defaultValue={r.notes || ''}
                                      rows={2}
                                      onBlur={(e) => {
                                        if ((e.target.value || '') !== (r.notes || '')) saveNotes(r.id, e.target.value);
                                      }}
                                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-normal normal-case text-slate-800"
                                      placeholder="Saved on blur…"
                                    />
                                  </label>
                                  {r.status === 'confirmed' && (
                                    <button
                                      onClick={() => reissueTicket(r.id)}
                                      className="h-8 shrink-0 rounded-lg border border-slate-300 px-3 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
                                    >
                                      Reissue ticket
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {regMeta.last_page > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Page {regPage} of {regMeta.last_page}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setRegPage((p) => Math.max(1, p - 1))}
                  disabled={regPage <= 1 || regLoading}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <button
                  onClick={() => setRegPage((p) => Math.min(regMeta.last_page, p + 1))}
                  disabled={regPage >= regMeta.last_page || regLoading}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QUEUE & WAITLIST TAB */}
      {currentTab === 'queue' && canRegistrations && (
        <WaitlistQueuePage eventId={eventUuid} embedded onBack={() => goToTab('overview')} />
      )}

      {/* QR CHECK-IN CONSOLE TAB */}
      {currentTab === 'checkin' && canCheckin && (
        <QrScannerConsole eventId={eventUuid} embedded onBack={() => goToTab('overview')} />
      )}

      {/* ATTENDANCE ROSTER TAB */}
      {currentTab === 'attendance' && canCheckin && (
        <AttendanceRoster eventId={eventUuid} embedded onBack={() => goToTab('overview')} />
      )}

      {/* ANALYTICS & REPORTS TAB */}
      {currentTab === 'reports' && (
        <EventReportsPage eventId={eventUuid} embedded onBack={() => goToTab('overview')} />
      )}

      {currentTab === 'staff' && canManage && <EventStaffTab eventId={eventUuid} canManage={canManage} />}
      {currentTab === 'audit' && canManage && <EventAuditTab eventId={eventUuid} />}
      </ErrorBoundary>

      {/* Form Builder Modal */}
      <FormBuilderModal
        eventId={eventUuid}
        isOpen={panel === 'form'}
        onClose={closePanel}
      />

      {/* Event Settings Modal */}
      <EventSettingsModal
        eventId={eventUuid}
        isOpen={panel === 'settings'}
        onClose={closePanel}
        onSaved={(ev) => setEvent(ev)}
      />

      {/* Manual (admin-side) registration */}
      {event && (
        <ManualRegistrationModal
          event={event}
          isOpen={showManualReg}
          onClose={() => setShowManualReg(false)}
          onCreated={(s) => {
            const where =
              s.status === 'confirmed'
                ? 'confirmed'
                : s.status === 'waitlisted'
                  ? `on the waiting list${s.queue_position ? ` (position ${s.queue_position})` : ''}`
                  : 'pending approval';
            setRegFlash(`${s.registration_number} registered — ${where}.`);
            setRegPage(1);
            Promise.all([fetchRegistrations(eventUuid, 1, regPerPage), fetchEvent()]);
            window.setTimeout(() => setRegFlash(null), 6000);
          }}
        />
      )}

      {event && (
        <RegistrationImportModal
          eventId={eventUuid}
          eventTitle={event.title}
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setRegPage(1);
            Promise.all([fetchRegistrations(eventUuid, 1, regPerPage), fetchEvent()]);
          }}
        />
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel this registration?"
        tone="danger"
        busy={cancelling}
        withReason
        reasonLabel="Reason (optional, recorded in the audit log)"
        reasonPlaceholder="e.g. requested by participant, duplicate entry"
        confirmLabel="Cancel registration"
        cancelLabel="Keep it"
        onClose={() => !cancelling && setCancelTarget(null)}
        onConfirm={confirmCancelRegistration}
        message={
          cancelTarget && (
            <>
              <p>
                <span className="font-semibold text-slate-900">{cancelTarget.participant.name}</span>{' '}
                <span className="font-mono text-slate-500">({cancelTarget.registration_number})</span> will be
                marked <span className="font-semibold">cancelled</span>.
              </p>
              {cancelTarget.status === 'confirmed' ? (
                <p className="mt-2 text-slate-500">
                  Their seat is freed and the next person on the waiting list is moved in automatically.
                </p>
              ) : cancelTarget.status === 'waitlisted' ? (
                <p className="mt-2 text-slate-500">They are removed from the queue; everyone behind moves up.</p>
              ) : null}
            </>
          )
        }
      />
    </div>
  );
};
