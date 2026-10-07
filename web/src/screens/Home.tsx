import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BottomNav, TopBar } from "../components/Chrome";
import { Check } from "../components/Check";
import { Sheet } from "../components/Sheet";
import { Stepper } from "../components/Stepper";
import { useNow } from "../components/useNow";
import { currentBlock } from "../domain/curriculum";
import { addDays, toISODate } from "../domain/dates";
import { drillIdsOf } from "../domain/planner";
import { nextSlot, upcomingSlots, type Slot } from "../domain/schedule";
import { SKILLS, type Team } from "../domain/types";
import { S, formatDayLong, relativeDay, shortDay } from "../i18n";
import { activeTeam, curriculumOf, planSession, previewPlan, setDone } from "../store/actions";
import { useAppState } from "../store/store";
import { Onboarding } from "./Onboarding";

const t = S.ui.home;

export function Home() {
  const state = useAppState();
  const team = activeTeam(state);
  const now = useNow();
  const navigate = useNavigate();
  const [extraOpen, setExtraOpen] = useState(false);

  if (!team) return <Onboarding />;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const pos = currentBlock(curriculumOf(team, state), now);
  const slots = upcomingSlots(team, state.sessions, today, 7);
  const next = nextSlot(slots, now);
  const doneCount = slots.filter((s) => s.session?.status === "done").length;

  /** Planned session id for a slot, planning it from the season block if needed. */
  const ensureSession = (slot: Slot) => slot.session?.id ?? planSession(team, slot.date, slot.start, slot.minutes);

  return (
    <>
      <main className="page">
        <TopBar />
        <h1 className="hello">{t.hello}</h1>
        <p className="sub">
          {formatDayLong(now)} · {t.doneCount(doneCount, slots.length)}
        </p>

        {next ? (
          <NextUp
            team={team}
            slot={next}
            now={today}
            onGo={() => navigate(`/pass/${ensureSession(next)}/rink`)}
            onOpen={() => navigate(`/pass/${ensureSession(next)}`)}
          />
        ) : team.schedule.length === 0 ? (
          <Link to="/lag" className="cta">
            {t.addTimes}
          </Link>
        ) : (
          <button type="button" className="cta" onClick={() => setExtraOpen(true)}>
            {t.extra}
          </button>
        )}

        {pos && (
          <p className="sub" style={{ textAlign: "center", marginTop: 4 }}>
            {S.skillIcons[pos.block.focus[0]]} {t.blockLine(pos.block.name, pos.weekIndex, pos.weekCount)}
          </p>
        )}

        <section className="section">
          <div className="section__head">
            <h2>{t.thisWeek}</h2>
            <span className="section__note">{t.thisWeekNote}</span>
          </div>
          {slots.length === 0 ? (
            <p className="sub" style={{ marginTop: 14 }}>
              {t.noSlots}
            </p>
          ) : (
            <ul className="rows">
              {slots.map((slot) => {
                const s = slot.session;
                const count = s ? drillIdsOf(s.parts).length : 0;
                const icon = s?.focus?.[0] ? S.skillIcons[s.focus[0]] : "🏒";
                return (
                  <li key={`${slot.date} ${slot.start}`}>
                    <div
                      className="row"
                      role="link"
                      tabIndex={0}
                      onClick={() => navigate(`/pass/${ensureSession(slot)}`)}
                      onKeyDown={(e) => e.key === "Enter" && navigate(`/pass/${ensureSession(slot)}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <span className="row__icon">{icon}</span>
                      <span className="row__day">{shortDay(slot.date, today)}</span>
                      <span className="row__main">
                        <div className="row__title">{s ? s.title : t.unplanned}</div>
                        <div className="row__sub">
                          {slot.start} · {S.ui.common.minutes(slot.minutes)}
                          {s && ` · ${S.ui.common.drills(count)}`}
                        </div>
                      </span>
                      <Check
                        checked={s?.status === "done"}
                        label={`${relativeDay(slot.date, today)} ${slot.start}`}
                        onChange={(done) => setDone(ensureSession(slot), done)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 8 }}>
            <Link to="/lag" className="link">
              {t.changeTimes}
            </Link>
            <button type="button" className="link" onClick={() => setExtraOpen(true)}>
              {t.extra}
            </button>
          </div>
        </section>

        <section className="section">
          <div className="section__head">
            <h2>{t.findDrill}</h2>
          </div>
          <div className="chips">
            {SKILLS.map((skill) => (
              <Link key={skill} to={`/ovningar?skill=${skill}`} className="chip">
                <span className="chip__icon">{S.skillIcons[skill]}</span>
                {S.skills[skill]}
              </Link>
            ))}
          </div>
        </section>

        <p className="footer-note">{t.footer}</p>
      </main>
      <BottomNav />
      {extraOpen && (
        <ExtraSessionSheet team={team} onClose={() => setExtraOpen(false)} onCreated={(id) => navigate(`/pass/${id}`)} />
      )}
    </>
  );
}

function NextUp({ team, slot, now, onGo, onOpen }: { team: Team; slot: Slot; now: Date; onGo: () => void; onOpen: () => void }) {
  const plan = slot.session ?? previewPlan(team, slot.date, slot.minutes);
  const count = drillIdsOf(plan.parts).length;
  return (
    <>
      <button type="button" className="cta" onClick={onGo}>
        {t.go}
      </button>
      <div className="next">
        <div className="next__label">{t.nextLabel(`${relativeDay(slot.date, now)} ${slot.start}`)}</div>
        <h2 className="next__title">{plan.title}</h2>
        <div className="next__meta">
          {S.ui.common.drills(count)} · {S.ui.common.minutes(slot.minutes)}
          {!slot.session && ` · ${t.suggestion.toLowerCase()}`}
        </div>
        <button type="button" className="link" onClick={onOpen}>
          {t.showPlan}
        </button>
      </div>
    </>
  );
}

function ExtraSessionSheet({ team, onClose, onCreated }: { team: Team; onClose: () => void; onCreated: (id: string) => void }) {
  const e = S.ui.extra;
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [start, setStart] = useState(team.schedule[0]?.start ?? "18:00");
  const [minutes, setMinutes] = useState(team.schedule[0]?.minutes ?? 60);
  const max = toISODate(addDays(new Date(), 365));
  return (
    <Sheet title={e.title} onClose={onClose}>
      <label className="field">
        <span className="field__label">{e.date}</span>
        <input className="input" type="date" value={date} max={max} onChange={(ev) => setDate(ev.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">{e.start}</span>
        <input className="input" type="time" value={start} onChange={(ev) => setStart(ev.target.value)} />
      </label>
      <div className="field">
        <span className="field__label">{e.length}</span>
        <Stepper
          value={minutes}
          onChange={setMinutes}
          min={15}
          max={180}
          step={5}
          label={e.length}
          format={S.ui.common.minutes}
        />
      </div>
      <button
        type="button"
        className="cta cta--small"
        disabled={!date || !start}
        onClick={() => {
          const id = planSession(team, date, start, minutes);
          onClose();
          onCreated(id);
        }}
      >
        {e.add}
      </button>
    </Sheet>
  );
}
