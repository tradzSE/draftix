import { useEffect, useState } from "react";
import "../styles/admin.css";
import { supabaseConfig } from "../lib/supabaseConfig.js";

const TOKEN_KEY = "dx_admin_token";
const ADMIN_VIEWS = ["overview", "rooms", "pages", "referrers", "feedback", "errors"];
const MISSING_ADMIN_RPC_ERROR = "Admin database functions are missing from this Supabase project. Run supabase/analytics.sql and apply the pending database migrations, then try again.";

const ERROR_KIND_LABELS = { render: "Render", window: "Script", unhandledrejection: "Async" };
const RANGE_OPTIONS = [
  ["today", "Today"],
  ["last7", "7D"],
  ["last30", "30D"],
  ["allTime", "All Time"],
];

function viewFromHash() {
  if (typeof window === "undefined") return "overview";
  const view = window.location.hash.replace(/^#/, "").toLowerCase();
  return ADMIN_VIEWS.includes(view) ? view : "overview";
}

/* ── Small inline icon set (stroke icons, currentColor) ─────────────── */
const Icon = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 15.4c1.7.7 2.7 2.2 3 4.6" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  ),
  infinity: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.2 8.5a3.9 3.9 0 0 1 0 7c-2.9 0-4.4-3.5-6.2-3.5S8.7 15.5 5.8 15.5a3.9 3.9 0 0 1 0-7c2.9 0 4.4 3.5 6.2 3.5s3.3-3.5 6.2-3.5Z" />
    </svg>
  ),
  door: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21h16M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" /><circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" /><path d="M14 2v5h5M9 13h6M9 17h6" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" /><path d="M9 11h.01M13 11h.01" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9L12 3Z" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4 2.8 19.5h18.4L12 4Z" /><path d="M12 10v4" /><path d="M12 17h.01" />
    </svg>
  ),
};

function StatCard({ label, value, sub, icon, tone = "default" }) {
  return (
    <article className={`ax-card ax-card-${tone}`}>
      <div className="ax-card-top">
        <span className="ax-card-label">{label}</span>
        <span className="ax-card-icon" aria-hidden="true">{icon}</span>
      </div>
      <div className="ax-card-value">{value}</div>
      {sub ? <div className="ax-card-sub">{sub}</div> : null}
    </article>
  );
}

function RankedList({ id, title, icon, pairs, emptyText, linkType, limit, onViewAll, showShare = false }) {
  const visiblePairs = limit ? (pairs || []).slice(0, limit) : (pairs || []);
  const maxValue = Math.max(1, ...visiblePairs.map(([, value]) => Number(value) || 0));
  const total = visiblePairs.reduce((sum, [, value]) => sum + (Number(value) || 0), 0);
  const itemHref = (key) => {
    if (linkType === "path" && String(key).startsWith("/")) return String(key);
    if (linkType === "host" && /^[a-z0-9.-]+(?::\d+)?$/i.test(String(key))) return `https://${key}`;
    return null;
  };

  return (
    <section className="ax-panel" id={id}>
      <h3>
        <span className="ax-panel-icon" aria-hidden="true">{icon}</span>
        {title}
        {onViewAll ? <button type="button" className="ax-panel-link" onClick={onViewAll}>View all</button> : pairs?.length ? <span className="ax-panel-note">Top {pairs.length}</span> : null}
      </h3>
      {visiblePairs.length ? (
        <ul className="ax-list">
          {visiblePairs.map(([key, value]) => {
            const href = itemHref(key);
            return (
              <li key={key}>
                <div className="ax-list-row">
                  {href ? <a href={href} target="_blank" rel="noreferrer">{key}</a> : <span>{key}</span>}
                  <strong>{fmtInt(value)}{showShare && total > 0 ? <small>{Math.round(((Number(value) || 0) / total) * 100)}%</small> : null}</strong>
                </div>
                <span className="ax-list-meter" aria-hidden="true"><span style={{ width: `${Math.max(3, Math.round(((Number(value) || 0) / maxValue) * 100))}%` }} /></span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ax-empty">{emptyText}</p>
      )}
    </section>
  );
}

/* SVG line chart with gradient area fill, matching the reference layout. */
function DailyChart({ daily, rangeLabel = "14 days" }) {
  if (!daily || !daily.length) return null;
  const W = 720;
  const H = 240;
  const PAD = { top: 16, right: 12, bottom: 26, left: 44 };
  const views = daily.map((d) => Number(d.visitors) || 0);
  const max = Math.max(1, ...views);
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (daily.length === 1 ? iw / 2 : (i / (daily.length - 1)) * iw);
  const y = (v) => PAD.top + ih - (v / max) * ih;
  const pts = views.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${PAD.left},${PAD.top + ih} ${pts} ${PAD.left + iw},${PAD.top + ih}`;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n));

  return (
    <section className="ax-panel ax-chart-panel">
      <h3>
        <span className="ax-panel-icon">{Icon.grid}</span>
        Activity over time
        <span className="ax-panel-note">{rangeLabel}</span>
      </h3>
      <svg
        className="ax-linechart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Visitors per day, ${rangeLabel}`}
      >
        <defs>
          <linearGradient id="axArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff4655" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff4655" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gridLines.map((g) => {
          const gy = PAD.top + ih - g * ih;
          return (
            <g key={g}>
              <line x1={PAD.left} y1={gy} x2={W - PAD.right} y2={gy} className="ax-grid-line" />
              <text x={PAD.left - 8} y={gy + 3.5} className="ax-tick" textAnchor="end">
                {fmt(Math.round(max * g))}
              </text>
            </g>
          );
        })}
        <polygon points={area} fill="url(#axArea)" />
        <polyline points={pts} fill="none" stroke="#ff4655" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {views.map((v, i) => (
          <circle key={daily[i].date} cx={x(i)} cy={y(v)} r="3.5" fill="#ff4655">
            <title>{`${daily[i].date}: ${v} views / ${daily[i].visitors} visitors`}</title>
          </circle>
        ))}
        <text x={PAD.left} y={H - 8} className="ax-tick">{daily[0].date.slice(5)}</text>
        <text x={W - PAD.right} y={H - 8} className="ax-tick" textAnchor="end">{daily[daily.length - 1].date.slice(5)}</text>
      </svg>
    </section>
  );
}

function fmtInt(n) {
  return new Intl.NumberFormat().format(Number(n) || 0);
}

function CompletionCard({ funnel }) {
  const created = Number(funnel?.roomCreated) || 0;
  const started = Number(funnel?.draftStarted) || 0;
  const completed = Number(funnel?.draftCompleted) || 0;
  const completion = rate(completed, created);
  return (
    <section className="ax-panel ax-completion" aria-label={`Draft completion ${completion}%`}>
      <h3>Draft completion</h3>
      <div className="ax-ring" style={{ "--ax-progress": `${completion * 3.6}deg` }}><strong>{completion}%</strong></div>
      <p>{fmtInt(completed)} of {fmtInt(created)} rooms completed</p>
      <dl><div><dt>Started</dt><dd>{fmtInt(started)}</dd></div><div><dt>Completed</dt><dd>{fmtInt(completed)}</dd></div></dl>
    </section>
  );
}

function ProductHealth({ stats, errors, funnel }) {
  const created = Number(funnel?.roomCreated) || 0;
  const joined = Number(funnel?.opponentJoined) || 0;
  const completed = Number(funnel?.draftCompleted) || 0;
  const openErrors = errors ? Number(errors.open) || 0 : null;
  const rows = [
    ["Live rooms", Number(stats?.rooms?.active) || 0, "good"],
    ["Open errors", openErrors === null ? "--" : openErrors, openErrors > 0 ? "bad" : "good"],
    ["Join rate", `${rate(joined, created)}%`, rate(joined, created) < 30 ? "warn" : "good"],
    ["Completion", `${rate(completed, created)}%`, rate(completed, created) < 25 ? "warn" : "good"],
  ];
  return <section className="ax-panel ax-health"><h3>Product health</h3><dl>{rows.map(([label, value, tone]) => <div key={label}><dt><span className={`ax-health-dot is-${tone}`} />{label}</dt><dd>{value}</dd></div>)}</dl></section>;
}

function rate(part, total) {
  const numerator = Number(part) || 0;
  const denominator = Number(total) || 0;
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function DraftFunnel({ data }) {
  if (!data) return null;
  const steps = [
    ["Homepage", data.homepage],
    ["Create draft", data.createDraft],
    ["Room created", data.roomCreated],
    ["Opponent joined", data.opponentJoined],
    ["Draft started", data.draftStarted],
    ["Draft completed", data.draftCompleted],
  ];
  const conversionRates = steps.map(([, rawValue], index) => {
    if (!index) return null;
    const previous = Number(steps[index - 1][1]) || 0;
    return previous > 0 ? Math.round(((Number(rawValue) || 0) / previous) * 100) : null;
  });
  const validRates = conversionRates.filter((value) => value !== null);
  const biggestDropRate = validRates.length ? Math.min(...validRates) : null;
  const overall = rate(data.draftCompleted, data.homepage);

  return (
    <section className="ax-panel ax-funnel" aria-label="Draft conversion funnel">
      <ol className="ax-funnel-steps">
        {steps.map(([label, rawValue], index) => {
          const value = Number(rawValue) || 0;
          const previous = index ? Number(steps[index - 1][1]) || 0 : 0;
          const rate = previous > 0 ? Math.round((value / previous) * 100) : null;
          return (
            <li key={label} className={index > 0 && rate === biggestDropRate ? "is-biggest-drop" : ""} style={{ "--ax-funnel-fill": `${Math.max(value > 0 ? 3 : 0, Math.round((value / Math.max(1, Number(steps[0][1]) || 0)) * 100))}%` }}>
              <div className="ax-funnel-line">
                <span className="ax-funnel-label">{label}</span>
                <strong>{fmtInt(value)}</strong>
              </div>
              <span className="ax-funnel-meter" aria-hidden="true"><span /></span>
              <small>{index > 0 ? (rate === null ? "No prior traffic" : `${rate}% step conversion`) : "Unique visitors"}</small>
            </li>
          );
        })}
      </ol>
      <div className="ax-funnel-total"><span>Homepage to completed</span><strong>{overall}%</strong></div>
    </section>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [input, setInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [tick, setTick] = useState(0); // re-renders the "updated Xs ago" label
  const [activeView, setActiveView] = useState(viewFromHash);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState(null);
  const [errorUpdatingId, setErrorUpdatingId] = useState(null);
  const [range, setRange] = useState("last7");


  useEffect(() => {
    // Keep crawlers and link previews away from the admin shell.
    let meta = document.querySelector('meta[name="robots"]');
    const created = !meta;
    const previous = meta?.content || "";
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = "noindex,nofollow";
    return () => {
      if (created) meta.remove();
      else meta.content = previous;
    };
  }, []);

  useEffect(() => {
    const syncView = () => setActiveView(viewFromHash());
    window.addEventListener("hashchange", syncView);
    window.addEventListener("popstate", syncView);
    return () => {
      window.removeEventListener("hashchange", syncView);
      window.removeEventListener("popstate", syncView);
    };
  }, []);

  // Auto-load stats when a saved token exists (e.g. returning visit),
  // and whenever the token changes after sign-in.
  useEffect(() => {
    if (token) loadStats(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Auto-refresh every 60s while the dashboard is open.
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => loadStats(token), 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Load the feedback / error feeds when their views open (or token changes).
  useEffect(() => {
    if (token && activeView === "feedback") loadFeedback(token);
    if (token && (activeView === "overview" || activeView === "errors")) loadErrors(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeView]);

  // Tick every 5s so the "updated Xs ago" label stays fresh.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);


  async function loadStats(t) {
    const cfg = supabaseConfig();
    if (!cfg) {
      setError("Admin services are not configured for this deployment.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Plain fetch (not supabase-js) avoids client-side request rewriting
      // by privacy extensions and keeps the admin path dependency-free.
      const res = await fetch(`${cfg.url}/rest/v1/rpc/draftix_admin_stats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
        },
        body: JSON.stringify({ p_token: t }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const unauthorized = res.status === 401 || res.status === 403;
        if (unauthorized) {
          setStats(null);
          setToken("");
          sessionStorage.removeItem(TOKEN_KEY);
        }
        if (unauthorized) setError("That admin token is invalid or expired.");
        else if (res.status === 429) setError("Too many sign-in attempts. Please wait 15 minutes and try again.");
        else if (res.status === 404) setError(MISSING_ADMIN_RPC_ERROR);
        else setError("Admin metrics are temporarily unavailable. Please try again.");
        return;
      }
      setStats(payload);
      setUpdatedAt(Date.now());
      sessionStorage.setItem(TOKEN_KEY, t);
    } catch {
      setError("Could not reach the admin service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function loadFeedback(t) {
    const cfg = supabaseConfig();
    if (!cfg) return;
    try {
      const res = await fetch(`${cfg.url}/rest/v1/rpc/draftix_admin_feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
        },
        body: JSON.stringify({ p_token: t }),
      });
      if (!res.ok) {
        if (res.status === 404) setError(MISSING_ADMIN_RPC_ERROR);
        return;
      }
      setFeedback(await res.json().catch(() => null));
    } catch (_) { /* transient */ }
  }

  async function loadErrors(t) {
    const cfg = supabaseConfig();
    if (!cfg) return;
    try {
      const res = await fetch(`${cfg.url}/rest/v1/rpc/draftix_admin_errors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
        },
        body: JSON.stringify({ p_token: t }),
      });
      if (!res.ok) return; // keep the last good feed; errors surface via stats banner
      setErrors(await res.json().catch(() => null));
    } catch (_) { /* transient */ }
  }

  async function setErrorResolved(entry, resolved) {
    const cfg = supabaseConfig();
    if (!cfg || errorUpdatingId !== null) return;
    setErrorUpdatingId(entry.id);
    setError("");
    try {
      const res = await fetch(`${cfg.url}/rest/v1/rpc/draftix_admin_set_error_resolved`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
        },
        body: JSON.stringify({ p_token: token, p_error_id: entry.id, p_resolved: resolved }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || payload?.ok === false) {
        setError("Could not update that error. Please try again.");
        return;
      }
      await loadErrors(token);
    } catch (_) {
      setError("Could not reach the admin service. Please try again.");
    } finally {
      setErrorUpdatingId(null);
    }
  }

  function signIn(event) {
    event.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput("");
    setToken(t); // triggers the auto-load effect
  }

  function signOut() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setStats(null);
    setFeedback(null);
    setErrors(null);
    setInput("");
  }

  function selectView(view) {
    setActiveView(view);
    const url = view === "overview" ? window.location.pathname : `${window.location.pathname}#${view}`;
    window.history.pushState({ adminView: view }, "", url);
  }

  if (!token || !stats) {
    return (
      <div className="ax-app ax-login-app">
        <span className="ax-login-side" hidden />
        <header className="ax-login-header">
          <a className="ax-login-home" href="/" aria-label="Return to Draftix home">
            <img src="/images/draftix.webp" alt="" />
            <span>DRAFT<em>IX</em></span>
          </a>
          <span className="ax-login-private">Private console</span>
        </header>
        <main className="ax-login-main">
          <form className="ax-signin" onSubmit={signIn} aria-labelledby="ax-signin-title">
            <span className="ax-kicker">Operator sign-in</span>
            <h1 id="ax-signin-title">Admin access</h1>
            <p className="ax-signin-intro" id="ax-signin-help">Enter your private token to open the Draftix dashboard.</p>
            <label htmlFor="ax-admin-token">
              <span>Admin token</span>
              <div className="ax-token-field">
                <input
                  id="ax-admin-token"
                  name="admin-token"
                  type={showToken ? "text" : "password"}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Paste your admin token"
                  autoComplete="current-password"
                  spellCheck={false}
                  aria-describedby="ax-signin-help"
                  aria-invalid={Boolean(error)}
                />
                <button type="button" className="ax-token-toggle" onClick={() => setShowToken((visible) => !visible)} aria-label={showToken ? "Hide admin token" : "Show admin token"}>
                  {showToken ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <button type="submit" className="ax-button" disabled={!input.trim() || loading} aria-busy={loading}>
              {loading ? "Verifying access…" : "Open dashboard"}
            </button>
            {error ? <p className="ax-error" role="alert" aria-live="polite">{error}</p> : null}
          </form>
        </main>
        <footer className="ax-login-footer">Authorized access only</footer>
      </div>
    );
  }

  const ago = updatedAt
    ? (() => {
      const s = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));
      return s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
    })()
    : null;

  const viewMeta = {
    overview: ["Overview", "Monitor traffic, draft activity, conversion, and product health."],
    rooms: ["Draft rooms", "Follow room creation and the full draft conversion funnel."],
    pages: ["Top pages", "See which Draftix surfaces attract the most visits."],
    referrers: ["Referrers", "Understand which external sources send traffic to Draftix."],
    feedback: ["User feedback", "Review ratings and direct notes from players."],
    errors: ["Client errors", "Triage browser issues reported by the application."],
  }[activeView];

  const selectedFunnel = stats?.funnel?.[range] || stats?.funnel?.last7 || {};
  const rangeLabel = RANGE_OPTIONS.find(([key]) => key === range)?.[1] || "7D";
  const visitorsByRange = range === "today" ? stats?.today?.visitors : range === "last7" ? stats?.last7?.visitors : range === "allTime" ? stats?.allTime?.visitors : null;
  const roomsByRange = range === "today" ? stats?.rooms?.createdToday : range === "last7" ? stats?.rooms?.created7d : range === "last30" ? stats?.rooms?.created30d : stats?.rooms?.allTimeCreated;
  const completedByRange = selectedFunnel?.draftCompleted;
  const overviewDaily = range === "today" ? (stats?.daily || []).slice(-1) : range === "last7" ? (stats?.daily || []).slice(-7) : (stats?.daily || []);

  return (
    <div className="ax-app">
      <a className="ax-skip-link" href="#ax-main-content">Skip to dashboard content</a>
      <aside className="ax-side">
        <a className="ax-logo" href="/" aria-label="Draftix home">
          <img className="ax-logo-image" src="/images/draftix.webp" alt="" width="32" height="32" />
          <span className="ax-logo-word">
            DRAFT<em>IX</em>
          </span>
        </a>
        <nav className="ax-nav" aria-label="Admin sections">
          <button type="button" className={activeView === "overview" ? "ax-nav-active" : "ax-nav-item"} onClick={() => selectView("overview")} aria-current={activeView === "overview" ? "page" : undefined}>
            <span className="ax-nav-icon" aria-hidden="true">{Icon.grid}</span>
            Overview
          </button>
          <button type="button" className={activeView === "rooms" ? "ax-nav-active" : "ax-nav-item"} onClick={() => selectView("rooms")} aria-current={activeView === "rooms" ? "page" : undefined}>
            <span className="ax-nav-icon" aria-hidden="true">{Icon.door}</span>
            Draft Rooms
          </button>
          <button type="button" className={activeView === "pages" ? "ax-nav-active" : "ax-nav-item"} onClick={() => selectView("pages")} aria-current={activeView === "pages" ? "page" : undefined}>
            <span className="ax-nav-icon" aria-hidden="true">{Icon.doc}</span>
            Top Pages
          </button>
          <button type="button" className={activeView === "referrers" ? "ax-nav-active" : "ax-nav-item"} onClick={() => selectView("referrers")} aria-current={activeView === "referrers" ? "page" : undefined}>
            <span className="ax-nav-icon" aria-hidden="true">{Icon.link}</span>
            Referrers
          </button>
          <button type="button" className={activeView === "feedback" ? "ax-nav-active" : "ax-nav-item"} onClick={() => selectView("feedback")} aria-current={activeView === "feedback" ? "page" : undefined}>
            <span className="ax-nav-icon" aria-hidden="true">{Icon.chat}</span>
            Feedback
          </button>
          <button type="button" className={activeView === "errors" ? "ax-nav-active" : "ax-nav-item"} onClick={() => selectView("errors")} aria-current={activeView === "errors" ? "page" : undefined}>
            <span className="ax-nav-icon" aria-hidden="true">{Icon.alert}</span>
            Client Errors
          </button>
        </nav>
        <div className="ax-side-footer">
          <span className="ax-avatar">A</span>
          <div className="ax-side-user">
            <strong>Admin</strong>
            <button type="button" className="ax-link" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="ax-main" id="ax-main-content" tabIndex="-1">
        <header className="ax-topbar">
          <div className="ax-topbar-title">
            <span className="ax-topbar-icon" aria-hidden="true">{Icon.clock}</span>
            <div>
              <h1>{viewMeta[0]}</h1>
              <p>{viewMeta[1]}</p>
            </div>
          </div>
          <div className="ax-topbar-tools">
            {activeView === "overview" ? <div className="ax-range" aria-label="Dashboard period">
              {RANGE_OPTIONS.map(([key, label]) => <button key={key} type="button" className={range === key ? "is-active" : ""} onClick={() => setRange(key)}>{label}</button>)}
            </div> : null}
            <span className="ax-updated">
              {tick >= 0 && ago ? `Updated ${ago}` : null}
            </span>
            <button
              type="button"
              className="ax-refresh"
              onClick={() => loadStats(token)}
              disabled={loading}
            >
              <span className="ax-btn-icon" aria-hidden="true">{Icon.refresh}</span>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </header>

        <div className="ax-content">
          {error ? <div className="ax-error ax-banner-error" role="alert" aria-live="polite"><span>{error}</span><button type="button" onClick={() => loadStats(token)}>Try again</button></div> : null}
          {loading && !stats ? <div className="ax-loading" role="status" aria-live="polite"><span /><span /><span /><span className="ax-loading-label">Loading metrics…</span></div> : null}

          {stats ? (
            <>
              {activeView === "overview" ? <>
                <div className="ax-cards">
                  <StatCard label="Unique visitors" value={visitorsByRange === null ? "--" : fmtInt(visitorsByRange)} sub={visitorsByRange === null ? "30-day traffic unavailable" : rangeLabel} icon={Icon.users} tone="accent" />
                  <StatCard label="Draft rooms" value={fmtInt(roomsByRange)} sub="Persistent creation events" icon={Icon.door} />
                  <StatCard label="Completed drafts" value={fmtInt(completedByRange)} sub={rangeLabel} icon={Icon.grid} />
                  <StatCard label="Draft completion" value={`${rate(completedByRange, roomsByRange)}%`} sub="Created to completed" icon={Icon.calendar} />
                  <StatCard label="Live rooms" value={fmtInt(stats.rooms?.active)} sub="Active now" icon={Icon.eye} />
                </div>

                <div className="ax-overview-grid ax-overview-primary">
                  <div className="ax-chart-wrap"><p className="ax-chart-sub">Traffic during the selected period</p><DailyChart daily={overviewDaily} rangeLabel={range === "last30" || range === "allTime" ? "Latest 14 days" : rangeLabel} /></div>
                  <CompletionCard funnel={selectedFunnel} />
                </div>
              </> : null}

              {activeView === "overview" || activeView === "rooms" ? <>
                <div className="ax-section-heading ax-section-heading-flow">
                  <div><span className="ax-section-kicker">Core journey</span><h2>Draft conversion</h2></div>
                  <span className="ax-period">{activeView === "overview" ? rangeLabel : "7D"}</span>
                </div>
                {activeView === "overview" ? <div className="ax-overview-grid ax-overview-secondary"><DraftFunnel data={selectedFunnel} /><ProductHealth stats={stats} errors={errors} funnel={selectedFunnel} /></div> : <DraftFunnel data={stats.funnel?.last7} />}
              </> : null}

              {activeView === "overview" || activeView === "rooms" ? <div className="ax-row">
                {stats.rooms ? (
                  <section className="ax-panel ax-rooms" id="ax-rooms">
                    <h3>
                      <span className="ax-panel-icon" aria-hidden="true">{Icon.door}</span>
                      Product activity
                    </h3>
                    <div className="ax-roomstat-grid">
                      <div className="ax-roomstat">
                        <span className="ax-roomstat-num">{fmtInt(stats.rooms.created7d)}</span>
                        <span className="ax-roomstat-label">Rooms created · 7d</span>
                      </div>
                      <div className="ax-roomstat">
                        <span className="ax-roomstat-num">{fmtInt(stats.rooms.completed30d)}</span>
                        <span className="ax-roomstat-label">Drafts completed · 30d</span>
                      </div>
                      <div className="ax-roomstat">
                        <span className="ax-roomstat-num">{fmtInt(stats.productMetrics?.bracketMaker?.created7d ?? stats.tournaments?.created7d)}</span>
                        <span className="ax-roomstat-label">Brackets created · 7d</span>
                      </div>
                      <div className="ax-roomstat">
                        <span className="ax-roomstat-num">{fmtInt(stats.productMetrics?.teamBalancer?.generated7d)}</span>
                        <span className="ax-roomstat-label">Teams balanced · 7d</span>
                      </div>
                    </div>
                    <dl className="ax-roomstat-foot">
                      <div><dt>All-time rooms</dt><dd>{fmtInt(stats.rooms.allTimeCreated)}</dd></div>
                      <div><dt>All-time brackets</dt><dd>{fmtInt(stats.productMetrics?.bracketMaker?.allTimeCreated ?? stats.tournaments?.allTimeCreated)}</dd></div>
                      <div><dt>All-time balances</dt><dd>{fmtInt(stats.productMetrics?.teamBalancer?.allTimeGenerated)}</dd></div>
                      <div><dt>Balance copies / 7d</dt><dd>{fmtInt(stats.productMetrics?.teamBalancer?.copied7d)}</dd></div>
                      <div><dt>Bracket visitors / 7d</dt><dd>{fmtInt(stats.productMetrics?.bracketMaker?.visitors7d)}</dd></div>
                      <div><dt>Active rooms</dt><dd>{fmtInt(stats.rooms.active)}</dd></div>
                    </dl>
                  </section>
                ) : null}
              </div> : null}

              {activeView === "feedback" ? <div className="fb-layout">
                <aside className="fb-summary ax-panel">
                  <div className="fb-average">
                    <span className="fb-average-num">{feedback?.average != null ? feedback.average : "--"}</span>
                    <span className="fb-average-of">/ 5 average</span>
                    <span className="fb-average-stars" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={feedback?.average != null && s <= Math.round(feedback.average) ? "fb-star on" : "fb-star"}>★</span>
                      ))}
                    </span>
                  </div>
                  <dl className="fb-facts">
                    <div><dt>Total</dt><dd>{fmtInt(feedback?.total)}</dd></div>
                    <div><dt>Today</dt><dd>{fmtInt(feedback?.today)}</dd></div>
                    <div><dt>7 days</dt><dd>{fmtInt(feedback?.last7)}</dd></div>
                  </dl>
                  {feedback?.distribution && Object.keys(feedback.distribution).length ? (
                    <div className="fb-dist">
                      <h4>Ratings breakdown</h4>
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const count = Number(feedback.distribution[String(stars)] || feedback.distribution[stars] || 0);
                        const max = Math.max(1, ...Object.values(feedback.distribution).map(Number));
                        return (
                          <div key={stars} className="fb-dist-row">
                            <span className="fb-dist-label">{stars}★</span>
                            <span className="fb-dist-bar"><span style={{ width: `${Math.round((count / max) * 100)}%` }} /></span>
                            <span className="fb-dist-count">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </aside>

                <section className="fb-feed ax-panel" aria-label="Latest feedback">
                  <h3>
                    <span className="ax-panel-icon" aria-hidden="true">{Icon.chat}</span>
                    Latest feedback
                    {feedback?.recent?.length ? <span className="ax-panel-note">{feedback.recent.length} most recent</span> : null}
                  </h3>
                  {feedback?.recent && feedback.recent.length ? (
                    <div className="fb-feed-list" tabIndex={0} aria-label="Feedback entries, scroll to browse">
                      {feedback.recent.map((entry) => (
                        <article key={entry.id} className="fb-entry">
                          <header className="fb-entry-head">
                            <span className={"fb-entry-rating fb-r" + entry.rating}>{entry.rating}★</span>
                            <time className="fb-entry-time" title={new Date(entry.createdAt).toLocaleString()}>
                              {new Date(entry.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </time>
                          </header>
                          <p className="fb-entry-message">{entry.message}</p>
                          <footer className="fb-entry-foot">sent from <code>{entry.page}</code></footer>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="fb-empty">No feedback submitted yet.</p>
                  )}
                </section>
              </div> : null}

              {activeView === "errors" ? <div className="fb-layout">
                <aside className="fb-summary ax-panel">
                  <div className="fb-average">
                    <span className="fb-average-num">{errors?.today != null ? fmtInt(errors.today) : "--"}</span>
                    <span className="fb-average-of">errors today</span>
                  </div>
                  <dl className="fb-facts">
                    <div><dt>Total</dt><dd>{fmtInt(errors?.total)}</dd></div>
                    <div><dt>Open</dt><dd>{fmtInt(errors?.open)}</dd></div>
                    <div><dt>Resolved</dt><dd>{fmtInt(errors?.resolved)}</dd></div>
                    <div><dt>Today</dt><dd>{fmtInt(errors?.today)}</dd></div>
                    <div><dt>7 days</dt><dd>{fmtInt(errors?.last7)}</dd></div>
                  </dl>
                  {errors?.kinds && Object.keys(errors.kinds).length ? (
                    <div className="fb-dist err-dist">
                      <h4>By type</h4>
                      {["render", "window", "unhandledrejection"].map((kind) => {
                        const count = Number(errors.kinds[kind] || 0);
                        const max = Math.max(1, ...Object.values(errors.kinds).map(Number));
                        return (
                          <div key={kind} className="fb-dist-row">
                            <span className="fb-dist-label">{ERROR_KIND_LABELS[kind]}</span>
                            <span className="fb-dist-bar"><span style={{ width: `${Math.round((count / max) * 100)}%` }} /></span>
                            <span className="fb-dist-count">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </aside>

                <section className="fb-feed ax-panel" aria-label="Latest client errors">
                  <h3>
                    <span className="ax-panel-icon" aria-hidden="true">{Icon.alert}</span>
                    Latest errors
                    {errors?.recent?.length ? <span className="ax-panel-note">{errors.recent.length} most recent</span> : null}
                  </h3>
                  {errors?.recent && errors.recent.length ? (
                    <div className="fb-feed-list" tabIndex={0} aria-label="Client error entries, scroll to browse">
                      {errors.recent.map((entry) => (
                        <article key={entry.id} className={`fb-entry err-entry${entry.resolved ? " is-resolved" : ""}`}>
                          <header className="fb-entry-head">
                            <span className={`err-kind err-k-${entry.kind}`}>{ERROR_KIND_LABELS[entry.kind] || entry.kind}</span>
                            <div className="err-entry-status">
                              <span className={`err-status${entry.resolved ? " is-resolved" : ""}`}>{entry.resolved ? "Resolved" : "Open"}</span>
                              <time className="fb-entry-time" title={new Date(entry.createdAt).toLocaleString()}>
                                {new Date(entry.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </time>
                            </div>
                          </header>
                          <p className="fb-entry-message">{entry.message}</p>
                          {entry.stack ? (
                            <details className="err-stack">
                              <summary>Stack trace</summary>
                              <pre>{entry.stack}</pre>
                            </details>
                          ) : null}
                          <footer className="fb-entry-foot">
                            <span>on <code>{entry.page}</code>{entry.userAgent ? <> · <code>{entry.userAgent}</code></> : null}</span>
                            <button type="button" className="err-resolve-button" disabled={errorUpdatingId === entry.id} onClick={() => setErrorResolved(entry, !entry.resolved)}>
                              {errorUpdatingId === entry.id ? "Saving…" : entry.resolved ? "Reopen" : "Mark as resolved"}
                            </button>
                          </footer>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="fb-empty">No client errors reported yet.</p>
                  )}
                </section>
              </div> : null}

              {activeView === "overview" || activeView === "pages" || activeView === "referrers" ? <div className="ax-row ax-acquisition-row">
                {activeView === "overview" || activeView === "referrers" ? <RankedList id="ax-referrers" title="Top referrers" icon={Icon.link} pairs={stats.topReferrers} emptyText="No external referrers yet." linkType="host" limit={activeView === "overview" ? 6 : undefined} onViewAll={activeView === "overview" ? () => selectView("referrers") : undefined} /> : null}
                {activeView === "overview" || activeView === "pages" ? <RankedList id="ax-pages" title="Top pages" icon={Icon.doc} pairs={stats.topPages} emptyText="No pageviews recorded yet." linkType="path" limit={activeView === "overview" ? 5 : undefined} onViewAll={activeView === "overview" ? () => selectView("pages") : undefined} showShare /> : null}
              </div> : null}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
