import React from 'react';
import { Check, X, ArrowRight } from 'lucide-react';
import type { DashboardReadiness } from '../../../services/api';
import { Section } from './primitives';
import type { DashboardCtx } from './types';

const REMEDY_TAB: Record<string, string> = {
  'Registration Form': 'form',
  'Check-In Staff': 'settings',
  'Public Page': 'settings',
  'Event Details': 'settings',
  'Date & Time': 'settings',
  Venue: 'settings',
  Capacity: 'settings',
  Notifications: 'settings',
};

export const EventReadiness: React.FC<{ rows: DashboardReadiness[]; ctx: DashboardCtx }> = ({
  rows,
  ctx,
}) => (
  <Section
    title="Event Readiness"
    subtitle="Upcoming events — operational checklist"
    empty={rows.length === 0}
  >
    <div className="space-y-4">
      {rows.map((r) => {
        const gap = r.items.find((i) => !i.ok);
        const ready = r.ready_count === r.total;
        return (
          <div key={r.event_id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <button
                onClick={() => ctx.onSelectEvent(r.event_slug ?? r.event_id, 'overview')}
                className="text-xs font-bold text-slate-900 hover:text-indigo-600 truncate"
              >
                {r.event_title}
              </button>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {r.ready_count} / {r.total} Ready
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5">
              {r.items.map((it) => (
                <span
                  key={it.label}
                  className={`flex items-center gap-1.5 text-[11px] ${
                    it.ok ? 'text-slate-500' : 'text-rose-600 font-semibold'
                  }`}
                >
                  {it.ok ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  )}
                  <span className="truncate">{it.label}</span>
                </span>
              ))}
            </div>

            {gap && (
              <button
                onClick={() => ctx.onSelectEvent(r.event_slug ?? r.event_id, REMEDY_TAB[gap.label] ?? 'overview')}
                className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] inline-flex items-center gap-1"
              >
                Resolve: {gap.label}
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  </Section>
);
