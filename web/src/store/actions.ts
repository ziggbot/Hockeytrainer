import type {
  Drill,
  EquipmentItem,
  NoteTag,
  PartDraft,
  SeasonBlock,
  Session,
  SessionPart,
  Team,
  TrainingTime
} from "../domain/types";
import {
  CLOSING_MINUTES,
  GATHER_MINUTES,
  PLAN_VERSION,
  drillIdsOf,
  roundToStep,
  snapToSteps,
  suggestPlan
} from "../domain/planner";
import { currentBlock } from "../domain/curriculum";
import { parseISODate } from "../domain/dates";
import { AGE_GROUPS } from "../content/curricula";
import { SEED_DRILLS } from "../content/drills";
import { SEED_TEMPLATES } from "../content/templates";
import { focusTitle } from "../i18n";
import { getState, newId, nowIso, setState, type AppState } from "./store";

export function allDrills(s: AppState = getState()): Drill[] {
  return [...SEED_DRILLS, ...s.ownDrills];
}

export function ageGroupOf(team: Team) {
  return AGE_GROUPS.find((a) => a.id === team.ageGroupId) ?? AGE_GROUPS[0];
}

export function curriculumOf(team: Team, s: AppState = getState()) {
  return s.curricula.find((c) => c.ageGroupId === team.ageGroupId);
}

export function activeTeam(s: AppState = getState()): Team | undefined {
  return s.teams.find((t) => t.id === s.activeTeamId) ?? s.teams[0];
}

const withIds = (parts: PartDraft[]): SessionPart[] => parts.map((p) => ({ ...p, id: newId() }) as SessionPart);

// ── Teams ──────────────────────────────────────────────────────

export function createTeam(input: Omit<Team, "id">): Team {
  const team: Team = { ...input, id: newId() };
  setState((s) => ({ ...s, teams: [...s.teams, team], activeTeamId: team.id }));
  return team;
}

export function updateTeam(team: Team) {
  setState((s) => ({ ...s, teams: s.teams.map((t) => (t.id === team.id ? team : t)) }));
}

export function setActiveTeam(id: string) {
  setState((s) => ({ ...s, activeTeamId: id }));
}

export function deleteTeam(id: string) {
  setState((s) => {
    const teams = s.teams.filter((t) => t.id !== id);
    const sessionIds = new Set(s.sessions.filter((x) => x.teamId === id).map((x) => x.id));
    return {
      ...s,
      teams,
      activeTeamId: s.activeTeamId === id ? (teams[0]?.id ?? null) : s.activeTeamId,
      sessions: s.sessions.filter((x) => x.teamId !== id),
      notes: s.notes.filter((n) => !sessionIds.has(n.sessionId))
    };
  });
}

export function newTrainingTime(weekday: number, start: string, minutes: number): TrainingTime {
  return { id: newId(), weekday, start, minutes };
}

// ── Sessions ───────────────────────────────────────────────────

/** Same template, or same set of drills, counts as the same plan. */
function planSignature(p: { templateId?: string; parts: (PartDraft | SessionPart)[] }): string {
  return p.templateId ?? [...drillIdsOf(p.parts)].sort().join(",");
}

/**
 * Suggestion for a slot, starting at `variant`. Skips plans identical to the
 * team's other sessions within a week, so two practices in the same week
 * don't get the same running order.
 */
function suggestionFor(team: Team, date: string, minutes: number, variant: number, excludeSessionId?: string) {
  const s = getState();
  const curriculum = curriculumOf(team, s);
  const day = parseISODate(date).getTime();
  const pos = currentBlock(curriculum, parseISODate(date));
  const nearby = new Set(
    s.sessions
      .filter(
        (x) =>
          x.teamId === team.id && x.id !== excludeSessionId && Math.abs(parseISODate(x.date).getTime() - day) <= 7 * 86_400_000
      )
      .map(planSignature)
  );
  const ctx = {
    ageGroup: ageGroupOf(team),
    playerCount: team.playerCount,
    focus: pos?.block.focus ?? [],
    targetSkills: curriculum?.targetSkills ?? [],
    minutes,
    drills: allDrills(s),
    templates: [...s.ownTemplates, ...SEED_TEMPLATES]
  };
  let chosen = { ...suggestPlan({ ...ctx, variant }), variant };
  for (let v = variant; v < variant + 8; v++) {
    const candidate = suggestPlan({ ...ctx, variant: v });
    if (!nearby.has(planSignature(candidate))) {
      chosen = { ...candidate, variant: v };
      break;
    }
  }
  return { ...chosen, title: chosen.title ?? focusTitle(chosen.focus) };
}

/** What "Planera" would produce for a slot, without saving anything. */
export function previewPlan(team: Team, date: string, minutes: number) {
  return suggestionFor(team, date, minutes, 0);
}

/** Plan an ice slot from the team's current block. Returns the new session id. */
export function planSession(team: Team, date: string, start: string, minutes: number): string {
  const suggestion = suggestionFor(team, date, minutes, 0);
  const now = nowIso();
  const session: Session = {
    id: newId(),
    teamId: team.id,
    date,
    start,
    minutes,
    title: suggestion.title,
    focus: suggestion.focus,
    parts: withIds(suggestion.parts),
    status: "planned",
    equipmentChecked: [],
    templateId: suggestion.templateId,
    variant: suggestion.variant,
    planVersion: PLAN_VERSION,
    createdAt: now,
    updatedAt: now
  };
  setState((s) => ({ ...s, sessions: [...s.sessions, session] }));
  return session.id;
}

/** "Nytt förslag": replace the plan with the next alternative. */
export function replanSession(id: string) {
  const s = getState();
  const session = s.sessions.find((x) => x.id === id);
  const team = session && s.teams.find((t) => t.id === session.teamId);
  if (!session || !team) return;
  const suggestion = suggestionFor(team, session.date, session.minutes, (session.variant ?? 0) + 1, session.id);
  updateSession(id, {
    title: suggestion.title,
    focus: suggestion.focus,
    parts: withIds(suggestion.parts),
    templateId: suggestion.templateId,
    variant: suggestion.variant,
    planVersion: PLAN_VERSION,
    equipmentChecked: []
  });
}

/**
 * After a planner change, rebuild upcoming plans the coach never touched so
 * they follow the new shape. Anything edited, done or in the past is kept.
 */
export function refreshUntouchedPlans(today: string) {
  const s = getState();
  const stale = s.sessions.filter(
    (x) =>
      (x.planVersion ?? 1) < PLAN_VERSION &&
      x.status === "planned" &&
      x.date >= today &&
      x.updatedAt === x.createdAt &&
      x.equipmentChecked.length === 0
  );
  for (const x of stale) {
    const team = s.teams.find((t) => t.id === x.teamId);
    if (!team) continue;
    const suggestion = suggestionFor(team, x.date, x.minutes, 0, x.id);
    setState((st) => ({
      ...st,
      sessions: st.sessions.map((y) =>
        y.id === x.id
          ? {
              ...y,
              title: suggestion.title,
              focus: suggestion.focus,
              parts: withIds(suggestion.parts),
              templateId: suggestion.templateId,
              variant: suggestion.variant,
              planVersion: PLAN_VERSION
            }
          : y
      )
    }));
  }
}

/**
 * Plans the coach kept (edited, done or past) are not rebuilt, but none may
 * keep off-grid minutes from the first app version (e.g. a 42-minute drill).
 * Not an edit by the coach, so `updatedAt` stays.
 */
export function snapOffGridPlans() {
  const offGrid = getState().sessions.filter((x) => snapToSteps(x.parts, x.minutes) !== x.parts);
  if (offGrid.length === 0) return;
  const ids = new Set(offGrid.map((x) => x.id));
  setState((s) => ({
    ...s,
    sessions: s.sessions.map((x) => (ids.has(x.id) ? { ...x, parts: snapToSteps(x.parts, x.minutes) } : x))
  }));
}

export function updateSession(id: string, patch: Partial<Omit<Session, "id" | "teamId" | "createdAt">>) {
  setState((s) => ({
    ...s,
    sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: nowIso() } : x))
  }));
}

export function setParts(id: string, parts: SessionPart[]) {
  updateSession(id, { parts });
}

export function setDone(id: string, done: boolean) {
  updateSession(id, { status: done ? "done" : "planned" });
}

export function toggleEquipment(id: string, item: EquipmentItem) {
  const session = getState().sessions.find((x) => x.id === id);
  if (!session) return;
  const has = session.equipmentChecked.includes(item);
  updateSession(id, {
    equipmentChecked: has ? session.equipmentChecked.filter((i) => i !== item) : [...session.equipmentChecked, item]
  });
}

export function deleteSession(id: string) {
  setState((s) => ({
    ...s,
    sessions: s.sessions.filter((x) => x.id !== id),
    notes: s.notes.filter((n) => n.sessionId !== id)
  }));
}

export function newPart(drill: Drill): SessionPart {
  return { id: newId(), type: "drill", drillId: drill.id, minutes: roundToStep(drill.minutes) };
}

export function newGather(): SessionPart {
  return { id: newId(), type: "gather", minutes: GATHER_MINUTES };
}

export function newClosing(): SessionPart {
  return { id: newId(), type: "closing", minutes: CLOSING_MINUTES };
}

// ── Notes (append-only) ────────────────────────────────────────

export function addNote(sessionId: string, text: string, tags: NoteTag[]) {
  if (!text.trim() && tags.length === 0) return;
  setState((s) => ({
    ...s,
    notes: [...s.notes, { id: newId(), sessionId, text: text.trim(), tags, createdAt: nowIso() }]
  }));
}

// ── Own drills ─────────────────────────────────────────────────

export function saveOwnDrill(drill: Drill) {
  setState((s) => ({
    ...s,
    ownDrills: s.ownDrills.some((d) => d.id === drill.id)
      ? s.ownDrills.map((d) => (d.id === drill.id ? drill : d))
      : [...s.ownDrills, drill]
  }));
}

export function deleteOwnDrill(id: string) {
  setState((s) => ({ ...s, ownDrills: s.ownDrills.filter((d) => d.id !== id) }));
}

// ── Curriculum (club admin) ────────────────────────────────────

export function updateBlock(ageGroupId: string, block: SeasonBlock) {
  setState((s) => ({
    ...s,
    curricula: s.curricula.map((c) =>
      c.ageGroupId === ageGroupId ? { ...c, blocks: c.blocks.map((b) => (b.id === block.id ? block : b)) } : c
    )
  }));
}

export function updatePhilosophy(ageGroupId: string, philosophy: string) {
  setState((s) => ({
    ...s,
    curricula: s.curricula.map((c) => (c.ageGroupId === ageGroupId ? { ...c, philosophy } : c))
  }));
}
