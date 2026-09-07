import axios from 'axios';

export const API_BASE_URL = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Inject auth token from localStorage if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('rhb_events_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Error handling interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token if unauthenticated
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('rhb_events_token');
        localStorage.removeItem('rhb_events_user');
      }
    }
    return Promise.reject(error);
  }
);

/* Type definitions */
export type UserRole =
  | 'super_admin'
  | 'event_admin'
  | 'event_organizer'
  | 'registration_officer'
  | 'checkin_staff'
  | 'viewer'
  | 'participant';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  organization?: { id: number; name: string };
}

/**
 * Frontend mirror of the backend route role tiers (routes/api.php).
 * super_admin is included everywhere it implicitly passes on the server.
 */
export const ROLE_TIERS = {
  staff: ['super_admin', 'event_admin', 'event_organizer', 'registration_officer', 'checkin_staff', 'viewer'],
  eventManager: ['super_admin', 'event_admin', 'event_organizer'],
  registration: ['super_admin', 'event_admin', 'event_organizer', 'registration_officer'],
  checkin: ['super_admin', 'event_admin', 'event_organizer', 'registration_officer', 'checkin_staff'],
  governance: ['super_admin', 'event_admin'],
} as const;

export const hasRole = (role: string | undefined | null, allowed: readonly string[]): boolean =>
  !!role && allowed.includes(role);

export const getStoredUser = (): User | null => {
  try {
    return JSON.parse(localStorage.getItem('rhb_events_user') || 'null');
  } catch {
    return null;
  }
};

/**
 * Upload an image file from the user's device. Returns a root-relative URL
 * (e.g. "/storage/event-covers/uuid.png") suitable for `cover_image_url`.
 */
export const uploadImage = async (
  file: File,
  folder: 'event-covers' | 'event-banners' = 'event-covers'
): Promise<string> => {
  const data = new FormData();
  data.append('file', file);
  data.append('folder', folder);
  const res = await apiClient.post('/media/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.url as string;
};

export interface EventAttachment {
  label: string;
  url: string;
}

export interface EventCategory {
  id: number;
  name: string;
  slug: string;
  color: string;
  icon?: string;
}

export interface FormField {
  id?: number;
  field_key: string;
  label: string;
  type: string;
  placeholder?: string;
  help_text?: string;
  is_required: boolean;
  is_hidden?: boolean;
  field_order?: number;
  options?: string[];
  conditional_logic?: any;
}

export interface RegistrationForm {
  id: number;
  event_id: string;
  title?: string;
  description?: string;
  fields: FormField[];
}

/** Reusable registration-form template (GET /forms/templates). */
export interface FormTemplateSummary {
  id: number;
  name: string;
  description?: string | null;
  field_count: number;
  is_system: boolean;
  created_by_name?: string | null;
  updated_at?: string | null;
}

export interface FormTemplate extends FormTemplateSummary {
  fields: FormField[];
}

export interface EventItem {
  id: string;
  title: string;
  short_title?: string;
  slug: string;
  event_code: string;
  description?: string;
  short_description?: string;
  category_id?: number;
  category?: EventCategory;
  cover_image_url?: string;
  banner_image_url?: string;
  attachments?: EventAttachment[];
  event_type: 'physical' | 'virtual' | 'hybrid';
  visibility: string;
  status: string;
  dynamic_status?: string;
  start_at: string;
  end_at: string;
  timezone: string;
  registration_open_at?: string;
  registration_close_at?: string;
  capacity: number;
  confirmed_count?: number;
  waitlist_count?: number;
  pending_count?: number;
  checked_in_count?: number;
  waitlist_enabled: boolean;
  waitlist_capacity?: number;
  approval_mode: string;
  allow_cancellation: boolean;
  cancellation_deadline?: string;
  duplicate_rule: string;
  venue_name?: string;
  address?: string;
  city?: string;
  country?: string;
  organizer_name?: string;
  contact_email?: string;
  contact_phone?: string;
  primary_color?: string;
  secondary_color?: string;
  terms_and_conditions?: string;
  form?: RegistrationForm;
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  employee_id?: string;
  department?: string;
}

export interface Ticket {
  id: string;
  ticket_code: string;
  secure_token: string;
  status: string;
  qr_payload: string;
  issued_at: string;
}

export interface Registration {
  id: string;
  event_id: string;
  event?: EventItem;
  participant_id: string;
  participant: Participant;
  registration_number: string;
  registration_sequence: number;
  status: 'pending' | 'confirmed' | 'waitlisted' | 'approved' | 'rejected' | 'cancelled';
  attendance_status: 'not_checked_in' | 'checked_in' | 'attended' | 'no_show';
  waitlist_priority: number;
  queue_position?: number | null;
  source?: string;
  secure_access_token: string;
  registered_at: string;
  confirmed_at?: string;
  waitlisted_at?: string;
  checked_in_at?: string;
  ticket?: Ticket;
  answers?: Array<{ field_key: string; field_label: string; value_text?: string; value_json?: any }>;
}

export interface CheckinRecord {
  id: string;
  registration_id: string;
  event_id: string;
  checkin_type: string;
  gate?: string;
  notes?: string;
  checked_in_at: string;
  registration?: Registration;
  checked_in_by?: User;
}

export interface AuditLog {
  id: number;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  event_id?: string;
  previous_value?: any;
  new_value?: any;
  ip_address?: string;
  created_at: string;
}

/* ============================================================
 * Admin "Event Operations" dashboard — GET /dashboard/overview
 * ============================================================ */

export type DashboardRange =
  | 'today'
  | '7d'
  | '30d'
  | '90d'
  | 'this_month'
  | 'this_year'
  | 'custom';

export type ActionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface DashboardActionItem {
  priority: ActionPriority;
  type: string;
  event_id: string;
  event_slug?: string;
  event_title: string;
  event_code: string;
  issue: string;
  detail: string;
  recommended_action: string;
  action_target: { tab: string };
}

export interface DashboardEventRow {
  event_id: string;
  event_slug?: string;
  event_title: string;
  event_code: string;
  dynamic_status: string;
  start_at?: string;
  end_at?: string;
  venue?: string | null;
  capacity: number;
  confirmed: number;
  available: number;
  waitlist: number;
  pending: number;
  checked_in: number;
  attendance_pct: number;
  registration_close_at?: string | null;
  days_until?: number;
}

export interface DashboardTodayRow extends DashboardEventRow {
  waitlisted: number;
  not_checked_in: number;
  checkin_state: string;
}

export interface DashboardTrendPoint {
  date: string;
  total: number;
  confirmed: number;
  waitlisted: number;
  cancelled: number;
}

export interface DashboardReadiness {
  event_id: string;
  event_slug?: string;
  event_title: string;
  event_code: string;
  ready_count: number;
  total: number;
  items: Array<{ label: string; ok: boolean }>;
}

export interface DashboardCapacityRow {
  event_id: string;
  event_slug?: string;
  event_title: string;
  event_code: string;
  confirmed: number;
  capacity: number;
  available: number;
  queue: number;
  pct: number;
  state: 'HEALTHY' | 'NEAR FULL' | 'FULL' | 'OVER CAPACITY';
}

export interface DashboardOverview {
  filters: { range: DashboardRange; from: string | null; to: string | null };
  generated_at: string;
  kpis: {
    total_events: number;
    open_registration: number;
    upcoming_events: number;
    ongoing_events: number;
    total_registrations: number;
    confirmed: number;
    waitlisted: number;
    checked_in: number;
    attendance_rate: number;
  };
  event_status_breakdown: Record<string, number>;
  action_required: DashboardActionItem[];
  active_events: DashboardEventRow[];
  capacity_utilization: DashboardCapacityRow[];
  waitlist: {
    total_waitlisted: number;
    events_with_waitlist: number;
    largest_queue: { event_title: string; count: number } | null;
    recent_promotions: Array<{
      event_title?: string;
      event_code?: string;
      participant?: string;
      previous_position?: number | null;
      promoted_at?: string;
    }>;
    table: Array<{
      event_id: string;
      event_slug?: string;
      event_title: string;
      event_code: string;
      capacity: number;
      confirmed: number;
      queue: number;
      oldest_wait_at?: string | null;
      registration_close_at?: string | null;
    }>;
  };
  pending_approvals: {
    total: number;
    oldest_at: string | null;
    events: Array<{ event_id: string; event_title: string; pending: number }>;
    rows: Array<{
      registration_id: string;
      registration_number: string;
      participant?: string;
      email?: string;
      event_title?: string;
      event_slug?: string;
      event_id: string;
      submitted_at?: string;
    }>;
  } | null;
  upcoming_events: DashboardEventRow[];
  today_operations: DashboardTodayRow[];
  attendance_performance: Array<{
    event_id: string;
    event_slug?: string;
    event_title: string;
    event_code: string;
    confirmed: number;
    checked_in: number;
    attended: number;
    no_show: number;
    attendance_rate: number;
  }>;
  registration_trend: DashboardTrendPoint[];
  registration_status_breakdown: {
    confirmed: number;
    pending: number;
    waitlisted: number;
    rejected: number;
    cancelled: number;
  };
  recent_registrations: Array<{
    registration_number: string;
    participant?: string;
    event_title?: string;
    event_slug?: string;
    event_id: string;
    status: string;
    queue_position?: number | null;
    registered_at?: string;
    source?: string;
  }>;
  recent_activity: Array<{
    created_at?: string;
    actor: string;
    event_title?: string | null;
    action: string;
    summary: string;
  }>;
  notification_health: {
    sent_today: number;
    pending: number;
    failed: number;
    failed_24h: number;
  };
  readiness: DashboardReadiness[];
}

/* Per-event dashboard — additive keys on GET /events/{id}/analytics */
export interface EventAnalyticsDetail {
  event: EventItem;
  capacity: number;
  confirmed: number;
  pending: number;
  waitlisted: number;
  cancelled: number;
  rejected: number;
  checked_in: number;
  no_show: number;
  available_capacity: number;
  attendance_rate: number;
  capacity_utilization: number;
  registrations_by_date: Array<{ date: string; count: number }>;
  sources: Array<{ source: string | null; count: number }>;
  dynamic_status: string;
  registration_state: 'open' | 'closing_soon' | 'closed';
  registration_close_at?: string | null;
  form_summary: {
    status: 'ready' | 'empty' | 'missing';
    active_fields: number;
    required_fields: number;
    optional_fields: number;
    updated_at?: string | null;
  };
  queue_summary: {
    count: number;
    oldest_wait_at?: string | null;
    promoted_today: number;
    head_registration: { registration_number: string; participant?: string; waitlisted_at?: string } | null;
    first_five: Array<{ position: number; registration_number: string; participant?: string; waitlisted_at?: string }>;
  };
  attendance: {
    confirmed: number;
    checked_in: number;
    attended: number;
    not_checked_in: number;
    no_show: number;
    present: number;
    attendance_rate: number;
    last_check_in_at?: string | null;
  };
  notifications: { sent: number; scheduled: number; pending: number; failed: number; last_at?: string | null };
  activity: Array<{ created_at?: string; actor: string; action: string; summary: string }>;
  trend: DashboardTrendPoint[];
}
