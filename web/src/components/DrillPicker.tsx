import { useMemo, useState } from "react";
import type { AgeGroup, Drill, Skill } from "../domain/types";
import { SKILLS } from "../domain/types";
import { ageOverlaps } from "../domain/curriculum";
import { S } from "../i18n";
import { Sheet } from "./Sheet";

interface Props {
  title: string;
  drills: Drill[];
  ageGroup: AgeGroup;
  onPick: (drill: Drill) => void;
  onClose: () => void;
}

export function filterDrills(drills: Drill[], opts: { query: string; skill: Skill | null; ageGroup: AgeGroup | null }): Drill[] {
  const q = opts.query.trim().toLowerCase();
  return drills.filter(
    (d) =>
      (!opts.skill || d.skills.includes(opts.skill)) &&
      (!opts.ageGroup || ageOverlaps(d, opts.ageGroup)) &&
      (!q || d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q))
  );
}

/** Sheet for choosing a drill when adding to or swapping in a session. */
export function DrillPicker({ title, drills, ageGroup, onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState<Skill | null>(null);
  const [onlyAge, setOnlyAge] = useState(true);
  const list = useMemo(
    () => filterDrills(drills, { query, skill, ageGroup: onlyAge ? ageGroup : null }),
    [drills, query, skill, onlyAge, ageGroup]
  );

  return (
    <Sheet title={title} onClose={onClose}>
      <input
        className="input"
        type="search"
        placeholder={S.ui.library.search}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginTop: 10 }}
      />
      <div className="rail">
        <button type="button" className={`chip chip--sm${onlyAge ? " chip--on" : ""}`} onClick={() => setOnlyAge(!onlyAge)}>
          {S.ui.library.onlyAge(ageGroup.name)}
        </button>
        {SKILLS.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip chip--sm${skill === s ? " chip--on" : ""}`}
            onClick={() => setSkill(skill === s ? null : s)}
          >
            <span className="chip__icon">{S.skillIcons[s]}</span>
            {S.skills[s]}
          </button>
        ))}
      </div>
      <ul className="rows">
        {list.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              className="row row--compact"
              style={{
                width: "100%",
                background: "none",
                border: 0,
                borderBottom: "1px solid var(--line)",
                textAlign: "left"
              }}
              onClick={() => onPick(d)}
            >
              <span className="row__icon">{S.skillIcons[d.skills[0]]}</span>
              <span className="row__main">
                <div className="row__title">{d.title}</div>
                <div className="row__sub">
                  {S.ui.common.minutes(d.minutes)} · {S.iceAreas[d.iceArea]} · {S.kinds[d.kind]}
                </div>
              </span>
              <span className="display" style={{ fontSize: 24 }} aria-hidden="true">
                +
              </span>
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && (
        <p className="sub" style={{ marginTop: 12 }}>
          {S.ui.library.none}
        </p>
      )}
    </Sheet>
  );
}
