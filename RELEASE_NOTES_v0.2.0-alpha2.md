# v0.2.0-alpha2 - Write Support & Entity Type Detection

**Release Date:** 2026-07-05

## 🎉 Major Features

### Phase 1.1: Intelligent Entity Type Detection ✅
- **Entity Factory** (`entity_factory.py`) for automatic BACnet→HA type mapping
- Automatic device class detection (temperature, humidity, pressure, power, energy, CO2, PM2.5, PM10)
- State class support (measurement, total_increasing)
- Unit of measurement auto-detection

### Phase 1.2: Write Operations Support ✅
- **async_write_property()** in BepacomClient
- Full write support for **switches** (turn on/off)
- Full write support for **number entities** (set analog values)
- BACnet priority parameter support (default: priority 8)
- Automatic coordinator refresh after write operations
- Comprehensive error handling with WriteError exception

## 📊 Entity Types Supported

| BACnet Type | HA Platform | Mode |
|---|---|---|
| `analog_input` | Sensor | Read-Only |
| `analog_output` | Number | Read/Write |
| `binary_input` | Binary Sensor | Read-Only |
| `binary_output` | Switch | Read/Write |
| `temperature_sensor` | Sensor (temp) | Read-Only |
| `humidity_sensor` | Sensor (humidity) | Read-Only |
| Other specialized inputs | Sensor | Read-Only |

## 🚀 What's New in v0.2.0-alpha2

- ✅ Switch entities now fully functional with UI controls
- ✅ Number entities with slider/input field for analog values
- ✅ Proper error logging for failed write operations
- ✅ Auto-refresh coordinator after successful write
- ✅ WriteError exception for write operation failures
- ✅ POST `/apiv1/write-property` endpoint integration
- ✅ Support for non-writable objects (read-only enforcement)

## 🔧 Technical Details

### Write Operation Flow
```
User turns switch ON/OFF
  → async_turn_on/async_turn_off called
  → BepacomClient.async_write_property() executes
  → POST /apiv1/write-property with payload
  → Response validation (success flag check)
  → Coordinator.async_request_refresh()
  → UI updates with new state
```

### Payload Format
```json
{
  "device_id": "device_123",
  "object_type": "binary_output",
  "object_id": "1",
  "value": true,
  "priority": 8
}
```

## 📋 Installation

1. Add custom repository in HACS:
   - URL: `https://github.com/engelsofta/bepacom`
   - Category: Integration
2. Install "Bepacom BACnet/IP"
3. Restart Home Assistant
4. Configure in Settings > Devices & Services > Bepacom

## ⚙️ Configuration

**Settings > Devices & Services > Create New > Bepacom**

- **Host:** IP address of Bepacom gateway (e.g., 192.168.1.100)
- **Port:** Gateway port (default: 8099)

## 🗺️ Roadmap - Next Phases

### Phase 2: WebSocket Subscriptions (Planned)
- Real-time entity updates via WebSocket
- Replace 5-second polling with event-driven architecture
- Reduced network load

### Phase 3: Climate Platform (Planned)
- HVAC control through BACnet
- Setpoint management
- Mode control (heat, cool, auto, off)

### Phase 4: Advanced Features
- Min/Max value validation for numbers
- Priority selection UI for write operations
- Write confirmation dialogs
- Batch operations

## 🐛 Known Limitations

- Entity names may not be unique if gateway returns duplicate/missing object names
  - **Workaround:** Rename entities in Home Assistant
- Write confirmations not yet implemented
- Priority selection not available in UI (hardcoded to priority 8)
- No min/max value constraints on number entities
- 5-second polling interval (will be replaced with WebSocket in Phase 2)

## 📝 Version History

- **v0.2.0-alpha1** (2026-07-05) - Initial entity type detection
- **v0.1.0-alpha1** (2026-07-05) - Initial Bepacom integration

## 🤝 Contributing

Issues, suggestions, and PRs welcome at:
[github.com/engelsofta/bepacom](https://github.com/engelsofta/bepacom)

## 📄 License

See LICENSE file in repository
