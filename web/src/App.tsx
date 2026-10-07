import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
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

function NewTeam() {
  const navigate = useNavigate();
  return <Onboarding showBack onDone={() => navigate("/", { replace: true })} />;
}

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
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
    </BrowserRouter>
  );
}
