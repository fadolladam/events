import React from 'react';
import type { DashboardCapacityRow } from '../../../services/api';
import { Section, ProgressBar } from './primitives';
import { fmtPct } from './format';
import type { DashboardCtx } from './types';

const STATE_STYLE: Record<DashboardCapacityRow['state'], { badge: string; tone: 'good' | 'warn' | 'bad' | 'neutral' }> = {
  HEALTHY: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', tone: 'good' },
  'NEAR FULL': { badge: 'bg-amber-50 text-amber-700 border-amber-200', tone: 'warn' },
  FULL: { badge: 'bg-amber-100 text-amber-800 border-amber-300', tone: 'warn' },
  'OVER CAPACITY': { badge: 'bg-rose-50 text-rose-700 border-rose-200', tone: 'bad' },
};

export const CapacityUtilization: React.FC<{ rows: DashboardCapacityRow[]; ctx: DashboardCtx }> = ({
  rows,
  ctx,
}) => (
  <Section
    title="Capacity Utilization"
    subtitle="Active events, highest first"
    empty={rows.length === 0}
  >
    <ul className="space-y-3">
      {rows.map((r) => {
        const style = STATE_STYLE[r.state];
        return (
          <li key={r.event_id}>
            <button
              onClick={() => ctx.onSelectEvent(r.event_slug ?? r.event_id, 'overview')}
              className="w-full text-left group"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600">
                  {r.event_title}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {r.confirmed} / {r.capacity} · {fmtPct(r.pct, 1)}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${style.badge}`}>
                    {r.state}
                  </span>
                </span>
              </div>
              <ProgressBar pct={r.pct} tone={style.tone} />
              {r.queue > 0 && (
                <div className="text-[10px] text-amber-600 font-semibold mt-1">Queue: {r.queue} waiting</div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  </Section>
);
