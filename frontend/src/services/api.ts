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
