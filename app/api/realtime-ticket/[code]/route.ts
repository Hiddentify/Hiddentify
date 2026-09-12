import { createHmac, randomUUID } from "node:crypto";
import { authenticate, cleanCode, noStoreHeaders } from "@/lib/game-server";

export const runtime = "nodejs";

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = cleanCode((await params).code);
  const token = request.headers.get("x-player-token") ?? "";
  const secret = process.env.REALTIME_SECRET?.trim();

  if (!secret) {
    return Response.json({ error: "Realtime is not configured." }, { status: 503, headers: noStoreHeaders });
  }

  const auth = await authenticate(code, token);
  if (!auth) {
    return Response.json({ error: "Your player session is not valid." }, { status: 401, headers: noStoreHeaders });
  }

  const expiresAt = Date.now() + 30 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({
    room: auth.session.code,
    playerId: auth.player.id,
    exp: expiresAt,
    jti: randomUUID(),
  })).toString("base64url");
  const ticket = `${payload}.${sign(payload, secret)}`;
  const path = `/events?ticket=${encodeURIComponent(ticket)}`;
  const publicBase = process.env.NEXT_PUBLIC_REALTIME_URL?.trim()?.replace(/\/$/, "");

  return Response.json({
    ticket,
    path: publicBase ? path : `/realtime${path}`,
    url: publicBase ? `${publicBase}${path}` : undefined,
    expiresAt: new Date(expiresAt).toISOString(),
  }, { headers: noStoreHeaders });
}
