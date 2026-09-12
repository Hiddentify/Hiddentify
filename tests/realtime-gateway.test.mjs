import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { once } from "node:events";
import test from "node:test";

function ticket(secret, room, playerId) {
  const payload = Buffer.from(JSON.stringify({ room, playerId, exp: Date.now() + 60_000 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

async function waitForHealth(url) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Realtime gateway did not become healthy.");
}

test("authenticates SSE clients and fans out room changes", async () => {
  const port = 31000 + (process.pid % 1000);
  const secret = "test-secret-that-is-long-enough-for-hmac-validation";
  const child = spawn(process.execPath, ["realtime-gateway/server.mjs"], {
    env: { ...process.env, PORT: String(port), REALTIME_SECRET: secret, REDIS_URL: "", ALLOWED_ORIGINS: "https://staging.hiddentify.space" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const health = await waitForHealth(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, "ok");
    assert.equal(health.redis, "disabled");

    const controller = new AbortController();
    const rejected = await fetch(`http://127.0.0.1:${port}/events?ticket=${encodeURIComponent(ticket(secret, "ABCDE", "blocked-player"))}`, { headers: { Origin: "https://attacker.example" } });
    assert.equal(rejected.status, 403);

    const response = await fetch(`http://127.0.0.1:${port}/events?ticket=${encodeURIComponent(ticket(secret, "ABCDE", "player-1"))}`, { headers: { Origin: "https://staging.hiddentify.space" }, signal: controller.signal });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), "https://staging.hiddentify.space");
    const reader = response.body.getReader();
    await reader.read();

    const published = await fetch(`http://127.0.0.1:${port}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-realtime-secret": secret },
      body: JSON.stringify({ code: "ABCDE" }),
    });
    assert.equal(published.status, 202);

    const { value } = await reader.read();
    assert.match(Buffer.from(value).toString("utf8"), /event: room_changed/);
    controller.abort();
  } finally {
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 1000))]);
  }
});
