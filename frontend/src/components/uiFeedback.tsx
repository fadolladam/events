import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

/**
 * App-wide, imperative replacements for window.alert / window.confirm.
 * Mount <FeedbackHost /> once near the app root; then call toast(...) or
 * `await confirmDialog(...)` from anywhere.
 */

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: ToastKind; message: string }
interface ConfirmReq {
  id: number;
  message: string;
  title?: string;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
  resolve: (ok: boolean) => void;
}

let pushToast: ((t: Omit<ToastItem, 'id'>) => void) | null = null;
let pushConfirm: ((c: Omit<ConfirmReq, 'id'>) => void) | null = null;
let seq = 1;

export const toast = (message: string, kind: ToastKind = 'info') => {
  if (pushToast) pushToast({ kind, message });
  else if (kind === 'error') console.error(message);
};

export const confirmDialog = (
  opts: string | { message: string; title?: string; confirmLabel?: string; tone?: 'default' | 'danger' },
): Promise<boolean> =>
  new Promise((resolve) => {
    const o = typeof opts === 'string' ? { message: opts } : opts;
    if (pushConfirm) pushConfirm({ ...o, resolve });
    else resolve(window.confirm(o.message));
  });

export const FeedbackHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirms, setConfirms] = useState<ConfirmReq[]>([]);

  useEffect(() => {
    pushToast = (t) => {
      const id = seq++;
      setToasts((cur) => [...cur, { ...t, id }]);
      window.setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 5000);
    };
    pushConfirm = (c) => setConfirms((cur) => [...cur, { ...c, id: seq++ }]);
    return () => { pushToast = null; pushConfirm = null; };
  }, []);

  const answer = (id: number, ok: boolean) => {
    setConfirms((cur) => {
      cur.find((c) => c.id === id)?.resolve(ok);
      return cur.filter((c) => c.id !== id);
    });
  };

  const active = confirms[0];

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-white shadow-lg ${
              t.kind === 'success' ? 'bg-emerald-600' : t.kind === 'error' ? 'bg-rose-600' : 'bg-slate-800'
            }`}
          >
            {t.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : t.kind === 'error' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : null}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts((c) => c.filter((x) => x.id !== t.id))} className="opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">{active.title || 'Please confirm'}</h3>
            <p className="mt-2 text-xs text-slate-600">{active.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => answer(active.id, false)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
              <button
                onClick={() => answer(active.id, true)}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white ${active.tone === 'danger' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
              >
                {active.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
