import React, { useRef, useState } from 'react';
import { apiClient } from '../../services/api';
import { X, Upload, Loader2, FileText } from 'lucide-react';

interface Props {
  eventId: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ImportResult {
  rows: number;
  confirmed: number;
  waitlisted: number;
  failures: string[];
  dry_run: boolean;
}

/**
 * Upload a CSV of registrations. Runs through the same engine as the manual
 * form (POST /events/{id}/registrations/import). "Validate only" does a dry run.
 */
export const RegistrationImportModal: React.FC<Props> = ({ eventId, eventTitle, isOpen, onClose, onImported }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setFile(null);
    setError(null);
    setResult(null);
    setDryRun(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body = new FormData();
      body.append('file', file);
      if (dryRun) body.append('dry_run', '1');
      const res = await apiClient.post(`/events/${eventId}/registrations/import`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data as ImportResult);
      if (!dryRun) onImported();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.errors?.file?.[0] || 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600"><Upload className="h-4 w-4" /></span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Import registrations from CSV</h3>
              <p className="text-[11px] text-slate-400">{eventTitle}</p>
            </div>
          </div>
          <button onClick={close} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5 text-sm">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Columns: <code className="font-mono">full_name</code> (required),{' '}
            <code className="font-mono">email</code>, <code className="font-mono">phone</code>,{' '}
            <code className="font-mono">staff_id</code>, <code className="font-mono">department</code>. Any other
            column must match a form field key. Rows fill seats to capacity, then the waiting list. Max 2000 rows.
          </p>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-6 hover:bg-slate-50">
            <FileText className="h-5 w-5 text-slate-400" />
            <span className="text-xs text-slate-600">
              {file ? file.name : 'Choose a .csv file…'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
              }}
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            Validate only (dry run — nothing is written)
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>}

          {result && (
            <div className="rounded-lg border border-slate-200 p-3 text-xs">
              <p className="font-bold text-slate-800">
                {result.dry_run ? 'Dry run' : 'Imported'} — {result.rows} row(s) read
                {!result.dry_run && `, ${result.confirmed} confirmed, ${result.waitlisted} waitlisted`}
                {`, ${result.failures.length} skipped`}
              </p>
              {result.failures.length > 0 && (
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-rose-600">
                  {result.failures.map((f, i) => (
                    <li key={i}>• {f}</li>
                  ))}
                </ul>
              )}
              {result.dry_run && result.failures.length === 0 && (
                <p className="mt-1 text-emerald-600">All rows valid — untick "Validate only" and import.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 p-5">
          <button onClick={close} disabled={busy} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            {result && !result.dry_run ? 'Done' : 'Cancel'}
          </button>
          <button
            onClick={submit}
            disabled={busy || !file}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {dryRun ? 'Validate' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};
