// Read-only public news data. React renders text as text (never HTML).
// Discord posting will later produce this shape in a separate approved publishing workflow.
const MESSAGE_RE = /^https:\/\/discord\.com\/channels\/\d{17,20}\/\d{17,20}\/\d{17,20}$/;
export function parseOrgNews(raw) {
  if (!raw || raw.schemaVersion !== 1 || !['demo','live'].includes(raw.mode) || !Array.isArray(raw.items)) {
    throw new Error('Invalid org news feed');
  }
  const ids = new Set();
  const items = raw.items.slice(0,12).filter((item) => {
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(item.id) || ids.has(item.id)) return false;
    if (typeof item.title !== 'string' || !item.title.trim() || item.title.length > 120) return false;
    if (typeof item.body !== 'string' || !item.body.trim() || item.body.length > 700) return false;
    if (item.discordUrl != null && (typeof item.discordUrl !== 'string' || !MESSAGE_RE.test(item.discordUrl))) return false;
    if (item.publishedAt != null && (typeof item.publishedAt !== 'string' || !Number.isFinite(Date.parse(item.publishedAt)))) return false;
    ids.add(item.id);
    return true;
  });
  return { mode: raw.mode, items };
}
