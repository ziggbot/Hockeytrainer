// The few places where the hosted app and the claude.ai preview build
// differ. MODE is "artifact" for the preview (see scripts/build-artifact.mjs).

export const IS_ARTIFACT = import.meta.env.MODE === "artifact";

/**
 * Link for a shared session. The preview can't serve /delat, and only a
 * plain #token reaches it, so it links to its own URL + #payload instead.
 */
export function shareUrl(payload: string): string {
  const base = import.meta.env.VITE_SHARE_BASE as string | undefined;
  return base ? `${base}#${payload}` : `${window.location.origin}/delat#${payload}`;
}
