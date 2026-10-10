export type LiveCalendarEvent = {
  id: string; title: string; start: string; end: string; allDay: boolean;
  url: string | null; description: string;
};
export type LiveCalendarFeed = {
  source: string; fetchedAt: string; events: LiveCalendarEvent[];
};
export const LIVE_CALENDAR_URL: string;
export function fetchLiveCalendar(options?: {
  fetcher?: (url: string, options: RequestInit) => Promise<Response>;
  now?: Date;
}): Promise<LiveCalendarFeed>;
