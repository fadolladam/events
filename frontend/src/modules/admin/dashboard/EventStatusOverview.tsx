import React from 'react';
import { Section } from './primitives';
import { StackedBar, PALETTE } from './charts';
import { statusLabel } from './format';
import type { DashboardCtx } from './types';

const ORDER = [
  'registration_open',
  'upcoming',
  'ongoing',
  'full',
  'registration_closed',
  'completed',
  'draft',
  'cancelled',
  'archived',
];

const COLOR: Record<string, string> = {
  registration_open: PALETTE.emerald,
  upcoming: PALETTE.indigo,
  ongoing: PALETTE.sky,
  full: PALETTE.amber,
  registration_closed: '#cbd5e1',
  completed: '#94a3b8',
  draft: '#e2e8f0',
  cancelled: PALETTE.rose,
  archived: '#f43f5e',
};

export const EventStatusOverview: React.FC<{
  breakdown: Record<string, number>;
  ctx: DashboardCtx;
}> = ({ breakdown, ctx }) => {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const segments = ORDER.filter((s) => (breakdown[s] ?? 0) >= 0).map((s) => ({
    label: statusLabel(s),
    value: breakdown[s] ?? 0,
    color: COLOR[s] ?? '#cbd5e1',
    onClick: () => ctx.onNavigateToEvents(s),
  }));

  return (
    <Section title="Event Status Overview" subtitle={`${total} events`} empty={total === 0}>
      <StackedBar segments={segments} />
    </Section>
  );
};
