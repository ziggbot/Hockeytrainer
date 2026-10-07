import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import type { Drill, NoteTag, PartDraft, SessionPart } from "../domain/types";
import { stationLetter } from "../domain/editParts";
import { S } from "../i18n";
import { addNote, allDrills, setDone } from "../store/actions";
import { useAppState } from "../store/store";
import { readItem, removeItem, writeItem } from "../store/storage";
import { NoteForm } from "./SessionScreen";

// Rink mode (spec §5.6): full-screen running order, big type, one timer per
// drill, station view for cross-ice rotations. Works fully offline — all it
// needs is already on the device. Timer state is kept in localStorage and
// based on wall-clock time, so a locked phone or a reload doesn't lose it.

const r = S.ui.rink;

type Step =
  | { kind: "drill"; drillId: string; minutes: number }
  | { kind: "rotation"; drillIds: string[]; minutes: number; rotation: number; rotations: number };

export function stepsOf(parts: (SessionPart | PartDraft)[]): Step[] {
  return parts.flatMap<Step>((p) =>
    p.type === "drill"
      ? [{ kind: "drill", drillId: p.drillId, minutes: p.minutes }]
      : p.drillIds.map((_, rotation) => ({
          kind: "rotation",
          drillIds: p.drillIds,
          minutes: p.minutesPerStation,
          rotation,
          rotations: p.drillIds.length
        }))
  );
}

interface TimerState {
  step: number;
  /** Epoch ms when the running timer hits zero; null when paused. */
  endsAt: number | null;
  /** Remaining ms while paused. */
  remaining: number | null;
  /** Station this coach runs (index), for the station view. */
  myStation: number | null;
}

const storageKey = (key: string) => `hockeytrainer.rink.${key}`;

function loadTimer(key: string): TimerState {
  try {
    const raw = readItem(storageKey(key));
    if (raw) return JSON.parse(raw) as TimerState;
  } catch {
    /* fall through */
  }
  return { step: 0, endsAt: null, remaining: null, myStation: null };
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

const fmt = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

interface Props {
  persistKey: string;
  parts: (SessionPart | PartDraft)[];
  drillsById: Map<string, Drill>;
  onExit: () => void;
  /** Stored sessions: save a note and mark done. Shared view: omitted. */
  onFinish?: (text: string, tags: NoteTag[]) => void;
}

export function RinkMode({ persistKey, parts, drillsById, onExit, onFinish }: Props) {
  const steps = useMemo(() => stepsOf(parts), [parts]);
  const [timer, setTimerState] = useState<TimerState>(() => loadTimer(persistKey));
  const [now, setNow] = useState(() => Date.now());
  const [text, setText] = useState("");
  const [tags, setTags] = useState<NoteTag[]>([]);
  const { unlock, ring } = useAlarm();
  const alerted = useRef<string | null>(null);
  useWakeLock();

  const setTimer = (next: TimerState) => {
    setTimerState(next);
    writeItem(storageKey(persistKey), JSON.stringify(next));
  };

  const stepIndex = Math.min(timer.step, steps.length);
  const step = steps[stepIndex] as Step | undefined;
  const duration = (step?.minutes ?? 0) * 60_000;
  const remaining = timer.endsAt !== null ? Math.max(0, timer.endsAt - now) : (timer.remaining ?? duration);
  const running = timer.endsAt !== null && remaining > 0;
  const timeUp = timer.endsAt !== null && remaining === 0;

  useEffect(() => {
    if (timer.endsAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timer.endsAt]);

  useEffect(() => {
    const key = `${stepIndex}:${timer.endsAt}`;
    if (timeUp && alerted.current !== key) {
      alerted.current = key;
      ring();
    }
  }, [timeUp, stepIndex, timer.endsAt, ring]);

  const goTo = (i: number) => {
    const target = steps[i];
    // Keep "my station" while moving between rotations of the same block.
    const sameBlock = step?.kind === "rotation" && target?.kind === "rotation" && target.drillIds === step.drillIds;
    setTimer({ step: i, endsAt: null, remaining: null, myStation: sameBlock ? timer.myStation : null });
    setNow(Date.now());
  };

  const tapTimer = () => {
    unlock();
    if (timeUp) return goTo(stepIndex + 1);
    if (running) setTimer({ ...timer, endsAt: null, remaining });
    else {
      const t = Date.now();
      setNow(t);
      setTimer({ ...timer, endsAt: t + remaining, remaining: null });
    }
  };

  const exit = () => onExit();

  if (!step) {
    return (
      <div className="rinkmode">
        <div className="rinkmode__body">
          <h1 className="rinkmode__title">{r.finishedTitle}</h1>
          {onFinish ? (
            <>
              <p className="sub" style={{ fontSize: 20 }}>
                {r.finishedSub}
              </p>
              <NoteForm text={text} tags={tags} onText={setText} onTags={setTags} />
              <button
                type="button"
                className="cta"
                onClick={() => {
                  removeItem(storageKey(persistKey));
                  onFinish(text, tags);
                }}
              >
                {r.saveAndClose}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="cta"
              onClick={() => {
                removeItem(storageKey(persistKey));
                exit();
              }}
            >
              {r.exit}
            </button>
          )}
          <button type="button" className="link link--muted" onClick={() => goTo(steps.length - 1)}>
            ◀ {S.ui.common.back}
          </button>
        </div>
      </div>
    );
  }

  const nextStep = steps[stepIndex + 1];
  const nextTitle = nextStep && (nextStep.kind === "drill" ? drillsById.get(nextStep.drillId)?.title : stationsTitle(nextStep));
  const isLast = stepIndex === steps.length - 1;

  return (
    <div className="rinkmode">
      <div className="rinkmode__top">
        <button type="button" className="btn btn--icon" onClick={exit}>
          ✕ {r.exit}
        </button>
        <span className="rinkmode__progress">{r.step(stepIndex + 1, steps.length)}</span>
      </div>

      <div className="rinkmode__body">
        {step.kind === "drill" ? (
          <DrillStep drill={drillsById.get(step.drillId)} />
        ) : (
          <RotationStep
            step={step}
            drillsById={drillsById}
            myStation={timer.myStation}
            onPick={(i) => setTimer({ ...timer, myStation: i })}
          />
        )}

        <button
          type="button"
          className={`timer${running ? " timer--running" : ""}${timeUp ? " timer--done" : ""}`}
          onClick={tapTimer}
          aria-live="off"
        >
          {fmt(remaining)}
          <span className="timer__hint">
            {timeUp
              ? step.kind === "rotation" && step.rotation < step.rotations - 1
                ? r.timeUpStations
                : r.timeUp
              : running
                ? r.tapPause
                : remaining < duration
                  ? r.paused
                  : r.tapStart}
          </span>
        </button>

        {step.kind === "drill" && <DrillDetails drill={drillsById.get(step.drillId)} />}
        {step.kind === "rotation" && timer.myStation !== null && (
          <DrillDetails drill={drillsById.get(step.drillIds[timer.myStation])} />
        )}

        {nextTitle && (
          <p className="rinkmode__desc">
            {r.upNext}: <strong>{nextTitle}</strong>
          </p>
        )}
      </div>

      <div className="rinkmode__nav">
        <button
          type="button"
          className="btn"
          disabled={stepIndex === 0}
          onClick={() => goTo(stepIndex - 1)}
          aria-label={S.ui.common.back}
        >
          {r.prev}
        </button>
        <button type="button" className={`btn${timeUp ? " btn--yellow" : ""}`} onClick={() => goTo(stepIndex + 1)}>
          {isLast ? r.finish : r.next}
        </button>
      </div>
    </div>
  );
}

function stationsTitle(step: Extract<Step, { kind: "rotation" }>) {
  return step.rotation === 0
    ? S.ui.session.stations(step.rotations, step.minutes)
    : r.rotation(step.rotation + 1, step.rotations);
}

function DrillStep({ drill }: { drill: Drill | undefined }) {
  return (
    <>
      <div className="rinkmode__kind">{drill ? `${S.kinds[drill.kind]} · ${S.iceAreas[drill.iceArea]}` : ""}</div>
      <h1 className="rinkmode__title">{drill?.title ?? S.ui.common.unknownDrill}</h1>
    </>
  );
}

function DrillDetails({ drill }: { drill: Drill | undefined }) {
  if (!drill) return null;
  return (
    <>
      <ul className="rinkmode__points">
        {drill.coachingPoints.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <p className="rinkmode__desc">{drill.description}</p>
    </>
  );
}

function RotationStep({
  step,
  drillsById,
  myStation,
  onPick
}: {
  step: Extract<Step, { kind: "rotation" }>;
  drillsById: Map<string, Drill>;
  myStation: number | null;
  onPick: (i: number | null) => void;
}) {
  const n = step.drillIds.length;
  // Groups move A → B → C …: in rotation k, group g is at station (g + k) mod n,
  // so station s hosts group (s − k) mod n.
  const groupAt = (s: number) => ((((s - step.rotation) % n) + n) % n) + 1;

  if (myStation !== null) {
    const drill = drillsById.get(step.drillIds[myStation]);
    return (
      <>
        <div className="rinkmode__kind">
          {r.rotation(step.rotation + 1, n)} · {r.station(stationLetter(myStation))} · {r.group(groupAt(myStation))}
        </div>
        <h1 className="rinkmode__title">{drill?.title ?? S.ui.common.unknownDrill}</h1>
        <button type="button" className="link" onClick={() => onPick(null)}>
          {r.allStations}
        </button>
      </>
    );
  }

  return (
    <>
      <div className="rinkmode__kind">{r.rotation(step.rotation + 1, n)}</div>
      <h1 className="rinkmode__title">{S.ui.session.stationsTitle}</h1>
      <div className="station-grid">
        {step.drillIds.map((id, i) => (
          <button key={`${id}-${i}`} type="button" className="station-card" onClick={() => onPick(i)}>
            <span className="station-letter">{stationLetter(i)}</span> <span className="muted">{r.group(groupAt(i))}</span>
            <div className="station-card__title">{drillsById.get(id)?.title ?? S.ui.common.unknownDrill}</div>
          </button>
        ))}
      </div>
      <p className="sub" style={{ marginTop: 8 }}>
        {r.myStation}
      </p>
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
      onExit={() => navigate(`/pass/${session.id}`)}
      onFinish={(text, tags) => {
        addNote(session.id, text, tags);
        setDone(session.id, true);
        navigate(`/pass/${session.id}`, { replace: true });
      }}
    />
  );
}
