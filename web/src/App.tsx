import { useEffect, type ReactNode } from "react";
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { decodeShare } from "./domain/share";
import { IS_ARTIFACT } from "./platform";
import { DrillDetail } from "./screens/DrillDetail";
import { DrillEditor } from "./screens/DrillEditor";
import { DrillLibrary } from "./screens/DrillLibrary";
import { Home } from "./screens/Home";
import { Onboarding } from "./screens/Onboarding";
import { RinkRoute } from "./screens/RinkMode";
import { Season } from "./screens/Season";
import { SessionScreen } from "./screens/SessionScreen";
import { SharedSession } from "./screens/SharedSession";
import { TeamSettings } from "./screens/TeamSettings";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

/** A crash on one screen shows an error with a way home; leaving the screen resets it. */
function Guarded({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <ErrorBoundary key={pathname} onReset={() => navigate("/", { replace: true })}>
      {children}
    </ErrorBoundary>
  );
}

function NewTeam() {
  const navigate = useNavigate();
  return <Onboarding showBack onDone={() => navigate("/", { replace: true })} />;
}

/**
 * The preview can't own its URL path, so it routes in memory. A share link
 * to the preview is its own URL + #payload: open that shared session.
 */
function previewEntries(): string[] {
  const token = window.location.hash.slice(1);
  return token && decodeShare(token) ? [`/delat#${token}`] : ["/"];
}

export function App() {
  const routes = (
    <>
      <ScrollToTop />
      <Guarded>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pass/:id" element={<SessionScreen />} />
          <Route path="/pass/:id/rink" element={<RinkRoute />} />
          <Route path="/ovningar" element={<DrillLibrary />} />
          <Route path="/ovningar/ny" element={<DrillEditor />} />
          <Route path="/ovningar/:id" element={<DrillDetail />} />
          <Route path="/ovningar/:id/andra" element={<DrillEditor />} />
          <Route path="/sasong" element={<Season />} />
          <Route path="/lag" element={<TeamSettings />} />
          <Route path="/nytt-lag" element={<NewTeam />} />
          <Route path="/delat" element={<SharedSession />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Guarded>
    </>
  );
  return IS_ARTIFACT ? (
    <MemoryRouter initialEntries={previewEntries()}>{routes}</MemoryRouter>
  ) : (
    <BrowserRouter>{routes}</BrowserRouter>
  );
}
