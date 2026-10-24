# Release checklist for 1.6.2

## Prepared

- [x] Manifest, runtime version, README badge and release notes use 1.6.2.
- [x] BACstac setup guidance, retry menus and German/English translations included.
- [x] API tokens and connection titles redacted from diagnostics.
- [x] Frontend unchanged; cache build remains 0722.

## Publication gates

- [ ] Tests, Validate, HACS validation and Hassfest validation pass on the release commit.
- [ ] Publish stable release 1.6.2 only after those checks pass.
- [ ] Verify the generated beacon.zip against the tagged source and inspect its contents for private data.

## Live installation

- [ ] Install through HACS and restart Home Assistant.
- [ ] Verify installation links and retry/manual navigation with BACstac stopped and running.
- [ ] Verify the incompatible-version message against an older gateway.
