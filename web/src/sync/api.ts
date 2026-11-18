import { IS_ARTIFACT } from "../platform";
import { S } from "../i18n";

// The team server (server/ in this repo, on Render). Set VITE_API_URL at
// build time; without it the app stays local-only. The claude.ai preview
// can't reach other hosts, so it never syncs.
export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/+$/, "");
export const TEAMS_ENABLED = API_URL !== "" && !IS_ARTIFACT;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
  /** No answer at all: offline, or the server is still waking up. */
  get offline() {
    return this.status === 0;
  }
}

// Render's free tier sleeps; waking takes up to about a minute.
const TIMEOUT_MS = 75_000;

export async function call<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  token?: string
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, S.ui.manage.offline);
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? S.ui.manage.failed);
  return data as T;
}

export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : S.ui.manage.failed;
}
