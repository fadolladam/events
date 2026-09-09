import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';
import { ShieldCheck, RefreshCw } from 'lucide-react';

interface Props {
  eventId: string;
}

interface AuditRow {
  id: number;
  action: string;
  user_name?: string | null;
  entity_type: string;
  entity_id?: string | null;
  ip_address?: string | null;
  created_at: string;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

export const EventAuditTab: React.FC<Props> = ({ eventId }) => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, last_page: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get(`/events/${eventId}/audit-logs`, { params: { page, per_page: 30 } })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data.data || []);
        setMeta({ total: res.data.total ?? 0, last_page: res.data.last_page ?? 1 });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [eventId, page]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldCheck className="h-4 w-4 text-indigo-600" /> Event Audit Trail
          <span className="font-normal text-slate-400">({meta.total})</span>
        </h3>
        <button onClick={() => setPage((p) => p)} className="p-1 text-slate-400 hover:text-slate-600" title="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Who</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Entity</th>
            <th className="px-4 py-3">IP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {rows.length === 0 ? (
            <tr><td colSpan={5} className="py-12 text-center text-slate-400">{loading ? 'Loading…' : 'No audit entries yet.'}</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-500">{fmt(r.created_at)}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{r.user_name || 'System'}</td>
                <td className="px-4 py-3"><code className="font-mono text-[11px]">{r.action}</code></td>
                <td className="px-4 py-3 text-slate-500">{r.entity_type}{r.entity_id ? ` · ${String(r.entity_id).slice(0, 8)}` : ''}</td>
                <td className="px-4 py-3 text-slate-400">{r.ip_address || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {meta.last_page > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs">
          <span className="text-slate-400">Page {page} of {meta.last_page}</span>
          <div className="flex gap-1.5">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Prev</button>
            <button onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={page >= meta.last_page || loading} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
};
