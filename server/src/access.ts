import type { Queryable } from "./db.js";
import { forbidden, notFound } from "./errors.js";

export type TeamRole = "head" | "coach";

export async function teamRole(db: Queryable, userId: string, teamId: string): Promise<TeamRole | null> {
  const { rows } = await db.query<{ role: TeamRole }>("SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2", [
    teamId,
    userId
  ]);
  return rows[0]?.role ?? null;
}

/** Non-members get 404 so that team ids cannot be probed. */
export async function requireMember(db: Queryable, userId: string, teamId: string): Promise<TeamRole> {
  const role = await teamRole(db, userId, teamId);
  if (!role) throw notFound("Laget hittades inte.");
  return role;
}

export async function requireHead(db: Queryable, userId: string, teamId: string): Promise<void> {
  const role = await requireMember(db, userId, teamId);
  if (role !== "head") throw forbidden("Endast huvudtränaren kan göra detta.");
}

export async function countHeads(db: Queryable, teamId: string): Promise<number> {
  const { rows } = await db.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM team_members WHERE team_id = $1 AND role = 'head'",
    [teamId]
  );
  return rows[0]!.n;
}
