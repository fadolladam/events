import React, { useEffect, useMemo, useState } from 'react';
import { apiClient, EventItem, FormField } from '../../services/api';
import { X, UserPlus, Loader2 } from 'lucide-react';

interface ParticipantHit {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  employee_id?: string | null;
  department?: string | null;
}

interface Props {
  event: EventItem;
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful registration so the caller can refresh. */
  onCreated: (summary: { status: string; registration_number: string; queue_position: number | null }) => void;
}

type AnswerMap = Record<string, { label: string; value: any }>;

const CORE_KEYS = ['full_name', 'email', 'phone'];

/**
 * Admin-side manual registration. Renders the participant identity fields plus
 * the event's own dynamic form, then posts to `POST /events/{id}/registrations`
 * which runs the SAME RegistrationService as the public form (capacity,
 * duplicate rules, approval mode, waitlist, ticket, audit).
 */
export const ManualRegistrationModal: React.FC<Props> = ({ event, isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<ParticipantHit[]>([]);
  const [pickedExisting, setPickedExisting] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);

  const dynamicFields = useMemo<FormField[]>(
    () => (event.form?.fields || []).filter((f) => !CORE_KEYS.includes(f.field_key) && !f.is_hidden),
    [event.form],
  );

  // Type-ahead against the participant directory.
  useEffect(() => {
    if (!isOpen || pickedExisting) return;
    const q = (email.trim() || name.trim());
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      apiClient
        .get('/participants/lookup', { params: { q } })
        .then((res) => setSuggestions(res.data.data || []))
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [name, email, isOpen, pickedExisting]);

  if (!isOpen) return null;

  const applyHit = (h: ParticipantHit) => {
    setName(h.name);
    setEmail(h.email);
    setPhone(h.phone || '');
    setEmployeeId(h.employee_id || '');
    setDepartment(h.department || '');
    setPickedExisting(true);
    setShowSuggest(false);
    setSuggestions([]);
  };

  const setAnswer = (key: string, label: string, value: any) =>
    setAnswers((prev) => ({ ...prev, [key]: { label, value } }));

  const reset = () => {
    setName(''); setEmail(''); setPhone(''); setEmployeeId(''); setDepartment(''); setNotes('');
    setAnswers({}); setError(null); setFieldErrors({});
    setSuggestions([]); setPickedExisting(false); setShowSuggest(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await apiClient.post(`/events/${event.id}/registrations`, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        employee_id: employeeId.trim() || null,
        department: department.trim() || null,
        notes: notes.trim() || null,
        answers,
      });
      const reg = res.data.registration;
      reset();
      onCreated({
        status: reg.status,
        registration_number: reg.registration_number,
        queue_position: res.data.queue_position ?? null,
      });
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors) {
        const flat: Record<string, string> = {};
        Object.entries(data.errors as Record<string, string[]>).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setFieldErrors(flat);
      }
      setError(data?.message || 'Could not register this participant.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600"><UserPlus className="h-4 w-4" /></span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Add participant manually</h3>
              <p className="text-[11px] text-slate-400">{event.title} — same rules as the public form apply</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {pickedExisting && (
            <p className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
              Using an existing participant record.
              <button
                type="button"
                onClick={() => setPickedExisting(false)}
                className="font-bold underline"
              >
                edit details
              </button>
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={fieldErrors.name}>
              <div className="relative">
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setPickedExisting(false); setShowSuggest(true); }}
                  onFocus={() => setShowSuggest(true)}
                  onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                  required
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {showSuggest && suggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white text-xs shadow-lg">
                    {suggestions.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); applyHit(h); }}
                          className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                        >
                          <span className="font-semibold text-slate-900">{h.name}</span>
                          <span className="text-slate-400"> · {h.email}</span>
                          {h.employee_id && <span className="text-slate-400"> · {h.employee_id}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Field>
            <Field label="Email" required error={fieldErrors.email}>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setPickedExisting(false); }}
                required
                autoComplete="off"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Field>
            <Field label="Phone" error={fieldErrors.phone}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Field>
            <Field label="Employee ID" error={fieldErrors.employee_id}>
              <input
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Field>
            <Field label="Department" error={fieldErrors.department}>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Field>
          </div>

          {dynamicFields.length > 0 && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              {dynamicFields.map((f) =>
                f.type === 'info' ? (
                  <p key={f.field_key} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {f.label}
                  </p>
                ) : (
                <Field key={f.field_key} label={f.label} required={f.is_required} error={fieldErrors[f.field_key]} help={f.help_text}>
                  {f.type === 'select' ? (
                    <select
                      required={f.is_required}
                      value={answers[f.field_key]?.value || ''}
                      onChange={(e) => setAnswer(f.field_key, f.label, e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Select --</option>
                      {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'radio' ? (
                    <div className="mt-1 space-y-1.5">
                      {(f.options || []).map((o) => (
                        <label key={o} className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                          <input
                            type="radio"
                            name={f.field_key}
                            value={o}
                            required={f.is_required}
                            checked={answers[f.field_key]?.value === o}
                            onChange={(e) => setAnswer(f.field_key, f.label, e.target.value)}
                          />
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                  ) : (f.type === 'checkbox' || f.type === 'multi_select') && (f.options || []).length > 0 ? (
                    <div className="mt-1 space-y-1.5">
                      {(f.options || []).map((o) => {
                        const sel: string[] = Array.isArray(answers[f.field_key]?.value) ? answers[f.field_key].value : [];
                        return (
                          <label key={o} className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={sel.includes(o)}
                              onChange={(e) =>
                                setAnswer(f.field_key, f.label, e.target.checked ? [...sel, o] : sel.filter((s) => s !== o))
                              }
                            />
                            <span>{o}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : f.type === 'checkbox' || f.type === 'consent' ? (
                    <label className="mt-1 flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        required={f.type === 'consent' && f.is_required}
                        checked={answers[f.field_key]?.value === true}
                        onChange={(e) => setAnswer(f.field_key, f.label, e.target.checked)}
                      />
                      <span>{f.placeholder || (f.type === 'consent' ? 'I agree' : 'Yes')}</span>
                    </label>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      required={f.is_required}
                      rows={3}
                      placeholder={f.placeholder || ''}
                      value={answers[f.field_key]?.value || ''}
                      onChange={(e) => setAnswer(f.field_key, f.label, e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text'}
                      required={f.is_required}
                      placeholder={f.placeholder || ''}
                      value={answers[f.field_key]?.value || ''}
                      onChange={(e) => setAnswer(f.field_key, f.label, e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </Field>
              ),
              )}
            </div>
          )}

          <Field label="Internal note (optional)" help="Stored on the registration; not shown to the participant.">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Register participant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
}> = ({ label, required, error, help, children }) => (
  <div>
    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {help && !error && <p className="mt-1 text-[11px] text-slate-400">{help}</p>}
    {error && <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>}
  </div>
);
