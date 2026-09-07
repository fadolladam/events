import React, { useState } from 'react';
import { QrCode, Clock, Users, BarChart3 } from 'lucide-react';
import type { DashboardEventRow } from '../../../services/api';
import { Section, Th, Td, ProgressBar } from './primitives';
import { fmtDate, fmtPct, statusLabel, statusBadgeClass } from './format';
import type { DashboardCtx } from './types';

const PAGE = 8;

export const ActiveEventsTable: React.FC<{ rows: DashboardEventRow[]; ctx: DashboardCtx }> = ({
  rows,
  ctx,
}) => {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const slice = rows.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <Section
      title="Active Events"
      subtitle={`${rows.length} operationally relevant`}
      empty={rows.length === 0}
      emptyLabel="No active events right now."
      className="lg:col-span-2"
    >
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-left text-xs min-w-[820px]">
          <thead>
            <tr className="border-b border-slate-100">
              <Th>Event</Th>
              <Th>Status</Th>
              <Th>Date</Th>
              <Th>Capacity</Th>
              <Th>Confirmed</Th>
              <Th>Avail.</Th>
              <Th>Queue</Th>
              <Th>Pend.</Th>
              <Th>Check-In</Th>
              <Th>Reg. Deadline</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {slice.map((e) => {
              const util = e.capacity > 0 ? (e.confirmed / e.capacity) * 100 : 0;
              const tone = e.confirmed > e.capacity ? 'bad' : util >= 90 ? 'warn' : 'good';
              return (
                <tr key={e.event_id} className="hover:bg-slate-50/70">
                  <Td>
                    <button
                      onClick={() => ctx.onSelectEvent(e.event_slug ?? e.event_id, 'overview')}
                      className="text-left"
                    >
                      <div className="font-bold text-slate-900 truncate max-w-[190px]">{e.event_title}</div>
                      <div className="font-mono text-[10px] text-indigo-500">{e.event_code}</div>
                    </button>
                  </Td>
                  <Td>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeClass(e.dynamic_status)}`}
                    >
                      {statusLabel(e.dynamic_status)}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-slate-500">{fmtDate(e.start_at)}</Td>
                  <Td>
                    <div className="w-24">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>{e.confirmed}/{e.capacity}</span>
                        <span>{fmtPct(util)}</span>
                      </div>
                      <ProgressBar pct={util} tone={tone} />
                    </div>
                  </Td>
                  <Td className="font-bold text-slate-900">{e.confirmed}</Td>
                  <Td className={e.available === 0 ? 'text-rose-600 font-bold' : ''}>{e.available}</Td>
                  <Td>
                    {e.waitlist > 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[11px]">
                        {e.waitlist}
                      </span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </Td>
                  <Td>{e.pending > 0 ? <span className="text-indigo-600 font-bold">{e.pending}</span> : <span className="text-slate-300">0</span>}</Td>
                  <Td>
                    {e.checked_in} <span className="text-slate-400">({fmtPct(e.attendance_pct)})</span>
                  </Td>
                  <Td className="whitespace-nowrap text-slate-500">{fmtDate(e.registration_close_at)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn title="Participants" onClick={() => ctx.onSelectEvent(e.event_slug ?? e.event_id, 'registrations')}><Users className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn title="Queue" onClick={() => ctx.onSelectEvent(e.event_slug ?? e.event_id, 'queue')}><Clock className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn title="Check-In" onClick={() => ctx.onSelectEvent(e.event_slug ?? e.event_id, 'checkin')}><QrCode className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn title="Analytics" onClick={() => ctx.onSelectEvent(e.event_slug ?? e.event_id, 'reports')}><BarChart3 className="w-3.5 h-3.5" /></IconBtn>
                      <button
                        onClick={() => ctx.onSelectEvent(e.event_slug ?? e.event_id, 'overview')}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px]"
                      >
                        Manage
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between pt-3 text-[11px] text-slate-500">
          <span>
            Page {page + 1} of {pages}
          </span>
          <div className="flex gap-1.5">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Section>
  );
};

const IconBtn: React.FC<{ title: string; onClick: () => void; children: React.ReactNode }> = ({
  title,
  onClick,
  children,
}) => (
  <button
    title={title}
    onClick={onClick}
    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
  >
    {children}
  </button>
);
