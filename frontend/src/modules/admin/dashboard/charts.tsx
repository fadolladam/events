import React, { useId } from 'react';

/* Dependency-free inline SVG charts. Deliberately minimal — no animation,
 * theme-neutral slate/indigo palette, sized by the parent via viewBox. */

const PALETTE = {
  indigo: '#4f46e5',
  emerald: '#059669',
  amber: '#d97706',
  rose: '#e11d48',
  slate: '#94a3b8',
  sky: '#0284c7',
};

type SeriesKey = 'total' | 'confirmed' | 'waitlisted' | 'cancelled';

const SERIES_COLOR: Record<SeriesKey, string> = {
  total: PALETTE.indigo,
  confirmed: PALETTE.emerald,
  waitlisted: PALETTE.amber,
  cancelled: PALETTE.rose,
};

interface TrendPoint {
  date: string;
  total: number;
  confirmed: number;
  waitlisted: number;
  cancelled: number;
}

/** Multi-series line chart for registration trend. */
export const TrendChart: React.FC<{
  data: TrendPoint[];
  series?: SeriesKey[];
  height?: number;
}> = ({ data, series = ['total', 'confirmed', 'waitlisted'], height = 180 }) => {
  const gradId = useId();
  const width = 640;
  const padX = 8;
  const padY = 14;

  if (!data.length) {
    return <div className="text-xs text-slate-400 py-8 text-center">No registrations in this range.</div>;
  }

  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d[s])));
  const stepX = (width - padX * 2) / Math.max(1, data.length - 1);
  const x = (i: number) => padX + i * stepX;
  const y = (v: number) => padY + (1 - v / max) * (height - padY * 2);

  const path = (key: SeriesKey) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(' ');

  const areaPath =
    `${path('total')} L ${x(data.length - 1).toFixed(1)} ${height - padY} L ${x(0).toFixed(1)} ${height - padY} Z`;

  const tickIdx = [0, Math.floor((data.length - 1) / 2), data.length - 1].filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height + 18}`} className="w-full min-w-[420px]" role="img">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PALETTE.indigo} stopOpacity="0.18" />
            <stop offset="100%" stopColor={PALETTE.indigo} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={padX}
            x2={width - padX}
            y1={padY + f * (height - padY * 2)}
            y2={padY + f * (height - padY * 2)}
            stroke="#f1f5f9"
            strokeWidth={1}
          />
        ))}

        {series.includes('total') && <path d={areaPath} fill={`url(#${gradId})`} />}

        {series.map((key) => (
          <path
            key={key}
            d={path(key)}
            fill="none"
            stroke={SERIES_COLOR[key]}
            strokeWidth={key === 'total' ? 2 : 1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {tickIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={height + 12}
            textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
            className="fill-slate-400"
            fontSize={10}
          >
            {new Date(data[i].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </text>
        ))}
      </svg>

      <div className="flex flex-wrap gap-3 mt-2">
        {series.map((key) => (
          <span key={key} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: SERIES_COLOR[key] }} />
            {key[0].toUpperCase() + key.slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
};

/** Donut for status breakdown. */
export const Donut: React.FC<{
  segments: Array<{ label: string; value: number; color?: string }>;
  size?: number;
  centerLabel?: string;
}> = ({ segments, size = 148, centerLabel }) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const palette = [PALETTE.emerald, PALETTE.indigo, PALETTE.amber, PALETTE.rose, PALETTE.slate, PALETTE.sky];

  let offset = 0;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={14} />
        {total > 0 &&
          segments.map((seg, i) => {
            const frac = seg.value / total;
            const dash = frac * c;
            const el = (
              <circle
                key={seg.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color ?? palette[i % palette.length]}
                strokeWidth={14}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += dash;
            return el;
          })}
        <text x="50%" y="47%" textAnchor="middle" className="fill-slate-900" fontSize={22} fontWeight={800}>
          {total}
        </text>
        <text x="50%" y="62%" textAnchor="middle" className="fill-slate-400" fontSize={9}>
          {centerLabel ?? 'TOTAL'}
        </text>
      </svg>

      <div className="space-y-1.5">
        {segments.map((seg, i) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: seg.color ?? palette[i % palette.length] }}
            />
            <span className="text-slate-600 w-24">{seg.label}</span>
            <span className="font-bold text-slate-900">{seg.value}</span>
            <span className="text-slate-400">
              {total > 0 ? `${Math.round((seg.value / total) * 100)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Horizontal stacked bar for the event-status overview. */
export const StackedBar: React.FC<{
  segments: Array<{ label: string; value: number; color: string; onClick?: () => void }>;
}> = ({ segments }) => {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <button
              key={s.label}
              onClick={s.onClick}
              title={`${s.label}: ${s.value}`}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            />
          ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <button
            key={s.label}
            onClick={s.onClick}
            disabled={!s.onClick}
            className="flex items-center gap-2 text-[11px] text-left enabled:hover:text-slate-900 text-slate-500"
          >
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="flex-1 truncate">{s.label}</span>
            <span className="font-bold text-slate-900">{s.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export { PALETTE };
