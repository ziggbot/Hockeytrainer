import { SPORT } from "../sport";
import { getAccount, type Account } from "./account";
import { call } from "./api";

// Calls behind the "Hantera lag" screen and the invite page.

export type Role = "head" | "coach";
export interface Member {
  id: string;
  name: string;
  role: Role;
}
export interface OpenInvite {
  id: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
  uses: number;
  maxUses: number;
}
export interface InviteInfo {
  valid: boolean;
  role?: Role;
  sport?: string;
  teamName?: string;
  invitedBy?: string;
}

const token = () => getAccount()?.token;

export const register = (name: string, email: string, password: string) =>
  call<Account>("POST", "/auth/register", { name, email, password });
export const login = (email: string, password: string) => call<Account>("POST", "/auth/login", { email, password });

export const members = (teamId: string) =>
  call<Member[]>("GET", `/teams/${encodeURIComponent(teamId)}/members`, undefined, token());
export const setRole = (teamId: string, userId: string, role: Role) =>
  call("PATCH", `/teams/${encodeURIComponent(teamId)}/members/${userId}`, { role }, token());
export const removeMember = (teamId: string, userId: string) =>
  call("DELETE", `/teams/${encodeURIComponent(teamId)}/members/${userId}`, undefined, token());
export const deleteTeamEverywhere = (teamId: string) =>
  call("DELETE", `/teams/${encodeURIComponent(teamId)}`, undefined, token());
export const resetLink = (teamId: string, userId: string) =>
  call<{ token: string; expiresInHours: number }>(
    "POST",
    `/teams/${encodeURIComponent(teamId)}/members/${userId}/reset-link`,
    {},
    token()
  );

export const createInvite = (teamId: string) =>
  call<{ token: string; expiresAt: string; maxUses: number }>(
    "POST",
    `/teams/${encodeURIComponent(teamId)}/invites`,
    {},
    token()
  );
export const openInvites = (teamId: string) =>
  call<OpenInvite[]>("GET", `/teams/${encodeURIComponent(teamId)}/invites`, undefined, token());
export const closeInvite = (id: string) => call("DELETE", `/invites/${id}`, undefined, token());
export const inviteInfo = (t: string) => call<InviteInfo>("GET", `/invites/${encodeURIComponent(t)}`);
export const acceptInvite = (t: string) =>
  call<{ teamId: string; sport: string }>("POST", `/invites/${encodeURIComponent(t)}/accept`, {}, token());

export const resetInfo = (t: string) => call<{ valid: boolean; name?: string }>("GET", `/resets/${encodeURIComponent(t)}`);
export const resetPassword = (t: string, password: string) =>
  call<Account>("POST", `/resets/${encodeURIComponent(t)}`, { password });

/** Link that opens the invite page in this app (hockey or floorball). */
export const inviteUrl = (t: string) => `${window.location.origin}/inbjudan/${t}`;
export const resetUrl = (t: string) => `${window.location.origin}/nytt-losenord/${t}`;
export const isThisSport = (info: InviteInfo) => !info.sport || info.sport === SPORT.id;
