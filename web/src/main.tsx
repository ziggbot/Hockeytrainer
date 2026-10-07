import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { IS_ARTIFACT } from "./platform";
import { toISODate } from "./domain/dates";
import { refreshUntouchedPlans, snapOffGridPlans } from "./store/actions";
import "./design/global.css";

// Precache the app shell so rink mode opens with no signal in the arena.
// (The claude.ai preview can't run service workers.)
if (!IS_ARTIFACT) registerSW({ immediate: true });

// Plans made by an older planner version (e.g. before the 4-station shape)
// are rebuilt if nobody has edited them yet; the rest are put on the
// 5-minute grid.
refreshUntouchedPlans(toISODate(new Date()));
snapOffGridPlans();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
