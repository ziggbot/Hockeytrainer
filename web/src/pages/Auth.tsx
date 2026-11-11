import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { api } from '../api';
import { Card, ErrorBox, Loading, useAsyncAction } from '../components/ui';
import { t } from '../i18n/sv';
import { useLoad, useMe } from '../state';

function safeNext(next: string | null): string {
  // Only allow in-app paths to avoid open redirects.
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export function LoginPage() {
  const { me, reload } = useMe();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, run } = useAsyncAction();
  const next = safeNext(params.get('next'));

  if (me) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run(() => api.post('/auth/login', { email, password }));
    if (ok) {
      await reload();
      navigate(next, { replace: true });
    }
  };

  return (
    <div className="narrow">
      <Card title={t.auth.loginTitle}>
        <form onSubmit={submit} className="form">
          <label>
            {t.auth.email}
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            {t.auth.password}
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <ErrorBox error={error} />
          <button className="primary" disabled={busy}>
            {t.auth.login}
          </button>
        </form>
        <p className="muted">{t.auth.forgot}</p>
        <p>
          {t.auth.noAccount} <Link to="/register">{t.auth.createAccount}</Link>
        </p>
      </Card>
    </div>
  );
}

type Registered = { clubId: string; teamId: string | null };

function RegisterForm({ inviteToken, onDone }: { inviteToken?: string; onDone: (r: Registered) => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', clubName: '', region: '' });
  const { busy, error, run } = useAsyncAction();
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = inviteToken
      ? { name: form.name, email: form.email, password: form.password, inviteToken }
      : form;
    const res = await run(() => api.post<Registered>('/auth/register', body));
    if (res) onDone(res);
  };

  return (
    <form onSubmit={submit} className="form">
      <label>
        {t.auth.name}
        <input autoComplete="name" required value={form.name} onChange={set('name')} />
      </label>
      <label>
        {t.auth.email}
        <input type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
      </label>
      <label>
        {t.auth.password}
        <input type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} />
        <small className="muted">{t.auth.passwordHint}</small>
      </label>
      {!inviteToken && (
        <>
          <label>
            {t.auth.clubName}
            <input required value={form.clubName} onChange={set('clubName')} />
          </label>
          <label>
            {t.auth.region} {t.common.optional}
            <input value={form.region} onChange={set('region')} />
          </label>
          <p className="muted">{t.auth.registerHint}</p>
        </>
      )}
      <ErrorBox error={error} />
      <button className="primary" disabled={busy}>
        {inviteToken ? t.auth.acceptNew : t.auth.createAccount}
      </button>
    </form>
  );
}

export function RegisterPage() {
  const { me, reload, setClubId } = useMe();
  // Where to go once the new session is loaded (a new admin starts on the club page).
  const [target, setTarget] = useState<string | null>(null);
  if (me) return <Navigate to={target ?? '/'} replace />;
  return (
    <div className="narrow">
      <Card title={t.auth.registerTitle}>
        <RegisterForm
          onDone={async (r) => {
            setClubId(r.clubId);
            setTarget(`/club/${r.clubId}`);
            await reload();
          }}
        />
        <p>
          {t.auth.haveAccount} <Link to="/login">{t.auth.login}</Link>
        </p>
      </Card>
    </div>
  );
}

interface InviteInfo {
  valid: boolean;
  role?: 'admin' | 'leader' | 'coach';
  clubName?: string;
  teamName?: string | null;
}

export function InvitePage() {
  const { token = '' } = useParams();
  const { me, reload, setClubId } = useMe();
  const navigate = useNavigate();
  const info = useLoad(() => api.get<InviteInfo>(`/invites/${encodeURIComponent(token)}`), [token]);
  const { busy, error, run } = useAsyncAction();

  const finish = async (clubId?: string, teamId?: string | null) => {
    await reload();
    if (clubId) setClubId(clubId);
    navigate(teamId ? `/teams/${teamId}` : '/', { replace: true });
  };

  if (info.loading) return <Loading />;
  const inv = info.data;
  if (!inv?.valid) {
    return (
      <div className="narrow">
        <Card title={t.auth.inviteTitle}>
          <p>{t.auth.inviteInvalid}</p>
        </Card>
      </div>
    );
  }
  const place = inv.teamName ? `${inv.teamName}, ${inv.clubName}` : inv.clubName!;
  return (
    <div className="narrow">
      <Card title={t.auth.inviteTitle}>
        <p className="lead">{t.auth.inviteTo(t.roles[inv.role!].toLowerCase(), place)}</p>
        {me ? (
          <>
            <ErrorBox error={error} />
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                const res = await run(() =>
                  api.post<{ clubId: string; teamId: string | null }>(`/invites/${encodeURIComponent(token)}/accept`),
                );
                if (res) await finish(res.clubId, res.teamId);
              }}
            >
              {t.auth.acceptAsMe(me.user.name)}
            </button>
          </>
        ) : (
          <>
            <RegisterForm inviteToken={token} onDone={(r) => finish(r.clubId, r.teamId)} />
            <p className="muted">
              <Link to={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>{t.auth.acceptExisting}</Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

export function ResetPage() {
  const { token = '' } = useParams();
  const { reload } = useMe();
  const navigate = useNavigate();
  const info = useLoad(() => api.get<{ valid: boolean; name?: string }>(`/resets/${encodeURIComponent(token)}`), [token]);
  const [password, setPassword] = useState('');
  const { busy, error, run } = useAsyncAction();

  if (info.loading) return <Loading />;
  return (
    <div className="narrow">
      <Card title={t.auth.resetTitle}>
        {!info.data?.valid ? (
          <p>{t.auth.resetInvalid}</p>
        ) : (
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await run(() => api.post(`/resets/${encodeURIComponent(token)}`, { password }));
              if (ok) {
                await reload();
                navigate('/', { replace: true });
              }
            }}
          >
            <p>{t.auth.resetFor(info.data.name ?? '')}</p>
            <label>
              {t.auth.newPassword}
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <ErrorBox error={error} />
            <button className="primary" disabled={busy}>
              {t.auth.setPassword}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
