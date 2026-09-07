/** Small formatting helpers shared across dashboard widgets. */

export const fmtInt = (n: number | null | undefined): string =>
  n == null ? '—' : new Intl.NumberFormat().format(Math.round(n));

export const fmtPct = (n: number | null | undefined, digits = 0): string =>
  n == null ? '—' : `${n.toFixed(digits)}%`;

export const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const fmtTime = (iso?: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

/** "3h ago", "in 2 days", "just now" */
export const relTime = (iso?: string | null): string => {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  const diffMs = then - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const suffix = (v: string) => (diffMs >= 0 ? `in ${v}` : `${v} ago`);
  if (mins < 1) return 'just now';
  if (mins < 60) return suffix(`${mins}m`);
  if (hrs < 24) return suffix(`${hrs}h`);
  if (days < 30) return suffix(`${days}d`);
  return fmtDate(iso);
};

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  upcoming: 'Upcoming',
  registration_open: 'Registration Open',
  full: 'Full',
  registration_closed: 'Registration Closed',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  archived: 'Archived',
};

export const statusLabel = (s?: string): string =>
  s ? STATUS_LABELS[s] ?? s.replace(/_/g, ' ') : '—';

/** tailwind classes for an event status badge */
export const statusBadgeClass = (s?: string): string => {
  switch (s) {
    case 'registration_open':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'ongoing':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'full':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'upcoming':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'registration_closed':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'completed':
      return 'bg-slate-100 text-slate-500 border-slate-200';
    case 'cancelled':
    case 'archived':
      return 'bg-rose-50 text-rose-600 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

export const regStatusBadgeClass = (s?: string): string => {
  switch (s) {
    case 'confirmed':
      return 'bg-emerald-100 text-emerald-800';
    case 'waitlisted':
      return 'bg-amber-100 text-amber-800';
    case 'pending':
      return 'bg-indigo-100 text-indigo-800';
    case 'rejected':
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};
