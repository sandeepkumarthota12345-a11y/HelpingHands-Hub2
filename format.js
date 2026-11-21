export const fmt = (date, opts = { weekday: 'short', month: 'short', day: 'numeric' }) =>
  new Intl.DateTimeFormat('en', opts).format(new Date(`${date}T12:00:00`));

export const LONG = { weekday: 'long', month: 'long', day: 'numeric' };
export const WITH_YEAR = { month: 'short', day: 'numeric', year: 'numeric' };

const CODES = { Environment: 'ENV', Education: 'EDU', Health: 'HLT', 'Animal Welfare': 'ANI' };
export const causeCode = (category) => CODES[category] ?? 'VOL';

export function badgeFor(hours) {
  if (hours >= 10) return '10-hour volunteer';
  if (hours >= 4) return '4-hour volunteer';
  return 'New volunteer';
}
