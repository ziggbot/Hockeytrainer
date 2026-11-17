import type { AgeGroup, Curriculum, SeasonBlock } from "./types";
import { isoWeekAndYear, isoWeeksInYear } from "./dates";

export function weekInBlock(week: number, block: SeasonBlock): boolean {
  const { startWeek: s, endWeek: e } = block;
  return s <= e ? week >= s && week <= e : week >= s || week <= e;
}

export interface BlockPosition {
  block: SeasonBlock;
  /** 1-based week within the block. */
  weekIndex: number;
  weekCount: number;
}

/** The season block covering `date`, or null between blocks (e.g. summer). */
export function currentBlock(curriculum: Curriculum | undefined, date: Date): BlockPosition | null {
  if (!curriculum) return null;
  const { week, year } = isoWeekAndYear(date);
  const block = curriculum.blocks.find((b) => weekInBlock(week, b));
  if (!block) return null;
  const { startWeek: s, endWeek: e } = block;
  if (s <= e) return { block, weekIndex: week - s + 1, weekCount: e - s + 1 };
  // Wrapping block: the weeks before New Year belong to the previous ISO year.
  const startYear = week >= s ? year : year - 1;
  const weeksBeforeNewYear = isoWeeksInYear(startYear) - s + 1;
  const weekIndex = week >= s ? week - s + 1 : weeksBeforeNewYear + week;
  return { block, weekIndex, weekCount: weeksBeforeNewYear + e };
}

export function ageOverlaps(a: { ageMin: number; ageMax: number }, group: AgeGroup, slack = 0): boolean {
  return a.ageMin <= group.ageMax + slack && a.ageMax >= group.ageMin - slack;
}
