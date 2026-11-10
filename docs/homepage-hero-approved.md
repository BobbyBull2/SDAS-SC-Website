# SDAS homepage hero — approved artwork and display standards
Updated: 2026-11-10

## Approved image
- Production hero: `public/images/sdas-home-hero-natural-20261110.webp` (2172 × 724, approximately 3:1).
- It is the brighter, natural-color, zoomed-out SDAS crew and capital-ship panorama approved in the SDAS Websites conversation on 2026-11-10.
- Treat this exact image as approved. Keep the ship design, **only two visible landing-gear assemblies**, crew gathering, landing pad, planetary sky, sunset, and original visual identity.
- When a minor visual flaw needs correction, **repair the faces/details only**, not the whole artwork. Avoid smushed faces, arbitrary ship changes, extra landing gear, or excessive color grading.

## Composition and responsive display
- Favor a composition roughly **20–25% wider/zoomed-out** than the earlier close-cropped banner, so the ship, crew, pad, and sky remain visible.
- Preserve the established homepage hero height, copy, typography, buttons, and navigation.
- Keep the headline, tagline, description, and join button **anchored to the left of the banner on desktop and ultrawide**, not centered within a 1440px content container. Mobile retains its stacked, legible text layout.
- Use **`object-fit: contain`**, not `cover`, for the panoramic hero. Preserve original aspect ratio; never stretch, distort, or enlarge a low-resolution portrait to fill the viewport.
- On ultrawide monitors, **center the entire panorama** and preserve all artwork. Blend its horizontal edges into a **softly blurred copy of the same approved image** behind it, with a controlled dark overlay for the left-side text. Never align the image hard to the right or leave a sharp black vertical boundary. On mobile, keep the full image visible and preserve vertical separation from the text.
- Blur only the ambient/background copy and the outer edge transitions; **never blur the foreground ship or people**. Use controlled dark gradients primarily behind the **left-side text**. Keep the middle/right ship and crew bright and legible; avoid tinting the whole image into murky black.
- Use new versioned filenames to prevent stale image caching when replacing artwork.

## Deployment guardrails
- Update only the relevant hero image, `content/site.json`, and targeted CSS unless a new requirement is approved.
- Keep the single existing `main` → GitHub Actions → Cloudflare Pages `sdas-sc-website` production workflow. Do not set up a competing deployment route.
- Run existing tests/build checks and verify deployment; check desktop/mobile framing and preserve Fleet Manager, Comics & Stories, screenshots, calendars, and other published SDAS content.
