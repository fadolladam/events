import { EventItem } from '../services/api';

/**
 * Every event surface in the platform shows a thumbnail. When an event has no
 * uploaded `cover_image_url`, we generate a deterministic RHB-blue placeholder
 * from its code/title so a card never renders empty or with a broken image.
 */

const RHB_BLUE = '#0067b1';
const RHB_NAVY = '#083a5e';
const RHB_SKY = '#5bc2e7';

function initials(event: EventItem): string {
  const source = (event.event_code || event.short_title || event.title || 'EVT').trim();
  const compact = source.replace(/[^A-Za-z0-9]/g, '');
  return compact.slice(0, 4).toUpperCase() || 'EVT';
}

/** Deterministic inline SVG placeholder (no network dependency). */
export function placeholderCover(event: EventItem): string {
  const label = initials(event);
  const accent = event.category?.color || RHB_SKY;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${RHB_NAVY}"/>
      <stop offset="1" stop-color="${RHB_BLUE}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#g)"/>
  <circle cx="670" cy="360" r="220" fill="${accent}" fill-opacity="0.14"/>
  <circle cx="110" cy="70" r="140" fill="#ffffff" fill-opacity="0.06"/>
  <text x="50" y="250" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif" font-size="120" font-weight="800" fill="#ffffff" letter-spacing="4">${label}</text>
  <text x="52" y="310" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif" font-size="26" font-weight="600" fill="#ffffff" fill-opacity="0.7">RHB EVENTS</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Resolve the best available cover image URL for an event. */
export function eventCover(event: EventItem): string {
  return event.cover_image_url || event.banner_image_url || placeholderCover(event);
}

/** <img onError> handler: fall back to the generated placeholder exactly once. */
export function onCoverError(
  e: React.SyntheticEvent<HTMLImageElement>,
  event: EventItem,
): void {
  const img = e.currentTarget;
  const fallback = placeholderCover(event);
  if (img.src !== fallback) {
    img.onerror = null;
    img.src = fallback;
  }
}
