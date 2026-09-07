import React from 'react';
import {
  Calendar,
  DoorOpen,
  CalendarClock,
  Radio,
  ClipboardList,
  CheckCircle2,
  Clock,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import type { DashboardOverview } from '../../../services/api';
import { fmtInt, fmtPct } from './format';
import type { DashboardCtx } from './types';

interface Card {
  label: string;
  value: React.ReactNode;
  icon: typeof Calendar;
  tint: string;
  onClick?: () => void;
}

export const KpiGrid: React.FC<{ kpis: DashboardOverview['kpis']; ctx: DashboardCtx }> = ({
  kpis,
  ctx,
}) => {
  const cards: Card[] = [
    { label: 'Total Events', value: fmtInt(kpis.total_events), icon: Calendar, tint: 'bg-slate-100 text-slate-600', onClick: () => ctx.onNavigateToEvents() },
    { label: 'Open Registration', value: fmtInt(kpis.open_registration), icon: DoorOpen, tint: 'bg-emerald-50 text-emerald-600', onClick: () => ctx.onNavigateToEvents('registration_open') },
    { label: 'Upcoming Events', value: fmtInt(kpis.upcoming_events), icon: CalendarClock, tint: 'bg-indigo-50 text-indigo-600', onClick: () => ctx.onNavigateToEvents('upcoming') },
    { label: 'Ongoing Events', value: fmtInt(kpis.ongoing_events), icon: Radio, tint: 'bg-sky-50 text-sky-600', onClick: () => ctx.onNavigateToEvents('ongoing') },
    { label: 'Total Registrations', value: fmtInt(kpis.total_registrations), icon: ClipboardList, tint: 'bg-slate-100 text-slate-600' },
    { label: 'Confirmed', value: fmtInt(kpis.confirmed), icon: CheckCircle2, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Waitlisted', value: fmtInt(kpis.waitlisted), icon: Clock, tint: 'bg-amber-50 text-amber-600', onClick: () => ctx.onNavigateToEvents() },
    { label: 'Checked In', value: fmtInt(kpis.checked_in), icon: UserCheck, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Attendance Rate', value: fmtPct(kpis.attendance_rate, 1), icon: TrendingUp, tint: 'bg-sky-50 text-sky-600' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            onClick={c.onClick}
            className={`bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex items-start justify-between gap-2 ${
              c.onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all' : ''
            }`}
          >
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                {c.label}
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{c.value}</div>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.tint}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
