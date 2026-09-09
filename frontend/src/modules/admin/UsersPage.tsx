import React, { useEffect, useState } from 'react';
import { apiClient, getStoredUser } from '../../services/api';
import { toast, confirmDialog } from '../../components/uiFeedback';
import { Search, UserPlus, X, KeyRound, RefreshCw } from 'lucide-react';

interface ManagedUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  last_login_at?: string | null;
  must_change_password?: boolean;
}

const ROLES = ['super_admin', 'event_admin', 'event_organizer', 'registration_officer', 'checkin_staff', 'viewer'];
const STRONG_HINT = 'Min 12 chars, mixed case, a number and a symbol.';

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'never';

export const UsersPage: React.FC = () => {
  const me = getStoredUser();
  const [rows, setRows] = useState<ManagedUser[]>([]);
  const [meta, setMeta] = useState({ total: 0, last_page: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<ManagedUser | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [debounced, roleFilter]);

  const load = () => {
    setLoading(true);
    apiClient
      .get('/users', { params: { page, ...(debounced ? { search: debounced } : {}), ...(roleFilter ? { role: roleFilter } : {}) } })
      .then((res) => {
        setRows(res.data.data || []);
        setMeta({ total: res.data.total ?? 0, last_page: res.data.last_page ?? 1 });
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, [page, debounced, roleFilter]);

  const forceReset = async (u: ManagedUser) => {
    if (!await confirmDialog(`Force ${u.name} to set a new password on next sign-in? Their sessions end now.`)) return;
    try {
      await apiClient.post(`/users/${u.id}/force-password-reset`);
      load();
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Users</h1>
          <p className="text-xs text-slate-400">Staff accounts and their roles.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500"
        >
          <UserPlus className="h-3.5 w-3.5" /> New user
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email…"
            className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs">
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-xs">
          <span className="text-slate-400">{meta.total} user(s)</span>
          <button onClick={load} className="p-1 text-slate-400 hover:text-slate-600"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-slate-400">{loading ? 'Loading…' : 'No users.'}</td></tr>
            ) : rows.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{u.name}{u.id === me?.id && <span className="ml-1 text-[10px] text-indigo-500">(you)</span>}</div>
                  <div className="text-slate-400">{u.email}</div>
                </td>
                <td className="px-4 py-3 uppercase text-[10px] font-bold text-slate-500">{u.role.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{u.status}</span>
                  {u.must_change_password && <span className="ml-1 text-[10px] text-amber-600">must reset</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{fmt(u.last_login_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEdit(u)} className="rounded-lg border border-slate-200 px-2.5 py-1 font-bold text-slate-600 hover:bg-slate-50">Edit</button>
                  <button onClick={() => forceReset(u)} className="ml-1.5 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-bold text-slate-600 hover:bg-slate-50" title="Force password reset">
                    <KeyRound className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs">
            <span className="text-slate-400">Page {page} of {meta.last_page}</span>
            <div className="flex gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={page >= meta.last_page} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {edit && <EditDrawer user={edit} isSelf={edit.id === me?.id} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {creating && <CreateDrawer onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </div>
  );
};

const EditDrawer: React.FC<{ user: ManagedUser; isSelf: boolean; onClose: () => void; onSaved: () => void }> = ({ user, isSelf, onClose, onSaved }) => {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      await apiClient.patch(`/users/${user.id}`, { name, phone: phone || null, role, status });
      onSaved();
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Could not save.');
    } finally { setBusy(false); }
  };

  return (
    <Drawer title={`Edit ${user.name}`} onClose={onClose}>
      <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="inp" /></Field>
      <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="inp" /></Field>
      <Field label="Role">
        <select value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value)} className="inp disabled:bg-slate-50">
          {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </Field>
      <Field label="Status">
        <select value={status} disabled={isSelf} onChange={(e) => setStatus(e.target.value)} className="inp disabled:bg-slate-50">
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
      </Field>
      {isSelf && <p className="text-[11px] text-slate-400">You can't change your own role or status.</p>}
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{err}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
        <button onClick={save} disabled={busy} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50">Save</button>
      </div>
    </Drawer>
  );
};

const CreateDrawer: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const [f, setF] = useState({ name: '', email: '', phone: '', role: 'checkin_staff', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const up = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      await apiClient.post('/users', { name: f.name, email: f.email, phone: f.phone || null, role: f.role, password: f.password });
      onSaved();
    } catch (e: any) {
      setErr(e.response?.data?.errors?.password?.[0] || e.response?.data?.message || 'Could not create.');
    } finally { setBusy(false); }
  };

  return (
    <Drawer title="New user" onClose={onClose}>
      <Field label="Name"><input value={f.name} onChange={(e) => up('name', e.target.value)} className="inp" /></Field>
      <Field label="Email"><input type="email" value={f.email} onChange={(e) => up('email', e.target.value)} className="inp" /></Field>
      <Field label="Phone"><input value={f.phone} onChange={(e) => up('phone', e.target.value)} className="inp" /></Field>
      <Field label="Role">
        <select value={f.role} onChange={(e) => up('role', e.target.value)} className="inp">
          {ROLES.filter((r) => r !== 'super_admin').map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </Field>
      <Field label="Initial password" help={STRONG_HINT}>
        <input type="text" value={f.password} onChange={(e) => up('password', e.target.value)} className="inp" />
      </Field>
      <p className="text-[11px] text-slate-400">The user must change this on first sign-in.</p>
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{err}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
        <button onClick={save} disabled={busy} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50">Create</button>
      </div>
    </Drawer>
  );
};

const Drawer: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
    <div className="h-full w-full max-w-sm space-y-3 overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
      </div>
      <style>{`.inp{width:100%;border:1px solid rgb(203 213 225);border-radius:0.75rem;padding:0.5rem 0.75rem;font-size:0.8125rem}`}</style>
      {children}
    </div>
  </div>
);

const Field: React.FC<{ label: string; help?: string; children: React.ReactNode }> = ({ label, help, children }) => (
  <div>
    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">{label}</label>
    {children}
    {help && <p className="mt-1 text-[10px] text-slate-400">{help}</p>}
  </div>
);
