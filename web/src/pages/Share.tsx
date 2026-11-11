import { Link, useParams } from 'react-router';
import { api, ApiError, type PracticeDetail } from '../api';
import { ErrorBox, Loading } from '../components/ui';
import { t } from '../i18n/sv';
import { cachePractice, getCachedPractice } from '../offline';
import { useLoad } from '../state';
import { PracticeReadOnly } from './Practice';

export function SharePage() {
  const { token = '' } = useParams();
  const key = `share.${token}`;
  const loaded = useLoad(async () => {
    try {
      const p = await api.get<PracticeDetail>(`/share/${encodeURIComponent(token)}`);
      cachePractice(p, key);
      return p;
    } catch (err) {
      const cached = err instanceof ApiError && err.offline ? getCachedPractice(key) : null;
      if (cached) return cached;
      throw err;
    }
  }, [token]);
  if (loaded.loading && !loaded.data) return <Loading />;
  if (!loaded.data) return <ErrorBox error={loaded.error} />;
  return (
    <>
      <p className="muted">{t.practice.sharedView}</p>
      <p>
        <Link className="button primary big" to={`/s/${token}/rink`}>
          {t.practice.rink}
        </Link>
      </p>
      <PracticeReadOnly practice={loaded.data} />
    </>
  );
}
