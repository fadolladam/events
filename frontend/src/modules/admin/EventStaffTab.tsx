import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../services/api';
import { Save, Loader2, UserCog } from 'lucide-react';

interface Props {
  eventId: string;
  canManage: boolean;
}

interface AssignableUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

const EVENT_ROLES = ['owner', 'manager', 'organizer', 'registration_officer', 'checkin_staff', 'viewer'] as const;

export const EventStaffTab: React.FC<Props> = ({ eventId, canManage }) => {
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [initial, setInitial] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiClient.get('/users/assignable'),
      apiClient.get(`/events/${eventId}/staff`),
    ])
      .then(([u, s]) => {
        if (cancelled) return;
        setUsers(u.data.data || []);
        const map: Record<number, string> = {};
        (s.data || []).forEach((row: { user_id: number; role: string }) => { map[row.user_id] = row.role; });
        setAssignments(map);
        setInitial(map);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [eventId]);

  const dirty = useMemo(
    () => JSON.stringify(assignments) !== JSON.stringify(initial),
    [assignments, initial],
  );

  const setRole = (userId: number, role: string) =>
    setAssignments((p) => {
      const next = { ...p };
      if (role) next[userId] = role;
      else delete next[userId];
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const staff = Object.entries(assignments).map(([user_id, role]) => ({ user_id: Number(user_id), role }));
      const res = await apiClient.put(`/events/${eventId}/staff`, { staff });
      const map: Record<number, string> = {};
      (res.data || []).forEach((row: { user_id: number; role: string }) => { map[row.user_id] = row.role; });
      setAssignments(map);
      setInitial(map);
      setFlash('Team updated.');
      window.setTimeout(() => setFlash(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not save the team.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-xs text-slate-400">Loading team…</div>;

  const assignedCount = Object.keys(assignments).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <UserCog className="h-4 w-4 text-indigo-600" /> Event Team
          <span className="font-normal text-slate-400">({assignedCount} assigned)</span>
        </h3>
        {canManage && (
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save team
          </button>
        )}
      </div>

      {flash && <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700">{flash}</div>}

      <p className="px-4 pt-3 text-[11px] text-slate-400">
        Assigning a colleague here grants them access to this event immediately. Org-wide admins (super admin,
        event admin) already see every event and don't need a row.
      </p>

      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-400">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Global role</th>
            <th className="px-4 py-3">Team role on this event</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {users.map((u) => (
            <tr key={u.id} className={assignments[u.id] ? 'bg-indigo-50/30' : ''}>
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-900">{u.name}</div>
                <div className="text-slate-400">{u.email}</div>
              </td>
              <td className="px-4 py-3 uppercase text-[10px] font-semibold text-slate-500">{u.role.replace('_', ' ')}</td>
              <td className="px-4 py-3">
                <select
                  value={assignments[u.id] || ''}
                  disabled={!canManage}
                  onChange={(e) => setRole(u.id, e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 disabled:bg-slate-50"
                >
                  <option value="">— not on team —</option>
                  {EVENT_ROLES.map((r) => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
