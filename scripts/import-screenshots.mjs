import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, rename, rm, realpath } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateManifest } from '../src/lib/screenshot-manifest.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = process.argv[2];
if (!source) throw Error('Usage: node scripts/import-screenshots.mjs /path/to/extracted-review-bundle');
const bundle = await realpath(source);
const manifest = validateManifest(JSON.parse(await readFile(join(bundle, 'manifest.json'), 'utf8')), true);
await mkdir(join(root, '.local'), { recursive: true });
const stage = await mkdtemp(join(root, '.local/screenshot-stage-'));
try {
  await mkdir(join(stage, 'images'));
  for (const item of manifest.images) {
    const path = await realpath(join(bundle, item.file));
    if (!path.startsWith(bundle + sep)) throw Error('Image escapes bundle');
    const bytes = await readFile(path);
    if (bytes.length > 25 * 1024 * 1024 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' ||
        createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw Error('Image integrity check failed');
    await writeFile(join(stage, item.file), bytes);
  }
  await writeFile(join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const current = join(root, '.local/screenshots');
  const backup = join(root, `.local/screenshots-backup-${Date.now()}`);
  let saved = false;
  try { await rename(current, backup); saved = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { await rename(stage, current); } catch (error) { if (saved) await rename(backup, current); throw error; }
  console.log(`Imported ${manifest.images.length} images for local review only. Restart Vite if this integration is newly installed.`);
  if (saved) console.log('Previous local bundle preserved in .local/ backup.');
} finally {
  await rm(stage, { recursive: true, force: true });
}
