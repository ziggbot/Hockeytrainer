import type { Session, Team } from "./types";
import { addDays, isoWeekday, timeToMinutes, toISODate } from "./dates";

// Upcoming ice times: the team's weekly schedule (stand-in for the iCal
// feed, spec §5.9) merged with sessions already planned. A slot without a
// session is "unplanned".

export interface Slot {
  date: string;
  start: string;
  minutes: number;
  session?: Session;
}

export function slotKey(date: string, start: string): string {
  return `${date} ${start}`;
}

/** Slots in [from, from + days), sorted by time. Includes extra sessions. */
export function upcomingSlots(team: Team, sessions: Session[], from: Date, days = 7): Slot[] {
  const first = toISODate(from);
  const last = toISODate(addDays(from, days - 1));
  const byKey = new Map<string, Slot>();

  for (let i = 0; i < days; i++) {
    const day = addDays(from, i);
    for (const t of team.schedule) {
      if (t.weekday !== isoWeekday(day)) continue;
      const date = toISODate(day);
      byKey.set(slotKey(date, t.start), { date, start: t.start, minutes: t.minutes });
    }
  }
  for (const s of sessions) {
    if (s.teamId !== team.id || s.date < first || s.date > last) continue;
    byKey.set(slotKey(s.date, s.start), { date: s.date, start: s.start, minutes: s.minutes, session: s });
  }
  return [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date) || timeToMinutes(a.start) - timeToMinutes(b.start));
}

/**
 * The slot the big button acts on: the first one today or later that is not
 * done. A practice that started up to its own length ago still counts, so
 * the coach can open rink mode mid-practice.
 */
export function nextSlot(slots: Slot[], now: Date): Slot | undefined {
  const today = toISODate(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return slots.find((s) => {
    if (s.session?.status === "done") return false;
    if (s.date > today) return true;
    return s.date === today && timeToMinutes(s.start) + s.minutes >= nowMin;
  });
}
