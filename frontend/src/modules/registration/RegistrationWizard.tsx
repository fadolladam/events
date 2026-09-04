import React, { useState } from 'react';
import { apiClient, EventItem, Registration } from '../../services/api';
import confetti from 'canvas-confetti';
import { CheckCircle2, Clock, Ticket, ArrowLeft, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface RegistrationWizardProps {
  event: EventItem;
  onBack: () => void;
  onViewTicket: (secureToken: string) => void;
  onNavigateToLookup?: () => void;
}

export const RegistrationWizard: React.FC<RegistrationWizardProps> = ({
  event,
  onBack,
  onViewTicket,
  onNavigateToLookup,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Standard Participant fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Dynamic answers
  const [customAnswers, setCustomAnswers] = useState<Record<string, { label: string; value: any }>>({});

  // Result state
  const [result, setResult] = useState<{
    registration: Registration;
    queue_position?: number | null;
    ticket_token?: string | null;
  } | null>(null);

  const formFields = event.form?.fields || [];

  const handleCustomFieldChange = (fieldKey: string, fieldLabel: string, value: any) => {
    setCustomAnswers((prev) => ({
      ...prev,
      [fieldKey]: { label: fieldLabel, value },
    }));
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError('Please provide your name and email address.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    if (!termsAccepted) {
      setError('Please accept the event terms and conditions to proceed.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name,
        email,
        phone,
        employee_id: employeeId || undefined,
        department: department || undefined,
        answers: customAnswers,
        source: 'web_portal',
      };

      const res = await apiClient.post(`/public/events/${event.id}/register`, payload);

      setResult({
        registration: res.data.registration,
        queue_position: res.data.queue_position,
        ticket_token: res.data.ticket?.secure_token || res.data.registration.ticket?.secure_token || null,
      });

      setStep(3);

      if (res.data.registration.status === 'confirmed') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        {step !== 3 && (
          <button
            onClick={() => (step === 2 ? setStep(1) : onBack())}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{step === 2 ? 'Back to Edit Information' : 'Cancel & Back to Event'}</span>
          </button>
        )}

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <span className={step >= 1 ? 'text-indigo-600' : ''}>1. Registration Info</span>
            <span className={step >= 2 ? 'text-indigo-600' : ''}>2. Review & Consent</span>
            <span className={step === 3 ? 'text-indigo-600' : ''}>3. Confirmation</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Registration Form */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{event.event_code}</span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">{event.title}</h2>
              <p className="text-xs text-slate-500 mt-1">Please provide accurate information for registration.</p>
            </div>

            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. jane@company.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              {/* Dynamic Event Form Fields */}
              {formFields.filter((f) => !['full_name', 'email', 'phone'].includes(f.field_key) && !f.is_hidden).map((f) => (
                <div key={f.field_key}>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {f.label} {f.is_required && <span className="text-red-500">*</span>}
                  </label>

                  {f.type === 'select' ? (
                    <select
                      required={f.is_required}
                      value={customAnswers[f.field_key]?.value || ''}
                      onChange={(e) => handleCustomFieldChange(f.field_key, f.label, e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                    >
                      <option value="">-- Select an option --</option>
                      {(f.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : f.type === 'radio' ? (
                    <div className="space-y-2 mt-1">
                      {(f.options || []).map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name={f.field_key}
                            value={opt}
                            required={f.is_required}
                            checked={customAnswers[f.field_key]?.value === opt}
                            onChange={(e) => handleCustomFieldChange(f.field_key, f.label, e.target.value)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : f.type === 'checkbox' && (f.options || []).length > 0 ? (
                    <div className="space-y-2 mt-1">
                      {(f.options || []).map((opt) => {
                        const selected: string[] = Array.isArray(customAnswers[f.field_key]?.value)
                          ? customAnswers[f.field_key].value
                          : [];
                        return (
                          <label key={opt} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected.includes(opt)}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...selected, opt]
                                  : selected.filter((s) => s !== opt);
                                handleCustomFieldChange(f.field_key, f.label, next);
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : f.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={customAnswers[f.field_key]?.value === true}
                        onChange={(e) => handleCustomFieldChange(f.field_key, f.label, e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{f.placeholder || 'Yes'}</span>
                    </label>
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : 'text'}
                      required={f.is_required}
                      placeholder={f.placeholder || ''}
                      value={customAnswers[f.field_key]?.value || ''}
                      onChange={(e) => handleCustomFieldChange(f.field_key, f.label, e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  )}
                  {f.help_text && <p className="text-[11px] text-slate-400 mt-1">{f.help_text}</p>}
                </div>
              ))}

              <button
                type="submit"
                className="w-full mt-6 py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Continue to Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Review & Submit */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Review Registration Details</h2>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Event</span>
                <span className="font-semibold text-slate-900">{event.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Full Name</span>
                <span className="font-semibold text-slate-900">{name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Email Address</span>
                <span className="font-semibold text-slate-900">{email}</span>
              </div>
              {phone && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Phone</span>
                  <span className="font-semibold text-slate-900">{phone}</span>
                </div>
              )}
              {Object.entries(customAnswers).map(([k, val]) => (
                <div key={k} className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">{val.label}</span>
                  <span className="font-semibold text-slate-900">{String(val.value)}</span>
                </div>
              ))}
            </div>

            {/* Terms Consent */}
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  I agree to the event guidelines, registration terms, and allow RHB Bank to process my information for attendance and ticketing purposes.
                </span>
              </label>
            </div>

            <button
              onClick={handleFinalSubmit}
              disabled={loading || !termsAccepted}
              className="w-full py-4 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Confirm & Submit Registration</span>
              )}
            </button>
          </div>
        )}

        {/* STEP 3: Success Screen */}
        {step === 3 && result && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-6">
            {result.registration.status === 'confirmed' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Registration Confirmed!</h2>
                  <p className="text-xs text-slate-500 mt-1">Your seat is secured. Please save your permanent registration number.</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                  <Clock className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Added to Waiting List</h2>
                  <p className="text-xs text-slate-500 mt-1">Confirmed capacity is currently full. You have been placed on the FIFO queue.</p>
                </div>
              </>
            )}

            {/* Permanent Registration Badge */}
            <div className="p-6 rounded-2xl bg-slate-900 text-white shadow-md">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                Permanent Registration Number
              </div>
              <div className="text-2xl font-mono font-extrabold text-indigo-400 tracking-wider mt-1">
                {result.registration.registration_number}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-around text-xs">
                <div>
                  <div className="text-slate-400">Status</div>
                  <div className={`font-bold uppercase ${result.registration.status === 'confirmed' ? 'text-emerald-400' : 'text-amber-400'}`}>{result.registration.status}</div>
                </div>
                {result.queue_position && (
                  <div>
                    <div className="text-slate-400">Queue Position</div>
                    <div className="font-bold text-amber-400">#{result.queue_position}</div>
                  </div>
                )}
                <div>
                  <div className="text-slate-400">Participant</div>
                  <div className="font-bold text-slate-200">{result.registration.participant.name}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              {result.registration.status === 'confirmed' && result.ticket_token ? (
                <button
                  onClick={() => onViewTicket(result.ticket_token as string)}
                  className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Ticket className="w-4 h-4" />
                  <span>View Digital QR Ticket & Portal</span>
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed text-left">
                  Your QR ticket is issued only once a seat is confirmed. Keep your
                  registration number — you'll be notified by email if you're promoted
                  from the waiting list, and you can check your status any time.
                </div>
              )}

              {result.registration.status !== 'confirmed' && onNavigateToLookup && (
                <button
                  onClick={onNavigateToLookup}
                  className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Check My Registration Status</span>
                </button>
              )}

              <button
                onClick={onBack}
                className="w-full py-3 px-6 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
              >
                Back to Events
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
