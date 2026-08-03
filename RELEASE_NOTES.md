# Engelsoft Beacon BACnet/IP 1.2.1 B2

Version 1.2.1b2 is a pre-release of the new integration-controlled BACnet transport architecture.

## The big change

The integration can now tell Engelsoft BACstac exactly how every discovered BACnet point should be handled:

- **Push** requests BACnet COV.
- **Polling** requests managed per-object polling.
- **Disabled** stops both COV and polling for that point.

The integration defines the intent while BACstac keeps the safety net: per-device COV limits, throttled subscription setup, duplicate suppression and automatic polling fallback remain enforced on the BACnet side.

The full target profile is restored after reconnects. Managed mode also uses a single global WebSocket, avoiding an unnecessary extra COV subscription merely to establish the live connection.

## Interface polish

- Virtual-entity tabs are readable again in light mode.
- State badges use stronger accessible light-theme contrasts.
- Icon and settings buttons remain visible on bright backgrounds.
- Dark-mode styling remains unchanged.

## Compatibility

- Full per-object control requires an Engelsoft BACstac build with `integration_controlled` support.
- Older gateways remain supported through the existing compatibility behavior.
- Existing config entries, entity IDs, overrides and virtual entities are preserved.
- Restart Home Assistant and reload the browser with `Ctrl+F5` after updating.

## Validation

- Python syntax and managed-target payload validation.
- Dedicated tests for COV, polling, disabled and legacy target payloads.
- TypeScript type check.
- Reproducible Vite production build.
- JavaScript bundle syntax validation.
- Frontend build `0650`.

For the complete list of changes, see
[CHANGELOG.md](CHANGELOG.md#121b2---2026-08-03).

**Set it once. BACnet obeys — safely.**
