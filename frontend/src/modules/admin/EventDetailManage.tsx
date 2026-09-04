import React, { useEffect, useState } from 'react';
import { apiClient, EventItem, Registration, getStoredUser, ROLE_TIERS, hasRole } from '../../services/api';
import { QrScannerConsole } from '../checkin/QrScannerConsole';
import { WaitlistQueuePage } from '../queue/WaitlistQueuePage';
import { AttendanceRoster } from '../attendance/AttendanceRoster';
import { EventReportsPage } from '../reports/EventReportsPage';
import { FormBuilderModal } from '../forms/FormBuilderModal';
import { EventSettingsModal } from './EventSettingsModal';
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
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface EventDetailManageProps {
  eventId: string;
  initialTab?: string;
  onBack: () => void;
}

export const EventDetailManage: React.FC<EventDetailManageProps> = ({
  eventId,
  initialTab = 'overview',
  onBack,
}) => {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [expandedRegId, setExpandedRegId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const role = getStoredUser()?.role;
  const canManage = hasRole(role, ROLE_TIERS.eventManager);
  const canRegistrations = hasRole(role, ROLE_TIERS.registration);
  const canCheckin = hasRole(role, ROLE_TIERS.checkin);

  useEffect(() => {
    fetchEvent();
    if (activeTab === 'registrations') {
      fetchRegistrations();
    }
  }, [eventId, activeTab]);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/events/${eventId}`);
      setEvent(res.data);
    } catch (err) {
      console.error('Failed to load event', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const res = await apiClient.get(`/events/${eventId}/registrations`);
      setRegistrations(res.data.data || []);
    } catch (err) {
      console.error('Failed to load registrations', err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await apiClient.patch(`/events/${eventId}/status`, { status: newStatus });
      fetchEvent();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  if (loading || !event) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading event management dashboard...</div>;
  }

  // Render dedicated sub-screens if active (role-gated — mirrors routes/api.php)
  if (activeTab === 'checkin' && canCheckin) {
    return <QrScannerConsole eventId={eventId} onBack={() => setActiveTab('overview')} />;
  }

  if (activeTab === 'queue' && canRegistrations) {
    return <WaitlistQueuePage eventId={eventId} onBack={() => setActiveTab('overview')} />;
  }

  if (activeTab === 'attendance' && canCheckin) {
    return <AttendanceRoster eventId={eventId} onBack={() => setActiveTab('overview')} />;
  }

  if (activeTab === 'reports') {
    return <EventReportsPage eventId={eventId} onBack={() => setActiveTab('overview')} />;
  }

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
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
          { key: 'overview', label: 'Overview', icon: LayoutDashboard, show: true, onClick: () => setActiveTab('overview') },
          { key: 'registrations', label: 'Registrations', icon: Users, show: canRegistrations, onClick: () => setActiveTab('registrations') },
          { key: 'form', label: 'Form Builder', icon: FileEdit, show: canManage, onClick: () => setFormModalOpen(true) },
          { key: 'queue', label: `Queue & Waitlist (${event.waitlist_count || 0})`, icon: Clock, show: canRegistrations, onClick: () => setActiveTab('queue') },
          { key: 'checkin', label: 'QR Check-In Console', icon: QrCode, show: canCheckin, onClick: () => setActiveTab('checkin') },
          { key: 'attendance', label: 'Attendance Roster', icon: CheckSquare, show: canCheckin, onClick: () => setActiveTab('attendance') },
          { key: 'reports', label: 'Analytics & Reports', icon: BarChart3, show: true, onClick: () => setActiveTab('reports') },
          { key: 'settings', label: 'Settings', icon: Settings, show: canManage, onClick: () => setSettingsModalOpen(true) },
        ]
          .filter((t) => t.show)
          .map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
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

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirmed</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {event.confirmed_count || 0} / {event.capacity}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {Math.max(0, event.capacity - (event.confirmed_count || 0))} Remaining Slots
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waitlist Queue</span>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">{event.waitlist_count || 0}</div>
              <span className="text-[11px] text-slate-500 mt-1 block">FIFO Active</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Checked In</span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">{event.checked_in_count || 0}</div>
              <span className="text-[11px] text-slate-500 mt-1 block">Live Attendance</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</span>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">{event.pending_count || 0}</div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {event.approval_mode === 'manual' ? 'Manual Review' : 'Auto Approval'}
              </span>
            </div>
          </div>

          {/* Quick Operations Launchpad */}
          <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl space-y-4">
            <h3 className="text-lg font-bold">Event Operations Launchpad</h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Conduct live onsite attendee check-ins, manage queue auto-promotions, or adjust dynamic registration questions.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              {canCheckin && (
              <button
                onClick={() => setActiveTab('checkin')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>Launch QR Check-In Console</span>
              </button>
              )}

              {canRegistrations && (
              <button
                onClick={() => setActiveTab('queue')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-2 transition-all"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Manage FIFO Waitlist Queue</span>
              </button>
              )}

              {canManage && (
              <button
                onClick={() => setFormModalOpen(true)}
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
      {activeTab === 'registrations' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Registered Participants ({registrations.length})</h3>
            <button onClick={fetchRegistrations} className="p-1.5 text-slate-400 hover:text-slate-600">
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

      {/* Form Builder Modal */}
      <FormBuilderModal
        eventId={eventId}
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
      />

      {/* Event Settings Modal */}
      <EventSettingsModal
        eventId={eventId}
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onSaved={(ev) => setEvent(ev)}
      />
    </div>
  );
};
