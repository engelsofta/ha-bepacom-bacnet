# Stable release checklist for 1.4.0

## Before publishing

- [x] `manifest.json` version is `1.4.0`.
- [x] `const.py` version is `1.4.0`.
- [x] README version badge is `1.4.0`.
- [x] Changelog contains a dated `1.4.0` entry for 2026-10-02.
- [x] GitHub release notes are available in `RELEASE_NOTES.md`.
- [x] Frontend build is `0688`.
- [ ] GitHub Actions tests, HACS and Hassfest are green on the release commit.

## Publish on GitHub

1. Commit and push all prepared release files.
2. Wait for **Tests**, **Validate**, **HACS validation** and **Hassfest validation**.
3. Create tag `1.4.0` on the release commit.
4. Use `Engelsoft Beacon BACnet/IP 1.4.0` as the release title.
5. Copy `RELEASE_NOTES.md` into the release description.
6. Publish it as the latest stable release, without the pre-release flag.
7. Verify that HACS detects `1.4.0` on the normal release channel.

## After publishing

- [ ] Install the update through HACS on a test system.
- [ ] Restart Home Assistant and bypass the browser cache.
- [ ] Confirm integration version `1.4.0` and frontend build `0688`.
- [ ] Confirm blue Push/COV and green Polling indicators in dark and light themes.
- [ ] Change an MSO representation, restart twice, and confirm incompatible saved IDs are removed without recurring domain warnings.
