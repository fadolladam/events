import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { DashboardOverview } from '../../../services/api';
import { Section, StatTile, Th, Td } from './primitives';
import { fmtDate, relTime } from './format';
import type { DashboardCtx } from './types';

export const WaitlistOverview: React.FC<{
  data: DashboardOverview['waitlist'];
  ctx: DashboardCtx;
}> = ({ data, ctx }) => (
  <Section
    title="Waitlist Overview"
    subtitle={`${data.events_with_waitlist} event${data.events_with_waitlist === 1 ? '' : 's'} with a queue`}
    empty={data.total_waitlisted === 0}
    emptyLabel="No active waitlists."
  >
    <div className="grid grid-cols-3 gap-2 mb-4">
      <StatTile label="Total Waitlisted" value={data.total_waitlisted} tone="warn" />
      <StatTile label="Events w/ Queue" value={data.events_with_waitlist} />
      <StatTile
        label="Largest Queue"
        value={data.largest_queue?.count ?? 0}
        hint={data.largest_queue?.event_title}
      />
    </div>

    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-left text-xs min-w-[560px]">
        <thead>
          <tr className="border-b border-slate-100">
            <Th>Event</Th>
            <Th>Confirmed / Cap</Th>
            <Th>Queue</Th>
            <Th>Oldest Wait</Th>
            <Th>Reg. Closes</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 text-slate-700">
          {data.table.map((r) => (
            <tr key={r.event_id} className="hover:bg-slate-50/70">
              <Td>
                <div className="font-bold text-slate-900 truncate max-w-[180px]">{r.event_title}</div>
                <div className="font-mono text-[10px] text-indigo-500">{r.event_code}</div>
              </Td>
              <Td>
                {r.confirmed} / {r.capacity}
              </Td>
              <Td>
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">{r.queue}</span>
              </Td>
              <Td className="text-slate-500">{relTime(r.oldest_wait_at)}</Td>
              <Td className="text-slate-500">{fmtDate(r.registration_close_at)}</Td>
              <Td>
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => ctx.onSelectEvent(r.event_slug ?? r.event_id, 'queue')}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px]"
                  >
                    View Queue
                  </button>
                  <button
                    onClick={() => ctx.onSelectEvent(r.event_slug ?? r.event_id, 'settings')}
                    className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-[11px]"
                  >
                    Capacity
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {data.recent_promotions.length > 0 && (
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Recent Queue Promotions
        </div>
        <ul className="space-y-1.5">
          {data.recent_promotions.slice(0, 6).map((p, i) => (
            <li key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="font-semibold text-slate-800">{p.participant ?? 'Participant'}</span>
              <span className="text-slate-400">promoted · {p.event_title}</span>
              <span className="text-slate-300 ml-auto">{relTime(p.promoted_at)}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </Section>
);
