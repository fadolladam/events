import React, { useEffect, useRef, useState } from 'react';
import { apiClient, EventItem, CheckinRecord } from '../../services/api';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Search, CheckCircle2, AlertTriangle, ArrowLeft, Undo2, UserCheck, Camera, CameraOff, Upload } from 'lucide-react';

interface QrScannerConsoleProps {
  eventId: string;
  onBack: () => void;
  /** rendered inside the Event console shell — hide own page chrome */
  embedded?: boolean;
}

const READER_ID = 'qr-reader-container';

type ScanState = 'SUCCESS' | 'DUPLICATE' | 'INVALID' | 'REVOKED' | 'WRONG_EVENT' | 'CANCELLED' | 'NOT_ELIGIBLE';

interface ScanOutcome {
  state: ScanState;
  detail?: string;
  at?: string;
  participant?: { name?: string; employee_id?: string; department?: string; registration_number?: string };
}

const STATE_STYLE: Record<ScanState, { bg: string; label: string }> = {
  SUCCESS: { bg: 'bg-emerald-600', label: 'CHECKED IN' },
  DUPLICATE: { bg: 'bg-amber-500', label: 'ALREADY CHECKED IN' },
  INVALID: { bg: 'bg-rose-600', label: 'INVALID TICKET' },
  REVOKED: { bg: 'bg-rose-700', label: 'TICKET REVOKED' },
  WRONG_EVENT: { bg: 'bg-rose-600', label: 'WRONG EVENT' },
  CANCELLED: { bg: 'bg-slate-700', label: 'REGISTRATION CANCELLED' },
  NOT_ELIGIBLE: { bg: 'bg-rose-600', label: 'NOT ELIGIBLE' },
};

/** Map a backend check-in error message to one of the named states. */
const classifyCheckinError = (msg: string): ScanState => {
  const m = (msg || '').toLowerCase();
  if (m.includes('revoked')) return 'REVOKED';
  if (m.includes('not this event') || m.includes('registered for')) return 'WRONG_EVENT';
  if (m.includes('already')) return 'DUPLICATE';
  if (m.includes('cancelled')) return 'CANCELLED';
  if (m.includes('must be confirmed') || m.includes('status:')) return 'NOT_ELIGIBLE';
  return 'INVALID';
};

export const QrScannerConsole: React.FC<QrScannerConsoleProps> = ({ eventId, onBack, embedded = false }) => {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<CheckinRecord[]>([]);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [scanOutcome, setScanOutcome] = useState<ScanOutcome | null>(null);

  // Camera state
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  const qrRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const secure = typeof window !== 'undefined' && (window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  const hasMediaApi = typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;

  useEffect(() => {
    fetchEventAndRecent();
    qrRef.current = new Html5Qrcode(READER_ID, { verbose: false });

    return () => {
      const inst = qrRef.current;
      qrRef.current = null;
      if (!inst) return;
      // inst.stop() throws *synchronously* if the scanner was never started —
      // that throw must not escape a React effect cleanup (it would blank the
      // whole console). Guard both the sync throw and the async rejection.
      try {
        const maybePromise = inst.stop() as unknown as Promise<void> | undefined;
        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.catch(() => {}).finally(() => {
            try { inst.clear(); } catch { /* ignore */ }
          });
          return;
        }
      } catch { /* scanner was not running */ }
      try { inst.clear(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Enumerate cameras once the API is available.
  useEffect(() => {
    if (!secure || !hasMediaApi) return;
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!devices || devices.length === 0) {
          setCamError('No camera was detected on this device.');
          return;
        }
        setCameras(devices.map((d) => ({ id: d.id, label: d.label || 'Camera' })));
        // Prefer a back/environment camera when present.
        const back = devices.find((d) => /back|rear|environment/i.test(d.label));
        setSelectedCamera((back || devices[devices.length - 1]).id);
      })
      .catch((err) => {
        setCamError(
          err?.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in your browser settings and reload.'
            : `Could not access cameras: ${err?.message || err}`,
        );
      });
  }, [secure, hasMediaApi]);

  const fetchEventAndRecent = async () => {
    try {
      const [evRes, recRes] = await Promise.all([
        apiClient.get(`/events/${eventId}`),
        apiClient.get(`/events/${eventId}/checkin/recent`),
      ]);
      setEvent(evRes.data);
      setRecentCheckins(recRes.data);
    } catch (err) {
      console.error('Failed to load event or check-ins', err);
    }
  };

  const playFeedback = (type: 'success' | 'warning' | 'error') => {
    if ('vibrate' in navigator) {
      if (type === 'success') navigator.vibrate([100, 50, 100]);
      if (type === 'warning') navigator.vibrate([200, 100, 200]);
      if (type === 'error') navigator.vibrate([400]);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    setStatusMessage(null);
    setScanOutcome(null);

    try {
      const res = await apiClient.post(`/events/${eventId}/checkin/scan`, { qr_data: decodedText });
      const p = res.data.participant;
      const reg = res.data.registration;
      const panel = {
        name: p?.name,
        employee_id: p?.employee_id,
        department: p?.department,
        registration_number: reg?.registration_number,
      };

      if (res.data.already_checked_in) {
        playFeedback('warning');
        setScanOutcome({
          state: 'DUPLICATE',
          at: res.data.last_checkin?.checked_in_at,
          participant: panel,
        });
      } else {
        await executeCheckIn(reg.id, panel);
      }
    } catch (err: any) {
      playFeedback('error');
      const msg = err.response?.data?.message || 'Ticket or QR not recognized.';
      setScanOutcome({ state: classifyCheckinError(msg), detail: msg });
    } finally {
      setTimeout(() => {
        processingRef.current = false;
        setProcessing(false);
      }, 1500);
    }
  };

  const executeCheckIn = async (registrationId: string, panel?: ScanOutcome['participant']) => {
    try {
      const res = await apiClient.post(`/events/${eventId}/checkin`, {
        registration_id: registrationId,
        type: 'qr_scan',
        gate: 'Main Gate',
      });
      playFeedback('success');
      const reg = res.data.checkin.registration;
      setScanOutcome({
        state: 'SUCCESS',
        at: res.data.checkin.checked_in_at,
        participant: panel ?? {
          name: reg?.participant?.name,
          employee_id: reg?.participant?.employee_id,
          department: reg?.participant?.department,
          registration_number: reg?.registration_number,
        },
      });
      fetchEventAndRecent();
    } catch (err: any) {
      playFeedback('error');
      const msg = err.response?.data?.message || 'Check-in failed.';
      setScanOutcome({ state: classifyCheckinError(msg), detail: msg, participant: panel });
    }
  };

  const startCamera = async () => {
    const inst = qrRef.current;
    if (!inst || !selectedCamera) return;
    setCamError(null);
    setInitializing(true);
    try {
      await inst.start(
        selectedCamera,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decoded) => { onScanSuccess(decoded); },
        () => {/* per-frame decode noise, ignore */},
      );
      setScanning(true);
    } catch (err: any) {
      setCamError(
        err?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access for this site and try again.'
          : err?.name === 'NotReadableError'
          ? 'The camera is already in use by another application or tab.'
          : `Unable to start camera: ${err?.message || err}`,
      );
    } finally {
      setInitializing(false);
    }
  };

  const stopCamera = async () => {
    const inst = qrRef.current;
    if (!inst) return;
    try {
      await inst.stop();
    } catch { /* ignore */ }
    setScanning(false);
  };

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !qrRef.current) return;
    if (scanning) await stopCamera();
    setCamError(null);
    try {
      const decoded = await qrRef.current.scanFile(file, true);
      await onScanSuccess(decoded);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'No QR code found in that image.' });
    } finally {
      e.target.value = '';
    }
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSearch.trim()) return;
    try {
      const res = await apiClient.get(`/events/${eventId}/checkin/search`, { params: { q: manualSearch } });
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualCheckIn = async (regId: string) => {
    try {
      await apiClient.post(`/events/${eventId}/checkin`, { registration_id: regId, type: 'manual_search', gate: 'Manual Desk' });
      setStatusMessage({ type: 'success', text: 'Participant checked in manually.' });
      setSearchResults([]);
      setManualSearch('');
      fetchEventAndRecent();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Check-in failed.' });
    }
  };

  const handleUndoCheckIn = async (regId: string) => {
    if (!confirm('Undo check-in for this participant?')) return;
    try {
      await apiClient.post(`/events/${eventId}/checkin/undo`, { registration_id: regId, reason: 'Staff manual reversal' });
      setStatusMessage({ type: 'success', text: 'Check-in undone successfully.' });
      fetchEventAndRecent();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Undo check-in failed.' });
    }
  };

  return (
    <div className={embedded ? 'space-y-6' : 'p-4 sm:p-8 max-w-5xl mx-auto space-y-6'}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          {!embedded && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Event</span>
            </button>
          )}
          <h2 className={embedded ? 'text-base font-bold text-slate-900' : 'text-2xl font-extrabold text-slate-900 tracking-tight'}>
            QR Check-In Console
          </h2>
          <p className="text-xs text-slate-500">
            {embedded ? 'Live attendance station for this event.' : `Live attendance station for ${event?.title}`}
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Checked In</span>
          <div className="text-xl font-extrabold text-emerald-600">
            {event?.checked_in_count || 0} / {event?.confirmed_count || 0}
          </div>
        </div>
      </div>

      {/* Large scan-outcome card (#30) */}
      {scanOutcome && (
        <div className={`rounded-2xl p-5 text-white shadow-lg ${STATE_STYLE[scanOutcome.state].bg}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {scanOutcome.state === 'SUCCESS' ? (
                <CheckCircle2 className="h-8 w-8 shrink-0" />
              ) : (
                <AlertTriangle className="h-8 w-8 shrink-0" />
              )}
              <div>
                <div className="text-lg font-extrabold tracking-wide">{STATE_STYLE[scanOutcome.state].label}</div>
                {scanOutcome.at && (
                  <div className="text-xs opacity-90">
                    {scanOutcome.state === 'SUCCESS' ? 'at ' : 'previously at '}
                    {new Date(scanOutcome.at).toLocaleTimeString()}
                  </div>
                )}
                {scanOutcome.detail && <div className="text-xs opacity-90">{scanOutcome.detail}</div>}
              </div>
            </div>
            <button
              onClick={() => setScanOutcome(null)}
              className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold hover:bg-white/30"
            >
              Scan next
            </button>
          </div>

          {scanOutcome.participant?.name && (
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 border-t border-white/20 pt-3 text-sm sm:grid-cols-4">
              <div><span className="block text-[10px] uppercase opacity-75">Name</span>{scanOutcome.participant.name}</div>
              {scanOutcome.participant.registration_number && (
                <div><span className="block text-[10px] uppercase opacity-75">Reg #</span><span className="font-mono">{scanOutcome.participant.registration_number}</span></div>
              )}
              {scanOutcome.participant.employee_id && (
                <div><span className="block text-[10px] uppercase opacity-75">Employee ID</span>{scanOutcome.participant.employee_id}</div>
              )}
              {scanOutcome.participant.department && (
                <div><span className="block text-[10px] uppercase opacity-75">Department</span>{scanOutcome.participant.department}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status Feedback Alert (manual-search + file flows) */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
              : statusMessage.type === 'warning'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
              : 'bg-red-500 text-white shadow-lg shadow-red-500/20'
          }`}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertTriangle className="w-6 h-6 shrink-0" />}
          <span className="text-sm">{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: QR Camera Scanner */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-indigo-600" /> Camera Scanner
            </span>
            {scanning ? (
              <button onClick={stopCamera} className="text-xs font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1">
                <CameraOff className="w-3.5 h-3.5" /> Stop
              </button>
            ) : null}
          </div>

          {/* Not-supported notice */}
          {(!secure || !hasMediaApi) && (
            <div className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
              <strong>Camera unavailable.</strong>{' '}
              {!secure
                ? 'The camera only works over HTTPS or on localhost. Open this console via https:// or http://localhost.'
                : 'This browser does not expose a camera API. Try a recent Chrome/Safari/Edge, or use the image-upload option below.'}
            </div>
          )}

          {camError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{camError}</div>
          )}

          {/* Camera picker + start */}
          {secure && hasMediaApi && (
            <div className="mb-3 flex flex-col sm:flex-row gap-2">
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                disabled={scanning || cameras.length === 0}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              >
                {cameras.length === 0 ? (
                  <option>Detecting cameras…</option>
                ) : (
                  cameras.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)
                )}
              </select>
              {!scanning && (
                <button
                  onClick={startCamera}
                  disabled={!selectedCamera || initializing}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" /> {initializing ? 'Starting…' : 'Start Camera'}
                </button>
              )}
            </div>
          )}

          <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-slate-900 p-2 shadow-inner min-h-[220px] flex items-center justify-center">
            <div id={READER_ID} className="w-full" />
            {!scanning && (
              <div className="text-[11px] text-slate-400 text-center px-4">
                Camera preview appears here once started.
              </div>
            )}
          </div>

          {/* Image upload fallback */}
          <div className="mt-4">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScanFile} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 inline-flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Scan QR from a photo instead
            </button>
          </div>

          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Point the camera at the attendee's QR ticket. Sound &amp; vibration confirm a scan.
          </p>
        </div>

        {/* Right: Manual Lookup & Recent Check-Ins */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-4 h-4 text-indigo-600" /> Manual Participant Lookup
            </span>

            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search name, registration #, email..."
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800">
                Search
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pt-2">
                {searchResults.map((reg) => (
                  <div key={reg.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{reg.participant?.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{reg.registration_number}</div>
                    </div>
                    {reg.attendance_status === 'checked_in' ? (
                      <span className="text-[10px] font-bold text-emerald-600">Checked In</span>
                    ) : (
                      <button
                        onClick={() => handleManualCheckIn(reg.id)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Check In
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" /> Recent Check-Ins
            </span>

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {recentCheckins.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No check-ins recorded yet.</div>
              ) : (
                recentCheckins.map((chk) => (
                  <div key={chk.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{chk.registration?.participant?.name || 'Attendee'}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(chk.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {chk.gate || 'Gate'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUndoCheckIn(chk.registration_id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Undo Check-In"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
