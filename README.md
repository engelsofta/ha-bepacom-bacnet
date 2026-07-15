# Bepacom BACnet/IP for Home Assistant

![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2026.6.0%2B-41BDF5)
![HACS](https://img.shields.io/badge/HACS-Custom-orange)

The Bepacom integration connects BACnet/IP data points from a Bepacom gateway to Home Assistant. It automatically discovers supported BACnet objects, creates suitable Home Assistant entities, and updates them primarily through WebSocket/COV notifications. The integrated **BACnet Explorer** provides a central interface for managing, customizing, and diagnosing BACnet points.

> [!IMPORTANT]
> This integration requires the add-on from **[Bepacom-Raalte/bepacom-HA-Addons](https://github.com/Bepacom-Raalte/bepacom-HA-Addons)**. The add-on provides the Bepacom HTTP and WebSocket API used by this integration. The integration will not work unless the add-on is installed, running, and reachable from Home Assistant.

## Features

- automatic discovery of BACnet devices and objects exposed by the Bepacom gateway
- configuration through the Home Assistant user interface
- stable entity IDs using the format `bepacom_<device>_<object-type>_<object-id>`
- automatic mapping to `sensor`, `binary_sensor`, `number`, and `switch` entities
- normalization of common BACnet engineering units
- automatic Home Assistant device-class and state-class detection
- WebSocket/COV push updates
- fallback polling when subscriptions are unavailable or fail
- automatic reconnects, heartbeat monitoring, and duplicate push suppression
- direct writes to Analog Value, Multi-State Output, and Binary Value objects
- configurable BACnet write priority
- services for releasing BACnet priority slots
- dedicated GLT/AS write profiles
- integrated BACnet Explorer in the Home Assistant sidebar
- per-point entity overrides and runtime settings
- virtual binary sensors derived from numeric or multi-state BACnet values
- diagnostics, recent value history, and data export
- support for multiple Bepacom connections

## Requirements

- Home Assistant `2026.6.0` or newer
- HACS for the recommended custom-repository installation
- the **[Bepacom Home Assistant Add-on](https://github.com/Bepacom-Raalte/bepacom-HA-Addons)** installed and running
- network access from Home Assistant to the add-on's HTTP and WebSocket API
- TCP port `8099` by default, unless configured differently in the add-on

The integration is not a standalone BACnet/IP stack. BACnet communication, discovery, and the gateway API are provided by the Bepacom add-on.

## Installation

### 1. Install the Bepacom add-on

Install the add-on from:

**[github.com/Bepacom-Raalte/bepacom-HA-Addons](https://github.com/Bepacom-Raalte/bepacom-HA-Addons)**

Configure and start the add-on. Verify that its HTTP API is reachable from Home Assistant. The integration uses port `8099` by default.

### 2. Install through HACS

1. Open HACS in Home Assistant.
2. Open **Integrations**.
3. Open the menu in the upper-right corner and select **Custom repositories**.
4. Enter the URL of this GitHub repository.
5. Select **Integration** as the category.
6. Install **Bepacom**.
7. Restart Home Assistant completely.

### 3. Manual installation

1. Copy the `custom_components/bepacom` directory into the `custom_components` directory of your Home Assistant configuration.
2. The resulting path must contain `config/custom_components/bepacom/manifest.json`.
3. Restart Home Assistant completely.

## Setup

1. Open **Settings → Devices & services**.
2. Select **Add integration**.
3. Search for **Bepacom**.
4. Enter the host/IP address and port of the Bepacom API.
5. Confirm the setup.

| Setting | Description | Default |
|---|---|---:|
| Host | IP address or hostname of the Bepacom add-on | – |
| Port | Port of the HTTP/WebSocket API | `8099` |

After the initial full BACnet inventory has been loaded, the integration creates devices and entities. The **BACnet Explorer** is also added to the Home Assistant sidebar.

## Supported BACnet objects

The final entity mapping takes the BACnet object type, write capability, and available metadata into account.

| BACnet object type | Home Assistant entity | Writable |
|---|---|---|
| Analog Input | Sensor | no |
| Analog Value | Number | yes |
| Analog Output | Number | when supported by the gateway |
| Binary Input | Binary Sensor | no |
| Binary Value | Switch | yes |
| Binary Output | Switch | when supported by the gateway |
| Multi-State Input | Sensor | no |
| Multi-State Output | Number | yes |
| Temperature Sensor | Sensor | no |
| Humidity Sensor | Sensor | no |
| Pressure Sensor | Sensor | no |
| Loop | Sensor | depends on gateway metadata |

Unknown internal or proprietary objects are not exposed as arbitrary Home Assistant sensors. Writable inputs may be represented as `number` entities when the gateway metadata marks them as writable.

## BACnet Explorer

The BACnet Explorer is the central management and diagnostics interface. It provides:

- search and filtering by device, object type, name, description, entity ID, and state
- BACnet path, object ID, current value, and metadata inspection
- enabling and disabling individual BACnet points
- entity name and entity ID editing
- unit, device-class, and state-class overrides
- minimum, maximum, and step configuration for Number entities
- subscription and polling selection
- configurable polling intervals
- write-priority and write-profile selection
- direct test writes to supported BACnet objects
- linked Home Assistant entity information
- creation, editing, duplication, and deletion of virtual binary sensors
- runtime diagnostics for push updates, polling, value changes, and suppressed duplicates
- recent value-change history
- JSON, CSV, and Excel-compatible export
- bulk editing of multiple BACnet points

Changes that affect the Home Assistant entity type or registry metadata may require an integration reload or a Home Assistant restart before they become fully effective.

## Updates and data flow

### WebSocket/COV

The integration primarily uses the WebSocket subscriptions provided by the gateway. Only actual value changes are forwarded to the affected Home Assistant entity. Identical snapshot values and duplicate push messages are filtered before they create unnecessary Home Assistant state updates.

### Fallback polling

If a subscription cannot be established for a BACnet point, the integration automatically enables targeted fallback polling. The default interval is 30 seconds. An optional periodic full refresh can also be enabled in the integration settings.

### Connection monitoring

WebSocket connections are monitored through a heartbeat timeout. When a connection is lost, the integration reconnects with a bounded backoff and restores its subscriptions. Diagnostics in the Explorer distinguish raw BACnet notifications, processed object updates, suppressed duplicates, callbacks, and polling updates.

## Global options

Open **Settings → Devices & services → Bepacom → Configure** to access the global runtime options:

| Option | Description |
|---|---|
| Periodic data refresh | enables regular full BACnet database refreshes |
| Snapshot WebSocket mode | supports gateways that send complete snapshots instead of individual object updates |
| Log push values | logs received push values for troubleshooting |
| Heartbeat timeout | controls when an inactive WebSocket connection is considered disconnected |

Object-specific settings are managed exclusively through the BACnet Explorer.

## Writing BACnet values

### Direct writes

The `direct` profile writes the requested value using the BACnet priority configured for that point. Priority `8` is used by default.

After a write, the integration briefly waits for a push confirmation. If no confirmation arrives, it reads only the affected BACnet object. A full BACnet database refresh is used only as a final fallback.

### “GLT → set value → AS” write profile

This profile is intended for Analog Value objects where the same object ID is used for GLT/AS control and the setpoint:

1. switch the associated Binary Value to GLT control
2. wait for the configured GLT delay
3. write the Analog Value
4. wait for the configured AS delay
5. switch the Binary Value back to AS control
6. optionally release the Binary Value and Analog Value priority slots

The integration attempts to return control to AS even if the actual value write fails.

### “GLT → set stage” write profile

This profile is intended for Multi-State Output objects:

1. switch the associated Binary Value to GLT control
2. wait for the configured GLT delay
3. write the requested stage to the Multi-State Output

## Releasing BACnet priorities

The integration registers three Home Assistant actions:

- `bepacom.release_analog_value_priority`
- `bepacom.release_multistate_output_priority`
- `bepacom.release_binary_value_priority`

Example for releasing Binary Value priority 8:

```yaml
action: bepacom.release_binary_value_priority
data:
  device_id: 1
  object_id: 82476
  priority: 8
```

Example for a Multi-State Output:

```yaml
action: bepacom.release_multistate_output_priority
data:
  device_id: 1
  object_id: 82476
  priority: 8
```

When multiple Bepacom connections are configured, `config_entry_id` must also be supplied.

After releasing a priority, some gateways return an empty `presentValue` together with `relinquishDefault`. In that case, the integration uses the BACnet fallback value so Home Assistant does not continue showing a stale commanded state.

## Virtual binary sensors

The Explorer can create virtual Binary Sensor entities from BACnet Sensor and Multi-State Input objects. Each virtual entity supports:

- a custom name and unique ID
- a Home Assistant device class
- a rule for the `on` state
- a rule for the `off` state
- an `unknown` or `unavailable` fallback state

Supported rule formats include:

- individual values, for example `2`
- text values such as `active` or `inactive`
- multiple alternatives, for example `alarm,fault`
- comparisons such as `>2`, `<=10`, `==3`, or `!=0`
- numeric ranges

Virtual entities follow the selected BACnet source object and are updated together with that source.

## Entity IDs and migration

New entities receive stable IDs such as:

```text
sensor.bepacom_1_analoginput_601
number.bepacom_1_multistateoutput_82476
switch.bepacom_1_binaryvalue_82476
```

During startup, the integration attempts to migrate older generated entity IDs to this stable format. Existing entities that already occupy the target ID are never overwritten; a warning is written to the Home Assistant log instead.

## Performance

Version 1.0.0 is designed for larger BACnet installations:

- unchanged push values are filtered before they reach Home Assistant
- only the affected entity writes a new Home Assistant state
- the Explorer periodically loads compact runtime data instead of complete object metadata
- browser updates pause while the Explorer tab is hidden
- write confirmation reads a single object instead of the complete BACnet database
- history is bounded and browser-side history is kept only for the selected point
- failed write confirmations are coalesced into a single full fallback refresh

## Troubleshooting

### The integration cannot be configured

- verify that the Bepacom add-on is running
- check the configured host and port
- verify API reachability from the Home Assistant network
- inspect both the add-on and Home Assistant logs

### An entity does not update

- inspect its subscription and polling status in the BACnet Explorer
- verify that the gateway reports a new BACnet value
- temporarily enable push-value logging if necessary
- check the log for subscription, heartbeat, or fallback-polling messages

### The Explorer shows an old version after updating

1. Restart Home Assistant completely.
2. Reload the browser page while bypassing or clearing the cache.
3. Check the integration version and frontend build displayed in the Explorer header.

### Debug logging

```yaml
logger:
  default: info
  logs:
    custom_components.bepacom: debug
```

Debug logging can produce a large number of messages. Disable it again after troubleshooting.

## Updating

1. Install the new version through HACS, or replace the integration directory manually.
2. Restart Home Assistant completely.
3. Clear or bypass the browser cache if the Explorer still shows the previous frontend build.
4. After major updates, reload the Bepacom integration and review the Explorer diagnostics.

A Home Assistant configuration backup is recommended before updating.

## Privacy and network access

Communication remains local between Home Assistant and the configured Bepacom API. The integration itself does not require a cloud service. Refer to the add-on documentation for any additional network requirements of the gateway service.

## Support

When reporting a problem, please include:

- integration version and frontend build
- Home Assistant version
- Bepacom add-on version and relevant configuration
- affected BACnet device ID, object type, and object ID
- relevant BACnet Explorer diagnostics
- a short debug-log excerpt covering the time of the problem

Please use the GitHub repository's issue tracker for bug reports and feature requests.

## Acknowledgements

This integration relies on the API provided by **[Bepacom-Raalte/bepacom-HA-Addons](https://github.com/Bepacom-Raalte/bepacom-HA-Addons)**. Thank you to the project contributors for providing the Home Assistant/BACnet gateway functionality.
