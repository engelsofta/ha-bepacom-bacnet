# Engelsoft Beacon BACnet/IP 1.5.0

## 🕶️ BACnet got a glow-up.

The BACnet points are still doing their very serious building-automation jobs. They just moved into a nicer living room.

### One Engelsoft family, fewer fashion disagreements

- Bring Beacon into the RoomControl and CoverControl design family with calm glass surfaces, restrained gold accents and consistent controls.
- Use RoomControl's current living-room background and matching shading in dark mode; align the light background and overlays too. The sofa is decorative. Please do not assign it a BACnet priority.
- Replace the wide navigation bar with a compact icon rail on desktop and a horizontal menu on smaller screens.
- Match the shared desktop geometry: a 48 px rail, 36 px buttons, 19 px icons and 8 px gaps. Even our pixels have a dress code.
- Keep navigation labels, tooltips, keyboard focus and active-page announcements available behind the new icons.

### Small screens, less furniture

- Keep search visible and put additional mobile/tablet filters behind an expandable panel with an active-filter count.
- Remove the mobile Home Assistant menu button as requested; the existing swipe from the left edge still opens the sidebar.
- Hide the large brand header on phones and keep the action buttons in a compact row.
- Stack the Point Inspector title and actions so long BACnet names stop trying to squeeze through the keyhole sideways.
- Keep the table dense and preserve changed-row updates, mouseover refresh and active-input protection from 1.4.3.

### Under the glass

- Centralize the Engelsoft appearance tokens and move the existing structural CSS out of the main view implementation.
- Rebuild the production frontend and refresh its cache identifier to `0694`.
- Preserve existing entity IDs, BACnet settings and transport behavior. This makeover does not rewire the house.

### Validation and updating

29 targeted local regression tests, frontend type checking and syntax checks passed. The design was checked with demo data in six browser layouts from 320 to 1440 pixels, including light/dark views, search, menu gestures and updates while hovering. This is browser validation, not a live Home Assistant installation test.

Update through HACS and restart Home Assistant to load the new panel registration. Reload the Explorer without the browser cache if needed. Expected integration version: `1.5.0`; frontend build: `0694`.
