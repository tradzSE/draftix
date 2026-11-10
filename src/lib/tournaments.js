import { createClient } from "@supabase/supabase-js";

// Shared by the tournament page and the static SEO build.
export const tournamentSeo = {
  heading: "Free tournament bracket maker",
  description: "Create a free tournament bracket for 3 to 16 teams or players. Choose single or double elimination, round robin, or Swiss. Track scores and share live results.",
  intro: "Create brackets for 3 to 16 teams or players. Choose a format, track scores, and share live results.",
  questions: [
    { title: "How do I make a tournament bracket?", answer: "Name your event, choose a game or sport, and add your teams or players in seed order. Select a format and series length, then create your bracket. Share the public link so everyone can follow the results." },
    { title: "Which tournament formats can I use?", answer: "Choose single elimination, double elimination, round robin, or Swiss. Single elimination removes an entrant after one loss. Round robin schedules every entrant against every other entrant. Swiss pairs entrants over successive rounds using their results." },
    { title: "Is the bracket maker free and only for esports?", answer: "Draftix is free to use. Make brackets for sports, esports, chess, or your own activity using Other. Keep your organizer link private; use the public link to share your bracket." },
  ],
};

const url = String(import.meta.env?.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
const key = String(import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();
const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 10 } },
}) : null;

function friendlyTournamentError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  if (code === "anonymous_provider_disabled" || message.includes("anonymous sign-ins are disabled")) {
    return "Bracket creation is unavailable because anonymous sign-ins are disabled in Supabase. Enable Anonymous Sign-Ins under Authentication → Sign In / Providers, then try again.";
  }
  if (message.includes("not found")) return "This tournament link is unavailable.";
  if (message.includes("organizer access")) return "The organizer link is invalid or has expired.";
  if (message.includes("next match")) return "Clear the later match result before changing this winner.";
  if (message.includes("final series")) return "Enter the final series score (e.g. 3–1 in a best of 5). Partial scores can't be saved.";
  if (message.includes("clear later swiss")) return "Clear the later Swiss rounds before changing this result.";
  if (message.includes("not ready")) return "Both entrants must be decided before recording this match.";
  if (message.includes("already decided")) return "This match is already decided. Clear it first.";
  if (message.includes("valid live score")) return "Enter a valid live score (within the match format).";
  if (message.includes("non-tied score") || message.includes("higher score")) return "The selected winner must have the higher score.";
  if (message.includes("unique")) return "Every entrant needs a unique name.";
  if (message.includes("too many") || message.includes("rate limit")) return "Too many attempts. Please wait and try again.";
  if (message.includes("daily tournament limit")) return "You've reached today's tournament limit — try again tomorrow.";
  if (message.includes("failed to fetch") || message.includes("network")) return "Could not reach Draftix. Check your connection and try again.";
  if (message.includes("authentication")) return "Your session expired. Refresh the page and try again.";
  return "Something went wrong. Please try again.";
}

async function ensureAuth() {
  if (!supabase) throw new Error("Draftix is not configured");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    const result = await supabase.auth.signInAnonymously();
    if (result.error) throw result.error;
  }
}

async function rpc(name, params, auth = false) {
  try {
    if (!supabase) throw new Error("Draftix is not configured");
    if (auth) await ensureAuth();
    const { data, error } = await supabase.rpc(name, params);
    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(friendlyTournamentError(error));
  }
}

const TOKEN_PREFIX = "draftix:tournament:";
const REGISTRY_KEY = "draftix:my-tournaments";
const REGISTRY_LIMIT = 50;

function safeGet(store, key) {
  try { return store.getItem(key); } catch { return null; }
}

function safeSet(store, key, value) {
  try { store.setItem(key, value); return true; } catch { return false; }
}

function safeRemove(store, key) {
  try { store.removeItem(key); } catch { /* ignore */ }
}

export function tournamentToken(slug) {
  return safeGet(localStorage, `${TOKEN_PREFIX}${slug}`) || safeGet(sessionStorage, `${TOKEN_PREFIX}${slug}`) || "";
}

export function saveTournamentToken(slug, token) {
  if (slug && token) {
    if (safeSet(localStorage, `${TOKEN_PREFIX}${slug}`, token)) safeRemove(sessionStorage, `${TOKEN_PREFIX}${slug}`);
  }
}

function readRegistry() {
  try {
    const raw = JSON.parse(localStorage.getItem(REGISTRY_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((entry) => entry && typeof entry.slug === "string" && typeof entry.token === "string");
  } catch {
    return [];
  }
}

function writeRegistry(entries) {
  safeSet(localStorage, REGISTRY_KEY, JSON.stringify(entries.slice(0, REGISTRY_LIMIT)));
}

export function listMyTournaments() {
  return readRegistry().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function registerMyTournament({ slug, name = "", token = "", format = "", activity = "", teamCount = 0, createdAt = 0 }) {
  if (!slug || !token) return;
  const registry = readRegistry();
  const previous = registry.find((entry) => entry.slug === slug);
  const entry = {
    slug,
    name: name || previous?.name || "",
    token,
    format: format || previous?.format || "",
    activity: activity || previous?.activity || "",
    teamCount: teamCount || previous?.teamCount || 0,
    createdAt: previous?.createdAt || createdAt || Date.now(),
  };
  // Callers run this on every bracket load (including the 30s fallback poll),
  // so skip the write when nothing actually changed.
  const unchanged = previous
    && previous.name === entry.name
    && previous.token === entry.token
    && previous.format === entry.format
    && previous.activity === entry.activity
    && previous.teamCount === entry.teamCount
    && previous.createdAt === entry.createdAt;
  if (unchanged) return;
  writeRegistry([entry, ...registry.filter((item) => item.slug !== slug)]);
  saveTournamentToken(slug, token);
}

export function removeMyTournament(slug) {
  writeRegistry(readRegistry().filter((entry) => entry.slug !== slug));
  safeRemove(localStorage, `${TOKEN_PREFIX}${slug}`);
  safeRemove(sessionStorage, `${TOKEN_PREFIX}${slug}`);
}

// One-time rescue: copy any organizer tokens still living in sessionStorage
// (pre-persistence tournaments whose tab is still open) into the registry.
// Tokens from already-closed tabs are unrecoverable — the server only keeps
// a hash — but this fixes the footgun for every still-open session.
export function migrateTournamentStorage() {
  try {
    const rescued = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (!key || !key.startsWith(TOKEN_PREFIX)) continue;
      const slug = key.slice(TOKEN_PREFIX.length);
      const token = safeGet(sessionStorage, key);
      if (!slug || !token) continue;
      safeSet(localStorage, key, token);
      rescued.push({ slug, token });
    }
    if (!rescued.length) return;
    const registry = readRegistry();
    for (const { slug, token } of rescued) {
      if (registry.some((entry) => entry.slug === slug)) continue;
      // Stub entry: createdAt 0 means "unknown" — the hub's status fetch
      // self-heals name/format/teamCount and adopts the server-side
      // creation date, and unknown-age entries sort to the bottom.
      registry.push({ slug, name: "", token, format: "", teamCount: 0, createdAt: 0 });
    }
    writeRegistry(registry);
  } catch {
    // Storage unavailable (private mode etc.) — feature no-ops.
  }
}

export const createTournament = (name, teams, bestOf, format = "single_elimination", activity = "General") =>
  rpc("draftix_create_tournament_with_activity", { p_name: name, p_teams: teams, p_best_of: bestOf, p_format: format, p_activity: activity }, true);

export const getTournament = (slug, token = "") =>
  rpc("draftix_tournament_state", { p_slug: slug, p_token: token || null });

export const setMatchResult = (slug, token, matchId, scoreA, scoreB, winnerTeamId) =>
  rpc("draftix_set_match_result", { p_slug: slug, p_token: token, p_match_id: matchId, p_score_a: scoreA, p_score_b: scoreB, p_winner_team_id: winnerTeamId }, true);

export const clearMatchResult = (slug, token, matchId) =>
  rpc("draftix_clear_match_result", { p_slug: slug, p_token: token, p_match_id: matchId }, true);

export const updateSeriesScore = (slug, token, matchId, scoreA, scoreB) =>
  rpc("draftix_update_series_score", { p_slug: slug, p_token: token, p_match_id: matchId, p_score_a: scoreA, p_score_b: scoreB }, true);

export const updateTournamentFormat = (slug, token, format) =>
  rpc("draftix_update_tournament_format", { p_slug: slug, p_token: token, p_format: format }, true);

export function subscribeToTournament(tournamentId, onChange) {
  if (!tournamentId) return () => { };
  // Safety net: the database trigger broadcast is instant, but a slow poll
  // covers dropped sockets and self-hosted setups without realtime.
  const fallback = window.setInterval(onChange, 30_000);
  if (!supabase) return () => window.clearInterval(fallback);
  const channel = supabase
    .channel(`tournament:${tournamentId}`)
    .on("broadcast", { event: "tournament_change" }, () => onChange())
    .subscribe();
  return () => {
    window.clearInterval(fallback);
    void supabase.removeChannel(channel);
  };
}
