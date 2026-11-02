export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    csrf?: string;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const response = await fetch(`/api/admin/v1${path}`, {
    method: options.method || "GET",
    credentials: "same-origin",
    signal: options.signal,
    headers: {
      Accept: "application/json",
      ...(options.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.csrf ? { "X-CSRF-Token": options.csrf } : {}),
    },
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    if (
      response.status === 401 &&
      ![
        "/auth/login",
        "/auth/verify",
        "/auth/activate",
        "/auth/session",
      ].includes(path)
    )
      window.dispatchEvent(new Event("gilo-session-expired"));
    throw new ApiError(
      result?.message ||
        "Unable to reach Gilo Admin. Check the API connection and try again.",
      response.status,
    );
  }
  if (options.method === "POST" && (
    /^\/support-tickets\/[^/]+\/(response|assignment|follow-up|acknowledge|priority)$/.test(path) ||
    ["/support-response-policy", "/support-escalation-policy"].includes(path)
  )) window.dispatchEvent(new Event("gilo-support-alerts-changed"));
  return result.data as T;
}
