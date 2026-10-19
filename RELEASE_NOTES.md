# Engelsoft Beacon BACnet/IP 1.5.1

## 🧘 Keep calm and BACnet on.

The Explorer has finished its enthusiastic phase of highlighting absolutely everything. Your building is still busy. Your screen no longer has to be.

### Less visual caffeine

- Replace the greenish surface tint with neutral, gently warm greys in both light and dark mode. The table has officially stopped cosplaying as a cucumber.
- Combine the top metrics into one quiet status strip with fine separators instead of a small housing estate of individual cards.
- Give object IDs neutral text and use lighter weights for entity names, units and normal transport labels. Gold now has fewer meetings to attend.
- Shrink runtime indicators and remove their glow rings while keeping blue Push/COV and green Polling semantics.
- Make ordinary direct-write markers neutral; keep GLT writing distinct and retain accessible descriptions and tooltips.
- Render Standard and Override labels without decorative pill frames, and remove the colored bars behind object groups.
- Display zero connection failures neutrally. Red is reserved for actual failures, because zero is usually good news.

### Titles have found their proper seats

- Put Explorer, Virtual entities, Live view and Diagnostics beside the Engelsoft Beacon title, separated by a fine gold line, like RoomControl.
- Remove the duplicate heading blocks above Live View and Diagnostics, leaving more room for useful data.
- Give Point Inspector section headings breathing room below the tabs and reduce their size to 16 px; keep the selection hint smaller and quieter.

### Same building, calmer dashboard

- Preserve search, filters, changed-row updates, mobile sidebar swiping and existing BACnet settings.
- Retain the RoomControl backgrounds and the automatic HA light/dark selection.
- Rebuild the production frontend and refresh the cache identifier to `0698`.

### Validation and updating

Local regression tests, frontend type checking and the production build passed. The UI was checked with demo data in six browser layouts from 320 to 1440 pixels, including light/dark views, responsive controls, search and hover updates. Live Home Assistant installation validation remains a separate step.

Update through HACS and restart Home Assistant to load the new panel registration. If the old styling persists, reload the Explorer without the browser cache. Expected version: `1.5.1`; frontend build: `0698`.
