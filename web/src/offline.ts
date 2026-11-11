import { api, ApiError, type Me, type PracticeDetail } from './api';

// Everything cached on the device lives under this prefix so logout can wipe it.
const PREFIX = 'ht.';
const NOTE_QUEUE = `${PREFIX}noteQueue`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode): the app still works online.
  }
}

export function cacheMe(me: Me): void {
  write(`${PREFIX}me`, me);
}

export function getCachedMe(): Me | null {
  return read<Me>(`${PREFIX}me`);
}

export function cachePractice(p: PracticeDetail, key = p.id): void {
  write(`${PREFIX}practice.${key}`, { savedAt: Date.now(), practice: p });
}

export function getCachedPractice(key: string): PracticeDetail | null {
  return read<{ practice: PracticeDetail }>(`${PREFIX}practice.${key}`)?.practice ?? null;
}

/** Stores the next 7 days for rink mode and drops cached practices older than two weeks. */
export function cacheUpcoming(list: PracticeDetail[]): void {
  write(`${PREFIX}upcoming`, list);
  for (const p of list) cachePractice(p);
  try {
    const cutoff = Date.now() - 14 * 864e5;
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(`${PREFIX}practice.`)) continue;
      const entry = read<{ savedAt: number }>(key);
      if (!entry || entry.savedAt < cutoff) localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export function getCachedUpcoming(): PracticeDetail[] {
  return read<PracticeDetail[]>(`${PREFIX}upcoming`) ?? [];
}

export function readChecklist(practiceKey: string): Record<string, boolean> {
  return read<Record<string, boolean>>(`${PREFIX}check.${practiceKey}`) ?? {};
}

export function writeChecklist(practiceKey: string, value: Record<string, boolean>): void {
  write(`${PREFIX}check.${practiceKey}`, value);
}

interface QueuedNote {
  practiceId: string;
  body: string;
  tags: string[];
  clientId: string;
}

export function newClientId(): string {
  return crypto.randomUUID();
}

/** Sends a note, or queues it on the device if there is no connection. Returns true if queued. */
export async function sendNote(note: QueuedNote): Promise<boolean> {
  try {
    await api.post(`/practices/${note.practiceId}/notes`, note);
    return false;
  } catch (err) {
    if (err instanceof ApiError && err.offline) {
      write(NOTE_QUEUE, [...(read<QueuedNote[]>(NOTE_QUEUE) ?? []), note]);
      return true;
    }
    throw err;
  }
}

let flushing = false;
/** Retries queued notes. Server-side clientId makes this safe to repeat. */
export async function flushNotes(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const queue = read<QueuedNote[]>(NOTE_QUEUE) ?? [];
    const remaining: QueuedNote[] = [];
    for (const note of queue) {
      try {
        await api.post(`/practices/${note.practiceId}/notes`, note);
      } catch (err) {
        // Keep it only if we are still offline; drop notes the server rejects (e.g. practice deleted).
        if (err instanceof ApiError && (err.offline || err.status >= 500 || err.status === 401)) remaining.push(note);
      }
    }
    write(NOTE_QUEUE, remaining);
  } finally {
    flushing = false;
  }
}

export function queuedNoteCount(): number {
  return (read<QueuedNote[]>(NOTE_QUEUE) ?? []).length;
}

/** Called on logout: removes everything this app cached on the device. */
export async function clearDeviceData(): Promise<void> {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
