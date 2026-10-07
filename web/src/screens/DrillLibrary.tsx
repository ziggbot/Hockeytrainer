import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BottomNav, TopBar } from "../components/Chrome";
import { filterDrills } from "../components/DrillPicker";
import { ICE_AREAS, SKILLS, type IceArea, type Skill } from "../domain/types";
import { S } from "../i18n";
import { activeTeam, ageGroupOf, allDrills } from "../store/actions";
import { useAppState } from "../store/store";

const t = S.ui.library;

type Length = "short" | "medium" | "long";
const LENGTHS: Length[] = ["short", "medium", "long"];
const inLength = (m: number, l: Length | null) => !l || (l === "short" ? m <= 6 : l === "medium" ? m >= 7 && m <= 9 : m >= 10);

/** Drill library (spec §5.3) with filters for age, skill, duration and ice area. Filters live in the URL. */
export function DrillLibrary() {
  const state = useAppState();
  const team = activeTeam(state);
  const ageGroup = team ? ageGroupOf(team) : null;
  const [params, setParams] = useSearchParams();
  const skill = (params.get("skill") as Skill | null) ?? null;
  const area = (params.get("area") as IceArea | null) ?? null;
  const length = (params.get("length") as Length | null) ?? null;
  const allAges = params.get("ages") === "all";
  const query = params.get("q") ?? "";

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const drills = useMemo(() => allDrills(state), [state]);
  const list = filterDrills(drills, { query, skill, ageGroup: allAges ? null : ageGroup })
    .filter((d) => (!area || d.iceArea === area) && inLength(d.minutes, length))
    .sort((a, b) => a.title.localeCompare(b.title, "sv"));

  return (
    <>
      <main className="page">
        <TopBar />
        <h1 className="title">{t.title}</h1>
        <p className="sub">{t.sub(list.length)}</p>

        <input
          className="input"
          type="search"
          placeholder={t.search}
          value={query}
          onChange={(e) => set("q", e.target.value)}
          style={{ marginTop: 14 }}
        />

        <div className="rail">
          {ageGroup && (
            <button
              type="button"
              className={`chip chip--sm${!allAges ? " chip--on" : ""}`}
              onClick={() => set("ages", allAges ? null : "all")}
            >
              {t.onlyAge(ageGroup.name)}
            </button>
          )}
          {SKILLS.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip chip--sm${skill === s ? " chip--on" : ""}`}
              onClick={() => set("skill", skill === s ? null : s)}
            >
              <span className="chip__icon">{S.skillIcons[s]}</span>
              {S.skills[s]}
            </button>
          ))}
        </div>
        <div className="rail" style={{ marginTop: 0 }}>
          {ICE_AREAS.map((a) => (
            <button
              key={a}
              type="button"
              className={`chip chip--sm${area === a ? " chip--on" : ""}`}
              onClick={() => set("area", area === a ? null : a)}
            >
              {S.iceAreas[a]}
            </button>
          ))}
          {LENGTHS.map((l) => (
            <button
              key={l}
              type="button"
              className={`chip chip--sm${length === l ? " chip--on" : ""}`}
              onClick={() => set("length", length === l ? null : l)}
            >
              {t[l]}
            </button>
          ))}
        </div>

        <ul className="rows">
          {list.map((d) => (
            <li key={d.id}>
              <Link to={`/ovningar/${d.id}`} className="row row--compact">
                <span className="row__icon">{S.skillIcons[d.skills[0]]}</span>
                <span className="row__main">
                  <div className="row__title">
                    {d.title} {d.source === "own" && <span className="tag">{t.own}</span>}
                  </div>
                  <div className="row__sub">
                    {S.ui.common.minutes(d.minutes)} · {S.iceAreas[d.iceArea]} · {S.ui.common.years(d.ageMin, d.ageMax)}
                  </div>
                </span>
                <span aria-hidden="true" className="muted">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {list.length === 0 && (
          <p className="sub" style={{ marginTop: 14 }}>
            {t.none}
          </p>
        )}

        <Link to="/ovningar/ny" className="btn" style={{ marginTop: 22 }}>
          + {t.newDrill}
        </Link>
      </main>
      <BottomNav />
    </>
  );
}
