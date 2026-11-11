import type { Queryable } from './db.js';
import { forbidden, notFound } from './errors.js';

export type ClubRole = 'admin' | 'member';
export type TeamRole = 'leader' | 'coach';

export async function getClubRole(db: Queryable, userId: string, clubId: string): Promise<ClubRole | null> {
  const { rows } = await db.query<{ role: ClubRole }>(
    'SELECT role FROM club_members WHERE club_id = $1 AND user_id = $2',
    [clubId, userId],
  );
  return rows[0]?.role ?? null;
}

/** Non-members get 404 so that club ids cannot be probed. */
export async function requireClubMember(db: Queryable, userId: string, clubId: string): Promise<ClubRole> {
  const role = await getClubRole(db, userId, clubId);
  if (!role) throw notFound('Klubben hittades inte.');
  return role;
}

export async function requireClubAdmin(db: Queryable, userId: string, clubId: string): Promise<void> {
  const role = await requireClubMember(db, userId, clubId);
  if (role !== 'admin') throw forbidden('Endast klubbadmin kan göra detta.');
}

export interface TeamAccess {
  team: { id: string; club_id: string; age_group_id: string | null; name: string };
  clubRole: ClubRole;
  teamRole: TeamRole | null;
  /** Club admins and the team's leaders/coaches plan practices and see notes. */
  canPlan: boolean;
  /** Club admins and the team's leaders manage the team's staff. */
  canManage: boolean;
}

export async function getTeamAccess(db: Queryable, userId: string, teamId: string): Promise<TeamAccess> {
  const { rows } = await db.query(
    `SELECT t.id, t.club_id, t.age_group_id, t.name, cm.role AS club_role, tm.role AS team_role
       FROM teams t
       JOIN club_members cm ON cm.club_id = t.club_id AND cm.user_id = $2
       LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $2
      WHERE t.id = $1`,
    [teamId, userId],
  );
  const row = rows[0];
  if (!row) throw notFound('Laget hittades inte.');
  const clubRole = row.club_role as ClubRole;
  const teamRole = (row.team_role ?? null) as TeamRole | null;
  return {
    team: { id: row.id, club_id: row.club_id, age_group_id: row.age_group_id, name: row.name },
    clubRole,
    teamRole,
    canPlan: clubRole === 'admin' || teamRole !== null,
    canManage: clubRole === 'admin' || teamRole === 'leader',
  };
}

export async function requireTeamPlanner(db: Queryable, userId: string, teamId: string): Promise<TeamAccess> {
  const access = await getTeamAccess(db, userId, teamId);
  if (!access.canPlan) throw forbidden('Endast lagets ledare och tränare kan göra detta.');
  return access;
}

export async function requireTeamManager(db: Queryable, userId: string, teamId: string): Promise<TeamAccess> {
  const access = await getTeamAccess(db, userId, teamId);
  if (!access.canManage) throw forbidden('Endast lagledare eller klubbadmin kan hantera lagets ledare.');
  return access;
}

export async function getPracticeAccess(db: Queryable, userId: string, practiceId: string) {
  const { rows } = await db.query<{ team_id: string }>('SELECT team_id FROM practices WHERE id = $1', [practiceId]);
  if (!rows[0]) throw notFound('Träningen hittades inte.');
  return getTeamAccess(db, userId, rows[0].team_id);
}
