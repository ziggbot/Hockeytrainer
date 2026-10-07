import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLink } from "../components/AppLink";
import { BottomNav, TopBar } from "../components/Chrome";
import { Check } from "../components/Check";
import { Sheet } from "../components/Sheet";
import { TimeAndLength } from "../components/TimeAndLength";
import { useNow } from "../components/useNow";
import { currentBlock } from "../domain/curriculum";
import { addDays, toISODate } from "../domain/dates";
import { drillIdsOf } from "../domain/planner";
import { nextSlot, upcomingSlots, type Slot } from "../domain/schedule";
import { SKILLS, type Team } from "../domain/types";
import { S, formatDayLong, formatDayShort, formatTime, relativeDay, shortDay } from "../i18n";
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
          <AppLink to="/lag" className="cta">
            {t.addTimes}
          </AppLink>
        ) : (
          <button type="button" className="cta" onClick={() => setExtraOpen(true)}>
            {t.extra}
          </button>
        )}

        {pos && (
          <p className="sub" style={{ textAlign: "center", marginTop: 4 }}>
            {S.skillIcons[pos.block.focus[0]]} {pos.block.name}
          </p>
        )}

        <section className="section">
          <div className="section__head">
            <h2>{t.thisWeek}</h2>
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
                          {formatTime(slot.start)} · {S.ui.common.minutes(slot.minutes)}
                          {s && ` · ${S.ui.common.drills(count)}`}
                        </div>
                      </span>
                      <Check
                        checked={s?.status === "done"}
                        label={`${relativeDay(slot.date, today)} ${formatTime(slot.start)}`}
                        onChange={(done) => setDone(ensureSession(slot), done)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 8 }}>
            <AppLink to="/lag" className="link">
              {t.changeTimes}
            </AppLink>
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
              <AppLink key={skill} to={`/ovningar?skill=${skill}`} className="chip">
                <span className="chip__icon">{S.skillIcons[skill]}</span>
                {S.skills[skill]}
              </AppLink>
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
        <div className="next__label">{t.nextLabel(`${relativeDay(slot.date, now)} ${formatTime(slot.start)}`)}</div>
        <h2 className="next__title">{plan.title}</h2>
        <div className="next__meta">
          {S.ui.common.drills(count)} · {S.ui.common.minutes(slot.minutes)}
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
  const today = new Date();
  // The next two weeks as tappable days; native date inputs show the phone's
  // region format (e.g. 10/8/2026), not Swedish.
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const [date, setDate] = useState(() => toISODate(today));
  const [time, setTime] = useState({ start: team.schedule[0]?.start ?? "18:00", minutes: team.schedule[0]?.minutes ?? 60 });
  const { start, minutes } = time;
  return (
    <Sheet title={e.title} onClose={onClose}>
      <div className="field">
        <span className="field__label">{e.date}</span>
        <div className="chips" style={{ marginTop: 4 }}>
          {days.map((d) => {
            const iso = toISODate(d);
            const label =
              iso === toISODate(today) || iso === toISODate(addDays(today, 1))
                ? shortDay(iso, today)
                : `${shortDay(iso, today)} ${formatDayShort(d)}`;
            return (
              <button
                key={iso}
                type="button"
                className={`chip chip--sm${iso === date ? " chip--on" : ""}`}
                aria-pressed={iso === date}
                onClick={() => setDate(iso)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="field">
        <span className="field__label">
          {e.start} · {e.length}
        </span>
        <TimeAndLength start={start} minutes={minutes} label={e.title} onChange={setTime} />
      </div>
      <button
        type="button"
        className="cta cta--small"
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
