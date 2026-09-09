import React, { useEffect, useState } from 'react';
import { apiClient, Registration, EventItem } from '../../services/api';
import { toast } from '../../components/uiFeedback';
import { CheckCircle2, Clock, XCircle, ArrowLeft, Search, Filter } from 'lucide-react';

interface AttendanceRosterProps {
  eventId: string;
  onBack: () => void;
  /** rendered inside the Event console shell — hide own page chrome */
  embedded?: boolean;
}

export const AttendanceRoster: React.FC<AttendanceRosterProps> = ({ eventId, onBack, embedded = false }) => {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [eventId, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evRes, attRes] = await Promise.all([
        apiClient.get(`/events/${eventId}`),
        apiClient.get(`/events/${eventId}/attendance`, {
          params: { status: statusFilter || undefined },
        }),
      ]);
      setEvent(evRes.data);
      setRegistrations(attRes.data.data || []);
    } catch (err) {
      console.error('Failed to load attendance', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (regId: string, newStatus: string) => {
    try {
      await apiClient.post(`/events/${eventId}/attendance/mark`, {
        registration_id: regId,
        status: newStatus,
      });
      fetchData();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to update attendance status.', 'error');
    }
  };

  const filteredRegistrations = registrations.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.participant.name.toLowerCase().includes(q) ||
      r.participant.email.toLowerCase().includes(q) ||
      r.registration_number.toLowerCase().includes(q)
    );
  });

  return (
    <div className={embedded ? 'space-y-6' : 'p-6 sm:p-8 space-y-6 max-w-6xl mx-auto'}>
      {/* Header */}
      {embedded ? (
        <div>
          <h2 className="text-base font-bold text-slate-900">Attendance Roster</h2>
          <p className="text-xs text-slate-500">Track and manage attendance records for this event.</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Event</span>
            </button>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Attendance Roster</h1>
            <p className="text-xs text-slate-500">Track and manage attendance records for {event?.title}</p>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search attendee by name, registration #, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
        >
          <option value="">All Attendance Statuses</option>
          <option value="not_checked_in">Not Checked In</option>
          <option value="checked_in">Checked In</option>
          <option value="attended">Attended</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                <th className="py-3 px-4">Reg Number</th>
                <th className="py-3 px-4">Participant Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Checked In At</th>
                <th className="py-3 px-4">Current Attendance Status</th>
                <th className="py-3 px-4 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">Loading attendance roster...</td>
                </tr>
              ) : filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">No attendees found.</td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{reg.registration_number}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{reg.participant.name}</td>
                    <td className="py-3.5 px-4 text-slate-500">{reg.participant.email}</td>
                    <td className="py-3.5 px-4">
                      {reg.checked_in_at ? new Date(reg.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          reg.attendance_status === 'checked_in' || reg.attendance_status === 'attended'
                            ? 'bg-emerald-100 text-emerald-800'
                            : reg.attendance_status === 'no_show'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {reg.attendance_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <select
                        value={reg.attendance_status}
                        onChange={(e) => handleStatusChange(reg.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                      >
                        <option value="not_checked_in">Not Checked In</option>
                        <option value="checked_in">Checked In</option>
                        <option value="attended">Attended</option>
                        <option value="no_show">No Show</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
