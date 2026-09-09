import { useEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "@phosphor-icons/react/Check";
import { Copy } from "@phosphor-icons/react/Copy";
import { LockSimple } from "@phosphor-icons/react/LockSimple";
import { ShareNetwork } from "@phosphor-icons/react/ShareNetwork";
import { createDraftSocket } from "../socket/draftSocket";
import {
  draftReducer,
  getNickname,
  saveNickname,
  sessionCodeFromUrl,
} from "../state/draftReducer";
import DraftBoard from "./DraftBoard.jsx";
import AppNav from "./AppNav.jsx";
import SiteHeader from "./SiteHeader.jsx";
// Draft-room styles ride this lazy chunk instead of the entry bundle.
import "../styles/app-redesign.css";

function prepareTeamLogo(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type.startsWith("image/"))
      return reject(new Error("Choose an image file."));
    if (file.size > 5 * 1024 * 1024)
      return reject(new Error("Logo must be smaller than 5 MB."));
    const image = new Image();
    const source = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 160;
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, 160, 160);
      const scale = Math.min(144 / image.width, 144 / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(
        image,
        (160 - width) / 2,
        (160 - height) / 2,
        width,
        height,
      );
      URL.revokeObjectURL(source);
      resolve(canvas.toDataURL("image/webp", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error("That image could not be opened."));
    };
    image.src = source;
  });
}

export default function SessionGate() {
  const [state, dispatch] = useReducer(draftReducer, {
    connection: "connecting",
    session: null,
    error: "",
    pending: false,
  });
  const [nickname, setNickname] = useState(getNickname);
  const [inviteCode, setInviteCode] = useState(sessionCodeFromUrl);
  const [code, setCode] = useState(inviteCode);
  const clientRef = useRef(null);
  const isInvitation = Boolean(inviteCode);

  useEffect(() => {
    document.body.classList.add("page-app");
    clientRef.current = createDraftSocket({
      onState: (value) => dispatch({ type: "state", value }),
      onChat: (value) => dispatch({ type: "chat", value }),
      onConnection: (value) => dispatch({ type: "connection", value }),
      onError: (value) => dispatch({ type: "error", value }),
    });
    return () => {
      document.body.classList.remove("page-app");
      clientRef.current?.close();
    };
  }, []);

  function finish(result) {
    if (!result?.ok) {
      dispatch({
        type: "error",
        value: result?.error || "Could not join the session.",
      });
      return;
    }
    if (result.code)
      window.history.replaceState({}, "", `/draft?code=${result.code}`);
  }

  function submit(mode) {
    const enteredName = nickname.trim();
    if (mode === "join" && isInvitation && !enteredName) {
      dispatch({ type: "error", value: "Enter your name to join this room." });
      return;
    }
    const name = enteredName || (mode === "create" ? "Host" : "Player");
    const roomCode = code.trim().toUpperCase();
    if (mode === "join" && !roomCode) {
      dispatch({ type: "error", value: "Enter a session code." });
      return;
    }
    if (state.connection !== "online") {
      dispatch({
        type: "error",
        value: "Draftix is still connecting. Try again in a moment.",
      });
      return;
    }
    saveNickname(name);
    dispatch({ type: "pending", value: true });
    if (mode === "create") clientRef.current?.create(name, finish);
    else clientRef.current?.join(roomCode, name, finish);
  }

  function leaveInvitation() {
    setInviteCode("");
    setCode("");
    dispatch({ type: "error", value: "" });
    window.history.replaceState({}, "", "/draft");
  }

  if (state.session && !state.session.closed) {
    return state.session.phase === "lobby" ? (
      <Lobby
        session={state.session}
        client={clientRef.current}
        connection={state.connection}
      />
    ) : (
      <DraftBoard
        session={state.session}
        client={clientRef.current}
        connection={state.connection}
      />
    );
  }

  return (
    <main className="dx-entry">
      <SiteHeader draftEntry />
      <div className="dx-entry-layout">
        <section className="dx-entry-copy">
          <h1>
            {isInvitation ? "Join" : "Set up"}
            <br />
            the room.
          </h1>
        </section>
        <section className="dx-entry-panel" aria-label="Draft access">
          {isInvitation ? (
            <>
              <header className="dx-panel-heading">
                <span>Room invitation</span>
                <strong>{inviteCode}</strong>
              </header>
              <div className="dx-invite-context">
                <strong>You’ve been invited</strong>
                <p>Enter your display name to join the room.</p>
              </div>
              <form className="dx-invite-form" onSubmit={(event) => { event.preventDefault(); submit("join"); }}>
                <label className="dx-field">
                  <span>Your name</span>
                  <input
                    value={nickname}
                    maxLength={24}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder="Player name"
                    autoComplete="username"
                    autoFocus
                  />
                </label>
                <button
                  className="dx-button dx-button-primary"
                  type="submit"
                  disabled={state.pending || state.connection !== "online"}
                >
                  {state.pending ? "Joining..." : state.connection !== "online" ? "Connecting..." : "Join room"}
                </button>
              </form>
              <button className="dx-invite-exit" type="button" onClick={leaveInvitation}>
                Create a different room
              </button>
              {state.error && <p className="dx-error" role="alert">{state.error}</p>}
            </>
          ) : (
            <>
              <header className="dx-panel-heading">
                <span>Room access</span>
                <strong>01 / Connect</strong>
              </header>
              <label className="dx-field">
                <span>Your name</span>
                <input
                  value={nickname}
                  maxLength={24}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="Player name"
                  autoComplete="username"
                />
              </label>
              <button
                className="dx-button dx-button-primary"
                disabled={state.pending || state.connection !== "online"}
                onClick={() => submit("create")}
              >
                {state.pending ? "Working..." : "Create a room"}
              </button>
              <div className="dx-divider"><span>or join the briefing</span></div>
              <label className="dx-field">
                <span>Room code</span>
                <input
                  className="dx-code-input"
                  value={code}
                  maxLength={8}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="ABC12X"
                  autoComplete="off"
                />
              </label>
              <button
                className="dx-button dx-button-secondary"
                disabled={state.pending || state.connection !== "online"}
                onClick={() => submit("join")}
              >
                Join room
              </button>
              {state.error && <p className="dx-error" role="alert">{state.error}</p>}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function TeamPanel({ side, session, send }) {
  const [previewName, setPreviewName] = useState(
    session.teamNames?.[side] || `Team ${side}`,
  );
  const name = previewName.trim() || `Team ${side}`;
  const captain = session.captainNames?.[side];
  const roster = session.teamRosters?.[side] || [];
  const isOnTeam = session.me?.myTeam === side;
  const teamLogo = session.teamLogos?.[side] || null;

  useEffect(() => {
    setPreviewName(session.teamNames?.[side] || `Team ${side}`);
  }, [session.teamNames?.[side], side]);

  useEffect(() => {
    const updatePreview = (event) => setPreviewName(event.detail?.[side] || "");
    window.addEventListener("draftix:team-name-preview", updatePreview);
    return () =>
      window.removeEventListener("draftix:team-name-preview", updatePreview);
  }, [side]);

  async function changeLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const logo = await prepareTeamLogo(file);
      send("setTeamLogos", {
        ...(session.teamLogos || { A: null, B: null }),
        [side]: logo,
      });
    } catch (error) {
      const expected = ["Choose an image file.", "Logo must be smaller than 5 MB.", "That image could not be opened."];
      window.alert(expected.includes(error?.message) ? error.message : "That team logo could not be prepared. Try another image.");
    }
  }

  function removeLogo() {
    send("setTeamLogos", {
      ...(session.teamLogos || { A: null, B: null }),
      [side]: null,
    });
  }

  const mark = (
    <span
      className={`dx-team-mark${teamLogo ? " has-logo" : " is-default-logo"}${session.me?.isHost ? " is-editable" : ""}`}
    >
      <img
        src={teamLogo || "/images/draftix.webp"}
        alt={teamLogo ? `${name} logo` : "Draftix default team logo"}
      />
    </span>
  );
  return (
    <aside
      className={`dx-team dx-team-${side.toLowerCase()}${isOnTeam ? " is-my-team" : ""}`}
    >
      <header>
        <div>
          <small>Squad {side}</small>
          <h2>{name}</h2>
          <p>{captain ? "Captain locked" : "Seat open"}</p>
        </div>
        {session.me?.isHost ? (
          <label className="dx-team-mark-label" title="Customize squad logo">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={changeLogo}
            />
            {mark}
          </label>
        ) : (
          mark
        )}
      </header>
      {session.me?.isHost && teamLogo && (
        <button type="button" className="dx-logo-remove" onClick={removeLogo}>
          Remove logo
        </button>
      )}
      <div className="dx-captain">
        <small>Captain</small>
        <strong>{captain || "Unassigned"}</strong>
        <i className={captain ? "is-ready" : ""} />
      </div>
      <ul className="dx-roster">
        {roster.length ? (
          roster.map((player) => (
            <li key={player.id}>
              <span>{player.nickname}</span>
              {player.isCaptain && <small>Captain</small>}
            </li>
          ))
        ) : (
          <li className="is-empty">Awaiting players</li>
        )}
      </ul>
      <div className="dx-team-actions">
        <button onClick={() => send("claimCaptain", { team: side })}>
          {captain ? "Captain locked" : "Claim captain"}
        </button>
        <button
          className="is-quiet"
          onClick={() => send("setTeam", { team: side })}
        >
          {isOnTeam ? "Your squad" : "Join squad"}
        </button>
      </div>
    </aside>
  );
}

function Lobby({ session, client, connection }) {
  const [names, setNames] = useState(
    session.teamNames || { A: "Team A", B: "Team B" },
  );
  const [settings, setSettings] = useState(
    session.settings || {
      draftPreset: "competitive",
      agentBanCount: 6,
      turnTimeoutMs: 30000,
      sidePickEnabled: true,
      autoBanEnabled: true,
    },
  );
  const playableAgentCount = Array.isArray(session.catalog?.agents)
    ? session.catalog.agents.length
    : 12;
  const maxAgentBans = Math.max(
    0,
    playableAgentCount - (playableAgentCount % 2),
  );
  const teamNamesDirty =
    names.A !== (session.teamNames?.A || "Team A") ||
    names.B !== (session.teamNames?.B || "Team B");
  const draftRulesDirty =
    settings.draftPreset !== session.settings?.draftPreset ||
    Number(settings.agentBanCount) !==
    Number(session.settings?.agentBanCount) ||
    Number(settings.turnTimeoutMs) !==
    Number(session.settings?.turnTimeoutMs) ||
    settings.sidePickEnabled !== session.settings?.sidePickEnabled ||
    settings.autoBanEnabled !== session.settings?.autoBanEnabled;
  const send = (event, payload = {}) => {
    const requestedBanCount = Math.min(
      maxAgentBans,
      Math.max(0, Math.trunc(Number(payload.agentBanCount) || 0)),
    );
    const safePayload =
      event === "setGameSettings"
        ? {
          ...payload,
          agentBanCount: requestedBanCount - (requestedBanCount % 2),
        }
        : payload;
    client?.socket.emit(
      event,
      { code: session.code, ...safePayload },
      (result) => {
        if (!result?.ok) return;
        if (event === "setTeamNames")
          showNotice({
            variant: "save",
            title: "Team identity saved",
            detail: "Names are synced to the room",
          });
        if (event === "setGameSettings")
          showNotice({
            variant: "save",
            title: "Draft rules saved",
            detail: "The next draft will use these rules",
          });
      },
    );
  };
  const bothCaptains = Boolean(
    session.captainNames?.A && session.captainNames?.B,
  );

  const [notice, setNotice] = useState(null);
  const [noticeShown, setNoticeShown] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const inviteResetRef = useRef(null);

  function showNotice({ title, detail, variant }) {
    setNoticeShown(false);
    setNotice({ title, detail, variant });
  }

  // Render the toast without .is-visible first so the CSS entrance
  // transition always plays, including when a new notice replaces one.
  useEffect(() => {
    if (!notice) return undefined;
    const showTimer = window.setTimeout(() => setNoticeShown(true), 30);
    return () => window.clearTimeout(showTimer);
  }, [notice]);

  // Hold the toast, fade it out, then unmount once the fade completes.
  useEffect(() => {
    if (!notice || !noticeShown) return undefined;
    const hideTimer = window.setTimeout(() => setNoticeShown(false), 1900);
    const removeTimer = window.setTimeout(() => setNotice(null), 2300);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
    };
  }, [notice, noticeShown]);

  // Keep the agent-ban stepper inside the catalog-derived limit.
  useEffect(() => {
    setSettings((current) =>
      current.agentBanCount > maxAgentBans
        ? { ...current, agentBanCount: maxAgentBans }
        : current,
    );
  }, [maxAgentBans, settings.agentBanCount]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("draftix:team-name-preview", { detail: names }),
    );
  }, [names]);

  useEffect(() => {
    setNames(session.teamNames || { A: "Team A", B: "Team B" });
  }, [session.teamNames?.A, session.teamNames?.B]);

  useEffect(() => () => window.clearTimeout(inviteResetRef.current), []);

  function leave() {
    client?.socket.emit("leaveSession", { code: session.code }, () => {
      window.location.href = "/draft";
    });
  }

  function inviteDetails() {
    const url = `${window.location.origin}/draft?code=${session.code}`;
    const hostSide = session.me?.myTeam;
    const hostTeam = hostSide && session.teamNames?.[hostSide]?.trim() !== `Team ${hostSide}`
      ? session.teamNames?.[hostSide]
      : null;
    const customTeam = Object.entries(session.teamNames || {})
      .find(([side, name]) => name?.trim() && name.trim() !== `Team ${side}`)?.[1];
    const inviter = hostTeam?.trim() || customTeam?.trim() || "A team";
    return {
      url,
      title: `${inviter} invited you to a Valorant draft`,
      text: `${inviter} invited you to a Valorant draft.\nJoin on Draftix: ${url}\nRoom code: ${session.code}`,
    };
  }

  async function copyInvite() {
    const invite = inviteDetails();
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(invite.text);
      setInviteCopied(true);
      window.clearTimeout(inviteResetRef.current);
      inviteResetRef.current = window.setTimeout(() => setInviteCopied(false), 2200);
      showNotice({
        title: "Invite copied",
        detail: "Ready to paste in Discord",
      });
    } catch {
      window.prompt("Copy this invite:", invite.text);
    }
  }

  async function shareInvite() {
    const invite = inviteDetails();
    try {
      await navigator.share({ title: invite.title, text: `${invite.title}.`, url: invite.url });
      showNotice({ title: "Invite shared", detail: `Room ${session.code}` });
    } catch (error) {
      if (error?.name !== "AbortError") copyInvite();
    }
  }

  return (
    <main className="dx-app">
      <AppNav
        variant="app"
        center={<div className="dx-phase"><strong>Pre-match lobby</strong><span>Room {session.code}</span></div>}
        actions={<button onClick={leave}>Leave</button>}
      />
      <div className="dx-lobby">
        <TeamPanel side="A" session={session} send={send} />
        <section className="dx-room">
          <div className="dx-room-status">
            <span>{bothCaptains ? "Briefing complete" : "Captain check"}</span>
            <b>
              {bothCaptains
                ? "2 / 2 ready"
                : `${Number(Boolean(session.captainNames?.A)) + Number(Boolean(session.captainNames?.B))} / 2 ready`}
            </b>
          </div>
          <header>
            <h1>{bothCaptains ? "Ready to draft" : "Build the matchup"}</h1>
            <p>
              Share the code, seat two captains, launch the veto.
            </p>
          </header>
          <div className="dx-invite-module">
            <div className="dx-room-code">
              <small><LockSimple aria-hidden="true" weight="bold" />Private room code</small>
              <strong>{session.code}</strong>
            </div>
            <div className="dx-invite-actions">
              <button className="dx-copy-invite" type="button" onClick={copyInvite} aria-live="polite">
                {inviteCopied ? <Check aria-hidden="true" weight="bold" /> : <Copy aria-hidden="true" weight="bold" />}
                <span>{inviteCopied ? "Copied" : "Copy invite"}</span>
              </button>
              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <button className="dx-share-invite" type="button" onClick={shareInvite} aria-label="Share invitation" title="Share invitation">
                  <ShareNetwork aria-hidden="true" weight="bold" />
                  <span>Share</span>
                </button>
              )}
            </div>
          </div>
          {session.me?.isHost && (
            <div
              className={`dx-host-controls${teamNamesDirty || draftRulesDirty ? " has-unsaved-changes" : ""}`}
            >
              <div className="dx-control-group">
                <h2>
                  <span>01</span> Team identity
                </h2>
                <div className="dx-two-fields">
                  <label className="dx-field">
                    <span>Squad A</span>
                    <input
                      value={names.A}
                      maxLength={24}
                      onChange={(event) =>
                        setNames({ ...names, A: event.target.value })
                      }
                    />
                  </label>
                  <label className="dx-field">
                    <span>Squad B</span>
                    <input
                      value={names.B}
                      maxLength={24}
                      onChange={(event) =>
                        setNames({ ...names, B: event.target.value })
                      }
                    />
                  </label>
                </div>
                <button
                  className={`dx-text-button${teamNamesDirty ? " is-dirty" : " is-saved"}`}
                  aria-live="polite"
                  aria-label={teamNamesDirty ? "Save team name changes" : "Team names saved"}
                  onClick={() => send("setTeamNames", names)}
                >
                  {teamNamesDirty ? "Save changes" : "Saved"}
                </button>
              </div>
              <div className="dx-control-group">
                <h2>
                  <span>02</span> Draft rules
                </h2>
                <div className="dx-settings-grid">
                  <label className="dx-field">
                    <span>Preset</span>
                    <select
                      value={settings.draftPreset}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          draftPreset: event.target.value,
                        })
                      }
                    >
                      <option value="competitive">Competitive</option>
                      <option value="quick">Quick</option>
                      <option value="no-agents">No agent bans</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                  <div
                    className="dx-field dx-stepper-field"
                    data-max={maxAgentBans}
                  >
                    <span>Agent bans</span>
                    <div className="dx-stepper">
                      <button
                        type="button"
                        aria-label="Fewer agent bans"
                        disabled={settings.agentBanCount <= 0}
                        onClick={() =>
                          setSettings((current) => ({
                            ...current,
                            agentBanCount: Math.max(0, current.agentBanCount - 2),
                          }))
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="0"
                        max={maxAgentBans}
                        step="2"
                        title={`Maximum ${maxAgentBans} bans from ${playableAgentCount} available agents`}
                        aria-label="Agent bans"
                        value={settings.agentBanCount}
                        onChange={(event) =>
                          setSettings({
                            ...settings,
                            agentBanCount: Number(event.target.value),
                          })
                        }
                      />
                      <button
                        type="button"
                        aria-label="More agent bans"
                        disabled={settings.agentBanCount >= maxAgentBans}
                        onClick={() =>
                          setSettings((current) => ({
                            ...current,
                            agentBanCount: Math.min(maxAgentBans, current.agentBanCount + 2),
                          }))
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <label className="dx-field">
                    <span>Turn time</span>
                    <select
                      value={settings.turnTimeoutMs}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          turnTimeoutMs: Number(event.target.value),
                        })
                      }
                    >
                      <option value="15000">15 seconds</option>
                      <option value="30000">30 seconds</option>
                      <option value="45000">45 seconds</option>
                      <option value="60000">60 seconds</option>
                    </select>
                  </label>
                </div>
                <div className="dx-checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.sidePickEnabled !== false}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          sidePickEnabled: event.target.checked,
                        })
                      }
                    />{" "}
                    Side selection
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.autoBanEnabled !== false}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          autoBanEnabled: event.target.checked,
                        })
                      }
                    />{" "}
                    Turn timer
                  </label>
                </div>
                <button
                  className={`dx-text-button${draftRulesDirty ? " is-dirty" : " is-saved"}`}
                  aria-live="polite"
                  aria-label={draftRulesDirty ? "Save draft rule changes" : "Draft rules saved"}
                  onClick={() => send("setGameSettings", settings)}
                >
                  {draftRulesDirty ? "Save changes" : "Saved"}
                </button>
              </div>
            </div>
          )}
          <button
            className="dx-button dx-button-primary dx-start"
            disabled={!session.me?.isHost || !bothCaptains}
            onClick={() => send("startDraft")}
          >
            {!session.me?.isHost
              ? "Waiting for host"
              : bothCaptains
                ? "Launch map veto"
                : "Lock both captains"}
          </button>
        </section>
        <TeamPanel side="B" session={session} send={send} />
      </div>
      {notice &&
        createPortal(
          <div
            className={`dx-copy-notice${notice.variant === "save" ? " dx-save-notice" : ""}${noticeShown ? " is-visible" : ""}`}
            role="status"
            aria-live="polite"
          >
            <i aria-hidden="true">✓</i>
            <span>
              <strong>{notice.title}</strong>
              <small>{notice.detail}</small>
            </span>
          </div>,
          document.body,
        )}
    </main>
  );
}
