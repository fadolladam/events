import React, { useEffect, useState } from 'react';
import { apiClient, Ticket, Registration } from '../../services/api';
import { Ticket as TicketIcon, Calendar, MapPin, Printer, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface PublicTicketPageProps {
  token: string;
  onBack: () => void;
}

export const PublicTicketPage: React.FC<PublicTicketPageProps> = ({ token, onBack }) => {
  const [ticketData, setTicketData] = useState<{ ticket: Ticket & { registration: Registration }; qr_svg: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTicket();
  }, [token]);

  const fetchTicket = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/public/ticket/${token}`);
      setTicketData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid ticket token or ticket not found.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading digital QR ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <TicketIcon className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Ticket Not Available</h2>
          <p className="text-xs text-slate-500">{error || 'This ticket could not be loaded.'}</p>
          <button onClick={onBack} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const { ticket, qr_svg } = ticketData;
  const reg = ticket.registration;
  const event = reg.event;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 print:bg-white print:text-black">
      {/* Action Bar */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 print:hidden">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Ticket Boarding Pass Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl print:border-slate-300 print:bg-white print:text-slate-900">
        {/* Ticket Header Banner */}
        <div className="p-6 bg-gradient-to-r from-indigo-900/70 to-sky-900/50 border-b border-slate-800/80">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              CONFIRMED ATTENDEE PASS
            </span>
            <span className="font-mono text-xs font-bold text-slate-300">
              {ticket.ticket_code}
            </span>
          </div>

          <h1 className="text-xl font-black text-white tracking-tight leading-tight">
            {event?.title || 'RHB Events Pass'}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            {event?.venue_name || event?.city || 'Auditorium'}
          </p>
        </div>

        {/* QR Scanner Area */}
        <div className="p-8 text-center bg-slate-900 flex flex-col items-center justify-center">
          <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-100 mb-4 inline-block">
            <div
              className="w-48 h-48 flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: qr_svg }}
            />
          </div>

          <p className="text-[11px] text-slate-400 font-mono tracking-wider">
            Present this QR at check-in station
          </p>
        </div>

        {/* Perforated Divider */}
        <div className="relative flex items-center justify-between px-4">
          <div className="w-6 h-6 rounded-full bg-slate-950 -ml-7 border-r border-slate-800" />
          <div className="flex-1 border-t-2 border-dashed border-slate-800 mx-2" />
          <div className="w-6 h-6 rounded-full bg-slate-950 -mr-7 border-l border-slate-800" />
        </div>

        {/* Participant & Event Metadata */}
        <div className="p-6 bg-slate-900/90 text-xs space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Participant</span>
              <div className="text-sm font-bold text-slate-100 truncate">{reg.participant.name}</div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registration Number</span>
              <div className="text-xs font-mono font-bold text-indigo-400 truncate">{reg.registration_number}</div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Event Code</span>
              <div className="font-semibold text-slate-200">{event?.event_code || 'EVT'}</div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
              <div className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>CONFIRMED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Cryptographically Verified Token
          </span>
          <span>RHB Events</span>
        </div>
      </div>
    </div>
  );
};
