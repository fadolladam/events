import React from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';
import type { ActionPriority } from '../../../services/api';

/* ------------------------------------------------------------------ */
/* Section wrapper — gives every widget a consistent frame plus       */
/* loading / empty / error slots so one failing widget never blanks   */
/* the page.                                                          */
/* ------------------------------------------------------------------ */

interface SectionProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** true → render skeleton */
  loading?: boolean;
  /** message → render error state */
  error?: string | null;
  /** true → render empty state (with optional emptyLabel) */
  empty?: boolean;
  emptyLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  actions,
  loading,
  error,
  empty,
  emptyLabel = 'Nothing to show yet.',
  className = '',
  children,
}) => (
  <section
    className={`bg-white rounded-2xl border border-slate-200 shadow-xs ${className}`}
  >
    <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>

    <div className="px-5 pb-5">
      {loading ? (
        <div className="space-y-2 animate-pulse py-2">
          <div className="h-3 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-4">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400 py-8">
          <Inbox className="w-6 h-6" />
          <span className="text-xs">{emptyLabel}</span>
        </div>
      ) : (
        children
      )}
    </div>
  </section>
);

/* ------------------------------------------------------------------ */
/* Guards a widget subtree — a render error becomes an inline notice   */
/* instead of a white screen (§43 error isolation).                    */
/* ------------------------------------------------------------------ */

export class WidgetBoundary extends React.Component<
  { name: string; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err: unknown) {
    console.error(`[dashboard] widget "${this.props.name}" crashed`, err);
  }

  render() {
    if (this.state.failed) {
      return (
        <Section title={this.props.name} error="This section could not be displayed." />
      );
    }
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

export const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'bad';
  onClick?: () => void;
}> = ({ label, value, hint, tone = 'default', onClick }) => {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-600'
      : tone === 'warn'
        ? 'text-amber-600'
        : tone === 'bad'
          ? 'text-rose-600'
          : 'text-slate-900';
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-slate-200 bg-white px-4 py-3 ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-xs transition-all' : ''
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-xl font-extrabold mt-0.5 ${toneClass}`}>{value}</div>
      {hint != null && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
};

export const PriorityBadge: React.FC<{ priority: ActionPriority }> = ({ priority }) => {
  const cls: Record<ActionPriority, string> = {
    CRITICAL: 'bg-rose-600 text-white',
    HIGH: 'bg-amber-500 text-white',
    MEDIUM: 'bg-sky-500 text-white',
    LOW: 'bg-slate-400 text-white',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${cls[priority]}`}>
      {priority}
    </span>
  );
};

export const ProgressBar: React.FC<{
  pct: number;
  tone?: 'good' | 'warn' | 'bad' | 'neutral';
}> = ({ pct, tone = 'neutral' }) => {
  const barClass =
    tone === 'bad'
      ? 'bg-rose-500'
      : tone === 'warn'
        ? 'bg-amber-500'
        : tone === 'good'
          ? 'bg-emerald-500'
          : 'bg-indigo-500';
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full rounded-full ${barClass}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
};

export const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <th className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${className}`}>
    {children}
  </th>
);

export const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <td className={`py-2.5 px-3 align-middle ${className}`}>{children}</td>;
