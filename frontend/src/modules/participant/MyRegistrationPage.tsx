import React, { useEffect, useState } from 'react';
import { apiClient, Registration } from '../../services/api';
import { Ticket as TicketIcon, Search, Calendar, MapPin, CheckCircle2, Clock, AlertTriangle, ArrowLeft, Download } from 'lucide-react';

interface MyRegistrationPageProps {
  initialToken?: string;
  onBack: () => void;
  onViewTicket: (token: string) => void;
}

export const MyRegistrationPage: React.FC<MyRegistrationPageProps> = ({
  initialToken,
  onBack,
  onViewTicket,
}) => {
  const [token, setToken] = useState(initialToken || '');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [email, setEmail] = useState('');
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (initialToken) {
      fetchByToken(initialToken);
    }
  }, [initialToken]);

  const fetchByToken = async (secureToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/public/registration/${secureToken}`);
      setRegistration(res.data.registration);
      setQueuePosition(res.data.queue_position);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to find registration with this access token.');
    } finally {
      setLoading(false);
    }
  };

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.post('/public/registration/lookup', {
        registration_number: registrationNumber,
        email,
      });
      setRegistration(res.data.registration);
      setQueuePosition(res.data.queue_position);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No matching registration found.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!registration) return;
    setCancelling(true);

    try {
      const res = await apiClient.post(`/public/registration/${registration.secure_access_token}/cancel`);
      setRegistration(res.data.registration);
      setCancelModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel registration.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Events</span>
          </button>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Participant Self-Service</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-8">
        {/* Lookup Form if not found yet */}
        {!registration && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Find Your Registration</h1>
              <p className="text-xs text-slate-500 mt-1">
                Enter your permanent registration number and email to view your status or QR ticket.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLookupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EVT-BD26-2026-000001"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>Lookup Registration</span>}
              </button>
            </form>
          </div>
        )}

        {/* Found Registration Details */}
        {registration && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registration Details</span>
                  <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">
                    {registration.registration_number}
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    registration.status === 'confirmed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : registration.status === 'waitlisted'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {registration.status}
                </span>
              </div>

              {/* Event Info */}
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400">Event</span>
                  <div className="text-sm font-bold text-slate-900">{registration.event?.title}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div>
                    <span className="text-slate-400">Participant Name</span>
                    <div className="font-semibold text-slate-900">{registration.participant.name}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Email</span>
                    <div className="font-semibold text-slate-900">{registration.participant.email}</div>
                  </div>
                  {queuePosition && (
                    <div>
                      <span className="text-slate-400">Current Queue Position</span>
                      <div className="font-bold text-amber-600">#{queuePosition}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400">Registered On</span>
                    <div className="font-semibold text-slate-900">
                      {new Date(registration.registered_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                {registration.status === 'confirmed' && registration.ticket && (
                  <button
                    onClick={() => onViewTicket(registration.ticket!.secure_token)}
                    className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <TicketIcon className="w-4 h-4" />
                    <span>Open Digital QR Ticket</span>
                  </button>
                )}

                {registration.status !== 'cancelled' && (
                  <button
                    onClick={() => setCancelModal(true)}
                    className="py-3 px-4 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 font-semibold text-xs transition-colors"
                  >
                    Cancel Registration
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Confirmation Modal */}
        {cancelModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Cancel Registration?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to cancel your seat? If confirmed, your slot will automatically be released to the next participant in the waiting list.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setCancelModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Keep Registration
                </button>
                <button
                  onClick={handleCancelRegistration}
                  disabled={cancelling}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                >
                  {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
