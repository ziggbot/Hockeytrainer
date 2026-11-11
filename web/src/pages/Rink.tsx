import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, ApiError, type PracticeDetail } from '../api';
import { ErrorBox, Loading } from '../components/ui';
import { formatDateTime, formatTime, mmss } from '../format';
import { t } from '../i18n/sv';
import { cachePractice, getCachedPractice, readChecklist, writeChecklist } from '../offline';
import { useLoad } from '../state';

type View = 'order' | 'stations' | 'gear';

async function loadWithFallback(fetcher: () => Promise<PracticeDetail>, cacheKey: string) {
  try {
    const practice = await fetcher();
    cachePractice(practice, cacheKey);
    return { practice, offline: false };
  } catch (err) {
    const cached = err instanceof ApiError && err.offline ? getCachedPractice(cacheKey) : null;
    if (cached) return { practice: cached, offline: true };
    if (err instanceof ApiError && err.offline) throw new Error(t.rink.notAvailable);
    throw err;
  }
}

export function RinkPage() {
  const { practiceId = '' } = useParams();
  const loaded = useLoad(() => loadWithFallback(() => api.get(`/practices/${practiceId}`), practiceId), [practiceId]);
  if (loaded.loading && !loaded.data) return <div className="rink"><Loading /></div>;
  if (!loaded.data) return <div className="rink"><ErrorBox error={loaded.error} /></div>;
  return <RinkMode practice={loaded.data.practice} storageKey={practiceId} offline={loaded.data.offline} exitTo={`/practices/${practiceId}`} />;
}

export function ShareRinkPage() {
  const { token = '' } = useParams();
  const key = `share.${token}`;
  const loaded = useLoad(() => loadWithFallback(() => api.get(`/share/${encodeURIComponent(token)}`), key), [token]);
  if (loaded.loading && !loaded.data) return <div className="rink"><Loading /></div>;
  if (!loaded.data) return <div className="rink"><ErrorBox error={loaded.error} /></div>;
  return <RinkMode practice={loaded.data.practice} storageKey={key} offline={loaded.data.offline} exitTo={`/s/${token}`} />;
}

function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null;
      } catch {
        // Not supported or denied (e.g. low battery): the timer still works.
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}

interface RinkState {
  index: number;
  remaining: number; // seconds left on the current item
}

function RinkMode({ practice, storageKey, offline, exitTo }: { practice: PracticeDetail; storageKey: string; offline: boolean; exitTo: string }) {
  const navigate = useNavigate();
  const items = practice.items;
  const stateKey = `ht.rink.${storageKey}`;
  const [state, setState] = useState<RinkState>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(stateKey) ?? 'null') as RinkState | null;
      if (saved && saved.index < items.length) return saved;
    } catch {
      // ignore
    }
    return { index: 0, remaining: (items[0]?.minutes ?? 0) * 60 };
  });
  const [running, setRunning] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [view, setView] = useState<View>('order');
  const [checked, setChecked] = useState<Record<string, boolean>>(() => readChecklist(storageKey));
  const endAt = useRef<number | null>(null);
  useWakeLock();

  useEffect(() => {
    try {
      localStorage.setItem(stateKey, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, stateKey]);

  // Timer is computed from a wall-clock deadline so it stays correct if the phone throttles the tab.
  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + state.remaining * 1000;
    const id = window.setInterval(() => {
      const left = Math.max(0, ((endAt.current ?? Date.now()) - Date.now()) / 1000);
      setState((s) => ({ ...s, remaining: left }));
      if (left <= 0) {
        setRunning(false);
        setTimeUp(true);
        navigator.vibrate?.([400, 200, 400]);
      }
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index > items.length) return;
      setRunning(false);
      setTimeUp(false);
      setState({ index, remaining: (items[index]?.minutes ?? 0) * 60 });
    },
    [items],
  );

  const current = items[state.index];
  const finished = state.index >= items.length;

  return (
    <div className={`rink${timeUp ? ' rink-timeup' : ''}`}>
      <header className="rink-top">
        <button className="rink-exit" onClick={() => navigate(exitTo)}>
          ✕ {t.rink.exit}
        </button>
        <span>
          {practice.teamName} · {formatTime(practice.startsAt)}
        </span>
        {offline && <span className="rink-offline">{t.rink.offline}</span>}
      </header>

      {finished || !current ? (
        <section className="rink-main">
          <p className="rink-title">{t.rink.done}</p>
          <button className="rink-btn" onClick={() => goTo(0)}>
            ↺ {t.rink.order}
          </button>
        </section>
      ) : (
        <section className="rink-main">
          <div className="rink-progress">
            {state.index + 1} / {items.length}
            {current.station && <span className="rink-station">{t.rink.stationN(current.station)}</span>}
          </div>
          <h1 className="rink-title">{current.title}</h1>
          <div className={`rink-timer${state.remaining < 60 ? ' rink-timer-low' : ''}`} aria-live="polite">
            {timeUp ? t.rink.timeUp : mmss(state.remaining)}
          </div>
          {!!current.drill?.coachingPoints.length && (
            <ul className="rink-points">
              {current.drill.coachingPoints.map((cp) => (
                <li key={cp}>{cp}</li>
              ))}
            </ul>
          )}
          {current.note && <p className="rink-note">{current.note}</p>}
        </section>
      )}

      <div className="rink-controls">
        <button className="rink-btn" onClick={() => goTo(state.index - 1)} disabled={state.index === 0}>
          ◀ {t.rink.prev}
        </button>
        <button
          className="rink-btn rink-btn-main"
          disabled={finished}
          onClick={() => {
            if (timeUp) {
              goTo(state.index + 1);
              return;
            }
            setRunning(!running);
          }}
        >
          {timeUp ? `${t.rink.next} ▶` : running ? `❚❚ ${t.rink.pause}` : `▶ ${t.rink.start}`}
        </button>
        <button className="rink-btn" onClick={() => goTo(state.index + 1)} disabled={finished}>
          {t.rink.next} ▶
        </button>
      </div>

      <nav className="rink-tabs">
        {(['order', 'stations', 'gear'] as View[]).map((v) => (
          <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
            {v === 'order' ? t.rink.order : v === 'stations' ? t.rink.stations : t.rink.gear}
          </button>
        ))}
      </nav>

      <section className="rink-panel">
        {view === 'order' && (
          <ol className="rink-list">
            {items.map((it, i) => (
              <li key={it.id ?? i} className={i === state.index ? 'current' : i < state.index ? 'past' : ''}>
                <button onClick={() => goTo(i)}>
                  <span>{it.title}</span>
                  <span>
                    {it.minutes} {t.common.minutes}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
        {view === 'stations' && <StationsView practice={practice} />}
        {view === 'gear' && (
          <ul className="rink-gear">
            {practice.equipment.map((e) => (
              <li key={e.item}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!checked[e.item]}
                    onChange={(ev) => {
                      const next = { ...checked, [e.item]: ev.target.checked };
                      setChecked(next);
                      writeChecklist(storageKey, next);
                    }}
                  />
                  <strong>{e.qty}</strong> {e.item}
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>
      <footer className="rink-foot muted">{formatDateTime(practice.startsAt)}</footer>
    </div>
  );
}

/** Groups station drills so each coach can see what runs at their station. */
function StationsView({ practice }: { practice: PracticeDetail }) {
  const groups = new Map<string, PracticeDetail['items']>();
  for (const it of practice.items) {
    const key = it.station ? t.rink.stationN(it.station) : t.rink.whole;
    groups.set(key, [...(groups.get(key) ?? []), it]);
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'sv'));
  return (
    <div className="rink-stations">
      {sorted.map(([name, list]) => (
        <div key={name} className="rink-station-card">
          <h2>{name}</h2>
          <ul>
            {list.map((it, i) => (
              <li key={it.id ?? i}>
                <strong>{it.title}</strong> · {it.minutes} {t.common.minutes}
                {!!it.drill?.coachingPoints.length && <div className="small">{it.drill.coachingPoints[0]}</div>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
