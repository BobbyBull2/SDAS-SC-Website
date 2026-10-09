# Discord screenshot integration — review stage

The homepage retains its design, responsive layout, controls, autoplay,
reduced-motion handling, and two concept-art fallbacks. No bot token is used by
this project. The Discord collector lives in the Calendar repository, in a
separate manual workflow; it produces downloaded WebP files and `manifest.json`.

## Import a real review bundle

After the collector workflow has been reviewed and run, download its GitHub
Actions artifact and extract it outside `public/`. From this website directory:

```
node scripts/import-screenshots.mjs /absolute/path/to/extracted-bundle
```

This checks manifest structure, safe paths, image hashes and WebP signatures, then
saves durable files in ignored `.local/screenshots/`. Existing local snapshots
are preserved as `.local/screenshots-backup-*`. It requires no Discord token.
Refresh http://localhost:5174/#home after import. The dev-only Vite endpoint serves
these files, while the React slideshow shows actual candidate/verification status.

**Do not place provisional bundles in `public/`.** `.local/` is excluded from Git
and outside Vite's public directory. The dev endpoint is not installed in the
production preview or built output. Production additionally refuses manifests
without both publication approval and per-image verified officer identities.
Nothing here sets publication approval, uploads screenshots, or deploys anything.

Absent, invalid, empty, or broken-image bundles restore the concept fallbacks.
Public, approved images can later use `screenshot-gallery/manifest.json` and its
relative image files, after a separately authorized publication pipeline exists.
A manifest flag is not a cryptographic authorization mechanism: the publication
pipeline and repository access must enforce who can approve a release.

The future workflow needs Bobby/Fox's verified numeric Discord IDs, not display
names. Adding an emoji is only a provisional signal until one of those users is
returned by Discord's reaction-user API. Verification reflects the sync time.

## Validation

- `npm test` — calendar and screenshot manifest tests.
- `npm run build` — typecheck and production build.
- `npm run test:browser` — existing layout/controls/calendar checks on port 5174.
- `node tests/screenshots-browser.mjs` — synthetic five-image manifest, errors,
  responsive layout and production rejection. Requires dev port 5174 and Vite
  production preview on port 5175. Fixtures are not real Discord screenshots.

On this WSL host, browser checks need the existing local Chromium dependencies:
`LD_LIBRARY_PATH=/home/bubi/.cache/sdas-browser-libs/usr/lib/x86_64-linux-gnu`.
