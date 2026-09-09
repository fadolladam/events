import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';
import { paths } from '../../routes/paths';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalEvent {
  id: string;
  title: string;
  slug: string;
  event_code: string;
  status: string;
  start_at: string;
  end_at: string;
}

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const STATUS_DOT: Record<string, string> = {
  registration_open: 'bg-emerald-500',
  upcoming: 'bg-sky-500',
  ongoing: 'bg-indigo-500',
  full: 'bg-amber-500',
  registration_closed: 'bg-amber-500',
  completed: 'bg-slate-400',
  cancelled: 'bg-rose-500',
  draft: 'bg-slate-300',
  archived: 'bg-slate-300',
};

export const EventsCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(startOfMonth(new Date()));
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get('/events', { params: { per_page: 200 } })
      .then((res) => setEvents(res.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const gridStart = new Date(first);
    gridStart.setDate(1 - ((first.getDay() + 6) % 7)); // week starts Monday
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const e of events) {
      const key = ymd(new Date(e.start_at));
      (map[key] ||= []).push(e);
    }
    return map;
  }, [events]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayKey = ymd(new Date());

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Events Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor((c) => addMonths(c, -1))} className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
          <span className="w-40 text-center text-sm font-bold text-slate-800">{monthLabel}</span>
          <button onClick={() => setCursor((c) => addMonths(c, 1))} className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => setCursor(startOfMonth(new Date()))} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50">Today</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-[10px] font-bold uppercase text-slate-400">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d, i) => {
            const key = ymd(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const dayEvents = byDay[key] || [];
            return (
              <div
                key={i}
                className={`min-h-[92px] border-b border-r border-slate-100 p-1.5 ${inMonth ? 'bg-white' : 'bg-slate-50/60'} ${key === todayKey ? 'ring-1 ring-inset ring-indigo-300' : ''}`}
              >
                <div className={`mb-1 text-[11px] font-bold ${inMonth ? 'text-slate-600' : 'text-slate-300'}`}>{d.getDate()}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => navigate(paths.eventConsole(e.slug, 'overview'))}
                      className="flex w-full items-center gap-1 truncate rounded bg-slate-50 px-1 py-0.5 text-left text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                      title={`${e.title} · ${e.status}`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[e.status] || 'bg-slate-400'}`} />
                      <span className="truncate">{e.title}</span>
                    </button>
                  ))}
                  {dayEvents.length > 3 && <div className="px-1 text-[10px] text-slate-400">+{dayEvents.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {loading && <p className="mt-3 text-xs text-slate-400">Loading events…</p>}
    </div>
  );
};
