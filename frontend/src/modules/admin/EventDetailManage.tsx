import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiClient, EventItem, Registration, getStoredUser, ROLE_TIERS, hasRole } from '../../services/api';
import { paths } from '../../routes/paths';
import { QrScannerConsole } from '../checkin/QrScannerConsole';
import { WaitlistQueuePage } from '../queue/WaitlistQueuePage';
import { AttendanceRoster } from '../attendance/AttendanceRoster';
import { EventReportsPage } from '../reports/EventReportsPage';
import { FormBuilderModal } from '../forms/FormBuilderModal';
import { EventOverviewTab } from './EventOverviewTab';
import { EventSettingsModal } from './EventSettingsModal';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import {
  LayoutDashboard,
  Users,
  FileEdit,
  Clock,
  QrCode,
  CheckSquare,
  BarChart3,
  Settings,
  ArrowLeft,
  RefreshCw,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

export const EventDetailManage: React.FC = () => {
  const navigate = useNavigate();
  const { slug = '', tab: routeTab = 'overview' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const panel = searchParams.get('panel'); // 'form' | 'settings' | null

  const [event, setEvent] = useState<EventItem | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [expandedRegId, setExpandedRegId] = useState<string | null>(null);
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
      fetchRegistrations(eventUuid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeTab, eventUuid]);

  const fetchEvent = async () => {
    try {
      const res = await apiClient.get(`/events/${eventUuid || slug}`);
      setEvent(res.data);
    } catch (err) {
      console.error('Failed to load event', err);
    }
  };

  const fetchRegistrations = async (id: string) => {
    try {
      const res = await apiClient.get(`/events/${id}/registrations`);
      setRegistrations(res.data.data || []);
    } catch (err) {
      console.error('Failed to load registrations', err);
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
        </div>
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
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Registered Participants ({registrations.length})</h3>
            <button onClick={() => fetchRegistrations(eventUuid)} className="p-1.5 text-slate-400 hover:text-slate-600">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="py-3 px-4 w-8"></th>
                  <th className="py-3 px-4">Permanent Reg #</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">Registered On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">No registrations recorded yet.</td>
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
                          <td className="py-3.5 px-4 text-slate-400">{new Date(r.registered_at).toLocaleDateString()}</td>
                        </tr>

                        {isOpen && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={7} className="px-4 py-4">
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
    </div>
  );
};
