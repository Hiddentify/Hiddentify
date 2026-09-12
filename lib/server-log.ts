type LogDetails = Record<string, string | number | boolean | null | undefined>;

function errorDetails(error: unknown): LogDetails {
  if (!(error instanceof Error)) return { error: String(error) };
  const withCode = error as Error & { code?: unknown };
  return {
    error: error.message,
    errorName: error.name,
    errorCode: typeof withCode.code === "string" ? withCode.code : undefined,
  };
}

export function logServerError(event: string, error: unknown, request?: Request, details: LogDetails = {}) {
  let path: string | undefined;
  try { path = request ? new URL(request.url).pathname : undefined; } catch {}
  console.error(JSON.stringify({
    time: new Date().toISOString(),
    level: "error",
    service: "app",
    event,
    requestId: request?.headers.get("x-request-id") ?? undefined,
    method: request?.method,
    path,
    ...details,
    ...errorDetails(error),
  }));
}

export function isUniqueViolation(error: unknown) {
  const withCode = error as { code?: unknown } | null;
  const message = error instanceof Error ? error.message : String(error);
  return withCode?.code === "23505" || /unique constraint|duplicate key/i.test(message);
}

export function databaseErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("hiddentify_room_capacity_reached")) return "capacity";
  if (message.includes("hiddentify_room_already_started")) return "started";
  return null;
}
