import ICAL from 'ical.js';
import { visibleEvent, completedToday, calendarDay } from '../src/lib/event-window.mjs';
export function parseCalendar(text, now = new Date()) {
  if (!text.trim().startsWith('BEGIN:VCALENDAR') || !text.trim().endsWith('END:VCALENDAR')) throw new Error('Invalid calendar envelope');
  const root = new ICAL.Component(ICAL.parse(text));
  for (const zone of root.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(new ICAL.Timezone(zone));
  const until = new Date(now.getTime() + 180 * 86400000);
  const results = new Map();
  const components = root.getAllSubcomponents('vevent');
  const exceptions = components.filter(c => c.hasProperty('recurrence-id'));
  for (const component of components.filter(c => !c.hasProperty('recurrence-id'))) {
    if (component.getFirstPropertyValue('status') === 'CANCELLED') continue;
    const event = new ICAL.Event(component);
    for (const exception of exceptions.filter(c => c.getFirstPropertyValue('uid') === event.uid)) event.relateException(new ICAL.Event(exception));
    if (!event.uid || !event.startDate || !event.summary) throw new Error('Incomplete calendar event');
    const append = (start, end, item = event) => {
      if (item.component.getFirstPropertyValue('status') === 'CANCELLED') return;
      const sd = start.toJSDate(), ed = end.toJSDate();
      if (start.isDate ? start.toString() > calendarDay(until) : sd > until) return;
      const url = item.component.getFirstPropertyValue('url');
      const safeUrl = typeof url === 'string' && /^https:\/\//i.test(url) ? url : null;
      const entry = { id: `${event.uid}:${start.toString()}`, title: item.summary, start: start.isDate ? start.toString() : sd.toISOString(), end: end.isDate ? end.toString() : ed.toISOString(), allDay: start.isDate, url: safeUrl, description: item.description || '' };
      if (visibleEvent(entry,now) || completedToday(entry,now)) results.set(entry.id, entry);
    };
    if (event.isRecurring()) {
      const iterator = event.iterator();
      let occurrence, count = 0;
      while ((occurrence = iterator.next())) {
        if (++count > 20000) throw new Error('Recurrence limit exceeded');
        if (occurrence.toJSDate() > until) break;
        const details = event.getOccurrenceDetails(occurrence);
        append(details.startDate, details.endDate, details.item);
      }
    } else append(event.startDate, event.endDate);
  }
  return [...results.values()].sort((a,b) => a.start.localeCompare(b.start));
}
