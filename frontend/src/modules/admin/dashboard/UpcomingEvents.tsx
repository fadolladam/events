import React from 'react';
import { Calendar, MapPin, Users, QrCode } from 'lucide-react';
import type { DashboardEventRow } from '../../../services/api';
import { Section } from './primitives';
import { fmtDateTime, fmtDate, statusLabel, statusBadgeClass } from './format';
import type { DashboardCtx } from './types';

export const UpcomingEvents: React.FC<{ rows: DashboardEventRow[]; ctx: DashboardCtx }> = ({
  rows,
  ctx,
}) => (
  <Section title="Upcoming Events" subtitle="Next 8 by start date" empty={rows.length === 0}>
    <ul className="divide-y divide-slate-100 -mx-1">
      {rows.map((e) => (
        <li key={e.event_id} className="py-3 px-1 flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex flex-col items-center justify-center shrink-0">
            <span className="text-[9px] font-bold uppercase leading-none">
              {new Date(e.start_at ?? '').toLocaleDateString(undefined, { month: 'short' })}
            </span>
            <span className="text-sm font-extrabold leading-none mt-0.5">
              {new Date(e.start_at ?? '').getDate() || '—'}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <button
              onClick={() => ctx.onSelectEvent(e.event_slug ?? e.event_id, 'overview')}
              className="text-xs font-bold text-slate-900 hover:text-indigo-600 truncate block text-left"
            >
              {e.event_title}
            </button>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {fmtDateTime(e.start_at)}
              </span>
              {e.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {e.venue}
                </span>
              )}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${statusBadgeClass(e.dynamic_status)}`}
              >
                {statusLabel(e.dynamic_status)}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {e.confirmed}/{e.capacity} confirmed
              {e.waitlist > 0 && ` · ${e.waitlist} queued`}
              {' · closes '}
              {fmtDate(e.registration_close_at)}
              {typeof e.days_until === 'number' && (
                <span className="text-slate-500 font-semibold"> · in {e.days_until}d</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={() => ctx.onSelectEvent(e.event_slug ?? e.event_id, 'registrations')}
              title="Participants"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
            >
              <Users className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => ctx.onSelectEvent(e.event_slug ?? e.event_id, 'checkin')}
              title="Check-In"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  </Section>
);
