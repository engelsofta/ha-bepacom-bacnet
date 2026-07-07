
<p align="center">
  
  <img width="128" height="128" alt="logo" src="https://github.com/user-attachments/assets/e1b6618b-8a63-4b7b-947b-086aaed87992" />  

</p>

# Bepacom BACnet/IP for Home Assistant

Custom Home Assistant integration for Bepacom BACnet/IP gateways.

## Features

- Local BACnet/IP gateway communication
- Automatic BACnet discovery
- WebSocket subscriptions with live push updates
- One shared WebSocket connection for subscribed objects
- Parallel subscription initialization
- Optional cyclic `/apiv1/json` polling
- Heartbeat monitoring with automatic reconnect
- Automatic subscription renewal after reconnect
- WebSocket diagnostic sensor
- Optional push-value logging for troubleshooting
- BACnet metadata support:
  - `units`
  - `resolution`
  - `statusFlags`
  - `reliability`
  - `covIncrement`
  - `outOfService`

## Recommended configuration

For the currently tested Bepacom gateway behavior:

| Option | Recommended |
|---|---|
| Cyclic data update | Disabled |
| Snapshot WebSocket mode | Disabled |
| Push-value logging | Disabled during normal use |
| Subscribed objects | Select all live values that should update by push |

The tested gateway appears to require an explicit subscription for every object whose value should update reliably. Even with many subscriptions, the integration uses one shared WebSocket connection.

## Installation

### Manual installation

Copy this folder:

```text
custom_components/bepacom
```

to:

```text
/config/custom_components/bepacom
```

Restart Home Assistant, then add the integration:

```text
Settings → Devices & services → Add integration → Bepacom BACnet/IP
```

### HACS custom repository

1. Open HACS.
2. Go to **Integrations**.
3. Open the three-dot menu.
4. Select **Custom repositories**.
5. Add this repository URL.
6. Select category **Integration**.
7. Install and restart Home Assistant.

## Options

The integration options include:

- **Cyclic data update**  
  Enables or disables recurring `/apiv1/json` polling.

- **Snapshot WebSocket mode**  
  Experimental. Uses one gateway subscription and processes configured objects from snapshot payloads. Keep disabled if your gateway requires one subscription per object.

- **WebSocket push-value logging**  
  Logs push payload values for troubleshooting. Keep disabled during normal operation.

- **WebSocket heartbeat timeout**  
  Time in seconds before the WebSocket is considered stale and reconnected.

- **Subscribed objects**  
  BACnet objects that should be updated through WebSocket push.

## Diagnostics

The integration creates a diagnostic WebSocket sensor with attributes such as:

- connection state
- number of subscriptions
- push count
- reconnect count
- last push age
- heartbeat timeout
- polling mode

## Branding

The `brands/bepacom` folder is prepared for a future Home Assistant Brands pull request.

## License

MIT
