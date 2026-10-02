# Engelsoft Beacon BACnet/IP 1.4.1

**Reconnect and it feels so good.**

BACstac reconnects should recover the connection, not create a tiny traffic jam where the request and its answer wait politely for each other forever. This patch keeps the Protocol V2 socket reader active while managed targets are restored.

## Fixed

- Fixed a Protocol V2 deadlock during WebSocket reconnect recovery.
- Restore commands can now receive their confirmation through the already-running socket reader.
- Unfinished reconnect restoration is cancelled and awaited when the socket closes.
- Added regression coverage for the reconnect request/response path.

## Updating

Restart Home Assistant after updating. The Explorer frontend is unchanged at build `0688`, so no cache-clearing ritual should be necessary this time.
