import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import UniverseTracker   from "./universe_tracker.jsx";
import ConductorScheduler from "./conductor_scheduler.jsx";
import EnergyCoach        from "./energy_coach.jsx";

// ── Hash-based dev router ──────────────────────────────────────────────────
// /          → Ghost Circuit Universe Tracker
// #/conductor → Conductor Scheduler
// #/coach     → Energy Coach
function App() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (route === "#/conductor") return <ConductorScheduler />;
  if (route === "#/coach")     return <EnergyCoach />;
  return <UniverseTracker />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
