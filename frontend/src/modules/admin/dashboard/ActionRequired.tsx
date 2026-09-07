import React from 'react';
import { ArrowRight, ShieldAlert } from 'lucide-react';
import type { DashboardActionItem } from '../../../services/api';
import { Section, PriorityBadge } from './primitives';
import type { DashboardCtx } from './types';

const TAB_CTA: Record<string, string> = {
  queue: 'View Queue',
  checkin: 'Open Check-In',
  settings: 'Open Settings',
  registrations: 'Review Registrations',
  form: 'Edit Form',
  attendance: 'Finalise Attendance',
  reports: 'View Logs',
};

export const ActionRequired: React.FC<{ items: DashboardActionItem[]; ctx: DashboardCtx }> = ({
  items,
  ctx,
}) => {
  const counts = items.reduce<Record<string, number>>((a, i) => {
    a[i.priority] = (a[i.priority] ?? 0) + 1;
    return a;
  }, {});

  return (
    <Section
      title="Action Required"
      subtitle={
        items.length
          ? `${items.length} item${items.length > 1 ? 's' : ''} need attention`
          : undefined
      }
      empty={items.length === 0}
      emptyLabel="All clear — no operational issues detected."
      actions={
        items.length ? (
          <div className="flex items-center gap-1.5">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const)
              .filter((p) => counts[p])
              .map((p) => (
                <span key={p} className="flex items-center gap-1">
                  <PriorityBadge priority={p} />
                  <span className="text-[11px] font-bold text-slate-500">{counts[p]}</span>
                </span>
              ))}
          </div>
        ) : (
          <ShieldAlert className="w-4 h-4 text-emerald-500" />
        )
      }
    >
      <ul className="divide-y divide-slate-100 -mx-1">
        {items.map((it, idx) => (
          <li key={`${it.event_id}-${it.type}-${idx}`} className="py-3 px-1 flex items-start gap-3">
            <div className="pt-0.5">
              <PriorityBadge priority={it.priority} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900">
                {it.issue}
                <span className="text-slate-400 font-medium"> · {it.event_title}</span>
                <span className="font-mono text-[10px] text-indigo-500"> {it.event_code}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{it.detail}</div>
              <div className="text-[11px] text-slate-400 mt-0.5 italic">{it.recommended_action}</div>
            </div>
            <button
              onClick={() => ctx.onSelectEvent(it.event_slug ?? it.event_id, it.action_target.tab)}
              className="shrink-0 self-center px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
            >
              {TAB_CTA[it.action_target.tab] ?? 'Open'}
              <ArrowRight className="w-3 h-3" />
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
};
