# Engelsoft Beacon BACnet/IP 1.2.6 B3

This beta completes the Diagnostics redesign with a focused, animated view of the BACnet update path.

The remaining processing stages now use larger cards, individual visual accents, and a subtle moving signal between steps. Redundant configuration, runtime, efficiency, and raw technical card groups have been removed. Push and Polling configuration counts now live directly in the main entity status card.

Falling numeric values now flash violet instead of red, keeping red reserved for actual error states. Motion automatically stops when reduced animation is enabled at operating-system level.

**Follow the flow, lose the noise — BACnet diagnostics in motion.**

---

# Engelsoft Beacon BACnet/IP 1.2.6 B2

This beta turns the Diagnostics workspace from a wall of counters into an operational view of the complete update path.

WebSocket messages, inspected objects, unchanged-value filtering, dispatched updates, and effective changes are now presented as one visual processing pipeline. Important health values remain immediately visible, while duplicate low-level counters are preserved under Technical Details.

**Less number soup, more BACnet signal — diagnostics that finally speak human.**

---

# Engelsoft Beacon BACnet/IP 1.2.6 B1

This beta introduces batched, integration-controlled transport changes without restarting the integration.

Configure multiple BACnet points as Push/COV, Polling or Disabled, then apply the complete profile once from the Explorer. BACstac receives one desired-state update, performs the target diff and changes only the affected BACnet tasks while the global WebSocket stays connected.

Home Assistant entity structure changes still keep their separate reload option where it is genuinely required.

**One click, zero reloads — because even BACnet deserves fewer existential crises.**

---

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
