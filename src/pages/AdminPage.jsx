import { useEffect, useState } from "react";
import "../styles/admin.css";
import { supabaseConfig } from "../lib/supabaseConfig.js";

const TOKEN_KEY = "dx_admin_token";
const ADMIN_VIEWS = ["overview", "rooms", "pages", "referrers", "feedback", "errors"];

const ERROR_KIND_LABELS = { render: "Render", window: "Script", unhandledrejection: "Async" };

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

function StatCard({ label, value, sub, icon }) {
  return (
    <article className="ax-card">
      <div className="ax-card-top">
        <span className="ax-card-label">{label}</span>
        <span className="ax-card-icon" aria-hidden="true">{icon}</span>
      </div>
      <div className="ax-card-value">{value}</div>
      {sub ? <div className="ax-card-sub">{sub}</div> : null}
    </article>
  );
}

function RankedList({ id, title, icon, pairs, emptyText, linkType }) {
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
        {pairs?.length ? <span className="ax-panel-note">Top {pairs.length}</span> : null}
      </h3>
      {pairs && pairs.length ? (
        <ul className="ax-list">
          {pairs.map(([key, value]) => {
            const href = itemHref(key);
            return (
              <li key={key}>
                {href ? <a href={href} target="_blank" rel="noreferrer">{key}</a> : <span>{key}</span>}
                <strong>{value}</strong>
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
function DailyChart({ daily }) {
  if (!daily || !daily.length) return null;
  const W = 720;
  const H = 240;
  const PAD = { top: 16, right: 12, bottom: 26, left: 44 };
  const views = daily.map((d) => Number(d.views) || 0);
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
        Views over time
        <span className="ax-panel-note">last {daily.length} days</span>
      </h3>
      <svg
        className="ax-linechart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Page views per day, last ${daily.length} days`}
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

  return (
    <section className="ax-panel ax-funnel" aria-labelledby="ax-funnel-title">
      <h3 id="ax-funnel-title">
        <span className="ax-panel-icon" aria-hidden="true">{Icon.grid}</span>
        Draft funnel
        <span className="ax-panel-note">Last 7 days</span>
      </h3>
      <ol className="ax-funnel-steps">
        {steps.map(([label, rawValue], index) => {
          const value = Number(rawValue) || 0;
          const previous = index ? Number(steps[index - 1][1]) || 0 : 0;
          const rate = previous > 0 ? Math.round((value / previous) * 100) : null;
          return (
            <li key={label}>
              <span className="ax-funnel-index">{String(index + 1).padStart(2, "0")}</span>
              <strong>{fmtInt(value)}</strong>
              <span className="ax-funnel-label">{label}</span>
              {index > 0 ? <small>{rate === null ? "No prior traffic" : `${rate}% from prior step`}</small> : <small>Unique visitors</small>}
            </li>
          );
        })}
      </ol>
      <p className="ax-funnel-note">Visit steps count unique anonymous visitors. Room steps count one immutable milestone per room.</p>
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
    if (token && activeView === "errors") loadErrors(token);
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
      if (!res.ok) return; // keep the last good feed; errors surface via stats banner
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
              <h1>{activeView === "overview" ? "Overview" : activeView === "rooms" ? "Draft Rooms" : activeView === "pages" ? "Top Pages" : activeView === "feedback" ? "User Feedback" : activeView === "errors" ? "Client Errors" : "Referrers"}</h1>
              <p>{activeView === "feedback" ? "Ratings and notes from Draftix players." : activeView === "errors" ? "Browser crashes reported by the app." : "Traffic and usage across Draftix."}</p>
            </div>
          </div>
          <div className="ax-topbar-tools">
            <span className="ax-updated">
              {tick >= 0 && ago ? `Updated ${ago} / auto-refresh 60s` : null}
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
              {activeView === "overview" ? <div className="ax-cards">
                <StatCard label="Views today" value={fmtInt(stats.today?.views)} sub="Since midnight UTC" icon={Icon.eye} />
                <StatCard label="Visitors today" value={fmtInt(stats.today?.visitors)} sub="Unique anonymous visitors" icon={Icon.users} />
                <StatCard label="Views / 7 days" value={fmtInt(stats.last7?.views)} sub="Rolling week" icon={Icon.calendar} />
                <StatCard label="Visitors / 7 days" value={fmtInt(stats.last7?.visitors)} sub="Unique this week" icon={Icon.users} />
                <StatCard label="All-time views" value={fmtInt(stats.allTime?.views)} sub={`${fmtInt(stats.allTime?.visitors)} unique visitors`} icon={Icon.infinity} />
              </div> : null}

              {activeView === "overview" || activeView === "rooms" ? <DraftFunnel data={stats.funnel?.last7} /> : null}

              {activeView === "overview" || activeView === "rooms" ? <div className="ax-row">
                {activeView === "overview" ? <DailyChart daily={stats.daily} /> : null}
                {stats.rooms ? (
                  <section className="ax-panel ax-rooms" id="ax-rooms">
                    <h3>
                      <span className="ax-panel-icon" aria-hidden="true">{Icon.door}</span>
                      Product activity
                    </h3>
                    <p className="ax-roomstat-note">Successful actions remain counted after private rooms expire.</p>
                    <div className="ax-roomstat-grid">
                      <div className="ax-roomstat">
                        <span className="ax-roomstat-num">{fmtInt(stats.rooms.created7d)}</span>
                        <span className="ax-roomstat-label">rooms created / 7 days</span>
                      </div>
                      <div className="ax-roomstat">
                        <span className="ax-roomstat-num">{fmtInt(stats.rooms.completed30d)}</span>
                        <span className="ax-roomstat-label">completed drafts / 30 days</span>
                      </div>
                      <div className="ax-roomstat">
                        <span className="ax-roomstat-num">{fmtInt(stats.productMetrics?.bracketMaker?.created7d ?? stats.tournaments?.created7d)}</span>
                        <span className="ax-roomstat-label">brackets created / 7 days</span>
                      </div>
                      <div className="ax-roomstat">
                        <span className="ax-roomstat-num">{fmtInt(stats.productMetrics?.teamBalancer?.generated7d)}</span>
                        <span className="ax-roomstat-label">teams balanced / 7 days</span>
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
                    <span className="fb-average-num">{feedback?.average != null ? feedback.average : "—"}</span>
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
                    <span className="fb-average-num">{errors?.today != null ? fmtInt(errors.today) : "—"}</span>
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

              {activeView === "overview" || activeView === "pages" || activeView === "referrers" ? <div className="ax-row">
                {activeView === "overview" || activeView === "pages" ? <RankedList id="ax-pages" title="Top pages" icon={Icon.doc} pairs={stats.topPages} emptyText="No pageviews recorded yet." linkType="path" /> : null}
                {activeView === "overview" || activeView === "referrers" ? <RankedList id="ax-referrers" title="Top referrers" icon={Icon.link} pairs={stats.topReferrers} emptyText="No external referrers yet." linkType="host" /> : null}
              </div> : null}
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
