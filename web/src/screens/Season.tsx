import { useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLink } from "../components/AppLink";
import { BottomNav, TopBar } from "../components/Chrome";
import { Sheet } from "../components/Sheet";
import { Stepper } from "../components/Stepper";
import { currentBlock, weekInBlock } from "../domain/curriculum";
import { isoWeek, parseISODate } from "../domain/dates";
import { drillIdsOf } from "../domain/planner";
import { SKILLS, type SeasonBlock, type Skill } from "../domain/types";
import { S, formatDayShort } from "../i18n";
import { activeTeam, ageGroupOf, allDrills, curriculumOf, updateBlock, updatePhilosophy } from "../store/actions";
import { useAppState } from "../store/store";

const t = S.ui.season;

/** Season plan for the active team's age group + what has been covered (spec §5.2, §5.10). */
export function Season() {
  const state = useAppState();
  const team = activeTeam(state);
  const [editing, setEditing] = useState<SeasonBlock | null>(null);
  const [editingPhilosophy, setEditingPhilosophy] = useState(false);
  if (!team) return <Navigate to="/" replace />;

  const curriculum = curriculumOf(team, state);
  const ageGroup = ageGroupOf(team);
  const now = new Date();
  const pos = currentBlock(curriculum, now);
  const drillsById = new Map(allDrills(state).map((d) => [d.id, d]));
  const done = state.sessions.filter((s) => s.teamId === team.id && s.status === "done");

  /** Done sessions in a block and the skills their drills trained. */
  const coverage = (block: SeasonBlock) => {
    const sessions = done.filter((s) => weekInBlock(isoWeek(parseISODate(s.date)), block));
    const trained = new Set<Skill>(
      sessions.flatMap((s) => drillIdsOf(s.parts).flatMap((id) => drillsById.get(id)?.skills ?? []))
    );
    return { count: sessions.length, trained };
  };

  const recent = [...done].sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start)).slice(0, 10);

  return (
    <>
      <main className="page">
        <TopBar />
        <h1 className="title">{t.title}</h1>
        <p className="sub">{t.sub(ageGroup.name, curriculum?.blocks.length ?? 0)}</p>

        <section className="section">
          <div className="section__head">
            <h2>{t.blocks}</h2>
          </div>
          <ul className="rows">
            {curriculum?.blocks.map((block) => {
              const isNow = pos?.block.id === block.id;
              const cov = coverage(block);
              return (
                <li key={block.id}>
                  <div
                    className="row row--compact"
                    style={isNow ? { background: "var(--accent-soft)", margin: "0 -14px", padding: "12px 14px" } : undefined}
                  >
                    <span className="row__icon">{S.skillIcons[block.focus[0]]}</span>
                    <span className="row__main">
                      <div className="row__title">{block.name}</div>
                      <div className="row__sub">
                        {isNow && pos ? t.now(pos.weekIndex, pos.weekCount) : S.ui.common.weeks(block.startWeek, block.endWeek)} ·{" "}
                        {t.coverage(cov.count)}
                      </div>
                      <div className="tags">
                        {block.focus.map((s) => (
                          <span key={s} className="tag">
                            {S.skills[s]} {cov.trained.has(s) ? "✓" : ""}
                          </span>
                        ))}
                      </div>
                    </span>
                    <button type="button" className="btn btn--icon" onClick={() => setEditing(block)}>
                      {S.ui.common.edit}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {curriculum && (
          <section className="section">
            <div className="section__head">
              <h2>{t.philosophy}</h2>
              <button type="button" className="btn btn--icon" onClick={() => setEditingPhilosophy(true)}>
                {S.ui.common.edit}
              </button>
            </div>
            <p style={{ fontSize: 20 }}>{curriculum.philosophy}</p>
            <p className="sub">
              <strong className="display" style={{ fontSize: 18, color: "var(--ink)" }}>
                {t.gameFormat}:
              </strong>{" "}
              {ageGroup.gameFormat}
            </p>
            <div className="tags" style={{ marginTop: 10 }}>
              {curriculum.targetSkills.map((s) => (
                <span key={s} className="tag">
                  <span className="chip__icon">{S.skillIcons[s]}</span> {S.skills[s]}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <div className="section__head">
            <h2>{t.recent}</h2>
          </div>
          {recent.length === 0 && (
            <p className="sub" style={{ marginTop: 12 }}>
              {t.noRecent}
            </p>
          )}
          <ul className="rows">
            {recent.map((s) => {
              const notes = state.notes.filter((n) => n.sessionId === s.id);
              const tags = [...new Set(notes.flatMap((n) => n.tags))];
              const text = notes
                .map((n) => n.text)
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={s.id}>
                  <AppLink to={`/pass/${s.id}`} className="row">
                    <span className="row__icon">{s.focus?.[0] ? S.skillIcons[s.focus[0]] : "🏒"}</span>
                    <span className="row__day" style={{ fontSize: 22 }}>
                      {formatDayShort(parseISODate(s.date))}
                    </span>
                    <span className="row__main">
                      <div className="row__title">{s.title}</div>
                      {text && <div className="row__sub">{text}</div>}
                      {tags.length > 0 && (
                        <div className="tags">
                          {tags.map((tag) => (
                            <span key={tag} className="tag">
                              {S.noteTags[tag]}
                            </span>
                          ))}
                        </div>
                      )}
                    </span>
                    <span aria-hidden="true" className="muted">
                      ›
                    </span>
                  </AppLink>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
      <BottomNav />
      {editing && (
        <BlockSheet
          block={editing}
          onClose={() => setEditing(null)}
          onSave={(b) => {
            updateBlock(team.ageGroupId, b);
            setEditing(null);
          }}
        />
      )}
      {editingPhilosophy && curriculum && (
        <PhilosophySheet
          text={curriculum.philosophy}
          onClose={() => setEditingPhilosophy(false)}
          onSave={(text) => {
            updatePhilosophy(team.ageGroupId, text);
            setEditingPhilosophy(false);
          }}
        />
      )}
    </>
  );
}

function BlockSheet({ block, onClose, onSave }: { block: SeasonBlock; onClose: () => void; onSave: (b: SeasonBlock) => void }) {
  const [name, setName] = useState(block.name);
  const [startWeek, setStartWeek] = useState(block.startWeek);
  const [endWeek, setEndWeek] = useState(block.endWeek);
  const [focus, setFocus] = useState<Skill[]>(block.focus);
  // Max two focus skills (spec §4): picking a third drops the oldest.
  const toggle = (s: Skill) =>
    setFocus((f) => (f.includes(s) ? (f.length > 1 ? f.filter((x) => x !== s) : f) : [...f, s].slice(-2)));
  return (
    <Sheet title={t.editBlock} onClose={onClose}>
      <label className="field">
        <span className="field__label">{t.name}</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <div className="field">
          <span className="field__label">{t.startWeek}</span>
          <Stepper value={startWeek} onChange={setStartWeek} min={1} max={53} label={t.startWeek} format={S.ui.common.week} />
        </div>
        <div className="field">
          <span className="field__label">{t.endWeek}</span>
          <Stepper value={endWeek} onChange={setEndWeek} min={1} max={53} label={t.endWeek} format={S.ui.common.week} />
        </div>
      </div>
      <div className="field">
        <span className="field__label">{t.focus}</span>
        <div className="chips" style={{ marginTop: 4 }}>
          {SKILLS.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip chip--sm${focus.includes(s) ? " chip--on" : ""}`}
              aria-pressed={focus.includes(s)}
              onClick={() => toggle(s)}
            >
              <span className="chip__icon">{S.skillIcons[s]}</span>
              {S.skills[s]}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="cta cta--small"
        disabled={!name.trim()}
        onClick={() => onSave({ ...block, name: name.trim(), startWeek, endWeek, focus })}
      >
        {S.ui.common.save}
      </button>
    </Sheet>
  );
}

function PhilosophySheet({ text, onClose, onSave }: { text: string; onClose: () => void; onSave: (t: string) => void }) {
  const [value, setValue] = useState(text);
  return (
    <Sheet title={t.philosophy} onClose={onClose}>
      <textarea
        className="input"
        style={{ marginTop: 12, minHeight: 160 }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="button" className="cta cta--small" onClick={() => onSave(value.trim())}>
        {S.ui.common.save}
      </button>
    </Sheet>
  );
}
