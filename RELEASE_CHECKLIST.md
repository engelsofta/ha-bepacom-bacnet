# Stable release checklist for 1.5.0

## Preparation

- [x] Integration manifest, runtime version and README badge: `1.5.0`.
- [x] English changelog dated 2026-10-19 and humorous release notes prepared.
- [x] Shared Engelsoft appearance and RoomControl background assets included.
- [x] Frontend cache build: `0694`; production bundle rebuilt.
- [x] 29 targeted regression tests, TypeScript and syntax checks passed.
- [x] Six local browser layouts validated, including mobile menu gestures and changed-row updates.

Before publishing, require Tests, Validate, HACS validation and Hassfest validation to pass on the exact release commit.

## Publication

1. Push the release commit to GitHub.
2. Tag the validated release commit as `1.5.0`.
3. Publish the latest stable release: `Engelsoft Beacon BACnet/IP 1.5.0 — 🕶️ BACnet got a glow-up.`
4. Verify the package workflow and attached `beacon.zip`, including both background images.

## Installation validation

- [ ] Install through HACS on a test system and restart Home Assistant.
- [ ] Confirm integration `1.5.0` and frontend build `0694`.
- [ ] Confirm desktop/mobile layout and light/dark appearance in the running Home Assistant frontend.
- [ ] Confirm sidebar swiping, search, filters, editor actions and runtime updates against the live gateway.
