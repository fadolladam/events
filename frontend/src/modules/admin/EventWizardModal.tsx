import React, { useEffect, useState } from 'react';
import { apiClient, EventAttachment, EventCategory, EventItem } from '../../services/api';
import { ImageUploadField } from '../../components/ImageUploadField';
import { X, ArrowRight, ArrowLeft, Check, Calendar, MapPin, Users, ShieldAlert, Sparkles, Plus, Trash2, Image as ImageIcon, Paperclip } from 'lucide-react';

interface EventWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (event: EventItem) => void;
}

export const EventWizardModal: React.FC<EventWizardModalProps> = ({
  isOpen,
  onClose,
  onEventCreated,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Dates
  const [startDate, setStartDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 86400000 + 7200000).toISOString().slice(0, 16));
  const [timezone, setTimezone] = useState('UTC');

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
  const [meetingUrl, setMeetingUrl] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      apiClient.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
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
        start_at: startDate,
        end_at: endDate,
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
        meeting_url: meetingUrl || undefined,
        organizer_name: organizerName || undefined,
        contact_email: contactEmail || undefined,
      };

      const res = await apiClient.post('/events', payload);
      onEventCreated(res.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create event. Please check required fields.');
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
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* STEP 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Start Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
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
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
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
                if (currentStep === 1 && !title) {
                  setError('Please provide an event title.');
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
