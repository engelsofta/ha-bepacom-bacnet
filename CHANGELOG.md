# Changelog

## 0.2.0-alpha2

### Added
- BACnet unit mapping from `units`
- BACnet metadata attributes
- WebSocket diagnostics
- Heartbeat timeout and reconnect
- Automatic subscription renewal after reconnect
- Optional cyclic polling
- Optional push-value logging
- Experimental snapshot WebSocket mode
- Parallel subscription scheduler
- Repository logo and brand assets

### Changed
- WebSocket snapshots are filtered to subscribed objects.
- Push updates no longer reset the normal coordinator poll timer.
- Subscription initialization now runs once after discovery.

### Notes
- For the tested Bepacom gateway, Snapshot WebSocket mode should stay disabled.
