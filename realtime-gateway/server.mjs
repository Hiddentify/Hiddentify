import http from "node:http";
import net from "node:net";
import tls from "node:tls";
import { createHmac, timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.PORT || 4000);
const SECRET = process.env.REALTIME_SECRET || "";
const REDIS_URL = process.env.REDIS_URL || "";
const ALLOWED_ORIGINS = new Set((process.env.ALLOWED_ORIGINS || "https://hiddentify.space,https://staging.hiddentify.space")
  .split(",").map((value) => value.trim().replace(/\/$/, "")).filter(Boolean));
const CHANNEL = "hiddentify:room-events";
const clients = new Map();
const playerClients = new Map();
const MAX_CONNECTIONS_PER_PLAYER = 2;
let subscriber = null;
let publisher = null;
let redisConnected = false;

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function sign(payload) {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function verifyTicket(ticket) {
  if (!SECRET || !ticket || !ticket.includes(".")) return null;
  const [payload, signature] = ticket.split(".", 2);
  if (!safeEqual(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data?.room || !data?.playerId || !Number.isFinite(data?.exp) || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function writeSse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function log(level, event, details = {}) {
  const record = JSON.stringify({
    time: new Date().toISOString(),
    level,
    service: "realtime",
    event,
    ...details,
  });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(record);
}

function broadcast(code) {
  const set = clients.get(code);
  if (!set) return;
  const payload = { code, at: new Date().toISOString() };
  for (const res of [...set]) {
    try { writeSse(res, "room_changed", payload); }
    catch { set.delete(res); }
  }
  if (set.size === 0) clients.delete(code);
}

function redisCommand(...parts) {
  return `*${parts.length}\r\n${parts.map((part) => {
    const value = String(part);
    return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
  }).join("")}`;
}

function parseResp(buffer, start = 0) {
  if (start >= buffer.length) return null;
  const type = String.fromCharCode(buffer[start]);
  const lineEnd = buffer.indexOf("\r\n", start + 1);
  if (lineEnd < 0) return null;
  const line = buffer.subarray(start + 1, lineEnd).toString();
  let next = lineEnd + 2;
  if (type === "+" || type === "-" || type === ":") return { value: line, next };
  if (type === "$") {
    const length = Number(line);
    if (length < 0) return { value: null, next };
    if (buffer.length < next + length + 2) return null;
    const value = buffer.subarray(next, next + length).toString();
    return { value, next: next + length + 2 };
  }
  if (type === "*") {
    const count = Number(line);
    const values = [];
    for (let i = 0; i < count; i++) {
      const parsed = parseResp(buffer, next);
      if (!parsed) return null;
      values.push(parsed.value);
      next = parsed.next;
    }
    return { value: values, next };
  }
  return null;
}

function redisSocket(url) {
  const target = new URL(url);
  const port = Number(target.port || (target.protocol === "rediss:" ? 6380 : 6379));
  return target.protocol === "rediss:"
    ? tls.connect({ host: target.hostname, port, servername: target.hostname })
    : net.createConnection({ host: target.hostname, port });
}

function authenticateRedis(socket, target) {
  if (target.password) {
    const user = decodeURIComponent(target.username || "default");
    const password = decodeURIComponent(target.password);
    socket.write(redisCommand("AUTH", user, password));
  }
  const db = target.pathname?.slice(1);
  if (db && /^\d+$/.test(db) && db !== "0") socket.write(redisCommand("SELECT", db));
}

function connectRedisSubscriber() {
  if (!REDIS_URL) return;
  const target = new URL(REDIS_URL);
  const socket = redisSocket(REDIS_URL);
  subscriber = socket;
  let buffer = Buffer.alloc(0);
  socket.on("connect", () => {
    authenticateRedis(socket, target);
    socket.write(redisCommand("SUBSCRIBE", CHANNEL));
  });
  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length) {
      const parsed = parseResp(buffer);
      if (!parsed) break;
      buffer = buffer.subarray(parsed.next);
      const value = parsed.value;
      if (Array.isArray(value) && value[0] === "subscribe" && value[1] === CHANNEL) {
        redisConnected = true;
        log("info", "redis_subscriber_ready");
      } else if (Array.isArray(value) && value[0] === "message" && value[1] === CHANNEL) {
        try {
          const event = JSON.parse(value[2]);
          if (event?.code) broadcast(String(event.code));
        } catch {}
      }
    }
  });
  socket.on("error", (error) => {
    redisConnected = false;
    log("error", "redis_subscriber_error", { message: error.message });
  });
  socket.on("close", () => {
    redisConnected = false;
    if (subscriber === socket) subscriber = null;
    log("warn", "redis_subscriber_closed");
    setTimeout(connectRedisSubscriber, 1500).unref();
  });
}

function ensurePublisher() {
  if (!REDIS_URL) return null;
  if (publisher && !publisher.destroyed) return publisher;
  const target = new URL(REDIS_URL);
  const socket = redisSocket(REDIS_URL);
  publisher = socket;
  socket.on("connect", () => authenticateRedis(socket, target));
  socket.on("error", () => {});
  socket.on("close", () => { if (publisher === socket) publisher = null; });
  return socket;
}

function publish(code) {
  const payload = JSON.stringify({ code, at: Date.now() });
  if (!redisConnected) broadcast(code);
  const socket = ensurePublisher();
  if (!socket) {
    broadcast(code);
    return;
  }
  const send = () => {
    try { socket.write(redisCommand("PUBLISH", CHANNEL, payload)); }
    catch { broadcast(code); }
  };
  if (socket.readyState === "open") send();
  else socket.once("connect", send);
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(data),
    "cache-control": "no-store",
  });
  res.end(data);
}

function corsOrigin(req) {
  const origin = String(req.headers.origin || "").replace(/\/$/, "");
  if (!origin) return null;
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  if (process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return false;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    const redisHealthy = REDIS_URL ? redisConnected : true;
    return json(res, redisHealthy ? 200 : 503, { status: redisHealthy ? "ok" : "degraded", redis: REDIS_URL ? redisConnected : "disabled", clients: [...clients.values()].reduce((n, set) => n + set.size, 0) });
  }

  if (req.method === "GET" && url.pathname === "/events") {
    const allowedOrigin = corsOrigin(req);
    if (allowedOrigin === false) return json(res, 403, { error: "Origin is not allowed." });
    const rawTicket = url.searchParams.get("ticket") || "";
    if (rawTicket.length > 4096) return json(res, 400, { error: "Realtime ticket is too large." });
    const auth = verifyTicket(rawTicket);
    if (!auth) return json(res, 401, { error: "Invalid or expired realtime ticket." });
    const existing = playerClients.get(auth.playerId) || new Set();
    if (existing.size >= MAX_CONNECTIONS_PER_PLAYER) return json(res, 429, { error: "Too many realtime connections for this player." });
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "connection": "keep-alive",
      "x-accel-buffering": "no",
      ...(allowedOrigin ? { "access-control-allow-origin": allowedOrigin, "vary": "Origin" } : {}),
    });
    res.write(": connected\n\n");
    writeSse(res, "ready", { code: auth.room, expiresAt: auth.exp });
    const set = clients.get(auth.room) || new Set();
    set.add(res);
    clients.set(auth.room, set);
    existing.add(res);
    playerClients.set(auth.playerId, existing);
    const heartbeat = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 20000);
    const expiry = setTimeout(() => { try { res.end(); } catch {} }, Math.max(1, auth.exp - Date.now()));
    const close = () => {
      clearInterval(heartbeat);
      clearTimeout(expiry);
      const current = clients.get(auth.room);
      current?.delete(res);
      if (current?.size === 0) clients.delete(auth.room);
      const currentPlayer = playerClients.get(auth.playerId);
      currentPlayer?.delete(res);
      if (currentPlayer?.size === 0) playerClients.delete(auth.playerId);
    };
    req.on("close", close);
    req.on("error", close);
    return;
  }

  if (req.method === "POST" && url.pathname === "/publish") {
    if (!SECRET || !safeEqual(req.headers["x-realtime-secret"] || "", SECRET)) {
      return json(res, 401, { error: "Unauthorized." });
    }
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2048) req.destroy();
    });
    req.on("end", () => {
      try {
        const body = JSON.parse(raw || "{}");
        const code = String(body.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
        if (!code) return json(res, 400, { error: "Missing room code." });
        publish(code);
        return json(res, 202, { ok: true });
      } catch {
        return json(res, 400, { error: "Invalid JSON." });
      }
    });
    return;
  }

  return json(res, 404, { error: "Not found." });
});

if (!SECRET) log("warn", "missing_realtime_secret");
connectRedisSubscriber();
server.listen(PORT, "0.0.0.0", () => log("info", "gateway_started", { port: PORT, redisConfigured: Boolean(REDIS_URL) }));
