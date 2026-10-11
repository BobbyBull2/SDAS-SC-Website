// Read-only public news data. React renders text as text (never HTML).
// Discord posting will later produce this shape in a separate approved publishing workflow.
const IMAGE_RE = /^https:\/\/bobbybull2\.github\.io\/SDAS-SC-Calendar\/org-news\/images\/[0-9]{17,20}\.webp$/;
const MESSAGE_RE = /^https:\/\/discord\.com\/channels\/\d{17,20}\/\d{17,20}\/\d{17,20}$/;
export function parseOrgNews(raw) {
  if (!raw || raw.schemaVersion !== 1 || !['demo','live'].includes(raw.mode) || !Array.isArray(raw.items)) {
    throw new Error('Invalid org news feed');
  }
  const ids = new Set();
  const items = raw.items.slice(-10).filter((item) => {
    if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(item.id) || ids.has(item.id)) return false;
    if (typeof item.title !== 'string' || !item.title.trim() || item.title.length > 120) return false;
    if (typeof item.body !== 'string' || !item.body.trim() || item.body.length > 700) return false;
    if (item.discordUrl != null && (typeof item.discordUrl !== 'string' || !MESSAGE_RE.test(item.discordUrl))) return false;
    if (item.publishedAt != null && (typeof item.publishedAt !== 'string' || !Number.isFinite(Date.parse(item.publishedAt)))) return false;
    if (item.imageUrl != null && (typeof item.imageUrl !== 'string' || !IMAGE_RE.test(item.imageUrl))) return false;
    if (item.imageAlt != null && (typeof item.imageAlt !== 'string' || item.imageAlt.length > 180)) return false;
    ids.add(item.id);
    return true;
  });
  return { mode: raw.mode, items };
}

/** The publisher keeps the last ten in FIFO order; render newest at the left. */
export function newestNewsFirst(items) {
  if (!Array.isArray(items)) return [];
  const epoch = item => {
    const parsed = Date.parse(item?.publishedAt || '');
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return [...items].sort((a, b) => epoch(b) - epoch(a)).slice(0, 10);
}
