# Pre-release checklist for 1.2.1b2

## Before publishing

- [x] `manifest.json` version is `1.2.1b2`.
- [x] `const.py` version is `1.2.1b2`.
- [x] README version badge is `1.2.1b2`.
- [x] Changelog contains a dated `1.2.1b2` entry.
- [x] GitHub release notes are available in `RELEASE_NOTES.md`.
- [x] Frontend build is `0650`.
- [ ] GitHub Actions tests, HACS and Hassfest are green on the release commit.
- [ ] Verify the matching BACstac `integration_controlled` build.

## Publish on GitHub

1. Commit and push all prepared release files.
2. Wait for **Tests**, **Validate**, **HACS validation** and **Hassfest validation**.
3. Create tag `1.2.1b2` on the release commit.
4. Use `Engelsoft Beacon BACnet/IP 1.2.1 B2` as the release title.
5. Copy `RELEASE_NOTES.md` into the release description.
6. Mark the release as a pre-release and not as the latest stable release.
7. Verify that HACS detects `1.2.1b2` when beta releases are enabled.

## After publishing

- [ ] Install the update through HACS on a test system.
- [ ] Restart Home Assistant and bypass the browser cache.
- [ ] Confirm integration version `1.2.1b2` and frontend build `0650`.
- [ ] Select `integration_controlled` in the matching BACstac add-on.
- [ ] Confirm COV, polling and disabled targets in BACstac diagnostics.
- [ ] Confirm that COV-limit and silent-COV fallbacks still activate safely.
- [ ] Switch between light and dark Home Assistant themes.
