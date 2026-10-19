# Stable release checklist for 1.5.1

## Preparation

- [x] Integration manifest, runtime version and README badge: `1.5.1`.
- [x] English changelog dated 2026-10-19 and humorous release notes prepared.
- [x] Neutral surfaces, quieter metrics/table and RoomControl-style area titles included.
- [x] Frontend cache build: `0698`; production bundle rebuilt.
- [x] Six local demo browser layouts validated from 320 to 1440 px, with light/dark views and runtime interactions.

Before publishing, require Tests, Validate, HACS validation and Hassfest validation to pass on the exact release commit.

## Publication

1. Push the release commit to GitHub.
2. Tag the validated release commit as `1.5.1`.
3. Publish the latest stable release: `Engelsoft Beacon BACnet/IP 1.5.1 — 🧘 Keep calm and BACnet on.`
4. Verify the package workflow and attached `beacon.zip` against the validated source.

## Installation validation

- [ ] Install through HACS on a test system and restart Home Assistant.
- [ ] Confirm integration `1.5.1` and frontend build `0698`.
- [ ] Confirm neutral light/dark surfaces, quiet status markers, area titles and Point Inspector spacing in the running HA frontend.
- [ ] Confirm sidebar swiping, search, filters, editor actions and runtime updates against the live gateway.
