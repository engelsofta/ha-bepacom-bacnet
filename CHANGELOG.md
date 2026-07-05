# Changelog

## [0.2.0-alpha2] - 2026-07-05

### Added
- **Write operations support** (Phase 1.2)
  - `async_write_property()` method in BepacomClient
  - Write support for switch entities (turn on/off)
  - Write support for number entities (set value)
  - Priority parameter for BACnet writes (default priority 8)
  - Error handling for write failures
  - Automatic coordinator refresh after write operations

### Changed
- Switch platform: async_turn_on/off now execute actual write operations
- Number platform: async_set_native_value now executes actual write operations
- Both platforms now log and handle write errors properly

### Technical Details
- New `WriteError` exception for write operation failures
- POST endpoint: `/apiv1/write-property`
- Write payload includes: device_id, object_type, object_id, value, priority
- Response validation: checks for `success` flag in response

### Testing
- Fully testable in Home Assistant
- Switches and numbers can now be controlled via UI
- Coordinator auto-refreshes after write to get latest state

### Known Limitations
- No min/max value validation on number entities yet
- No priority selection UI yet (hardcoded to priority 8)
- Write confirmations not yet implemented

## [0.2.0-alpha1] - 2026-07-05

### Added
- **Intelligent entity type detection** (Phase 1.1)
  - Entity factory (`entity_factory.py`) for BACnet type mapping
  - Automatic mapping of BACnet object types to Home Assistant entity types
  - Device class detection (temperature, humidity, pressure, power, energy, CO2, PM2.5, PM10)
  - State class support (measurement, total_increasing)
- Binary sensor platform for digital inputs/outputs
- Number platform for analog writable objects
- Switch platform for binary switches
- Enhanced sensor platform with device class support
- Unit of measurement auto-detection and mapping

### Changed
- Refactored sensor platform to use entity factory
- Updated integration to support multiple platforms: sensor, binary_sensor, switch, number
- Improved entity attributes with device information

### Technical Details
- `BacnetObjectTypeMapper` class for type mapping logic
- Support for:
  - `analog_input` → `sensor` (read-only)
  - `analog_output` → `number` (writable)
  - `binary_input` → `binary_sensor` (read-only)
  - `binary_output` → `switch` (writable)
  - `temperature_sensor`, `humidity_sensor`, etc. → appropriate sensor types
  - Auto-conversion of writable sensors to number entities
- Device class mapping for common sensor types

### Known Limitations
- Write operations not yet implemented (placeholder in switch and number platforms)
- No climate platform yet (planned for v0.3.0)
- Multi-state objects simplified to sensor type (will be expanded later)

### Dependencies
- None (continues using aiohttp, voluptuous)

## [0.1.0-alpha1] - 2026-07-05

### Added
- Initial Bepacom BACnet/IP integration
- Config flow for gateway connection (host + port)
- REST API client for Bepacom gateway communication
- DataUpdateCoordinator for periodic data polling (every 30 seconds)
- Discovery engine to detect BACnet devices and objects
- Sensor platform for monitoring BACnet objects
- HACS support and installation instructions
- German localization (strings.json)

### Known Limitations
- Read-only access (write operations planned for future versions)
- Only simple sensors created (no climate, binary_sensor, etc. yet)
- Alpha stage - breaking changes possible in future versions

### Repository
- GitHub: https://github.com/engelsofta/bepacom
- Documentation: See README.md
