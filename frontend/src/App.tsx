import React, { useEffect, useState } from 'react';
import { EventItem, User, ROLE_TIERS, hasRole } from './services/api';
import { LoginPage } from './modules/auth/LoginPage';
import { PublicEventsCatalog } from './modules/public/PublicEventsCatalog';
import { PublicEventDetail } from './modules/public/PublicEventDetail';
import { RegistrationWizard } from './modules/registration/RegistrationWizard';
import { MyRegistrationPage } from './modules/participant/MyRegistrationPage';
import { PublicTicketPage } from './modules/ticket/PublicTicketPage';
import { AdminLayout } from './components/AdminLayout';
import { GlobalDashboard } from './modules/admin/GlobalDashboard';
import { EventsManagement } from './modules/admin/EventsManagement';
import { EventDetailManage } from './modules/admin/EventDetailManage';
import { EventWizardModal } from './modules/admin/EventWizardModal';
import { AuditLogsPage } from './modules/audit/AuditLogsPage';

export const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<
    | 'public_catalog'
    | 'public_event_detail'
    | 'public_register'
    | 'public_lookup'
    | 'public_ticket'
    | 'login'
    | 'admin'
  >('public_catalog');

  // Selected State
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedTicketToken, setSelectedTicketToken] = useState<string>('');
  const [adminNav, setAdminNav] = useState<'dashboard' | 'events' | 'audit'>('dashboard');
  const [adminSelectedEventId, setAdminSelectedEventId] = useState<string | null>(null);
  const [adminSelectedTab, setAdminSelectedTab] = useState<string>('overview');
  const [wizardOpen, setWizardOpen] = useState(false);

  // Auth User
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rhb_events_user');
    return saved ? JSON.parse(saved) : null;
  });

  // URL Deep Link Support
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/ticket/')) {
      const token = path.replace('/ticket/', '');
      if (token) {
        setSelectedTicketToken(token);
        setCurrentView('public_ticket');
      }
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentView('admin');
    setAdminNav('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('rhb_events_token');
    localStorage.removeItem('rhb_events_user');
    setUser(null);
    setCurrentView('login');
  };

  const handleSelectPublicEvent = (event: EventItem) => {
    setSelectedEvent(event);
    setCurrentView('public_event_detail');
  };

  const handleOpenTicket = (token: string) => {
    setSelectedTicketToken(token);
    setCurrentView('public_ticket');
  };

  const handleAdminSelectEvent = (event: EventItem, tab: string = 'overview') => {
    setAdminSelectedEventId(event.id);
    setAdminSelectedTab(tab);
    setAdminNav('events');
  };

  // 1. PUBLIC TICKET PASS
  if (currentView === 'public_ticket') {
    return (
      <PublicTicketPage
        token={selectedTicketToken}
        onBack={() => setCurrentView('public_catalog')}
      />
    );
  }

  // 2. PARTICIPANT SELF SERVICE LOOKUP
  if (currentView === 'public_lookup') {
    return (
      <MyRegistrationPage
        onBack={() => setCurrentView('public_catalog')}
        onViewTicket={handleOpenTicket}
      />
    );
  }

  // 3. REGISTRATION WIZARD
  if (currentView === 'public_register' && selectedEvent) {
    return (
      <RegistrationWizard
        event={selectedEvent}
        onBack={() => setCurrentView('public_event_detail')}
        onViewTicket={handleOpenTicket}
        onNavigateToLookup={() => setCurrentView('public_lookup')}
      />
    );
  }

  // 4. PUBLIC EVENT DETAIL
  if (currentView === 'public_event_detail' && selectedEvent) {
    return (
      <PublicEventDetail
        event={selectedEvent}
        onBack={() => setCurrentView('public_catalog')}
        onRegisterNow={() => setCurrentView('public_register')}
      />
    );
  }

  // 5. LOGIN VIEW
  if (currentView === 'login') {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onCancel={() => setCurrentView('public_catalog')}
      />
    );
  }

  // 6. ADMIN SYSTEM
  if (currentView === 'admin' && user) {
    // Guard against a role that cannot see the currently-selected section
    // (e.g. stale state, or a role change) — fall back to the dashboard.
    const canViewAudit = hasRole(user.role, ROLE_TIERS.governance);
    const safeNav = adminNav === 'audit' && !canViewAudit ? 'dashboard' : adminNav;

    return (
      <AdminLayout
        user={user}
        activeNav={safeNav}
        onNavigate={(nav) => {
          setAdminNav(nav);
          setAdminSelectedEventId(null);
        }}
        onLogout={handleLogout}
        onSwitchToPublic={() => setCurrentView('public_catalog')}
      >
        {safeNav === 'dashboard' && (
          <GlobalDashboard
            onNavigateToEvents={() => {
              setAdminNav('events');
              setAdminSelectedEventId(null);
            }}
            onCreateEvent={() => setWizardOpen(true)}
            onSelectEvent={handleAdminSelectEvent}
          />
        )}

        {safeNav === 'events' && (
          adminSelectedEventId ? (
            <EventDetailManage
              eventId={adminSelectedEventId}
              initialTab={adminSelectedTab}
              onBack={() => setAdminSelectedEventId(null)}
            />
          ) : (
            <EventsManagement
              onCreateEvent={() => setWizardOpen(true)}
              onSelectEvent={handleAdminSelectEvent}
            />
          )
        )}

        {safeNav === 'audit' && canViewAudit && <AuditLogsPage />}

        <EventWizardModal
          isOpen={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onEventCreated={(ev) => {
            setAdminSelectedEventId(ev.id);
            setAdminNav('events');
          }}
        />
      </AdminLayout>
    );
  }

  // 7. DEFAULT: PUBLIC EVENTS CATALOG
  return (
    <PublicEventsCatalog
      onSelectEvent={handleSelectPublicEvent}
      onNavigateToLookup={() => setCurrentView('public_lookup')}
      onNavigateToAdmin={() => (user ? setCurrentView('admin') : setCurrentView('login'))}
    />
  );
};
