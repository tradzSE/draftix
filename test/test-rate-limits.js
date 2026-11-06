const assert = require("node:assert/strict");
const { connect, emit, startServer } = require("./helpers");

(async () => {
  const server = await startServer(3393, {
    ADMIN_STATS_TOKEN: "test-admin-token-that-is-longer-than-24-characters",
    SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    FORMSPREE_ENDPOINT: "",
  });
  let client;
  let peer;
  let lengthTester;
  try {
    client = await connect(server.baseUrl);
    let currentRoom;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await emit(client, "createSession", { nickname: `Host ${attempt + 1}` });
      assert.equal(result.ok, true);
      currentRoom = result.code;
    }

    const blocked = await emit(client, "createSession", { nickname: "Spam" });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, "Rate limit — slow down.");

    const firstMessage = await emit(client, "chatMessage", { code: currentRoom, text: "First" });
    assert.equal(firstMessage.ok, true);

    // A second participant on the same network gets an independent cooldown.
    peer = await connect(server.baseUrl);
    const joined = await emit(peer, "joinSession", { code: currentRoom, nickname: "Peer" });
    assert.equal(joined.ok, true);
    const peerMessage = await emit(peer, "chatMessage", { code: currentRoom, text: "Peer first" });
    assert.equal(peerMessage.ok, true);

    const chatBlocked = await emit(client, "chatMessage", { code: currentRoom, text: "Too soon" });
    assert.equal(chatBlocked.ok, false);
    assert.equal(chatBlocked.error, "Rate limit — slow down.");
    const peerBlocked = await emit(peer, "chatMessage", { code: currentRoom, text: "Peer too soon" });
    assert.equal(peerBlocked.ok, false);
    assert.equal(peerBlocked.error, "Rate limit — slow down.");

    lengthTester = await connect(server.baseUrl);
    assert.equal((await emit(lengthTester, "joinSession", { code: currentRoom, nickname: "Length" })).ok, true);
    const tooLong = await emit(lengthTester, "chatMessage", { code: currentRoom, text: "x".repeat(101) });
    assert.equal(tooLong.ok, false);
    assert.equal(tooLong.error, "Messages are limited to 100 characters");

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await fetch(`${server.baseUrl}/api/admin/stats`, {
        headers: { Authorization: "Bearer incorrect-token" },
      });
      assert.equal(response.status, 401);
    }
    const adminBlocked = await fetch(`${server.baseUrl}/api/admin/stats`, {
      headers: { Authorization: "Bearer incorrect-token" },
    });
    assert.equal(adminBlocked.status, 429);
    assert.equal((await adminBlocked.json()).error, "Too many sign-in attempts. Try again in 15 minutes.");

    const contactResponse = await fetch(`${server.baseUrl}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        topic: "Website issue",
        message: "A sufficiently long test message.",
      }),
    });
    assert.equal(contactResponse.status, 503);
    assert.match(contactResponse.headers.get("content-type"), /application\/json/);
    assert.match((await contactResponse.json()).error, /temporarily unavailable/i);

    console.log("PASS rate limits: room creation, chat cooldown, and admin attempts are blocked");
  } finally {
    lengthTester?.disconnect();
    peer?.disconnect();
    client?.disconnect();
    await server.stop();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
