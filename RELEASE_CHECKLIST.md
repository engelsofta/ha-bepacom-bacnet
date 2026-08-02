# Pre-release checklist for 1.2.1_B1

## Before publishing

- [x] `manifest.json` version is `1.2.1_B1`.
- [x] `const.py` version is `1.2.1_B1`.
- [x] README version badge is `1.2.1_B1`.
- [x] Changelog contains a dated `1.2.1_B1` entry.
- [x] GitHub release notes are available in `RELEASE_NOTES.md`.
- [x] The generated frontend bundle matches the TypeScript source.
- [ ] GitHub Actions tests are green on the release commit.
- [ ] Test light and dark Home Assistant themes after a full restart.

## Publish on GitHub

1. Commit and push all prepared release files.
2. Wait for the **Tests**, HACS and Hassfest workflows to succeed.
3. Create the GitHub release with tag `1.2.1_B1` targeting the release commit.
4. Use `Engelsoft Beacon BACnet/IP 1.2.1_B1` as the release title.
5. Copy the contents of `RELEASE_NOTES.md` into the release description.
6. Mark it as a pre-release and do not mark it as the latest stable release.
7. Verify that HACS detects version `1.2.1_B1` when beta releases are enabled.

## After publishing

- [ ] Install/update through HACS on a test system.
- [ ] Restart Home Assistant and bypass the browser cache.
- [ ] Confirm integration version `1.2.1_B1` and frontend build `0649`.
- [ ] Test Configuration, Live View, Diagnostics and Point Inspector.
- [ ] Switch between a light and dark Home Assistant theme.
- [ ] Confirm existing overrides and virtual entities are preserved.
