const assert = require("node:assert/strict");
const handler = require("../api/contact.js");

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  FORMSPREE_ENDPOINT: process.env.FORMSPREE_ENDPOINT,
};
const originalFetch = global.fetch;

function request(body, overrides = {}) {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": "203.0.113.8",
      "x-forwarded-for": "203.0.113.8",
    },
    body: {
      name: "Test User",
      email: "test@example.com",
      topic: "Website issue",
      message: "A sufficiently long test message.",
      website: "",
      ...body,
    },
    ...overrides,
  };
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

(async () => {
  process.env.NODE_ENV = "test";
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  process.env.FORMSPREE_ENDPOINT = "https://formspree.io/f/mpppbygj";

  try {
    let calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      if (url.includes("/rpc/draftix_consume_contact_rate_limit")) {
        return { ok: true, json: async () => ({ allowed: true }) };
      }
      return { ok: true };
    };

    let res = response();
    await handler(request(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(calls.length, 2);
    assert.equal(JSON.parse(calls[0].options.body).p_ip, "203.0.113.8");
    assert.equal(JSON.parse(calls[1].options.body).email, "test@example.com");
    assert.equal(calls[0].options.headers.Authorization, "Bearer test-service-role");

    calls = [];
    res = response();
    await handler(request({}, {
      headers: { "content-type": "application/json" },
      socket: { remoteAddress: "::1" },
    }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(calls[0].options.body).p_ip, "::1");

    calls = [];
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ allowed: false, retryAfter: 75 }),
    });
    res = response();
    await handler(request(), res);
    assert.equal(res.statusCode, 429);
    assert.equal(res.headers["Retry-After"], "75");

    calls = [];
    global.fetch = async () => {
      calls.push(true);
      return { ok: false, status: 500 };
    };
    res = response();
    await handler(request({ website: "spam" }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 0);

    res = response();
    await handler(request({}, { method: "GET" }), res);
    assert.equal(res.statusCode, 405);

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    res = response();
    await handler(request(), res);
    assert.equal(res.statusCode, 503);
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

    process.env.NODE_ENV = "development";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.FORMSPREE_ENDPOINT = "";
    let deliveryCalls = 0;
    global.fetch = async (url) => {
      deliveryCalls += 1;
      assert.equal(url, "https://formspree.io/f/mpppbygj");
      return { ok: true };
    };
    const localRequest = request({}, {
      headers: {
        "content-type": "application/json",
        "x-real-ip": "198.51.100.70",
      },
    });
    res = response();
    await handler(localRequest, res);
    assert.equal(res.statusCode, 200);
    res = response();
    await handler(localRequest, res);
    assert.equal(res.statusCode, 429);
    assert.equal(res.headers["Retry-After"], "600");
    assert.equal(deliveryCalls, 1);

    console.log("PASS contact API: delivery, IP throttling, honeypot, method, and fail-closed checks");
  } finally {
    global.fetch = originalFetch;
    for (const [name, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
