import type { Skill } from "../domain/types";
import { parseISODate, toISODate, addDays, isoWeekday } from "../domain/dates";
import { sv } from "./sv";

/** Active string table. One language for now; swap per club/user later. */
export const S = sv;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "onsdag 7 oktober" */
export function formatDayLong(d: Date): string {
  return `${S.weekdays[isoWeekday(d) - 1]} ${d.getDate()} ${S.months[d.getMonth()]}`;
}

/** "7 okt" */
export function formatDayShort(d: Date): string {
  return `${d.getDate()} ${S.months[d.getMonth()].slice(0, 3)}`;
}

/** "Idag", "Imorgon" or "Torsdag" — relative to `today`. */
export function relativeDay(date: string, today: Date): string {
  if (date === toISODate(today)) return S.ui.common.today;
  if (date === toISODate(addDays(today, 1))) return S.ui.common.tomorrow;
  return cap(S.weekdays[isoWeekday(parseISODate(date)) - 1]);
}

/** Short day label for list rows: "Idag", "Imon", "Tor". */
export function shortDay(date: string, today: Date): string {
  if (date === toISODate(today)) return S.ui.common.today;
  if (date === toISODate(addDays(today, 1))) return S.ui.common.tomorrowShort;
  return S.weekdaysShort[isoWeekday(parseISODate(date)) - 1];
}

/** "17:15" → "17.15" (Swedish clock format). Times are stored as "HH:MM". */
export function formatTime(hhmm: string): string {
  return hhmm.replace(":", ".");
}

/** "Skridsko & puckkontroll" */
export function focusTitle(skills: Skill[]): string {
  return skills.map((s, i) => (i === 0 ? S.skills[s] : S.skills[s].toLowerCase())).join(" & ");
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
