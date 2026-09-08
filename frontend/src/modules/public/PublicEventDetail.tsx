import React from 'react';
import { EventItem } from '../../services/api';
import { Calendar, MapPin, Users, Clock, ShieldAlert, ArrowLeft, CheckCircle2, AlertCircle, Share2, FileText, ExternalLink } from 'lucide-react';
import { eventCover, onCoverError } from '../../lib/eventMedia';
import { BrandMark } from '../../components/BrandMark';
import { formatInZone } from '../../utils/tz';

interface PublicEventDetailProps {
  event: EventItem;
  onBack: () => void;
  onRegisterNow: () => void;
}

export const PublicEventDetail: React.FC<PublicEventDetailProps> = ({
  event,
  onBack,
  onRegisterNow,
}) => {
  const isFull = (event.confirmed_count || 0) >= event.capacity;
  const isRegistrationOpen = event.dynamic_status === 'registration_open' || (!event.dynamic_status && event.status === 'registration_open');

  const mapHref = event.map_url
    ? /^https?:\/\//i.test(event.map_url.trim())
      ? event.map_url.trim()
      : `https://${event.map_url.trim()}`
    : null;

  const regStatus = ((): { label: string; dot: string } => {
    switch (event.dynamic_status) {
      case 'upcoming':
        return { label: 'Opens Soon', dot: 'bg-amber-500' };
      case 'registration_closed':
        return { label: 'Registration Closed', dot: 'bg-slate-400' };
      case 'completed':
        return { label: 'Event Ended', dot: 'bg-slate-400' };
      case 'cancelled':
        return { label: 'Cancelled', dot: 'bg-red-500' };
      case 'ongoing':
        return { label: 'Event In Progress', dot: 'bg-emerald-500' };
      case 'full':
        return event.waitlist_enabled
          ? { label: 'Waitlist Open', dot: 'bg-amber-500' }
          : { label: 'Full', dot: 'bg-red-500' };
      default:
        return isFull
          ? { label: event.waitlist_enabled ? 'Waitlist Open' : 'Full', dot: event.waitlist_enabled ? 'bg-amber-500' : 'bg-red-500' }
          : { label: 'Open for RSVP', dot: 'bg-emerald-500' };
    }
  })();

  const getCtaButton = () => {
    if (event.dynamic_status === 'upcoming') {
      return (
        <button disabled className="w-full py-4 px-6 rounded-xl bg-slate-200 text-slate-500 font-bold text-sm cursor-not-allowed">
          Registration Opens Soon
        </button>
      );
    }

    if (event.dynamic_status === 'registration_closed') {
      return (
        <button disabled className="w-full py-4 px-6 rounded-xl bg-slate-200 text-slate-500 font-bold text-sm cursor-not-allowed">
          Registration Closed
        </button>
      );
    }

    if (event.dynamic_status === 'completed') {
      return (
        <button disabled className="w-full py-4 px-6 rounded-xl bg-slate-200 text-slate-500 font-bold text-sm cursor-not-allowed">
          Event Completed
        </button>
      );
    }

    if (isFull) {
      if (event.waitlist_enabled) {
        return (
          <button
            onClick={onRegisterNow}
            className="w-full py-4 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-500/30 transition-all"
          >
            Join Waiting List (Position #{((event.waitlist_count || 0) + 1)})
          </button>
        );
      }
      return (
        <button disabled className="w-full py-4 px-6 rounded-xl bg-red-100 text-red-700 font-bold text-sm cursor-not-allowed border border-red-200">
          Event Fully Booked
        </button>
      );
    }

    return (
      <button
        onClick={onRegisterNow}
        className="w-full py-4 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
      >
        <span>Register Now</span>
        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">Free</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Navigation */}
      <div className="bg-rhb-light text-rhb-navy sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-rhb-navy hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Events</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold bg-white/70 text-rhb-blue px-2.5 py-1 rounded-md">
              {event.event_code}
            </span>
            <BrandMark theme="light" size="sm" />
          </div>
        </div>
      </div>

      {/* Cover banner */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6">
        <div className="relative h-48 sm:h-64 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs">
          <img
            src={eventCover(event)}
            onError={(e) => onCoverError(e, event)}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-rhb-navy/70 to-transparent" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-4">
                {event.category?.name || 'General Event'}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                {event.title}
              </h1>

              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line mb-8">
                {event.description || event.short_description || 'No detailed description provided.'}
              </p>

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Date</div>
                    <div>{formatInZone(event.start_at, event.timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Time</div>
                    <div>{formatInZone(event.start_at, event.timezone, { hour: '2-digit', minute: '2-digit' })} - {formatInZone(event.end_at, event.timezone, { hour: '2-digit', minute: '2-digit' })} ({event.timezone})</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Venue / Location</div>
                    <div>{event.venue_name || (event.event_type === 'virtual' ? 'Online' : 'Venue to be announced')}</div>
                    {event.address && (
                      <div className="text-slate-500">{[event.address, event.city].filter(Boolean).join(', ')}</div>
                    )}
                    {mapHref && (
                      <a
                        href={mapHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> View on map
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Capacity & Seats</div>
                    <div>
                      {event.confirmed_count || 0} / {event.capacity} Confirmed
                      {isFull && event.waitlist_enabled && (
                        <span className="text-amber-600 font-medium ml-1">
                          ({event.waitlist_count || 0} on Waitlist)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents & Resources */}
              {Array.isArray(event.attachments) && event.attachments.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Documents &amp; Resources
                  </h3>
                  <ul className="space-y-2">
                    {event.attachments.map((att, i) => (
                      <li key={i}>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-xs font-semibold text-slate-700 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="flex-1 truncate">{att.label || att.url}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Terms & Conditions */}
              {event.terms_and_conditions && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Event Guidelines & Terms
                  </h3>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    {event.terms_and_conditions}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Registration Sidebar Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-20 space-y-6">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registration Status</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xl font-bold text-slate-900">{regStatus.label}</span>
                  <span className={`w-3 h-3 rounded-full ${regStatus.dot}`} />
                </div>
              </div>

              {/* Capacity Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Capacity Filled</span>
                  <span>{Math.min(100, Math.round(((event.confirmed_count || 0) / event.capacity) * 100))}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFull ? 'bg-red-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.round(((event.confirmed_count || 0) / event.capacity) * 100))}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>{event.confirmed_count || 0} Confirmed</span>
                  <span>{Math.max(0, event.capacity - (event.confirmed_count || 0))} Remaining</span>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-2">
                {getCtaButton()}
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Instant digital QR ticket upon confirmation</span>
                </div>
                {event.allow_cancellation && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Free self-service cancellation anytime</span>
                  </div>
                )}
                {event.organizer_name && (
                  <div className="pt-2 text-slate-400 text-[11px]">
                    Organized by: <strong className="text-slate-600">{event.organizer_name}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
