import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { LogoMark } from "../components/Icons";
import { SEED_DRILLS } from "../content/drills";
import { minutesToTime, parseISODate, timeToMinutes } from "../domain/dates";
import { partMinutes, totalMinutes } from "../domain/planner";
import { decodeShare } from "../domain/share";
import { stationLetter } from "../domain/editParts";
import { S, formatDayLong } from "../i18n";
import { RinkMode } from "./RinkMode";
import { PlanTotal } from "./SessionScreen";

const t = S.ui.shared;

/** Short stable id for a share link, so each shared session keeps its own timer state. */
function fingerprint(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/**
 * /delat#<payload> — read-only session for assistant coaches and parents,
 * no account needed (spec §5.7). Assistants open rink mode here and pick
 * their station.
 */
export function SharedSession() {
  const { hash } = useLocation();
  const shared = useMemo(() => decodeShare(hash), [hash]);
  const [rink, setRink] = useState(false);
  const drillsById = useMemo(() => {
    const map = new Map((shared?.drills ?? []).map((d) => [d.id, d]));
    // App seed wins over anything in the link with the same id.
    for (const d of SEED_DRILLS) map.set(d.id, d);
    return map;
  }, [shared]);

  if (!shared) {
    return (
      <main className="page page--bare">
        <header className="topbar">
          <span className="logo">
            <LogoMark />
            {S.ui.appName}
          </span>
        </header>
        <p className="notice notice--warn">{t.broken}</p>
      </main>
    );
  }

  if (rink) {
    return (
      <RinkMode
        persistKey={`shared-${fingerprint(hash)}`}
        parts={shared.parts}
        drillsById={drillsById}
        onExit={() => setRink(false)}
      />
    );
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(shared.date) ? parseISODate(shared.date) : null;
  const total = totalMinutes(shared.parts);
  let clock = /^\d{2}:\d{2}$/.test(shared.start) ? timeToMinutes(shared.start) : 0;

  return (
    <main className="page page--bare">
      <header className="topbar">
        <span className="logo">
          <LogoMark />
          {S.ui.appName}
        </span>
        {shared.team && <span className="chip chip--sm">{shared.team}</span>}
      </header>
      <p className="sub" style={{ marginTop: 14 }}>
        {t.title}
      </p>
      <h1 className="title">{shared.title}</h1>
      <p className="sub">
        {date && formatDayLong(date)} · {shared.start} · {S.ui.common.minutes(shared.minutes)}
      </p>

      <button type="button" className="cta" onClick={() => setRink(true)}>
        {t.openRink}
      </button>

      <section className="section">
        <div className="section__head">
          <h2>{S.ui.session.plan}</h2>
        </div>
        <ul className="rows">
          {shared.parts.map((part, i) => {
            const at = minutesToTime(clock);
            clock += partMinutes(part);
            const ids = part.type === "drill" ? [part.drillId] : part.drillIds;
            return (
              <li key={i} style={{ padding: "14px 0", borderBottom: "1.5px dashed var(--line)" }}>
                <div className="row__sub">
                  {at} ·{" "}
                  {part.type === "drill"
                    ? S.ui.common.minutes(part.minutes)
                    : S.ui.session.stations(part.drillIds.length, part.minutesPerStation)}
                </div>
                {ids.map((id, s) => {
                  const d = drillsById.get(id);
                  return (
                    <details key={`${id}-${s}`} style={{ marginTop: 6 }}>
                      <summary className="row__title" style={{ cursor: "pointer" }}>
                        {part.type === "stations" && (
                          <span className="station-letter" style={{ marginRight: 8 }}>
                            {stationLetter(s)}
                          </span>
                        )}
                        {d?.title ?? S.ui.common.unknownDrill}
                      </summary>
                      {d && (
                        <>
                          <p style={{ margin: "6px 0" }}>{d.description}</p>
                          <ul className="points">
                            {d.coachingPoints.map((p) => (
                              <li key={p}>{p}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </details>
                  );
                })}
              </li>
            );
          })}
        </ul>
        <PlanTotal total={total} slot={shared.minutes} diff={total - shared.minutes} />
      </section>

      <p className="footer-note">{t.readOnly}</p>
    </main>
  );
}
