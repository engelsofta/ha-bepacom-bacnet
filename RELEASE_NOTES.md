# Engelsoft Beacon BACnet/IP 1.5.6

## 1.5.6 - 2026-10-20

**Click responsibly. BACnet is watching.**

- Give the table header Inspector-style tabs, a highlighted sort column, and a sticky seat above scrolling rows. The headings have finally learned to stay put.
- Line up status labels, numbers, and supporting details. The metrics have stopped playing musical chairs.
- Retire the Diagnostics version footer. App and Protocol have left the chat (and the extra divider).
- Hide the Device filter when there is only one device. A one-item guest list does not need a bouncer.
- Shorten filter labels and dress supported dropdown menus in matching rounded surfaces, warm accents, and selection checkmarks. Native menus remain the fallback on other browsers.
- Give Inspector and virtual-entity source boxes matching glass cards. Fit Save, Discard, and Reset into one civilized row.
- Open Home Assistant dialogs only from entity-name links. Values, icons, and spare table space now select the point for the Inspector instead of launching surprise parties.
- Double-click the search field to clear it immediately. Your typo now has an emergency exit.
- Simplify the header by removing its extra brand mark and build label.
- Rebuild the production frontend with cache build `0716`.

### Validation and updating

Frontend type checking, production build, and all 13 Explorer regression tests passed locally. GitHub checks validate the release commit before publication. Live Home Assistant appearance and installation have not been checked in this session.

Update through HACS and restart Home Assistant to load the panel registration. Expected integration version: 1.5.6; frontend build: 0716.