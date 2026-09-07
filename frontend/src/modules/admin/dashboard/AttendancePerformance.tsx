import React from 'react';
import type { DashboardOverview } from '../../../services/api';
import { Section, Th, Td, ProgressBar } from './primitives';
import { fmtPct } from './format';
import type { DashboardCtx } from './types';

export const AttendancePerformance: React.FC<{
  rows: DashboardOverview['attendance_performance'];
  ctx: DashboardCtx;
}> = ({ rows, ctx }) => (
  <Section
    title="Attendance Performance"
    subtitle="Recent ongoing & completed events"
    empty={rows.length === 0}
  >
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-left text-xs min-w-[560px]">
        <thead>
          <tr className="border-b border-slate-100">
            <Th>Event</Th>
            <Th>Confirmed</Th>
            <Th>Checked In</Th>
            <Th>Attended</Th>
            <Th>No Show</Th>
            <Th>Rate</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 text-slate-700">
          {rows.map((r) => {
            const tone = r.attendance_rate >= 80 ? 'good' : r.attendance_rate >= 50 ? 'warn' : 'bad';
            return (
              <tr
                key={r.event_id}
                className="hover:bg-slate-50/70 cursor-pointer"
                onClick={() => ctx.onSelectEvent(r.event_slug ?? r.event_id, 'attendance')}
              >
                <Td>
                  <div className="font-bold text-slate-900 truncate max-w-[200px]">{r.event_title}</div>
                  <div className="font-mono text-[10px] text-indigo-500">{r.event_code}</div>
                </Td>
                <Td className="font-bold">{r.confirmed}</Td>
                <Td>{r.checked_in}</Td>
                <Td>{r.attended}</Td>
                <Td className={r.no_show > 0 ? 'text-rose-600 font-semibold' : ''}>{r.no_show}</Td>
                <Td>
                  <div className="w-24">
                    <div className="text-[10px] text-slate-400 mb-0.5">{fmtPct(r.attendance_rate)}</div>
                    <ProgressBar pct={r.attendance_rate} tone={tone} />
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </Section>
);
