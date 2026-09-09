import React, { useEffect, useState } from 'react';
import { apiClient, EventItem, Registration } from '../../services/api';
import { toast } from '../../components/uiFeedback';
import { Clock, Users, ArrowUpCircle, ShieldCheck, History, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface WaitlistQueuePageProps {
  eventId: string;
  onBack: () => void;
  /** rendered inside the Event console shell — hide own page chrome */
  embedded?: boolean;
}

export const WaitlistQueuePage: React.FC<WaitlistQueuePageProps> = ({ eventId, onBack, embedded = false }) => {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [waitlist, setWaitlist] = useState<Registration[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Registration | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evRes, wlRes, histRes] = await Promise.all([
        apiClient.get(`/events/${eventId}`),
        apiClient.get(`/events/${eventId}/waitlist`),
        apiClient.get(`/events/${eventId}/waitlist/history`),
      ]);

      setEvent(evRes.data);
      setWaitlist(wlRes.data);
      setHistory(histRes.data.data || []);
    } catch (err) {
      console.error('Failed to load queue data', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteEligible = async () => {
    setPromoting(true);
    setMessage(null);
    try {
      const res = await apiClient.post(`/events/${eventId}/waitlist/promote`);
      setMessage(res.data.message || 'Promotion check executed.');
      fetchData();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to promote waitlisted attendees.', 'error');
    } finally {
      setPromoting(false);
    }
  };

  const confirmRemoveFromQueue = async (reason: string) => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await apiClient.post(`/registrations/${removeTarget.id}/cancel`, {
        reason: reason || 'Removed from waiting list by administrator',
      });
      setRemoveTarget(null);
      setMessage('Removed from the waiting list.');
      fetchData();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to remove this person from the queue.', 'error');
    } finally {
      setRemoving(false);
    }
  };

  const handlePriorityChange = async (registrationId: string, newPriority: number) => {
    try {
      await apiClient.patch(`/waitlist/${registrationId}/priority`, { priority: newPriority });
      fetchData();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to update priority.', 'error');
    }
  };

  const actions = (
    <div className="flex items-center gap-2">
      <button
        onClick={fetchData}
        className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
        title="Refresh Queue"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      <button
        onClick={handlePromoteEligible}
        disabled={promoting || waitlist.length === 0}
        className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
      >
        <ArrowUpCircle className="w-4 h-4" />
        <span>{promoting ? 'Promoting...' : 'Promote Next in Queue'}</span>
      </button>
    </div>
  );

  return (
    <div className={embedded ? 'space-y-6' : 'p-6 sm:p-8 space-y-6 max-w-6xl mx-auto'}>
      {embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Waitlist &amp; Queue Management</h2>
            <p className="text-xs text-slate-500">FIFO automated waiting list. Auto-promotes on cancellations.</p>
          </div>
          {actions}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Event Details</span>
            </button>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Waitlist &amp; Queue Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              FIFO automated waiting list for <strong>{event?.title}</strong> ({event?.event_code}).
            </p>
          </div>
          {actions}
        </div>
      )}

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {message}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirmed Capacity</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {event?.confirmed_count || 0} / {event?.capacity || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {Math.max(0, (event?.capacity || 0) - (event?.confirmed_count || 0))} Available Seat(s)
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currently Waiting</span>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{waitlist.length}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Strict FIFO Ordered</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auto-Promotion</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">ACTIVE</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Triggers on cancellations</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'queue'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Live Queue ({waitlist.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Promotion History</span>
        </button>
      </div>

      {/* Tab 1: Queue Table */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="py-3 px-4">Queue Pos</th>
                  <th className="py-3 px-4">Reg Number</th>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Waitlisted At</th>
                  <th className="py-3 px-4">Priority Rank</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">Loading waitlist queue...</td>
                  </tr>
                ) : waitlist.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">The waitlist is currently empty.</td>
                  </tr>
                ) : (
                  waitlist.map((reg, idx) => (
                    <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-amber-600">
                        #{idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {reg.registration_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{reg.participant.name}</div>
                        <div className="text-[11px] text-slate-400">{reg.participant.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {reg.waitlisted_at ? new Date(reg.waitlisted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={reg.waitlist_priority}
                          onChange={(e) => handlePriorityChange(reg.id, Number(e.target.value))}
                          className="px-2 py-1 rounded-md border border-slate-200 text-xs font-medium bg-white"
                        >
                          <option value="0">Normal (0)</option>
                          <option value="1">High (+1)</option>
                          <option value="2">VIP (+2)</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setRemoveTarget(reg)}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-[11px]"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove from the waiting list?"
        tone="danger"
        busy={removing}
        withReason
        reasonLabel="Reason (optional, recorded in the audit log)"
        reasonPlaceholder="e.g. no longer able to attend"
        confirmLabel="Remove from queue"
        cancelLabel="Keep in queue"
        onClose={() => !removing && setRemoveTarget(null)}
        onConfirm={confirmRemoveFromQueue}
        message={
          removeTarget && (
            <p>
              <span className="font-semibold text-slate-900">{removeTarget.participant.name}</span>{' '}
              <span className="font-mono text-slate-500">({removeTarget.registration_number})</span> will be
              cancelled and dropped from the queue. Everyone behind them moves up a place.
            </p>
          )
        }
      />

      {/* Tab 2: History Log */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Position Shift</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">No waitlist history recorded yet.</td>
                  </tr>
                ) : (
                  history.map((h: any) => (
                    <tr key={h.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-bold uppercase text-[10px] text-indigo-600">{h.action}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{h.registration?.participant?.name || 'Attendee'}</td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {h.previous_position ? `#${h.previous_position}` : '-'} → {h.new_position ? `#${h.new_position}` : 'Confirmed'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{h.notes}</td>
                      <td className="py-3.5 px-4 text-slate-400">{new Date(h.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
