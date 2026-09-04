import React, { useEffect, useState } from 'react';
import { apiClient, EventItem, getStoredUser, ROLE_TIERS, hasRole } from '../../services/api';
import { Plus, Search, Filter, QrCode, Clock, Users, FileEdit, Copy, Trash2, ArrowRight } from 'lucide-react';
import { eventCover, onCoverError } from '../../lib/eventMedia';

interface EventsManagementProps {
  onCreateEvent: () => void;
  onSelectEvent: (event: EventItem, tab?: string) => void;
}

export const EventsManagement: React.FC<EventsManagementProps> = ({
  onCreateEvent,
  onSelectEvent,
}) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const role = getStoredUser()?.role;
  const canManage = hasRole(role, ROLE_TIERS.eventManager);
  const canRegistrations = hasRole(role, ROLE_TIERS.registration);
  const canCheckin = hasRole(role, ROLE_TIERS.checkin);

  useEffect(() => {
    fetchEvents();
  }, [statusFilter]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await apiClient.get('/events', { params });
      setEvents(res.data.data || []);
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    if (!confirm('Duplicate this event configuration, settings, and form fields?')) return;

    try {
      await apiClient.post(`/events/${eventId}/duplicate`);
      fetchEvents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to duplicate event.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete or archive this event?')) return;

    try {
      await apiClient.delete(`/events/${eventId}`);
      fetchEvents();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete event.');
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Events Management</h1>
          <p className="text-xs text-slate-500 mt-1">Configure and manage all organization events.</p>
        </div>

        {canManage && (
          <button
            onClick={onCreateEvent}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Event Wizard</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search events by name, code, venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchEvents()}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="upcoming">Upcoming</option>
          <option value="registration_open">Registration Open</option>
          <option value="full">Full</option>
          <option value="registration_closed">Registration Closed</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                <th className="py-3 px-4">Event Code & Title</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Waitlist</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading events...</td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">No events found matching your criteria.</td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => onSelectEvent(ev, 'overview')}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={eventCover(ev)}
                          onError={(e) => onCoverError(e, ev)}
                          alt=""
                          loading="lazy"
                          className="w-14 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{ev.title}</div>
                          <div className="text-[11px] font-mono text-indigo-600">{ev.event_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 capitalize">{ev.event_type}</td>
                    <td className="py-3.5 px-4">
                      <div>{new Date(ev.start_at).toLocaleDateString()}</div>
                      <div className="text-[11px] text-slate-400">{new Date(ev.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900">{ev.confirmed_count || 0}</span> / {ev.capacity}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-amber-50 text-amber-700 border border-amber-200/60">
                        {ev.waitlist_count || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      {canCheckin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectEvent(ev, 'checkin'); }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                          title="QR Scanner & Check-In"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canRegistrations && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectEvent(ev, 'queue'); }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-amber-50 hover:text-amber-600 text-slate-600 transition-colors"
                          title="Queue & Waitlist"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={(e) => handleDuplicate(e, ev.id)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                          title="Duplicate Event"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={(e) => handleDelete(e, ev.id)}
                          className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-colors"
                          title="Delete / Archive Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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
