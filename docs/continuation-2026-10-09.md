# SDAS continuation — October 9, 2026

## Preserved state

- Website branch: `feature/crew-branding-rolling-gallery`; checkpoint `5a06c14`.
- Calendar branch: `feature/rolling-gallery-25`; checkpoint `ee76b7a`.
- Prior uncommitted work was backed up with file hashes and binary Git diffs to
  ignored `.local/checkpoints/20261009T140045Z/` before edits.
- Existing checkpoint commits, branches, and pending work were preserved. No new
  commits, pushes, merges, Actions runs, deployments, domain purchases, or DNS changes.
- Runtime was verified as cloud `openai/gpt-6-astra` through the Codex endpoint.

## Seven-priority review

| Priority | Result |
| --- | --- |
| 1 — Hero | Exact supplied sunset image installed; old Fox artwork retained. |
| 2 — Emblem | Original pixels/colors unchanged; round presentation removes black corner clutter, spacing/alignment cleaned up, matching header/footer sizes. |
| 3 — Crew motion | Smooth continuous loop at 22 CSS pixels/second, native manual scrolling, explicit pause/play, hover/focus/interaction pauses, reduced-motion support. |
| 4 — Discord gallery | Existing pagination, exact emoji ID, reacting-user allowlist, durable files and rolling 25-image selection reviewed; no synchronization changes made. Live import awaits IDs and approved workflow execution. |
| 5 — Member integration | Saved 69 unique handles match a fresh read-only public RSI retrieval across three pages; two hidden entries excluded. Failure caching tests pass; daily workflow remains gated and unchanged. |
| 6 — Quality | Build, unit tests, responsive browser suites and motion checks passed as listed below. |
| 7 — GitHub readiness | Repositories remain separate. Website has no remote configured. Ignored caches/captures/env files checked; no known credential patterns found in candidate source files. Push and hosting configuration await approval. |

## Exact supplied hero

Original: `/mnt/c/Users/mrkyl/Downloads/03A39BCF-7A23-47CE-9BEE-3C4BB4D42FFA.jpg`.
Installed: `public/images/sdas-friends-sunset-portrait.jpg`.

- 1024×1536 JPEG, copied byte-for-byte; no AI generation, bitmap editing, recompression,
  resampling, or alteration of proportions.
- SHA-256: `e993ffdf2be6a4a33084b58d3e0d307836b5136a4623040af682c08735f29790`.
- Desktop retains the established feathered left-edge mask and text shading.
- Tablet uses a right-aligned crop to retain the rightmost friends and ship detail.
- Mobile uses the source aspect ratio with `object-fit: contain`, a dedicated image
  band and soft top/bottom transitions, instead of cropping it into a tall backdrop.
- Credit is neutral `SDAS COMMUNITY ARTWORK`; no authorship was invented for the
  new attachment. The previous `public/images/Fox_hero_clean.png` and original
  poster remain unchanged as backups. The initially supplied
  `public/images/sdas-friends-sunset.png` is also retained, superseded by the
  subsequently requested portrait JPEG.

## Crew carousel and accessibility

The JSON roster still contains 69 unique entries. Only one rendered group is in
the accessibility tree and keyboard tab order. Two visual copies allow seamless
wrapping; their links are removed from keyboard navigation and their groups are
hidden from assistive technology. Pointer profile links still work.

Automatic movement uses a single requestAnimationFrame loop with cached geometry
and fractional position tracking, not React state updates on every frame. It is
cancelled while the section is offscreen, the document is hidden, motion is reduced,
the user pauses it, or hover/focus/interaction is active. Manual wheel/touch scrolling
gets a 2.5-second idle delay before resuming. Touch input does not latch synthetic
mouse hover. ResizeObserver updates loop geometry; zero/single-member rosters stay
static, and reduced motion removes visual duplicates entirely.

## Actual validation

- `npm run build`: TypeScript and Vite production build passed.
- `npm test`: all 15 tests passed (calendar, member retrieval/cache, gallery guards).
- Python screenshot suite: all 6 tests passed during this continuation after the
  temporary Pillow test dependency was restored outside the repositories.
- Python 3.12 grammar and workflow YAML/gates verified read-only.
- Existing homepage browser suite passed at 1440, 768, 390 and 320 pixels: navigation,
  image loading, gallery controls/swipe, autoplay/pause, calendar scrolling and
  Chicago date-boundary behavior; zero page errors.
- Crew browser suite passed: exact real RSI handles/profile links, arrows, keyboard,
  wheel and native Chromium touch scrolling, stale/failed/empty states, production
  preview checks. Tests target the single accessible original group.
- Crew motion suite passed: speed, loop seam, accessible copy handling, pause/play,
  hover/focus, manual-input idle resume, hidden/offscreen suspension, live reduced
  motion changes, mobile native swipe pause/resume, and zero/single-member behavior.
- Hero browser checks passed at desktop/tablet/mobile widths: correct supplied
  image and dimensions, no document overflow, heading bounds, retained edge masks,
  full source proportions on phones. Captures inspected visually.
- Screenshot fixture suite passed: five/25-image manifests, fallback states,
  production rejection of provisional data. These remain synthetic fixtures,
  not evidence that real Discord screenshots were imported.
- `git diff --check` passed. Original emblem hash remains unchanged. Calendar source
  and both workflow files match the continuation backup byte-for-byte.

Browser commands use the existing WSL library prefix:
`LD_LIBRARY_PATH=/home/bubi/.cache/sdas-browser-libs/usr/lib/x86_64-linux-gnu`.
Generated `dist/`, `previews/`, `.local/`, and `.env*` are ignored. Local development
is accessible at http://localhost:5174/#home; production smoke tests use port 5175.

## Files changed during this continuation

These are additional to the preserved October 8 working changes:

- `content/site.json`
- `public/images/sdas-friends-sunset.png` (previous supplied image, retained)
- `public/images/sdas-friends-sunset-portrait.jpg` (new, exact replacement image)
- `src/main.tsx`
- `src/style.css`
- `src/Crew.tsx`
- `src/useCrewMotion.ts` (new)
- `tests/crew-browser.mjs`
- `tests/crew-motion-browser.mjs` (new)
- `tests/hero-browser.mjs` (new)
- `docs/continuation-2026-10-09.md` (this report)

No Calendar files or GitHub workflows were changed in this continuation.

## Remaining approval steps

1. Review the hero/emblem/carousel locally.
2. Supply Bobby's and Fox's numeric Discord user IDs for the explicit allowlist.
3. Approve the Calendar feature push and the artifact-only screenshot Actions run.
   Use only the existing Actions bot secret; never retrieve it into the website.
4. Import the resulting durable image bundle locally and review actual screenshots.
   Identity verification and permission to publish remain separate gates.
5. Approve the dedicated Website remote/push and member-sync activation separately.
   No website merge, public deployment, publishing, or custom-domain setup is done.

Discord REST does not return reaction timestamps: message timestamps and stable
numeric ID tie-breakers remain the honest ordering fallback. Officer verification
is not claimed until the actual reacting identities match the authorized IDs.
