import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLiveCalendar, LIVE_CALENDAR_URL } from '../src/lib/live-calendar.mjs';

test('new Discord scheduled event appears in browser live feed without rebuilding website snapshot',async()=>{
  const content = ['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT',
    'UID:discord-new-test@sdas-star-citizen',
    'DTSTART:20261010T120000Z','DTEND:20261010T160000Z',
    'SUMMARY:[SDAS] RSI Discovery Event',
    'URL:https://discord.com/events/1518410019249459236/1558306913425293354',
    'END:VEVENT','END:VCALENDAR'].join('\r\n');
  let requested;
  const result = await fetchLiveCalendar({
    now:new Date('2026-10-10T11:00:00Z'),
    fetcher:async(url,opts)=>{requested={url,opts};return {ok:true,text:async()=>content}},
  });
  assert.equal(requested.url,LIVE_CALENDAR_URL);
  assert.equal(requested.opts.cache,'no-store');
  assert.equal(result.events.length,1);
  assert.equal(result.events[0].title,'[SDAS] RSI Discovery Event');
  assert.equal(result.events[0].url,'https://discord.com/events/1518410019249459236/1558306913425293354');
});
test('a failure fetching live calendar throws, leaving website snapshot as fallback',async()=>{
  await assert.rejects(fetchLiveCalendar({fetcher:async()=>({ok:false,status:503})}),/HTTP 503/);
});
