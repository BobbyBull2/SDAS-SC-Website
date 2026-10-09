# SDAS crew, branding, and rolling-gallery update

## Local checkpoints and branches

- Website checkpoint: `5a06c14` on `feature/discord-gallery-sync`.
- Website development: `feature/crew-branding-rolling-gallery`.
- Calendar/screenshot checkpoint: `ee76b7a` on `feature/discord-gallery-sync`.
- Calendar/screenshot development: `feature/rolling-gallery-25`.

The checkpoint commits preserve the pre-existing working changes, including the
approved artwork-edge treatment. New implementation changes remain uncommitted.
Nothing has been pushed, merged, deployed, or run through GitHub Actions.

## Implemented

1. Copied the supplied 128×128 RGB PNG unchanged to
   `public/images/sdas-spaceman.png`. SHA-256 matches the supplied file:
   `a83f099b218b1a544222a7772a504842b2296ceecf994050ff888974709757dd`.
   Header/footer use this logo at 36–48 CSS pixels; no generated replacement,
   recoloring, or asset resampling. Removed compass branding and the standalone
   hero compass. Other section icons are ordinary UI illustrations, not logos.
2. Replaced the hero activity badges with the requested philosophy and supporting
   copy. Retained the slogan, Fox artwork, navigation, and calendar behavior.
3. Added OUR CREW immediately before Upcoming Events. It includes all **69 public
   members** found among **71 entries across three public RSI pages**; the two
   hidden entries are excluded. Handles, avatars, ranks, roles, and profile links
   come directly from RSI markup; missing avatars show an unavailable placeholder,
   never an invented portrait. Native overflow supports mouse/touch scrolling;
   buttons and keyboard arrows are also available.
4. Added server-side roster sync using maintained Cheerio and robots-parser.
   Observed public `?page=` navigation works without credentials or login cookies.
   Only the public member HTML is crawled; no private APIs or hidden profiles are
   queried. Public avatar URLs are referenced, not scraped from `/media/`.
   New snapshots replace `public/data/members.json` atomically only after a complete
   successful scan. Blocked or incomplete requests leave last-known-good data intact.
5. Screenshot sync now sorts and selects at most 25 qualifying image attachments
   **before downloading**. Exact emoji ID and verified approver checks remain.
   New snapshots evict the oldest active entries, never Discord originals. The
   importer and frontend reject oversized bundles as an additional safeguard.

## Refresh and remaining limitations

Run `npm run sync:members` locally to refresh the saved roster. A separate workflow,
`.github/workflows/sync-members.yml`, is prepared for daily 10:23 UTC refreshes.
It is gated by `SDAS_MEMBER_SYNC_ENABLED=true` and the repository default branch.
It is not active until remote/branch review, push/merge approval, and deliberate
activation. It commits only successful member snapshots; it does not deploy.

The screenshot workflow remains artifact-only and manual. Real Discord images
have **not** been downloaded in this session. Bobby/Fox's authorized numeric user
IDs and an approved Actions run are still required for verified live screenshots.
`include_provisional` must be selected explicitly for unverified local review.

Discord REST does not expose reaction timestamps. Therefore current snapshots
use actual Discord message timestamps plus descending numeric message/attachment
ID tie-breakers, with `approvedAt: null`. The sorter can use an actually known
approval timestamp with a verified identity, but this snapshot integration has no
trusted approval-event time source. It does not invent approval dates or relabel
observation times as approval times. See the Calendar sync documentation.

## Validation

- `npm run build`: passed (TypeScript + Vite production build).
- `npm test`: 15 tests passed, including roster pagination/access restrictions,
  hidden entries, last-known-good preservation, gallery limits, and calendar tests.
- Python screenshot suite: 6 tests passed, including full pagination, verified
  identities, burst reactions, multiple attachments, deterministic 25-image
  selection/eviction, and only 25 files downloaded for 30 candidates.
- Python 3.12 grammar and both workflow YAMLs validated locally. Python tests ran
  on local Python 3.14 using isolated temporary Pillow dependencies.
- Existing browser suite: desktop, tablet, 390px and 320px layouts, slideshow,
  swipe, autoplay/pause, navigation, and calendar date-boundary regression passed.
- Crew browser suite: exact 69 public profiles/handles, original logo, philosophy,
  scrolling by arrows/keyboard/wheel/native Chromium touch, stale/unavailable/empty
  roster handling, and production-preview smoke test passed.
- Screenshot browser suite: five-image fixture, 25-image fixture, fallback states,
  and production rejection of provisional data. Fixtures are not real Discord images.
- Local preview remains at http://localhost:5174/#home. Production smoke testing
  used http://127.0.0.1:5175/. Desktop/mobile captures were inspected visually.

Browser commands on this WSL host use:
`LD_LIBRARY_PATH=/home/bubi/.cache/sdas-browser-libs/usr/lib/x86_64-linux-gnu`.
Generated captures are in ignored `previews/`; compiled output is in ignored `dist/`.

## Exact changed source/data files since the checkpoints

### Website

- `package-lock.json`
- `package.json`
- `src/lib/screenshot-manifest.mjs`
- `src/main.tsx`
- `src/style.css`
- `tests/browser.mjs`
- `tests/screenshots-browser.mjs`
- `tests/screenshots.test.mjs`
- `.github/workflows/sync-members.yml`
- `docs/crew-gallery-update.md`
- `public/data/members.json`
- `public/images/sdas-spaceman.png`
- `scripts/members.mjs`
- `scripts/sync-members.mjs`
- `src/Crew.tsx`
- `tests/crew-browser.mjs`
- `tests/members.test.mjs`

### Calendar

- `.github/workflows/sync-discord-screenshots.yml`
- `docs/discord-screenshot-sync.md`
- `scripts/sync_discord_screenshots.py`
- `tests/test_screenshot_sync.py`
