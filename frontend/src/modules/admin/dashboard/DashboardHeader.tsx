import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import type { DashboardRange } from '../../../services/api';

const RANGES: { key: DashboardRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'this_year', label: 'This Year' },
];

interface Props {
  range: DashboardRange;
  customFrom: string;
  customTo: string;
  onRangeChange: (r: DashboardRange) => void;
  onCustomChange: (from: string, to: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  generatedAt?: string;
  canCreate: boolean;
  onCreateEvent: () => void;
}

export const DashboardHeader: React.FC<Props> = ({
  range,
  customFrom,
  customTo,
  onRangeChange,
  onCustomChange,
  onRefresh,
  refreshing,
  generatedAt,
  canCreate,
  onCreateEvent,
}) => (
  <div className="space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Events Dashboard</h1>
        <p className="text-xs text-slate-500 mt-1">
          Event operations overview
          {generatedAt && (
            <span className="text-slate-300">
              {' '}
              · updated {new Date(generatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        {canCreate && (
          <button
            onClick={onCreateEvent}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm shadow-indigo-600/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        )}
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-1.5">
      {RANGES.map((r) => (
        <button
          key={r.key}
          onClick={() => onRangeChange(r.key)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
            range === r.key
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
          }`}
        >
          {r.label}
        </button>
      ))}
      <button
        onClick={() => onRangeChange('custom')}
        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
          range === 'custom'
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
        }`}
      >
        Custom
      </button>

      {range === 'custom' && (
        <span className="flex items-center gap-1.5 ml-1">
          <input
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => onCustomChange(e.target.value, customTo)}
            className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] text-slate-700"
          />
          <span className="text-slate-300 text-xs">→</span>
          <input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => onCustomChange(customFrom, e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] text-slate-700"
          />
        </span>
      )}
    </div>
  </div>
);
