import React from 'react';
import { Plus, CopyPlus, ClipboardList, Clock, QrCode, FileDown } from 'lucide-react';
import type { DashboardOverview } from '../../../services/api';
import { Section } from './primitives';
import type { DashboardCtx } from './types';

export const QuickActions: React.FC<{
  overview: DashboardOverview;
  ctx: DashboardCtx;
  canCreate: boolean;
}> = ({ overview, ctx, canCreate }) => {
  const firstCheckin = overview.today_operations[0] ?? overview.active_events[0];
  const firstCheckinEvent = firstCheckin?.event_slug ?? firstCheckin?.event_id;
  const firstReport = overview.active_events[0] ?? overview.attendance_performance[0];
  const firstReportEvent = firstReport?.event_slug ?? firstReport?.event_id;

  const actions: { label: string; icon: typeof Plus; onClick?: () => void; show: boolean }[] = [
    { label: 'Create Event', icon: Plus, onClick: ctx.onCreateEvent, show: canCreate },
    { label: 'Create from Template', icon: CopyPlus, onClick: ctx.onCreateEvent, show: canCreate },
    { label: 'View Registrations', icon: ClipboardList, onClick: () => ctx.onNavigateToEvents(), show: true },
    { label: 'View Queues', icon: Clock, onClick: () => ctx.onNavigateToEvents(), show: true },
    {
      label: 'Open Check-In',
      icon: QrCode,
      onClick: firstCheckinEvent ? () => ctx.onSelectEvent(firstCheckinEvent, 'checkin') : undefined,
      show: true,
    },
    {
      label: 'Export Report',
      icon: FileDown,
      onClick: firstReportEvent ? () => ctx.onSelectEvent(firstReportEvent, 'reports') : undefined,
      show: true,
    },
  ];

  return (
    <Section title="Quick Actions">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {actions
          .filter((a) => a.show)
          .map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={a.onClick}
                disabled={!a.onClick}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                <Icon className="w-4 h-4 text-slate-400" />
                <span className="truncate">{a.label}</span>
              </button>
            );
          })}
      </div>
    </Section>
  );
};
