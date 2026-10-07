import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { BackBar } from "../components/Chrome";
import { ConfirmButton } from "../components/ConfirmButton";
import { Stepper } from "../components/Stepper";
import { TimeAndLength } from "../components/TimeAndLength";
import { AGE_GROUPS } from "../content/curricula";
import type { Team, TrainingTime } from "../domain/types";
import { S } from "../i18n";
import { IS_ARTIFACT } from "../platform";
import { activeTeam, deleteTeam, newTrainingTime, setActiveTeam, setCoachName, updateTeam } from "../store/actions";
import { getState, replaceState, useAppState, type AppState } from "../store/store";

const t = S.ui.team;

/** Team settings ("Mer"): name, age group, ice times, teams, backup. */
export function TeamSettings() {
  const state = useAppState();
  const team = activeTeam(state);
  const navigate = useNavigate();
  if (!team) return <Navigate to="/" replace />;

  const patch = (p: Partial<Team>) => updateTeam({ ...team, ...p });
  const patchTime = (id: string, p: Partial<TrainingTime>) =>
    patch({ schedule: team.schedule.map((x) => (x.id === id ? { ...x, ...p } : x)) });

  return (
    <main className="page page--bare">
      <BackBar to="/" />
      <h1 className="title">{t.title}</h1>

      <label className="field">
        <span className="field__label">{t.coachName}</span>
        <input
          className="input"
          value={state.coachName}
          autoComplete="given-name"
          onChange={(e) => setCoachName(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="field__label">{t.name}</span>
        <input
          className="input"
          value={team.name}
          placeholder={t.namePlaceholder}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </label>

      <div className="field">
        <span className="field__label">{t.ageGroup}</span>
        <div className="chips" style={{ marginTop: 4 }}>
          {AGE_GROUPS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`chip chip--sm${a.id === team.ageGroupId ? " chip--on" : ""}`}
              aria-pressed={a.id === team.ageGroupId}
              onClick={() => patch({ ageGroupId: a.id })}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field__label">{t.players}</span>
        <Stepper value={team.playerCount} onChange={(v) => patch({ playerCount: v })} min={2} max={40} label={t.players} />
        <span className="field__hint">{t.playersHint}</span>
      </div>

      <section className="section">
        <div className="section__head">
          <h2>{t.times}</h2>
        </div>
        <ul className="rows">
          {[...team.schedule]
            .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))
            .map((time) => (
              <li key={time.id} className="time-row">
                <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                  <select
                    className="input input--sm time-row__day"
                    aria-label={t.day}
                    value={time.weekday}
                    onChange={(e) => patchTime(time.id, { weekday: Number(e.target.value) })}
                  >
                    {S.weekdays.map((d, i) => (
                      <option key={d} value={i + 1}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn--icon"
                    aria-label={S.ui.common.delete}
                    onClick={() => patch({ schedule: team.schedule.filter((x) => x.id !== time.id) })}
                  >
                    ✕
                  </button>
                </div>
                <TimeAndLength
                  start={time.start}
                  minutes={time.minutes}
                  label={S.weekdays[time.weekday - 1]}
                  onChange={(next) => patchTime(time.id, next)}
                />
              </li>
            ))}
        </ul>
        <button
          type="button"
          className="btn"
          style={{ marginTop: 12 }}
          onClick={() => {
            const last = team.schedule[team.schedule.length - 1];
            patch({
              schedule: [
                ...team.schedule,
                newTrainingTime(last ? (last.weekday % 7) + 1 : 2, last?.start ?? "18:00", last?.minutes ?? 60)
              ]
            });
          }}
        >
          + {t.addTime}
        </button>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>{t.otherTeams}</h2>
        </div>
        <ul className="rows">
          {state.teams.map((x) => (
            <li key={x.id} className="row row--compact">
              <span className="row__icon">🏒</span>
              <span className="row__main">
                <div className="row__title">{x.name}</div>
                <div className="row__sub">{AGE_GROUPS.find((a) => a.id === x.ageGroupId)?.name}</div>
              </span>
              {x.id === team.id ? (
                <span className="tag">{t.active}</span>
              ) : (
                <button type="button" className="btn btn--icon" onClick={() => setActiveTeam(x.id)}>
                  {t.switchTo}
                </button>
              )}
            </li>
          ))}
        </ul>
        <button type="button" className="btn" style={{ marginTop: 12 }} onClick={() => navigate("/nytt-lag")}>
          + {t.newTeam}
        </button>
      </section>

      <DataSection />

      <ConfirmButton
        className="link link--danger"
        style={{ marginTop: 28, display: "block" }}
        label={t.deleteTeam}
        confirmLabel={S.ui.common.tapAgainDelete}
        onConfirm={() => {
          deleteTeam(team.id);
          navigate("/", { replace: true });
        }}
      />
    </main>
  );
}

function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<AppState | null>(null);

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tranarappen-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as AppState;
      if (data.version !== 1 || !Array.isArray(data.teams) || !Array.isArray(data.sessions)) throw new Error("format");
      setMessage(null);
      setPending(data);
    } catch {
      setMessage(t.importFailed);
    }
  };

  return (
    <section className="section">
      <div className="section__head">
        <h2>{t.data}</h2>
      </div>
      <p className="sub" style={{ marginTop: 10 }}>
        {t.dataNote}
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        {/* The claude.ai preview frame blocks downloads. */}
        {!IS_ARTIFACT && (
          <button type="button" className="btn" onClick={exportBackup}>
            ↓ {t.export}
          </button>
        )}
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          ↑ {t.import}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importBackup(file);
            e.target.value = "";
          }}
        />
      </div>
      {pending && (
        <div className="notice notice--warn">
          <p style={{ margin: "0 0 10px" }}>{t.importConfirm}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                replaceState(pending);
                setPending(null);
                setMessage(t.importDone);
              }}
            >
              {t.importReplace}
            </button>
            <button type="button" className="btn" onClick={() => setPending(null)}>
              {S.ui.common.cancel}
            </button>
          </div>
        </div>
      )}
      {message && <p className="notice">{message}</p>}
    </section>
  );
}
