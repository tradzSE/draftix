const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const { chromium } = require("playwright");
const { delay, startServer } = require("./helpers");

const root = process.cwd();
const supabaseUrl = "https://smoke.supabase.test";

async function availablePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function startVite(port, env) {
  const child = spawn(
    process.execPath,
    [path.join(root, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Vite exited before becoming ready (${child.exitCode})\n${output}`);
    try {
      const response = await fetch(url);
      if (response.ok) return { child, url };
    } catch {}
    await delay(100);
  }
  child.kill();
  throw new Error(`Timed out waiting for Vite\n${output}`);
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(3000),
  ]);
}

async function chooseMap(pages) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    for (const page of pages) {
      const button = page.locator(".dx-selection-grid.is-maps button:not(:disabled)").first();
      if (await button.count() && await button.isEnabled()) {
        await button.click();
        return;
      }
    }
    await delay(50);
  }
  throw new Error("No captain could choose a map during the veto.");
}

async function banAgent(pages, name) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    for (const page of pages) {
      const select = page.getByRole("button", { name: `Select ${name}`, exact: true });
      if (await select.count()) await select.click();
      const ban = page.getByRole("button", { name: `Ban ${name}`, exact: true });
      if (await ban.count() && await ban.isEnabled()) {
        await ban.click();
        return;
      }
    }
    await delay(50);
  }
  throw new Error(`No captain could ban ${name}.`);
}

function tournamentState() {
  const teams = Array.from({ length: 8 }, (_, index) => ({
    id: `smoke-team-${index + 1}`,
    name: `Entrant ${index + 1}`,
    seed: index + 1,
  }));
  const matches = Array.from({ length: 7 }, (_, index) => {
    const round = index < 4 ? 1 : index < 6 ? 2 : 3;
    const position = index < 4 ? index + 1 : index < 6 ? index - 3 : 1;
    const firstRound = round === 1;
    const finalRound = round === 3;
    return {
      id: `smoke-match-${index + 1}`,
      round,
      position,
      teamAId: firstRound ? teams[index * 2].id : null,
      teamBId: firstRound ? teams[index * 2 + 1].id : null,
      scoreA: null,
      scoreB: null,
      winnerTeamId: null,
      nextMatchId: finalRound ? null : `smoke-match-${round === 1 ? 5 + Math.floor(index / 2) : 7}`,
    };
  });
  return {
    slug: "smoke-cup",
    name: "Smoke Cup",
    activity: "General",
    format: "single_elimination",
    teamCount: 8,
    bestOf: 3,
    status: "pending",
    createdAt: new Date().toISOString(),
    totalRounds: 3,
    canManage: true,
    teams,
    matches,
    championTeamId: null,
    standings: [],
  };
}

async function mockSupabase(page) {
  const rpcCalls = [];
  await page.route(`${supabaseUrl}/**`, async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname === "/auth/v1/signup") {
      const user = {
        id: "00000000-0000-4000-8000-000000000001",
        aud: "authenticated",
        role: "authenticated",
        app_metadata: { provider: "anonymous", providers: [] },
        user_metadata: {},
        identities: [],
        created_at: new Date().toISOString(),
      };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "smoke-access-token",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "smoke-refresh-token",
          user,
        }),
      });
    }
    if (requestUrl.pathname.startsWith("/rest/v1/rpc/")) {
      const rpcName = requestUrl.pathname.split("/").pop();
      rpcCalls.push(rpcName);
      const body = rpcName === "draftix_create_tournament_with_activity"
        ? { slug: "smoke-cup", organizerToken: "smoke-organizer-token" }
        : rpcName === "draftix_tournament_state"
          ? tournamentState()
          : null;
      if (body === null) {
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ message: `Unexpected smoke-test RPC: ${rpcName}` }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    }
    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: `Unexpected smoke-test request: ${requestUrl.pathname}` }),
    });
  });
  return rpcCalls;
}

async function runDraftSmoke(browser, baseUrl) {
  const host = await browser.newPage();
  const guest = await browser.newPage();
  try {
    await host.goto(`${baseUrl}/draft`, { waitUntil: "domcontentloaded" });
    await host.getByPlaceholder("Player name").fill("Smoke Host");
    await host.getByRole("button", { name: "Create a room" }).click();
    await host.locator(".dx-lobby").waitFor();
    const code = await host.locator(".dx-room-code strong").innerText();
    assert.ok(code, "The local draft server should create a room code.");

    await host.locator(".dx-team-a").getByRole("button", { name: "Claim captain" }).click();
    await guest.goto(`${baseUrl}/draft?code=${encodeURIComponent(code)}`, { waitUntil: "domcontentloaded" });
    await guest.getByPlaceholder("Player name").fill("Smoke Guest");
    await guest.getByRole("button", { name: "Join room" }).click();
    await guest.locator(".dx-lobby").waitFor();
    await guest.locator(".dx-team-b").getByRole("button", { name: "Claim captain" }).click();

    await host.getByRole("spinbutton", { name: "Agent bans" }).fill("2");
    await host.getByLabel("Side selection").uncheck();
    await host.locator(".dx-settings-grid select").nth(1).selectOption("60000");
    await host.getByRole("button", { name: "Save draft rule changes" }).click();
    await host.getByRole("button", { name: "Launch map veto" }).click();
    try {
      await host.locator(".dx-selection-grid.is-maps").waitFor({ timeout: 10_000 });
    } catch {
      throw new Error(`Map veto did not start after launch:\n${(await host.locator("body").innerText()).slice(0, 2500)}`);
    }
    await chooseMap([host, guest]);
    await chooseMap([host, guest]);

    await host.locator(".dx-agent-roster").waitFor();
    await guest.locator(".dx-agent-roster").waitFor();
    await host.getByRole("button", { name: "Select Hush", exact: true }).waitFor();
    await banAgent([host, guest], "Hush");
    await host.getByRole("button", { name: "Hush, banned", exact: true }).waitFor();
    await guest.getByRole("button", { name: "Hush, banned", exact: true }).waitFor();
  } finally {
    await host.close();
    await guest.close();
  }
}

async function runBalancerSmoke(browser, baseUrl) {
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}/team-balance`, { waitUntil: "domcontentloaded" });
    await page.getByRole("textbox", { name: "Player 1 name" }).fill("Smoke Player 1");
    await page.getByRole("textbox", { name: "Player 2 name" }).fill("Smoke Player 2");
    await page.locator(".tb-rank-select summary").first().click();
    await page.locator(".tb-row").first().locator('.tb-rank-menu [role="option"]').filter({ hasText: /^Unranked$/ }).click();
    assert.match(
      await page.locator(".tb-rank-select summary").first().innerText(),
      /Unranked/,
      "The custom rank picker should update the selected rank.",
    );

    const startedAt = Date.now();
    await page.getByRole("button", { name: "Split teams" }).click();
    await page.getByText("Building your teams...", { exact: true }).waitFor();
    await page.getByRole("heading", { name: "Teams are locked." }).waitFor({ timeout: 12_000 });
    assert.ok(Date.now() - startedAt >= 6500, "The balancing sequence should last about seven seconds.");
    await page.getByRole("button", { name: "Close team results" }).click();
    await page.getByRole("button", { name: "View last result" }).click();
    await page.getByRole("heading", { name: "Teams are locked." }).waitFor();
  } finally {
    await page.close();
  }
}

async function runBracketSmoke(browser, baseUrl) {
  const page = await browser.newPage();
  const rpcCalls = await mockSupabase(page);
  try {
    await page.goto(`${baseUrl}/tournaments`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("Tournament name").fill("Smoke Cup");
    await page.locator(".tournament-form").getByRole("button", { name: /Create tournament/ }).click();
    await page.locator(".tournament-view-page").waitFor({ timeout: 15_000 });
    await page.getByRole("heading", { name: "Bracket", exact: true }).waitFor();
    await page.getByText("Smoke Cup", { exact: true }).first().waitFor();
    assert.ok(rpcCalls.includes("draftix_create_tournament_with_activity"), "Bracket creation should call the mocked RPC.");
    assert.ok(rpcCalls.includes("draftix_tournament_state"), "The created bracket should load through the mocked RPC.");
  } finally {
    await page.close();
  }
}

async function main() {
  let server;
  let fallbackVite;
  let tournamentVite;
  let browser;
  try {
    server = await startServer(await availablePort(), {
      TURN_TIMEOUT_MS: "60000",
      RECONNECT_GRACE_MS: "10000",
    });
    fallbackVite = await startVite(await availablePort(), {
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_PUBLISHABLE_KEY: "",
      VITE_SOCKET_URL: server.baseUrl,
    });
    tournamentVite = await startVite(await availablePort(), {
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: "smoke-test-public-key",
      VITE_SOCKET_URL: "",
    });
    browser = await chromium.launch({ headless: true });
    await runDraftSmoke(browser, fallbackVite.url);
    console.log("PASS draft room, map veto, and Hush agent ban");
    await runBalancerSmoke(browser, fallbackVite.url);
    console.log("PASS team balancer rank picker, results, and seven-second sequence");
    await runBracketSmoke(browser, tournamentVite.url);
    console.log("PASS bracket creation with mocked Supabase responses");
  } finally {
    if (browser) await browser.close();
    await stopChild(tournamentVite?.child);
    await stopChild(fallbackVite?.child);
    await server?.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
