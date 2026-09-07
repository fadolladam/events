import React from 'react';
import type { DashboardOverview, DashboardRange } from '../../../services/api';
import { Section } from './primitives';
import { TrendChart, Donut, PALETTE } from './charts';
import { fmtInt } from './format';

const RANGE_BTNS: { key: DashboardRange; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
];

export const RegistrationTrend: React.FC<{
  data: DashboardOverview['registration_trend'];
  range: DashboardRange;
  onRangeChange: (r: DashboardRange) => void;
}> = ({ data, range, onRangeChange }) => {
  const totals = data.reduce(
    (a, d) => ({
      total: a.total + d.total,
      confirmed: a.confirmed + d.confirmed,
      waitlisted: a.waitlisted + d.waitlisted,
      cancelled: a.cancelled + d.cancelled,
    }),
    { total: 0, confirmed: 0, waitlisted: 0, cancelled: 0 },
  );

  return (
    <Section
      title="Registrations Over Time"
      subtitle={`${fmtInt(totals.total)} in range · ${fmtInt(totals.confirmed)} confirmed · ${fmtInt(
        totals.waitlisted,
      )} waitlisted · ${fmtInt(totals.cancelled)} cancelled`}
      empty={data.length === 0}
      actions={
        <div className="flex gap-1">
          {RANGE_BTNS.map((b) => (
            <button
              key={b.key}
              onClick={() => onRangeChange(b.key)}
              className={`px-2 py-1 rounded-md text-[10px] font-bold border ${
                range === b.key
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      }
    >
      <TrendChart data={data} series={['total', 'confirmed', 'waitlisted', 'cancelled']} />
    </Section>
  );
};

export const RegistrationStatusBreakdown: React.FC<{
  data: DashboardOverview['registration_status_breakdown'];
}> = ({ data }) => {
  const segments = [
    { label: 'Confirmed', value: data.confirmed, color: PALETTE.emerald },
    { label: 'Pending', value: data.pending, color: PALETTE.indigo },
    { label: 'Waitlisted', value: data.waitlisted, color: PALETTE.amber },
    { label: 'Rejected', value: data.rejected, color: PALETTE.rose },
    { label: 'Cancelled', value: data.cancelled, color: PALETTE.slate },
  ];
  const total = segments.reduce((a, s) => a + s.value, 0);

  return (
    <Section title="Registration Status" empty={total === 0}>
      <Donut segments={segments} centerLabel="REGS" />
    </Section>
  );
};
