import React, { useEffect, useState } from 'react';
import { apiClient, EventItem, Registration } from '../../services/api';
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
  const [loading, setLoading] = useState(true);

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

  // Render dedicated sub-screens if active
  if (activeTab === 'checkin') {
    return <QrScannerConsole eventId={eventId} onBack={() => setActiveTab('overview')} />;
  }

  if (activeTab === 'queue') {
    return <WaitlistQueuePage eventId={eventId} onBack={() => setActiveTab('overview')} />;
  }

  if (activeTab === 'attendance') {
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

        {/* Status Toggle Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">Event Status:</span>
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
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold overflow-x-auto pb-px custom-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('registrations')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'registrations' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registrations</span>
        </button>

        <button
          onClick={() => setFormModalOpen(true)}
          className="pb-3 border-b-2 border-transparent text-slate-400 hover:text-slate-600 flex items-center gap-1.5 whitespace-nowrap transition-all"
        >
          <FileEdit className="w-4 h-4" />
          <span>Form Builder</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className="pb-3 border-b-2 border-transparent text-slate-400 hover:text-slate-600 flex items-center gap-1.5 whitespace-nowrap transition-all"
        >
          <Clock className="w-4 h-4" />
          <span>Queue & Waitlist ({event.waitlist_count || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('checkin')}
          className="pb-3 border-b-2 border-transparent text-slate-400 hover:text-slate-600 flex items-center gap-1.5 whitespace-nowrap transition-all"
        >
          <QrCode className="w-4 h-4" />
          <span>QR Check-In Console</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className="pb-3 border-b-2 border-transparent text-slate-400 hover:text-slate-600 flex items-center gap-1.5 whitespace-nowrap transition-all"
        >
          <CheckSquare className="w-4 h-4" />
          <span>Attendance Roster</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className="pb-3 border-b-2 border-transparent text-slate-400 hover:text-slate-600 flex items-center gap-1.5 whitespace-nowrap transition-all"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics & Reports</span>
        </button>

        <button
          onClick={() => setSettingsModalOpen(true)}
          className="pb-3 border-b-2 border-transparent text-slate-400 hover:text-slate-600 flex items-center gap-1.5 whitespace-nowrap transition-all"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
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
              <button
                onClick={() => setActiveTab('checkin')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>Launch QR Check-In Console</span>
              </button>

              <button
                onClick={() => setActiveTab('queue')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-2 transition-all"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Manage FIFO Waitlist Queue</span>
              </button>

              <button
                onClick={() => setFormModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-2 transition-all"
              >
                <FileEdit className="w-4 h-4 text-emerald-400" />
                <span>Edit Registration Questions</span>
              </button>
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
                    <td colSpan={6} className="py-12 text-center text-slate-400">No registrations recorded yet.</td>
                  </tr>
                ) : (
                  registrations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
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
                  ))
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
