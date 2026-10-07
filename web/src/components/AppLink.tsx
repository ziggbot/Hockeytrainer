import type { CSSProperties, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IS_ARTIFACT } from "../platform";

interface Props {
  to: string;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
  children: ReactNode;
}

/**
 * In-app link. The hosted app uses a normal router <Link>. In the claude.ai
 * preview the frame may handle taps on any <a href> itself (links there open
 * outside the page), so the preview renders an anchor without href that
 * navigates in memory.
 */
export function AppLink({ to, className, style, children, ...rest }: Props) {
  const navigate = useNavigate();
  if (!IS_ARTIFACT) {
    return (
      <Link to={to} className={className} style={style} aria-label={rest["aria-label"]}>
        {children}
      </Link>
    );
  }
  return (
    <a
      role="link"
      tabIndex={0}
      className={className}
      style={style}
      aria-label={rest["aria-label"]}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") navigate(to);
      }}
    >
      {children}
    </a>
  );
}
