// Browser-side calendar reader: consume the same continuously updated ICS that phone subscribers use.
// No Cloudflare rebuild is needed when the calendar GitHub Action changes the feed.
import { parseCalendar } from '../../scripts/calendar.mjs';

export const LIVE_CALENDAR_URL = 'https://raw.githubusercontent.com/BobbyBull2/SDAS-SC-Calendar/main/star-citizen-events.ics';

export async function fetchLiveCalendar({ fetcher = fetch, now = new Date() } = {}) {
  const response = await fetcher(LIVE_CALENDAR_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Calendar feed HTTP ${response.status}`);
  const ics = await response.text();
  if (ics.length > 2_000_000) throw new Error('Calendar feed exceeds size limit');
  const events = parseCalendar(ics, now);
  return { source: LIVE_CALENDAR_URL, fetchedAt: new Date().toISOString(), events };
}
