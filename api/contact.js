const { isIP } = require("node:net");

const TOPICS = new Set([
  "Draft room or map veto",
  "Tournament bracket",
  "Team balancer",
  "Website issue",
  "Something else",
]);
const MAX_BODY_BYTES = 10 * 1024;
const MAX_LOCAL_RATE_LIMIT_IPS = 10_000;
const CONTACT_COOLDOWN_MS = 10 * 60 * 1000;
const CONTACT_COOLDOWN_SECONDS = CONTACT_COOLDOWN_MS / 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_FORMSPREE_ENDPOINT = "https://formspree.io/f/mpppbygj";
const localContactSubmissions = new Map();

function respond(res, status, body, headers = {}) {
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
  return res.status(status).json(body);
}

function getClientIp(req) {
  const expressIp = String(req.ip || "").trim();
  if (isIP(expressIp)) return expressIp;

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && isIP(realIp.trim())) return realIp.trim();
  const forwardedFor = req.headers["x-forwarded-for"];
  const firstAddress = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const forwardedIp = String(firstAddress || "").split(",")[0].trim();
  if (forwardedIp) return forwardedIp;
  return String(req.socket?.remoteAddress || req.ip || "").trim();
}

function validIp(ip) {
  return isIP(ip) ? ip : "";
}

function jsonBody(req) {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      const body = JSON.parse(req.body);
      return body && typeof body === "object" && !Array.isArray(body) ? body : null;
    } catch {
      return null;
    }
  }
  return null;
}

function configuredFormspreeEndpoint() {
  const isLocalDevelopment = process.env.NODE_ENV !== "production"
    && process.env.NODE_ENV !== "test";
  const value = String(
    process.env.FORMSPREE_ENDPOINT || (isLocalDevelopment ? LOCAL_FORMSPREE_ENDPOINT : "")
  ).trim();
  try {
    const endpoint = new URL(value);
    return endpoint.protocol === "https:"
      && endpoint.hostname === "formspree.io"
      && /^\/f\/[a-zA-Z0-9]+$/.test(endpoint.pathname)
      ? endpoint.toString()
      : "";
  } catch {
    return "";
  }
}

function consumeLocalRateLimit(ip, now = Date.now()) {
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const recent = (localContactSubmissions.get(ip) || []).filter((timestamp) => timestamp > dayAgo);
  if (recent.length >= 5) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((recent[0] + 24 * 60 * 60 * 1000 - now) / 1000)),
    };
  }

  const latestSubmission = recent[recent.length - 1];
  if (latestSubmission && latestSubmission > now - CONTACT_COOLDOWN_MS) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((latestSubmission + CONTACT_COOLDOWN_MS - now) / 1000)),
    };
  }

  if (!localContactSubmissions.has(ip) && localContactSubmissions.size >= MAX_LOCAL_RATE_LIMIT_IPS) {
    return { allowed: false, retryAfter: CONTACT_COOLDOWN_SECONDS };
  }

  localContactSubmissions.set(ip, [...recent, now]);
  if (Math.random() < 0.02) {
    for (const [address, timestamps] of localContactSubmissions) {
      const active = timestamps.filter((timestamp) => timestamp > dayAgo);
      if (active.length) localContactSubmissions.set(address, active);
      else localContactSubmissions.delete(address);
    }
  }
  return { allowed: true };
}

module.exports = async function contactHandler(req, res) {
  if (req.method !== "POST") {
    return respond(res, 405, { error: "Use POST to send a support request." }, { Allow: "POST" });
  }

  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return respond(res, 413, { error: "Your message is too large. Please shorten it and try again." });
  }
  if (!String(req.headers["content-type"] || "").toLowerCase().includes("application/json")) {
    return respond(res, 415, { error: "This request could not be read. Please reload the page and try again." });
  }

  const body = jsonBody(req);
  if (!body) {
    return respond(res, 400, { error: "Your message could not be read. Please check the form and try again." });
  }
  if (typeof body.website === "string" && body.website.trim()) {
    return respond(res, 200, { ok: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (name.length > 100 || email.length > 254 || !EMAIL_PATTERN.test(email)
    || !TOPICS.has(topic) || message.length < 10 || message.length > 3000) {
    return respond(res, 400, { error: "Please check your email, topic, and message, then try again." });
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const formspreeEndpoint = configuredFormspreeEndpoint();
  const clientIp = validIp(getClientIp(req));
  if (!formspreeEndpoint || !clientIp) {
    console.error("Contact form is missing server configuration or a valid client IP.");
    return respond(res, 503, {
      error: "Support messages are temporarily unavailable. Please try again later.",
    });
  }

  const isLocalDevelopment = process.env.NODE_ENV !== "production"
    && process.env.NODE_ENV !== "test";
  let rateLimit;
  if (!supabaseUrl || !serviceRoleKey) {
    if (!isLocalDevelopment) {
      console.error("Contact form server-side rate-limit configuration is missing.");
      return respond(res, 503, {
        error: "Support messages are temporarily unavailable. Please try again later.",
      });
    }
    rateLimit = consumeLocalRateLimit(clientIp);
  } else {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/draftix_consume_contact_rate_limit`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_ip: clientIp }),
      });
      if (!response.ok) {
        console.error(`Contact rate-limit check failed with status ${response.status}.`);
        return respond(res, 503, {
          error: "We couldn’t verify the message limit. Please try again later.",
        });
      }
      rateLimit = await response.json();
    } catch (error) {
      console.error("Contact rate-limit service is unavailable.", error);
      return respond(res, 503, {
        error: "We couldn’t verify the message limit. Please try again later.",
      });
    }
  }

  if (typeof rateLimit?.allowed !== "boolean") {
    console.error("Contact rate-limit service returned an invalid response.");
    return respond(res, 503, {
      error: "We couldn’t verify the message limit. Please try again later.",
    });
  }
  if (!rateLimit.allowed) {
    const retryAfter = Math.max(1, Math.ceil(Number(rateLimit?.retryAfter) || 60));
    return respond(res, 429, {
      error: "You’ve reached the message limit. Please try again later.",
      retryAfter,
    }, { "Retry-After": String(retryAfter) });
  }

  try {
    const response = await fetch(formspreeEndpoint, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        _subject: "New Draftix support request",
        name,
        email,
        topic,
        message,
      }),
    });
    if (!response.ok) {
      console.error(`Contact delivery provider failed with status ${response.status}.`);
      if (response.status === 429) {
        return respond(res, 429, {
          error: "The contact service is receiving too many requests. Please try again later.",
          retryAfter: 60,
        }, { "Retry-After": "60" });
      }
      return respond(res, 502, {
        error: "Your message could not be delivered. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Contact delivery provider is unavailable.", error);
    return respond(res, 502, {
      error: "We couldn’t reach the contact service. Please try again later.",
    });
  }

  return respond(res, 200, { ok: true });
};
