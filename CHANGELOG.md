# Changelog

## 1.2.2 - 2026-08-03

This stable release promotes integration-controlled BACnet transport and adds another round of Explorer usability and diagnostics improvements.

### Added

- Added robust Live View point resolution across different BACnet object notations.
- Live events now resolve their Home Assistant friendly name through device, object type and instance when the raw unique ID differs.
- Added resolved point navigation so clicking such a Live View entry still opens the correct Point Inspector.

### Changed

- Promoted per-object `cov`, `polling` and `disabled` transport synchronization from beta to the stable release channel.
- Enlarged the 60-second activity timeline and made its bars use the complete available width.
- Improved diagnostic card typography, icon sizing, spacing and responsive use of wide screens.
- Improved the contrast of BACnet object-group headings in Home Assistant light themes.

### Fixed

- Fixed Live View entries falling back to raw identifiers such as `(analog-input,[2]201)` even when a matching Home Assistant entity name exists.
- Fixed the activity timeline occupying only part of the available horizontal space on wide displays.
- Fixed overly faint Explorer group labels in light mode.

### Compatibility

- Full per-object transport control requires an Engelsoft BACstac build with `integration_controlled` support.
- Existing gateways continue to work through the legacy compatibility path.
- Existing config entries, entity IDs, overrides and virtual entities are preserved.

## 1.2.1b2 - 2026-08-03

This pre-release introduces integration-controlled BACnet transport selection and completes the light-theme polish.

### Added

- Added per-object transport synchronization from the integration to Engelsoft BACstac.
- Push points are transmitted as `cov`, polling points as `polling`, and disabled points as `disabled`.
- Added automatic restoration of the complete transport profile after WebSocket reconnects.
- Added API and coordinator tests for mixed COV, polling and disabled target profiles.

### Changed

- The integration is now the single source of truth for each entity's requested update mode when BACstac uses `integration_controlled`.
- Managed snapshot mode now listens through one global WebSocket instead of creating an additional trigger COV subscription.
- BACstac remains responsible for COV limits, throttled subscription setup and automatic polling fallbacks.
- Legacy gateways remain compatible and retain integration-side polling fallback behavior.

### Fixed

- Fixed invisible virtual-entity navigation text in Home Assistant light themes.
- Improved contrast for virtual binary-state badges such as **Plugged in**, **Unplugged** and **No light**.
- Improved light-theme icon and settings-button visibility.

### Compatibility

- Full per-object transport control requires an Engelsoft BACstac build with `integration_controlled` support.
- Existing gateways continue to work through the legacy compatibility path.
- Existing config entries, entity IDs, overrides and virtual entities are preserved.

## 1.2.1b1 - 2026-08-02

This patch release refines the BACnet Explorer introduced in version 1.2.0.

### Added

- Added an automatic light interface that follows the active Home Assistant theme.
- Added a system color-scheme fallback when Home Assistant does not expose an explicit theme mode.
- Added push-processing time and push/change efficiency to the persistent top status area.

### Changed

- Renamed the Explorer header to **Beacon BACnet** and simplified its branding area.
- Reworked the interface to match the cleaner Engelsoft NetMan dashboard language.
- Redesigned diagnostics with clearer information groups, larger values and a responsive card grid.
- Combined total points, active entities and disabled points into one compact status card.
- Reduced the height of diagnostics cards and the main navigation.
- Improved Live View tables, filters, badges, spacing and visual hierarchy.
- Removed duplicate summary metrics from Diagnostics when they are already visible in the persistent status area.
- Refined light-theme tables, forms, dropdowns, Point Inspector panels and virtual-entity views.

### Compatibility

- Existing config entries, entities, overrides and virtual entities are unchanged.
- No migration or re-pairing is required when upgrading from 1.2.0.
- The dark appearance remains the default whenever no light theme can be detected.

## 1.2.0 - 2026-07-30

This release contains all changes since version 1.1.6.

### Highlights

- Completely redesigned the BACnet Explorer with a modern Lit 3 and TypeScript frontend.
- Added global **Configuration**, **Live View**, and **Diagnostics** workspaces.
- Added a full-width live log with a 60-second activity chart, filtering, pause and clear controls.
- Added a dedicated diagnostics workspace for connection, subscription, polling and push-processing metrics.
- Added a persistent status strip for BACnet points, active entities, connection state and connection errors.

### Added

- Privacy-safe Home Assistant diagnostics downloads.
- Automated gateway API and diagnostics tests that do not require physical BACnet hardware.
- Reproducible Vite frontend builds, TypeScript checks and pinned frontend dependencies.
- Import and export of Explorer overrides.
- Reload previews showing pending entity changes.
- Immediate editor validation, entity-ID conflict detection and discard controls.
- Device, object-type, runtime, override and transport filters.
- Bulk editing for multiple BACnet points.
- Firmware and transport information in Explorer diagnostics.
- Warnings for writable points using high BACnet priorities.
- Dedicated Point Inspector, virtual entity, technical Inspector and Engineering Properties tabs.

### Changed

- Rebuilt the Explorer interface as reusable Lit components with native templates and declarative events.
- Reorganized Explorer navigation into top-level Configuration, Live View and Diagnostics sections.
- Redesigned the interface with full-width smoked-glass dashboard styling and responsive layouts.
- Moved the Point Inspector collapse control directly between the table and details panel.
- Improved table proportions, group headings, selection behavior and entity-link interaction.
- Improved native dropdown colors and readability in dark mode.
- Expanded the live log to use the available page height.
- Reduced routine log noise and moved normal write activity to debug logging.
- Known network failures now use compact throttled messages without repeated stack traces.
- Sensitive response bodies and BACnet values are no longer written to logs.

### Fixed

- Fixed table scrolling being reset while scrolling or selecting BACnet points.
- Fixed stale point-detail responses replacing a newer selection.
- Fixed live-monitor filters losing focus during refreshes.
- Fixed Live Monitor pause and clear actions while requests are in flight.
- Fixed newly created Multi-State Output switches receiving unstable `device_*` entity IDs.
- Preserved explicitly customized entity IDs during registry normalization.

### Compatibility

- Existing config entries, entity unique IDs, overrides and virtual entities are preserved.
- No configuration migration or re-pairing is required when upgrading from 1.1.6.
- The integration continues to support legacy full-snapshot WebSocket payloads.
- Managed COV targets and optimized delta updates require Engelsoft BACstac.

## 1.1.6 - 2026-07-20

This release contains all changes since version 1.1.1.

### Added

- Added managed COV target support for the optimized Engelsoft BACstac gateway while retaining legacy full-snapshot WebSocket compatibility.
- Added compact WebSocket delta processing and detailed push, subscription and processing diagnostics.
- Added a live change monitor with filtering, pause, clear, rate chart and a 10,000-entry client-side history.
- Added configurable Multi-State Output representation as either a number or switch, including configurable ON/OFF values.
- Added configurable write priorities and GLT/AS write profiles with priority release support.
- Added virtual binary entities managed by Home Assistant and wildcard search in the Explorer.
- Added `cm` as a supported length unit with automatic `distance` device class handling.

### Changed

- Redesigned the BACnet Explorer with a more compact layout, improved search controls and responsive mobile tables.
- Moved the live monitor from the Point Inspector into the runtime dashboard.
- Improved the Point Inspector layout and made its object header and action buttons sticky while scrolling.
- New installations use snapshot WebSocket transport by default; transport handling is now automatic.
- Combined push and value-change runtime statistics into a clearer overview.
- Improved startup inventory readiness checks so temporary gateway startup gaps are tolerated without dropping configured entities.
- Optimized snapshot dispatching to process configured targets instead of repeatedly walking the complete payload.
- Improved entity display names in the live monitor while retaining the Home Assistant entity ID as secondary information.

### Fixed

- Fixed unreliable behavior after repeated integration reloads by preventing duplicate subscription tasks and restoring managed targets safely.
- Fixed legacy Entity Registry overrides that renamed stable BACnet entity IDs back to `device_*` IDs after a reload.
- Fixed deferred Entity Registry override collisions when the requested ID was already occupied.
- Fixed virtual entity states not following Home Assistant updates immediately.
- Fixed the live-monitor filter losing focus during runtime refreshes.
- Fixed the live-monitor Clear and Pause buttons not updating reliably while focused or while a request was in flight.
- Fixed startup handling when one or two previously configured BACnet points are temporarily missing.
- Improved write confirmation and fallback refresh handling for commandable BACnet objects.

### Compatibility

- Existing entity unique IDs, configured point overrides and virtual entities are preserved.
- Automatically generated legacy `device_*` entity IDs are migrated to stable BACnet-based IDs. Custom user-assigned entity IDs remain unchanged.
- The integration continues to understand legacy full-snapshot WebSocket payloads from the original Bepacom add-on. Managed COV and delta optimizations require Engelsoft BACstac.

## 1.1.1 - 2026-07-18

### Added

- Added a BACnet inventory readiness check during startup. The integration waits for the gateway inventory to settle before creating entities.
- Added tolerance for up to two temporarily missing configured points when the remaining relevant inventory is stable.
- Added inventory readiness samples and missing configured points to the integration diagnostics.
- Added wildcard search to the BACnet Explorer. `*` matches any sequence of characters and `?` matches one character.

### Changed

- Limited startup stability evaluation to configured and otherwise relevant BACnet points.
- Virtual entity state indicators now follow Home Assistant state changes directly.
- Adjusted push-processing performance colors for larger installations.

### Fixed

- Updated metadata and translations to pass HACS and Home Assistant Hassfest validation.
- Declared the Home Assistant HTTP dependency and marked YAML configuration as unsupported.
- Improved entity-registry override handling when a point changes between `number` and `switch` representation.
- Improved startup behavior for BACnet gateways that publish their inventory slowly.

## 1.0.0

- Initial stable release.
- Automatic BACnet object discovery and Home Assistant entity creation.
- WebSocket/COV push updates with polling fallback.
- Writable BACnet values and services for releasing priority slots.
- Integrated BACnet Explorer with entity overrides, diagnostics, history and virtual binary sensors.
