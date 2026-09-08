import React, { useEffect, useState } from 'react';
import { apiClient, EventAttachment, EventCategory, EventItem } from '../../services/api';
import { ImageUploadField } from '../../components/ImageUploadField';
import { TimezoneSelect } from '../../components/TimezoneSelect';
import { isoToZonedInput, zonedInputToIso, browserTimeZone, tzOffsetLabel } from '../../utils/tz';
import { X, Save, CheckCircle2, Plus, Trash2, Image as ImageIcon, Paperclip } from 'lucide-react';

interface EventSettingsModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (event: EventItem) => void;
}

export const EventSettingsModal: React.FC<EventSettingsModalProps> = ({
  eventId,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<EventCategory[]>([]);

  const [form, setForm] = useState({
    title: '',
    short_title: '',
    description: '',
    cover_image_url: '',
    category_id: '' as number | '',
    visibility: 'public',
    event_type: 'physical' as 'physical' | 'virtual' | 'hybrid',
    capacity: 100,
    waitlist_enabled: true,
    waitlist_capacity: '' as number | '',
    timezone: browserTimeZone(),
    start_at: '',
    end_at: '',
    venue_name: '',
    address: '',
    city: '',
    meeting_url: '',
    organizer_name: '',
    contact_email: '',
  });
  const [attachments, setAttachments] = useState<EventAttachment[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    Promise.all([
      apiClient.get(`/events/${eventId}`),
      apiClient.get('/categories').catch(() => ({ data: [] })),
    ])
      .then(([evRes, catRes]) => {
        const e: EventItem = evRes.data;
        setCategories(catRes.data || []);
        const tz = e.timezone || browserTimeZone();
        setForm({
          title: e.title || '',
          short_title: e.short_title || '',
          description: e.description || '',
          cover_image_url: e.cover_image_url || '',
          category_id: e.category_id ?? '',
          visibility: e.visibility || 'public',
          event_type: (e.event_type as any) || 'physical',
          capacity: e.capacity ?? 100,
          waitlist_enabled: !!e.waitlist_enabled,
          waitlist_capacity: e.waitlist_capacity ?? '',
          timezone: tz,
          start_at: isoToZonedInput(e.start_at, tz),
          end_at: isoToZonedInput(e.end_at, tz),
          venue_name: e.venue_name || '',
          address: e.address || '',
          city: e.city || '',
          meeting_url: (e as any).meeting_url || '',
          organizer_name: e.organizer_name || '',
          contact_email: e.contact_email || '',
        });
        setAttachments(Array.isArray(e.attachments) ? e.attachments : []);
      })
      .catch(() => setError('Failed to load event settings.'))
      .finally(() => setLoading(false));
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        title: form.title,
        short_title: form.short_title || undefined,
        description: form.description || undefined,
        cover_image_url: form.cover_image_url.trim() || undefined,
        category_id: form.category_id || undefined,
        visibility: form.visibility,
        event_type: form.event_type,
        capacity: Number(form.capacity),
        waitlist_enabled: form.waitlist_enabled,
        waitlist_capacity: form.waitlist_capacity ? Number(form.waitlist_capacity) : undefined,
        timezone: form.timezone || undefined,
        start_at: zonedInputToIso(form.start_at, form.timezone),
        end_at: zonedInputToIso(form.end_at, form.timezone),
        venue_name: form.venue_name || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        meeting_url: form.meeting_url || undefined,
        organizer_name: form.organizer_name || undefined,
        contact_email: form.contact_email || undefined,
        attachments: attachments.filter((a) => a.label.trim() && a.url.trim()),
      };
      const res = await apiClient.put(`/events/${eventId}`, payload);
      setSaved(true);
      onSaved(res.data);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      const errs = err.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(' ') : (err.response?.data?.message || 'Failed to save changes.'));
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const lbl = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Event Settings</h2>
            <p className="text-xs text-slate-500">Edit details, cover image, visibility, capacity and supporting documents.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading settings…</div>
          ) : (
            <>
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{error}</div>
              )}

              <div>
                <label className={lbl}>Event Title</label>
                <input className={field} value={form.title} onChange={(e) => set({ title: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Short Title</label>
                  <input className={field} value={form.short_title} onChange={(e) => set({ short_title: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>Category</label>
                  <select className={field + ' bg-white'} value={form.category_id} onChange={(e) => set({ category_id: e.target.value ? Number(e.target.value) : '' })}>
                    <option value="">-- None --</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={lbl}>Description</label>
                <textarea rows={3} className={field} value={form.description} onChange={(e) => set({ description: e.target.value })} />
              </div>

              <div>
                <label className={lbl}><span className="inline-flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Cover Image / Thumbnail</span></label>
                <ImageUploadField
                  value={form.cover_image_url}
                  onChange={(url) => set({ cover_image_url: url })}
                  folder="event-covers"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={lbl}>Visibility</label>
                  <select className={field + ' bg-white'} value={form.visibility} onChange={(e) => set({ visibility: e.target.value })}>
                    <option value="public">Public (shown in catalog)</option>
                    <option value="hidden_link">Hidden link (direct URL only)</option>
                    <option value="invitation_only">Invitation only (hidden)</option>
                    <option value="internal_only">Internal only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Format</label>
                  <select className={field + ' bg-white'} value={form.event_type} onChange={(e) => set({ event_type: e.target.value as any })}>
                    <option value="physical">Physical</option>
                    <option value="virtual">Virtual</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Capacity</label>
                  <input type="number" min={1} className={field} value={form.capacity} onChange={(e) => set({ capacity: Number(e.target.value) })} />
                </div>
              </div>

              <div>
                <label className={lbl}>Event Time Zone</label>
                <TimezoneSelect
                  value={form.timezone}
                  onChange={(tz) => set({ timezone: tz })}
                  className={field + ' bg-white'}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Start Date &amp; Time</label>
                  <input type="datetime-local" className={field} value={form.start_at} onChange={(e) => set({ start_at: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>End Date &amp; Time</label>
                  <input type="datetime-local" className={field} value={form.end_at} onChange={(e) => set({ end_at: e.target.value })} />
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-slate-400">
                Start and end are entered in the event's time zone
                {tzOffsetLabel(form.timezone) ? ` — ${form.timezone.replace(/_/g, ' ')}, ${tzOffsetLabel(form.timezone)}` : ''}.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Venue Name</label>
                  <input className={field} value={form.venue_name} onChange={(e) => set({ venue_name: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>City</label>
                  <input className={field} value={form.city} onChange={(e) => set({ city: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Meeting URL (virtual/hybrid)</label>
                  <input type="url" className={field} value={form.meeting_url} onChange={(e) => set({ meeting_url: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>Contact Email</label>
                  <input type="email" className={field} value={form.contact_email} onChange={(e) => set({ contact_email: e.target.value })} />
                </div>
              </div>

              {/* Attachments */}
              <div className="pt-2 border-t border-slate-100">
                <label className={lbl}><span className="inline-flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Supporting Documents</span></label>
                <p className="text-[10px] text-slate-400 mb-2">Route maps, agendas, consent forms, floor plans — paste a link for each. Shown to registrants on the event page.</p>
                <div className="space-y-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Label (e.g. Route Map)"
                        value={att.label}
                        onChange={(e) => setAttachments(attachments.map((a, i) => i === idx ? { ...a, label: e.target.value } : a))}
                        className="w-40 shrink-0 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="url"
                        placeholder="https://…"
                        value={att.url}
                        onChange={(e) => setAttachments(attachments.map((a, i) => i === idx ? { ...a, url: e.target.value } : a))}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="p-2 text-red-400 hover:text-red-600 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setAttachments([...attachments, { label: '', url: '' }])} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  <Plus className="w-3.5 h-3.5" /> Add document link
                </button>
              </div>
            </>
          )}
        </div>

        <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            {saved && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100">Close</button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving…' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
