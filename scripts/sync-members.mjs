import { fileURLToPath } from 'node:url';
import { syncMembers } from './members.mjs';
try {
  const result = await syncMembers(fileURLToPath(new URL('../public/data/members.json', import.meta.url)));
  console.log(`Saved ${result.publicMembers} public members across ${result.pagesFetched} pages; ${result.hiddenMembers} hidden entries excluded.`);
} catch (error) {
  console.error(`Member sync failed: ${error.message}. Last-known-good file was not replaced.`);
  process.exitCode = 1;
}
