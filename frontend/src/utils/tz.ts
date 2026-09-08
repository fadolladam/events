/**
 * Timezone-aware conversion between a UTC instant (ISO 8601 string, as the API
 * stores dates) and the `YYYY-MM-DDTHH:mm` wall-clock string an
 * `<input type="datetime-local">` uses — interpreted in an arbitrary IANA time
 * zone rather than the browser's.
 *
 * Pure `Intl`, no dependency. The zone offset is resolved at the target instant
 * and re-checked once, so a value that lands on a DST transition still maps to
 * the correct UTC instant.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Offset of `timeZone` from UTC, in minutes, at the given instant. */
function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(instant)) map[p.type] = p.value;
  const asIfUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return Math.round((asIfUtc - instant.getTime()) / 60000);
}

/** UTC ISO string -> `YYYY-MM-DDTHH:mm` wall-clock in `timeZone`. */
export function isoToZonedInput(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const shifted = new Date(d.getTime() + tzOffsetMinutes(d, timeZone) * 60000);
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
  );
}

/** `YYYY-MM-DDTHH:mm` wall-clock in `timeZone` -> UTC ISO string. */
export function zonedInputToIso(
  value: string | null | undefined,
  timeZone: string,
): string | undefined {
  if (!value) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return undefined;
  const [y, mo, da, h, mi] = [+m[1], +m[2], +m[3], +m[4], +m[5]];
  // Treat the wall time as if it were UTC, then correct by the zone's offset.
  const guess = Date.UTC(y, mo - 1, da, h, mi);
  const off1 = tzOffsetMinutes(new Date(guess), timeZone);
  let utc = guess - off1 * 60000;
  // Near a DST edge the offset at the corrected instant can differ — re-check.
  const off2 = tzOffsetMinutes(new Date(utc), timeZone);
  if (off2 !== off1) utc = guess - off2 * 60000;
  return new Date(utc).toISOString();
}

export const browserTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** Short offset label for a zone, e.g. "GMT+8". Empty string if unresolvable. */
export function tzOffsetLabel(timeZone: string, at: Date = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    } as Intl.DateTimeFormatOptions)
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? '';
  } catch {
    return '';
  }
}

const FALLBACK_ZONES = [
  'UTC',
  'Asia/Kuala_Lumpur',
  'Asia/Phnom_Penh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Jakarta',
  'Asia/Ho_Chi_Minh',
  'Asia/Manila',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
];

/** Full IANA zone list where the engine exposes it, else a common subset. */
export function listTimeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intl.supportedValuesOf === 'function') {
    try {
      const all = intl.supportedValuesOf('timeZone');
      if (all.length) return all;
    } catch {
      /* fall through */
    }
  }
  return FALLBACK_ZONES;
}
