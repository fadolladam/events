import React, { useMemo } from 'react';
import { listTimeZones, tzOffsetLabel } from '../utils/tz';

interface Props {
  value: string;
  onChange: (tz: string) => void;
  className?: string;
  id?: string;
}

/** Native `<select>` over the IANA time-zone list, each option annotated with
 *  its current UTC offset. Always includes `value` even if it's not in the
 *  standard list (e.g. a legacy zone stored on an old event). */
export const TimezoneSelect: React.FC<Props> = ({ value, onChange, className, id }) => {
  const zones = useMemo(() => {
    const list = listTimeZones();
    return value && !list.includes(value) ? [value, ...list] : list;
  }, [value]);

  const options = useMemo(
    () =>
      zones.map((z) => {
        const off = tzOffsetLabel(z);
        return (
          <option key={z} value={z}>
            {z.replace(/_/g, ' ')}
            {off ? ` (${off})` : ''}
          </option>
        );
      }),
    [zones],
  );

  return (
    <select id={id} className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      {options}
    </select>
  );
};
