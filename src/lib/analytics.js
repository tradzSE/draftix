import { supabaseConfig } from "./supabaseConfig.js";

/**
 * First-party pageview tracking → Supabase (`site_pageviews`).
 * Privacy: anonymous random-UUID cookie, page path + referrer host only.
 * No IP, user-agent, or fingerprint is stored. See supabase/analytics.sql.
 */
const VISITOR_COOKIE = "dx_v";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function readVisitorId() {
  const match = document.cookie.match(/(?:^|;\s*)dx_v=([0-9a-f-]{16,64})/i);
  if (match) return match[1];
  const id = crypto.randomUUID();
  // HttpOnly isn't possible client-side; the value is random and non-identifying.
  document.cookie = `${VISITOR_COOKIE}=${id}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  return id;
}

function referrerHost() {
  try {
    if (!document.referrer) return null;
    const url = new URL(document.referrer);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === location.hostname.replace(/^www\./, "")) return null; // internal nav
    return host || null;
  } catch (_) {
    return null;
  }
}

/** Record a pageview. Fire-and-forget — analytics must never break the UI. */
export function trackPageview(path) {
  const cfg = supabaseConfig();
  if (!cfg) return;
  try {
    fetch(`${cfg.url}/rest/v1/site_pageviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        path: String(path || "/").slice(0, 128),
        ref_host: referrerHost(),
        visitor: readVisitorId(),
      }),
      keepalive: true,
    }).catch(() => {});
  } catch (_) {}
}

/** Record a successful, anonymous product action without retaining its input. */
export function trackProductEvent(eventType) {
  const cfg = supabaseConfig();
  if (!cfg || typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") return;
  try {
    fetch(`${cfg.url}/rest/v1/rpc/draftix_record_product_event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        p_event_type: String(eventType || ""),
        p_source_id: crypto.randomUUID(),
      }),
      keepalive: true,
    }).catch(() => {});
  } catch (_) {}
}
