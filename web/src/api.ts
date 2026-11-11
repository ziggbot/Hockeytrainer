import { t } from './i18n/sv';

export type ClubRole = 'admin' | 'member';
export type TeamRole = 'leader' | 'coach';
export type IceArea = 'full' | 'half' | 'third' | 'station';

export interface Me {
  user: { id: string; email: string; name: string };
  clubs: { id: string; name: string; region: string; role: ClubRole }[];
  teams: { id: string; name: string; clubId: string; ageGroupName: string | null; role: TeamRole }[];
  allowClubSignup: boolean;
}

export interface Block {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  focusTags: string[];
}

export interface AgeGroup {
  id: string;
  name: string;
  birthYearFrom: number | null;
  birthYearTo: number | null;
  targetSkills: string[];
  philosophy: string;
  blocks: Block[];
}

export interface TeamSummary {
  id: string;
  name: string;
  ageGroupId: string | null;
  ageGroupName: string | null;
  staffCount: number;
  myRole: TeamRole | null;
}

export interface Club {
  id: string;
  name: string;
  region: string;
  myRole: ClubRole;
  ageGroups: AgeGroup[];
  teams: TeamSummary[];
}

export interface Member {
  id: string;
  name: string;
  email: string | null;
  clubRole: ClubRole;
  teams: { teamId: string; teamName: string; role: TeamRole }[];
}

export interface Invite {
  id: string;
  role: 'admin' | TeamRole;
  note: string;
  teamId?: string | null;
  teamName?: string | null;
  createdAt: string;
  expiresAt: string;
  createdByName?: string | null;
}

export interface TeamDetail {
  id: string;
  name: string;
  clubId: string;
  clubName: string;
  ageGroupId: string | null;
  ageGroupName: string | null;
  targetSkills: string[] | null;
  philosophy: string | null;
  blockName: string | null;
  blockFocusTags: string[] | null;
  blockStart: string | null;
  blockEnd: string | null;
  members: { id: string; name: string; email: string | null; role: TeamRole }[];
  invites: Invite[];
  access: { clubRole: ClubRole; teamRole: TeamRole | null; canPlan: boolean; canManage: boolean };
}

export interface PracticeSummary {
  id: string;
  title: string;
  startsAt: string;
  durationMin: number;
  status: 'planned' | 'done';
  totalMinutes: number;
  itemCount: number;
  noteCount: number;
}

export interface EquipmentLine {
  item: string;
  qty: number;
}

export interface Drill {
  id: string;
  clubId: string | null;
  visibility: 'private' | 'club' | 'public';
  title: string;
  description: string;
  coachingPoints: string[];
  skillTags: string[];
  ageMin: number | null;
  ageMax: number | null;
  durationMin: number;
  iceArea: IceArea;
  minPlayers: number | null;
  equipment: EquipmentLine[];
  diagramUrl: string | null;
  createdBy: string | null;
  createdByName: string | null;
  canEdit: boolean;
}

export interface PracticeItem {
  id?: string;
  drillId: string | null;
  title: string;
  minutes: number;
  station: number | null;
  note: string;
  drill?: {
    description: string;
    coachingPoints: string[];
    skillTags: string[];
    iceArea: IceArea;
    equipment: EquipmentLine[];
    diagramUrl: string | null;
  } | null;
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
  items: PracticeItem[];
  totalMinutes: number;
  equipment: EquipmentLine[];
  notes?: { id: string; body: string; tags: string[]; createdAt: string; authorName: string | null }[];
  canEdit: boolean;
}

export interface OverviewRow {
  teamId: string;
  teamName: string;
  ageGroupName: string | null;
  blockName: string | null;
  focusTags: string[];
  periodStart: string;
  periodEnd: string;
  planned: number;
  done: number;
  tagsUsed: string[];
  focusCovered: string[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
  get offline() {
    return this.status === 0;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'content-type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, t.errors.offline);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error ?? t.errors.generic;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : t.errors.generic;
}
