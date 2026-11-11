import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import type { Pool } from '../db.js';
import { Client, setup, uniqueEmail } from './helpers.js';

let app: FastifyInstance;
let pool: Pool;

before(async () => {
  ({ app, pool } = await setup());
});

after(async () => {
  await app.close();
  await pool.end();
});

async function registerAdmin(clubName = 'IK Test') {
  const c = new Client(app);
  const res = await c.post('/api/auth/register', {
    name: 'Anna Admin',
    email: uniqueEmail('admin'),
    password: 'hemligt123',
    clubName,
  });
  assert.equal(res.status, 201, JSON.stringify(res.json));
  return { client: c, clubId: res.json.clubId as string };
}

async function registerWithInvite(token: string, name: string) {
  const c = new Client(app);
  const email = uniqueEmail(name.toLowerCase());
  const res = await c.post('/api/auth/register', { name, email, password: 'hemligt123', inviteToken: token });
  return { client: c, res, email };
}

/** Builds a club with an age group + current block, a team, a leader and a coach. */
async function buildClub() {
  const { client: admin, clubId } = await registerAdmin();
  const year = new Date().getFullYear();
  const ag = await admin.post(`/api/clubs/${clubId}/age-groups`, {
    name: 'U10',
    birthYearFrom: year - 10,
    birthYearTo: year - 9,
    targetSkills: ['skridsko', 'puckkontroll'],
  });
  assert.equal(ag.status, 201);
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const block = await admin.post(`/api/age-groups/${ag.json.id}/blocks`, {
    name: 'Block 1',
    startDate: iso(new Date(today.getTime() - 7 * 864e5)),
    endDate: iso(new Date(today.getTime() + 30 * 864e5)),
    focusTags: ['skridsko', 'passning'],
  });
  assert.equal(block.status, 201);
  const team = await admin.post(`/api/clubs/${clubId}/teams`, { name: 'U10 Blå', ageGroupId: ag.json.id });
  assert.equal(team.status, 201);
  const teamId = team.json.id as string;

  const leaderInvite = await admin.post(`/api/teams/${teamId}/invites`, { role: 'leader', note: 'Lasse' });
  assert.equal(leaderInvite.status, 201);
  const leader = await registerWithInvite(leaderInvite.json.token, 'Lasse');
  assert.equal(leader.res.status, 201, JSON.stringify(leader.res.json));

  const coachInvite = await leader.client.post(`/api/teams/${teamId}/invites`, { role: 'coach' });
  assert.equal(coachInvite.status, 201, JSON.stringify(coachInvite.json));
  const coach = await registerWithInvite(coachInvite.json.token, 'Tove');
  assert.equal(coach.res.status, 201);

  return { admin, clubId, teamId, ageGroupId: ag.json.id as string, leader: leader.client, coach: coach.client, coachInviteToken: coachInvite.json.token as string };
}

describe('auth', () => {
  test('register, me, logout, login', async () => {
    const c = new Client(app);
    const email = uniqueEmail('Person');
    const reg = await c.post('/api/auth/register', { name: 'P', email, password: 'hemligt123', clubName: 'Klubb' });
    assert.equal(reg.status, 201);
    const me = await c.get('/api/me');
    assert.equal(me.status, 200);
    assert.equal(me.json.user.email, email.toLowerCase());
    assert.equal(me.json.clubs[0].role, 'admin');

    assert.equal((await c.post('/api/auth/logout')).status, 200);
    assert.equal((await c.get('/api/me')).status, 401);

    assert.equal((await c.post('/api/auth/login', { email, password: 'fel-lösen' })).status, 401);
    assert.equal((await c.post('/api/auth/login', { email: email.toUpperCase(), password: 'hemligt123' })).status, 200);
    assert.equal((await c.get('/api/me')).status, 200);
  });

  test('duplicate e-mail is rejected, short password is rejected', async () => {
    const email = uniqueEmail('dup');
    const a = new Client(app);
    assert.equal((await a.post('/api/auth/register', { name: 'A', email, password: 'hemligt123', clubName: 'X' })).status, 201);
    const b = new Client(app);
    assert.equal((await b.post('/api/auth/register', { name: 'B', email, password: 'hemligt123', clubName: 'Y' })).status, 409);
    const short = await b.post('/api/auth/register', { name: 'B', email: uniqueEmail('s'), password: 'kort', clubName: 'Y' });
    assert.equal(short.status, 400);
    assert.match(short.json.error, /Lösenord/);
  });

  test('cross-origin writes are refused', async () => {
    const c = new Client(app);
    const res = await c.req('POST', '/api/auth/login', { email: 'a@b.se', password: 'x' }, { origin: 'https://evil.example' });
    assert.equal(res.status, 403);
  });
});

describe('roles: club admin, lagledare, tränare', () => {
  test('invites put people in the right team with the right role', async () => {
    const { admin, clubId, teamId, coach } = await buildClub();
    const team = await admin.get(`/api/teams/${teamId}`);
    assert.equal(team.status, 200);
    const roles = team.json.members.map((m: any) => m.role).sort();
    assert.deepEqual(roles, ['coach', 'leader']);
    assert.ok(team.json.members.every((m: any) => m.email), 'admin sees e-mail addresses');

    const coachMe = await coach.get('/api/me');
    assert.equal(coachMe.json.clubs[0].id, clubId);
    assert.equal(coachMe.json.clubs[0].role, 'member');
    assert.equal(coachMe.json.teams[0].role, 'coach');

    const coachView = await coach.get(`/api/teams/${teamId}`);
    assert.equal(coachView.json.access.canManage, false);
    assert.equal(coachView.json.access.canPlan, true);
    assert.ok(coachView.json.members.every((m: any) => m.email === null), 'coach does not see e-mails');
  });

  test('an invite link works only once', async () => {
    const { coachInviteToken } = await buildClub();
    const again = await registerWithInvite(coachInviteToken, 'Andra');
    assert.equal(again.res.status, 400);
    const info = await new Client(app).get(`/api/invites/${coachInviteToken}`);
    assert.equal(info.json.valid, false);
  });

  test('coach cannot manage staff or club; leader cannot manage club', async () => {
    const { clubId, teamId, leader, coach } = await buildClub();
    assert.equal((await coach.post(`/api/teams/${teamId}/invites`, { role: 'coach' })).status, 403);
    assert.equal((await coach.post(`/api/clubs/${clubId}/teams`, { name: 'Nytt' })).status, 403);
    assert.equal((await leader.post(`/api/clubs/${clubId}/teams`, { name: 'Nytt' })).status, 403);
    assert.equal((await leader.post(`/api/clubs/${clubId}/invites`, { role: 'admin' })).status, 403);
    assert.equal((await leader.get(`/api/clubs/${clubId}/export`)).status, 403);
  });

  test('leader can promote/demote and remove staff in own team', async () => {
    const { admin, teamId, leader, coach } = await buildClub();
    const team = await admin.get(`/api/teams/${teamId}`);
    const coachId = team.json.members.find((m: any) => m.role === 'coach').id;
    assert.equal((await leader.patch(`/api/teams/${teamId}/members/${coachId}`, { role: 'leader' })).status, 200);
    assert.equal((await coach.get(`/api/teams/${teamId}`)).json.access.canManage, true);
    assert.equal((await leader.del(`/api/teams/${teamId}/members/${coachId}`)).status, 200);
    assert.equal((await coach.get(`/api/teams/${teamId}`)).json.access.canPlan, false);
  });

  test('admin can add an existing club member to another team', async () => {
    const { admin, clubId, coach } = await buildClub();
    const team2 = await admin.post(`/api/clubs/${clubId}/teams`, { name: 'U10 Vit' });
    const coachId = (await coach.get('/api/me')).json.user.id;
    assert.equal((await admin.post(`/api/teams/${team2.json.id}/members`, { userId: coachId, role: 'coach' })).status, 201);
    const me = await coach.get('/api/me');
    assert.equal(me.json.teams.length, 2);
  });

  test('club must keep at least one admin', async () => {
    const { client: admin, clubId } = await registerAdmin();
    const adminId = (await admin.get('/api/me')).json.user.id;
    assert.equal((await admin.patch(`/api/clubs/${clubId}/members/${adminId}`, { role: 'member' })).status, 400);
    assert.equal((await admin.del(`/api/clubs/${clubId}/members/${adminId}`)).status, 400);
  });

  test('admin invite gives a second admin who can then demote the first', async () => {
    const { client: admin, clubId } = await registerAdmin();
    const inv = await admin.post(`/api/clubs/${clubId}/invites`, { role: 'admin' });
    assert.equal(inv.status, 201);
    const second = await registerWithInvite(inv.json.token, 'Bo');
    assert.equal((await second.client.get('/api/me')).json.clubs[0].role, 'admin');
    const firstId = (await admin.get('/api/me')).json.user.id;
    assert.equal((await second.client.patch(`/api/clubs/${clubId}/members/${firstId}`, { role: 'member' })).status, 200);
  });

  test('removing someone from the club also removes their team roles', async () => {
    const { admin, clubId, teamId, coach } = await buildClub();
    const coachId = (await coach.get('/api/me')).json.user.id;
    assert.equal((await admin.del(`/api/clubs/${clubId}/members/${coachId}`)).status, 200);
    assert.equal((await coach.get(`/api/teams/${teamId}`)).status, 404);
    assert.equal((await coach.get('/api/me')).json.teams.length, 0);
  });

  test('other clubs cannot see the team or its practices', async () => {
    const { teamId, coach } = await buildClub();
    const practice = await coach.post(`/api/teams/${teamId}/practices`, {
      startsAt: new Date(Date.now() + 864e5).toISOString(),
      durationMin: 60,
    });
    const { client: outsider } = await registerAdmin('Annan klubb');
    assert.equal((await outsider.get(`/api/teams/${teamId}`)).status, 404);
    assert.equal((await outsider.get(`/api/practices/${practice.json.id}`)).status, 404);
    assert.equal((await outsider.patch(`/api/practices/${practice.json.id}`, { status: 'done' })).status, 404);
  });
});

describe('password reset links', () => {
  test('admin creates a reset link; it logs the user in once', async () => {
    const { admin, clubId, coach } = await buildClub();
    const coachMe = (await coach.get('/api/me')).json.user;
    const link = await admin.post(`/api/clubs/${clubId}/members/${coachMe.id}/reset-link`);
    assert.equal(link.status, 200);
    const anon = new Client(app);
    assert.equal((await anon.get(`/api/resets/${link.json.token}`)).json.valid, true);
    assert.equal((await anon.post(`/api/resets/${link.json.token}`, { password: 'nyttlosen1' })).status, 200);
    assert.equal((await anon.get('/api/me')).json.user.id, coachMe.id);
    assert.equal((await coach.get('/api/me')).status, 401, 'old sessions are revoked');
    assert.equal((await anon.post(`/api/resets/${link.json.token}`, { password: 'nyttlosen2' })).status, 400);
  });

  test('admin cannot reset someone who is also in a club they do not administer', async () => {
    const { admin, clubId, coach } = await buildClub();
    const { client: otherAdmin, clubId: otherClub } = await registerAdmin('Grannklubben');
    const inv = await otherAdmin.post(`/api/clubs/${otherClub}/invites`, { role: 'admin' });
    assert.equal((await coach.post(`/api/invites/${inv.json.token}/accept`)).status, 200);
    const coachId = (await coach.get('/api/me')).json.user.id;
    assert.equal((await admin.post(`/api/clubs/${clubId}/members/${coachId}/reset-link`)).status, 403);
  });
});

describe('practices', () => {
  test('suggested plan follows the block focus and fits the ice time', async () => {
    const { teamId, coach } = await buildClub();
    const res = await coach.post(`/api/teams/${teamId}/practices`, {
      startsAt: new Date(Date.now() + 2 * 864e5).toISOString(),
      durationMin: 60,
      suggest: true,
    });
    assert.equal(res.status, 201);
    const p = await coach.get(`/api/practices/${res.json.id}`);
    assert.equal(p.status, 200);
    assert.ok(p.json.items.length >= 3, 'has several drills');
    assert.ok(p.json.totalMinutes <= 60 && p.json.totalMinutes >= 50, `total ${p.json.totalMinutes}`);
    assert.deepEqual(p.json.focusTags, ['skridsko', 'passning']);
    assert.equal(p.json.block.name, 'Block 1');
    assert.ok(p.json.equipment.length > 0, 'equipment checklist generated');
    assert.equal(p.json.canEdit, true);
  });

  test('reorder via PUT items, notes are idempotent, mark done', async () => {
    const { teamId, coach, leader } = await buildClub();
    const created = await coach.post(`/api/teams/${teamId}/practices`, {
      startsAt: new Date(Date.now() + 864e5).toISOString(),
      durationMin: 45,
      suggest: true,
    });
    const id = created.json.id;
    const before = (await coach.get(`/api/practices/${id}`)).json.items;
    const reversed = [...before].reverse().map((i: any) => ({ drillId: i.drillId, title: i.title, minutes: i.minutes }));
    reversed.push({ drillId: null, title: 'Vattenpaus', minutes: 2 });
    const put = await leader.put(`/api/practices/${id}/items`, { items: reversed });
    assert.equal(put.status, 200);
    assert.equal(put.json.items[0].title, before[before.length - 1].title);
    assert.equal(put.json.items.at(-1).title, 'Vattenpaus');

    const note = { body: 'Bra tempo', tags: ['fungerade bra'], clientId: 'client-note-123456' };
    assert.equal((await coach.post(`/api/practices/${id}/notes`, note)).status, 201);
    assert.equal((await coach.post(`/api/practices/${id}/notes`, note)).status, 201);
    const p = await coach.get(`/api/practices/${id}`);
    assert.equal(p.json.notes.length, 1);

    assert.equal((await coach.patch(`/api/practices/${id}`, { status: 'done', playerCount: 14 })).status, 200);
    const done = await coach.get(`/api/practices/${id}`);
    assert.equal(done.json.status, 'done');
    assert.equal(done.json.playerCount, 14);
  });

  test('share link is public, read-only, without notes, and can be revoked', async () => {
    const { teamId, coach } = await buildClub();
    const created = await coach.post(`/api/teams/${teamId}/practices`, {
      startsAt: new Date(Date.now() + 864e5).toISOString(),
      durationMin: 60,
      suggest: true,
    });
    const id = created.json.id;
    await coach.post(`/api/practices/${id}/notes`, { body: 'Hemlig anteckning' });
    const share = await coach.post(`/api/practices/${id}/share`);
    const anon = new Client(app);
    const pub = await anon.get(`/api/share/${share.json.shareToken}`);
    assert.equal(pub.status, 200);
    assert.equal(pub.json.notes, undefined);
    assert.equal(pub.json.shareToken, undefined);
    assert.equal(pub.json.canEdit, false);
    assert.ok(pub.json.items.length > 0);
    await coach.del(`/api/practices/${id}/share`);
    assert.equal((await anon.get(`/api/share/${share.json.shareToken}`)).status, 404);
  });

  test('upcoming returns the next 7 days for my teams', async () => {
    const { teamId, coach } = await buildClub();
    await coach.post(`/api/teams/${teamId}/practices`, { startsAt: new Date(Date.now() + 864e5).toISOString(), durationMin: 60 });
    await coach.post(`/api/teams/${teamId}/practices`, { startsAt: new Date(Date.now() + 10 * 864e5).toISOString(), durationMin: 60 });
    const up = await coach.get('/api/upcoming');
    assert.equal(up.status, 200);
    assert.equal(up.json.length, 1);
  });
});

describe('drills', () => {
  test('private drills stay private, club drills are shared, seed drills are read-only', async () => {
    const { admin, clubId, coach, leader } = await buildClub();
    const base = { durationMin: 8, iceArea: 'half', skillTags: ['skott'], equipment: [{ item: 'Puckar', qty: 10 }] };
    const priv = await coach.post('/api/drills', { ...base, clubId, title: 'Min hemliga', visibility: 'private' });
    const club = await coach.post('/api/drills', { ...base, clubId, title: 'Klubbens', visibility: 'club' });
    assert.equal(priv.status, 201);

    const leaderList = await leader.get(`/api/drills?clubId=${clubId}`);
    const titles = leaderList.json.map((d: any) => d.title);
    assert.ok(titles.includes('Klubbens'));
    assert.ok(!titles.includes('Min hemliga'));
    assert.equal((await leader.get(`/api/drills/${priv.json.id}`)).status, 404);

    const update = { ...base, title: 'Klubbens (admin)', visibility: 'private' };
    assert.equal((await admin.patch(`/api/drills/${club.json.id}`, update)).status, 200);
    const afterAdmin = await admin.get(`/api/drills/${club.json.id}`);
    assert.equal(afterAdmin.json.title, 'Klubbens (admin)');
    assert.equal(afterAdmin.json.visibility, 'club', 'admin cannot hide a coach’s club drill');
    assert.equal((await leader.patch(`/api/drills/${club.json.id}`, update)).status, 403);

    const seed = leaderList.json.find((d: any) => d.visibility === 'public');
    assert.equal((await admin.patch(`/api/drills/${seed.id}`, update)).status, 403);
    const copy = await leader.post(`/api/drills/${seed.id}/copy`, { clubId });
    assert.equal(copy.status, 201);
    assert.equal((await leader.get(`/api/drills/${copy.json.id}`)).json.canEdit, true);
  });

  test('filters by tag, age and ice area', async () => {
    const { clubId, coach } = await buildClub();
    const res = await coach.get(`/api/drills?clubId=${clubId}&tag=skott&age=8&iceArea=half`);
    assert.equal(res.status, 200);
    assert.ok(res.json.length > 0);
    for (const d of res.json) {
      assert.ok(d.skillTags.includes('skott'));
      assert.equal(d.iceArea, 'half');
      assert.ok((d.ageMin ?? 0) <= 8 && (d.ageMax ?? 99) >= 8);
    }
  });

  test('a practice cannot use a drill the user cannot see', async () => {
    const { teamId, clubId, coach, leader } = await buildClub();
    const priv = await coach.post('/api/drills', { clubId, title: 'Privat', visibility: 'private', durationMin: 5, iceArea: 'half' });
    const p = await leader.post(`/api/teams/${teamId}/practices`, { startsAt: new Date().toISOString(), durationMin: 30 });
    const res = await leader.put(`/api/practices/${p.json.id}/items`, { items: [{ drillId: priv.json.id, title: 'x', minutes: 5 }] });
    assert.equal(res.status, 400);
  });
});

describe('admin overview and backup export', () => {
  test('overview reports focus coverage; export contains no password hashes', async () => {
    const { admin, clubId, teamId, coach } = await buildClub();
    await coach.post(`/api/teams/${teamId}/practices`, {
      startsAt: new Date(Date.now() + 864e5).toISOString(),
      durationMin: 60,
      suggest: true,
    });
    const ov = await admin.get(`/api/clubs/${clubId}/overview`);
    assert.equal(ov.status, 200);
    assert.equal(ov.json[0].planned, 1);
    assert.ok(ov.json[0].focusCovered.includes('skridsko'));

    const exp = await admin.get(`/api/clubs/${clubId}/export`);
    assert.equal(exp.status, 200);
    assert.match(String(exp.headers['content-disposition']), /attachment/);
    assert.equal(exp.json.members.length, 3);
    assert.equal(exp.json.practices.length, 1);
    assert.ok(!JSON.stringify(exp.json).includes('scrypt$'));
  });
});
