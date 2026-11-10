import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react/ArrowsClockwise";
import { Check } from "@phosphor-icons/react/Check";
import { Trash } from "@phosphor-icons/react/Trash";
import { X } from "@phosphor-icons/react/X";
import SiteHeader from "../components/SiteHeader.jsx";
import PublicFooter from "../components/PublicFooter.jsx";
import FeedbackPrompt from "../components/FeedbackPrompt.jsx";
import { trackProductEvent } from "../lib/analytics.js";

const RANKS = ["Iron 1", "Iron 2", "Iron 3", "Bronze 1", "Bronze 2", "Bronze 3", "Silver 1", "Silver 2", "Silver 3", "Gold 1", "Gold 2", "Gold 3", "Unranked", "Platinum 1", "Platinum 2", "Platinum 3", "Diamond 1", "Diamond 2", "Diamond 3", "Ascendant 1", "Ascendant 2", "Ascendant 3", "Immortal 1", "Immortal 2", "Immortal 3", "Radiant"];
const RANK_OPTIONS = RANKS.map((rank, index) => ({ rank, index })).sort((a, b) => {
  if (a.rank === "Unranked") return -1;
  if (b.rank === "Unranked") return 1;
  return a.index - b.index;
});
const RANK_TIER_IDS = {
  Unranked: 0,
  "Iron 1": 3, "Iron 2": 4, "Iron 3": 5,
  "Bronze 1": 6, "Bronze 2": 7, "Bronze 3": 8,
  "Silver 1": 9, "Silver 2": 10, "Silver 3": 11,
  "Gold 1": 12, "Gold 2": 13, "Gold 3": 14,
  "Platinum 1": 15, "Platinum 2": 16, "Platinum 3": 17,
  "Diamond 1": 18, "Diamond 2": 19, "Diamond 3": 20,
  "Ascendant 1": 21, "Ascendant 2": 22, "Ascendant 3": 23,
  "Immortal 1": 24, "Immortal 2": 25, "Immortal 3": 26,
  Radiant: 27,
};
const RANK_ICON_ROOT = "https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04";
const rankIcon = (rank) => `${RANK_ICON_ROOT}/${RANK_TIER_IDS[rank] ?? 0}/smallicon.png`;
const newPlayer = (id) => ({ id, name: "", mmr: 12 });
const total = (team) => team.reduce((sum, player) => sum + player.mmr, 0);

const ROSTER_KEY = "draftix:balancer";
const BALANCER_URL = "https://www.draftix.tech/team-balance";
const MAX_ROSTER_ROWS = 40;
const defaultPlayers = () => Array.from({ length: 10 }, (_, index) => newPlayer(index + 1));
const BALANCE_DURATION_MS = 7000;
const BALANCE_STEPS = [
  "Checking everyone’s rank and last-game confidence...",
  "Finding each team a carry (and a convenient excuse)...",
  "Moving the noobs to the weak side...",
  "Locking in teams the group chat can’t argue with...",
];

function loadSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(ROSTER_KEY) || "null");
    if (!value || typeof value !== "object" || !Array.isArray(value.players) || value.players.length === 0) return null;
    const seen = new Set();
    const players = value.players.slice(0, MAX_ROSTER_ROWS).map((raw, index) => {
      let id = Number.isInteger(raw?.id) ? raw.id : null;
      if (id === null || seen.has(id)) { id = Date.now() + index; while (seen.has(id)) id += 1; }
      seen.add(id);
      return {
        id,
        name: typeof raw?.name === "string" ? raw.name.slice(0, 32) : "",
        mmr: Number.isInteger(raw?.mmr) && raw.mmr >= 0 && raw.mmr < RANKS.length ? raw.mmr : 12,
      };
    });
    return {
      players,
      perTeam: [2, 3, 4, 5].includes(value.perTeam) ? value.perTeam : 5,
      strategy: value.strategy === "random" ? "random" : "rank",
    };
  } catch {
    return null;
  }
}

function snakeSplit(players) {
  const teamA = [], teamB = [];
  players.forEach((player, index) => ([0, 3].includes(index % 4) ? teamA : teamB).push(player));
  return { teamA, teamB };
}

function shuffle(players) {
  const result = [...players];
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function balance(players, perTeam, strategy) {
  const capacity = perTeam * 2;
  if (strategy === "random") {
    const mixed = shuffle(players);
    if (mixed.length <= capacity) {
      const splitAt = Math.ceil(mixed.length / 2);
      return { teamA: mixed.slice(0, splitAt), teamB: mixed.slice(splitAt), bench: [], strategy };
    }
    return { ...snakeSplit(mixed.slice(0, capacity).sort((a, b) => b.mmr - a.mmr)), bench: mixed.slice(capacity), strategy };
  }
  const sorted = [...players].sort((a, b) => b.mmr - a.mmr);
  return { ...snakeSplit(sorted.slice(0, capacity)), bench: sorted.slice(capacity), strategy };
}

function Team({ name, players, side }) {
  return <section className={`tb-team is-${side}`}>
    <header><div><h3>{name}</h3><p>{players.length ? `Average ${(total(players) / players.length).toFixed(1)} | Total ${total(players)}` : "No players"}</p></div><strong>{players.length}</strong></header>
    <ol>{players.map((player) => <li key={player.id}><span><b>{player.name}</b><small>{RANKS[player.mmr]}</small></span><em>{player.mmr}</em></li>)}</ol>
  </section>;
}

function RankSelect({ value, label, onChange }) {
  const detailsRef = useRef(null);
  const selected = RANKS[value] || "Unranked";
  const choose = (index) => {
    onChange(index);
    detailsRef.current?.removeAttribute("open");
  };

  return <><select className="tb-rank-native" value={value} aria-label={label} onChange={(event) => onChange(Number(event.target.value))}>
    {RANK_OPTIONS.map(({ rank, index }) => <option key={rank} value={index}>{rank}</option>)}
  </select><details className="tb-rank-select" ref={detailsRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) detailsRef.current?.removeAttribute("open"); }}>
    <summary aria-label={`${label}: ${selected}`}><img src={rankIcon(selected)} alt="" loading="lazy" /><span>{selected}</span><i aria-hidden="true" /></summary>
    <div className="tb-rank-menu" role="listbox" aria-label={label}>
      {RANK_OPTIONS.map(({ rank, index }) => <button type="button" role="option" aria-selected={index === value} className={index === value ? "is-selected" : ""} key={rank} onClick={() => choose(index)}><img src={rankIcon(rank)} alt="" loading="lazy" /><span>{rank}</span></button>)}
    </div>
  </details></>;
}

export default function TeamBalancerPage() {
  const [players, setPlayers] = useState(() => loadSaved()?.players || defaultPlayers());
  const [perTeam, setPerTeam] = useState(() => loadSaved()?.perTeam ?? 5);
  const [strategy, setStrategy] = useState(() => loadSaved()?.strategy ?? "rank");
  const [result, setResult] = useState(null);
  const [isBalancing, setIsBalancing] = useState(false);
  const [balanceStep, setBalanceStep] = useState(0);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const resultsDialogRef = useRef(null);
  const runTimersRef = useRef([]);
  const copyTimerRef = useRef(null);
  const named = useMemo(() => players.filter((player) => player.name.trim()).map((player) => ({ ...player, name: player.name.trim() })), [players]);

  useEffect(() => {
    try { localStorage.setItem(ROSTER_KEY, JSON.stringify({ players, perTeam, strategy })); } catch { /* storage may be unavailable */ }
  }, [players, perTeam, strategy]);

  useEffect(() => () => {
    window.clearTimeout(copyTimerRef.current);
    runTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    const dialog = resultsDialogRef.current;
    if (!dialog) return;
    if (showResultsDialog && !dialog.open) {
      dialog.showModal();
      if (!isBalancing) dialog.querySelector(".tb-dialog-close")?.focus();
    } else if (!showResultsDialog && dialog.open) {
      dialog.close();
    }
  }, [showResultsDialog, isBalancing]);

  const clearResult = () => {
    setResult(null);
    setShowFeedbackPrompt(false);
    setShowResultsDialog(false);
  };
  const update = (id, field, value) => {
    clearResult();
    setPlayers((current) => current.map((player) => player.id === id ? { ...player, [field]: field === "mmr" ? Number(value) : value } : player));
  };
  const run = () => {
    if (named.length < 2) { setError("Add at least two named players."); clearResult(); return; }
    runTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    setError("");
    const nextResult = balance(named, perTeam, strategy);
    setResult(null);
    setShowFeedbackPrompt(false);
    setBalanceStep(0);
    setIsBalancing(true);
    setShowResultsDialog(true);
    const stepDuration = BALANCE_DURATION_MS / BALANCE_STEPS.length;
    runTimersRef.current = BALANCE_STEPS.slice(1).map((_, index) => window.setTimeout(() => setBalanceStep(index + 1), (index + 1) * stepDuration));
    runTimersRef.current.push(window.setTimeout(() => {
      setResult(nextResult);
      setIsBalancing(false);
      setShowFeedbackPrompt(true);
      trackProductEvent("team_balance_generated");
    }, BALANCE_DURATION_MS));
  };
  const copy = async () => {
    if (!result) return;
    const lines = [`DRAFTIX ${perTeam}v${perTeam}`, "", "Team A", ...result.teamA.map((p) => `${p.name} (${RANKS[p.mmr]})`), "", "Team B", ...result.teamB.map((p) => `${p.name} (${RANKS[p.mmr]})`)];
    if (result.bench.length) lines.push("", "Bench", ...result.bench.map((p) => `${p.name} (${RANKS[p.mmr]})`));
    lines.push("", `Balance your lobby: ${BALANCER_URL}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      trackProductEvent("team_balance_copied");
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return <main className="sp-page">
    <SiteHeader />
    <section className="sp-intro"><h1>Build fair teams.</h1><p>Add the lobby, choose a format, and split players by rank or at random.</p></section>
    <div className="tb-layout">
      <aside className="tb-controls">
        <section><h2>Lobby size</h2><div className="tb-options">{[2, 3, 4, 5].map((size) => <button className={perTeam === size ? "is-active" : ""} key={size} onClick={() => { clearResult(); setPerTeam(size); }}>{size}v{size}</button>)}</div></section>
        <section><h2>Split method</h2><div className="tb-options">{[["rank", "By rank"], ["random", "Random"]].map(([value, label]) => <button className={strategy === value ? "is-active" : ""} key={value} onClick={() => { clearResult(); setStrategy(value); }}>{label}</button>)}</div><p>{strategy === "rank" ? "Highest-rated starters are snake drafted for close totals." : "The lobby is shuffled before teams are formed."}</p></section>
        <button className="tb-run" onClick={run} disabled={isBalancing}>{isBalancing ? "Balancing teams..." : "Split teams"}</button>
        {result && <button type="button" className="tb-view-results" onClick={() => setShowResultsDialog(true)}>View last result</button>}
        {error && <p className="tb-error">{error}</p>}
      </aside>
      <section className="tb-roster">
        <header><div><h2>Players</h2><p>{named.length} named | {players.length} rows</p></div><button onClick={() => { clearResult(); setPlayers((current) => [...current, newPlayer(Date.now())]); }}>Add player</button></header>
        <div className="tb-rows">{players.map((player, index) => <div className="tb-row" key={player.id}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <input value={player.name} maxLength="32" placeholder="Player name" aria-label={`Player ${index + 1} name`} onChange={(event) => update(player.id, "name", event.target.value)} />
          <RankSelect value={player.mmr} label={`Player ${index + 1} rank`} onChange={(value) => update(player.id, "mmr", value)} />
          <button type="button" aria-label={`Remove player ${index + 1}`} title="Remove player" disabled={players.length <= 5} onClick={() => { clearResult(); setPlayers((current) => current.filter((item) => item.id !== player.id)); }}><Trash size={18} weight="regular" aria-hidden="true" /></button>
        </div>)}</div>
        <button className="tb-clear" onClick={() => { clearResult(); setPlayers(defaultPlayers()); }}>Clear roster</button>
      </section>
    </div>
    <dialog
      className="tb-results-dialog"
      ref={resultsDialogRef}
      aria-labelledby="tb-results-title"
      onClose={() => setShowResultsDialog(false)}
      onCancel={(event) => { if (isBalancing) event.preventDefault(); else setShowResultsDialog(false); }}
      onClick={(event) => { if (event.target === event.currentTarget && !isBalancing) setShowResultsDialog(false); }}
    >
      {isBalancing ? <div className="tb-balancing">
        <ArrowsClockwise className="tb-balancing-icon" size={34} weight="bold" aria-hidden="true" />
        <h2 id="tb-results-title">Building your teams...</h2>
        <p role="status" aria-live="polite">{BALANCE_STEPS[balanceStep]}</p>
        <div className="tb-balance-progress" aria-hidden="true">{BALANCE_STEPS.map((step, index) => <span className={index <= balanceStep ? "is-active" : ""} key={step} />)}</div>
        <small>{strategy === "rank" ? "Rank-balanced on paper. Emotionally debatable." : "Randomly split. Blame the algorithm."}</small>
      </div> : result && <div className="tb-results-dialog-content">
        <header className="tb-results-dialog-header">
          <div><h2 id="tb-results-title">Teams are locked.</h2><p>MMR difference {Math.abs(total(result.teamA) - total(result.teamB))} · {perTeam}v{perTeam} · {strategy === "rank" ? "By rank" : "Random"}</p></div>
          <div className="tb-results-dialog-actions">
            <button type="button" className={`tb-dialog-copy${copied ? " is-copied" : ""}`} onClick={copy} aria-live="polite">{copied ? <><Check weight="bold" aria-hidden="true" />Copied</> : "Copy for Discord"}</button>
            <button type="button" className="tb-dialog-close" onClick={() => setShowResultsDialog(false)} aria-label="Close team results"><X size={20} aria-hidden="true" /></button>
          </div>
        </header>
        <div className="tb-results-dialog-teams"><Team name="Team A" players={result.teamA} side="a" /><Team name="Team B" players={result.teamB} side="b" /></div>
        {result.bench.length > 0 && <section className="tb-bench"><h3>Bench</h3><p>{result.bench.map((player) => player.name).join(", ")}</p></section>}
        {showFeedbackPrompt && <FeedbackPrompt source="teams" onDismiss={() => setShowFeedbackPrompt(false)} />}
      </div>}
    </dialog>
    <PublicFooter />
  </main>;
}
