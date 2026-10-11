# Fox preview — Pilot's Toolkit and SDAS News Wire

**Review URL:** https://fox-review-toolkit-news.sdas-sc-website.pages.dev/

**Production remains:** https://sdas.space/ (unchanged)

This prototype is deliberately not merged into `main`. Review-only PR #8. The Cloudflare Pages deploy action uses `--branch=fox-review-toolkit-news`; it must never be changed to `main` for this PR.

## What's in this preview
- Compact six-link Pilot's Toolkit (UEX, Erkul, SC Craft Tools, SC Trade Tools, Star Citizen Wiki, StarStrings).
- 3-column desktop and horizontal scroll on mobile.
- Three compact News Wire cards **with sample text only**. All are visibly labeled DEMO / SAMPLE; no Discord channel is connected.
- Existing bottom resources trimmed to three official SDAS destinations (RSI org, Discord, Calendar) to avoid repeating the toolkit links.
- Original Fox artwork, screenshots, roster, calendar, and branding unchanged.
- Dedicated preview-only notice above the header.

## How future #org-news integration would work
- Confirm the specific Discord channel ID and whether all posts there are intended for public web syndication.
- Create a publish-only projection in the existing SDAS Calendar/Discord bot repository; keep DISCORD_BOT_TOKEN private in that repository.
- Render only human-reviewed/approved text and safe Discord deep links, never arbitrary HTML/markdown or Discord attachments from unapproved channels.
- Apply bounded length, deduplication, author consent and content takedown controls.
- Feed target must be separately published, not an unprotected endpoint exposing a bot token.

## Acceptance checklist for Fox
- Does the Toolkit fit the established design without visual clutter?
- Are these the right six destinations, in the right order?
- Is the News Wire card density right on desktop and mobile?
- Where should the News Wire sit relative to the calendar and about section?
- Which channel and who may authorize public news posts?

## Technical implementation
- Browser loads `/data/org-news-preview.json` and validates via `src/lib/org-news.mjs`; integration point can switch to a published approved JSON feed later.
- Unit tests exercise schema, URL allowlist, duplicate rejection and length bounds.
- An isolated GitHub Action runs tests, builds, and deploys **preview only** for the specific same-repository branch.
