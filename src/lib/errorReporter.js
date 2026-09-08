import { supabaseConfig } from "./supabaseConfig.js";

/**
 * Client crash reporting → Supabase (`draftix_report_client_error` RPC →
 * `draftix_client_errors` table). Mirrors analytics.js: fire-and-forget,
 * never throws, never blocks the UI.
 *
 * Dedupe: identical (kind + message) pairs are reported once per page
 * load, and the total is capped, so a crash loop cannot flood the feed.
 * Privacy: message, stack, page path, user-agent and the anonymous dx_v
 * cookie id — no IP address. Rows are deleted after 30 days. See the
 * privacy policy and supabase/migrations/202609040004_client_errors.sql.
 */

const MAX_PER_LOAD = 5;
const reported = new Set();
let sentCount = 0;

export function isStaleAssetError(error) {
    return /failed to fetch dynamically imported module|unable to preload css|failed to preload css|loading chunk|chunkloaderror|preload.*(?:css|module)/i
        .test(String(error?.message || error || ""));
}

/** Read the analytics visitor cookie if present (never writes one). */
function readVisitorId() {
    try {
        const match = document.cookie.match(/(?:^|;\s*)dx_v=([0-9a-f-]{16,64})/i);
        return match ? match[1] : null;
    } catch (_) {
        return null;
    }
}

function toText(value, max) {
    if (value == null) return null;
    const text = String(value);
    return text.length ? text.slice(0, max) : null;
}

/** Report one client error. Safe to call from anywhere — never throws. */
export function reportClientError({ kind = "window", message, stack = null, page = null }) {
    if (import.meta.env.DEV) return; // keep local development crashes out of the feed
    if (sentCount >= MAX_PER_LOAD) return;

    const msg = toText(message, 1000);
    if (!msg) return; // resource-load "error" events carry no message
    if (isStaleAssetError(msg)) return; // handled by the deploy recovery path
    if (/^script error\.?$/i.test(msg) && !stack) return; // opaque cross-origin WebView script

    const key = `${kind}:${msg}`;
    if (reported.has(key)) return; // the same crash firing repeatedly
    reported.add(key);

    const cfg = supabaseConfig();
    if (!cfg) return;

    try {
        fetch(`${cfg.url}/rest/v1/rpc/draftix_report_client_error`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: cfg.key,
                Authorization: `Bearer ${cfg.key}`,
                Prefer: "return=minimal",
            },
            body: JSON.stringify({
                p_kind: kind,
                p_message: msg,
                p_stack: toText(stack, 4000),
                p_page: toText(page || location.pathname, 200),
                p_user_agent: toText(navigator.userAgent, 300),
                p_visitor: readVisitorId(),
            }),
            keepalive: true,
        })
            .then(() => {
                sentCount += 1;
            })
            .catch(() => { });
    } catch (_) { }
}

/** Error-boundary hook: a React render failure killed the page. */
export function reportRenderError(error, info) {
    const componentStack = info?.componentStack ? `\n${info.componentStack}` : "";
    reportClientError({
        kind: "render",
        message: error?.message || String(error),
        stack: `${error?.stack || ""}${componentStack}`.trim() || null,
    });
}

/**
 * Install window "error" + "unhandledrejection" listeners so crashes
 * outside React (event handlers, async code) are reported too. Render
 * errors never reach these — React routes them to the error boundary —
 * so the kinds stay disjoint.
 */
export function installGlobalErrorHandlers() {
    if (typeof window === "undefined") return;
    window.addEventListener("error", (event) => {
        reportClientError({
            kind: "window",
            message: event.error?.message || event.message,
            stack: event.error?.stack || null,
        });
    });
    window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason;
        reportClientError({
            kind: "unhandledrejection",
            message: reason?.message || String(reason ?? "Unhandled promise rejection"),
            stack: reason?.stack || null,
        });
    });
}
