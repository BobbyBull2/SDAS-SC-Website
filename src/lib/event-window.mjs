// All-day feed dates are civil dates, not UTC instants. Use the site's displayed zone.
export function calendarDay(now) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
function validDay(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
export function eventState(event, now = new Date()) {
  if (!event || !Number.isFinite(now.getTime())) return 'invalid';
  let start, end, current;
  if (event.allDay) {
    if (!validDay(event.start) || !validDay(event.end)) return 'invalid';
    start=event.start;end=event.end;current=calendarDay(now);
  } else {
    if (![event.start,event.end].every(v=>typeof v==='string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v))) return 'invalid';
    start=Date.parse(event.start);end=Date.parse(event.end);current=now.getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 'invalid';
  }
  if (end <= start) return 'invalid';
  if (current >= end) return 'expired';
  return current < start ? 'upcoming' : 'ongoing';
}
export function visibleEvent(event, now = new Date()) {
  return ['upcoming','ongoing'].includes(eventState(event,now));
}
// Keep a finished timed event visible for the remainder of its end day in Chicago.
export function completedToday(event, now = new Date()) {
  if (!event || event.allDay || eventState(event, now) !== 'expired') return false;
  return calendarDay(new Date(event.end)) === calendarDay(now);
}
export function dateRange(event) {
  if (!event.allDay) return '';
  const start=new Date(event.start+'T12:00:00Z');
  const end=new Date(Date.parse(event.end+'T12:00:00Z')-86400000);
  const format=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
  return format(start)===format(end)?format(start):`${format(start)} – ${format(end)}`;
}
