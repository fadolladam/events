import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { paths } from '../routes/paths';
import { Search, Loader2, CalendarDays, Ticket, User } from 'lucide-react';

interface Results {
  events: Array<{ id: string; title: string; slug: string; event_code: string; status: string }>;
  registrations: Array<{ id: string; registration_number: string; status: string; participant?: { name: string; email: string }; event?: { slug: string } }>;
  participants: Array<{ id: string; name: string; email: string; employee_id?: string | null; department?: string | null }>;
}

const EMPTY: Results = { events: [], registrations: [], participants: [] };

export const GlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Results>(EMPTY);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRes(EMPTY);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      apiClient
        .get('/search', { params: { q: term } })
        .then((r) => setRes({ ...EMPTY, ...r.data }))
        .catch(() => setRes(EMPTY))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    setQ('');
    navigate(to);
  };

  const total = res.events.length + res.registrations.length + res.participants.length;

  return (
    <div ref={boxRef} className="relative max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search events, registration #, participants, employee ID…"
        className="w-full rounded-xl border border-slate-300 py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white text-xs shadow-xl">
          {loading && total === 0 ? (
            <div className="flex items-center gap-2 px-3 py-3 text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…</div>
          ) : total === 0 ? (
            <div className="px-3 py-3 text-slate-400">No matches.</div>
          ) : (
            <>
              {res.events.length > 0 && (
                <Group label="Events">
                  {res.events.map((e) => (
                    <Row key={e.id} icon={CalendarDays} onClick={() => go(paths.eventConsole(e.slug, 'overview'))}>
                      <span className="font-semibold text-slate-900">{e.title}</span>
                      <span className="text-slate-400"> · {e.event_code} · {e.status}</span>
                    </Row>
                  ))}
                </Group>
              )}
              {res.registrations.length > 0 && (
                <Group label="Registrations">
                  {res.registrations.map((r) => (
                    <Row
                      key={r.id}
                      icon={Ticket}
                      onClick={() => go(r.event?.slug ? paths.eventConsole(r.event.slug, 'registrations') : paths.events())}
                    >
                      <span className="font-mono font-semibold text-slate-900">{r.registration_number}</span>
                      <span className="text-slate-400"> · {r.participant?.name} · {r.status}</span>
                    </Row>
                  ))}
                </Group>
              )}
              {res.participants.length > 0 && (
                <Group label="Participants">
                  {res.participants.map((p) => (
                    <Row key={p.id} icon={User} onClick={() => go(paths.participants())}>
                      <span className="font-semibold text-slate-900">{p.name}</span>
                      <span className="text-slate-400"> · {p.email}{p.employee_id ? ` · ${p.employee_id}` : ''}</span>
                    </Row>
                  ))}
                </Group>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const Group: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="border-b border-slate-100 last:border-0">
    <div className="bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
    {children}
  </div>
);

const Row: React.FC<{ icon: typeof Search; onClick: () => void; children: React.ReactNode }> = ({ icon: Icon, onClick, children }) => (
  <button onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
    <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
    <span className="truncate">{children}</span>
  </button>
);
