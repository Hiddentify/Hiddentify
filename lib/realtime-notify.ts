const DEFAULT_TIMEOUT_MS = 900;

export async function notifyRoomChanged(code: string) {
  const gateway = process.env.REALTIME_INTERNAL_URL?.trim();
  const secret = process.env.REALTIME_SECRET?.trim();
  if (!gateway || !secret) return;

  try {
    await fetch(`${gateway.replace(/\/$/, "")}/publish`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-realtime-secret": secret,
      },
      body: JSON.stringify({ code }),
      cache: "no-store",
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch {
    // Realtime fan-out is best effort. The write has already succeeded in Postgres,
    // and clients keep a low-frequency fallback refresh loop.
  }
}
