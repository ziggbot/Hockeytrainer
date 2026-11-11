import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { api, type AgeGroup, type Club, type Invite, type Member, type OverviewRow, type TeamRole } from '../api';
import { Card, CopyLink, ErrorBox, Loading, Tag, TagPicker, useAsyncAction } from '../components/ui';
import { formatDate, linkTo } from '../format';
import { t } from '../i18n/sv';
import { useLoad, useMe } from '../state';

type Tab = 'teams' | 'staff' | 'plan' | 'overview' | 'backup';
const TABS: Tab[] = ['teams', 'staff', 'plan', 'overview', 'backup'];

export function ClubPage() {
  const { clubId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'teams') as Tab;
  const club = useLoad(() => api.get<Club>(`/clubs/${clubId}`), [clubId]);

  if (club.loading && !club.data) return <Loading />;
  if (!club.data) return <ErrorBox error={club.error} />;
  const c = club.data;
  const isAdmin = c.myRole === 'admin';

  return (
    <>
      <h1>{c.name}</h1>
      {isAdmin && (
        <nav className="tabs" role="tablist">
          {TABS.map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? 'tab tab-on' : 'tab'}
              onClick={() => setParams({ tab: key })}
            >
              {t.club.tabs[key]}
            </button>
          ))}
        </nav>
      )}
      {(!isAdmin || tab === 'teams') && <TeamsTab club={c} reload={club.reload} isAdmin={isAdmin} />}
      {isAdmin && tab === 'staff' && <StaffTab club={c} />}
      {isAdmin && tab === 'plan' && <PlanTab club={c} reload={club.reload} />}
      {isAdmin && tab === 'overview' && <OverviewTab clubId={c.id} />}
      {isAdmin && tab === 'backup' && <BackupTab clubId={c.id} />}
    </>
  );
}

function TeamsTab({ club, reload, isAdmin }: { club: Club; reload: () => Promise<void>; isAdmin: boolean }) {
  const { reload: reloadMe } = useMe();
  const [name, setName] = useState('');
  const [ageGroupId, setAgeGroupId] = useState('');
  const [settings, setSettings] = useState({ name: club.name, region: club.region });
  const create = useAsyncAction();
  const save = useAsyncAction();
  return (
    <>
      <Card title={t.club.tabs.teams}>
        {!club.teams.length && <p className="muted">{t.club.noTeams}</p>}
        <ul className="list">
          {club.teams.map((team) => (
            <li key={team.id} className="list-item">
              <Link to={`/teams/${team.id}`}>
                <strong>{team.name}</strong>
              </Link>
              <span>
                {team.ageGroupName && <Tag>{team.ageGroupName}</Tag>} <Tag>{t.club.staffCount(team.staffCount)}</Tag>
                {team.myRole && <Tag tone="role">{t.roles[team.myRole]}</Tag>}
              </span>
            </li>
          ))}
        </ul>
        {isAdmin && (
          <form
            className="form inline-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await create.run(() =>
                api.post(`/clubs/${club.id}/teams`, { name, ageGroupId: ageGroupId || null }),
              );
              if (ok) {
                setName('');
                await reload();
              }
            }}
          >
            <h3>{t.club.newTeam}</h3>
            <label>
              {t.club.teamName}
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="U10 Blå" />
            </label>
            <label>
              {t.club.ageGroup}
              <select value={ageGroupId} onChange={(e) => setAgeGroupId(e.target.value)}>
                <option value="">{t.club.noAgeGroup}</option>
                {club.ageGroups.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name}
                  </option>
                ))}
              </select>
            </label>
            <ErrorBox error={create.error} />
            <button className="primary" disabled={create.busy}>
              {t.common.create}
            </button>
          </form>
        )}
      </Card>
      {isAdmin && (
        <Card title={t.club.settings}>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await save.run(() => api.patch(`/clubs/${club.id}`, settings))) {
                await Promise.all([reload(), reloadMe()]);
              }
            }}
          >
            <label>
              {t.auth.clubName}
              <input required value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
            </label>
            <label>
              {t.auth.region}
              <input value={settings.region} onChange={(e) => setSettings({ ...settings, region: e.target.value })} />
            </label>
            <ErrorBox error={save.error} />
            <button disabled={save.busy}>{t.common.save}</button>
          </form>
        </Card>
      )}
    </>
  );
}

function StaffTab({ club }: { club: Club }) {
  const { me } = useMe();
  const members = useLoad(() => api.get<Member[]>(`/clubs/${club.id}/members`), [club.id]);
  const invites = useLoad(() => api.get<Invite[]>(`/clubs/${club.id}/invites`), [club.id]);
  const [invite, setInvite] = useState<{ role: 'admin' | TeamRole; teamId: string; note: string }>({
    role: 'leader',
    teamId: club.teams[0]?.id ?? '',
    note: '',
  });
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<{ userId: string; url: string; hours: number } | null>(null);
  const [addTo, setAddTo] = useState<{ userId: string; teamId: string; role: TeamRole } | null>(null);
  const action = useAsyncAction();

  const refresh = async () => {
    await Promise.all([members.reload(), invites.reload()]);
  };

  return (
    <>
      <Card title={t.club.inviteTitle}>
        <p className="muted">{t.club.staffIntro}</p>
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            setCreatedLink(null);
            const res = await action.run(() =>
              api.post<{ token: string }>(`/clubs/${club.id}/invites`, {
                role: invite.role,
                teamId: invite.role === 'admin' ? null : invite.teamId,
                note: invite.note,
              }),
            );
            if (res) {
              setCreatedLink(linkTo(`/invite/${res.token}`));
              setInvite({ ...invite, note: '' });
              await invites.reload();
            }
          }}
        >
          <label>
            {t.club.inviteRole}
            <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as typeof invite.role })}>
              <option value="leader">{t.roles.leader}</option>
              <option value="coach">{t.roles.coach}</option>
              <option value="admin">{t.roles.admin}</option>
            </select>
          </label>
          {invite.role !== 'admin' && (
            <label>
              {t.club.inviteTeam}
              <select required value={invite.teamId} onChange={(e) => setInvite({ ...invite, teamId: e.target.value })}>
                {club.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {t.club.inviteNote} {t.common.optional}
            <input value={invite.note} onChange={(e) => setInvite({ ...invite, note: e.target.value })} />
          </label>
          <button className="primary" disabled={action.busy || (invite.role !== 'admin' && !invite.teamId)}>
            {t.club.createInvite}
          </button>
        </form>
        {createdLink && <CopyLink url={createdLink} hint={t.club.inviteCreated} />}
      </Card>

      <Card title={t.club.openInvites}>
        {invites.data && !invites.data.length && <p className="muted">{t.club.noOpenInvites}</p>}
        <ul className="list">
          {invites.data?.map((inv) => (
            <li key={inv.id} className="list-item">
              <div>
                <Tag tone="role">{t.roles[inv.role]}</Tag> {inv.teamName ?? club.name}
                {inv.note && <span className="muted"> · {inv.note}</span>}
                <div className="muted small">
                  {t.club.expires} {formatDate(inv.expiresAt)}
                </div>
              </div>
              <button
                className="danger-outline"
                onClick={() => action.run(async () => {
                  await api.del(`/invites/${inv.id}`);
                  await invites.reload();
                })}
              >
                {t.club.revoke}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t.club.members}>
        <ErrorBox error={action.error ?? members.error} />
        {members.loading && !members.data && <Loading />}
        <ul className="list">
          {members.data?.map((m) => (
            <li key={m.id} className="member">
              <div className="member-head">
                <div>
                  <strong>{m.name}</strong> {m.clubRole === 'admin' && <Tag tone="role">{t.roles.admin}</Tag>}
                  <div className="muted small">{m.email}</div>
                  <div className="small">
                    {m.teams.length
                      ? m.teams.map((tm) => (
                          <span key={tm.teamId} className="nowrap">
                            {tm.teamName}: {t.roles[tm.role]}
                            {'  '}
                          </span>
                        ))
                      : t.club.noTeamsForMember}
                  </div>
                </div>
              </div>
              <div className="row wrap">
                <button
                  onClick={() =>
                    action.run(async () => {
                      await api.patch(`/clubs/${club.id}/members/${m.id}`, { role: m.clubRole === 'admin' ? 'member' : 'admin' });
                      await refresh();
                    })
                  }
                >
                  {m.clubRole === 'admin' ? t.club.removeAdmin : t.club.makeAdmin}
                </button>
                <button onClick={() => setAddTo({ userId: m.id, teamId: club.teams[0]?.id ?? '', role: 'coach' })}>
                  {t.club.addToTeam}
                </button>
                {m.id !== me?.user.id && (
                  <button
                    onClick={() =>
                      action.run(async () => {
                        const res = await api.post<{ token: string; expiresInHours: number }>(
                          `/clubs/${club.id}/members/${m.id}/reset-link`,
                        );
                        setResetLink({ userId: m.id, url: linkTo(`/reset/${res.token}`), hours: res.expiresInHours });
                      })
                    }
                  >
                    {t.club.resetLink}
                  </button>
                )}
                <button
                  className="danger-outline"
                  onClick={() => {
                    if (!window.confirm(t.common.confirmDelete)) return;
                    void action.run(async () => {
                      await api.del(`/clubs/${club.id}/members/${m.id}`);
                      await refresh();
                    });
                  }}
                >
                  {t.club.removeFromClub}
                </button>
              </div>
              {resetLink?.userId === m.id && <CopyLink url={resetLink.url} hint={t.club.resetCreated(resetLink.hours)} />}
              {addTo?.userId === m.id && (
                <form
                  className="row wrap"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await action.run(() =>
                      api.post(`/teams/${addTo.teamId}/members`, { userId: m.id, role: addTo.role }),
                    );
                    if (ok) {
                      setAddTo(null);
                      await refresh();
                    }
                  }}
                >
                  <select value={addTo.teamId} onChange={(e) => setAddTo({ ...addTo, teamId: e.target.value })}>
                    {club.teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <select value={addTo.role} onChange={(e) => setAddTo({ ...addTo, role: e.target.value as TeamRole })}>
                    <option value="coach">{t.roles.coach}</option>
                    <option value="leader">{t.roles.leader}</option>
                  </select>
                  <button className="primary" disabled={!addTo.teamId}>
                    {t.common.add}
                  </button>
                  <button type="button" onClick={() => setAddTo(null)}>
                    {t.common.cancel}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function PlanTab({ club, reload }: { club: Club; reload: () => Promise<void> }) {
  const year = new Date().getFullYear();
  const [draft, setDraft] = useState({ name: '', birthYearFrom: year - 10, birthYearTo: year - 9 });
  const action = useAsyncAction();
  return (
    <>
      <ErrorBox error={action.error} />
      {club.ageGroups.map((ag) => (
        <AgeGroupCard key={ag.id} ag={ag} reload={reload} />
      ))}
      <Card title={t.club.newAgeGroup}>
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await action.run(() => api.post(`/clubs/${club.id}/age-groups`, draft));
            if (ok) {
              setDraft({ ...draft, name: '' });
              await reload();
            }
          }}
        >
          <label>
            {t.club.ageGroupName}
            <input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <div className="row">
            <label>
              {t.club.birthFrom}
              <input
                type="number"
                value={draft.birthYearFrom}
                onChange={(e) => setDraft({ ...draft, birthYearFrom: Number(e.target.value) })}
              />
            </label>
            <label>
              {t.club.birthTo}
              <input
                type="number"
                value={draft.birthYearTo}
                onChange={(e) => setDraft({ ...draft, birthYearTo: Number(e.target.value) })}
              />
            </label>
          </div>
          <button className="primary" disabled={action.busy}>
            {t.common.create}
          </button>
        </form>
      </Card>
    </>
  );
}

function AgeGroupCard({ ag, reload }: { ag: AgeGroup; reload: () => Promise<void> }) {
  const [edit, setEdit] = useState({
    name: ag.name,
    birthYearFrom: ag.birthYearFrom,
    birthYearTo: ag.birthYearTo,
    targetSkills: ag.targetSkills,
    philosophy: ag.philosophy,
  });
  const today = new Date().toISOString().slice(0, 10);
  const [block, setBlock] = useState({ name: '', startDate: today, endDate: today, focusTags: [] as string[] });
  const action = useAsyncAction();
  return (
    <Card
      title={`${ag.name}${ag.birthYearFrom ? ` (${ag.birthYearFrom}–${ag.birthYearTo ?? ''})` : ''}`}
      actions={
        <button
          className="danger-outline"
          onClick={() => {
            if (window.confirm(t.common.confirmDelete)) void action.run(async () => {
              await api.del(`/age-groups/${ag.id}`);
              await reload();
            });
          }}
        >
          {t.common.delete}
        </button>
      }
    >
      <ErrorBox error={action.error} />
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await action.run(() => api.patch(`/age-groups/${ag.id}`, edit))) await reload();
        }}
      >
        <label>
          {t.club.ageGroupName}
          <input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
        </label>
        <div className="row">
          <label>
            {t.club.birthFrom}
            <input
              type="number"
              value={edit.birthYearFrom ?? ''}
              onChange={(e) => setEdit({ ...edit, birthYearFrom: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
          <label>
            {t.club.birthTo}
            <input
              type="number"
              value={edit.birthYearTo ?? ''}
              onChange={(e) => setEdit({ ...edit, birthYearTo: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
        </div>
        <div className="field">
          <span>{t.club.targetSkills}</span>
          <TagPicker value={edit.targetSkills} onChange={(v) => setEdit({ ...edit, targetSkills: v })} />
        </div>
        <label>
          {t.club.philosophy}
          <textarea rows={3} value={edit.philosophy} onChange={(e) => setEdit({ ...edit, philosophy: e.target.value })} />
        </label>
        <button disabled={action.busy}>{t.common.save}</button>
      </form>

      <h3>{t.club.blocks}</h3>
      {!ag.blocks.length && <p className="muted">{t.club.noBlocks}</p>}
      <ul className="list">
        {ag.blocks.map((b) => (
          <li key={b.id} className="list-item">
            <div>
              <strong>{b.name}</strong> <span className="muted">{b.startDate} – {b.endDate}</span>
              <div>
                {b.focusTags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            </div>
            <button
              className="danger-outline"
              onClick={() => action.run(async () => {
                await api.del(`/blocks/${b.id}`);
                await reload();
              })}
            >
              {t.common.delete}
            </button>
          </li>
        ))}
      </ul>
      <form
        className="form inline-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await action.run(() => api.post(`/age-groups/${ag.id}/blocks`, block));
          if (ok) {
            setBlock({ ...block, name: '', focusTags: [] });
            await reload();
          }
        }}
      >
        <h4>{t.club.newBlock}</h4>
        <label>
          {t.club.blockName}
          <input required value={block.name} onChange={(e) => setBlock({ ...block, name: e.target.value })} placeholder="Block 1: Skridsko" />
        </label>
        <div className="row">
          <label>
            {t.club.start}
            <input type="date" required value={block.startDate} onChange={(e) => setBlock({ ...block, startDate: e.target.value })} />
          </label>
          <label>
            {t.club.end}
            <input type="date" required value={block.endDate} onChange={(e) => setBlock({ ...block, endDate: e.target.value })} />
          </label>
        </div>
        <div className="field">
          <span>{t.club.focusTags}</span>
          <TagPicker value={block.focusTags} onChange={(v) => setBlock({ ...block, focusTags: v })} />
        </div>
        <button className="primary" disabled={action.busy}>
          {t.common.add}
        </button>
      </form>
    </Card>
  );
}

function OverviewTab({ clubId }: { clubId: string }) {
  const rows = useLoad(() => api.get<OverviewRow[]>(`/clubs/${clubId}/overview`), [clubId]);
  return (
    <Card title={t.club.tabs.overview}>
      <p className="muted">{t.club.overviewIntro}</p>
      <ErrorBox error={rows.error} />
      <ul className="list">
        {rows.data?.map((r) => (
          <li key={r.teamId} className="list-item">
            <div>
              <Link to={`/teams/${r.teamId}`}>
                <strong>{r.teamName}</strong>
              </Link>
              <div className="small muted">
                {t.club.colBlock}: {r.blockName ?? t.common.none}
              </div>
              <div className="small">
                {t.club.colPlanned}: <strong>{r.planned}</strong> · {t.club.colDone}: <strong>{r.done}</strong>
              </div>
              {!!r.focusTags.length && (
                <div className="small">
                  {t.club.colFocus}:{' '}
                  {r.focusTags.map((tag) => (
                    <Tag key={tag} tone={r.focusCovered.includes(tag) ? 'ok' : 'warn'}>
                      {tag}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function BackupTab({ clubId }: { clubId: string }) {
  return (
    <Card title={t.club.tabs.backup}>
      <p>{t.club.backupIntro}</p>
      <p>
        <a className="button primary" href={`/api/clubs/${clubId}/export`} download>
          {t.club.download}
        </a>
      </p>
      <p className="muted">{t.club.backupNote}</p>
    </Card>
  );
}
