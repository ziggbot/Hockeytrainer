import { Link, NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { LogoMark } from "./Icons";
import { S } from "../i18n";
import { useAppState } from "../store/store";
import { activeTeam } from "../store/actions";

/** Logo left, team chip right (opens team settings) — like FitBlueprint's header. */
export function TopBar() {
  const state = useAppState();
  const team = activeTeam(state);
  return (
    <header className="topbar">
      <Link to="/" className="logo">
        <LogoMark />
        {S.ui.appName}
      </Link>
      {team && (
        <Link to="/lag" className="chip chip--sm" aria-label={S.ui.team.title}>
          <span className="chip__icon">🏒</span>
          {team.name}
        </Link>
      )}
    </header>
  );
}

export function BackBar({ to, right }: { to?: string; right?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <button
        type="button"
        className="back"
        onClick={() => (to ? navigate(to) : window.history.length > 1 ? navigate(-1) : navigate("/"))}
      >
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
  return (
    <nav className="nav" aria-label="Huvudmeny">
      <div className="nav__inner">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `nav__item${isActive ? " nav__item--on" : ""}`}
          >
            <span className="nav__icon">{item.icon}</span>
            <span className="nav__label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
