# Engelsoft Beacon BACnet/IP 1.5.7

## 1.5.7 - 2026-10-20

**No ghosts in the header. Just a gateway with a blush.**

- Make the sticky table header fully opaque in light and dark mode. Scrolling rows have been politely asked to stop photobombing the column titles.
- Match Beacon's main heading to CoverControl's font family, weight, and responsive 28–38 px sizing. The siblings finally agreed on a dress code.
- Give the bottom BACstac add-on button a subtle red tint, with matching hover and light-theme colors. The gateway is blushing, not reporting a fire.
- Rebuild the production frontend and advance the cache identifier to `0719`. Fresh paint deserves a fresh browser invitation.

### Validation and updating

All 13 Explorer regression tests and frontend type checking passed locally; the production bundle was rebuilt. Publication follows successful Tests, Validate, HACS, and Hassfest checks on the release commit. Live Home Assistant appearance and installation have not been verified in this session.

Update through HACS and restart Home Assistant to load the new panel registration. Expected integration version: 1.5.7; frontend build: 0719.