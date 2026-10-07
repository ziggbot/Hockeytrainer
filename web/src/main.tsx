import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { IS_ARTIFACT } from "./platform";
import "./design/global.css";

// Precache the app shell so rink mode opens with no signal in the arena.
// (The claude.ai preview can't run service workers.)
if (!IS_ARTIFACT) registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
