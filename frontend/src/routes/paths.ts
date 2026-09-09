/**
 * Single source of truth for every URL in the app. Import these instead of
 * hand-writing path strings so a rename is one edit and typos are impossible.
 */
export const paths = {
  // public
  catalog: () => '/',
  event: (slug: string) => `/events/${slug}`,
  eventRegister: (slug: string) => `/events/${slug}/register`,
  lookup: () => '/lookup',
  ticket: (token: string) => `/ticket/${token}`,
  login: (next?: string) => (next ? `/login?next=${encodeURIComponent(next)}` : '/login'),

  // admin
  admin: () => '/admin',
  dashboard: () => '/admin/dashboard',
  events: (status?: string) => (status ? `/admin/events?status=${status}` : '/admin/events'),
  eventConsole: (slugOrId: string, tab: string = 'overview') => `/admin/events/${slugOrId}/${tab}`,
  participants: () => '/admin/participants',
  audit: () => '/admin/audit',
} as const;

/** Admin event-console tabs that are real routes (form/settings are ?panel=). */
export const EVENT_TABS = [
  'overview',
  'registrations',
  'queue',
  'checkin',
  'attendance',
  'reports',
] as const;
export type EventTab = (typeof EVENT_TABS)[number];
