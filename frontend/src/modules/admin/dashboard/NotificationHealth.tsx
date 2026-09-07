import React from 'react';
import { MailCheck, MailWarning } from 'lucide-react';
import type { DashboardOverview } from '../../../services/api';
import { Section, StatTile } from './primitives';

export const NotificationHealth: React.FC<{
  data: DashboardOverview['notification_health'];
}> = ({ data }) => {
  const hasFailures = data.failed_24h > 0 || data.failed > 0;

  return (
    <Section
      title="Notification Health"
      actions={
        hasFailures ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
            <MailWarning className="w-4 h-4" /> Action needed
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <MailCheck className="w-4 h-4" /> Healthy
          </span>
        )
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatTile label="Sent Today" value={data.sent_today} tone="good" />
        <StatTile label="Pending" value={data.pending} />
        <StatTile label="Failed" value={data.failed} tone={data.failed ? 'bad' : 'default'} />
        <StatTile label="Failed 24h" value={data.failed_24h} tone={data.failed_24h ? 'bad' : 'default'} />
      </div>
      {!hasFailures && data.sent_today === 0 && data.pending === 0 && (
        <p className="text-[11px] text-slate-400 mt-3">
          No notifications have been dispatched. Delivery wiring is scheduled for a later phase.
        </p>
      )}
    </Section>
  );
};
