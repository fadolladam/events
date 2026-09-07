import React, { useState } from 'react';
import { apiClient, ROLE_TIERS, hasRole } from '../../../services/api';
import type { DashboardOverview } from '../../../services/api';
import { Section, StatTile, Th, Td } from './primitives';
import { relTime, fmtDateTime } from './format';
import type { DashboardCtx } from './types';

export const PendingApprovals: React.FC<{
  data: NonNullable<DashboardOverview['pending_approvals']>;
  ctx: DashboardCtx;
}> = ({ data, ctx }) => {
  const canDecide = hasRole(ctx.role, ROLE_TIERS.registration);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, 'approved' | 'rejected'>>({});

  const decide = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id);
    try {
      await apiClient.post(`/registrations/${id}/${action}`, action === 'reject' ? { reason: 'Rejected from dashboard' } : {});
      setDone((d) => ({ ...d, [id]: action === 'approve' ? 'approved' : 'rejected' }));
      ctx.refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action} registration.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section
      title="Pending Approvals"
      subtitle={`${data.total} awaiting a decision`}
      empty={data.total === 0}
      emptyLabel="No registrations awaiting approval."
    >
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatTile label="Total Pending" value={data.total} tone="warn" />
        <StatTile label="Oldest" value={relTime(data.oldest_at)} />
        <StatTile label="Events" value={data.events.length} />
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-left text-xs min-w-[620px]">
          <thead>
            <tr className="border-b border-slate-100">
              <Th>Participant</Th>
              <Th>Reg. Number</Th>
              <Th>Event</Th>
              <Th>Submitted</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {data.rows.map((r) => (
              <tr key={r.registration_id} className="hover:bg-slate-50/70">
                <Td>
                  <div className="font-bold text-slate-900">{r.participant ?? '—'}</div>
                  <div className="text-[10px] text-slate-400">{r.email}</div>
                </Td>
                <Td className="font-mono text-[11px] text-slate-500">{r.registration_number}</Td>
                <Td className="truncate max-w-[160px]">{r.event_title}</Td>
                <Td className="text-slate-500 whitespace-nowrap">{fmtDateTime(r.submitted_at)}</Td>
                <Td>
                  <div className="flex justify-end gap-1.5">
                    {done[r.registration_id] ? (
                      <span
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                          done[r.registration_id] === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {done[r.registration_id]}
                      </span>
                    ) : canDecide ? (
                      <>
                        <button
                          disabled={busy === r.registration_id}
                          onClick={() => decide(r.registration_id, 'approve')}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          disabled={busy === r.registration_id}
                          onClick={() => decide(r.registration_id, 'reject')}
                          className="px-2 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-[11px] disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => ctx.onSelectEvent(r.event_slug ?? r.event_id, 'registrations')}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-[11px]"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
};
