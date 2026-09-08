import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Copy, Check, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  title: string;
}

const publicEventUrl = (slug: string) => `${window.location.origin}/events/${slug}`;

const slugifyName = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'event';

/**
 * Shows a scannable QR code that points straight at the public event detail
 * page (`/events/:slug`). Staff can download a print-ready PNG or copy the link.
 */
export const EventQrModal: React.FC<Props> = ({ isOpen, onClose, slug, title }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const url = publicEventUrl(slug);

  useEffect(() => {
    if (!isOpen) return;
    setDataUrl(null);
    setError(null);
    setCopied(false);
    QRCode.toDataURL(url, { width: 960, margin: 2, errorCorrectionLevel: 'M' })
      .then(setDataUrl)
      .catch((e) => {
        console.error('QR generation failed', e);
        setError('Could not generate the QR code.');
      });
  }, [isOpen, url]);

  if (!isOpen) return null;

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `event-qr-${slugifyName(title)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked (insecure context / permission) — no-op */
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Event QR Code</h2>
            <p className="text-xs text-slate-500">Scans straight to the public event page.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4">
          {error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-center aspect-square">
              {dataUrl ? (
                <img src={dataUrl} alt={`QR code for ${title}`} className="w-full h-full object-contain" />
              ) : (
                <div className="text-xs text-slate-400">Generating…</div>
              )}
            </div>
          )}

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Destination</div>
            <div className="text-xs font-mono text-slate-600 break-all bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              {url}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
          <button
            onClick={download}
            disabled={!dataUrl}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Download PNG
          </button>
          <button
            onClick={copy}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs flex items-center justify-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
