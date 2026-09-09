import React, { useEffect, useRef, useState } from 'react';
import { apiClient, EventAttachment, EventCategory, EventItem } from '../../services/api';
import { ImageUploadField } from '../../components/ImageUploadField';
import { TimezoneSelect } from '../../components/TimezoneSelect';
import { zonedInputToIso, browserTimeZone, tzOffsetLabel } from '../../utils/tz';
import { X, ArrowRight, ArrowLeft, Check, Calendar, MapPin, Users, ShieldAlert, Sparkles, Plus, Trash2, Image as ImageIcon, Paperclip } from 'lucide-react';

interface EventWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (event: EventItem) => void;
}

/** Format a Date as a `YYYY-MM-DDTHH:mm` string for <input type="datetime-local">,
 *  using the browser's local calendar fields (only used for the seeded defaults). */
const toLocalInput = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const nowLocalInput = (): string => toLocalInput(new Date());

const DRAFT_KEY = 'rhb_event_wizard_draft';
const readDraft = (): Record<string, unknown> | null => {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
  } catch {
    return null;
  }
};
const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
};

export const EventWizardModal: React.FC<EventWizardModalProps> = ({
  isOpen,
  onClose,
  onEventCreated,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [templateFormFields, setTemplateFormFields] = useState<unknown[]>([]);

  const [draftDecided, setDraftDecided] = useState(true);
  const [staffUsers, setStaffUsers] = useState<Array<{ id: number; name: string; email: string; role: string }>>([]);
  const [staffAssignments, setStaffAssignments] = useState<Record<number, string>>({});

  // Form State
  const [title, setTitle] = useState('');
  const [shortTitle, setShortTitle] = useState('');
  const [eventCode, setEventCode] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [attachments, setAttachments] = useState<EventAttachment[]>([]);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [eventType, setEventType] = useState<'physical' | 'virtual' | 'hybrid'>('physical');
  const [visibility, setVisibility] = useState('public');
  const [status, setStatus] = useState('registration_open');

  // Dates — `datetime-local` values are LOCAL wall-clock, so format in local time.
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [regOpenAt, setRegOpenAt] = useState('');
  const [regCloseAt, setRegCloseAt] = useState('');
  const [timezone, setTimezone] = useState(browserTimeZone());

  // Capacity & Queue
  const [capacity, setCapacity] = useState(100);
  const [waitlistEnabled, setWaitlistEnabled] = useState(true);
  const [waitlistCapacity, setWaitlistCapacity] = useState<number | ''>('');
  const [approvalMode, setApprovalMode] = useState('automatic');
  const [duplicateRule, setDuplicateRule] = useState('email');
  const [allowCancellation, setAllowCancellation] = useState(true);

  // Location
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      apiClient.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
      apiClient.get('/templates').then((res) => setTemplates(res.data || [])).catch(() => setTemplates([]));
    }
  }, [isOpen]);

  const applyTemplate = async (id: string) => {
    setSelectedTemplateId(id);
    setTemplateFormFields([]);
    if (!id) return;
    setApplyingTemplate(true);
    try {
      const res = await apiClient.get(`/templates/${id}`);
      const d = res.data?.structure?.defaults || {};
      if (d.event_type) setEventType(d.event_type);
      if (d.visibility) setVisibility(d.visibility);
      if (d.capacity != null) setCapacity(Number(d.capacity));
      if (d.waitlist_enabled != null) setWaitlistEnabled(!!d.waitlist_enabled);
      if (d.waitlist_capacity != null) setWaitlistCapacity(Number(d.waitlist_capacity));
      if (d.approval_mode) setApprovalMode(d.approval_mode);
      if (d.duplicate_rule) setDuplicateRule(d.duplicate_rule);
      if (d.allow_cancellation != null) setAllowCancellation(!!d.allow_cancellation);
      if (d.short_description && !description) setDescription(d.short_description);
      if (d.category_id && !categoryId) setCategoryId(Number(d.category_id));
      setTemplateFormFields(res.data?.structure?.form_fields || []);
    } catch {
      setError('Could not load that template.');
    } finally {
      setApplyingTemplate(false);
    }
  };

  // Reset the whole wizard every time it opens. The modal is mounted once and
  // reused, so without this the date defaults stay frozen at first-render time
  // and a later "create" can land start/end in the past (event then reads as
  // completed / registration-closed everywhere).
  useEffect(() => {
    if (!isOpen) return;
    const start = new Date(Date.now() + 7 * 86400000);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 2 * 3600000);
    setStartDate(toLocalInput(start));
    setEndDate(toLocalInput(end));
    setRegOpenAt('');
    setRegCloseAt('');
    setTimezone(browserTimeZone());
    setCurrentStep(1);
    setError(null);
    setLoading(false);
    setSelectedTemplateId('');
    setTemplateFormFields([]);
    setTitle('');
    setShortTitle('');
    setEventCode('');
    setDescription('');
    setCoverImageUrl('');
    setAttachments([]);
    setCategoryId('');
    setEventType('physical');
    setVisibility('public');
    setStatus('registration_open');
    setCapacity(100);
    setWaitlistEnabled(true);
    setWaitlistCapacity('');
    setApprovalMode('automatic');
    setDuplicateRule('email');
    setAllowCancellation(true);
    setVenueName('');
    setAddress('');
    setCity('');
    setMapUrl('');
    setMeetingUrl('');
    setOrganizerName('');
    setContactEmail('');
    setStaffAssignments({});
    // If a saved draft exists, hold autosave and offer to resume it.
    setDraftDecided(readDraft() === null);
  }, [isOpen]);

  // Load the staff picker options once per open.
  useEffect(() => {
    if (!isOpen) return;
    apiClient.get('/users/assignable').then((r) => setStaffUsers(r.data.data || [])).catch(() => setStaffUsers([]));
  }, [isOpen]);

  const snapshot = () => ({
    title, shortTitle, eventCode, description, coverImageUrl, attachments, categoryId, eventType, visibility, status,
    startDate, endDate, regOpenAt, regCloseAt, timezone, capacity, waitlistEnabled, waitlistCapacity, approvalMode,
    duplicateRule, allowCancellation, venueName, address, city, mapUrl, meetingUrl, organizerName, contactEmail,
    staffAssignments, currentStep,
  });

  const applySnapshot = (d: Record<string, any>) => {
    const s = <T,>(fn: (v: T) => void, v: T | undefined) => { if (v !== undefined) fn(v); };
    s(setTitle, d.title); s(setShortTitle, d.shortTitle); s(setEventCode, d.eventCode); s(setDescription, d.description);
    s(setCoverImageUrl, d.coverImageUrl); s(setAttachments, d.attachments); s(setCategoryId, d.categoryId);
    s(setEventType, d.eventType); s(setVisibility, d.visibility); s(setStatus, d.status);
    s(setStartDate, d.startDate); s(setEndDate, d.endDate); s(setRegOpenAt, d.regOpenAt); s(setRegCloseAt, d.regCloseAt);
    s(setTimezone, d.timezone); s(setCapacity, d.capacity); s(setWaitlistEnabled, d.waitlistEnabled);
    s(setWaitlistCapacity, d.waitlistCapacity); s(setApprovalMode, d.approvalMode); s(setDuplicateRule, d.duplicateRule);
    s(setAllowCancellation, d.allowCancellation); s(setVenueName, d.venueName); s(setAddress, d.address);
    s(setCity, d.city); s(setMapUrl, d.mapUrl); s(setMeetingUrl, d.meetingUrl); s(setOrganizerName, d.organizerName);
    s(setContactEmail, d.contactEmail); s(setStaffAssignments, d.staffAssignments); s(setCurrentStep, d.currentStep);
  };

  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;
  useEffect(() => {
    if (!isOpen || !draftDecided) return;
    const id = window.setInterval(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(snapRef.current()));
      } catch {
        /* storage disabled */
      }
    }, 1500);
    return () => window.clearInterval(id);
  }, [isOpen, draftDecided]);

  if (!isOpen) return null;

  /** Per-step validation — returns a message when the step can't be left. */
  const stepError = (step: number): string | null => {
    if (step === 1) {
      if (!title.trim()) return 'Please provide an event title.';
    }
    if (step === 2) {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      if (Number.isNaN(s) || Number.isNaN(e)) return 'Set a valid start and end date/time.';
      if (s < Date.now() - 60_000) return 'The start date/time is in the past.';
      if (e <= s) return 'The end must be after the start.';
    }
    if (step === 3) {
      if (!Number(capacity) || Number(capacity) < 1) return 'Capacity must be at least 1.';
      if (waitlistEnabled && waitlistCapacity !== '' && Number(waitlistCapacity) < 1) return 'Waitlist capacity must be at least 1, or leave it blank for unlimited.';
    }
    return null;
  };

  // Keep the event duration when the start moves, and never let end <= start.
  const handleStartChange = (value: string) => {
    setStartDate(value);
    const oldStart = new Date(startDate).getTime();
    const newStart = new Date(value).getTime();
    if (Number.isNaN(newStart)) return;
    const oldEnd = new Date(endDate).getTime();
    const duration = !Number.isNaN(oldStart) && !Number.isNaN(oldEnd) && oldEnd > oldStart
      ? oldEnd - oldStart
      : 2 * 3600000;
    setEndDate(toLocalInput(new Date(newStart + duration)));
  };

  const handleSubmit = async () => {
    // Wall-clock inputs are interpreted in the event's chosen time zone, then
    // resolved to UTC instants for both the sanity checks and the payload.
    const startIso = zonedInputToIso(startDate, timezone);
    const endIso = zonedInputToIso(endDate, timezone);
    const regCloseIso = zonedInputToIso(regCloseAt, timezone);

    // Client-side date sanity — the API rejects these too, but catching them
    // here gives a clear message on the right step instead of a generic error.
    const startMs = startIso ? new Date(startIso).getTime() : NaN;
    const endMs = endIso ? new Date(endIso).getTime() : NaN;
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      setCurrentStep(2);
      setError('Please set a valid start and end date/time.');
      return;
    }
    if (startMs < Date.now() - 60_000) {
      setCurrentStep(2);
      setError('The start date/time is in the past. Pick a future start.');
      return;
    }
    if (endMs <= startMs) {
      setCurrentStep(2);
      setError('The end date/time must be after the start.');
      return;
    }
    if (regCloseIso && new Date(regCloseIso).getTime() > startMs) {
      setCurrentStep(2);
      setError('Registration must close on or before the event starts.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // "Upcoming" means registration opens later — default that to the event
      // start unless an explicit opening time was given, otherwise the backend
      // treats it as already open.
      const resolvedRegOpen = regOpenAt || (status === 'upcoming' ? startDate : undefined);

      const payload = {
        title,
        short_title: shortTitle || undefined,
        event_code: eventCode ? eventCode.toUpperCase() : undefined,
        description,
        cover_image_url: coverImageUrl.trim() || undefined,
        attachments: attachments.filter((a) => a.label.trim() && a.url.trim()),
        category_id: categoryId || undefined,
        event_type: eventType,
        visibility,
        status,
        start_at: startIso,
        end_at: endIso,
        registration_open_at: zonedInputToIso(resolvedRegOpen, timezone),
        registration_close_at: regCloseIso,
        timezone,
        capacity: Number(capacity),
        waitlist_enabled: waitlistEnabled,
        waitlist_capacity: waitlistCapacity ? Number(waitlistCapacity) : undefined,
        approval_mode: approvalMode,
        duplicate_rule: duplicateRule,
        allow_cancellation: allowCancellation,
        venue_name: venueName || undefined,
        address: address || undefined,
        city: city || undefined,
        map_url: mapUrl.trim() || undefined,
        meeting_url: meetingUrl || undefined,
        organizer_name: organizerName || undefined,
        contact_email: contactEmail || undefined,
      };

      const res = await apiClient.post('/events', payload);

      // A template also carries its registration form — apply it to the new event.
      if (templateFormFields.length > 0) {
        try {
          await apiClient.put(`/events/${res.data.id}/form`, { fields: templateFormFields });
        } catch {
          /* the event is created; the form just stayed on defaults */
        }
      }

      // Apply any staff picked during the wizard.
      const staff = Object.entries(staffAssignments)
        .filter(([, role]) => role)
        .map(([user_id, role]) => ({ user_id: Number(user_id), role }));
      if (staff.length > 0) {
        try {
          await apiClient.put(`/events/${res.data.id}/staff`, { staff });
        } catch {
          /* event exists; staff can be set from its console */
        }
      }

      clearDraft();
      onEventCreated(res.data);
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      const firstFieldError =
        data?.errors && typeof data.errors === 'object'
          ? (Object.values(data.errors)[0] as string[] | undefined)?.[0]
          : undefined;
      setError(firstFieldError || data?.message || 'Failed to create event. Please check required fields.');
      if (firstFieldError) setCurrentStep(2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Event Creation Wizard</h2>
            <p className="text-xs text-slate-500">Step {currentStep} of 4: {['Basic Information', 'Date, Time & Venue', 'Capacity & Queue Policy', 'Review & Publish'][currentStep - 1]}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-100 h-1">
          <div className="bg-indigo-600 h-1 transition-all duration-300" style={{ width: `${(currentStep / 4) * 100}%` }} />
        </div>

        {/* Body Content */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
          {!draftDecided && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <span className="font-semibold">You have an unfinished event draft.</span>
              <span className="flex gap-2">
                <button
                  onClick={() => { const d = readDraft(); if (d) applySnapshot(d); setDraftDecided(true); }}
                  className="rounded-lg bg-amber-600 px-2.5 py-1 font-bold text-white hover:bg-amber-500"
                >
                  Resume draft
                </button>
                <button
                  onClick={() => { clearDraft(); setDraftDecided(true); }}
                  className="rounded-lg border border-amber-300 px-2.5 py-1 font-bold text-amber-700 hover:bg-amber-100"
                >
                  Start fresh
                </button>
              </span>
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* STEP 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {templates.length > 0 && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    Start from a template (optional)
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => applyTemplate(e.target.value)}
                    disabled={applyingTemplate}
                    className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="">— Blank event —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-indigo-500/80">
                    Prefills capacity, waitlist, approval mode and the registration form. You can still change everything.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Tech Leadership Summit 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Event Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SUMMIT26"
                    value={eventCode}
                    onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Used as registration prefix (e.g. EVT-SUMMIT26-2026-000001)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed description of the event agenda and highlights..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Cover / Thumbnail image */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  <span className="inline-flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Cover Image / Thumbnail</span>
                </label>
                <ImageUploadField
                  value={coverImageUrl}
                  onChange={setCoverImageUrl}
                  folder="event-covers"
                  helpText="Shown on the event card and detail page. Leave blank to use an auto-generated RHB placeholder."
                />
              </div>

              {/* Supporting documents / attachments */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  <span className="inline-flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Supporting Documents (Optional)</span>
                </label>
                <p className="text-[10px] text-slate-400 mb-2">e.g. route map, agenda, consent form, floor plan. Paste an intranet / SharePoint link for each.</p>
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
                      <button
                        type="button"
                        onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                        className="p-2 text-red-400 hover:text-red-600 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setAttachments([...attachments, { label: '', url: '' }])}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Add document link
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Organizer Team Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering & HR"
                    value={organizerName}
                    onChange={(e) => setOrganizerName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="events@company.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Date & Venue */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Event Time Zone
                </label>
                <TimezoneSelect
                  value={timezone}
                  onChange={setTimezone}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Start, end and registration times below are all in this zone
                  {tzOffsetLabel(timezone) ? ` (${tzOffsetLabel(timezone)})` : ''}.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Start Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    min={nowLocalInput()}
                    value={startDate}
                    onChange={(e) => handleStartChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    End Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    min={startDate || nowLocalInput()}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Registration Opens <span className="text-slate-400 normal-case font-medium">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    min={nowLocalInput()}
                    max={startDate || undefined}
                    value={regOpenAt}
                    onChange={(e) => setRegOpenAt(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Leave blank to open immediately. For an “Upcoming” event this defaults to the start time.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Registration Closes <span className="text-slate-400 normal-case font-medium">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    min={regOpenAt || nowLocalInput()}
                    max={startDate || undefined}
                    value={regCloseAt}
                    onChange={(e) => setRegCloseAt(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Leave blank to keep registration open until the event starts.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Event Format / Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['physical', 'virtual', 'hybrid'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEventType(type)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                        eventType === type
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {eventType !== 'virtual' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Venue Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Headquarters Auditorium - Floor 3"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Street Address
                      </label>
                      <input
                        type="text"
                        placeholder="500 Innovation Blvd"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="San Francisco"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Location / Map Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://maps.app.goo.gl/… or any map link"
                      value={mapUrl}
                      onChange={(e) => setMapUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Optional. Paste a Google Maps link — shown as a “View on map” button on the event page.
                    </p>
                  </div>
                </>
              )}

              {eventType !== 'physical' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Virtual Meeting Link (Zoom/Teams)
                  </label>
                  <input
                    type="url"
                    placeholder="https://zoom.us/j/123456789"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Capacity & Queue Policy */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirmed Participant Capacity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Enforced with atomic transactional row locking.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Approval Mode
                  </label>
                  <select
                    value={approvalMode}
                    onChange={(e) => setApprovalMode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="automatic">Automatic Approval (Capacity Based)</option>
                    <option value="manual">Manual Admin Review Required</option>
                  </select>
                </div>
              </div>

              {/* Waitlist Settings */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-900">
                  <input
                    type="checkbox"
                    checked={waitlistEnabled}
                    onChange={(e) => setWaitlistEnabled(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Enable Automated FIFO Waitlist Queue</span>
                </label>

                {waitlistEnabled && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Max Waitlist Queue Capacity (Leave empty for Unlimited)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 50 (or leave blank for unlimited)"
                      value={waitlistCapacity}
                      onChange={(e) => setWaitlistCapacity(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Duplicate Registration Rule
                </label>
                <select
                  value={duplicateRule}
                  onChange={(e) => setDuplicateRule(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="email">Prevent same Email from registering twice</option>
                  <option value="phone">Prevent same Phone Number from registering twice</option>
                  <option value="employee_id">Prevent same Employee ID from registering twice</option>
                  <option value="none">Allow multiple registrations (No duplicate rule)</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Final Settings */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <h3 className="text-sm font-bold text-slate-900">Review New Event Details</h3>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Event Title</span>
                  <span className="font-bold text-slate-900">{title}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Event Code</span>
                  <span className="font-mono font-bold text-indigo-600">{eventCode || 'AUTO-GENERATED'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Confirmed Capacity</span>
                  <span className="font-bold text-slate-900">{capacity} Seats</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Waitlist Policy</span>
                  <span className="font-semibold text-slate-900">
                    {waitlistEnabled ? `FIFO Queue (Max ${waitlistCapacity || 'Unlimited'})` : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Location</span>
                  <span className="font-semibold text-slate-900">{new Date(startDate).toLocaleDateString()} • {venueName || 'Virtual'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Initial Publication Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="registration_open">Publish Now (Registration Open)</option>
                  <option value="upcoming">Publish as Upcoming (Registration Opens on Date)</option>
                  <option value="draft">Save as Draft (Preparation Mode)</option>
                </select>
              </div>

              {staffUsers.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Event team (optional)
                  </label>
                  <p className="mb-2 text-[11px] text-slate-400">
                    Assign colleagues now so they can reach this event straight away. You can change this later.
                  </p>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2">
                    {staffUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate">
                          <span className="font-semibold text-slate-800">{u.name}</span>
                          <span className="text-slate-400"> · {u.email}</span>
                        </span>
                        <select
                          value={staffAssignments[u.id] || ''}
                          onChange={(e) =>
                            setStaffAssignments((p) => {
                              const next = { ...p };
                              if (e.target.value) next[u.id] = e.target.value;
                              else delete next[u.id];
                              return next;
                            })
                          }
                          className="shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1"
                        >
                          <option value="">—</option>
                          {['owner', 'manager', 'organizer', 'registration_officer', 'checkin_staff', 'viewer'].map((r) => (
                            <option key={r} value={r}>{r.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              onClick={() => {
                const msg = stepError(currentStep);
                if (msg) {
                  setError(msg);
                  return;
                }
                setError(null);
                setCurrentStep((s) => s + 1);
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create & Launch Event</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
