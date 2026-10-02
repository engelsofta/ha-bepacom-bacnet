# Stable release checklist for 1.4.1

## Before publishing

- [x] `manifest.json` version is `1.4.1`.
- [x] `const.py` version is `1.4.1`.
- [x] README version badge is `1.4.1`.
- [x] Changelog contains a dated `1.4.1` entry for 2026-10-02.
- [x] GitHub release notes are available in `RELEASE_NOTES.md`.
- [x] Frontend build is `0688`.
- [ ] GitHub Actions tests, HACS and Hassfest are green on the release commit.

## Publish on GitHub

1. Commit and push all prepared release files.
2. Wait for **Tests**, **Validate**, **HACS validation** and **Hassfest validation**.
3. Create tag `1.4.1` on the release commit.
4. Use `Engelsoft Beacon BACnet/IP 1.4.1` as the release title.
5. Copy `RELEASE_NOTES.md` into the release description.
6. Publish it as the latest stable release, without the pre-release flag.
7. Verify that HACS detects `1.4.1` on the normal release channel.

## After publishing

- [ ] Install the update through HACS on a test system.
- [ ] Restart Home Assistant and bypass the browser cache.
- [ ] Confirm integration version `1.4.1` and frontend build `0688`.
- [ ] Confirm blue Push/COV and green Polling indicators in dark and light themes.
- [ ] Interrupt and restore a Protocol V2 connection and confirm managed targets recover without blocking the socket reader.
