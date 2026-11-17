// localStorage that never throws. Merely touching `window.localStorage`
// throws in some sandboxed frames and when site data is blocked; the app
// must still run (in memory) when that happens.

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readItem(key: string): string | null {
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeItem(key: string, value: string): void {
  try {
    store()?.setItem(key, value);
  } catch {
    // Quota exceeded or blocked: keep running in memory.
  }
}

export function removeItem(key: string): void {
  try {
    store()?.removeItem(key);
  } catch {
    /* ignore */
  }
}
