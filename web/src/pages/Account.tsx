import { useState } from 'react';
import { api } from '../api';
import { Card, ErrorBox, useAsyncAction } from '../components/ui';
import { t } from '../i18n/sv';
import { useMe } from '../state';

export function AccountPage() {
  const { me, reload } = useMe();
  const [name, setName] = useState(me?.user.name ?? '');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwDone, setPwDone] = useState(false);
  const nameAction = useAsyncAction();
  const pwAction = useAsyncAction();
  if (!me) return null;
  return (
    <>
      <h1>{t.account.title}</h1>
      <Card>
        <p className="muted">{me.user.email}</p>
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await nameAction.run(() => api.patch('/me', { name }))) await reload();
          }}
        >
          <label>
            {t.account.name}
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <ErrorBox error={nameAction.error} />
          <button disabled={nameAction.busy}>{t.common.save}</button>
        </form>
      </Card>
      <Card title={t.account.changePassword}>
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            setPwDone(false);
            if (await pwAction.run(() => api.post('/me/password', pw))) {
              setPw({ currentPassword: '', newPassword: '' });
              setPwDone(true);
            }
          }}
        >
          <label>
            {t.account.currentPassword}
            <input
              type="password"
              autoComplete="current-password"
              required
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
            />
          </label>
          <label>
            {t.account.newPassword}
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
            />
          </label>
          <ErrorBox error={pwAction.error} />
          {pwDone && <p className="ok">{t.account.passwordChanged}</p>}
          <button disabled={pwAction.busy}>{t.account.changePassword}</button>
        </form>
      </Card>
    </>
  );
}
