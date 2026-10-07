import { useState } from "react";
import { BackBar } from "../components/Chrome";
import { AppMark } from "../components/AppMark";
import { Stepper } from "../components/Stepper";
import { TimeAndLength } from "../components/TimeAndLength";
import { AGE_GROUPS } from "../content/curricula";
import { S } from "../i18n";
import { createTeam, newTrainingTime, setCoachName } from "../store/actions";

const t = S.ui.onboarding;

/** First run (and "Nytt lag"): team name, age group, weekly ice times. */
export function Onboarding({ onDone, showBack = false }: { onDone?: () => void; showBack?: boolean }) {
  const [coach, setCoach] = useState("");
  const [name, setName] = useState("");
  const [ageGroupId, setAgeGroupId] = useState("u10");
  // One entry per training day, each with its own start and ice time.
  const [times, setTimes] = useState<{ weekday: number; start: string; minutes: number }[]>([]);
  const [players, setPlayers] = useState(14);
  const [error, setError] = useState<string | null>(null);

  const hasDay = (d: number) => times.some((x) => x.weekday === d);
  const toggleDay = (d: number) =>
    setTimes((xs) => {
      if (xs.some((x) => x.weekday === d)) return xs.filter((x) => x.weekday !== d);
      // A new day starts from the last day's time — usually close, quick to adjust.
      const last = xs[xs.length - 1];
      return [...xs, { weekday: d, start: last?.start ?? "18:00", minutes: last?.minutes ?? 60 }].sort(
        (a, b) => a.weekday - b.weekday
      );
    });

  const submit = () => {
    if (!name.trim()) return setError(t.needName);
    if (times.length === 0) return setError(t.needDay);
    if (coach.trim()) setCoachName(coach.trim());
    createTeam({
      name: name.trim(),
      ageGroupId,
      playerCount: players,
      schedule: times.map((x) => newTrainingTime(x.weekday, x.start, x.minutes))
    });
    onDone?.();
  };

  return (
    <main className="page page--bare">
      {showBack ? (
        <BackBar />
      ) : (
        <header className="topbar">
          <span className="logo">
            <AppMark />
            {S.ui.appName}
          </span>
        </header>
      )}
      <h1 className="hello">{t.hello}</h1>
      <p className="sub">{t.sub}</p>

      {!showBack && (
        <label className="field">
          <span className="field__label">{S.ui.team.coachName}</span>
          <input className="input" value={coach} autoComplete="given-name" onChange={(e) => setCoach(e.target.value)} />
        </label>
      )}

      <label className="field">
        <span className="field__label">{S.ui.team.name}</span>
        <input
          className="input"
          value={name}
          placeholder={S.ui.team.namePlaceholder}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <div className="field">
        <span className="field__label">{S.ui.team.ageGroup}</span>
        <div className="chips" style={{ marginTop: 4 }}>
          {AGE_GROUPS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`chip chip--sm${a.id === ageGroupId ? " chip--on" : ""}`}
              aria-pressed={a.id === ageGroupId}
              onClick={() => setAgeGroupId(a.id)}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field__label">{t.days}</span>
        <div className="chips" style={{ marginTop: 4 }}>
          {S.weekdaysShort.map((label, i) => (
            <button
              key={label}
              type="button"
              className={`chip chip--sm${hasDay(i + 1) ? " chip--on" : ""}`}
              aria-pressed={hasDay(i + 1)}
              onClick={() => toggleDay(i + 1)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {times.length > 0 && (
        <ul className="rows">
          {times.map((x) => {
            const day = S.weekdays[x.weekday - 1];
            return (
              <li key={x.weekday} className="time-row">
                <span className="time-row__day">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                <TimeAndLength
                  start={x.start}
                  minutes={x.minutes}
                  label={day}
                  onChange={(next) => setTimes((xs) => xs.map((y) => (y.weekday === x.weekday ? { ...y, ...next } : y)))}
                />
              </li>
            );
          })}
        </ul>
      )}

      <div className="field">
        <span className="field__label">{S.ui.team.players}</span>
        <Stepper value={players} onChange={setPlayers} min={2} max={40} label={S.ui.team.players} />
        <span className="field__hint">{S.ui.team.playersHint}</span>
      </div>

      {error && <p className="notice notice--warn">{error}</p>}

      <button type="button" className="cta" onClick={submit}>
        {t.go}
      </button>
    </main>
  );
}
