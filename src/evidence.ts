export async function fetchEvidence(
  kind: string,
  id: string,
  side: string,
  reason: string,
  revision: string,
  csrf: string,
  signal: AbortSignal,
): Promise<Blob> {
  const response = await fetch(
    `/api/admin/v1/verification/${encodeURIComponent(kind)}/${encodeURIComponent(id)}/media/${encodeURIComponent(side)}`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf,
        Accept: "image/webp",
      },
      body: JSON.stringify({ reason, revision }),
      signal,
    },
  );
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event("gilo-session-expired"));
    const body = await response.json().catch(() => null);
    throw Error(
      body?.message || "Evidence could not be opened. Please try again.",
    );
  }
  if (!response.headers.get("Content-Type")?.startsWith("image/webp"))
    throw Error("The evidence response was not a supported image.");
  return response.blob();
}
