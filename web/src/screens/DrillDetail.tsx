import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLink } from "../components/AppLink";
import { BackBar, BottomNav } from "../components/Chrome";
import { ConfirmButton } from "../components/ConfirmButton";
import { RinkDiagram } from "../components/RinkDiagram";
import { Sheet } from "../components/Sheet";
import { upcomingSlots } from "../domain/schedule";
import type { Drill, EquipmentNeed } from "../domain/types";
import { S, formatTime, relativeDay } from "../i18n";
import { activeTeam, allDrills, deleteOwnDrill, newPart, planSession, setParts } from "../store/actions";
import { getState, useAppState } from "../store/store";
import { EQUIPMENT_ICONS } from "./SessionScreen";

const t = S.ui.drill;

export function equipmentCount(need: EquipmentNeed): string {
  if (need.count === "perPlayer") return t.perPlayer;
  if (need.count === "perPair") return t.perPair;
  return String(need.count);
}

export function DrillDetail() {
  const { id } = useParams();
  const state = useAppState();
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const drill = allDrills(state).find((d) => d.id === id);

  if (!drill) {
    return (
      <main className="page">
        <BackBar to="/ovningar" />
        <p className="sub">{S.ui.common.unknownDrill}</p>
      </main>
    );
  }

  return (
    <>
      <main className="page">
        <BackBar />
        <h1 className="title">{drill.title}</h1>
        <div className="tags">
          {drill.skills.map((s) => (
            <span key={s} className="tag">
              <span className="chip__icon">{S.skillIcons[s]}</span> {S.skills[s]}
            </span>
          ))}
        </div>
        <p className="sub" style={{ marginTop: 8 }}>
          {S.ui.common.minutes(drill.minutes)} · {S.ui.common.years(drill.ageMin, drill.ageMax)}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
          <RinkDiagram area={drill.iceArea} width={150} />
          <span className="display" style={{ fontSize: 22 }}>
            {S.iceAreas[drill.iceArea]}
          </span>
        </div>
        {drill.diagram && (
          <img src={drill.diagram} alt="" style={{ display: "block", width: "100%", marginTop: 16, borderRadius: 12 }} />
        )}

        <p style={{ marginTop: 16, fontSize: 20 }}>{drill.description}</p>

        <section className="section">
          <div className="section__head">
            <h2>{t.coachingPoints}</h2>
          </div>
          <ul className="points" style={{ fontSize: 20 }}>
            {drill.coachingPoints.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>

        {drill.equipment.length > 0 && (
          <section className="section">
            <div className="section__head">
              <h2>{t.equipment}</h2>
            </div>
            <ul className="rows">
              {drill.equipment.map((need) => (
                <li key={need.item} className="row row--compact">
                  <span className="row__icon">{EQUIPMENT_ICONS[need.item]}</span>
                  <span className="row__title">{S.equipment[need.item]}</span>
                  <span className="muted">{equipmentCount(need)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {activeTeam(state) && (
          <button type="button" className="cta cta--small" onClick={() => setPicking(true)}>
            {added ?? t.addToSession}
          </button>
        )}

        {drill.source === "own" && (
          <div style={{ display: "flex", gap: 20, marginTop: 24 }}>
            <AppLink to={`/ovningar/${drill.id}/andra`} className="link">
              {t.editOwn}
            </AppLink>
            <ConfirmButton
              className="link link--danger"
              label={t.deleteOwn}
              confirmLabel={S.ui.common.tapAgainDelete}
              onConfirm={() => {
                deleteOwnDrill(drill.id);
                navigate("/ovningar", { replace: true });
              }}
            />
          </div>
        )}
      </main>
      <BottomNav />
      {picking && (
        <AddToSessionSheet
          drill={drill}
          onClose={() => setPicking(false)}
          onAdded={(label) => {
            setPicking(false);
            setAdded(`${t.added} ${label}`);
          }}
        />
      )}
    </>
  );
}

function AddToSessionSheet({ drill, onClose, onAdded }: { drill: Drill; onClose: () => void; onAdded: (label: string) => void }) {
  const state = useAppState();
  const team = activeTeam(state)!;
  const today = new Date();
  const slots = upcomingSlots(team, state.sessions, today, 14).filter((s) => s.session?.status !== "done");
  return (
    <Sheet title={t.pickSession} onClose={onClose}>
      {slots.length === 0 && <p className="sub">{t.noSessions}</p>}
      <ul className="rows">
        {slots.map((slot) => {
          const label = `${relativeDay(slot.date, today)} ${formatTime(slot.start)}`;
          return (
            <li key={`${slot.date} ${slot.start}`}>
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
                onClick={() => {
                  const id = slot.session?.id ?? planSession(team, slot.date, slot.start, slot.minutes);
                  const session = getState().sessions.find((s) => s.id === id)!;
                  setParts(id, [...session.parts, newPart(drill)]);
                  onAdded(label);
                }}
              >
                <span className="row__icon">🏒</span>
                <span className="row__main">
                  <div className="row__title">{label}</div>
                  <div className="row__sub">{slot.session?.title ?? S.ui.home.unplanned}</div>
                </span>
                <span className="display" style={{ fontSize: 24 }} aria-hidden="true">
                  +
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
