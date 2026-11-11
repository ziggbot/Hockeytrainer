import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, ApiError, type PracticeDetail } from '../api';
import { Card, ErrorBox, Tag, useAsyncAction } from '../components/ui';
import { formatDateTime } from '../format';
import { t } from '../i18n/sv';
import { cacheUpcoming, getCachedUpcoming } from '../offline';
import { useLoad, useMe } from '../state';

export function HomePage() {
  const { me, clubId } = useMe();
  const upcoming = useLoad(async () => {
    try {
      const list = await api.get<PracticeDetail[]>('/upcoming');
      cacheUpcoming(list); // keeps rink mode usable without network
      return { list, cached: false };
    } catch (err) {
      if (err instanceof ApiError && err.offline) return { list: getCachedUpcoming(), cached: true };
      throw err;
    }
  }, []);

  if (!me) return null;
  const club = me.clubs.find((c) => c.id === clubId);
  const teams = me.teams.filter((tm) => tm.clubId === clubId);

  if (!me.clubs.length) return <NoClub allowCreate={me.allowClubSignup} />;

  return (
    <>
      <h1>{club?.name}</h1>
      {club?.role === 'admin' && (
        <p>
          <Link className="button" to={`/club/${club.id}`}>
            {t.home.adminLink}
          </Link>
        </p>
      )}
      <Card title={t.home.upcoming}>
        <ErrorBox error={upcoming.error} />
        {upcoming.data?.cached && <p className="muted">{t.home.offlineCopy}</p>}
        {upcoming.data && !upcoming.data.list.length && <p className="muted">{t.home.noUpcoming}</p>}
        <ul className="list">
          {upcoming.data?.list.map((p) => (
            <li key={p.id} className="list-item">
              <div>
                <strong>{formatDateTime(p.startsAt)}</strong> · {p.teamName}
                <div className="muted">
                  {p.title || p.block?.name || ''} {p.totalMinutes}/{p.durationMin} {t.common.minutes}
                </div>
              </div>
              <div className="row">
                <Link className="button" to={`/practices/${p.id}`}>
                  {t.home.open}
                </Link>
                <Link className="button primary" to={`/practices/${p.id}/rink`}>
                  {t.home.rink}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card title={t.home.myTeams}>
        {!teams.length && <p className="muted">{t.home.noTeams}</p>}
        <ul className="list">
          {teams.map((tm) => (
            <li key={tm.id} className="list-item">
              <Link to={`/teams/${tm.id}`}>
                <strong>{tm.name}</strong>
              </Link>
              <span>
                {tm.ageGroupName && <Tag>{tm.ageGroupName}</Tag>} <Tag tone="role">{t.roles[tm.role]}</Tag>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function NoClub({ allowCreate }: { allowCreate: boolean }) {
  const { reload, setClubId } = useMe();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const { busy, error, run } = useAsyncAction();
  return (
    <Card title={t.home.noClub}>
      <p>{t.home.noTeams}</p>
      {allowCreate && (
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await run(() => api.post<{ id: string }>('/clubs', { name }));
            if (res) {
              setClubId(res.id);
              await reload();
              navigate(`/club/${res.id}`);
            }
          }}
        >
          <label>
            {t.auth.clubName}
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <ErrorBox error={error} />
          <button className="primary" disabled={busy}>
            {t.home.createClub}
          </button>
        </form>
      )}
    </Card>
  );
}
