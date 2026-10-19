# Stable release checklist for 1.4.3

## Preparation

- [x] Integration manifest and runtime version: `1.4.3`.
- [x] English README version badge: `1.4.3`.
- [x] English changelog entry dated 2026-10-19 and humorous release notes prepared.
- [x] German README and obsolete migration warning removed.
- [x] Frontend cache build: `0691`; production bundle rebuilt.
- [x] 29 targeted local tests, TypeScript check and Python/JavaScript syntax checks passed.
- [x] Frontend regression tests included in GitHub Actions.
Before publishing, require Tests, Validate, HACS validation and Hassfest validation to pass on the exact release commit.

## Publication

1. Push the release commit to GitHub.
2. Tag the validated release commit as `1.4.3`.
3. Publish the latest stable release: `Engelsoft Beacon BACnet/IP 1.4.3 — 🚀 Less BAClog. More BACnet.`
4. Verify the release package workflow and attached `beacon.zip`.

## Installation validation

- [ ] Install through HACS on a test system and restart Home Assistant.
- [ ] Confirm integration `1.4.3` and frontend build `0691`.
- [ ] Verify search, values under mouseover, active-input protection and independent feedback updates in the running HA frontend.
