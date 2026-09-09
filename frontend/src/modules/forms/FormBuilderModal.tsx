import React, { useEffect, useState } from 'react';
import { apiClient, type FormField, type FormTemplateSummary } from '../../services/api';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Save, CheckCircle2, Layers, BookmarkPlus } from 'lucide-react';
import { FormTemplatesModal } from './FormTemplatesModal';

interface FormBuilderModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const FormBuilderModal: React.FC<FormBuilderModalProps> = ({
  eventId,
  isOpen,
  onClose,
}) => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Reusable form templates
  const [templates, setTemplates] = useState<FormTemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchForm();
      fetchTemplates();
      setSelectedTemplateId('');
    }
    // Re-run whenever the modal opens OR the event changes so we never keep a
    // previously opened event's form on screen.
  }, [isOpen, eventId]);

  const fetchTemplates = async () => {
    try {
      const res = await apiClient.get('/forms/templates');
      setTemplates(res.data || []);
    } catch {
      setTemplates([]);
    }
  };

  const fetchForm = async () => {
    setLoading(true);
    setLoadError(null);
    // Clear immediately: a slow or failing request must not leave the fields
    // of the last event we looked at visible for this one.
    setFields([]);
    try {
      const res = await apiClient.get(`/events/${eventId}/form`);
      setFields(res.data.fields || []);
    } catch (err) {
      console.error('Failed to load form fields', err);
      setLoadError('Could not load this event’s registration form. Close and reopen to try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const addField = () => {
    const key = `field_${Date.now()}`;
    const newField: FormField = {
      field_key: key,
      label: 'New Question',
      type: 'text',
      is_required: false,
      is_hidden: false,
      field_order: fields.length + 1,
    };
    setFields([...fields, newField]);
  };

  const removeField = (index: number) => {
    const field = fields[index];
    if (['full_name', 'email'].includes(field.field_key)) {
      alert('Full Name and Email are mandatory core fields.');
      return;
    }
    const updated = fields.filter((_, i) => i !== index);
    setFields(updated);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFields(updated);
  };

  const handleSave = async () => {
    // Never PUT when the form failed to load — that would push whatever fields
    // are on screen onto an event whose real form we never saw.
    if (loadError) return;
    setSaving(true);
    try {
      await apiClient.put(`/events/${eventId}/form`, { fields });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save form structure.');
    } finally {
      setSaving(false);
    }
  };

  /** Replace the builder's questions with a saved template (unsaved — user reviews then Saves). */
  const loadTemplate = async () => {
    if (!selectedTemplateId || loadError) return;
    const tpl = templates.find((t) => String(t.id) === selectedTemplateId);
    if (fields.length > 0 && !confirm(`Replace the current questions with "${tpl?.name}"?`)) return;
    setApplyingTemplate(true);
    try {
      const res = await apiClient.get(`/forms/templates/${selectedTemplateId}`);
      const loaded: FormField[] = (res.data.fields || []).map((f: FormField, i: number) => ({
        ...f,
        is_hidden: false,
        field_order: i + 1,
      }));
      setFields(loaded);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not load that reusable form.');
    } finally {
      setApplyingTemplate(false);
    }
  };

  /** Save the builder's current questions as a new reusable template. */
  const saveAsTemplate = async () => {
    if (loadError || fields.length === 0) return;
    const name = window.prompt('Name this reusable form (e.g. "Standard RSVP", "CSR Run"):');
    if (!name || !name.trim()) return;
    setSavingTemplate(true);
    try {
      await apiClient.post('/forms/templates', { name: name.trim(), fields });
      await fetchTemplates();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not save the reusable form.');
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Dynamic Registration Form Builder</h2>
            <p className="text-xs text-slate-500">Configure questions, field types, validation, and options for this event.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Fields List */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-4">
          {!loading && !loadError && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" /> Reusable Forms
                </span>
                <button
                  onClick={() => setManagerOpen(true)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Manage
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Load a saved form…</option>
                  {templates.some((t) => t.is_system) && (
                    <optgroup label="Built-in">
                      {templates.filter((t) => t.is_system).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · {t.field_count} fields
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {templates.some((t) => !t.is_system) && (
                    <optgroup label="Saved by your team">
                      {templates.filter((t) => !t.is_system).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · {t.field_count} fields
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <button
                  onClick={loadTemplate}
                  disabled={!selectedTemplateId || applyingTemplate}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-40 shrink-0"
                >
                  {applyingTemplate ? 'Loading…' : 'Load into builder'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Loading a form replaces the questions below. Review, then <strong>Save Form Changes</strong> to apply it to this event.
              </p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading form builder...</div>
          ) : loadError ? (
            <div className="text-center py-12 text-red-500 text-xs">{loadError}</div>
          ) : (
            fields.map((f, i) => {
              const isLocked = ['full_name', 'email'].includes(f.field_key);

              return (
                <div
                  key={f.field_key}
                  className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[11px]">
                      {i + 1}
                    </span>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={f.label}
                        onChange={(e) => updateField(i, { label: e.target.value })}
                        placeholder="Question / Field Label"
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      />

                      <select
                        value={f.type}
                        disabled={isLocked}
                        onChange={(e) => updateField(i, { type: e.target.value })}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                      >
                        <option value="text">Single-line Text</option>
                        <option value="textarea">Paragraph Text</option>
                        <option value="email">Email Address</option>
                        <option value="phone">Phone Number</option>
                        <option value="employee_id">Employee ID</option>
                        <option value="number">Numeric</option>
                        <option value="date">Date</option>
                        <option value="time">Time</option>
                        <option value="select">Dropdown Select</option>
                        <option value="radio">Radio Buttons</option>
                        <option value="checkbox">Checkboxes (multi)</option>
                        <option value="multi_select">Multi-select list</option>
                        <option value="consent">Consent checkbox</option>
                        <option value="info">Info text (display only)</option>
                      </select>
                    </div>

                    {/* Order & Delete Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveField(i, 'up')}
                        disabled={i === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveField(i, 'down')}
                        disabled={i === fields.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      {!isLocked && (
                        <button
                          onClick={() => removeField(i)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Options editor for select/radio/checkbox */}
                  {['select', 'radio', 'checkbox', 'multi_select'].includes(f.type) && (
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Choices — one per line (e.g. jersey sizes)
                      </label>
                      <textarea
                        rows={Math.max(3, (f.options || []).length + 1)}
                        placeholder={'XS\nS\nM\nL\nXL\nXXL'}
                        value={(f.options || []).join('\n')}
                        onChange={(e) =>
                          updateField(i, {
                            options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                      />
                      {(f.options || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(f.options || []).map((opt) => (
                            <span key={opt} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-100">
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Help text */}
                  <div className="text-xs">
                    <input
                      type="text"
                      placeholder="Helper text shown under the field (optional)"
                      value={f.help_text || ''}
                      onChange={(e) => updateField(i, { help_text: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                  </div>

                  {/* Required check */}
                  <div className="flex items-center gap-4 text-xs pt-1">
                    <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={f.is_required}
                        disabled={isLocked}
                        onChange={(e) => updateField(i, { is_required: e.target.checked })}
                        className="rounded text-indigo-600"
                      />
                      <span>Required Field</span>
                    </label>
                  </div>

                  {/* Conditional visibility (#24) */}
                  {!isLocked && i > 0 && (() => {
                    const choiceSources = fields
                      .slice(0, i)
                      .filter((s) => ['select', 'radio', 'checkbox', 'multi_select'].includes(s.type) && (s.options || []).length > 0);
                    const cond = f.conditional_logic || null;
                    if (choiceSources.length === 0) return null;
                    const src = choiceSources.find((s) => s.field_key === cond?.field);
                    return (
                      <div className="pt-2 border-t border-slate-100 text-xs space-y-2">
                        <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!cond?.field}
                            onChange={(e) =>
                              updateField(i, {
                                conditional_logic: e.target.checked
                                  ? { field: choiceSources[0].field_key, operator: 'equals', value: (choiceSources[0].options || [])[0] || '' }
                                  : null,
                              })
                            }
                            className="rounded text-indigo-600"
                          />
                          <span>Only show this field when…</span>
                        </label>
                        {cond?.field && (
                          <div className="flex flex-wrap items-center gap-1.5 pl-5">
                            <select
                              value={cond.field}
                              onChange={(e) => {
                                const ns = choiceSources.find((s) => s.field_key === e.target.value);
                                updateField(i, { conditional_logic: { ...cond, field: e.target.value, value: (ns?.options || [])[0] || '' } });
                              }}
                              className="px-2 py-1 rounded-lg border border-slate-300 bg-white"
                            >
                              {choiceSources.map((s) => (
                                <option key={s.field_key} value={s.field_key}>{s.label}</option>
                              ))}
                            </select>
                            <select
                              value={cond.operator || 'equals'}
                              onChange={(e) => updateField(i, { conditional_logic: { ...cond, operator: e.target.value } })}
                              className="px-2 py-1 rounded-lg border border-slate-300 bg-white"
                            >
                              <option value="equals">is</option>
                              <option value="not_equals">is not</option>
                            </select>
                            <select
                              value={Array.isArray(cond.value) ? cond.value[0] : cond.value || ''}
                              onChange={(e) => updateField(i, { conditional_logic: { ...cond, value: e.target.value } })}
                              className="px-2 py-1 rounded-lg border border-slate-300 bg-white"
                            >
                              {(src?.options || []).map((o) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })
          )}

          {!loading && !loadError && (
            <button
              onClick={addField}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 text-slate-600 hover:text-indigo-600 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Question / Field</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            {savedSuccess && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Form configuration saved!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={saveAsTemplate}
              disabled={savingTemplate || loading || !!loadError || fields.length === 0}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 disabled:opacity-40"
              title="Save these questions as a reusable form"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>{savingTemplate ? 'Saving…' : 'Save as reusable form'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading || !!loadError}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Form Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      <FormTemplatesModal
        isOpen={managerOpen}
        onClose={() => setManagerOpen(false)}
        onChanged={fetchTemplates}
      />
    </div>
  );
};
