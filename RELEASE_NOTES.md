# Engelsoft Beacon BACnet/IP 1.2.2

Version 1.2.2 brings integration-controlled BACnet transport to the stable release channel and sharpens the Explorer where it matters most: live visibility, diagnostics and reliable point naming.

## Integration-controlled transport

The integration can tell Engelsoft BACstac how every discovered BACnet point should be handled:

- **Push** requests BACnet COV.
- **Polling** requests managed per-object polling.
- **Disabled** stops both COV and polling for that point.

The integration defines the intent while BACstac keeps the safety net. Per-device COV limits, throttled subscription setup, duplicate suppression and automatic polling fallback remain enforced on the BACnet side. The complete target profile is restored after reconnects, and managed mode uses a single global WebSocket connection.

## Better Live View

- Live events now find their Home Assistant friendly names even when gateway and integration use different BACnet identifier formats.
- Clicking a resolved event still opens the correct Point Inspector.
- The 60-second activity timeline is taller and fills the available horizontal space.

## Clearer diagnostics and light mode

- Diagnostic values, labels and icons are easier to scan.
- Responsive cards make better use of wide monitors without becoming unnecessarily tall.
- BACnet object-group headings remain clearly readable in light themes.

## Compatibility

- Full per-object control requires an Engelsoft BACstac build with `integration_controlled` support.
- Older gateways remain supported through the existing compatibility behavior.
- Existing config entries, entity IDs, overrides and virtual entities are preserved.
- Restart Home Assistant and reload the browser with `Ctrl+F5` after updating.

## Validation

- Python integration test suite.
- TypeScript type check.
- Reproducible Vite production build.
- JavaScript bundle syntax validation.
- Frontend build `0651`.

For the complete list of changes, see [CHANGELOG.md](CHANGELOG.md#122---2026-08-03).

**From every BACnet point to the right Home Assistant state — clear, controlled, connected.**
