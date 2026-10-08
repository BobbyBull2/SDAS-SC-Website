import { readFile, writeFile, rename } from 'node:fs/promises';
import { parseCalendar } from './calendar.mjs';
const config = JSON.parse(await readFile(new URL('../content/site.json', import.meta.url)));
const output = new URL('../public/data/events.json', import.meta.url);
try {
  const response = await fetch(config.calendar, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Feed HTTP ${response.status}`);
  const text = await response.text();
  if (text.length > 2000000) throw new Error('Feed exceeds size limit');
  const now = new Date();
  const events = parseCalendar(text, now);
  const result = { source: config.calendar, fetchedAt: now.toISOString(), events };
  const temporary = new URL('../public/data/events.json.tmp', import.meta.url);
  await writeFile(temporary, JSON.stringify(result, null, 2)+'\n');
  await rename(temporary, output);
  console.log(`Calendar synchronized: ${events.length} real ongoing/upcoming occurrences.`);
} catch (error) {
  console.error(`Calendar sync failed; existing snapshot preserved. ${error.message}`);
  process.exitCode = 1;
}
