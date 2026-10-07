import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLink } from "../components/AppLink";
import { BackBar, BottomNav } from "../components/Chrome";
import { Check } from "../components/Check";
import { ConfirmButton } from "../components/ConfirmButton";
import { stationStyle } from "../components/stationColor";
import { DrillPicker } from "../components/DrillPicker";
import { Stepper } from "../components/Stepper";
import { parseISODate, timeToMinutes, minutesToTime } from "../domain/dates";
import {
  toggleFreeZone,
  addStation,
  movePart,
  removePart,
  removeStation,
  setPartMinutes,
  stationLetter,
  swapDrill,
  MAX_STATIONS
} from "../domain/editParts";
import { equipmentFor } from "../domain/equipment";
import { MIN_PART_MINUTES, STEP, partMinutes, totalMinutes } from "../domain/planner";
import { encodeShare } from "../domain/share";
import { NOTE_TAGS, type Drill, type NoteTag, type Session, type SessionPart } from "../domain/types";
import { S, formatDayShort, relativeDay, formatTime } from "../i18n";
import {
  addNote,
  ageGroupOf,
  allDrills,
  deleteSession,
  newPart,
  replanSession,
  setDone,
  setParts,
  toggleEquipment
} from "../store/actions";
import { useAppState } from "../store/store";
import { shareUrl } from "../platform";

const t = S.ui.session;

type PickerTarget = { mode: "add" } | { mode: "swap"; partId: string; station?: number } | { mode: "addStation"; partId: string };

export function SessionScreen() {
  const { id } = useParams();
  const state = useAppState();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [shareFallback, setShareFallback] = useState<string | null>(null);
  const drills = useMemo(() => allDrills(state), [state]);
  const byId = useMemo(() => new Map(drills.map((d) => [d.id, d])), [drills]);

  const session = state.sessions.find((s) => s.id === id);
  const team = session && state.teams.find((x) => x.id === session.teamId);
  if (!session || !team) {
    return (
      <main className="page">
        <BackBar to="/" />
        <p className="sub">{t.notFound}</p>
      </main>
    );
  }

  const ageGroup = ageGroupOf(team);
  const total = totalMinutes(session.parts);
  const diff = total - session.minutes;
  const equipment = equipmentFor(session.parts, byId, team.playerCount);
  const notes = state.notes.filter((n) => n.sessionId === session.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const date = parseISODate(session.date);
  const parts = session.parts;
  const edit = (next: SessionPart[]) => setParts(session.id, next);

  const onPick = (drill: Drill) => {
    if (!picker) return;
    if (picker.mode === "add") edit([...parts, newPart(drill)]);
    if (picker.mode === "swap") edit(swapDrill(parts, picker.partId, drill.id, picker.station));
    if (picker.mode === "addStation") edit(addStation(parts, picker.partId, drill.id));
    setPicker(null);
  };

  const share = async () => {
    const url = shareUrl(encodeShare(session, team.name, byId));
    setShareFallback(null);
    if (navigator.share) {
      try {
        await navigator.share({ title: session.title, text: t.shareText(session.title), url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast(t.copied);
      window.setTimeout(() => setToast(null), 2500);
    } catch {
      // Clipboard refused (some app views): show the link to copy by hand.
      setShareFallback(url);
    }
  };

  // Running clock: each part starts where the previous one ended.
  let clock = timeToMinutes(session.start);

  return (
    <>
      <main className="page">
        <BackBar to="/" />
        <h1 className="title">{session.title}</h1>
        <p className="sub">
          {relativeDay(session.date, new Date())} {formatDayShort(date)} · {formatTime(session.start)} ·{" "}
          {S.ui.common.minutes(session.minutes)}
        </p>
        {session.status === "done" ? (
          <div className="notice">{t.done}</div>
        ) : (
          <AppLink to={`/pass/${session.id}/rink`} className="cta">
            {S.ui.home.go}
          </AppLink>
        )}

        <section className="section">
          <div className="section__head">
            <h2>{t.plan}</h2>
            <button type="button" className="btn" onClick={() => setEditing(!editing)}>
              {editing ? t.stopEdit : t.editPlan}
            </button>
          </div>

          {parts.length === 0 && (
            <p className="sub" style={{ marginTop: 12 }}>
              {t.emptyPlan}
            </p>
          )}

          <ul className="rows">
            {parts.map((part, index) => {
              const startsAt = formatTime(minutesToTime(clock));
              clock += partMinutes(part);
              return (
                <li key={part.id}>
                  {part.type === "drill" ? (
                    <DrillRow drill={byId.get(part.drillId)} label={startsAt} sub={S.ui.common.minutes(part.minutes)} />
                  ) : (
                    <div className="stations">
                      <div className="stations__head">
                        <span className="display" style={{ fontSize: 20 }}>
                          {startsAt} · {t.stations(part.drillIds.length, part.minutesPerStation)}
                        </span>
                      </div>
                      <ul className="rows">
                        {part.drillIds.map((drillId, i) => (
                          <li key={`${drillId}-${i}`}>
                            <DrillRow drill={byId.get(drillId)} letter={stationLetter(i)} />
                            {editing && (
                              <div className="edit-bar edit-bar--station">
                                <span className="edit-bar__actions">
                                  <button
                                    type="button"
                                    className="btn btn--icon"
                                    onClick={() => setPicker({ mode: "swap", partId: part.id, station: i })}
                                  >
                                    {t.swap}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn--icon"
                                    aria-label={t.remove}
                                    onClick={() => edit(removeStation(parts, part.id, i))}
                                  >
                                    ✕
                                  </button>
                                </span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                      {part.freeZone && <FreeZoneRow />}
                      {editing && (
                        <div className="edit-bar">
                          {part.drillIds.length < MAX_STATIONS && (
                            <button
                              type="button"
                              className="link"
                              onClick={() => setPicker({ mode: "addStation", partId: part.id })}
                            >
                              + {t.addStation}
                            </button>
                          )}
                          <button
                            type="button"
                            className={`chip chip--sm${part.freeZone ? " chip--on" : ""}`}
                            aria-pressed={!!part.freeZone}
                            onClick={() => edit(toggleFreeZone(parts, part.id))}
                          >
                            {t.freeZone}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {editing && (
                    <div className="edit-bar" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                      <Stepper
                        value={part.type === "drill" ? part.minutes : part.minutesPerStation}
                        onChange={(m) => edit(setPartMinutes(parts, part.id, m))}
                        min={MIN_PART_MINUTES}
                        max={60}
                        step={STEP}
                        label={part.type === "drill" ? S.ui.common.min : t.perStation}
                        format={S.ui.common.minutes}
                      />
                      <span className="edit-bar__actions">
                        <button
                          type="button"
                          className="btn btn--icon"
                          aria-label={t.up}
                          disabled={index === 0}
                          onClick={() => edit(movePart(parts, index, -1))}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn--icon"
                          aria-label={t.down}
                          disabled={index === parts.length - 1}
                          onClick={() => edit(movePart(parts, index, 1))}
                        >
                          ↓
                        </button>
                        {part.type === "drill" && (
                          <button
                            type="button"
                            className="btn btn--icon"
                            onClick={() => setPicker({ mode: "swap", partId: part.id })}
                          >
                            {t.swap}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn--icon"
                          aria-label={t.remove}
                          onClick={() => edit(removePart(parts, part.id))}
                        >
                          ✕
                        </button>
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <PlanTotal total={total} slot={session.minutes} diff={diff} />

          {editing && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
              <button type="button" className="btn" onClick={() => setPicker({ mode: "add" })}>
                + {t.addDrill}
              </button>
              <ConfirmButton
                label={`↻ ${t.newSuggestion}`}
                confirmLabel={t.newSuggestionConfirm}
                onConfirm={() => replanSession(session.id)}
              />
            </div>
          )}
        </section>

        <section className="section">
          <div className="section__head">
            <h2>{t.equipment}</h2>
          </div>
          {equipment.length === 0 ? (
            <p className="sub" style={{ marginTop: 12 }}>
              {t.noEquipment}
            </p>
          ) : (
            <ul className="rows">
              {equipment.map((line) => (
                <li key={line.item} className="row row--compact">
                  <span className="row__icon">{EQUIPMENT_ICONS[line.item]}</span>
                  <span className="row__main">
                    <div className="row__title">
                      {S.equipment[line.item]} <span className="muted">· {line.count}</span>
                    </div>
                  </span>
                  <Check
                    checked={session.equipmentChecked.includes(line.item)}
                    label={S.equipment[line.item]}
                    onChange={() => toggleEquipment(session.id, line.item)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <NotesSection session={session} notes={notes} />

        <section className="section">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={share}>
              ↗ {t.share}
            </button>
            <button type="button" className="btn" onClick={() => setDone(session.id, session.status !== "done")}>
              {session.status === "done" ? t.markPlanned : t.markDone}
            </button>
          </div>
          {toast && <p className="notice">{toast}</p>}
          {shareFallback && (
            <input
              className="input"
              readOnly
              aria-label={t.share}
              value={shareFallback}
              onFocus={(e) => e.target.select()}
              style={{ marginTop: 12, fontSize: 15 }}
            />
          )}
          <ConfirmButton
            className="link link--danger"
            style={{ marginTop: 18, display: "block" }}
            label={t.deleteSession}
            confirmLabel={S.ui.common.tapAgainDelete}
            onConfirm={() => {
              deleteSession(session.id);
              navigate("/");
            }}
          />
        </section>
      </main>
      <BottomNav />
      {picker && (
        <DrillPicker
          title={picker.mode === "swap" ? t.swap : picker.mode === "addStation" ? t.addStation : t.addDrill}
          drills={drills}
          ageGroup={ageGroup}
          onPick={onPick}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}

export const EQUIPMENT_ICONS: Record<string, string> = {
  pucks: "⚫",
  cones: "🔺",
  pinnies: "🎽",
  smallNets: "🥅",
  goals: "🥅",
  tires: "⭕",
  sticksOnIce: "🏒"
};

export function DrillRow({
  drill,
  label,
  sub,
  letter
}: {
  drill: Drill | undefined;
  label?: string;
  sub?: string;
  letter?: string;
}) {
  const body = (
    <>
      <span className="row__icon">{drill ? S.skillIcons[drill.skills[0]] : "?"}</span>
      {label !== undefined && (
        <span className="row__day" style={{ fontSize: 24 }}>
          {label}
        </span>
      )}
      <span className="row__main">
        <div className="row__title">{drill ? drill.title : S.ui.common.unknownDrill}</div>
        {drill && sub && <div className="row__sub">{sub}</div>}
      </span>
      {letter ? (
        <span className="station-letter" style={stationStyle(letter.charCodeAt(0) - 65)}>
          {letter}
        </span>
      ) : (
        <span aria-hidden="true" className="muted">
          ›
        </span>
      )}
    </>
  );
  const cls = `row${label === undefined ? " row--compact" : ""}`;
  return drill ? (
    <AppLink to={`/ovningar/${drill.id}`} className={cls}>
      {body}
    </AppLink>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** The open area in the neutral zone during a rotation. */
export function FreeZoneRow() {
  return (
    <div className="row row--compact">
      <span className="row__icon">⭕</span>
      <span className="row__main">
        <div className="row__title">{t.freeZone}</div>
      </span>
      <span />
    </div>
  );
}

export function PlanTotal({ total, slot, diff }: { total: number; slot: number; diff: number }) {
  return (
    <div className={`plan-total${diff > 0 ? " plan-total--over" : ""}`}>
      <span className="display" style={{ fontSize: 20 }}>
        {t.total(total, slot)}
      </span>
      {diff !== 0 && <span>{diff > 0 ? t.over(diff) : t.under(-diff)}</span>}
    </div>
  );
}

function NotesSection({
  session,
  notes
}: {
  session: Session;
  notes: { id: string; text: string; tags: NoteTag[]; createdAt: string }[];
}) {
  const [text, setText] = useState("");
  const [tags, setTags] = useState<NoteTag[]>([]);
  return (
    <section className="section">
      <div className="section__head">
        <h2>{t.notes}</h2>
      </div>
      <NoteForm text={text} tags={tags} onText={setText} onTags={setTags} />
      <button
        type="button"
        className="btn"
        style={{ marginTop: 10 }}
        disabled={!text.trim() && tags.length === 0}
        onClick={() => {
          addNote(session.id, text, tags);
          setText("");
          setTags([]);
        }}
      >
        {t.addNote}
      </button>
      {notes.length > 0 && (
        <ul className="rows">
          {notes.map((n) => (
            <li key={n.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <div className="row__sub">{formatDayShort(new Date(n.createdAt))}</div>
              {n.tags.length > 0 && (
                <div className="tags">
                  {n.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {S.noteTags[tag]}
                    </span>
                  ))}
                </div>
              )}
              {n.text && <div style={{ marginTop: 4 }}>{n.text}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function NoteForm({
  text,
  tags,
  onText,
  onTags
}: {
  text: string;
  tags: NoteTag[];
  onText: (s: string) => void;
  onTags: (t: NoteTag[]) => void;
}) {
  return (
    <>
      <div className="chips">
        {NOTE_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`chip chip--sm${tags.includes(tag) ? " chip--on" : ""}`}
            aria-pressed={tags.includes(tag)}
            onClick={() => onTags(tags.includes(tag) ? tags.filter((x) => x !== tag) : [...tags, tag])}
          >
            {S.noteTags[tag]}
          </button>
        ))}
      </div>
      <textarea
        className="input"
        style={{ marginTop: 12 }}
        value={text}
        placeholder={t.notePlaceholder}
        onChange={(e) => onText(e.target.value)}
      />
    </>
  );
}
