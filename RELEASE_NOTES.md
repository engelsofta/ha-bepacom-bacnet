# Engelsoft Beacon BACnet/IP 1.6.3

## 1.6.3 - 2026-11-04

- Require administrator privileges for all twelve BACnet Explorer WebSocket commands, including reads, device writes, override changes, entity removal and integration reloads.
- Reject non-admin requests before scheduling handlers or accessing BACnet devices and integration configuration.
- Add regression coverage for every registered Explorer command and administrator authorization.
