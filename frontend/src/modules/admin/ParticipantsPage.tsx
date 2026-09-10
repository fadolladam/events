import React, { useEffect, useMemo, useState } from 'react';
import { apiClient, EventItem } from '../../services/api';
import { Search, X, RefreshCw, Mail, Phone, IdCard, Building2 } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  employee_id?: string | null;
  department?: string | null;
  organization?: string | null;
  registrations_count: number;
}

interface ParticipantDetail extends Participant {
  registrations: Array<{
    id: string;
    registration_number: string;
    status: string;
    attendance_status: string;
    registered_at: string;
    event?: { id: string; title: string; slug: string; event_code: string; start_at: string };
  }>;
}

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const ParticipantsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [department, setDepartment] = useState('');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [rows, setRows] = useState<Participant[]>([]);
  const [meta, setMeta] = useState({ total: 0, last_page: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ParticipantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, eventFilter, department]);

  // Events for the filter dropdown — the same org/role-scoped list the rest
  // of the admin already uses, just fetched once at a size large enough to
  // cover a demo/small-org event list.
  useEffect(() => {
    apiClient
      .get('/events', { params: { per_page: 200 } })
      .then((res) => setEvents(res.data.data || []))
      .catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get('/participants', {
        params: {
          page,
          per_page: 25,
          ...(debounced ? { search: debounced } : {}),
          ...(eventFilter ? { event_id: eventFilter } : {}),
          ...(department ? { department } : {}),
        },
      })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data.data || []);
        setMeta({ total: res.data.total ?? 0, last_page: res.data.last_page ?? 1 });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, debounced, eventFilter, department]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const res = await apiClient.get(`/participants/${id}`);
      setSelected(res.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const statusTone = useMemo(
    () => (s: string) =>
      s === 'confirmed'
        ? 'bg-emerald-100 text-emerald-800'
        : s === 'waitlisted'
          ? 'bg-amber-100 text-amber-800'
          : s === 'cancelled' || s === 'rejected'
            ? 'bg-rose-100 text-rose-700'
            : 'bg-slate-100 text-slate-700',
    [],
  );

  return (
    <div className="mx-auto max-w-7xl p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-slate-900">Participants</h1>
        <p className="text-xs text-slate-400">Everyone who has ever registered — one row per person, across all events.</p>
      </div>

      <div className="relative mb-3 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, email, phone, employee ID, department…"
          className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
        >
          <option value="">All events</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.short_title || ev.title}</option>
          ))}
        </select>
        <input
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="Department"
          className="w-36 rounded-lg border border-slate-200 px-2.5 py-1.5"
        />
        {(eventFilter || department) && (
          <button
            onClick={() => { setEventFilter(''); setDepartment(''); }}
            className="text-slate-400 underline hover:text-slate-700"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-xs">
          <span className="text-slate-400">{meta.total} participant(s)</span>
          <button onClick={() => setPage((p) => p)} className="p-1 text-slate-400 hover:text-slate-600" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Employee ID</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3 text-right">Events</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  {loading ? 'Loading…' : 'No participants match.'}
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-slate-50/80" onClick={() => openDetail(p.id)}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.email}</td>
                  <td className="px-4 py-3">{p.employee_id || '—'}</td>
                  <td className="px-4 py-3">{p.department || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{p.registrations_count}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs">
            <span className="text-slate-400">Page {page} of {meta.last_page}</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={page >= meta.last_page || loading}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {(selected || detailLoading) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={() => setSelected(null)}>
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-base font-bold text-slate-900">{selected?.name ?? 'Loading…'}</h2>
              <button onClick={() => setSelected(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            {selected && (
              <>
                <dl className="mt-4 space-y-2 text-xs">
                  <Row icon={Mail} value={selected.email} />
                  {selected.phone && <Row icon={Phone} value={selected.phone} />}
                  {selected.employee_id && <Row icon={IdCard} value={selected.employee_id} />}
                  {(selected.department || selected.organization) && (
                    <Row icon={Building2} value={[selected.department, selected.organization].filter(Boolean).join(' · ')} />
                  )}
                </dl>

                <h3 className="mt-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Registration history ({selected.registrations_count})
                </h3>
                <ul className="mt-2 space-y-2">
                  {selected.registrations.map((r) => (
                    <li key={r.id} className="rounded-lg border border-slate-200 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{r.event?.title ?? 'Event'}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone(r.status)}`}>
                          {r.status}
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between text-slate-400">
                        <span className="font-mono">{r.registration_number}</span>
                        <span>registered {fmtDate(r.registered_at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ icon: typeof Mail; value: string }> = ({ icon: Icon, value }) => (
  <div className="flex items-center gap-2 text-slate-700">
    <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
    <span>{value}</span>
  </div>
);
