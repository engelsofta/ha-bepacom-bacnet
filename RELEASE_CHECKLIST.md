# Stable release checklist for 1.2.2

## Before publishing

- [x] `manifest.json` version is `1.2.2`.
- [x] `const.py` version is `1.2.2`.
- [x] README version badge is `1.2.2`.
- [x] Changelog contains a dated `1.2.2` entry.
- [x] GitHub release notes are available in `RELEASE_NOTES.md`.
- [x] Frontend build is `0651`.
- [ ] GitHub Actions tests, HACS and Hassfest are green on the release commit.
- [ ] Verify the matching BACstac `integration_controlled` build.

## Publish on GitHub

1. Commit and push all prepared release files.
2. Wait for **Tests**, **Validate**, **HACS validation** and **Hassfest validation**.
3. Create tag `1.2.2` on the release commit.
4. Use `Engelsoft Beacon BACnet/IP 1.2.2` as the release title.
5. Copy `RELEASE_NOTES.md` into the release description.
6. Publish it as the latest stable release, without the pre-release flag.
7. Verify that HACS detects `1.2.2` on the normal release channel.

## After publishing

- [ ] Install the update through HACS on a test system.
- [ ] Restart Home Assistant and bypass the browser cache.
- [ ] Confirm integration version `1.2.2` and frontend build `0651`.
- [ ] Confirm COV, polling and disabled targets in BACstac diagnostics.
- [ ] Confirm that COV-limit and silent-COV fallbacks still activate safely.
- [ ] Switch between light and dark Home Assistant themes.
