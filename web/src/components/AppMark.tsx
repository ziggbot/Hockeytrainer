import { IS_ARTIFACT } from "../platform";
import { S } from "../i18n";
import { LogoMark } from "./Icons";

/**
 * The club's crest as the app symbol, top left. The claude.ai preview keeps
 * the neutral stick-and-puck mark: it is published outside the club's own
 * hosting, so it must not carry the club's branding.
 */
export function AppMark() {
  if (IS_ARTIFACT) return <LogoMark />;
  return <img className="logo__crest" src="/club-logo.png" alt={S.ui.clubName} width={49} height={44} />;
}
