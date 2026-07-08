# Bepacom BACnet/IP 0.3.8 Beta 1

This beta introduces the new Sidebar BACnet Explorer as the main management UI for BACnet objects.

## Main changes

- Sidebar Explorer for BACnet objects
- Per-object configuration in the Explorer
- Stable BACnet-based entity IDs
- Push/Subscribe vs Polling mode per object
- Unit, Device Class and State Class overrides
- Live Monitor / value history
- BACnet Write UI
- Export tools
- Performance dashboard and push diagnostics
- Optimized snapshot push processing

## Recommended test points

- Add or update the integration and restart Home Assistant.
- Open the BACnet Explorer from the sidebar.
- Change an entity name, unit, device class and update mode, then save.
- Click **Integration neu laden** once after configuration changes.
- Verify entity IDs follow the stable pattern, for example `sensor.bepacom_1_analoginput_1249`.
- Check that push counters and value changes behave plausibly.

## Upgrade notes

- Backup Home Assistant before updating.
- The Explorer is now the preferred place for object settings.
- Old OptionsFlow object editors and JSON overrides are removed.
- Existing entity IDs may be migrated automatically.
