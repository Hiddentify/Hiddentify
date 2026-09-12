import { getRawDb } from "@/db";
import { noStoreHeaders } from "@/lib/game-server";

export const runtime = "nodejs";

export async function GET() {
  const authentication = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
  );
  let database = false;
  let schema = false;
  let realtime = false;
  let redis: boolean | "disabled" = "disabled";

  try {
    const row = await getRawDb().prepare("SELECT 1 AS ok").first<{ ok: number }>();
    database = Number(row?.ok ?? 0) === 1;
    const tables = await getRawDb().prepare("SELECT (to_regclass('public.game_sessions') IS NOT NULL AND to_regclass('public.players') IS NOT NULL AND to_regclass('public.accounts') IS NOT NULL) AS ok").first<{ ok: boolean }>();
    schema = tables?.ok === true;
  } catch {}

  const gateway = process.env.REALTIME_INTERNAL_URL?.trim();
  if (gateway) {
    try {
      const response = await fetch(`${gateway.replace(/\/$/, "")}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      const state = await response.json().catch(() => null) as { redis?: boolean | "disabled" } | null;
      realtime = response.ok;
      redis = state?.redis ?? false;
    } catch {}
  }

  const ok = authentication && database && schema && (gateway ? realtime && redis === true : true);
  return Response.json({
    status: ok ? "ok" : "degraded",
    authentication,
    database,
    schema,
    realtime: gateway ? realtime : "disabled",
    redis: gateway ? redis : "disabled",
    timestamp: new Date().toISOString(),
  }, { status: ok ? 200 : 503, headers: noStoreHeaders });
}
