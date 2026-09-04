import React, { useEffect, useState } from 'react';
import { apiClient, EventItem, Registration } from '../../services/api';
import { Calendar, Users, CheckCircle2, Clock, ArrowRight, TrendingUp, Plus, ShieldAlert, FileText, QrCode } from 'lucide-react';
import { eventCover, onCoverError } from '../../lib/eventMedia';

interface GlobalDashboardProps {
  onNavigateToEvents: () => void;
  onCreateEvent: () => void;
  onSelectEvent: (event: EventItem, tab?: string) => void;
}

export const GlobalDashboard: React.FC<GlobalDashboardProps> = ({
  onNavigateToEvents,
  onCreateEvent,
  onSelectEvent,
}) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 p-6 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Organization Overview</h1>
          <p className="text-xs text-slate-500 mt-1">Multi-event administration & live operations control center.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCreateEvent}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Events</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total_events}</div>
            <span className="text-[11px] font-semibold text-indigo-600 mt-1 block">
              {stats.open_events} Open for Registration
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Confirmed</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total_confirmed}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Across {stats.total_participants} Unique Attendees
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Waitlist Queue</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total_waitlisted}</div>
            <span className="text-[11px] text-amber-600 font-semibold mt-1 block">
              FIFO Auto-promotion Active
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.overall_attendance_rate}%</div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {stats.total_checked_in} Checked In
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Active Events & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Events Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Active & Recent Events</h2>
            <button
              onClick={onNavigateToEvents}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View All Events</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="pb-3">Event Code & Title</th>
                  <th className="pb-3">Capacity</th>
                  <th className="pb-3">Waitlist</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Quick Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(stats.recent_events || []).map((ev: EventItem) => (
                  <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5">
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
                    <td className="py-3.5">
                      <span className="font-semibold text-slate-900">{ev.confirmed_count || 0}</span> / {ev.capacity}
                    </td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-amber-50 text-amber-700 border border-amber-200/60">
                        {ev.waitlist_count || 0}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => onSelectEvent(ev, 'checkin')}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                        title="Open QR Scanner & Check-In"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSelectEvent(ev, 'queue')}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-amber-50 hover:text-amber-600 text-slate-600 transition-colors"
                        title="Manage Queue"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSelectEvent(ev, 'overview')}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Registrations Feed (1 Col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Recent Registrations</h2>

          <div className="space-y-3">
            {(stats.recent_registrations || []).map((reg: Registration) => (
              <div key={reg.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 truncate max-w-[140px]">
                    {reg.participant?.name || 'Attendee'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {reg.registration_number}
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    reg.status === 'confirmed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {reg.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
