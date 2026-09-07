import React, { useEffect, useState } from 'react';
import { apiClient, type FormTemplateSummary } from '../../services/api';
import { X, Trash2, Pencil, Check, Layers, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** called after any change so the parent can refresh its dropdown */
  onChanged?: () => void;
}

export const FormTemplatesModal: React.FC<Props> = ({ isOpen, onClose, onChanged }) => {
  const [templates, setTemplates] = useState<FormTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/forms/templates');
      setTemplates(res.data || []);
    } catch {
      /* keep whatever we had */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchTemplates();
  }, [isOpen]);

  if (!isOpen) return null;

  const rename = async (id: number) => {
    if (!draftName.trim()) return;
    setBusyId(id);
    try {
      await apiClient.put(`/forms/templates/${id}`, { name: draftName.trim() });
      setEditingId(null);
      await fetchTemplates();
      onChanged?.();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not rename the template.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (t: FormTemplateSummary) => {
    if (!confirm(`Delete the reusable form "${t.name}"? Events already using it are not affected.`)) return;
    setBusyId(t.id);
    try {
      await apiClient.delete(`/forms/templates/${t.id}`);
      await fetchTemplates();
      onChanged?.();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not delete the template.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-7 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" /> Reusable Registration Forms
            </h2>
            <p className="text-[11px] text-slate-500">
              Saved forms you can load into any event. Built-in forms can’t be edited or deleted.
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-2">
          {loading ? (
            <div className="text-center py-10 text-xs text-slate-400">Loading…</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No reusable forms yet. Build a form for an event, then “Save as reusable form”.
            </div>
          ) : (
            templates.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-slate-200 px-4 py-3 flex items-center gap-3 hover:border-slate-300"
              >
                <div className="min-w-0 flex-1">
                  {editingId === t.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && rename(t.id)}
                        className="flex-1 px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold"
                      />
                      <button
                        onClick={() => rename(t.id)}
                        disabled={busyId === t.id}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {t.name}
                        {t.is_system && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-bold">
                            <ShieldCheck className="w-3 h-3" /> BUILT-IN
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {t.field_count} field{t.field_count === 1 ? '' : 's'}
                        {t.description ? ` · ${t.description}` : ''}
                      </div>
                    </>
                  )}
                </div>

                {editingId !== t.id && !t.is_system && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(t.id);
                        setDraftName(t.name);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                      title="Rename"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(t)}
                      disabled={busyId === t.id}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
