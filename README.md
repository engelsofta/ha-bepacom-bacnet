<img width="256" height="256" alt="icon" src="https://github.com/user-attachments/assets/da03bbf1-2c39-4058-b9d3-5611fc3c4903" />


# Bepacom BACnet/IP for Home Assistant

Custom Home Assistant integration for reading, managing and writing BACnet/IP datapoints exposed by the Bepacom BACnet gateway.

> **Beta release:** This version is intended for testing. Create a Home Assistant backup before installing or updating.

## Highlights in 0.3.8 beta

- Sidebar BACnet Explorer with search, filters, grouping and details panel.
- Per-entity configuration directly in the Explorer.
- Stable entity IDs like `sensor.bepacom_1_analoginput_1249`.
- Update mode per point: disabled, push/subscribe or polling.
- Unit, device class and state class overrides with explicit `Automatic` / `None` / custom handling.
- Live monitor / value history and value-change highlighting.
- Push performance diagnostics and optimized snapshot dispatch.
- BACnet Write UI for discovered writable points.
- Export options for BACnet objects.

## Installation via HACS custom repository

1. Add this repository as a custom repository in HACS with category **Integration**.
2. Install **Bepacom BACnet/IP**.
3. Restart Home Assistant.
4. Add the integration from **Settings → Devices & services → Add integration**.
5. Open the **BACnet Explorer** from the Home Assistant sidebar.

## Manual installation

Copy the folder:

```text
custom_components/bepacom
```

to:

```text
/config/custom_components/bepacom
```

Then restart Home Assistant.

## Notes

- BACnet object metadata can be unreliable. This integration therefore supports manual overrides for unit, device class, state class, update mode and entity naming.
- The BACnet Explorer is the preferred place for per-object configuration.
- The integration is currently beta software and may still change.

## Support

Please open issues here: https://github.com/engelsofta/ha-bepacom-bacnet/issues
