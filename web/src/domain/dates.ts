// Local-calendar date helpers. Sessions are planned in the coach's local
// time ("tisdag 18:00"), so dates are "YYYY-MM-DD" strings in local time,
// never UTC-shifted Date instants.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local midnight for a "YYYY-MM-DD" string. */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + n);
  return out;
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(d: Date): number {
  return d.getDay() === 0 ? 7 : d.getDay();
}

/** Monday of the ISO week that contains `d`. */
export const startOfIsoWeek = (d: Date): Date => addDays(d, 1 - isoWeekday(d));

/** ISO 8601 week number (weeks start Monday; week 1 contains Jan 4). */
export function isoWeek(d: Date): number {
  return isoWeekAndYear(d).week;
}

export function isoWeekAndYear(d: Date): { week: number; year: number } {
  // Thursday of this week decides the ISO year.
  const thursday = addDays(d, 4 - isoWeekday(d));
  const year = thursday.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const dayOfYear = Math.round((thursday.getTime() - jan1.getTime()) / 86_400_000);
  return { week: Math.floor(dayOfYear / 7) + 1, year };
}

/** 52 or 53. Dec 28 is always in the last ISO week of its year. */
export function isoWeeksInYear(year: number): number {
  return isoWeek(new Date(year, 11, 28));
}

/** Minutes since midnight for "HH:MM". */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
