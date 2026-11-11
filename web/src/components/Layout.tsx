import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { t } from '../i18n/sv';
import { queuedNoteCount } from '../offline';
import { useMe } from '../state';

export function Layout({ children }: { children: ReactNode }) {
  const { me, clubId, setClubId, offline, logout } = useMe();
  const navigate = useNavigate();
  const club = me?.clubs.find((c) => c.id === clubId);
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          🏒 {t.appName}
        </Link>
        {me && me.clubs.length > 1 && (
          <select
            className="club-switch"
            aria-label={t.nav.switchClub}
            value={clubId ?? ''}
            onChange={(e) => setClubId(e.target.value)}
          >
            {me.clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {me && me.clubs.length === 1 && <span className="club-name">{club?.name}</span>}
      </header>
      {offline && <div className="offline-banner">{t.errors.offline}</div>}
      <main className="content">{children}</main>
      {me && (
        <nav className="bottomnav">
          <NavLink to="/" end>
            {t.nav.home}
          </NavLink>
          <NavLink to="/drills">{t.nav.drills}</NavLink>
          {clubId && <NavLink to={`/club/${clubId}`}>{t.nav.club}</NavLink>}
          <NavLink to="/account">{t.nav.account}</NavLink>
          <button
            type="button"
            className="linklike"
            onClick={async () => {
              const queued = queuedNoteCount();
              if (queued > 0 && !window.confirm(t.nav.logoutQueued(queued))) return;
              await logout();
              navigate('/login');
            }}
          >
            {t.nav.logout}
          </button>
        </nav>
      )}
    </div>
  );
}
