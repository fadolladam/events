import React, { useEffect, useState } from 'react';
import { apiClient, uploadImage } from '../../services/api';
import { TimezoneSelect } from '../../components/TimezoneSelect';
import { Loader2, Save } from 'lucide-react';

interface Org {
  id: number;
  name: string;
  logo_url?: string | null;
  timezone: string;
  country?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  settings?: { primary_color?: string; secondary_color?: string } | null;
}

export const OrgSettingsPage: React.FC = () => {
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/organization').then((r) => setOrg(r.data)).catch(() => setErr('Could not load organization.')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-xs text-slate-400">Loading…</div>;
  if (!org) return <div className="p-8 text-center text-xs text-rose-500">{err}</div>;

  const set = (patch: Partial<Org>) => setOrg({ ...org, ...patch });
  const setSetting = (k: string, v: string) => setOrg({ ...org, settings: { ...(org.settings || {}), [k]: v } });

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      const res = await apiClient.put('/organization', {
        name: org.name,
        logo_url: org.logo_url || null,
        timezone: org.timezone,
        country: org.country || null,
        contact_email: org.contact_email || null,
        contact_phone: org.contact_phone || null,
        settings: org.settings || {},
      });
      setOrg(res.data);
      setFlash('Saved.');
      window.setTimeout(() => setFlash(null), 4000);
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Could not save.');
    } finally { setSaving(false); }
  };

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, 'event-covers');
      set({ logo_url: url });
    } catch {
      setErr('Logo upload failed.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8">
      <h1 className="mb-1 text-lg font-bold text-slate-900">Organization Settings</h1>
      <p className="mb-6 text-xs text-slate-400">Applies across the whole console. New events inherit the timezone and colours.</p>

      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <Row label="Name">
          <input value={org.name} onChange={(e) => set({ name: e.target.value })} className="inp" />
        </Row>
        <Row label="Default timezone">
          <TimezoneSelect value={org.timezone} onChange={(tz) => set({ timezone: tz })} />
        </Row>
        <Row label="Country">
          <input value={org.country || ''} onChange={(e) => set({ country: e.target.value })} className="inp" />
        </Row>
        <Row label="Contact email">
          <input type="email" value={org.contact_email || ''} onChange={(e) => set({ contact_email: e.target.value })} className="inp" />
        </Row>
        <Row label="Contact phone">
          <input value={org.contact_phone || ''} onChange={(e) => set({ contact_phone: e.target.value })} className="inp" />
        </Row>
        <Row label="Logo">
          <div className="flex items-center gap-3">
            {org.logo_url && <img src={org.logo_url} alt="logo" className="h-10 rounded border border-slate-200" />}
            <input type="file" accept="image/*" onChange={onLogo} className="text-xs" />
          </div>
        </Row>
        <Row label="Brand colours">
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Primary
              <input type="color" value={org.settings?.primary_color || '#0f172a'} onChange={(e) => setSetting('primary_color', e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Secondary
              <input type="color" value={org.settings?.secondary_color || '#2563eb'} onChange={(e) => setSetting('secondary_color', e.target.value)} />
            </label>
          </div>
        </Row>

        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{err}</p>}
        {flash && <p className="text-xs font-medium text-emerald-600">{flash}</p>}

        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save settings
          </button>
        </div>
      </div>
      <style>{`.inp{width:100%;border:1px solid rgb(203 213 225);border-radius:0.75rem;padding:0.5rem 0.75rem;font-size:0.8125rem}`}</style>
    </div>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid gap-1.5 sm:grid-cols-[160px_1fr] sm:items-center">
    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
    <div>{children}</div>
  </div>
);
