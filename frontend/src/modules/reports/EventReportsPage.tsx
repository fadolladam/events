import React, { useEffect, useState } from 'react';
import { apiClient, EventItem } from '../../services/api';
import { Download, FileText, ArrowLeft, TrendingUp, Users, CheckCircle2, Clock } from 'lucide-react';

interface EventReportsPageProps {
  eventId: string;
  onBack: () => void;
  /** rendered inside the Event console shell — hide own page chrome */
  embedded?: boolean;
}

export const EventReportsPage: React.FC<EventReportsPageProps> = ({ eventId, onBack, embedded = false }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [eventId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/events/${eventId}/analytics`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    window.open(`/api/events/${eventId}/export/csv`, '_blank');
  };

  const handleDownloadPdf = () => {
    window.open(`/api/events/${eventId}/export/pdf`, '_blank');
  };

  if (loading || !data) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading analytics & report metrics...</div>;
  }

  const { event } = data;

  const exportButtons = (
    <div className="flex items-center gap-3">
      <button
        onClick={handleDownloadCsv}
        className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs flex items-center gap-2 transition-all"
      >
        <Download className="w-4 h-4 text-emerald-600" />
        <span>Export CSV</span>
      </button>

      <button
        onClick={handleDownloadPdf}
        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all"
      >
        <FileText className="w-4 h-4 text-indigo-400" />
        <span>Download PDF Report</span>
      </button>
    </div>
  );

  return (
    <div className={embedded ? 'space-y-6' : 'p-6 sm:p-8 space-y-6 max-w-6xl mx-auto'}>
      {/* Header */}
      {embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Event Analytics &amp; Exports</h2>
            <p className="text-xs text-slate-500">Live reporting metrics and downloadable reports.</p>
          </div>
          {exportButtons}
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
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Event Analytics &amp; Exports</h1>
            <p className="text-xs text-slate-500">Live reporting metrics for {event.title} ({event.event_code})</p>
          </div>
          {exportButtons}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capacity Utilization</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{data.capacity_utilization}%</div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {data.confirmed} / {data.capacity} Confirmed
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{data.attendance_rate}%</div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {data.checked_in} Checked In
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waiting List</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{data.waitlisted}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {data.pending} Pending Approvals
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No Show Rate</span>
          <div className="text-2xl font-extrabold text-red-600 mt-1">{data.no_show}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {data.cancelled} Cancelled
          </span>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Registration by Date */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Registrations Timeline</h3>
          <div className="space-y-2">
            {(data.registrations_by_date || []).map((row: any) => (
              <div key={row.date} className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-700">{row.date}</span>
                <span className="font-mono font-bold text-indigo-600">{row.count} registrants</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sources Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Registration Acquisition Channels</h3>
          <div className="space-y-2">
            {(data.sources || []).map((s: any) => (
              <div key={s.source} className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-700 capitalize">{s.source || 'Direct'}</span>
                <span className="font-mono font-bold text-slate-900">{s.count} attendees</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
