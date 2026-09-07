import type { DashboardOverview } from '../../../services/api';

/** Navigation + context handed to every dashboard widget. */
export interface DashboardCtx {
  /** open the per-event console on a given tab */
  onSelectEvent: (eventId: string, tab?: string) => void;
  /** go to the Events list, optionally pre-filtered by status */
  onNavigateToEvents: (status?: string) => void;
  onCreateEvent: () => void;
  /** signed-in user's role (for action gating) */
  role?: string;
  /** re-fetch the whole overview */
  refetch: () => void;
}

export type Overview = DashboardOverview;
