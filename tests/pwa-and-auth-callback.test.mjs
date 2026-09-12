import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("ships installable PWA assets without caching game or auth APIs", async () => {
  const [manifest, worker] = await Promise.all([
    readFile(path.join(root, "app/manifest.ts"), "utf8"),
    readFile(path.join(root, "public/sw.js"), "utf8"),
  ]);
  assert.match(manifest, /display:\s*"standalone"/);
  assert.match(manifest, /hiddentify-icon-192\.png/);
  assert.match(manifest, /purpose:\s*"maskable"/);
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(worker, /url\.pathname\.startsWith\("\/auth\/"\)/);
});

test("routes email and Google confirmation through the Hiddentify callback", async () => {
  const [home, callback, reset] = await Promise.all([
    readFile(path.join(root, "app/page.tsx"), "utf8"),
    readFile(path.join(root, "app/auth/callback/page.tsx"), "utf8"),
    readFile(path.join(root, "app/reset-password/page.tsx"), "utf8"),
  ]);
  assert.match(home, /new URL\("\/auth\/callback",location\.origin\)/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /getSession/);
  assert.match(reset, /exchangeCodeForSession/);
});
