# Changelog

## 0.3.8-beta.1

### Added
- Sidebar BACnet Explorer with searchable/filterable object table.
- Grouping by BACnet type or device.
- Details panel with Inspector, Engineering properties, Live Monitor, Write area and Entity Configuration.
- Per-object update mode: Disabled, Push/Subscribe, Polling.
- Tri-state overrides for unit, device class and state class: Automatic, None, custom value.
- Stable BACnet-based entity ID migration.
- Live value-change highlighting with direction-aware animation.
- Push diagnostics and optimized snapshot dispatch lookup.
- Manual integration reload guard in the Explorer.
- Export support for BACnet object data.

### Changed
- Object configuration moved out of the OptionsFlow and into the Sidebar Explorer.
- Global subscribe list and JSON override editor removed from Devices & Services options.
- Polling defaults to off for new entries.
- Status dashboard grouped into configuration and runtime/system values.
- Table layout cleaned up for large BACnet installations.

### Fixed
- Duplicate `analoginput_analoginput` entity IDs through stable suggested IDs and registry migration.
- Sidebar panel registration and browser cache issues.
- Editor save behavior after keyboard/refresh refactors.
- State class handling so `Automatic` does not remove HA statistics accidentally.
- Repeated reload loop when clicking “Integration neu laden”.
- Live Monitor history duplication/mixing across entities.

### Beta notes
- This is a beta release for testing the new Sidebar Explorer workflow.
- Create a Home Assistant backup before installation.
- Existing entity IDs may be migrated to the stable `bepacom_1_<objecttype>_<instance>` scheme.
