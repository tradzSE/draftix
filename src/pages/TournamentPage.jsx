import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react/ArrowRight";
import { ArrowLeft } from "@phosphor-icons/react/ArrowLeft";
import { ArrowsClockwise } from "@phosphor-icons/react/ArrowsClockwise";
import { Check } from "@phosphor-icons/react/Check";
import { ClockCounterClockwise } from "@phosphor-icons/react/ClockCounterClockwise";
import { Copy } from "@phosphor-icons/react/Copy";
import { CornersIn } from "@phosphor-icons/react/CornersIn";
import { CornersOut } from "@phosphor-icons/react/CornersOut";
import { Minus } from "@phosphor-icons/react/Minus";
import { Plus } from "@phosphor-icons/react/Plus";
import { ShieldCheck } from "@phosphor-icons/react/ShieldCheck";
import { Trophy } from "@phosphor-icons/react/Trophy";
import SiteHeader from "../components/SiteHeader.jsx";
import PublicFooter from "../components/PublicFooter.jsx";
import FeedbackPrompt from "../components/FeedbackPrompt.jsx";
import { clearMatchResult, createTournament, getTournament, listMyTournaments, migrateTournamentStorage, registerMyTournament, removeMyTournament, saveTournamentToken, setMatchResult, subscribeToTournament, tournamentToken, updateSeriesScore, updateTournamentFormat } from "../lib/tournaments.js";
import { navigate } from "../lib/spaRouter.js";
// Tournament styles ride this lazy chunk instead of the entry bundle.
// (Create-flow polish is merged at the end of tournaments.css.)
import "../styles/tournaments.css";
import { tournamentSeo } from "../lib/tournaments.js";

// One-time upgrade: rescue any organizer tokens still living in
// sessionStorage (pre-persistence tournaments) into the persistent
// "My tournaments" registry before any component in this chunk reads it.
// Module scope runs once when the chunk loads, covering both
// TournamentHubPage and TournamentPage ahead of their first render.
migrateTournamentStorage();

const sizes = Array.from({ length: 14 }, (_, index) => index + 3);
const formats = [
  { value: "single_elimination", label: "Single elimination" },
  { value: "double_elimination", label: "Double elimination" },
  { value: "round_robin", label: "Round robin" },
  { value: "swiss", label: "Swiss" },
];
const formatLabels = { single_elimination: "Single elimination", double_elimination: "Double elimination", round_robin: "Round robin", swiss: "Swiss" };
const bracketThemes = [
  ["classic-light", "Classic", "Light"],
  ["modern-dark", "Modern", "Dark"],
  ["card-light", "Card", "Light"],
  ["circuit-dark", "Circuit", "Dark"],
];
const activities = [
  "Valorant", "Counter-Strike 2", "League of Legends", "Dota 2", "Mobile Legends: Bang Bang",
  "Rocket League", "Overwatch 2", "Fortnite", "Call of Duty", "Rainbow Six Siege",
  "EA Sports FC", "Basketball", "Football / Soccer", "Volleyball", "Chess", "Table Tennis",
];

function roundName(round, finalRound) {
  const remaining = finalRound - round;
  if (remaining === 0) return "Final";
  if (remaining === 1) return "Semifinals";
  if (remaining === 2) return "Quarterfinals";
  return "Round of 16";
}
function roundLabel(round, maxRound, format, totalRounds) {
  if (format === "double_elimination") {
    const winnersRounds = Math.round((maxRound + 1) / 3);
    if (round <= winnersRounds) return round === winnersRounds ? "Winners Final" : `Winners Round ${round}`;
    if (round < maxRound) return `Losers Round ${round - winnersRounds}`;
    return "Grand Final";
  }
  if (format === "round_robin") return `Round ${round}`;
  if (format === "swiss") return totalRounds ? `Swiss Round ${round} of ${totalRounds}` : `Swiss Round ${round}`;
  return roundName(round, maxRound);
}

function copyText(text, setCopied) {
  navigator.clipboard?.writeText(text).then(() => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  });
}

function MyTournaments() {
  // Server-side status per slug. Fetches are staggered so the hub never
  // fires the whole registry at Supabase in one burst, and entries whose
  // localStorage metadata is stale (migrated stubs with no name) get
  // refreshed from draftix_tournament_state.
  const [entries, setEntries] = useState(() => listMyTournaments());
  const [statuses, setStatuses] = useState(() => ({}));

  useEffect(() => {
    if (!entries.length) return undefined;
    let cancelled = false;
    const timers = [];
    entries.forEach((entry, index) => {
      timers.push(window.setTimeout(async () => {
        try {
          const state = await getTournament(entry.slug, entry.token);
          if (cancelled || !state) return;
          // Self-heal registry metadata (migrated stubs, renamed tournaments).
          registerMyTournament({ slug: entry.slug, name: state.name, token: entry.token, format: state.format, activity: state.activity, teamCount: state.teamCount, createdAt: state.createdAt ? Date.parse(state.createdAt) : 0 });
          if (state.canManage) setStatuses((current) => ({ ...current, [entry.slug]: state.status }));
          else setStatuses((current) => ({ ...current, [entry.slug]: "unavailable" }));
        } catch {
          if (!cancelled) setStatuses((current) => ({ ...current, [entry.slug]: "unavailable" }));
        }
      }, index * 120));
    });
    return () => { cancelled = true; timers.forEach((timer) => window.clearTimeout(timer)); };
  }, [entries]);

  function forget(slug) {
    removeMyTournament(slug);
    setEntries((current) => current.filter((entry) => entry.slug !== slug));
  }

  if (!entries.length) return <section className="my-tournaments" aria-label="My tournaments">
    <header><strong>My tournaments</strong><span>Organizer access saved on this device</span></header>
    <p className="my-tournaments-empty"><ClockCounterClockwise size={20} aria-hidden="true" /><span>No tournaments yet</span></p>
  </section>;
  return <section className="my-tournaments" aria-label="My tournaments">
    <header><strong>My tournaments</strong><span>Organizer access saved on this device</span></header>
    <ul>
      {entries.map((entry) => {
        const status = statuses[entry.slug] || "loading";
        return <li key={entry.slug}>
          <div className="my-tournament-info">
            <a className="my-tournament-name" href={`/t/${entry.slug}?key=${encodeURIComponent(entry.token)}`}>{entry.name || entry.slug}</a>
            <span className="my-tournament-meta">
              {entry.activity ? `${entry.activity} · ` : ""}{entry.format ? `${formatLabels[entry.format] || entry.format} · ` : ""}{entry.teamCount ? `${entry.teamCount} entrants` : ""}
            </span>
          </div>
          <span className={`tournament-status ${status === "loading" ? "" : status}`}>{status === "loading" ? "Checking…" : status === "unavailable" ? "Unavailable" : status}</span>
          <a className="my-tournament-manage" href={`/t/${entry.slug}?key=${encodeURIComponent(entry.token)}`}>{statuses[entry.slug] === "unavailable" ? "View" : "Manage"}</a>
          <button type="button" className="my-tournament-remove" onClick={() => forget(entry.slug)} aria-label={`Forget ${entry.name || entry.slug}`}>Forget</button>
        </li>;
      })}
    </ul>
  </section >;
}

export function TournamentHubPage() {
  const [activeHubTab, setActiveHubTab] = useState("create");
  const [size, setSize] = useState(8);
  const [name, setName] = useState("");
  const [bestOf, setBestOf] = useState(3);
  const [format, setFormat] = useState("single_elimination");
  const [activity, setActivity] = useState("General");
  const [customActivity, setCustomActivity] = useState("");
  const [teams, setTeams] = useState(() => Array.from({ length: 8 }, (_, index) => `Entrant ${index + 1}`));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function changeSize(next) {
    setSize(next);
    setTeams((current) => Array.from({ length: next }, (_, index) => current[index] || `Entrant ${index + 1}`));
  }

  function shuffleTeams() {
    setTeams((current) => {
      const shuffled = [...current];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
      }
      return shuffled;
    });
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const selectedActivity = activity === "Other" ? customActivity.trim() : activity;
      if (!selectedActivity) throw new Error("Enter the game or activity name.");
      const result = await createTournament(name, teams.map((team) => team.trim()), bestOf, format, selectedActivity);
      saveTournamentToken(result.slug, result.organizerToken);
      registerMyTournament({ slug: result.slug, name, token: result.organizerToken, format, activity: selectedActivity, teamCount: size });
      navigate(`/t/${result.slug}?feedback=bracket-created`);
    } catch (requestError) {
      setError(requestError.message);
      setBusy(false);
    }
  }

  return <div className="sp-page tournament-page">
    <SiteHeader />
    <main className="tournament-create-shell">
      <header className="tournament-intro">
        <h1>{tournamentSeo.heading}</h1>
        <p>{tournamentSeo.intro}</p>
      </header>
      <section className="tournament-hub-workspace" aria-label="Tournament organizer">
        <nav className="tournament-hub-tabs" aria-label="Tournament organizer views">
          <button type="button" className={activeHubTab === "create" ? "is-active" : ""} aria-current={activeHubTab === "create" ? "page" : undefined} onClick={() => setActiveHubTab("create")}>Create tournament</button>
          <button type="button" className={activeHubTab === "history" ? "is-active" : ""} aria-current={activeHubTab === "history" ? "page" : undefined} onClick={() => setActiveHubTab("history")}>History</button>
        </nav>
        <div className="tournament-hub-panel">
          {activeHubTab === "create" ? <form className="tournament-form" onSubmit={submit}>
            <section className="tournament-form-section" aria-labelledby="tournament-details-heading">
              <header className="tournament-section-head"><span>01</span><div><h2 id="tournament-details-heading">Tournament details</h2><p>Name your event and set the rules.</p></div></header>
              <div className="tournament-basics-grid">
                <label className="tournament-name-field">Tournament name<input value={name} maxLength="80" required placeholder="Community Cup" onChange={(event) => setName(event.target.value)} /></label>
                <label>Game or sport<select value={activity} onChange={(event) => setActivity(event.target.value)}><option value="General">General</option>{activities.map((option) => <option key={option} value={option}>{option}</option>)}<option value="Other">Other</option></select></label>
                {activity === "Other" ? <label>Custom game or activity<input value={customActivity} maxLength="60" required placeholder="Enter a game or activity" onChange={(event) => setCustomActivity(event.target.value)} /></label> : null}
                <label>Entrant count<select value={size} onChange={(event) => changeSize(Number(event.target.value))}>{sizes.map((option) => <option key={option} value={option}>{option} entrants</option>)}</select></label>
                <label>Tournament format<select value={format} onChange={(event) => setFormat(event.target.value)}>{formats.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                <label>Series length<select value={bestOf} onChange={(event) => setBestOf(Number(event.target.value))}><option value="1">Best of 1</option><option value="3">Best of 3</option><option value="5">Best of 5</option><option value="7">Best of 7</option></select></label>
              </div>
            </section>
            <section className="tournament-form-section" aria-labelledby="tournament-teams-heading">
              <header className="tournament-section-head"><span>02</span><div><h2 id="tournament-teams-heading">Seed the entrants</h2><p>Teams or players, in seed order.</p></div><button className="tournament-shuffle" type="button" onClick={shuffleTeams}><ArrowsClockwise aria-hidden="true" />Shuffle</button></header>
              <div className="tournament-team-fields">
                {teams.map((team, index) => <label key={index}><span>{String(index + 1).padStart(2, "0")}</span><input value={team} maxLength="40" required aria-label={`Seed ${index + 1} entrant name`} onChange={(event) => setTeams((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></label>)}
              </div>
            </section>
            {error && <p className="tournament-error" role="alert">{error}</p>}
            <footer className="tournament-form-actions">
              <p><strong>{size} entrants</strong><span>{formatLabels[format]} · Best of {bestOf}</span></p>
              <button className="tournament-submit" type="submit" disabled={busy}>{busy ? "Creating bracket…" : <>Create tournament<ArrowRight aria-hidden="true" weight="bold" /></>}</button>
            </footer>
          </form> : <MyTournaments />}
        </div>
      </section>
      <section className="tournament-create-help" aria-label="Bracket maker help">
        {tournamentSeo.questions.map(({ title, answer }) => <details key={title}><summary>{title}</summary><p>{answer}</p></details>)}
      </section>
    </main>
    <PublicFooter />
  </div>;
}

function MatchCard({ match, teams, canManage, bestOf = 1, onSave, onClear, onScore, busy }) {
  const [scoreA, setScoreA] = useState(match.scoreA ?? "");
  const [scoreB, setScoreB] = useState(match.scoreB ?? "");
  const [winner, setWinner] = useState(match.winnerTeamId || "");
  const [localError, setLocalError] = useState("");
  const teamA = teams.get(match.teamAId);
  const teamB = teams.get(match.teamBId);
  const isBye = Boolean(teamA) !== Boolean(teamB);
  // Only resync local inputs when the server-side saved values actually change,
  // not on every poll (each poll creates a new `match` object identity, which
  // used to wipe whatever the organizer was typing every 5 seconds).
  const savedScoresKey = `${match.id}:${match.scoreA ?? ""}:${match.scoreB ?? ""}:${match.winnerTeamId || ""}`;
  const savedScoresKeyRef = useRef(savedScoresKey);
  useEffect(() => {
    if (savedScoresKeyRef.current === savedScoresKey) return;
    savedScoresKeyRef.current = savedScoresKey;
    setScoreA(match.scoreA ?? "");
    setScoreB(match.scoreB ?? "");
    setWinner(match.winnerTeamId || "");
    setLocalError("");
  }, [savedScoresKey, match.scoreA, match.scoreB, match.winnerTeamId]);
  const isDecided = Boolean(match.winnerTeamId);
  // Two modes:
  //  - Live score: for best-of-N matches (N>1) that aren't decided yet — the
  //    organizer picks a current leader + the running score, then saves it
  //    live. The bracket doesn't advance; only the displayed score updates.
  //  - Final result: requires the winner to reach the required number of wins.
  const requiredWins = Math.ceil(bestOf / 2);
  const winnerScore = winner === match.teamAId ? scoreA : winner === match.teamBId ? scoreB : "";
  const loserScore = winner === match.teamAId ? scoreB : winner === match.teamBId ? scoreA : "";
  const isLiveSeries = bestOf > 1 && !isDecided;
  const scoreMismatch = Boolean(winner) && winnerScore !== "" && loserScore !== "" && Number(winnerScore) <= Number(loserScore);
  const wouldWinNow = isLiveSeries && Boolean(winner) && winnerScore !== "" && loserScore !== "" && Number(winnerScore) >= requiredWins && Number(winnerScore) > Number(loserScore);
  const seriesIncomplete = Boolean(winner) && winnerScore !== "" && Number(winnerScore) !== requiredWins;
  const liveScoreInvalid = busy || !winner || scoreA === "" || scoreB === "" || scoreMismatch;
  const finalInvalid = busy || !winner || scoreA === "" || scoreB === "" || scoreMismatch || seriesIncomplete;
  function changeScore(setScore) {
    return (event) => { setLocalError(""); setScore(event.target.value); };
  }
  function changeWinner(teamId) {
    return () => { setLocalError(""); setWinner(teamId); };
  }
  function saveLive() {
    if (liveScoreInvalid) return;
    setLocalError("");
    onScore(match.id, Number(scoreA), Number(scoreB));
  }
  function saveFinal() {
    if (finalInvalid) return;
    if (Number(scoreA) === Number(scoreB)) { setLocalError("Scores cannot be tied — pick a winner with the higher score."); return; }
    if (seriesIncomplete) { setLocalError(`Best of ${bestOf} — the winner must score ${requiredWins} maps.`); return; }
    onSave(match.id, Number(scoreA), Number(scoreB), winner);
  }
  return <article className={`bracket-match${isDecided ? " is-complete" : ""}${isBye ? " is-bye" : ""}`} data-match-id={match.id}>
    <div className="bracket-match-label">Match {match.position}</div>
    {[teamA, teamB].map((team, index) => {
      const teamId = index ? match.teamBId : match.teamAId;
      const value = index ? scoreB : scoreA;
      return <div className={`bracket-team${winner === teamId ? " is-winner" : ""}`} key={index}>
        <button type="button" disabled={!canManage || !team || busy || isDecided} onClick={changeWinner(teamId)}><span>{team ? <><small>{team.seed}</small>{team.name}</> : isBye ? "Bye" : "TBD"}</span>{match.winnerTeamId === teamId && <b>W</b>}</button>
        {canManage && teamA && teamB && !isDecided ? <input aria-label={`${team?.name || "Entrant"} score`} type="number" min="0" max={bestOf} value={value} onChange={changeScore(index ? setScoreB : setScoreA)} /> : <span className="bracket-score">{value === "" ? "—" : value}</span>}
      </div>;
    })}
    {canManage && teamA && teamB && !isDecided && <div className="bracket-actions">
      {isLiveSeries && <button type="button" disabled={liveScoreInvalid} onClick={saveLive} className="is-outline">{wouldWinNow ? `Win series ${requiredWins}-${Math.max(0, Number(loserScore))}` : "Save live score"}</button>}
      <button type="button" className="is-final" disabled={finalInvalid} onClick={saveFinal}>{seriesIncomplete ? `Needs ${requiredWins} wins` : scoreMismatch ? "Winner needs higher score" : "Save final result"}</button>
      {(match.scoreA !== null || match.scoreB !== null) ? <button type="button" className="is-clear" disabled={busy} onClick={() => onScore(match.id, null, null)}>Clear score</button> : ""}
    </div>}
    {canManage && teamA && teamB && localError && <p className="bracket-match-error" role="alert">{localError}</p>}
  </article>;
}

function BracketConnectors({ boardRef, matches, connectChampion = false, scale = 1 }) {
  const [drawing, setDrawing] = useState({ width: 0, height: 0, paths: [], nodes: [] });
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return undefined;
    const draw = () => {
      const boardBox = board.getBoundingClientRect();
      const nodes = [];
      const paths = matches.flatMap((match) => {
        if (!match.nextMatchId && !connectChampion) return [];
        const source = board.querySelector(`[data-match-id="${CSS.escape(match.id)}"]`);
        const target = match.nextMatchId
          ? board.querySelector(`[data-match-id="${CSS.escape(match.nextMatchId)}"]`)
          : board.querySelector("[data-champion-target]");
        if (!source || !target) return [];
        const from = source.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        const x1 = (from.right - boardBox.left) / scale;
        const y1 = (from.top + from.height / 2 - boardBox.top) / scale;
        const x2 = (to.left - boardBox.left) / scale;
        const y2 = (to.top + to.height / 2 - boardBox.top) / scale;
        const middle = x1 + (x2 - x1) / 2;
        nodes.push({ x: middle, y: y2 });
        return [`M ${x1} ${y1} H ${middle} V ${y2} H ${x2}`];
      });
      setDrawing({ width: board.scrollWidth, height: board.scrollHeight, paths, nodes });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(board);
    board.querySelectorAll("[data-match-id]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [boardRef, matches, connectChampion, scale]);
  return <svg className="bracket-connectors" width={drawing.width} height={drawing.height} viewBox={`0 0 ${drawing.width} ${drawing.height}`} aria-hidden="true">
    {drawing.paths.map((path, index) => <path d={path} key={`${path}-${index}`} />)}
    {drawing.nodes.map((node, index) => <circle cx={node.x} cy={node.y} r="3.5" key={`${node.x}-${node.y}-${index}`} />)}
  </svg>;
}
function roundLaneClass(label) {
  if (label.startsWith("Winners")) return "lane-winners";
  if (label.startsWith("Losers")) return "lane-losers";
  if (label.toLowerCase().includes("grand final")) return "lane-final";
  return "";
}

export default function TournamentPage({ slug }) {
  const query = new URLSearchParams(window.location.search);
  const queryToken = query.get("key") || "";
  const createdFromHub = query.get("feedback") === "bracket-created";
  const [token] = useState(() => queryToken || tournamentToken(slug));
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(createdFromHub);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busyMatch, setBusyMatch] = useState("");
  const [copied, setCopied] = useState(false);
  const [formatDraft, setFormatDraft] = useState("");
  const [formatBusy, setFormatBusy] = useState(false);
  const [pendingFormat, setPendingFormat] = useState("");
  const [competitionTab, setCompetitionTab] = useState("matches");
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [bracketFullscreen, setBracketFullscreen] = useState(false);
  const [bracketZoom, setBracketZoom] = useState(null);
  const [bracketMetrics, setBracketMetrics] = useState({ width: 0, height: 0, autoScale: 1 });
  const [bracketTheme, setBracketTheme] = useState(() => {
    const savedTheme = localStorage.getItem("draftix:bracket-theme");
    return bracketThemes.some(([value]) => value === savedTheme) ? savedTheme : "modern-light";
  });
  const boardRef = useRef(null);
  const bracketScrollRef = useRef(null);
  const bracketPanelRef = useRef(null);
  const bracketThemeMenuRef = useRef(null);
  const load = useCallback(async () => {
    try { setData(await getTournament(slug, token)); setError(""); }
    catch (requestError) { setError(requestError.message); }
  }, [slug, token]);
  const measureBracket = useCallback(() => {
    const board = boardRef.current;
    const viewport = bracketScrollRef.current;
    if (!board || !viewport) return;
    const width = board.scrollWidth;
    const height = board.scrollHeight;
    const availableWidth = Math.max(0, viewport.clientWidth - 40);
    const availableHeight = Math.max(0, viewport.clientHeight - 40);
    const widthScale = width ? availableWidth / width : 1;
    const heightScale = height ? availableHeight / height : 1;
    // Keep mobile scoring readable; larger brackets pan within the canvas.
    const minimumScale = window.matchMedia("(max-width: 620px)").matches ? .75 : .35;
    const autoScale = Math.max(minimumScale, Math.min(1, widthScale, heightScale));
    if (bracketZoom === null && autoScale < 1) viewport.scrollLeft = 0;
    setBracketMetrics((current) => current.width === width && current.height === height && Math.abs(current.autoScale - autoScale) < .001
      ? current
      : { width, height, autoScale });
  }, [bracketZoom]);

  useEffect(() => {
    if (queryToken || createdFromHub) {
      if (queryToken) saveTournamentToken(slug, queryToken);
      window.history.replaceState({}, "", `/t/${slug}`);
    }
    load();
  }, [createdFromHub, load, queryToken, slug]);
  useEffect(() => data?.id ? subscribeToTournament(data.id, load) : undefined, [data?.id, load]);
  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    let settleTimer = 0;
    const syncFullscreen = () => {
      const isBracketFullscreen = document.fullscreenElement === bracketPanelRef.current;
      setBracketFullscreen(isBracketFullscreen);
      setBracketZoom(null);
      if (bracketScrollRef.current) {
        bracketScrollRef.current.scrollLeft = 0;
        bracketScrollRef.current.scrollTop = 0;
      }
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          measureBracket();
          settleTimer = window.setTimeout(measureBracket, 120);
        });
      });
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
    };
  }, [measureBracket]);
  useLayoutEffect(() => {
    const board = boardRef.current;
    const viewport = bracketScrollRef.current;
    if (!board || !viewport || !data) return undefined;
    measureBracket();
    const observer = new ResizeObserver(measureBracket);
    observer.observe(board);
    observer.observe(viewport);
    window.addEventListener("resize", measureBracket);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureBracket);
    };
  }, [data, bracketFullscreen, bracketTheme, competitionTab, measureBracket]);
  useEffect(() => { if (data?.name) document.title = `${data.name} Bracket | Draftix`; }, [data?.name]);
  useEffect(() => { if (data?.format) setFormatDraft(data.format); }, [data?.format]);
  useEffect(() => { setCompetitionTab("matches"); }, [data?.format]);
  useEffect(() => {
    if (!pendingFormat) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") cancelFormatChange(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [pendingFormat, data?.format]);
  // Keep the "My tournaments" registry in sync while the organizer is here:
  // captures organizer-link visits on this machine and refreshes names on
  // every bracket load (self-heal, skips writes when nothing changed).
  useEffect(() => {
    if (!token || !data?.name || !data.canManage) return;
    registerMyTournament({ slug, name: data.name, token, format: data.format, activity: data.activity, teamCount: data.teamCount, createdAt: data.createdAt ? Date.parse(data.createdAt) : 0 });
  }, [slug, token, data?.name, data?.canManage, data?.format, data?.activity, data?.teamCount, data?.createdAt]);

  const teams = useMemo(() => new Map((data?.teams || []).map((team) => [team.id, team])), [data?.teams]);
  const rounds = useMemo(() => {
    const grouped = new Map();
    for (const match of data?.matches || []) grouped.set(match.round, [...(grouped.get(match.round) || []), match]);
    return [...grouped.entries()];
  }, [data?.matches]);

  async function save(matchId, scoreA, scoreB, winnerTeamId) {
    setBusyMatch(matchId); setError("");
    try { await setMatchResult(slug, token, matchId, scoreA, scoreB, winnerTeamId); await load(); }
    catch (requestError) { setError(requestError.message); }
    setBusyMatch("");
  }
  async function clear(matchId) {
    setBusyMatch(matchId); setError("");
    try { await clearMatchResult(slug, token, matchId); await load(); }
    catch (requestError) { setError(requestError.message); }
    setBusyMatch("");
  }
  async function updateScore(matchId, scoreA, scoreB) {
    setBusyMatch(matchId); setError("");
    try { await updateSeriesScore(slug, token, matchId, scoreA, scoreB); await load(); }
    catch (requestError) { setError(requestError.message); }
    setBusyMatch("");
  }
  async function toggleBracketFullscreen() {
    try {
      if (document.fullscreenElement === bracketPanelRef.current) await document.exitFullscreen();
      else await bracketPanelRef.current?.requestFullscreen();
    } catch {
      setError("Fullscreen could not be opened in this browser.");
    }
  }
  function changeBracketTheme(nextTheme) {
    setBracketTheme(nextTheme);
    localStorage.setItem("draftix:bracket-theme", nextTheme);
    if (bracketThemeMenuRef.current) bracketThemeMenuRef.current.open = false;
  }
  const effectiveBracketScale = bracketZoom ?? bracketMetrics.autoScale;
  function adjustBracketZoom(delta) {
    setBracketZoom((current) => Math.min(1.25, Math.max(.65, Number(((current ?? effectiveBracketScale) + delta).toFixed(2)))));
  }
  function changeTournamentFormat(nextFormat) {
    if (!data?.canManage || !nextFormat || nextFormat === data.format || formatBusy) return;
    setFormatDraft(nextFormat);
    const hasRecordedResults = (data.matches || []).some((match) => match.scoreA !== null || match.scoreB !== null);
    if (hasRecordedResults) {
      setPendingFormat(nextFormat);
      return;
    }
    applyTournamentFormat(nextFormat);
  }
  function cancelFormatChange() {
    setPendingFormat("");
    setFormatDraft(data.format);
  }
  async function applyTournamentFormat(nextFormat) {
    setPendingFormat("");
    setFormatBusy(true);
    setBracketZoom(null);
    setError("");
    try {
      await updateTournamentFormat(slug, token, nextFormat);
      await load();
      registerMyTournament({ slug, name: data.name, token, format: nextFormat, activity: data.activity || "General", teamCount: data.teamCount, createdAt: data.createdAt ? Date.parse(data.createdAt) : 0 });
      setFormatBusy(false);
    } catch (requestError) {
      setError(requestError.message);
      setFormatDraft(data.format);
      setFormatBusy(false);
    }
  }

  if (!data) return <div className="sp-page tournament-page"><SiteHeader /><main className="tournament-loading"><p>{error || "Loading bracket…"}</p>{error && <a href="/tournaments">Create a tournament</a>}</main></div>;
  const maxRound = Math.max(...rounds.map(([round]) => round));
  const formatLabel = formatLabels[data.format] || data.format;
  const champion = teams.get(data.championTeamId);
  // Final result (elimination formats): the bracket final is the match with no next match
  const finalMatch = (data.format === "single_elimination" || data.format === "double_elimination")
    ? (data.matches || []).find((m) => !m.nextMatchId && m.winnerTeamId && m.teamAId && m.teamBId)
    : null;
  const runnerUp = finalMatch ? teams.get(finalMatch.winnerTeamId === finalMatch.teamAId ? finalMatch.teamBId : finalMatch.teamAId) : null;
  const finalScore = finalMatch ? (finalMatch.winnerTeamId === finalMatch.teamAId ? `${finalMatch.scoreA}–${finalMatch.scoreB}` : `${finalMatch.scoreB}–${finalMatch.scoreA}`) : "";
  const showStandings = (data.format === "round_robin" || data.format === "swiss") && Array.isArray(data.standings) && data.standings.length > 0;
  const connectsToChampion = data.format === "single_elimination" || data.format === "double_elimination";
  const scheduleFormat = data.format === "round_robin" || data.format === "swiss";
  const doubleEliminationRounds = data.format === "double_elimination"
    ? rounds.map(([round, matches]) => ({ round, matches, label: roundLabel(round, maxRound, data.format, data.totalRounds) }))
    : [];
  const doubleWinners = doubleEliminationRounds.filter(({ label }) => label.startsWith("Winners"));
  const doubleLosers = doubleEliminationRounds.filter(({ label }) => label.startsWith("Losers"));
  const doubleFinal = doubleEliminationRounds.find(({ label }) => label === "Grand Final");
  const shareUrl = `${window.location.origin}/t/${slug}`;
  const manageUrl = token ? `${shareUrl}?key=${token}` : "";
  return <div className="sp-page tournament-page tournament-view-page">
    <header className="tournament-studio-bar">
      <a className="tournament-studio-brand" href="/tournaments" aria-label="Draftix Brackets home"><img src="/images/web-app-manifest-512x512.png" alt="" width="512" height="512" /><span>Draftix <small>Brackets</small></span></a>
      <div className="tournament-studio-title"><strong>{data.name}</strong><span>{data.activity || "General"} · {data.teamCount} entrants</span></div>
      <div className="tournament-share-actions">
        <button type="button" onClick={() => copyText(shareUrl, setCopied)}>{copied ? <Check aria-hidden="true" weight="bold" /> : <Copy aria-hidden="true" />}<span>{copied ? "Copied" : "Public link"}</span></button>
        {data.canManage && <button type="button" onClick={() => copyText(manageUrl, setCopied)}><ShieldCheck aria-hidden="true" /><span>Organizer link</span></button>}
      </div>
    </header>
    {pendingFormat && <div className="tournament-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelFormatChange(); }}>
      <section className="tournament-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="format-dialog-title" aria-describedby="format-dialog-description">
        <h2 id="format-dialog-title">Are you sure?</h2>
        <p id="format-dialog-description">Changing to {formatLabels[pendingFormat]?.toLowerCase()} will clear all scores and match progress.</p>
        <div className="tournament-dialog-actions">
          <button type="button" className="is-secondary" onClick={cancelFormatChange} autoFocus>Cancel</button>
          <button type="button" className="is-danger" onClick={() => applyTournamentFormat(pendingFormat)}>Change format</button>
        </div>
      </section>
    </div>}
    <main className="tournament-studio-shell">
      <button type="button" className="tournament-mobile-details" aria-expanded={mobileDetailsOpen} aria-controls="tournament-event-details" onClick={() => setMobileDetailsOpen((open) => !open)}>Tournament details <span aria-hidden="true">{mobileDetailsOpen ? "−" : "+"}</span></button>
      <aside id="tournament-event-details" className={`tournament-event-rail${mobileDetailsOpen ? " is-mobile-open" : ""}`} aria-label="Tournament information">
        <a className="tournament-studio-back" href="/tournaments"><ArrowLeft aria-hidden="true" /><span>Back to tournaments</span></a>
        <div className="tournament-event-status"><span className={`tournament-status ${data.status}`}>{data.status}</span><strong>{data.name}</strong></div>
        <dl className="tournament-event-facts">
          <div><dt>Activity</dt><dd>{data.activity || "General"}</dd></div>
          <div className="tournament-format-fact"><dt>Format</dt><dd>{data.canManage ? <select className="tournament-inline-format" value={formatDraft} disabled={formatBusy} onChange={(event) => changeTournamentFormat(event.target.value)} aria-label="Tournament format">{formats.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select> : formatLabel}</dd></div>
          <div className="tournament-fact-compact"><dt>Entrants</dt><dd>{data.teamCount}</dd></div>
          <div className="tournament-fact-compact"><dt>Series</dt><dd>Best of {data.bestOf}</dd></div>
        </dl>
        {data.canManage && <div className="tournament-organizer-note"><span className="tournament-organizer-icon"><ShieldCheck aria-hidden="true" /></span><div><strong>Organizer mode</strong><p>Select a winner, enter the score, then save the result.</p></div></div>}
        <div className={`tournament-rail-champion${champion ? " is-decided" : ""}`}><Trophy aria-hidden="true" weight="duotone" /><span>Champion</span><strong>{champion?.name || "To be decided"}</strong>{runnerUp && <small>def. {runnerUp.name} {finalScore}</small>}</div>
      </aside>
      <section className={`tournament-studio-canvas${showFeedbackPrompt ? " has-feedback-prompt" : ""}`}>
        {showFeedbackPrompt && <FeedbackPrompt source="bracket" onDismiss={() => setShowFeedbackPrompt(false)} />}
        {error && <p className="tournament-error" role="alert">{error}</p>}
        <section className={`bracket-panel bracket-theme-${bracketTheme}`} aria-labelledby="bracket-heading" ref={bracketPanelRef}>
          <header className="bracket-panel-head">
            <div className="bracket-panel-title"><div><h2 id="bracket-heading">{scheduleFormat ? "Match schedule" : "Bracket"}</h2><p>{rounds.length} rounds · {data.matches.length} matches</p></div>{showStandings && <nav className="tournament-view-tabs" aria-label="Tournament view"><button type="button" className={competitionTab === "matches" ? "is-active" : ""} onClick={() => setCompetitionTab("matches")}>Matches</button><button type="button" className={competitionTab === "standings" ? "is-active" : ""} onClick={() => setCompetitionTab("standings")}>Standings</button></nav>}</div>
            <div className="bracket-view-controls">
              <div className="bracket-zoom-controls" aria-label="Bracket zoom controls">
                <button type="button" onClick={() => adjustBracketZoom(-.1)} aria-label="Zoom bracket out"><Minus aria-hidden="true" /></button>
                <button type="button" className="bracket-fit-button" onClick={() => setBracketZoom(null)} aria-label="Fit bracket to screen">{Math.round(effectiveBracketScale * 100)}%</button>
                <button type="button" onClick={() => adjustBracketZoom(.1)} aria-label="Zoom bracket in"><Plus aria-hidden="true" /></button>
              </div>
              <details className="bracket-theme-picker" ref={bracketThemeMenuRef}>
                <summary><span>Theme</span><strong>{bracketThemes.find(([value]) => value === bracketTheme)?.slice(1).join(" ") || "Modern Light"}</strong></summary>
                <div className="bracket-theme-menu" role="group" aria-label="Bracket theme">
                  <span className="bracket-theme-menu-title">Choose bracket theme</span>
                  <div className="bracket-theme-grid">
                    {bracketThemes.map(([value, family, tone]) => <button type="button" key={value} className={bracketTheme === value ? "is-selected" : ""} aria-pressed={bracketTheme === value} onClick={() => changeBracketTheme(value)}>
                      <span className={`bracket-theme-preview preview-${value}`} aria-hidden="true"><svg viewBox="0 0 160 90"><g className="preview-entries"><rect x="15" y="16" width="38" height="10" /><rect x="15" y="34" width="38" height="10" /><rect x="15" y="57" width="38" height="10" /><rect x="92" y="36" width="38" height="14" /></g><path className="preview-lines" d="M53 21 H68 V39 H92 M53 39 H68 M53 62 H78 V47 H92 M130 43 H146" /><circle className="preview-node" cx="68" cy="39" r="3" /><circle className="preview-node" cx="92" cy="43" r="3" /></svg></span>
                      <span className="bracket-theme-name">{family} <small>({tone})</small></span>
                    </button>)}
                  </div>
                </div>
              </details>
              <button className="bracket-fullscreen-button" type="button" onClick={toggleBracketFullscreen} aria-label={bracketFullscreen ? "Exit bracket fullscreen" : "Open bracket fullscreen"}>
                {bracketFullscreen ? <CornersIn aria-hidden="true" /> : <CornersOut aria-hidden="true" />}
                <span>{bracketFullscreen ? "Exit fullscreen" : "Fullscreen"}</span>
              </button>
            </div>
          </header>
          {showStandings && competitionTab === "standings" ? <section className="tournament-standings tournament-standings-panel" aria-label="Standings">
            <table>
              <thead><tr><th>#</th><th>Entrant</th><th>W</th><th>L</th><th>Diff</th><th>P</th></tr></thead>
              <tbody>{data.standings.map((row, index) => <tr key={row.teamId} className={index === 0 && data.status === "completed" ? "is-leader" : ""}><td>{index + 1}</td><td>{row.name}</td><td>{row.wins}</td><td>{row.losses}</td><td>{row.diff > 0 ? `+${row.diff}` : row.diff}</td><td>{row.played}</td></tr>)}</tbody>
            </table>
          </section> : <div className="bracket-scroll" aria-label={`${data.name} tournament bracket`} ref={bracketScrollRef}>
            <div className="bracket-scale-stage" style={{ width: bracketMetrics.width * effectiveBracketScale, height: bracketMetrics.height * effectiveBracketScale }}>
              <div className={`bracket-board format-${data.format}`} ref={boardRef} style={{ transform: `scale(${effectiveBracketScale})`, ...(data.format === "double_elimination" ? { "--double-columns": Math.max(doubleWinners.length, doubleLosers.length) + 2 } : {}) }}>
                <BracketConnectors boardRef={boardRef} matches={data.matches} connectChampion={connectsToChampion} scale={effectiveBracketScale} />
                {data.format === "double_elimination" ? <>
                  {doubleWinners.map(({ round, matches, label }, index) => <section className={`bracket-round ${roundLaneClass(label)}`} style={{ "--lane-column": index + 1, "--lane-row": 1 }} key={round}>
                    <header><span>{String(round).padStart(2, "0")}</span><h2>{label}</h2></header>
                    <div className="bracket-round-matches">{matches.map((match) => <MatchCard key={match.id} match={match} teams={teams} bestOf={data.bestOf} canManage={data.canManage} busy={busyMatch === match.id} onSave={save} onClear={clear} onScore={updateScore} />)}</div>
                  </section>)}
                  {doubleLosers.map(({ round, matches, label }, index) => <section className={`bracket-round ${roundLaneClass(label)}`} style={{ "--lane-column": index + 1, "--lane-row": 2 }} key={round}>
                    <header><span>{String(round).padStart(2, "0")}</span><h2>{label}</h2></header>
                    <div className="bracket-round-matches">{matches.map((match) => <MatchCard key={match.id} match={match} teams={teams} bestOf={data.bestOf} canManage={data.canManage} busy={busyMatch === match.id} onSave={save} onClear={clear} onScore={updateScore} />)}</div>
                  </section>)}
                  {doubleFinal && <section className={`bracket-round ${roundLaneClass(doubleFinal.label)}`} style={{ "--lane-column": Math.max(doubleWinners.length, doubleLosers.length) + 1, "--lane-row": 1, "--lane-span": 2 }} key={doubleFinal.round}>
                    <header><span>{String(doubleFinal.round).padStart(2, "0")}</span><h2>{doubleFinal.label}</h2></header>
                    <div className="bracket-round-matches">{doubleFinal.matches.map((match) => <MatchCard key={match.id} match={match} teams={teams} bestOf={data.bestOf} canManage={data.canManage} busy={busyMatch === match.id} onSave={save} onClear={clear} onScore={updateScore} />)}</div>
                  </section>}
                </> : rounds.map(([round, matches]) => {
                  const label = roundLabel(round, maxRound, data.format, data.totalRounds); return <section className={`bracket-round ${roundLaneClass(label)}`} key={round}>
                    <header><span>{String(round).padStart(2, "0")}</span><h2>{label}</h2></header>
                    <div className="bracket-round-matches">{matches.map((match) => <MatchCard key={match.id} match={match} teams={teams} bestOf={data.bestOf} canManage={data.canManage} busy={busyMatch === match.id} onSave={save} onClear={clear} onScore={updateScore} />)}</div>
                  </section>;
                })}
                <section className="bracket-round bracket-champion-round" style={data.format === "double_elimination" ? { "--lane-column": Math.max(doubleWinners.length, doubleLosers.length) + 2, "--lane-row": 1, "--lane-span": 2 } : undefined} data-champion-target>
                  <header><span>{String(rounds.length + 1).padStart(2, "0")}</span><h2>Champion</h2></header>
                  <div className="bracket-round-matches"><article className={`bracket-champion-card${champion ? " is-decided" : ""}`}><Trophy aria-hidden="true" weight="duotone" /><span>Tournament champion</span><strong>{champion?.name || "To be decided"}</strong></article></div>
                </section>
              </div>
            </div>
          </div>}
        </section>
      </section>
    </main>
  </div>;
}
