import { useLocation, useNavigate } from "react-router-dom";
import { AppLink } from "./AppLink";
import type { ReactNode } from "react";
import { AppMark } from "./AppMark";
import { S } from "../i18n";
import { useAppState } from "../store/store";
import { activeTeam } from "../store/actions";

/** Logo left, team chip right (opens team settings) — like FitBlueprint's header. */
export function TopBar() {
  const state = useAppState();
  const team = activeTeam(state);
  const coach = state.coachName.trim();
  return (
    <header className="topbar">
      <AppLink to="/" className="logo">
        <AppMark />
        <span className="logo__name">
          <span className="logo__app">
            {S.ui.appName}
            {coach && " – "}
          </span>
          {coach && <span className="logo__coach">{coach}</span>}
        </span>
      </AppLink>
      {team && (
        <AppLink to="/lag" className="chip chip--sm" aria-label={S.ui.team.title}>
          <span className="chip__text">{team.name}</span>
        </AppLink>
      )}
    </header>
  );
}

export function BackBar({ to, right }: { to?: string; right?: ReactNode }) {
  const navigate = useNavigate();
  // "default" = this is the first entry (opened directly), so there is no
  // in-app history to go back to.
  const first = useLocation().key === "default";
  return (
    <header className="topbar">
      <button type="button" className="back" onClick={() => (to ? navigate(to) : first ? navigate("/") : navigate(-1))}>
        ← {S.ui.common.back}
      </button>
      {right}
    </header>
  );
}

const ITEMS = [
  { to: "/sasong", icon: "📈", label: S.ui.nav.season },
  { to: "/", icon: "🏒", label: S.ui.nav.train },
  { to: "/ovningar", icon: "📋", label: S.ui.nav.drills }
];

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="nav" aria-label={S.ui.nav.label}>
      <div className="nav__inner">
        {ITEMS.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <AppLink key={item.to} to={item.to} className={`nav__item${active ? " nav__item--on" : ""}`}>
              <span className="nav__icon">{item.icon}</span>
              <span className="nav__label">{item.label}</span>
            </AppLink>
          );
        })}
      </div>
    </nav>
  );
}
