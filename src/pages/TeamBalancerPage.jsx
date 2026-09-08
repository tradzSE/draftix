import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "@phosphor-icons/react/Check";
import SiteHeader from "../components/SiteHeader.jsx";
import PublicFooter from "../components/PublicFooter.jsx";
import { trackProductEvent } from "../lib/analytics.js";

const RANKS = ["Iron 1", "Iron 2", "Iron 3", "Bronze 1", "Bronze 2", "Bronze 3", "Silver 1", "Silver 2", "Silver 3", "Gold 1", "Gold 2", "Gold 3", "Unranked", "Platinum 1", "Platinum 2", "Platinum 3", "Diamond 1", "Diamond 2", "Diamond 3", "Ascendant 1", "Ascendant 2", "Ascendant 3", "Immortal 1", "Immortal 2", "Immortal 3", "Radiant"];
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
    {RANKS.map((rank, index) => <option key={rank} value={index}>{rank}</option>)}
  </select><details className="tb-rank-select" ref={detailsRef} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) detailsRef.current?.removeAttribute("open"); }}>
    <summary aria-label={`${label}: ${selected}`}><img src={rankIcon(selected)} alt="" loading="lazy" /><span>{selected}</span><i aria-hidden="true" /></summary>
    <div className="tb-rank-menu" role="listbox" aria-label={label}>
      {RANKS.map((rank, index) => <button type="button" role="option" aria-selected={index === value} className={index === value ? "is-selected" : ""} key={rank} onClick={() => choose(index)}><img src={rankIcon(rank)} alt="" loading="lazy" /><span>{rank}</span></button>)}
    </div>
  </details></>;
}

export default function TeamBalancerPage() {
  const [players, setPlayers] = useState(() => loadSaved()?.players || defaultPlayers());
  const [perTeam, setPerTeam] = useState(() => loadSaved()?.perTeam ?? 5);
  const [strategy, setStrategy] = useState(() => loadSaved()?.strategy ?? "rank");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);
  const named = useMemo(() => players.filter((player) => player.name.trim()).map((player) => ({ ...player, name: player.name.trim() })), [players]);

  useEffect(() => {
    try { localStorage.setItem(ROSTER_KEY, JSON.stringify({ players, perTeam, strategy })); } catch { /* storage may be unavailable */ }
  }, [players, perTeam, strategy]);

  useEffect(() => () => window.clearTimeout(copyTimerRef.current), []);

  const update = (id, field, value) => setPlayers((current) => current.map((player) => player.id === id ? { ...player, [field]: field === "mmr" ? Number(value) : value } : player));
  const run = () => {
    if (named.length < 2) { setError("Add at least two named players."); setResult(null); return; }
    setError("");
    setResult(balance(named, perTeam, strategy));
    trackProductEvent("team_balance_generated");
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
        <section><h2>Lobby size</h2><div className="tb-options">{[2, 3, 4, 5].map((size) => <button className={perTeam === size ? "is-active" : ""} key={size} onClick={() => setPerTeam(size)}>{size}v{size}</button>)}</div></section>
        <section><h2>Split method</h2><div className="tb-options">{[["rank", "By rank"], ["random", "Random"]].map(([value, label]) => <button className={strategy === value ? "is-active" : ""} key={value} onClick={() => setStrategy(value)}>{label}</button>)}</div><p>{strategy === "rank" ? "Highest-rated starters are snake drafted for close totals." : "The lobby is shuffled before teams are formed."}</p></section>
        <button className="tb-run" onClick={run}>Split teams</button>
        {result && <button type="button" className="tb-result-hint" role="status" onClick={() => document.getElementById("balanced-teams")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Teams are ready. Scroll down to see them.</button>}
        {error && <p className="tb-error">{error}</p>}
      </aside>
      <section className="tb-roster">
        <header><div><h2>Players</h2><p>{named.length} named | {players.length} rows</p></div><button onClick={() => setPlayers((current) => [...current, newPlayer(Date.now())])}>Add player</button></header>
        <div className="tb-rows">{players.map((player, index) => <div className="tb-row" key={player.id}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <input value={player.name} maxLength="32" placeholder="Player name" aria-label={`Player ${index + 1} name`} onChange={(event) => update(player.id, "name", event.target.value)} />
          <RankSelect value={player.mmr} label={`Player ${index + 1} rank`} onChange={(value) => update(player.id, "mmr", value)} />
          <button aria-label={`Remove player ${index + 1}`} disabled={players.length <= 5} onClick={() => setPlayers((current) => current.filter((item) => item.id !== player.id))}>Remove</button>
        </div>)}</div>
        <button className="tb-clear" onClick={() => { setPlayers(defaultPlayers()); setResult(null); }}>Clear roster</button>
      </section>
    </div>
    {result && <section className="tb-results" id="balanced-teams">
      <header><div><h2>Balanced teams</h2><p>MMR difference {Math.abs(total(result.teamA) - total(result.teamB))}</p></div><button className={copied ? "is-copied" : ""} onClick={copy} aria-live="polite">{copied ? <><Check weight="bold" aria-hidden="true" />Copied</> : "Copy for Discord"}</button></header>
      <div><Team name="Team A" players={result.teamA} side="a" /><Team name="Team B" players={result.teamB} side="b" /></div>
      {result.bench.length > 0 && <section className="tb-bench"><h3>Bench</h3><p>{result.bench.map((player) => player.name).join(", ")}</p></section>}
    </section>}
    <PublicFooter />
  </main>;
}
