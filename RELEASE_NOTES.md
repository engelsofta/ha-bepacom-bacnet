# Engelsoft Beacon BACnet/IP 1.4.2

**Home is where the host isn't hardcoded.**

The BACnet Explorer now has a direct shortcut to the BACstac app. It follows Home Assistant's registered app panel instead of tying itself to one IP address, because bookmarks should travel better than furniture.

## New

- Added **BACstac app** as a fourth item in the Explorer's main navigation.
- Detects the installed BACstac panel dynamically and falls back to the known app slug when necessary.
- Uses a relative Home Assistant path with no fixed IP address or port.
- Works with local hostnames, HTTPS, reverse proxies, and remote Home Assistant addresses.
- Warns before navigation when the point editor still contains unsaved changes.
- Keeps the navigation compact on narrow screens.

## Updating

Restart Home Assistant after updating. If the fourth navigation item does not appear immediately, reload the Explorer once without the browser cache. Explorer frontend build: `0689`.
