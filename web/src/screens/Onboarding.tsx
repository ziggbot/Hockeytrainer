import { useState } from "react";
import { BackBar } from "../components/Chrome";
import { LogoMark } from "../components/Icons";
import { Stepper } from "../components/Stepper";
import { AGE_GROUPS } from "../content/curricula";
import { S } from "../i18n";
import { createTeam, newTrainingTime } from "../store/actions";

const t = S.ui.onboarding;

/** First run (and "Nytt lag"): team name, age group, weekly ice times. */
export function Onboarding({ onDone, showBack = false }: { onDone?: () => void; showBack?: boolean }) {
  const [name, setName] = useState("");
  const [ageGroupId, setAgeGroupId] = useState("u10");
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState("18:00");
  const [minutes, setMinutes] = useState(60);
  const [players, setPlayers] = useState(14);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (d: number) => setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d].sort()));

  const submit = () => {
    if (!name.trim()) return setError(t.needName);
    if (days.length === 0) return setError(t.needDay);
    createTeam({
      name: name.trim(),
      ageGroupId,
      playerCount: players,
      schedule: days.map((d) => newTrainingTime(d, start, minutes))
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
            <LogoMark />
            {S.ui.appName}
          </span>
        </header>
      )}
      <h1 className="hello">{t.hello}</h1>
      <p className="sub">{t.sub}</p>

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
              className={`chip chip--sm${days.includes(i + 1) ? " chip--on" : ""}`}
              aria-pressed={days.includes(i + 1)}
              onClick={() => toggleDay(i + 1)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <label className="field">
          <span className="field__label">{t.start}</span>
          <input className="input input--sm" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <div className="field">
          <span className="field__label">{t.length}</span>
          <Stepper
            value={minutes}
            onChange={setMinutes}
            min={15}
            max={180}
            step={5}
            label={t.length}
            format={S.ui.common.minutes}
          />
        </div>
      </div>

      <div className="field">
        <span className="field__label">{S.ui.team.players}</span>
        <Stepper value={players} onChange={setPlayers} min={2} max={40} label={S.ui.team.players} />
        <span className="field__hint">{S.ui.team.playersHint}</span>
      </div>

      {error && <p className="notice notice--warn">{error}</p>}

      <button type="button" className="cta" onClick={submit}>
        {t.go}
      </button>
      <p className="footer-note">{S.ui.home.footer}</p>
    </main>
  );
}
