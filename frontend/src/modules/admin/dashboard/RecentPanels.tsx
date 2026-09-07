import React from 'react';
import { Activity } from 'lucide-react';
import type { DashboardOverview } from '../../../services/api';
import { Section, Th, Td } from './primitives';
import { relTime, fmtDateTime, regStatusBadgeClass } from './format';
import type { DashboardCtx } from './types';

export const RecentRegistrations: React.FC<{
  rows: DashboardOverview['recent_registrations'];
  ctx: DashboardCtx;
}> = ({ rows, ctx }) => (
  <Section title="Recent Registrations" empty={rows.length === 0}>
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-left text-xs min-w-[620px]">
        <thead>
          <tr className="border-b border-slate-100">
            <Th>Reg. Number</Th>
            <Th>Participant</Th>
            <Th>Event</Th>
            <Th>Status</Th>
            <Th>Queue</Th>
            <Th>Registered</Th>
            <Th>Source</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 text-slate-700">
          {rows.map((r) => (
            <tr
              key={r.registration_number}
              className="hover:bg-slate-50/70 cursor-pointer"
              onClick={() => ctx.onSelectEvent(r.event_slug ?? r.event_id, 'registrations')}
            >
              <Td className="font-mono text-[11px] text-slate-500">{r.registration_number}</Td>
              <Td className="font-bold text-slate-900">{r.participant ?? '—'}</Td>
              <Td className="truncate max-w-[150px]">{r.event_title}</Td>
              <Td>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${regStatusBadgeClass(r.status)}`}>
                  {r.status}
                </span>
              </Td>
              <Td>{r.queue_position ? `#${r.queue_position}` : '—'}</Td>
              <Td className="text-slate-500 whitespace-nowrap">{relTime(r.registered_at)}</Td>
              <Td className="text-slate-400 capitalize">{r.source ?? 'direct'}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Section>
);

export const RecentActivity: React.FC<{ rows: DashboardOverview['recent_activity'] }> = ({ rows }) => (
  <Section title="Recent Activity" empty={rows.length === 0}>
    <ul className="space-y-2.5">
      {rows.map((a, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[11px]">
          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
            <Activity className="w-3 h-3" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-slate-700">
              <span className="font-bold text-slate-900">{a.actor}</span> — {a.summary}
              {a.event_title && <span className="text-slate-400"> · {a.event_title}</span>}
            </div>
            <div className="text-slate-300">{fmtDateTime(a.created_at)}</div>
          </div>
        </li>
      ))}
    </ul>
  </Section>
);
