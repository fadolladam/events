import React from 'react';
import { CalendarCheck, QrCode, Users, ClipboardCheck } from 'lucide-react';
import type { DashboardTodayRow } from '../../../services/api';
import { ProgressBar } from './primitives';
import { fmtTime, fmtPct } from './format';
import type { DashboardCtx } from './types';

const STATE_BADGE: Record<string, string> = {
  'NOT STARTED': 'bg-slate-100 text-slate-600',
  'IN PROGRESS': 'bg-sky-100 text-sky-700',
  COMPLETE: 'bg-emerald-100 text-emerald-700',
  'NO CONFIRMED': 'bg-slate-100 text-slate-500',
};

export const TodayOperations: React.FC<{ rows: DashboardTodayRow[]; ctx: DashboardCtx }> = ({
  rows,
  ctx,
}) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs px-5 py-4 flex items-center gap-3">
        <CalendarCheck className="w-5 h-5 text-slate-300" />
        <div>
          <div className="text-sm font-bold text-slate-900">Today's Operations</div>
          <div className="text-xs text-slate-400">No events scheduled for today.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 shadow-xs p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        <h2 className="text-sm font-extrabold text-slate-900">Today's Operations</h2>
        <span className="text-[11px] text-slate-500">
          {rows.length} event{rows.length > 1 ? 's' : ''} live today
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((e) => {
          const notIn = e.not_checked_in;
          return (
            <div key={e.event_id} className="rounded-xl bg-white border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{e.event_title}</div>
                  <div className="text-[11px] text-slate-400">
                    {fmtTime(e.start_at)} – {fmtTime(e.end_at)}
                    {e.venue && ` · ${e.venue}`}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                    STATE_BADGE[e.checkin_state] ?? 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {e.checkin_state}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1 my-3 text-center">
                {[
                  ['Confirmed', e.confirmed],
                  ['Waitlist', e.waitlisted],
                  ['Checked In', e.checked_in],
                  ['Not In', notIn],
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <div className="text-sm font-extrabold text-slate-900">{val as number}</div>
                    <div className="text-[9px] uppercase tracking-wide text-slate-400">{label}</div>
                  </div>
                ))}
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Attendance</span>
                  <span>{fmtPct(e.attendance_pct)}</span>
                </div>
                <ProgressBar pct={e.attendance_pct} tone="good" />
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => ctx.onSelectEvent(e.event_slug ?? e.event_id, 'checkin')}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center justify-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" /> Open Check-In
                </button>
                <button
                  onClick={() => ctx.onSelectEvent(e.event_slug ?? e.event_id, 'registrations')}
                  title="Participants"
                  className="px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <Users className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => ctx.onSelectEvent(e.event_slug ?? e.event_id, 'attendance')}
                  title="Attendance"
                  className="px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
