# Release checklist for 1.6.4

## Prepared

- [x] Version metadata and release notes updated to 1.6.4.
- [x] HACS default catalog instructions with custom repository fallback.
- [x] English GUI, locale formatting, light appearance and header controls included.
- [x] Pending Protocol V2 command cleanup included; admin authorization retained.
- [x] Frontend type-check, build, 16 Node regression tests, browser regression and nine protocol lifecycle tests passed locally.

## Publication gates

- [ ] Tests, Validate, HACS and Hassfest pass on the release commit.
- [ ] Publish stable release 1.6.4 after checks pass.
- [ ] Verify beacon.zip against the tagged integration files.

## Live installation

- [ ] Install through HACS, restart Home Assistant and reload the browser.
