# Engelsoft Beacon BACnet/IP 1.2.3

Version 1.2.3 makes BACnet transport modes readable at a glance across the Explorer.

## Clear transport colors

- **Blue means Push/COV** in the Point Inspector and the Explorer table.
- **Green means Polling**, including managed polling fallbacks.
- Snapshot-based push updates now follow the same blue Push/COV language.
- Disabled points remain neutral and unobtrusive.

The update-mode selector also shows a green marker directly beside Polling, so configuration and runtime status now speak the same visual language.

## Compatibility

- Existing config entries and update-mode selections are preserved.
- Entity IDs, overrides and virtual entities remain unchanged.
- No migration or reconfiguration is required.
- Restart Home Assistant and reload the browser with `Ctrl+F5` after updating.

## Validation

- Python integration test suite.
- TypeScript type check.
- Reproducible Vite production build.
- JavaScript bundle syntax validation.
- Frontend build `0652`.

For the complete list of changes, see [CHANGELOG.md](CHANGELOG.md#123---2026-08-04).

**Blue for push. Green for poll. BACnet status at a glance.**
