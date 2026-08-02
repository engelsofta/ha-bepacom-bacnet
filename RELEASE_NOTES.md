# Engelsoft Beacon BACnet/IP 1.2.1_B1

Version 1.2.1_B1 is a pre-release preview of the visual refinements for the Beacon BACnet Explorer.

## Highlights

- Automatic light and dark interfaces that follow the active Home Assistant theme.
- Refined Engelsoft dashboard styling based on the NetMan visual language.
- Cleaner **Beacon BACnet** header and more compact main navigation.
- Redesigned diagnostics with clearer groups and better readable metrics.
- Consolidated top status area for points, entities, connection health and push performance.
- Polished Live View tables, filters, badges and spacing.

## Upgrade notes

- Existing config entries, entity IDs, overrides and virtual entities are preserved.
- No reconfiguration or migration is required when upgrading from 1.2.0.
- Restart Home Assistant after installing the update.
- Reload the browser with `Ctrl+F5` if an older frontend build remains visible.

## Validation

- TypeScript type check.
- Reproducible Vite production build.
- JavaScript bundle syntax validation.
- Frontend build `0649`.

For the complete list of changes, see
[CHANGELOG.md](CHANGELOG.md#121_b1---2026-08-02).
