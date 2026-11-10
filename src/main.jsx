import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.jsx";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import { installGlobalErrorHandlers } from "./lib/errorReporter.js";
import { purgeResumeTokens } from "./state/draftReducer.js";
// Entry-critical styles only. Page-specific stylesheets are imported by their
// lazy chunks (app-redesign.css -> SessionGate, tournaments.css ->
// TournamentPage) so first paint on the landing page doesn't block on them.
// site-nav.css must stay after typography.css — the shared navbar contract
// overrides earlier sheets and originally rode at the end of typography.css.
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/landing-redesign.css";
import "./styles/support-pages.css";
import "./styles/typography.css";
import "./styles/site-nav.css";
import "./styles/feedback-prompt.css";

// Surface crashes outside React (event handlers, promises) to the admin
// error feed. Runs before the first render so nothing is missed.
installGlobalErrorHandlers();

// Resume tokens outlive their rooms (rooms expire server-side within hours);
// drop stale ones so they don't accumulate one key per room ever joined.
purgeResumeTokens();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <>
      <Analytics />
      <AppErrorBoundary><App /></AppErrorBoundary>
    </>
  </StrictMode>,
);
