import type { Queryable } from './db.js';
import { aggregateEquipment, type EquipmentLine } from './equipment.js';

export interface ItemInput {
  drillId: string | null;
  title: string;
  minutes: number;
  station: number | null;
  note: string;
}

export interface CandidateDrill {
  id: string;
  title: string;
  skill_tags: string[];
  duration_min: number;
  age_min: number | null;
  age_max: number | null;
}

const DEFAULT_ROTATION = ['skridsko', 'puckkontroll', 'passning', 'skott'];

/** Age span (in years, at the practice date) for an age group defined by birth years. */
export function ageSpan(year: number, birthFrom: number | null, birthTo: number | null): [number, number] | null {
  if (birthFrom == null && birthTo == null) return null;
  const from = birthFrom ?? birthTo!;
  const to = birthTo ?? birthFrom!;
  const ages = [year - from, year - to];
  return [Math.min(...ages), Math.max(...ages)];
}

/**
 * Greedy session suggestion: one warm-up, drills that best match the block's focus,
 * and a small-area game at the end that absorbs leftover minutes. Pure function for testing.
 */
export function suggestPractice(drills: CandidateDrill[], focusTags: string[], durationMin: number): ItemInput[] {
  const focus = focusTags.length ? focusTags : DEFAULT_ROTATION;
  const score = (d: CandidateDrill) => d.skill_tags.filter((t) => focus.includes(t)).length;
  const used = new Set<string>();
  const items: ItemInput[] = [];
  let remaining = durationMin;
  const add = (d: CandidateDrill, minutes: number) => {
    items.push({ drillId: d.id, title: d.title, minutes, station: null, note: '' });
    used.add(d.id);
    remaining -= minutes;
  };

  const warmup = drills
    .filter((d) => d.skill_tags.includes('uppvärmning'))
    .sort((a, b) => score(b) - score(a))[0];
  if (warmup && remaining >= 15) add(warmup, Math.min(warmup.duration_min, 8));

  const game = drills
    .filter((d) => d.skill_tags.includes('smålagsspel') && !used.has(d.id))
    .sort((a, b) => score(b) - score(a))[0];
  const gameMinutes = game ? Math.min(game.duration_min, 12) : 0;
  const reserve = game && remaining - gameMinutes >= 10 ? gameMinutes : 0;

  const middle = drills
    .filter((d) => !used.has(d.id) && d.id !== game?.id && !d.skill_tags.includes('uppvärmning'))
    .filter((d) => score(d) > 0)
    .sort((a, b) => score(b) - score(a) || a.duration_min - b.duration_min);
  for (const d of middle) {
    if (remaining - reserve - d.duration_min < 0) continue;
    add(d, d.duration_min);
    if (remaining - reserve < 5) break;
  }

  if (game && reserve) {
    add(game, gameMinutes);
  }
  // Give leftover minutes to the last item so the plan fills the ice time.
  const last = items[items.length - 1];
  if (last && remaining > 0) {
    last.minutes = Math.min(120, last.minutes + remaining);
    remaining = 0;
  }
  return items;
}

export async function loadSuggestionCandidates(
  db: Queryable,
  clubId: string,
  userId: string,
  ages: [number, number] | null,
): Promise<CandidateDrill[]> {
  const { rows } = await db.query<CandidateDrill>(
    `SELECT id, title, skill_tags, duration_min, age_min, age_max FROM drills
      WHERE (visibility = 'public' OR (club_id = $1 AND (visibility = 'club' OR created_by = $2)))
        AND ($3::int IS NULL OR age_max IS NULL OR age_max >= $3)
        AND ($4::int IS NULL OR age_min IS NULL OR age_min <= $4)
      ORDER BY (club_id IS NULL), title`,
    [clubId, userId, ages?.[0] ?? null, ages?.[1] ?? null],
  );
  return rows;
}

export interface PracticeDetail {
  id: string;
  teamId: string;
  teamName: string;
  clubId: string;
  clubName: string;
  title: string;
  startsAt: string;
  durationMin: number;
  status: 'planned' | 'done';
  playerCount: number | null;
  focusTags: string[];
  shareToken?: string | null;
  block: { name: string; focusTags: string[] } | null;
  items: {
    id: string;
    position: number;
    drillId: string | null;
    title: string;
    minutes: number;
    station: number | null;
    note: string;
    drill: {
      description: string;
      coachingPoints: string[];
      skillTags: string[];
      iceArea: string;
      equipment: EquipmentLine[];
      diagramUrl: string | null;
    } | null;
  }[];
  totalMinutes: number;
  equipment: EquipmentLine[];
  notes?: { id: string; body: string; tags: string[]; createdAt: string; authorName: string | null }[];
}

export async function loadPracticeDetails(
  db: Queryable,
  practiceIds: string[],
  opts: { includeNotes: boolean; includeShareToken: boolean },
): Promise<PracticeDetail[]> {
  if (!practiceIds.length) return [];
  const { rows: practices } = await db.query(
    `SELECT p.id, p.team_id AS "teamId", t.name AS "teamName", c.id AS "clubId", c.name AS "clubName",
            p.title, p.starts_at AS "startsAt", p.duration_min AS "durationMin", p.status,
            p.player_count AS "playerCount", p.focus_tags AS "focusTags", p.share_token AS "shareToken",
            b.name AS "blockName", b.focus_tags AS "blockFocusTags"
       FROM practices p
       JOIN teams t ON t.id = p.team_id
       JOIN clubs c ON c.id = t.club_id
       LEFT JOIN LATERAL (
         SELECT sb.name, sb.focus_tags FROM season_blocks sb
          WHERE sb.age_group_id = t.age_group_id
            AND (p.starts_at AT TIME ZONE 'Europe/Stockholm')::date BETWEEN sb.start_date AND sb.end_date
          ORDER BY sb.start_date DESC LIMIT 1
       ) b ON true
      WHERE p.id = ANY($1::uuid[])
      ORDER BY p.starts_at`,
    [practiceIds],
  );
  const { rows: items } = await db.query(
    `SELECT pi.id, pi.practice_id, pi.position, pi.drill_id AS "drillId", pi.title, pi.minutes, pi.station, pi.note,
            d.description, d.coaching_points, d.skill_tags, d.ice_area, d.equipment, d.diagram_url
       FROM practice_items pi LEFT JOIN drills d ON d.id = pi.drill_id
      WHERE pi.practice_id = ANY($1::uuid[])
      ORDER BY pi.position`,
    [practiceIds],
  );
  const notes = opts.includeNotes
    ? (
        await db.query(
          `SELECT n.id, n.practice_id, n.body, n.tags, n.created_at AS "createdAt", u.name AS "authorName"
             FROM practice_notes n LEFT JOIN users u ON u.id = n.user_id
            WHERE n.practice_id = ANY($1::uuid[])
            ORDER BY n.created_at`,
          [practiceIds],
        )
      ).rows
    : [];

  return practices.map((p) => {
    const own = items
      .filter((i) => i.practice_id === p.id)
      .map((i) => ({
        id: i.id,
        position: i.position,
        drillId: i.drillId,
        title: i.title,
        minutes: i.minutes,
        station: i.station,
        note: i.note,
        drill: i.drillId
          ? {
              description: i.description,
              coachingPoints: i.coaching_points,
              skillTags: i.skill_tags,
              iceArea: i.ice_area,
              equipment: i.equipment,
              diagramUrl: i.diagram_url,
            }
          : null,
      }));
    const detail: PracticeDetail = {
      id: p.id,
      teamId: p.teamId,
      teamName: p.teamName,
      clubId: p.clubId,
      clubName: p.clubName,
      title: p.title,
      startsAt: p.startsAt,
      durationMin: p.durationMin,
      status: p.status,
      playerCount: p.playerCount,
      focusTags: p.focusTags,
      block: p.blockName ? { name: p.blockName, focusTags: p.blockFocusTags } : null,
      items: own,
      totalMinutes: own.reduce((sum, i) => sum + i.minutes, 0),
      equipment: aggregateEquipment(own.map((i) => ({ station: i.station, equipment: i.drill?.equipment }))),
    };
    if (opts.includeShareToken) detail.shareToken = p.shareToken;
    if (opts.includeNotes) {
      detail.notes = notes
        .filter((n) => n.practice_id === p.id)
        .map((n) => ({ id: n.id, body: n.body, tags: n.tags, createdAt: n.createdAt, authorName: n.authorName }));
    }
    return detail;
  });
}
