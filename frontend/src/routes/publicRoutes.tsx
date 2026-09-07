import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient, type EventItem } from '../services/api';
import { PublicEventsCatalog } from '../modules/public/PublicEventsCatalog';
import { PublicEventDetail } from '../modules/public/PublicEventDetail';
import { RegistrationWizard } from '../modules/registration/RegistrationWizard';
import { MyRegistrationPage } from '../modules/participant/MyRegistrationPage';
import { PublicTicketPage } from '../modules/ticket/PublicTicketPage';
import { useAuth } from '../services/auth';
import { paths } from './paths';
import { NotFound, RouteSpinner } from './guards';

/* -------- /  -------- */
export const CatalogRoute: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <PublicEventsCatalog
      onSelectEvent={(ev) => navigate(paths.event(ev.slug))}
      onNavigateToLookup={() => navigate(paths.lookup())}
      onNavigateToAdmin={() => navigate(user ? paths.dashboard() : paths.login(paths.dashboard()))}
    />
  );
};

/** Fetch a public event by :slug, then render `children(event)`. */
const WithPublicEvent: React.FC<{ children: (ev: EventItem) => React.ReactNode }> = ({ children }) => {
  const { slug = '' } = useParams();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    apiClient
      .get(`/public/events/${slug}`)
      .then((res) => {
        if (cancelled) return;
        setEvent(res.data);
        setState('ok');
      })
      .catch(() => !cancelled && setState('missing'));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state === 'loading') return <RouteSpinner label="Loading event…" />;
  if (state === 'missing' || !event) return <NotFound />;
  return <>{children(event)}</>;
};

/* -------- /events/:slug -------- */
export const PublicEventRoute: React.FC = () => {
  const navigate = useNavigate();
  return (
    <WithPublicEvent>
      {(event) => (
        <PublicEventDetail
          event={event}
          onBack={() => navigate(paths.catalog())}
          onRegisterNow={() => navigate(paths.eventRegister(event.slug))}
        />
      )}
    </WithPublicEvent>
  );
};

/* -------- /events/:slug/register -------- */
export const RegisterRoute: React.FC = () => {
  const navigate = useNavigate();
  return (
    <WithPublicEvent>
      {(event) => (
        <RegistrationWizard
          event={event}
          onBack={() => navigate(paths.event(event.slug))}
          onViewTicket={(token) => navigate(paths.ticket(token))}
          onNavigateToLookup={() => navigate(paths.lookup())}
        />
      )}
    </WithPublicEvent>
  );
};

/* -------- /lookup -------- */
export const LookupRoute: React.FC = () => {
  const navigate = useNavigate();
  return (
    <MyRegistrationPage
      onBack={() => navigate(paths.catalog())}
      onViewTicket={(token) => navigate(paths.ticket(token))}
    />
  );
};

/* -------- /ticket/:token -------- */
export const TicketRoute: React.FC = () => {
  const navigate = useNavigate();
  const { token = '' } = useParams();
  return <PublicTicketPage token={token} onBack={() => navigate(paths.catalog())} />;
};
