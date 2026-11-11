import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, ApiError, type Drill, type PracticeDetail, type PracticeItem } from '../api';
import { Card, CopyLink, ErrorBox, Loading, Tag, useAsyncAction } from '../components/ui';
import { formatDateTime, fromLocalInput, linkTo, toLocalInput } from '../format';
import { t } from '../i18n/sv';
import { cachePractice, getCachedPractice, newClientId, sendNote } from '../offline';
import { useLoad, useMe } from '../state';
import { DrillFilters, drillQuery, emptyFilter, type DrillFilter } from './Drills';

async function loadPractice(id: string): Promise<{ practice: PracticeDetail; cached: boolean }> {
  try {
    const practice = await api.get<PracticeDetail>(`/practices/${id}`);
    cachePractice(practice);
    return { practice, cached: false };
  } catch (err) {
    const cached = err instanceof ApiError && err.offline ? getCachedPractice(id) : null;
    if (cached) return { practice: cached, cached: true };
    throw err;
  }
}

export function PracticePage() {
  const { practiceId = '' } = useParams();
  const loaded = useLoad(() => loadPractice(practiceId), [practiceId]);
  if (loaded.loading && !loaded.data) return <Loading />;
  if (!loaded.data) return <ErrorBox error={loaded.error} />;
  const { practice, cached } = loaded.data;
  return (
    <PracticeEditor
      key={practice.id}
      practice={practice}
      cached={cached}
      onChange={(p) => {
        cachePractice(p);
        loaded.setData({ practice: p, cached: false });
      }}
      reload={loaded.reload}
    />
  );
}

/** Read-only rendering used by the share page and for users who cannot edit. */
export function PracticeReadOnly({ practice }: { practice: PracticeDetail }) {
  return (
    <>
      <Card title={`${practice.teamName} · ${formatDateTime(practice.startsAt)}`}>
        {practice.title && <p className="lead">{practice.title}</p>}
        <FocusLine practice={practice} />
        <TimeBar total={practice.totalMinutes} slot={practice.durationMin} />
        <ol className="run-order">
          {practice.items.map((it, i) => (
            <li key={it.id ?? i}>
              <ItemSummary item={it} />
            </li>
          ))}
        </ol>
      </Card>
      <EquipmentCard practice={practice} />
    </>
  );
}

function FocusLine({ practice }: { practice: PracticeDetail }) {
  const tags = practice.focusTags.length ? practice.focusTags : (practice.block?.focusTags ?? []);
  if (!tags.length && !practice.block) return null;
  return (
    <p>
      {practice.block && (
        <span className="muted">
          {t.practice.block}: {practice.block.name} ·{' '}
        </span>
      )}
      {t.practice.focus}:{' '}
      {tags.map((tag) => (
        <Tag key={tag} tone="ok">
          {tag}
        </Tag>
      ))}
    </p>
  );
}

function TimeBar({ total, slot }: { total: number; slot: number }) {
  const over = total > slot;
  const pct = Math.min(100, Math.round((total / slot) * 100));
  return (
    <div className={`timebar${over ? ' timebar-over' : ''}`} role="status">
      <div className="timebar-fill" style={{ width: `${pct}%` }} />
      <span>{over ? t.practice.timeOver(total, slot) : t.practice.timeOk(total, slot)}</span>
    </div>
  );
}

function ItemSummary({ item }: { item: PracticeItem }) {
  return (
    <details>
      <summary>
        <strong>{item.title}</strong> · {item.minutes} {t.common.minutes}
        {item.station && <Tag>{t.rink.stationN(item.station)}</Tag>}
      </summary>
      {item.drill?.description && <p className="pre">{item.drill.description}</p>}
      {!!item.drill?.coachingPoints.length && (
        <ul>
          {item.drill.coachingPoints.map((cp) => (
            <li key={cp}>{cp}</li>
          ))}
        </ul>
      )}
      {item.note && <p className="muted">{item.note}</p>}
      {item.drill?.diagramUrl && <img className="diagram" src={item.drill.diagramUrl} alt="" loading="lazy" />}
    </details>
  );
}

function EquipmentCard({ practice }: { practice: PracticeDetail }) {
  return (
    <Card title={t.practice.equipment}>
      {!practice.equipment.length && <p className="muted">{t.practice.noEquipment}</p>}
      <ul className="checklist-static">
        {practice.equipment.map((e) => (
          <li key={e.item}>
            <strong>{e.qty}</strong> {e.item}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PracticeEditor({
  practice,
  cached,
  onChange,
  reload,
}: {
  practice: PracticeDetail;
  cached: boolean;
  onChange: (p: PracticeDetail) => void;
  reload: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<PracticeItem[]>(practice.items);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);
  const [picker, setPicker] = useState(false);
  const action = useAsyncAction();

  useEffect(() => {
    if (!dirty) setItems(practice.items);
  }, [practice.items, dirty]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const update = (next: PracticeItem[]) => {
    setItems(next);
    setDirty(true);
  };
  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j]!, next[i]!];
    update(next);
  };
  const total = items.reduce((s, i) => s + (Number(i.minutes) || 0), 0);
  const canEdit = practice.canEdit && !cached;

  const saveItems = async () => {
    const res = await action.run(() =>
      api.put<PracticeDetail>(`/practices/${practice.id}/items`, {
        items: items.map((i) => ({
          drillId: i.drillId,
          title: i.title,
          minutes: Number(i.minutes),
          station: i.station,
          note: i.note,
        })),
      }),
    );
    if (res) {
      setDirty(false);
      onChange(res);
    }
  };

  const patch = async (body: Record<string, unknown>) => {
    if (await action.run(() => api.patch(`/practices/${practice.id}`, body))) await reload();
  };

  if (!practice.canEdit) {
    return (
      <>
        <BackToTeam practice={practice} />
        <PracticeReadOnly practice={practice} />
      </>
    );
  }

  return (
    <>
      <BackToTeam practice={practice} />
      {cached && <p className="offline-banner">{t.home.offlineCopy}</p>}
      <div className="title-row">
        <h1>
          {formatDateTime(practice.startsAt)} <Tag tone={practice.status === 'done' ? 'ok' : undefined}>{t.status[practice.status]}</Tag>
        </h1>
        <Link className="button primary big" to={`/practices/${practice.id}/rink`}>
          {t.practice.rink}
        </Link>
      </div>
      {practice.title && <p className="lead">{practice.title}</p>}
      <FocusLine practice={practice} />
      <ErrorBox error={action.error} />

      {canEdit && editing && (
        <DetailsForm
          practice={practice}
          onCancel={() => setEditing(false)}
          onSave={async (body) => {
            await patch(body);
            setEditing(false);
          }}
        />
      )}
      {canEdit && !editing && (
        <p>
          <button onClick={() => setEditing(true)}>{t.practice.edit}</button>
        </p>
      )}

      <Card title={t.practice.items}>
        <TimeBar total={total} slot={practice.durationMin} />
        {!items.length && <p className="muted">{t.practice.empty}</p>}
        <ol className="items">
          {items.map((it, i) => (
            <li key={`${it.id ?? 'new'}-${i}`} className="item">
              <div className="item-head">
                <span className="item-title">{it.title}</span>
                {canEdit && (
                  <span className="row">
                    <button aria-label={t.practice.up} onClick={() => move(i, -1)} disabled={i === 0}>
                      ↑
                    </button>
                    <button aria-label={t.practice.down} onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                      ↓
                    </button>
                    <button aria-label={t.practice.remove} onClick={() => update(items.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </span>
                )}
              </div>
              {canEdit ? (
                <div className="row wrap item-fields">
                  <label>
                    {t.common.minutes}
                    <input
                      type="number"
                      min={1}
                      max={120}
                      className="qty"
                      value={it.minutes}
                      onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, minutes: Number(e.target.value) } : x)))}
                    />
                  </label>
                  <label>
                    {t.practice.station}
                    <select
                      value={it.station ?? ''}
                      onChange={(e) =>
                        update(items.map((x, j) => (j === i ? { ...x, station: e.target.value ? Number(e.target.value) : null } : x)))
                      }
                    >
                      <option value="">{t.practice.allTogether}</option>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grow">
                    {t.practice.note}
                    <input
                      value={it.note}
                      onChange={(e) => update(items.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
                    />
                  </label>
                </div>
              ) : (
                <ItemSummary item={it} />
              )}
            </li>
          ))}
        </ol>
        {canEdit && (
          <div className="row wrap">
            <button onClick={() => setPicker(!picker)}>{t.practice.addDrill}</button>
            <CustomItemButton onAdd={(title) => update([...items, { drillId: null, title, minutes: 2, station: null, note: '' }])} />
            <button className="primary" disabled={!dirty || action.busy} onClick={saveItems}>
              {t.practice.saveOrder}
            </button>
            {dirty && <span className="warn-text">{t.practice.unsaved}</span>}
          </div>
        )}
        {picker && canEdit && (
          <DrillPicker
            clubId={practice.clubId}
            onPick={(d) => {
              update([...items, { drillId: d.id, title: d.title, minutes: d.durationMin, station: null, note: '', drill: { ...d } }]);
            }}
          />
        )}
      </Card>

      <EquipmentCard practice={practice} />
      {!cached && <ShareCard practice={practice} onChange={reload} />}
      <NotesCard practice={practice} onAdded={reload} />

      {canEdit && (
        <div className="row wrap">
          <button onClick={() => patch({ status: practice.status === 'done' ? 'planned' : 'done' })}>
            {practice.status === 'done' ? t.practice.markPlanned : t.practice.markDone}
          </button>
          <button
            className="danger-outline"
            onClick={async () => {
              if (!window.confirm(t.common.confirmDelete)) return;
              if (await action.run(() => api.del(`/practices/${practice.id}`))) navigate(`/teams/${practice.teamId}`);
            }}
          >
            {t.practice.deletePractice}
          </button>
        </div>
      )}
    </>
  );
}

function BackToTeam({ practice }: { practice: PracticeDetail }) {
  return (
    <p className="muted">
      <Link to={`/teams/${practice.teamId}`}>← {practice.teamName}</Link>
    </p>
  );
}

function DetailsForm({
  practice,
  onSave,
  onCancel,
}: {
  practice: PracticeDetail;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    title: practice.title,
    startsAt: toLocalInput(practice.startsAt),
    durationMin: practice.durationMin,
    playerCount: practice.playerCount?.toString() ?? '',
  });
  return (
    <Card title={t.practice.edit}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSave({
            title: f.title,
            startsAt: fromLocalInput(f.startsAt),
            durationMin: f.durationMin,
            playerCount: f.playerCount ? Number(f.playerCount) : null,
          });
        }}
      >
        <label>
          {t.team.title}
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </label>
        <div className="row">
          <label>
            {t.team.startsAt}
            <input type="datetime-local" required value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} />
          </label>
          <label>
            {t.team.duration}
            <input
              type="number"
              min={10}
              max={240}
              required
              value={f.durationMin}
              onChange={(e) => setF({ ...f, durationMin: Number(e.target.value) })}
            />
          </label>
          <label>
            {t.practice.playerCount}
            <input type="number" min={0} max={200} value={f.playerCount} onChange={(e) => setF({ ...f, playerCount: e.target.value })} />
          </label>
        </div>
        <div className="row">
          <button className="primary">{t.common.save}</button>
          <button type="button" onClick={onCancel}>
            {t.common.cancel}
          </button>
        </div>
      </form>
    </Card>
  );
}

function CustomItemButton({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('Vattenpaus');
  if (!open) return <button onClick={() => setOpen(true)}>{t.practice.addCustom}</button>;
  return (
    <form
      className="row"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onAdd(title.trim());
        setOpen(false);
      }}
    >
      <input aria-label={t.practice.customTitle} value={title} onChange={(e) => setTitle(e.target.value)} />
      <button className="primary">{t.common.add}</button>
    </form>
  );
}

function DrillPicker({ clubId, onPick }: { clubId: string; onPick: (d: Drill) => void }) {
  const [filter, setFilter] = useState<DrillFilter>(emptyFilter);
  const drills = useLoad(() => api.get<Drill[]>(drillQuery(clubId, filter)), [clubId, JSON.stringify(filter)]);
  return (
    <div className="picker">
      <h3>{t.practice.pickDrill}</h3>
      <DrillFilters value={filter} onChange={setFilter} />
      <ErrorBox error={drills.error} />
      <ul className="list">
        {drills.data?.map((d) => (
          <li key={d.id} className="list-item">
            <div>
              <strong>{d.title}</strong>
              <div className="small">
                {d.durationMin} {t.common.minutes} · {t.iceArea[d.iceArea]} · {d.skillTags.join(', ')}
              </div>
            </div>
            <button className="primary" onClick={() => onPick(d)}>
              {t.common.add}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShareCard({ practice, onChange }: { practice: PracticeDetail; onChange: () => Promise<void> }) {
  const action = useAsyncAction();
  return (
    <Card title={t.practice.share}>
      <p className="muted">{t.practice.shareHint}</p>
      <ErrorBox error={action.error} />
      {practice.shareToken ? (
        <>
          <CopyLink url={linkTo(`/s/${practice.shareToken}`)} />
          <button
            className="danger-outline"
            onClick={() => action.run(async () => {
              await api.del(`/practices/${practice.id}/share`);
              await onChange();
            })}
          >
            {t.practice.shareOff}
          </button>
        </>
      ) : (
        <button
          onClick={() => action.run(async () => {
            await api.post(`/practices/${practice.id}/share`);
            await onChange();
          })}
        >
          {t.practice.shareOn}
        </button>
      )}
    </Card>
  );
}

export function NotesCard({ practice, onAdded }: { practice: PracticeDetail; onAdded?: () => Promise<void> }) {
  const { me } = useMe();
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [queued, setQueued] = useState(false);
  const action = useAsyncAction();
  if (!me || !practice.canEdit) return null;
  return (
    <Card title={t.practice.notes}>
      {!practice.notes?.length && <p className="muted">{t.practice.noNotes}</p>}
      <ul className="list">
        {practice.notes?.map((n) => (
          <li key={n.id} className="note">
            <div className="muted small">
              {n.authorName} · {formatDateTime(n.createdAt)}
            </div>
            {n.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            {n.body && <p className="pre">{n.body}</p>}
          </li>
        ))}
      </ul>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const wasQueued = await action.run(() =>
            sendNote({ practiceId: practice.id, body, tags, clientId: newClientId() }),
          );
          if (wasQueued === undefined) return;
          setQueued(wasQueued);
          setBody('');
          setTags([]);
          if (!wasQueued && onAdded) await onAdded();
        }}
      >
        <div className="tag-picker">
          {t.practice.quickTags.map((tag) => (
            <button
              type="button"
              key={tag}
              className={`chip${tags.includes(tag) ? ' chip-on' : ''}`}
              aria-pressed={tags.includes(tag)}
              onClick={() => setTags(tags.includes(tag) ? tags.filter((x) => x !== tag) : [...tags, tag])}
            >
              {tag}
            </button>
          ))}
        </div>
        <textarea rows={3} placeholder={t.practice.notePlaceholder} value={body} onChange={(e) => setBody(e.target.value)} />
        <ErrorBox error={action.error} />
        {queued && <p className="ok">{t.practice.noteQueued}</p>}
        <button className="primary" disabled={action.busy || (!body.trim() && !tags.length)}>
          {t.practice.addNote}
        </button>
      </form>
    </Card>
  );
}
