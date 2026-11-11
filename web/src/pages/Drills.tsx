import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, type Drill, type EquipmentLine, type IceArea } from '../api';
import { Card, ErrorBox, Loading, Tag, TagPicker, useAsyncAction } from '../components/ui';
import { t } from '../i18n/sv';
import { useLoad, useMe } from '../state';

const ICE_AREAS: IceArea[] = ['full', 'half', 'third', 'station'];

export interface DrillFilter {
  q: string;
  tag: string;
  age: string;
  maxDuration: string;
  iceArea: string;
}

export function drillQuery(clubId: string | null, f: DrillFilter): string {
  const p = new URLSearchParams();
  if (clubId) p.set('clubId', clubId);
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  return `/drills?${p.toString()}`;
}

export function DrillFilters({ value, onChange }: { value: DrillFilter; onChange: (f: DrillFilter) => void }) {
  return (
    <div className="filters">
      <input
        type="search"
        placeholder={t.drills.search}
        value={value.q}
        onChange={(e) => onChange({ ...value, q: e.target.value })}
        aria-label={t.drills.search}
      />
      <select value={value.tag} onChange={(e) => onChange({ ...value, tag: e.target.value })} aria-label={t.drills.tag}>
        <option value="">{t.drills.allTags}</option>
        {t.skills.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={4}
        max={25}
        placeholder={t.drills.age}
        value={value.age}
        onChange={(e) => onChange({ ...value, age: e.target.value })}
        aria-label={t.drills.age}
      />
      <input
        type="number"
        min={1}
        max={120}
        placeholder={t.drills.maxDuration}
        value={value.maxDuration}
        onChange={(e) => onChange({ ...value, maxDuration: e.target.value })}
        aria-label={t.drills.maxDuration}
      />
      <select value={value.iceArea} onChange={(e) => onChange({ ...value, iceArea: e.target.value })} aria-label={t.drills.iceArea}>
        <option value="">{t.drills.allAreas}</option>
        {ICE_AREAS.map((a) => (
          <option key={a} value={a}>
            {t.iceArea[a]}
          </option>
        ))}
      </select>
    </div>
  );
}

export const emptyFilter: DrillFilter = { q: '', tag: '', age: '', maxDuration: '', iceArea: '' };

function visibilityLabel(d: Drill) {
  return d.visibility === 'public' ? t.drills.library : d.visibility === 'club' ? t.drills.club : t.drills.private;
}

export function DrillsPage() {
  const { clubId } = useMe();
  const [filter, setFilter] = useState<DrillFilter>(emptyFilter);
  const drills = useLoad(() => api.get<Drill[]>(drillQuery(clubId, filter)), [clubId, JSON.stringify(filter)]);
  return (
    <>
      <div className="title-row">
        <h1>{t.drills.title}</h1>
        <Link className="button primary" to="/drills/new">
          {t.drills.newDrill}
        </Link>
      </div>
      <DrillFilters value={filter} onChange={setFilter} />
      <ErrorBox error={drills.error} />
      {drills.data && !drills.data.length && <p className="muted">{t.drills.none}</p>}
      <ul className="list">
        {drills.data?.map((d) => (
          <li key={d.id} className="list-item">
            <div>
              <Link to={`/drills/${d.id}`}>
                <strong>{d.title}</strong>
              </Link>
              <div className="small">
                {d.durationMin} {t.common.minutes} · {t.iceArea[d.iceArea]} · {t.drills.ages(d.ageMin, d.ageMax)}
              </div>
              <div>
                {d.skillTags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            </div>
            <Tag tone={d.visibility === 'public' ? undefined : 'role'}>{visibilityLabel(d)}</Tag>
          </li>
        ))}
      </ul>
    </>
  );
}

interface DrillForm {
  title: string;
  description: string;
  coachingPoints: string;
  skillTags: string[];
  ageMin: string;
  ageMax: string;
  durationMin: number;
  iceArea: IceArea;
  minPlayers: string;
  equipment: EquipmentLine[];
  diagramUrl: string;
  visibility: 'private' | 'club';
}

function toForm(d?: Drill): DrillForm {
  return {
    title: d?.title ?? '',
    description: d?.description ?? '',
    coachingPoints: (d?.coachingPoints ?? []).join('\n'),
    skillTags: d?.skillTags ?? [],
    ageMin: d?.ageMin?.toString() ?? '',
    ageMax: d?.ageMax?.toString() ?? '',
    durationMin: d?.durationMin ?? 10,
    iceArea: d?.iceArea ?? 'half',
    minPlayers: d?.minPlayers?.toString() ?? '',
    equipment: d?.equipment ?? [],
    diagramUrl: d?.diagramUrl ?? '',
    visibility: d?.visibility === 'club' ? 'club' : 'private',
  };
}

function toBody(f: DrillForm) {
  const num = (v: string) => (v.trim() ? Number(v) : null);
  return {
    title: f.title,
    description: f.description,
    coachingPoints: f.coachingPoints.split('\n').map((s) => s.trim()).filter(Boolean),
    skillTags: f.skillTags,
    ageMin: num(f.ageMin),
    ageMax: num(f.ageMax),
    durationMin: f.durationMin,
    iceArea: f.iceArea,
    minPlayers: num(f.minPlayers),
    equipment: f.equipment.filter((e) => e.item.trim()),
    diagramUrl: f.diagramUrl.trim() || null,
    visibility: f.visibility,
  };
}

export function DrillPage() {
  const { drillId } = useParams();
  const isNew = !drillId;
  const drill = useLoad(() => (isNew ? Promise.resolve(null) : api.get<Drill>(`/drills/${drillId}`)), [drillId]);
  if (!isNew && drill.loading && !drill.data) return <Loading />;
  if (!isNew && !drill.data) return <ErrorBox error={drill.error} />;
  const d = drill.data ?? undefined;
  if (d && !d.canEdit) return <DrillView drill={d} />;
  return <DrillEditor key={d?.id ?? 'new'} drill={d} />;
}

function DrillView({ drill }: { drill: Drill }) {
  const { clubId } = useMe();
  const navigate = useNavigate();
  const { busy, error, run } = useAsyncAction();
  return (
    <Card title={drill.title}>
      <p className="small">
        {drill.durationMin} {t.common.minutes} · {t.iceArea[drill.iceArea]} · {t.drills.ages(drill.ageMin, drill.ageMax)}
      </p>
      <p>
        {drill.skillTags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </p>
      <p className="pre">{drill.description}</p>
      {!!drill.coachingPoints.length && (
        <>
          <h3>{t.practice.coachingPoints}</h3>
          <ul>
            {drill.coachingPoints.map((cp) => (
              <li key={cp}>{cp}</li>
            ))}
          </ul>
        </>
      )}
      {!!drill.equipment.length && (
        <p className="small">
          {t.drills.form.equipment}: {drill.equipment.map((e) => `${e.qty} ${e.item}`).join(', ')}
        </p>
      )}
      {drill.diagramUrl && <img className="diagram" src={drill.diagramUrl} alt="" loading="lazy" />}
      {drill.visibility === 'public' && <p className="muted">{t.drills.readOnlyLibrary}</p>}
      {drill.createdByName && <p className="muted small">{t.drills.createdBy(drill.createdByName)}</p>}
      <ErrorBox error={error} />
      {clubId && (
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            const res = await run(() => api.post<{ id: string }>(`/drills/${drill.id}/copy`, { clubId }));
            if (res) navigate(`/drills/${res.id}`);
          }}
        >
          {t.drills.copyToMine}
        </button>
      )}
    </Card>
  );
}

function DrillEditor({ drill }: { drill?: Drill }) {
  const { clubId, me } = useMe();
  const navigate = useNavigate();
  const [f, setF] = useState<DrillForm>(toForm(drill));
  const { busy, error, run } = useAsyncAction();
  const set = <K extends keyof DrillForm>(k: K, v: DrillForm[K]) => setF({ ...f, [k]: v });
  const isOwner = !drill || drill.createdBy === me?.user.id;

  return (
    <Card
      title={drill ? drill.title : t.drills.newDrill}
      actions={
        drill && (
          <button
            className="danger-outline"
            onClick={async () => {
              if (!window.confirm(t.common.confirmDelete)) return;
              if (await run(() => api.del(`/drills/${drill.id}`))) navigate('/drills');
            }}
          >
            {t.common.delete}
          </button>
        )
      }
    >
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const body = toBody(f);
          if (drill) {
            if (await run(() => api.patch(`/drills/${drill.id}`, body))) navigate('/drills');
          } else {
            const res = await run(() => api.post<{ id: string }>('/drills', { ...body, clubId }));
            if (res) navigate('/drills');
          }
        }}
      >
        <label>
          {t.drills.form.title}
          <input required value={f.title} onChange={(e) => set('title', e.target.value)} />
        </label>
        <label>
          {t.drills.form.description}
          <textarea rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} />
        </label>
        <label>
          {t.drills.form.coachingPoints}
          <textarea rows={3} value={f.coachingPoints} onChange={(e) => set('coachingPoints', e.target.value)} />
        </label>
        <div className="field">
          <span>{t.drills.form.skillTags}</span>
          <TagPicker value={f.skillTags} onChange={(v) => set('skillTags', v)} />
        </div>
        <div className="row">
          <label>
            {t.drills.form.duration}
            <input
              type="number"
              min={1}
              max={120}
              required
              value={f.durationMin}
              onChange={(e) => set('durationMin', Number(e.target.value))}
            />
          </label>
          <label>
            {t.drills.iceArea}
            <select value={f.iceArea} onChange={(e) => set('iceArea', e.target.value as IceArea)}>
              {ICE_AREAS.map((a) => (
                <option key={a} value={a}>
                  {t.iceArea[a]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="row">
          <label>
            {t.drills.form.ageMin}
            <input type="number" min={4} max={25} value={f.ageMin} onChange={(e) => set('ageMin', e.target.value)} />
          </label>
          <label>
            {t.drills.form.ageMax}
            <input type="number" min={4} max={25} value={f.ageMax} onChange={(e) => set('ageMax', e.target.value)} />
          </label>
          <label>
            {t.drills.form.minPlayers}
            <input type="number" min={1} max={60} value={f.minPlayers} onChange={(e) => set('minPlayers', e.target.value)} />
          </label>
        </div>
        <div className="field">
          <span>{t.drills.form.equipment}</span>
          {f.equipment.map((line, i) => (
            <div className="row" key={i}>
              <input
                aria-label={t.drills.form.item}
                placeholder={t.drills.form.item}
                value={line.item}
                onChange={(e) => set('equipment', f.equipment.map((x, j) => (j === i ? { ...x, item: e.target.value } : x)))}
              />
              <input
                aria-label={t.drills.form.qty}
                type="number"
                min={0}
                max={200}
                className="qty"
                value={line.qty}
                onChange={(e) =>
                  set('equipment', f.equipment.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))
                }
              />
              <button type="button" onClick={() => set('equipment', f.equipment.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={() => set('equipment', [...f.equipment, { item: '', qty: 1 }])}>
            {t.drills.form.addItem}
          </button>
        </div>
        <label>
          {t.drills.form.diagramUrl}
          <input type="url" value={f.diagramUrl} onChange={(e) => set('diagramUrl', e.target.value)} />
        </label>
        {isOwner && (
          <label>
            {t.drills.form.visibility}
            <select value={f.visibility} onChange={(e) => set('visibility', e.target.value as 'private' | 'club')}>
              <option value="private">{t.drills.form.visPrivate}</option>
              <option value="club">{t.drills.form.visClub}</option>
            </select>
          </label>
        )}
        <ErrorBox error={error} />
        <div className="row">
          <button className="primary" disabled={busy || !clubId}>
            {t.common.save}
          </button>
          <button type="button" onClick={() => navigate(-1)}>
            {t.common.cancel}
          </button>
        </div>
      </form>
    </Card>
  );
}
