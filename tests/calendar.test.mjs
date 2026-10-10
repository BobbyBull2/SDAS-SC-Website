import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCalendar} from '../scripts/calendar.mjs';
const wrap=s=>`BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${s}\r\nEND:VCALENDAR`;
const event=s=>`BEGIN:VEVENT\r\nUID:test@sdas\r\nSUMMARY:Real fixture\r\n${s}\r\nEND:VEVENT`;
test('all-day ongoing events retain dates and exclusive end',()=>{const r=parseCalendar(wrap(event('DTSTART;VALUE=DATE:20261001\r\nDTEND;VALUE=DATE:20261101')),new Date('2026-10-08T12:00:00Z'));assert.equal(r.length,1);assert.equal(r[0].start,'2026-10-01');assert.equal(r[0].allDay,true)});
test('expired and cancelled entries excluded',()=>{assert.equal(parseCalendar(wrap(event('DTSTART:20261001T180000Z\r\nDTEND:20261001T190000Z')),new Date('2026-10-08')).length,0);assert.equal(parseCalendar(wrap(event('DTSTART:20261009T180000Z\r\nDTEND:20261009T190000Z\r\nSTATUS:CANCELLED')),new Date('2026-10-08')).length,0)});
test('recurrence respects exclusion and unsafe URLs are dropped',()=>{const r=parseCalendar(wrap(event('DTSTART:20261009T180000Z\r\nDTEND:20261009T190000Z\r\nRRULE:FREQ=DAILY;COUNT=3\r\nEXDATE:20261010T180000Z\r\nURL:javascript:alert(1)')),new Date('2026-10-08'));assert.equal(r.length,2);assert.equal(r[1].start,'2026-10-11T18:00:00.000Z');assert.equal(r[0].url,null)});
test('invalid source rejected; empty calendar is valid',()=>{assert.throws(()=>parseCalendar('<html>unavailable</html>'));assert.deepEqual(parseCalendar(wrap('')),[])});
test('Chicago DST display preserves evening for materialized UTC events',()=>{const before=new Date('2026-10-29T00:00:00Z');const after=new Date('2026-11-05T01:00:00Z');const fmt=d=>d.toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'});assert.equal(fmt(before),'7:00 PM');assert.equal(fmt(after),'7:00 PM')});

import {eventState,visibleEvent,completedToday,dateRange} from '../src/lib/event-window.mjs';
const vara={start:'2026-10-01',end:'2026-11-01',allDay:true};
test('Vara October window: upcoming, ongoing, final day and exclusive end in Chicago',()=>{
 assert.equal(eventState(vara,new Date('2026-09-30T23:00:00Z')),'upcoming');
 assert.equal(eventState(vara,new Date('2026-10-08T12:00:00Z')),'ongoing');
 assert.equal(eventState(vara,new Date('2026-11-01T04:59:59Z')),'ongoing');
 assert.equal(eventState(vara,new Date('2026-11-01T05:00:00Z')),'expired');
 assert.equal(visibleEvent(vara,new Date('2026-11-01T05:00:00Z')),false);
 assert.equal(dateRange(vara),'Oct 1 – Oct 31');
});
test('timed event start inclusive, end exclusive, timezone offsets respected',()=>{
 const e={start:'2026-10-08T19:00:00-05:00',end:'2026-10-08T20:00:00-05:00',allDay:false};
 assert.equal(eventState(e,new Date('2026-10-08T23:59:59Z')),'upcoming');
 assert.equal(eventState(e,new Date('2026-10-09T00:00:00Z')),'ongoing');
 assert.equal(eventState(e,new Date('2026-10-09T01:00:00Z')),'expired');
});
test('inverted, zero-duration, invalid dates and unzoned timestamps excluded',()=>{
 for (const e of [{...vara,end:'2026-09-01'},{...vara,end:vara.start},{...vara,start:'2026-02-31'},{allDay:false,start:'2026-10-08T19:00:00',end:'2026-10-08T20:00:00'},{...vara,end:'garbage'}]) assert.equal(visibleEvent(e,new Date('2026-10-08')),false);
});
test('ingestion keeps all-day entry through Chicago final evening, then removes it',()=>{
 const source=wrap(event('DTSTART;VALUE=DATE:20261001\r\nDTEND;VALUE=DATE:20261101'));
 assert.equal(parseCalendar(source,new Date('2026-11-01T04:59:59Z')).length,1);
 assert.equal(parseCalendar(source,new Date('2026-11-01T05:00:00Z')).length,0);
});

test('finished event remains visible through local midnight and disappears next day',()=>{
 const discovery=wrap(event('DTSTART:20261010T120000Z\r\nDTEND:20261010T160000Z'));
 const afterFinish=new Date('2026-10-10T19:53:00Z');
 const endOfDay=new Date('2026-10-11T04:59:59Z');
 const midnight=new Date('2026-10-11T05:00:00Z');
 assert.equal(parseCalendar(discovery,afterFinish).length,1);
 assert.equal(parseCalendar(discovery,endOfDay).length,1);
 assert.equal(parseCalendar(discovery,midnight).length,0);
 const evt=parseCalendar(discovery,afterFinish)[0];
 assert.equal(completedToday(evt,afterFinish),true);
 assert.equal(completedToday(evt,midnight),false);
});
