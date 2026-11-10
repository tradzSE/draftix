import { useEffect, useLayoutEffect, useRef, useState } from "react";
import AppNav from "./AppNav.jsx";
import FeedbackPrompt from "./FeedbackPrompt.jsx";

function SelectionGrid({ items, selected, onPick, disabled, kind }) {
  return (
    <div className={`dx-selection-grid is-${kind}`}>
      {items.map((item) => {
        const banned = selected.includes(item.uuid);
        return (
          <button
            type="button"
            key={item.uuid}
            className={banned ? "is-banned" : ""}
            disabled={disabled || banned}
            aria-label={banned ? `${item.name}, banned` : `Ban ${item.name}`}
            onClick={() => onPick(item.uuid)}
          >
            <img src={item.image} alt="" loading="lazy" />
            <span>{item.name}</span>
            {banned && <small>Locked out</small>}
          </button>
        );
      })}
    </div>
  );
}

function MatchFoundOverlay({ countdown, map }) {
  return (
    <section
      className="dx-match-found"
      role="status"
      aria-live="assertive"
      aria-label={`Match ready in ${countdown} seconds.`}
    >
      {map?.image && (
        <img className="dx-match-found-map" src={map.image} alt="" />
      )}
      <div className="dx-match-found-shutter" aria-hidden="true" />
      <div className="dx-match-found-content">
        <div className="dx-match-found-title">
          <span>MATCH READY</span>
        </div>
        <div className="dx-match-found-counter" key={countdown}>
          {countdown}
        </div>
        <small>{map?.name || "Draft complete"}</small>
      </div>
    </section>
  );
}

function MatchReadyConsole({
  session,
  agents,
  selectedAgents,
  onDownload,
  onRematch,
}) {
  const chosenSide = session.selectedSide || "attack";
  const oppositeSide = chosenSide === "attack" ? "defense" : "attack";
  const pickerTeam = session.sidePickerTeam === "B" ? "B" : "A";
  const sideA = pickerTeam === "A" ? chosenSide : oppositeSide;
  const sideB = pickerTeam === "B" ? chosenSide : oppositeSide;
  const bannedAgents = selectedAgents
    .map((uuid) => agents.find((agent) => agent.uuid === uuid))
    .filter(Boolean);

  return (
    <section className="dx-ready-console">
      <div className="dx-ready-backdrop" aria-hidden="true">
        {session.selectedMap?.image && (
          <img src={session.selectedMap.image} alt="" />
        )}
      </div>
      <header className="dx-ready-command">
        <div>
          <small>Draft locked</small>
          <strong>Match ready</strong>
        </div>
        <div>
          <span>Room</span>
          <b>{session.code}</b>
        </div>
      </header>
      <div className="dx-ready-map">
        <span>Selected map</span>
        <h1>{session.selectedMap?.name || "Map decided"}</h1>
      </div>
      <div className="dx-ready-versus" aria-label="Final matchup">
        <article className="is-team-a">
          <img
            className="dx-ready-team-logo"
            src={session.teamLogos?.A || "/images/draftix.webp"}
            alt=""
          />
          <small>Squad A</small>
          <h2>{session.teamNames?.A || "Team A"}</h2>
          <p>
            <b>{sideA}</b> opening side
          </p>
        </article>
        <div className="dx-ready-vs">
          <span>VS</span>
          <i />
        </div>
        <article className="is-team-b">
          <img
            className="dx-ready-team-logo"
            src={session.teamLogos?.B || "/images/draftix.webp"}
            alt=""
          />
          <small>Squad B</small>
          <h2>{session.teamNames?.B || "Team B"}</h2>
          <p>
            <b>{sideB}</b> opening side
          </p>
        </article>
      </div>
      <footer className="dx-ready-footer">
        <div className="dx-ready-bans">
          <span>Agent bans</span>
          <div>
            {bannedAgents.length ? (
              bannedAgents.map((agent) => (
                <figure key={agent.uuid}>
                  <img src={agent.icon || agent.image} alt="" />
                  <figcaption>{agent.name}</figcaption>
                </figure>
              ))
            ) : (
              <p>No agent bans</p>
            )}
          </div>
        </div>
        <div className="dx-ready-actions">
          <button
            type="button"
            className="dx-button dx-button-primary"
            onClick={onDownload}
          >
            Download match poster
          </button>
          {session.ops?.canRematch && (
            <button
              type="button"
              className="dx-button dx-button-secondary"
              onClick={onRematch}
            >
              Run it back
            </button>
          )}
          <a
            href="/feedback"
            target="_blank"
            rel="noreferrer"
            className="dx-button dx-ready-feedback"
            title="Tell us how your draft went"
          >
            Feedback
          </a>
        </div>
      </footer>
    </section>
  );
}

function loadPosterImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

function drawPosterCover(context, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  context.drawImage(
    image,
    (image.width - sourceWidth) / 2,
    (image.height - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

function SidePickConsole({ map, choosingTeam, canPick, onPick }) {
  if (!map)
    return (
      <section className="dx-side-empty">
        <strong>Map unavailable</strong>
        <p>Waiting for the veto result.</p>
      </section>
    );

  return (
    <section className="dx-side-console">
      <div className="dx-side-backdrop" aria-hidden="true">
        <img src={map.image} alt="" />
      </div>
      <header className="dx-side-command">
        <div>
          <small>{canPick ? "Your decision" : "Side selection"}</small>
          <h1>
            {canPick
              ? "Choose the opening side"
              : `${choosingTeam} is choosing`}
          </h1>
        </div>
        <div>
          <span>Map locked</span>
          <strong>{map.name}</strong>
        </div>
      </header>
      <div className="dx-side-map-name" aria-hidden="true">
        {map.name}
      </div>
      <div className="dx-side-options">
        <button
          type="button"
          className="is-attack"
          disabled={!canPick}
          onClick={() => onPick("attack")}
        >
          <span className="dx-side-letter">A</span>
          <span className="dx-side-copy">
            <small>Open on</small>
            <strong>Attack</strong>
            <em>Set the pace. Take space first.</em>
          </span>
          <span className="dx-side-action">
            {canPick ? "Lock attack" : "Awaiting captain"}
          </span>
        </button>
        <button
          type="button"
          className="is-defense"
          disabled={!canPick}
          onClick={() => onPick("defense")}
        >
          <span className="dx-side-letter">D</span>
          <span className="dx-side-copy">
            <small>Open on</small>
            <strong>Defense</strong>
            <em>Hold the map. Control the first read.</em>
          </span>
          <span className="dx-side-action">
            {canPick ? "Lock defense" : "Awaiting captain"}
          </span>
        </button>
      </div>
    </section>
  );
}

// Owns the 250ms turn-countdown tick so its state updates re-render only this
// small subtree instead of the whole board (agent grid, chat, consoles).
// Internal refs dedupe the callbacks to at most one fire per turn window.
function TurnCountdown({
  turnEndsAt,
  active,
  variant = "clock",
  label = "Turn timer",
  warnBelow = null,
  onExpire,
  onWarning,
}) {
  const [seconds, setSeconds] = useState(null);
  const expiredRef = useRef(null);
  const warnedRef = useRef(null);
  // Latest-ref pattern: the interval effect only depends on the turn window,
  // so parent re-renders can swap callbacks without restarting the tick.
  const callbacksRef = useRef({ onExpire, onWarning });
  callbacksRef.current = { onExpire, onWarning };

  useEffect(() => {
    if (!turnEndsAt || !active) {
      setSeconds(null);
      return undefined;
    }
    const tick = () => {
      const next = Math.max(0, Math.ceil((turnEndsAt - Date.now()) / 1000));
      setSeconds(next);
      if (next === 0 && expiredRef.current !== turnEndsAt) {
        expiredRef.current = turnEndsAt;
        callbacksRef.current.onExpire?.();
      }
      if (
        warnBelow !== null &&
        next > 0 &&
        next <= warnBelow &&
        warnedRef.current !== turnEndsAt
      ) {
        warnedRef.current = turnEndsAt;
        callbacksRef.current.onWarning?.();
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [turnEndsAt, active, warnBelow]);

  if (variant === "agent") {
    return (
      <div
        className={`dx-agent-timer${seconds !== null && seconds <= 10 ? " is-critical" : ""}`}
      >
        <span>{label}</span>
        <time>{seconds === null ? "--" : String(seconds).padStart(2, "0")}</time>
      </div>
    );
  }
  if (seconds === null) return null;
  return (
    <div className="dx-clock">
      <small>{label}</small>
      <time>{String(seconds).padStart(2, "0")}</time>
    </div>
  );
}

function AgentBanConsole({
  agents,
  selected,
  onPick,
  onSelect,
  disabled,
  session,
  timer,
  status,
}) {
  const available = agents.filter((agent) => !selected.includes(agent.uuid));
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [hoveredAgentId, setHoveredAgentId] = useState(null);
  const previewId =
    hoveredAgentId ||
    selectedAgentId ||
    available[0]?.uuid ||
    agents[0]?.uuid ||
    null;
  const preview =
    agents.find((agent) => agent.uuid === previewId) ||
    available[0] ||
    agents[0];
  const selectedAgent =
    agents.find(
      (agent) =>
        agent.uuid === selectedAgentId && !selected.includes(agent.uuid),
    ) || null;
  const firstTeam = session.firstBanner === "B" ? "B" : "A";
  const bansByTeam = selected.reduce(
    (groups, uuid, index) => {
      const team = index % 2 === 0 ? firstTeam : firstTeam === "A" ? "B" : "A";
      const agent = agents.find((item) => item.uuid === uuid);
      if (agent) groups[team].push(agent);
      return groups;
    },
    { A: [], B: [] },
  );

  useEffect(() => {
    if (selectedAgentId && selected.includes(selectedAgentId))
      setSelectedAgentId(null);
  }, [selected, selectedAgentId]);

  if (!preview)
    return (
      <section className="dx-agent-empty">
        <strong>Agent data unavailable</strong>
        <p>Refresh the room to reload the local catalog.</p>
      </section>
    );

  const color = (preview.colors?.[0] || "e83f4e").replace("#", "").slice(0, 6);
  const consoleStyle = { "--agent-color": `#${color}` };

  return (
    <section className="dx-agent-console" style={consoleStyle}>
      <div className="dx-agent-atmosphere" aria-hidden="true">
        {preview.background && <img src={preview.background} alt="" />}
      </div>
      <header className="dx-agent-command">
        <div>
          <small>{disabled ? "Draft in progress" : "Action required"}</small>
          <strong>{status}</strong>
        </div>
        {timer}
      </header>

      <aside className="dx-ban-ledger" aria-label="Agent ban history">
        {["A", "B"].map((team) => (
          <section
            key={team}
            className={session.currentTurn === team ? "is-active" : ""}
          >
            <header>
              <span>Squad {team}</span>
              <strong>{session.teamNames?.[team] || `Team ${team}`}</strong>
            </header>
            <div>
              {bansByTeam[team].length ? (
                bansByTeam[team].map((agent) => (
                  <article key={agent.uuid}>
                    <img src={agent.icon || agent.image} alt="" />
                    <span>{agent.name}</span>
                    <small>Banned</small>
                  </article>
                ))
              ) : (
                <p>No bans locked</p>
              )}
            </div>
          </section>
        ))}
      </aside>

      <div className="dx-agent-stage" key={preview.uuid}>
        <div className="dx-agent-wordmark" aria-hidden="true">
          {preview.name}
        </div>
        <img
          className="dx-agent-portrait"
          src={preview.image}
          alt={`${preview.name} agent artwork`}
        />
        <div className="dx-agent-stage-meta">
          <small>Previewing</small>
          <strong>{preview.name}</strong>
        </div>
      </div>

      <aside className="dx-agent-intel">
        <header>
          {preview.role?.icon && <img src={preview.role.icon} alt="" />}
          <div>
            <small>{preview.role?.name || "Agent"}</small>
            <h2>{preview.name}</h2>
          </div>
        </header>
        <p>
          {preview.description ||
            "Select this agent to add them to the ban list."}
        </p>
        {preview.abilities?.length > 0 && (
          <div
            className="dx-agent-abilities"
            aria-label={`${preview.name} abilities`}
          >
            {preview.abilities
              .filter((ability) => ability.icon)
              .slice(0, 5)
              .map((ability) => (
                <div
                  key={`${ability.slot}-${ability.name}`}
                  title={ability.description || ability.name}
                >
                  <img src={ability.icon} alt="" />
                  <span>{ability.name}</span>
                </div>
              ))}
          </div>
        )}
        <button
          type="button"
          disabled={disabled || !selectedAgent}
          onClick={() => selectedAgent && onPick(selectedAgent.uuid)}
        >
          {disabled
            ? `Waiting for ${session.teamNames?.[session.currentTurn] || `Team ${session.currentTurn}`}`
            : selectedAgent
              ? `Ban ${selectedAgent.name}`
              : "Select an agent"}
        </button>
      </aside>

      <nav className="dx-agent-roster" aria-label="Agent roster">
        {agents.map((agent) => {
          const banned = selected.includes(agent.uuid);
          return (
            <button
              type="button"
              key={agent.uuid}
              className={`${preview.uuid === agent.uuid ? "is-preview" : ""}${selectedAgentId === agent.uuid ? " is-selected" : ""}${banned ? " is-banned" : ""}`}
              disabled={banned}
              aria-pressed={selectedAgentId === agent.uuid}
              onMouseEnter={() => setHoveredAgentId(agent.uuid)}
              onMouseLeave={() => setHoveredAgentId(null)}
              onFocus={() => setHoveredAgentId(agent.uuid)}
              onBlur={() => setHoveredAgentId(null)}
              onClick={() => {
                setSelectedAgentId(agent.uuid);
                setHoveredAgentId(null);
                onSelect?.(agent);
              }}
              aria-label={
                banned ? `${agent.name}, banned` : `Select ${agent.name}`
              }
            >
              <img src={agent.icon || agent.image} alt="" loading="lazy" />
              <span>{agent.name}</span>
            </button>
          );
        })}
      </nav>
    </section>
  );
}

export default function DraftBoard({ session, client, connection }) {
  const [message, setMessage] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatReadyAt, setChatReadyAt] = useState(0);
  const [chatCooldown, setChatCooldown] = useState(0);
  const [musicMuted, setMusicMuted] = useState(false);
  const [matchCountdown, setMatchCountdown] = useState(null);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const feedbackPreviousPhaseRef = useRef(session.phase);
  const previousPhase = useRef(session.phase);
  const matchPreviousPhaseRef = useRef(session.phase);
  const musicRef = useRef(null);
  const agentWarningRef = useRef(null);
  const agentSelectionRef = useRef(null);
  const agentBannedRef = useRef(null);
  const pendingAgentBanRef = useRef(null);
  const sidePromptRef = useRef(null);
  const sidePromptPlayedRef = useRef(false);
  const matchFoundRef = useRef(null);
  const matchFoundPlayedRef = useRef(false);
  const chatLogRef = useRef(null);
  const chatStickToBottomRef = useRef(true);
  const send = (event, payload = {}, callback) =>
    client?.socket.emit(event, { code: session.code, ...payload }, callback);
  // TurnCountdown owns the 250ms tick and calls these at most once per turn,
  // so the board itself no longer re-renders four times a second.
  function expireTurn() {
    send("expireTurn");
  }
  function playTurnWarning() {
    const warning = agentWarningRef.current;
    if (!warning || musicMuted) return;
    warning.currentTime = 0;
    warning.play().catch(() => { });
  }
  // Tracks whether the chat log sits near its bottom edge, so incoming
  // messages auto-scroll only when the user is following the conversation.
  function handleChatScroll() {
    const log = chatLogRef.current;
    if (!log) return;
    chatStickToBottomRef.current =
      log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  }
  const maps = session.catalog?.maps || [];
  const agents = session.catalog?.agents || [];
  const selectedMaps = session.mapBans || [];
  const selectedAgents = session.agentBans || [];
  const isMyTurn =
    session.me?.isCaptain && session.me?.myTeam === session.currentTurn;
  const canPick =
    isMyTurn && (session.phase === "map_ban" || session.phase === "agent_ban");

  useEffect(() => {
    if (feedbackPreviousPhaseRef.current !== "done" && session.phase === "done") {
      setShowFeedbackPrompt(true);
    }
    feedbackPreviousPhaseRef.current = session.phase;
  }, [session.phase]);

  useEffect(() => {
    if (!chatReadyAt) {
      setChatCooldown(0);
      return undefined;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((chatReadyAt - Date.now()) / 1000));
      setChatCooldown(remaining);
      if (remaining === 0) setChatReadyAt(0);
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [chatReadyAt]);

  // Keep the chat log pinned to the newest message unless the user scrolled
  // up to read history. handleChatScroll maintains the stick flag; the
  // programmatic scroll below also fires onScroll, which keeps it true.
  useLayoutEffect(() => {
    const log = chatLogRef.current;
    if (!log || !chatStickToBottomRef.current) return;
    log.scrollTop = log.scrollHeight;
  }, [session.chat]);

  useEffect(() => {
    if (previousPhase.current === session.phase) return;
    if (["side_pick", "done"].includes(session.phase)) {
      previousPhase.current = session.phase;
      return;
    }
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = session.phase === "done" ? 660 : 440;
      gain.gain.value = 0.035;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.08);
    } catch {
      /* Audio can be blocked until the first user interaction. */
    }
    previousPhase.current = session.phase;
  }, [session.phase]);

  useEffect(() => {
    if (musicRef.current) musicRef.current.muted = musicMuted;
    if (agentWarningRef.current) agentWarningRef.current.muted = musicMuted;
    if (agentSelectionRef.current) agentSelectionRef.current.muted = musicMuted;
    if (agentBannedRef.current) agentBannedRef.current.muted = musicMuted;
    if (sidePromptRef.current) sidePromptRef.current.muted = musicMuted;
    if (matchFoundRef.current) matchFoundRef.current.muted = musicMuted;
  }, [musicMuted]);

  useEffect(() => {
    const audio = new Audio("/music/bg-music.mp3?v=2393371");
    const agentWarning = new Audio("/music/choose-agent.mp3");
    const agentSelection = new Audio(
      "/music/choose-agent-selection.mp3?v=6253",
    );
    const agentBanned = new Audio("/music/agent-banned.mp3?v=35874");
    const sidePrompt = new Audio("/music/choose-your-side.mp3?v=43815");
    const matchFound = new Audio("/music/match-found.mp3");
    audio.loop = true;
    // preload="none": each clip fetches on first .play() instead of on mount,
    // so sounds that never fire this session (e.g. match-found) are never
    // downloaded. play() triggers the load automatically.
    audio.preload = "none";
    audio.volume = 0.24;
    agentWarning.preload = "none";
    agentWarning.volume = 0.72;
    agentSelection.preload = "none";
    agentSelection.volume = 0.72;
    agentBanned.preload = "none";
    agentBanned.volume = 0.38;
    sidePrompt.preload = "none";
    sidePrompt.volume = 0.76;
    matchFound.preload = "none";
    matchFound.volume = 0.78;
    musicRef.current = audio;
    agentWarningRef.current = agentWarning;
    agentSelectionRef.current = agentSelection;
    agentBannedRef.current = agentBanned;
    sidePromptRef.current = sidePrompt;
    matchFoundRef.current = matchFound;

    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      agentWarning.pause();
      agentWarning.removeAttribute("src");
      agentWarning.load();
      agentSelection.pause();
      agentSelection.removeAttribute("src");
      agentSelection.load();
      agentBanned.pause();
      agentBanned.removeAttribute("src");
      agentBanned.load();
      sidePrompt.pause();
      sidePrompt.removeAttribute("src");
      sidePrompt.load();
      matchFound.pause();
      matchFound.removeAttribute("src");
      matchFound.load();
      musicRef.current = null;
      agentWarningRef.current = null;
      agentSelectionRef.current = null;
      agentBannedRef.current = null;
      sidePromptRef.current = null;
      matchFoundRef.current = null;
    };
  }, []);

  useEffect(() => {
    const priorPhase = matchPreviousPhaseRef.current;
    matchPreviousPhaseRef.current = session.phase;
    const matchFound = matchFoundRef.current;

    if (session.phase !== "done") {
      matchFoundPlayedRef.current = false;
      setMatchCountdown(null);
      if (matchFound) {
        matchFound.pause();
        matchFound.currentTime = 0;
      }
      return undefined;
    }
    if (priorPhase !== "agent_ban" || matchFoundPlayedRef.current)
      return undefined;

    matchFoundPlayedRef.current = true;
    setMatchCountdown(5);
    if (matchFound && !musicMuted) {
      matchFound.currentTime = 0;
      matchFound.play().catch(() => { });
    }

    const countdownTimer = window.setInterval(() => {
      setMatchCountdown((value) => (value > 1 ? value - 1 : null));
    }, 1000);
    const finishTimer = window.setTimeout(
      () => window.clearInterval(countdownTimer),
      5100,
    );
    return () => {
      window.clearInterval(countdownTimer);
      window.clearTimeout(finishTimer);
    };
  }, [session.phase]);

  useEffect(() => {
    const sidePrompt = sidePromptRef.current;
    const isPicker =
      session.phase === "side_pick" &&
      session.me?.isCaptain &&
      session.me?.myTeam === session.sidePickerTeam;

    if (!isPicker) {
      sidePromptPlayedRef.current = false;
      if (sidePrompt) {
        sidePrompt.pause();
        sidePrompt.currentTime = 0;
      }
      return undefined;
    }
    if (!sidePrompt || sidePromptPlayedRef.current || musicMuted)
      return undefined;

    sidePromptPlayedRef.current = true;
    let waitingForInteraction = false;
    const removeRetryListeners = () => {
      if (!waitingForInteraction) return;
      waitingForInteraction = false;
      window.removeEventListener("pointerdown", retryPlayback);
      window.removeEventListener("keydown", retryPlayback);
    };
    const retryPlayback = () =>
      sidePrompt
        .play()
        .then(removeRetryListeners)
        .catch(() => { });

    sidePrompt.currentTime = 0;
    sidePrompt.play().catch(() => {
      waitingForInteraction = true;
      window.addEventListener("pointerdown", retryPlayback, { once: true });
      window.addEventListener("keydown", retryPlayback, { once: true });
    });
    return removeRetryListeners;
  }, [
    session.phase,
    session.sidePickerTeam,
    session.me?.isCaptain,
    session.me?.myTeam,
    musicMuted,
  ]);

  useEffect(() => {
    if (canPick && session.phase === "agent_ban") return;
    const warning = agentWarningRef.current;
    if (!warning) return;
    warning.pause();
    warning.currentTime = 0;
    const selection = agentSelectionRef.current;
    if (selection) {
      selection.pause();
      selection.currentTime = 0;
    }
  }, [canPick, session.phase]);

  function playAgentSelection() {
    const selection = agentSelectionRef.current;
    if (
      !selection ||
      musicMuted ||
      !session.me?.isCaptain ||
      session.phase !== "agent_ban"
    )
      return;
    selection.pause();
    selection.currentTime = 0;
    selection.play().catch(() => { });
  }

  function requestAgentBan(uuid) {
    pendingAgentBanRef.current = uuid;
    send("banAgent", { uuid });
  }

  useEffect(() => {
    const pendingUuid = pendingAgentBanRef.current;
    if (!pendingUuid || !selectedAgents.includes(pendingUuid)) return;
    pendingAgentBanRef.current = null;
    const confirmation = agentBannedRef.current;
    if (!confirmation || musicMuted) return;
    confirmation.pause();
    confirmation.currentTime = 0;
    confirmation.play().catch(() => { });
  }, [selectedAgents, musicMuted]);

  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return undefined;

    const isBanPhase =
      session.phase === "map_ban" || session.phase === "agent_ban";
    if (!isBanPhase) {
      audio.pause();
      return undefined;
    }

    let waitingForInteraction = false;
    const retryPlayback = () => {
      audio
        .play()
        .then(removeRetryListeners)
        .catch(() => { });
    };
    const removeRetryListeners = () => {
      if (!waitingForInteraction) return;
      waitingForInteraction = false;
      window.removeEventListener("pointerdown", retryPlayback);
      window.removeEventListener("keydown", retryPlayback);
    };

    audio.play().catch(() => {
      waitingForInteraction = true;
      window.addEventListener("pointerdown", retryPlayback, { once: true });
      window.addEventListener("keydown", retryPlayback, { once: true });
    });

    return removeRetryListeners;
  }, [session.phase]);

  function leave() {
    client?.socket.emit("leaveSession", { code: session.code }, () => {
      window.location.href = "/draft";
    });
  }

  async function downloadSummary() {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1000;
    const context = canvas.getContext("2d");
    await document.fonts?.ready;
    context.fillStyle = "#070b11";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (session.selectedMap?.image) {
      try {
        const mapImage = await loadPosterImage(session.selectedMap.image);
        drawPosterCover(context, mapImage, 0, 0, canvas.width, canvas.height);
      } catch { }
    }
    const shade = context.createLinearGradient(0, 0, 0, canvas.height);
    shade.addColorStop(0, "rgba(5,8,13,.38)");
    shade.addColorStop(0.48, "rgba(5,8,13,.48)");
    shade.addColorStop(1, "rgba(5,8,13,.98)");
    context.fillStyle = shade;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const sideShade = context.createLinearGradient(0, 0, canvas.width, 0);
    sideShade.addColorStop(0, "rgba(5,8,13,.82)");
    sideShade.addColorStop(0.5, "rgba(5,8,13,.08)");
    sideShade.addColorStop(1, "rgba(5,8,13,.82)");
    context.fillStyle = sideShade;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#e83f4e";
    context.fillRect(0, 0, canvas.width, 8);
    context.fillStyle = "#e83f4e";
    context.font = '800 32px "Rajdhani", sans-serif';
    context.letterSpacing = "8px";
    context.fillText("DRAFTIX", 76, 82);
    context.textAlign = "right";
    context.fillStyle = "#b3bbc7";
    context.font = '700 22px "Rajdhani", sans-serif';
    context.letterSpacing = "3px";
    context.fillText(`ROOM ${session.code}`, 1524, 78);
    context.textAlign = "center";
    context.fillStyle = "#ff4655";
    context.font = '700 22px "Rajdhani", sans-serif';
    context.letterSpacing = "7px";
    context.fillText("MATCH READY", 800, 218);
    context.fillStyle = "#f3f5f7";
    context.font = '800 132px "Barlow Condensed", sans-serif';
    context.letterSpacing = "2px";
    context.fillText(
      (session.selectedMap?.name || "MAP DECIDED").toUpperCase(),
      800,
      350,
    );
    const chosenSide = session.selectedSide || "attack";
    const oppositeSide = chosenSide === "attack" ? "defense" : "attack";
    const pickerTeam = session.sidePickerTeam === "B" ? "B" : "A";
    const sideA = pickerTeam === "A" ? chosenSide : oppositeSide;
    const sideB = pickerTeam === "B" ? chosenSide : oppositeSide;
    const [logoA, logoB] = await Promise.all([
      loadPosterImage(session.teamLogos?.A || "/images/draftix.webp").catch(
        () => null,
      ),
      loadPosterImage(session.teamLogos?.B || "/images/draftix.webp").catch(
        () => null,
      ),
    ]);
    if (logoA) context.drawImage(logoA, 594, 490, 96, 96);
    if (logoB) context.drawImage(logoB, 910, 490, 96, 96);
    context.textAlign = "right";
    context.fillStyle = "#f3f5f7";
    context.font = '800 62px "Barlow Condensed", sans-serif';
    context.letterSpacing = "0px";
    context.fillText(
      (session.teamNames?.A || "TEAM A").toUpperCase(),
      690,
      668,
    );
    context.fillStyle = "#e83f4e";
    context.font = '800 31px "Rajdhani", sans-serif';
    context.fillText(sideA.toUpperCase(), 690, 718);
    context.textAlign = "center";
    context.fillStyle = "#e83f4e";
    context.font = '800 58px "Doto", monospace';
    context.fillText("VS", 800, 680);
    context.textAlign = "left";
    context.fillStyle = "#f3f5f7";
    context.font = '800 62px "Barlow Condensed", sans-serif';
    context.fillText(
      (session.teamNames?.B || "TEAM B").toUpperCase(),
      910,
      668,
    );
    context.fillStyle = "#d8dde5";
    context.font = '800 31px "Rajdhani", sans-serif';
    context.fillText(sideB.toUpperCase(), 910, 718);
    context.textAlign = "center";
    context.fillStyle = "#9ba4b2";
    context.font = '700 21px "Rajdhani", sans-serif';
    context.letterSpacing = "3px";
    const banNames = selectedAgents
      .map((uuid) => agents.find((agent) => agent.uuid === uuid)?.name)
      .filter(Boolean)
      .join("  /  ");
    context.fillText(
      banNames ? `AGENT BANS  ${banNames.toUpperCase()}` : "NO AGENT BANS",
      800,
      876,
    );
    context.fillStyle = "rgba(255,255,255,.18)";
    context.fillRect(76, 920, 1448, 1);
    context.textAlign = "left";
    context.fillStyle = "#8e98a7";
    context.font = '600 18px "Rajdhani", sans-serif';
    context.letterSpacing = "2px";
    context.fillText("DRAFTIX MATCH CARD", 76, 958);
    context.textAlign = "right";
    context.fillText("DRAFTIX.TECH", 1524, 958);
    const link = document.createElement("a");
    const mapSlug = (session.selectedMap?.name || "match")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    link.download = `draftix-${mapSlug}-${session.code}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function sendChat(event) {
    event.preventDefault();
    const text = message.trim();
    if (!client?.socket || !text || chatSending || chatCooldown > 0) return;
    setChatSending(true);
    send("chatMessage", { text }, (result) => {
      setChatSending(false);
      if (result?.ok === false) return;
      setMessage("");
      setChatReadyAt(Date.now() + 10000);
    });
  }

  const phaseLabel =
    session.phase === "map_ban"
      ? "Map veto"
      : session.phase === "side_pick"
        ? "Side pick"
        : session.phase === "agent_ban"
          ? "Agent bans"
          : "Complete";
  const turnTeam =
    session.currentTurn === "A" ? session.teamNames?.A : session.teamNames?.B;
  const status =
    session.phase === "done"
      ? "Ready to play"
      : session.phase === "side_pick"
        ? `${session.sidePickerTeam === "A" ? session.teamNames?.A : session.teamNames?.B} chooses the opening side`
        : isMyTurn
          ? "Your turn"
          : `Waiting for ${turnTeam}`;
  const pool = session.phase === "agent_ban" ? agents : maps;
  const selected =
    session.phase === "agent_ban" ? selectedAgents : selectedMaps;
  const kind = session.phase === "agent_ban" ? "agents" : "maps";
  const phases = ["map_ban", "side_pick", "agent_ban", "done"];
  const phaseIndex = phases.indexOf(session.phase);
  const isBanPhase =
    session.phase === "map_ban" || session.phase === "agent_ban";

  return (
    <main
      className={`dx-app dx-phase-${session.phase}${canPick ? " is-my-turn" : ""}`}
    >
      {matchCountdown !== null && (
        <MatchFoundOverlay
          countdown={matchCountdown}
          map={session.selectedMap}
        />
      )}
      <AppNav
        variant="app"
        center={<div className="dx-phase"><strong>{phaseLabel}</strong><span>Room {session.code}</span></div>}
        actions={<>{isBanPhase && <button className="dx-audio-toggle" aria-pressed={musicMuted} onClick={() => setMusicMuted((value) => !value)}>{musicMuted ? "Sound off" : "Sound on"}</button>}{session.phase === "done" && <button onClick={downloadSummary}>Poster</button>}<button onClick={leave}>Leave</button></>}
      />
      <nav className="dx-phase-rail" aria-label="Draft progress">
        {[
          ["Map veto", "map_ban"],
          ["Side", "side_pick"],
          ["Agents", "agent_ban"],
          ["Match ready", "done"],
        ].map(([label, phase], index) => (
          <span
            key={phase}
            className={
              index === phaseIndex
                ? "is-active"
                : index < phaseIndex
                  ? "is-complete"
                  : ""
            }
          >
            <i>{String(index + 1).padStart(2, "0")}</i>
            {label}
          </span>
        ))}
      </nav>
      <div className="dx-draft-shell">
        <section className="dx-draft-main">
          {!["agent_ban", "side_pick", "done"].includes(session.phase) && (
            <header className="dx-turn">
              <div>
                <span className="dx-turn-label">
                  {canPick ? "Action required" : "Live draft"}
                </span>
                <h1>{status}</h1>
                <p>
                  {canPick
                    ? "Lock one option before the timer expires."
                    : "The board updates for everyone in real time."}
                </p>
              </div>
              <TurnCountdown
                turnEndsAt={session.turnEndsAt}
                active={session.phase === "map_ban"}
                onExpire={expireTurn}
              />
            </header>
          )}
          {session.phase === "side_pick" && (
            <SidePickConsole
              map={session.selectedMap}
              choosingTeam={
                session.sidePickerTeam === "A"
                  ? session.teamNames?.A
                  : session.teamNames?.B
              }
              canPick={Boolean(
                session.me?.isCaptain &&
                session.me.myTeam === session.sidePickerTeam,
              )}
              onPick={(side) => send("pickSide", { side })}
            />
          )}
          {session.phase === "map_ban" && (
            <section className="dx-pool">
              <header>
                <div>
                  <span>Map pool</span>
                  <h2>Choose a map to ban</h2>
                </div>
                <p>
                  <b>{selected.length}</b> locked
                </p>
              </header>
              <SelectionGrid
                items={pool}
                selected={selected}
                disabled={!canPick}
                kind={kind}
                onPick={(uuid) => send("banMap", { uuid })}
              />
            </section>
          )}
          {session.phase === "agent_ban" && (
            <AgentBanConsole
              agents={agents}
              selected={selectedAgents}
              disabled={!canPick}
              onPick={requestAgentBan}
              onSelect={playAgentSelection}
              session={session}
              timer={
                <TurnCountdown
                  variant="agent"
                  label="Lock timer"
                  turnEndsAt={session.turnEndsAt}
                  active
                  warnBelow={canPick ? 10 : null}
                  onExpire={expireTurn}
                  onWarning={playTurnWarning}
                />
              }
              status={status}
            />
          )}
          {session.phase === "done" && (
            <>
              <MatchReadyConsole
                session={session}
                agents={agents}
                selectedAgents={selectedAgents}
                onDownload={downloadSummary}
                onRematch={() => send("rematchDraft")}
              />
              {showFeedbackPrompt && <FeedbackPrompt source="draft" onDismiss={() => setShowFeedbackPrompt(false)} />}
            </>
          )}
        </section>
        <aside className="dx-chat">
          <header>
            <div>
              <small>Squad comms</small>
              <h2>Room chat</h2>
            </div>
            <span>{session.chat?.length || 0}/50</span>
          </header>
          <div
            className="dx-chat-log"
            ref={chatLogRef}
            onScroll={handleChatScroll}
          >
            {session.chat?.length ? (
              session.chat.map((item) => (
                <article
                  key={item.id}
                  className={item.fromId === session.me?.id ? "is-mine" : ""}
                >
                  <strong>{item.fromName}</strong>
                  <p>{item.text}</p>
                </article>
              ))
            ) : (
              <div className="dx-chat-empty">
                <span>COMMS</span>
                <p>Messages stay inside this room.</p>
              </div>
            )}
          </div>
          <form onSubmit={sendChat}>
            <input
              value={message}
              maxLength={100}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Message the room"
              aria-label="Room message"
            />
            <span
              className={`dx-chat-cooldown${chatCooldown > 0 ? " is-active" : ""}`}
              aria-live="polite"
              aria-label={chatCooldown > 0 ? `${chatCooldown} seconds until the next message` : "Ready to send"}
            >
              <span aria-hidden="true">⏱</span>
              {`0:${String(chatCooldown).padStart(2, "0")}`}
            </span>
            <button type="submit" disabled={!message.trim() || chatSending || chatCooldown > 0} aria-label={chatCooldown > 0 ? `Send available in ${chatCooldown} seconds` : "Send room message"}>
              {chatSending ? "Sending" : "Send"}
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}
