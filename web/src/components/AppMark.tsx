import { IS_ARTIFACT } from "../platform";
import { S } from "../i18n";
import { LogoMark } from "./Icons";
import { SPORT } from "../sport";

/**
 * The club's crest as the app symbol, top left. The claude.ai preview keeps
 * the neutral stick-and-puck mark: it is published outside the club's own
 * hosting, so it must not carry the club's branding.
 */
export function AppMark() {
  if (IS_ARTIFACT) return <LogoMark />;
  const [width, height] = SPORT.logoSize;
  return <img className="logo__crest" src={SPORT.logo} alt={S.ui.clubName} width={width} height={height} />;
}
