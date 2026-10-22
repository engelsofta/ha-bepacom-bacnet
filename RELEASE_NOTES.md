# Engelsoft Beacon BACnet/IP 1.5.8

## 1.5.8 - 2026-10-22

**Headers need boundaries. And apparently, a solid background.**

- Give the sticky Inspector header an opaque base beneath its glass finish. Form fields can no longer audition as subtitles behind the buttons.
- Fix the light-theme background composition. A translucent color tried to join a list of background images; CSS declined the invitation.
- Consolidate Inspector header and action styles, removing conflicting legacy, mobile, and light-mode rules. Fewer cooks, fewer mysterious casseroles.
- Add a Chromium regression test using the actual production components. It checks sticky headers, opaque surfaces, foreground hit testing, and one-row Inspector actions in light and dark mode at desktop and phone widths. The desktop table header gets its own scrolling check; mobile keeps its cards.
- Document how to run the browser test with an existing Playwright installation. No gateway required; the test building runs on demo data and optimism.
- Rebuild the production frontend with cache build `0721`. Same controls, less accidental X-ray vision.

### Validation and updating

The Chromium layout regression test passed in light/dark mode at desktop and phone widths. All 13 Explorer regression tests, frontend type checking, and the production build passed locally. Release publication follows successful Tests, Validate, HACS, and Hassfest checks on the release commit. The browser test is currently run locally, not by the GitHub workflow. Live Home Assistant installation remains unverified.

Update through HACS and restart Home Assistant to load the panel registration. Expected integration version: 1.5.8; frontend build: 0721.