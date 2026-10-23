# Engelsoft Beacon BACnet/IP 1.6.0

## 1.6.0 - 2026-10-23

**V2 or not V2? That is no longer a question.**

### Compatibility change

- Require Engelsoft BACstac Protocol V2. Gateways without compatible V2 support are rejected with an update message. Update BACstac before installing this release; the legacy compatibility lane is officially closed for renovation. Permanently.

### One protocol, fewer plot twists

- Remove legacy protocol negotiation, the old `/ws` connection path, individual REST subscription creation/renewal/removal, and the unused per-point subscription scheduler. The gateway now owns its COV and polling plan without an integration-side tribute band.
- Preserve the REST endpoints still used by the current gateway for inventory, diagnostics, startup target configuration, and supported writes. A URL containing `apiv1` is not automatically a fossil.
- Keep one V2 managed WebSocket feed with reconnect handling and event-sequence checks. No secret handshake with the previous century.
- Replace repeated Protocol V2 labels with connection and processing information. The dashboard has stopped announcing its own plumbing at every opportunity.
- Keep protocol details in technical diagnostics, where they can discuss version numbers in peace.
- Add negotiation tests for current, old, foreign, malformed, and unavailable gateways. An offline gateway remains a connection error, not an unexpected history lesson.
- Rebuild the frontend with cache build `0722`.

### Validation and updating

Locally passed: three isolated protocol-negotiation tests, all 13 Explorer regression tests, the Chromium layout test, TypeScript checking, frontend build, and Python syntax checks. GitHub runs the full Home Assistant integration suite before publication. Live gateway and Home Assistant installation have not been verified in this session.

Update BACstac to a version supporting Protocol V2 first, then update the integration through HACS and restart Home Assistant. Expected integration version: 1.6.0; frontend build: 0722.