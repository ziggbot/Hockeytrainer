import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ConfirmButton } from "../components/ConfirmButton";
import { stationStyle } from "../components/stationColor";
import { minutesToTime, timeToMinutes } from "../domain/dates";
import { stationLetter } from "../domain/editParts";
import { boundaryKey, formatClock, groupAt, positionAt, segmentsOf, totalOf, type Segment } from "../domain/timeline";
import type { Drill, NoteTag, PartDraft, SessionPart } from "../domain/types";
import { S, formatTime } from "../i18n";
import { addNote, allDrills, setDone } from "../store/actions";
import { useAppState } from "../store/store";
import { readItem, removeItem, writeItem } from "../store/storage";
import { NoteForm, talkLabel } from "./SessionScreen";

// Rink mode (spec §5.6): the coach starts the practice once and the screen
// follows the clock — the feed scrolls to the running part, the timeline on
// the right ticks along, and it beeps at every new part or station rotation.
// No taps needed with gloves on. Works offline; the start time is kept in
// localStorage, so a locked phone or a reload picks up where it was.

const r = S.ui.rink;

/** `myStation` value for the coach who looks after the free zone. */
const FREE_ZONE = -1;

interface RinkState {
  /** Epoch ms when the practice was started; null before start. */
  startedAt: number | null;
  /** Station this coach runs (index, or FREE_ZONE), highlighted in the feed. */
  myStation: number | null;
}

const storageKey = (key: string) => `hockeytrainer.rink2.${key}`;

function loadState(key: string): RinkState {
  try {
    const raw = readItem(storageKey(key));
    if (raw) return { startedAt: null, myStation: null, ...(JSON.parse(raw) as Partial<RinkState>) };
  } catch {
    /* fall through */
  }
  return { startedAt: null, myStation: null };
}

function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) lock.release().catch(() => {});
      } catch {
        // Denied (battery saver) or unsupported: the screen may sleep.
      }
    };
    request();
    // The lock is dropped whenever the page is hidden; take it again.
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, []);
}

/** Three short beeps + vibration. AudioContext is created on a tap (iOS rule). */
function useAlarm() {
  const ctxRef = useRef<AudioContext | null>(null);
  const unlock = useCallback(() => {
    if (ctxRef.current) return;
    try {
      ctxRef.current = new AudioContext();
    } catch {
      /* no audio */
    }
  }, []);
  const ring = useCallback(() => {
    navigator.vibrate?.([300, 120, 300, 120, 300]);
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.resume().catch(() => {});
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.25;
      osc.connect(gain).connect(ctx.destination);
      const at = ctx.currentTime + i * 0.35;
      osc.start(at);
      osc.stop(at + 0.2);
    }
  }, []);
  return { unlock, ring };
}

interface Props {
  persistKey: string;
  parts: (SessionPart | PartDraft)[];
  drillsById: Map<string, Drill>;
  /** Planned start "HH:MM", for the timeline before the practice starts. */
  plannedStart: string;
  onExit: () => void;
  /** Stored sessions: save a note and mark done. Shared view: omitted. */
  onFinish?: (text: string, tags: NoteTag[]) => void;
}

export function RinkMode({ persistKey, parts, drillsById, plannedStart, onExit, onFinish }: Props) {
  const segments = useMemo(() => segmentsOf(parts), [parts]);
  const total = totalOf(segments);
  const [state, setRinkState] = useState<RinkState>(() => loadState(persistKey));
  const [now, setNow] = useState(() => Date.now());
  const [follow, setFollow] = useState(true);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<NoteTag[]>([]);
  const { unlock, ring } = useAlarm();
  const cards = useRef<(HTMLElement | null)[]>([]);
  const finishRef = useRef<HTMLElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  useWakeLock();

  const save = (next: RinkState) => {
    setRinkState(next);
    writeItem(storageKey(persistKey), JSON.stringify(next));
  };

  const started = state.startedAt !== null;
  const pos = positionAt(segments, started ? now - state.startedAt! : null);
  const finished = pos.segment >= segments.length;

  // Tick once a second while running; catch up when the phone wakes.
  useEffect(() => {
    if (!started || finished) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    const onVisible = () => document.visibilityState === "visible" && setNow(Date.now());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [started, finished]);

  // Beep when a new part or rotation begins (not when reopening mid-practice).
  const key = boundaryKey(pos);
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    if (started && lastKey.current !== null && lastKey.current !== key) ring();
    lastKey.current = key;
  }, [key, started, ring]);

  // Keep the running part at the top of the feed.
  useEffect(() => {
    if (!follow) return;
    if (!started) feedRef.current?.scrollTo({ top: 0 });
    else (finished ? finishRef.current : cards.current[pos.segment])?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pos.segment, follow, started, finished]);

  // Wall-clock time of a point in the practice: from the actual start once
  // running, otherwise from the planned start.
  const base = started ? new Date(state.startedAt!) : null;
  const clockAt = (min: number) =>
    base
      ? formatTime(minutesToTime(base.getHours() * 60 + base.getMinutes() + min))
      : /^\d{2}:\d{2}$/.test(plannedStart)
        ? formatTime(minutesToTime(timeToMinutes(plannedStart) + min))
        : `${min}′`;

  const title = (seg: Segment) =>
    seg.part.type === "drill"
      ? (drillsById.get(seg.part.drillId)?.title ?? S.ui.common.unknownDrill)
      : seg.part.type === "stations"
        ? S.ui.session.stationsTitle
        : talkLabel(seg.part).title;

  // The gathering shows where each group starts in the rotation that follows.
  const rotationAfter = (index: number) => {
    const part = segments.slice(index + 1).find((s) => s.part.type === "stations")?.part;
    return part?.type === "stations" ? part : undefined;
  };

  const current = segments[pos.segment];
  const next = segments[pos.segment + 1];
  const headTitle = !started ? r.ready : finished ? r.finishedTitle : current ? title(current) : "";
  const headSub = (() => {
    if (!started || finished || !current) return "";
    if (current.part.type === "stations" && pos.rotation !== null) {
      const n = current.part.drillIds.length;
      return pos.rotation < n - 1 ? `${r.rotation(pos.rotation + 1, n)} · ${r.thenSwap}` : r.rotation(n, n);
    }
    return next ? `${r.upNext}: ${title(next)}` : "";
  })();

  const start = () => {
    unlock();
    const t = Date.now();
    setNow(t);
    setFollow(true);
    lastKey.current = null;
    save({ ...state, startedAt: t });
  };

  const done = () => {
    removeItem(storageKey(persistKey));
    if (onFinish) onFinish(text, tags);
    else onExit();
  };

  const stopFollowing = () => {
    if (started && !finished) setFollow(false);
  };

  return (
    <div className="rk">
      <header className="rk__top">
        <div className="rk__clock">{!started ? S.ui.common.minutes(total) : finished ? "✓" : formatClock(pos.leftMs)}</div>
        <div className="rk__now">
          <div className="rk__now-title">{headTitle}</div>
          {headSub && <div className="rk__now-sub">{headSub}</div>}
        </div>
        <button type="button" className="rk__exit" onClick={onExit}>
          {r.exit}
        </button>
      </header>

      <div className="rk__body">
        <div className="rk__feed" ref={feedRef} onTouchMove={stopFollowing} onWheel={stopFollowing}>
          {!started && (
            <button type="button" className="cta" style={{ marginTop: 0 }} onClick={start}>
              {r.start}
            </button>
          )}

          {segments.map((seg) => {
            const when = !started
              ? ""
              : seg.index < pos.segment
                ? " rk-card--past"
                : seg.index === pos.segment
                  ? " rk-card--now"
                  : "";
            return (
              <section
                key={seg.index}
                ref={(el) => {
                  cards.current[seg.index] = el;
                }}
                className={`rk-card${when}`}
              >
                <div className="rk-card__time">
                  {clockAt(seg.start)} ·{" "}
                  {seg.part.type === "stations"
                    ? `${seg.part.drillIds.length} × ${S.ui.common.minutes(seg.part.minutesPerStation)}`
                    : S.ui.common.minutes(seg.minutes)}
                </div>
                <h2 className="rk-card__title">{title(seg)}</h2>
                {seg.part.type === "drill" ? (
                  <DrillBody drill={drillsById.get(seg.part.drillId)} />
                ) : seg.part.type === "gather" ? (
                  (() => {
                    const next = rotationAfter(seg.index);
                    return next ? (
                      <Stations
                        part={next}
                        rotation={0}
                        running={false}
                        rotationLeft={0}
                        drillsById={drillsById}
                        mine={state.myStation}
                        onPick={(i) => save({ ...state, myStation: state.myStation === i ? null : i })}
                      />
                    ) : null;
                  })()
                ) : seg.part.type === "stations" ? (
                  <Stations
                    part={seg.part}
                    rotation={seg.index === pos.segment && pos.rotation !== null ? pos.rotation : 0}
                    running={seg.index === pos.segment}
                    rotationLeft={pos.leftMs}
                    drillsById={drillsById}
                    mine={state.myStation}
                    onPick={(i) => save({ ...state, myStation: state.myStation === i ? null : i })}
                  />
                ) : null}
              </section>
            );
          })}

          <section ref={finishRef} className="rk-card">
            {onFinish && <NoteForm text={text} tags={tags} onText={setText} onTags={setTags} />}
            <button type="button" className="cta cta--small" onClick={done}>
              {onFinish ? r.saveAndClose : r.exit}
            </button>
            {started && (
              <ConfirmButton
                className="link link--muted"
                label={r.restart}
                onConfirm={() => {
                  setFollow(true);
                  save({ ...state, startedAt: null });
                }}
              />
            )}
          </section>
        </div>

        <aside className="rk__rail" aria-label={r.timeline}>
          <div style={{ position: "relative", flex: 1 }}>
            {segments.map((seg) => {
              const when = !started
                ? ""
                : seg.index < pos.segment
                  ? " rk-seg--past"
                  : seg.index === pos.segment
                    ? " rk-seg--now"
                    : "";
              const rotations = seg.part.type === "stations" ? seg.part.drillIds.length : 0;
              return (
                <button
                  key={seg.index}
                  type="button"
                  className={`rk-seg${when}`}
                  aria-label={`${clockAt(seg.start)} ${title(seg)}`}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: `${(seg.start / total) * 100}%`,
                    height: `calc(${(seg.minutes / total) * 100}% - 4px)`,
                    minHeight: 0
                  }}
                  onClick={() => {
                    cards.current[seg.index]?.scrollIntoView({ behavior: "smooth", block: "start" });
                    setFollow(seg.index === pos.segment);
                  }}
                >
                  <span className="rk-seg__time">{clockAt(seg.start)}</span>
                  <span className="rk-seg__min">{S.ui.common.minutes(seg.minutes)}</span>
                  {Array.from({ length: Math.max(0, rotations - 1) }, (_, k) => (
                    <span key={k} className="rk-seg__rot" style={{ top: `${((k + 1) / rotations) * 100}%` }} />
                  ))}
                </button>
              );
            })}
            {started && !finished && <div className="rk-nowline" style={{ top: `${pos.progress * 100}%` }} />}
          </div>
        </aside>
      </div>

      {started && !finished && !follow && (
        <button type="button" className="rk-follow" onClick={() => setFollow(true)}>
          {r.follow}
        </button>
      )}
    </div>
  );
}

function DrillBody({ drill }: { drill: Drill | undefined }) {
  if (!drill) return null;
  return (
    <>
      <ul className="rk-points">
        {drill.coachingPoints.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <p className="rk-desc">{drill.description}</p>
    </>
  );
}

function Stations({
  part,
  rotation,
  running,
  rotationLeft,
  drillsById,
  mine,
  onPick
}: {
  part: Extract<SessionPart | PartDraft, { type: "stations" }>;
  rotation: number;
  running: boolean;
  rotationLeft: number;
  drillsById: Map<string, Drill>;
  mine: number | null;
  onPick: (i: number) => void;
}) {
  const n = part.drillIds.length;
  const myDrill = mine !== null && mine >= 0 ? drillsById.get(part.drillIds[mine]) : undefined;
  return (
    <>
      {running && (
        <div className="rk-card__time" style={{ color: "var(--accent)" }}>
          {r.rotation(rotation + 1, n)} · {r.swapIn(formatClock(rotationLeft))}
        </div>
      )}
      <div className="station-grid">
        {part.drillIds.map((id, i) => (
          <button
            key={`${id}-${i}`}
            type="button"
            className={`station-card${mine === i ? " station-card--mine" : ""}`}
            style={stationStyle(i)}
            aria-pressed={mine === i}
            onClick={() => onPick(i)}
          >
            <span className="station-letter" style={stationStyle(i)}>
              {stationLetter(i)}
            </span>
            <span className="station-card__group">{r.group(groupAt(i, rotation, n))}</span>
            <div className="station-card__title">{drillsById.get(id)?.title ?? S.ui.common.unknownDrill}</div>
          </button>
        ))}
        {part.freeZone && (
          <button
            type="button"
            className={`station-card station-card--free${mine === FREE_ZONE ? " station-card--mine" : ""}`}
            aria-pressed={mine === FREE_ZONE}
            onClick={() => onPick(FREE_ZONE)}
          >
            <div className="station-card__title" style={{ marginTop: 0 }}>
              {S.ui.session.freeZone}
            </div>
          </button>
        )}
      </div>
      {myDrill && <DrillBody drill={myDrill} />}
    </>
  );
}

/** /pass/:id/rink — rink mode for a stored session. */
export function RinkRoute() {
  const { id } = useParams();
  const state = useAppState();
  const navigate = useNavigate();
  const session = state.sessions.find((s) => s.id === id);
  const drillsById = useMemo(() => new Map(allDrills(state).map((d) => [d.id, d])), [state]);
  if (!session) return <Navigate to="/" replace />;
  return (
    <RinkMode
      persistKey={session.id}
      parts={session.parts}
      drillsById={drillsById}
      plannedStart={session.start}
      onExit={() => navigate(`/pass/${session.id}`)}
      onFinish={(text, tags) => {
        addNote(session.id, text, tags);
        setDone(session.id, true);
        navigate(`/pass/${session.id}`, { replace: true });
      }}
    />
  );
}
