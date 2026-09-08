import { lazy, Suspense, useEffect, useRef, useState } from "react";
import LandingPage from "./pages/LandingPage.jsx";
import { trackPageview } from "./lib/analytics.js";
import { isStaleAssetError } from "./lib/errorReporter.js";
import { subscribeToNavigation, currentLocation } from "./lib/spaRouter.js";

const CHUNK_RECOVERY_KEY = "draftix:chunk-recovery";
const CHUNK_RECOVERY_COOLDOWN_MS = 30_000;
function lastChunkRecoveryAttempt() {
  try { return Number(sessionStorage.getItem(CHUNK_RECOVERY_KEY)) || 0; } catch { return 0; }
}

function markChunkRecoveryAttempt() {
  try { sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(Date.now())); } catch { /* storage unavailable */ }
}

function clearChunkRecoveryAttempt() {
  try { sessionStorage.removeItem(CHUNK_RECOVERY_KEY); } catch { /* storage unavailable */ }
}

function recoverStaleAsset() {
  const now = Date.now();
  if (now - lastChunkRecoveryAttempt() < CHUNK_RECOVERY_COOLDOWN_MS) return false;
  markChunkRecoveryAttempt();
  const freshUrl = new URL(window.location.href);
  freshUrl.searchParams.set("refresh", String(now));
  window.location.replace(freshUrl);
  return true;
}

function lazyRoute(load) {
  return lazy(() => load().then((module) => {
    clearChunkRecoveryAttempt();
    return module;
  }).catch((error) => {
    if (!isStaleAssetError(error)) throw error;
    // A deploy replaced the hashed chunk this tab was about to load. Reload
    // to pick up the fresh build instead of surfacing an error. The cooldown
    // (instead of a one-shot session flag) keeps repeated deploys working for
    // long-lived tabs while still preventing an infinite reload loop.
    if (!recoverStaleAsset()) throw error;
    return new Promise(() => {});
  }));
}
// Lazy-load route pages so the initial bundle stays lean. Only the landing
// page is loaded eagerly; everything else (draft shell, balancer, status,
// legal) is fetched on demand → smaller first load, better LCP.
const SessionGate = lazyRoute(() => import("./components/SessionGate.jsx"));
const TeamBalancerPage = lazyRoute(() => import("./pages/TeamBalancerPage.jsx"));
const StatusPage = lazyRoute(() => import("./pages/StatusPage.jsx"));
const LegalPage = lazyRoute(() => import("./pages/LegalPage.jsx"));
const AdminPage = lazyRoute(() => import("./pages/AdminPage.jsx"));
const SeoTopicPage = lazyRoute(() => import("./pages/SeoTopicPage.jsx"));
const TournamentPage = lazyRoute(() => import("./pages/TournamentPage.jsx"));
const FeedbackPage = lazyRoute(() => import("./pages/FeedbackPage.jsx"));
const NotFoundPage = lazyRoute(() => import("./pages/NotFoundPage.jsx"));
const TournamentHubPage = lazyRoute(() => import("./pages/TournamentPage.jsx").then((module) => ({ default: module.TournamentHubPage })));

function RouteFallback() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--dx-bg, #060912)",
        color: "#fff",
        font: "600 1rem/1.4 system-ui, sans-serif",
      }}
      aria-busy="true"
    >
      <p>Loading…</p>
    </main>
  );
}

export default function App() {
  // Path is state: the SPA router (click interceptor + popstate) notifies
  // this component on every internal navigation so we re-render in place
  // instead of doing a full page reload.
  const [location, setLocation] = useState(currentLocation);
  const path = location.path;

  useEffect(() => subscribeToNavigation(() => setLocation(currentLocation())), []);

  useEffect(() => {
    const handlePreloadError = (event) => {
      const error = event?.payload || event?.detail || event;
      if (!isStaleAssetError(error)) return;
      event.preventDefault?.();
      recoverStaleAsset();
    };
    window.addEventListener("vite:preloadError", handlePreloadError);
    return () => window.removeEventListener("vite:preloadError", handlePreloadError);
  }, []);

  // Scroll back to the top on client-side route changes (skip the first
  // render so hard loads keep native browser scroll restoration).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
  }, [path]);

  // Resolve the route before the effects so the title effect knows whether
  // this is a known page or a 404 render (unknown paths must not inherit
  // the homepage title — that was a soft-404 signal for crawlers).
  let page;
  let isNotFound = false;
  if (path === "/") page = <LandingPage />;
  else if (path === "/draft") page = <SessionGate />;
  else if (path === "/team-balance") page = <TeamBalancerPage />;
  else if (path === "/status") page = <StatusPage />;
  else if (path === "/privacy") page = <LegalPage type="privacy" />;
  else if (path === "/terms") page = <LegalPage type="terms" />;
  else if (path === "/r") page = <AdminPage />;
  else if (path === "/tournaments") page = <TournamentHubPage />;
  else if (path === "/feedback") page = <FeedbackPage />;
  else if (path.startsWith("/t/") && path.split("/").filter(Boolean).length === 2) page = <TournamentPage slug={decodeURIComponent(path.split("/")[2])} />;
  else if (["/valorant-map-veto", "/valorant-agent-ban", "/valorant-draft-tool", "/tournament-bracket-maker"].includes(path)) page = <SeoTopicPage path={path} />;
  else {
    page = <NotFoundPage />;
    isNotFound = true;
  }

  useEffect(() => {
    const titles = {
      "/draft": "Draft Room | Draftix",
      "/team-balance": "Valorant Team Balancer by Rank | Draftix",
      "/status": "Draftix System Status",
      "/privacy": "Privacy Policy | Draftix",
      "/terms": "Terms of Service | Draftix",
      "/r": "Draftix Admin",
      "/valorant-map-veto": "Valorant Map Veto Tool | Draftix",
      "/valorant-agent-ban": "Valorant Agent Ban Tool | Draftix",
      "/valorant-draft-tool": "Free Valorant Draft Tool | Draftix",
      "/tournaments": "Free Tournament Bracket Maker | Draftix",
      "/tournament-bracket-maker": "How to Make a Tournament Bracket (Free) | Draftix",
      "/feedback": "Send Feedback | Draftix",
    };
    document.title = titles[path] || (isNotFound ? "Page Not Found | Draftix" : "Valorant Map Veto & Agent Draft Tool | Draftix");
    // First-party analytics: one pageview per route change.
    trackPageview(path);
  }, [path, isNotFound]);

  // Landing page is already eager; only wrap the lazy routes in Suspense.
  if (path === "/") return page;
  return <Suspense fallback={<RouteFallback />}>{page}</Suspense>;
}
