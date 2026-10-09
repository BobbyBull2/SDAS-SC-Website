import type { Plugin } from 'vite';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// configureServer is dev-only. This directory is never a Vite public asset.
export function localScreenshots(): Plugin {
  return {
    name: 'sdas-local-screenshot-review',
    configureServer(server) {
      server.middlewares.use('/__sdas_preview__', async (req, res) => {
        const file = (req.url || '').split('?')[0].slice(1);
        if (req.method !== 'GET' || !/^(manifest\.json|images\/[0-9]+-[0-9]+-[a-f0-9]{64}\.webp)$/.test(file)) {
          res.statusCode = 404; res.end(); return;
        }
        try {
          const root = await realpath(resolve(server.config.root, '.local/screenshots'));
          const path = await realpath(resolve(root, file));
          if (!path.startsWith(root + sep)) throw Error('Outside preview directory');
          const body = await readFile(path);
          res.setHeader('Content-Type', file.endsWith('.json') ? 'application/json' : 'image/webp');
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.end(body);
        } catch {
          res.statusCode = 404; res.end();
        }
      });
    },
  };
}
