import { load } from 'cheerio';
import robotsParser from 'robots-parser';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

export const SOURCE = 'https://robertsspaceindustries.com/en/orgs/SDAS/members';
const ORIGIN = new URL(SOURCE).origin;
const AGENT = 'SDAS-Public-Roster/1.0';
export function publicUrl(value, profile = false) {
  if (!value) return null;
  const url = new URL(value, ORIGIN);
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !(url.hostname === 'robertsspaceindustries.com' || url.hostname.endsWith('.robertsspaceindustries.com'))) throw Error('Untrusted RSI URL');
  if (profile && (url.origin !== ORIGIN || !/^\/(?:en\/)?citizens\/[^/]+$/.test(url.pathname))) throw Error('Invalid public profile link');
  return url.href;
}
export function parseMembers(html) {
  const $ = load(html);
  const container = $('#members-data');
  const count = $('.js-totalrows').first().text().trim().match(/^([\d,]+) members?$/);
  if (!container.length || !count) throw Error('RSI roster structure changed or access blocked');
  const total = Number(count[1].replaceAll(',', ''));
  const cards = container.children('.member-item');
  const members = [];
  let hidden = 0;
  cards.each((_, element) => {
    const card = $(element);
    if (!card.hasClass('org-visibility-V')) { hidden++; return; }
    const handle = card.find('.nick').first().text().trim();
    const profile = publicUrl(card.find('a.membercard').attr('href'), true);
    if (!handle || !profile) throw Error('Visible member lacks public identity');
    const avatar = publicUrl(card.find('.thumb img').attr('src'));
    members.push({ handle, avatar, profile, rank: card.find('.rank').first().text().trim() || null,
      roles: card.find('.rolelist li').toArray().map(li => $(li).text().trim()).filter(Boolean) });
  });
  return { total, rows: cards.length, hidden, members };
}
async function getText(url, request) {
  const response = await request(url, { headers: { 'User-Agent': AGENT, Accept: 'text/html,text/plain' },
    redirect: 'error', signal: AbortSignal.timeout(30000) });
  console.log(`RSI ${new URL(url).pathname}${new URL(url).search}: HTTP ${response.status}`);
  if (!response.ok) throw Error(`RSI HTTP ${response.status}; previous cache retained`);
  const text = await response.text();
  if (text.length > 3_000_000) throw Error('Unexpectedly large RSI response');
  return text;
}
export async function collectMembers(request = fetch, pause = ms => new Promise(r => setTimeout(r, ms))) {
  const robotsURL = ORIGIN + '/robots.txt';
  const robots = robotsParser(robotsURL, await getText(robotsURL, request));
  const members = [], seen = new Set();
  let total, rows = 0, hidden = 0;
  for (let page = 1; page <= 100; page++) {
    const url = page === 1 ? SOURCE : `${SOURCE}?page=${page}`;
    if (robots.isAllowed(url, AGENT) === false) throw Error('RSI robots policy disallows roster retrieval');
    if (page > 1) await pause(Math.max(1000, (robots.getCrawlDelay(AGENT) || 0) * 1000));
    const result = parseMembers(await getText(url, request));
    if (total === undefined) total = result.total;
    if (total !== result.total || result.rows > 32 || (result.rows === 0 && rows < total)) throw Error('Incomplete or changing RSI roster; previous cache retained');
    for (const member of result.members) {
      const key = member.handle.toLowerCase();
      if (seen.has(key)) throw Error('Repeated member/page; previous cache retained');
      seen.add(key); members.push(member);
    }
    rows += result.rows; hidden += result.hidden;
    if (rows > total) throw Error('RSI pagination count mismatch');
    if (rows === total) return { schemaVersion: 1, source: SOURCE, fetchedAt: new Date().toISOString(),
      organizationTotal: total, hiddenMembers: hidden, publicMembers: members.length,
      pagesFetched: page, members };
  }
  throw Error('RSI pagination safety limit reached');
}
export async function syncMembers(output, request = fetch, pause) {
  const data = await collectMembers(request, pause);
  await mkdir(dirname(output), {recursive: true});
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2) + '\n');
  await rename(temporary, output);
  return data;
}
