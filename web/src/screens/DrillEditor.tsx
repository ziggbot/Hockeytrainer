import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackBar } from "../components/Chrome";
import { SketchEditor } from "../components/SketchEditor";
import { SketchView } from "../components/SketchView";
import type { Sketch, SketchSurface } from "../domain/sketch";
import { Stepper } from "../components/Stepper";
import { STEP, roundToStep } from "../domain/planner";
import type { Area, Drill, DrillKind, EquipmentItem, Skill } from "../domain/types";
import { S } from "../i18n";
import { activeTeam, ageGroupOf, saveOwnDrill } from "../store/actions";
import { newId, useAppState } from "../store/store";
import { SPORT } from "../sport";

const t = S.ui.editor;
const KINDS: DrillKind[] = ["warmup", "drill", "game"];

/** Shrink a photo to a reasonable data URL so it fits in local storage. */
async function imageToDataUrl(file: File, maxSide = 1200): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/** The drill area that matches what was drawn. */
const AREA_OF: Record<SketchSurface, Area> = {
  full: "full",
  half: "half",
  zone: SPORT.id === "innebandy" ? "station" : "third"
};

/** Create or edit a coach's own drill (private to this device until sync exists). */
export function DrillEditor({ startDrawing = false }: { startDrawing?: boolean }) {
  const { id } = useParams();
  const state = useAppState();
  const navigate = useNavigate();
  const existing = id ? state.ownDrills.find((d) => d.id === id) : undefined;
  const team = activeTeam(state);
  const ag = team ? ageGroupOf(team) : undefined;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [points, setPoints] = useState(existing?.coachingPoints.join("\n") ?? "");
  const [skills, setSkills] = useState<Skill[]>(existing?.skills ?? []);
  const [kind, setKind] = useState<DrillKind>(existing?.kind ?? "drill");
  const [ageMin, setAgeMin] = useState(existing?.ageMin ?? ag?.ageMin ?? 8);
  const [ageMax, setAgeMax] = useState(existing?.ageMax ?? ag?.ageMax ?? 12);
  const [minutes, setMinutes] = useState(roundToStep(existing?.minutes ?? 10));
  const [iceArea, setIceArea] = useState<Area>(existing?.iceArea ?? "half");
  const [minPlayers, setMinPlayers] = useState(existing?.minPlayers ?? 1);
  const [equipment, setEquipment] = useState<Partial<Record<EquipmentItem, number>>>(
    Object.fromEntries((existing?.equipment ?? []).map((e) => [e.item, typeof e.count === "number" ? e.count : 0]))
  );
  // Pucks or balls: one per player, or a count.
  const perItem = SPORT.perPlayerItem;
  const [perPlayer, setPerPlayer] = useState(
    existing?.equipment.some((e) => e.item === perItem && e.count === "perPlayer") ?? false
  );
  const [diagram, setDiagram] = useState<string | undefined>(existing?.diagram);
  const [sketch, setSketch] = useState<Sketch | undefined>(existing?.sketch);
  const [drawing, setDrawing] = useState(startDrawing && !existing);
  const [error, setError] = useState<string | null>(null);

  const toggleSkill = (s: Skill) => setSkills((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]));

  const save = () => {
    if (!title.trim()) return setError(t.needName);
    const drill: Drill = {
      id: existing?.id ?? `own-${newId()}`,
      title: title.trim(),
      description: description.trim(),
      coachingPoints: points
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean),
      skills: skills.length > 0 ? skills : ["gameSense"],
      kind,
      ageMin: Math.min(ageMin, ageMax),
      ageMax: Math.max(ageMin, ageMax),
      minutes,
      iceArea,
      minPlayers,
      equipment: [
        ...(perPlayer ? [{ item: perItem, count: "perPlayer" as const }] : []),
        ...SPORT.equipment
          .filter((item) => (equipment[item] ?? 0) > 0 && !(item === perItem && perPlayer))
          .map((item) => ({
            item,
            count: equipment[item]!
          }))
      ],
      diagram,
      ...(sketch ? { sketch } : {}),
      visibility: "private",
      source: "own"
    };
    saveOwnDrill(drill);
    navigate(`/ovningar/${drill.id}`, { replace: true });
  };

  return (
    <main className="page page--bare">
      <BackBar />
      <h1 className="title">{existing ? t.editTitle : t.newTitle}</h1>

      <label className="field">
        <span className="field__label">{t.name}</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className="field">
        <span className="field__label">{t.description}</span>
        <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <label className="field">
        <span className="field__label">{t.points}</span>
        <textarea className="input" value={points} onChange={(e) => setPoints(e.target.value)} />
        <span className="field__hint">{t.pointsHint}</span>
      </label>

      <div className="field">
        <span className="field__label">{t.skills}</span>
        <div className="chips" style={{ marginTop: 4 }}>
          {SPORT.skills.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip chip--sm${skills.includes(s) ? " chip--on" : ""}`}
              aria-pressed={skills.includes(s)}
              onClick={() => toggleSkill(s)}
            >
              <span className="chip__icon">{S.skillIcons[s]}</span>
              {S.skills[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field__label">{t.kind}</span>
        <div className="chips" style={{ marginTop: 4 }}>
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className={`chip chip--sm${kind === k ? " chip--on" : ""}`}
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              {S.kinds[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field__label">{t.area}</span>
        <div className="chips" style={{ marginTop: 4 }}>
          {SPORT.areas.map((a) => (
            <button
              key={a}
              type="button"
              className={`chip chip--sm${iceArea === a ? " chip--on" : ""}`}
              aria-pressed={iceArea === a}
              onClick={() => setIceArea(a)}
            >
              {S.iceAreas[a]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field__label">{t.ages}</span>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <span className="muted">{t.from}</span>
          <Stepper value={ageMin} onChange={setAgeMin} min={4} max={20} label={`${t.ages} ${t.from}`} />
          <span className="muted">{t.to}</span>
          <Stepper value={ageMax} onChange={setAgeMax} min={4} max={20} label={`${t.ages} ${t.to}`} />
        </div>
      </div>

      <div className="field">
        <span className="field__label">{t.length}</span>
        <Stepper
          value={minutes}
          onChange={setMinutes}
          min={STEP}
          max={60}
          step={STEP}
          label={t.length}
          format={S.ui.common.minutes}
        />
      </div>

      <div className="field">
        <span className="field__label">{t.minPlayers}</span>
        <Stepper value={minPlayers} onChange={setMinPlayers} min={1} max={30} label={t.minPlayers} />
      </div>

      <div className="field">
        <span className="field__label">{t.equipment}</span>
        <ul className="rows">
          {SPORT.equipment.map((item) => (
            <li key={item} className="row row--compact">
              <span className="row__icon" />
              <span className="row__title">{S.equipment[item]}</span>
              {item === perItem ? (
                <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className={`chip chip--sm${perPlayer ? " chip--on" : ""}`}
                    aria-pressed={perPlayer}
                    onClick={() => setPerPlayer(!perPlayer)}
                  >
                    {S.ui.drill.perPlayer}
                  </button>
                  {!perPlayer && (
                    <Stepper
                      value={equipment[perItem] ?? 0}
                      onChange={(v) => setEquipment({ ...equipment, [perItem]: v })}
                      min={0}
                      max={60}
                      label={S.equipment[perItem]}
                    />
                  )}
                </span>
              ) : (
                <Stepper
                  value={equipment[item] ?? 0}
                  onChange={(v) => setEquipment({ ...equipment, [item]: v })}
                  min={0}
                  max={40}
                  label={S.equipment[item]}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="field">
        <span className="field__label">{t.diagram}</span>
        <span className="field__hint">{t.diagramHint}</span>
        {sketch && (
          <button type="button" className="sketch-open" onClick={() => setDrawing(true)} aria-label={t.editSketch}>
            <SketchView sketch={sketch} />
          </button>
        )}
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={() => setDrawing(true)}>
            ✏️ {sketch ? t.editSketch : t.draw}
          </button>
          {sketch && (
            <button type="button" className="link link--danger" onClick={() => setSketch(undefined)}>
              {t.removeSketch}
            </button>
          )}
        </div>
        {diagram && <img src={diagram} alt="" style={{ display: "block", width: "100%", marginTop: 10, borderRadius: 12 }} />}
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) setDiagram(await imageToDataUrl(file));
            }}
          />
          {diagram && (
            <button type="button" className="link link--danger" onClick={() => setDiagram(undefined)}>
              {t.removeDiagram}
            </button>
          )}
        </div>
      </div>

      {error && <p className="notice notice--warn">{error}</p>}
      <button type="button" className="cta" onClick={save}>
        {S.ui.common.save}
      </button>

      {drawing && (
        <SketchEditor
          initial={sketch}
          onCancel={() => setDrawing(false)}
          onDone={(next) => {
            setSketch(next);
            // A new drill takes its area from what was drawn.
            if (next && !existing) setIceArea(AREA_OF[next.surface]);
            setDrawing(false);
          }}
        />
      )}
    </main>
  );
}
