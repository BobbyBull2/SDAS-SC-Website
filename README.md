# SDAS — local Fox artwork preview

Local-only implementation on branch `feature/fox-local-preview`. No remote is configured, no deployment workflow is enabled, and the calendar repository is unchanged.

## Run

```sh
npm ci
npm run sync:calendar
npm run dev -- --port 5173
```

Open http://localhost:5173/ on this computer. Default hero is treatment A (split cinematic crop). Treatment A is approved; the alternative B query no longer changes the hero. These are real responsive HTML/CSS layouts, not the mockup displayed as a webpage.

```sh
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

On this WSL installation Chromium needs locally extracted libraries. No administrator changes were made. Run browser tests with:

```sh
LD_LIBRARY_PATH=/home/bubi/.cache/sdas-browser-libs/usr/lib/x86_64-linux-gnu npm run test:browser
```

The production preview server must be running on port 5174 for browser tests (`npm run preview -- --port 5174`). Screenshots and verification results are in `previews/` (not tracked). Browser dependency packages were downloaded from the configured Ubuntu repository and extracted under the user cache, not installed system-wide.

## Artwork and content

- Read the supplied `BUBY_IMPLEMENTATION_BRIEF.md` in full. Both supplied mockup copies had identical SHA-256 hashes.
- Original `Fox_hero_clean.png` is the actual hero image. Original `Fox_poster_with_text.png` is preserved byte-for-byte and offered as a download, never used behind duplicate HTML headings.
- Change image filenames/focal positions in `content/site.json`; Fox need not change component code.
- The gallery is interactive but currently shows two explicitly labeled temporary AI concept illustrations. They are not community submissions. No Discord integration or credential is included in this local checkpoint.
- About, Philosophy, What We Do and Mission use complete wording from https://robertsspaceindustries.com/en/orgs/SDAS as retrieved during discovery. The original wording “Multi-Crew Ship” is preserved.
- Header, hero, gallery, SDAS banner, calendar, About and Helpful Links retain the brief's order. The About area is taller than the illustrated mockup because real copy is substantially longer.
- Large banner uses semantic SDAS lettering and CSS geometry, not an invented hangar screenshot. Event cards use neutral CSS graphics, not fake event photos or the illustrated mockup's dates.
- Fonts are self-hosted npm assets; no runtime font provider or analytics.
- Resources points to the community Star Citizen Wiki. Final resource selection remains reviewable.

## Calendar

`npm run sync:calendar` retrieves the existing public ICS and uses ical.js to produce `public/data/events.json`. The current snapshot has 56 ongoing/upcoming occurrences within 180 days. Real tentative labels remain intact. Times are explicitly America/Chicago. All-day dates preserve date-only semantics.

Sync validates the candidate before atomically replacing the previous snapshot; failure leaves the previous file intact and exits nonzero. Browser errors show an honest fallback. Snapshots older than 24 hours display a warning. Recurrence/exclusions and calendar-defined timezone components are supported. This is a local manual sync only; automation will be a separate authorized stage.

Known production follow-ups: fuller timezone/override integration fixtures, schema and download-bound hardening, live approved Discord ingestion, optimized derivative artwork, automated asset publication, metadata/SEO review, link/invite verification and GitHub Pages/base-path checks. The original PNG is intentionally retained for this fidelity checkpoint and weighs about 2.6 MB.

## Approval checkpoint

Review `previews/desktop.png` and `previews/mobile.png`, for the original checkpoint. Updated full-page approval captures are `previews/desktop-refined.png` and `previews/mobile-refined.png`. See `docs/VISUAL-REFINEMENT.md` for changes, image prompts, and calendar boundary verification. Treatment A is approved; final visual approval is pending before Phase 3. Neither approval of screenshots nor a working build implicitly authorizes public deployment.

Phase 1 memory search remains keyword-only because embedding credentials are unavailable; implementation decisions use the supplied brief, inspected assets and the discovery report, not inferred prior memories.
