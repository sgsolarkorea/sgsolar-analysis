const UUID_RE = /^[0-9a-f-]{36}$/i;

export function parseBulkUuidIds(body: unknown): string[] | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as { ids?: unknown }).ids;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") return null;
    const trimmed = item.trim();
    if (!UUID_RE.test(trimmed)) return null;
    ids.push(trimmed);
  }
  return ids;
}
