import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, type PracticeSummary, type TeamDetail, type TeamRole } from '../api';
import { Card, CopyLink, ErrorBox, Loading, Tag, useAsyncAction } from '../components/ui';
import { defaultPracticeStart, formatDate, formatDateTime, fromLocalInput, linkTo } from '../format';
import { t } from '../i18n/sv';
import { useLoad, useMe } from '../state';

export function TeamPage() {
  const { teamId = '' } = useParams();
  const team = useLoad(() => api.get<TeamDetail>(`/teams/${teamId}`), [teamId]);
  const practices = useLoad(() => api.get<PracticeSummary[]>(`/teams/${teamId}/practices`), [teamId]);

  if (team.loading && !team.data) return <Loading />;
  if (!team.data) return <ErrorBox error={team.error} />;
  const tm = team.data;
  const now = Date.now();
  const upcoming = (practices.data ?? []).filter((p) => new Date(p.startsAt).getTime() >= now - 3 * 3600e3).reverse();
  const past = (practices.data ?? []).filter((p) => new Date(p.startsAt).getTime() < now - 3 * 3600e3);

  return (
    <>
      <p className="muted">
        <Link to={`/club/${tm.clubId}`}>{tm.clubName}</Link>
      </p>
      <h1>
        {tm.name} {tm.ageGroupName && <Tag>{tm.ageGroupName}</Tag>}
      </h1>

      <Card title={t.team.currentBlock}>
        {tm.blockName ? (
          <>
            <p>
              <strong>{tm.blockName}</strong>{' '}
              <span className="muted">
                {tm.blockStart} – {tm.blockEnd}
              </span>
            </p>
            <p>
              {tm.blockFocusTags?.map((tag) => (
                <Tag key={tag} tone="ok">
                  {tag}
                </Tag>
              ))}
            </p>
          </>
        ) : (
          <p className="muted">{t.team.noBlock}</p>
        )}
        {!!tm.targetSkills?.length && (
          <p className="small">
            {t.team.targetSkills}: {tm.targetSkills.join(', ')}
          </p>
        )}
        {tm.philosophy && <p className="small muted">{tm.philosophy}</p>}
      </Card>

      {tm.access.canPlan ? <PlanPracticeForm teamId={tm.id} /> : <p className="muted">{t.team.readOnly}</p>}

      <Card title={t.team.upcoming}>
        <PracticeList list={upcoming} />
      </Card>
      <Card title={t.team.past}>
        <PracticeList list={past} />
      </Card>

      <StaffCard team={tm} reload={team.reload} />
    </>
  );
}

function PracticeList({ list }: { list: PracticeSummary[] }) {
  if (!list.length) return <p className="muted">{t.team.noPractices}</p>;
  return (
    <ul className="list">
      {list.map((p) => (
        <li key={p.id} className="list-item">
          <Link to={`/practices/${p.id}`}>
            <strong>{formatDateTime(p.startsAt)}</strong> {p.title && `· ${p.title}`}
          </Link>
          <span>
            <Tag tone={p.totalMinutes > p.durationMin ? 'warn' : undefined}>
              {p.totalMinutes}/{p.durationMin} {t.common.minutes}
            </Tag>
            <Tag tone={p.status === 'done' ? 'ok' : undefined}>{t.status[p.status]}</Tag>
            {p.noteCount > 0 && <Tag>{t.team.notes(p.noteCount)}</Tag>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PlanPracticeForm({ teamId }: { teamId: string }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ startsAt: defaultPracticeStart(), durationMin: 60, title: '', suggest: true });
  const { busy, error, run } = useAsyncAction();
  return (
    <Card title={t.team.plan}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await run(() =>
            api.post<{ id: string }>(`/teams/${teamId}/practices`, {
              startsAt: fromLocalInput(form.startsAt),
              durationMin: form.durationMin,
              title: form.title,
              suggest: form.suggest,
            }),
          );
          if (res) navigate(`/practices/${res.id}`);
        }}
      >
        <div className="row">
          <label>
            {t.team.startsAt}
            <input
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
          </label>
          <label>
            {t.team.duration}
            <input
              type="number"
              min={10}
              max={240}
              step={5}
              required
              value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
            />
          </label>
        </div>
        <label>
          {t.team.title} {t.common.optional}
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="check">
          <input type="checkbox" checked={form.suggest} onChange={(e) => setForm({ ...form, suggest: e.target.checked })} />
          {t.team.suggest}
        </label>
        <ErrorBox error={error} />
        <button className="primary" disabled={busy}>
          {t.team.create}
        </button>
      </form>
    </Card>
  );
}

function StaffCard({ team, reload }: { team: TeamDetail; reload: () => Promise<void> }) {
  const { me, reload: reloadMe } = useMe();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<{ role: TeamRole; note: string }>({ role: 'coach', note: '' });
  const [link, setLink] = useState<string | null>(null);
  const action = useAsyncAction();
  const canManage = team.access.canManage;

  return (
    <Card title={t.team.staff}>
      <ErrorBox error={action.error} />
      <ul className="list">
        {team.members.map((m) => (
          <li key={m.id} className="list-item">
            <div>
              <strong>{m.name}</strong> <Tag tone="role">{t.roles[m.role]}</Tag>
              {m.email && <div className="muted small">{m.email}</div>}
            </div>
            <div className="row wrap">
              {canManage && (
                <select
                  aria-label={t.club.inviteRole}
                  value={m.role}
                  onChange={(e) =>
                    action.run(async () => {
                      await api.patch(`/teams/${team.id}/members/${m.id}`, { role: e.target.value });
                      await reload();
                    })
                  }
                >
                  <option value="leader">{t.roles.leader}</option>
                  <option value="coach">{t.roles.coach}</option>
                </select>
              )}
              {(canManage || m.id === me?.user.id) && (
                <button
                  className="danger-outline"
                  onClick={() => {
                    if (!window.confirm(t.common.confirmDelete)) return;
                    void action.run(async () => {
                      await api.del(`/teams/${team.id}/members/${m.id}`);
                      if (m.id === me?.user.id) {
                        await reloadMe();
                        navigate('/');
                      } else {
                        await reload();
                      }
                    });
                  }}
                >
                  {m.id === me?.user.id ? t.team.leave : t.common.delete}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canManage && (
        <>
          <h3>{t.team.invite}</h3>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              setLink(null);
              const res = await action.run(() => api.post<{ token: string }>(`/teams/${team.id}/invites`, invite));
              if (res) {
                setLink(linkTo(`/invite/${res.token}`));
                setInvite({ ...invite, note: '' });
                await reload();
              }
            }}
          >
            <div className="row">
              <label>
                {t.club.inviteRole}
                <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as TeamRole })}>
                  <option value="coach">{t.roles.coach}</option>
                  <option value="leader">{t.roles.leader}</option>
                </select>
              </label>
              <label>
                {t.club.inviteNote}
                <input value={invite.note} onChange={(e) => setInvite({ ...invite, note: e.target.value })} />
              </label>
            </div>
            <button className="primary" disabled={action.busy}>
              {t.club.createInvite}
            </button>
          </form>
          {link && <CopyLink url={link} hint={t.club.inviteCreated} />}
          {!!team.invites.length && (
            <>
              <h4>{t.club.openInvites}</h4>
              <ul className="list">
                {team.invites.map((inv) => (
                  <li key={inv.id} className="list-item">
                    <span>
                      <Tag tone="role">{t.roles[inv.role]}</Tag> {inv.note}{' '}
                      <span className="muted small">
                        {t.club.expires} {formatDate(inv.expiresAt)}
                      </span>
                    </span>
                    <button
                      className="danger-outline"
                      onClick={() => action.run(async () => {
                        await api.del(`/invites/${inv.id}`);
                        await reload();
                      })}
                    >
                      {t.club.revoke}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Card>
  );
}
