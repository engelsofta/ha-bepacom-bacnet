# Changelog

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
