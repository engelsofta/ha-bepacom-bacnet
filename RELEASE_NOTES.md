# Engelsoft Beacon BACnet/IP 1.4.0

**New identity. Same BACnet. No existential crisis.**

Changing a BACnet point from a number to a switch or light should not give Home Assistant an identity crisis at every restart. This stable release removes saved entity IDs that no longer match the point's current representation, while preserving the current entity, custom names, and all other point settings.

## Fixes and improvements

- Prevent repeated `New entity ID should be same domain` startup warnings.
- Persist the cleanup so incompatible saved IDs do not return on the next restart.
- Finish startup migrations before option changes can trigger an integration reload.
- Retry BACstac startup validation during normal add-on startup delays and defer repair warnings for temporary failures.
- Represent Multi-State Outputs as numbers, switches, lights, or outlets.
- Use optional Multi-State Input feedback for switches, lights, and outlets without exposing duplicate feedback sensors.
- Improve BACnet Explorer behavior on narrow Home Assistant layouts.
- Restore and expand the integration test suite.

## Updating

Restart Home Assistant after updating. Reload the Explorer once without the browser cache if its previous bundle is still cached. Explorer frontend build: `0688`.

Stored IDs with an incompatible domain are removed automatically on integration startup. Existing automations that reference old entity IDs still need to be updated to the current IDs.
