# Engelsoft Beacon BACnet/IP for Home Assistant

![Version](https://img.shields.io/badge/Version-1.5.6-gold)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2026.6.0%2B-41BDF5)
![HACS](https://img.shields.io/badge/HACS-Custom-orange)
[![GitHub Downloads](https://img.shields.io/github/downloads/engelsofta/ha-bepacom-bacnet/total?label=Downloads)](https://github.com/engelsofta/ha-bepacom-bacnet/releases)

The Engelsoft Beacon BACnet/IP integration connects BACnet/IP data points from **Engelsoft BACstac** to Home Assistant. It automatically discovers supported BACnet objects, creates suitable Home Assistant entities, and updates them primarily through managed WebSocket/COV notifications. The integrated **BACnet Explorer** provides a central interface for managing, customizing, and diagnosing BACnet points.

> [!IMPORTANT]
> This integration requires the **[Engelsoft BACstac Home Assistant Add-on](https://github.com/engelsofta/engelsoft-bacstac-ha-addon)**. BACstac provides BACnet discovery, managed COV subscriptions, polling, write access, and the local API used by the integration. The integration will not work unless BACstac is installed, running, and reachable from Home Assistant.

## Features

- automatic discovery of BACnet devices and objects exposed by Engelsoft BACstac
- configuration through the Home Assistant user interface
- stable entity IDs using the format `bepacom_<device>_<object-type>_<object-id>`
- automatic mapping to `sensor`, `binary_sensor`, `number`, and `switch` entities, with optional `light` representation for Multi-State Outputs
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
- Engelsoft glass design with RoomControl backgrounds and automatic light/dark appearance
- compact icon navigation, responsive point editing, and collapsible mobile filters
- indexed search that prepares full editor data only for displayed matches
- incremental runtime updates that refresh changed rows while preserving active inputs
- separate Configuration, Live View, and Diagnostics workspaces
- full-width live change log with activity chart and transport filters
- a compact connection and BACnet inventory status strip
- per-point entity overrides and runtime settings
- bulk point editing plus override import and export
- virtual binary sensors derived from numeric or multi-state BACnet values
- Explorer runtime diagnostics, recent value history, and data export
- support for multiple Engelsoft Beacon BACnet/IP connections

## Requirements

- Home Assistant `2026.6.0` or newer
- HACS for the recommended custom-repository installation
- the **[Engelsoft BACstac Home Assistant Add-on](https://github.com/engelsofta/engelsoft-bacstac-ha-addon)** installed and running
- network access from Home Assistant to the add-on's HTTP and WebSocket API
- TCP port `8099` by default, unless configured differently in the add-on

The integration is not a standalone BACnet/IP stack. BACnet communication, discovery, managed COV subscriptions, polling, and the gateway API are provided by Engelsoft BACstac.

## Installation

### 1. Install Engelsoft BACstac

Install the add-on from:

**[github.com/engelsofta/engelsoft-bacstac-ha-addon](https://github.com/engelsofta/engelsoft-bacstac-ha-addon)**

Configure and start BACstac. Verify that its HTTP API is reachable from Home Assistant. The integration uses port `8099` by default.

### 2. Install through HACS

1. Open HACS in Home Assistant.
2. Open the menu in the upper-right corner and select **Custom repositories**.
3. Enter `https://github.com/engelsofta/ha-bepacom-bacnet`.
4. Select **Integration** as the type and add the repository.
5. Find and download **Engelsoft Beacon BACnet/IP**.
6. Restart Home Assistant completely.

See the official [HACS custom repository instructions](https://www.hacs.dev/docs/faq/custom_repositories/) for details.

### 3. Manual installation

1. Copy the `custom_components/bepacom` directory into the `custom_components` directory of your Home Assistant configuration.
2. The resulting path must contain `config/custom_components/bepacom/manifest.json`.
3. Restart Home Assistant completely.

## Setup

1. Open **Settings → Devices & services**.
2. Select **Add integration**.
3. Search for **Engelsoft Beacon BACnet/IP**.
4. Choose **Automatic** to try known local add-on addresses on port `8099`, or **Manual** to enter a host, port, and optional API token. Use Manual for a different port, an external host, or a gateway that requires authentication.
5. Confirm the setup. The connection must pass BACstac Protocol V2 validation.

| Setting | Description | Default |
|---|---|---:|
| Host | IP address or hostname of the Engelsoft BACstac add-on | – |
| Port | Port of the HTTP/WebSocket API | `8099` |
| API token | Token configured in BACstac, if authentication is enabled (manual setup) | empty |

After the initial full BACnet inventory has been loaded, the integration creates devices and entities. The **BACnet Explorer** is also added to the Home Assistant sidebar.

## Supported BACnet objects

The final entity mapping takes the BACnet object type, write capability, and available metadata into account.

| BACnet object type | Home Assistant entity | Writable |
|---|---|---|
| Analog Input | Sensor | no |
| Analog Value | Number | when writable |
| Analog Output | Number | when supported by the gateway |
| Binary Input | Binary Sensor | no |
| Binary Value | Switch | when writable |
| Binary Output | Switch | when supported by the gateway |
| Multi-State Input | Sensor | no |
| Multi-State Output | Number; optionally Switch, Outlet, or Light | when writable |
| Temperature Sensor | Sensor | no |
| Humidity Sensor | Sensor | no |
| Pressure Sensor | Sensor | no |
| Loop | Sensor | depends on gateway metadata |

Gateway write permissions take precedence over the usual object capabilities. Writable objects normally mapped to Sensor may become Number entities. Some unlisted object types are recognized through naming heuristics; unsupported objects do not automatically become entities.

For Multi-State Outputs, the Explorer lets you select Number, Switch, Outlet (a Switch entity with the outlet device class), or Light. Configure the corresponding on/off stages and, optionally, a separate feedback point.

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

After saving point settings, use **Apply changes** when the Explorer indicates pending changes. It applies pending update modes and reloads the integration when entity changes require it. A full Home Assistant restart is normally unnecessary for these edits.

Search responses load at most **2,000 points**. Narrow the search or object-type filter for larger inventories. Point-data exports use the loaded result set; they are not a guaranteed complete inventory export, and local display filters do not necessarily reduce the export.

## Updates and data flow

### WebSocket/COV

The integration primarily uses the WebSocket subscriptions provided by the gateway. Only actual value changes are forwarded to the affected Home Assistant entity. Identical snapshot values and duplicate push messages are filtered before they create unnecessary Home Assistant state updates.

### Managed COV and polling

The integration sends each point's selected update mode to BACstac. In the normal managed snapshot mode, **BACstac owns the COV subscriptions and polling tasks** and sends updates over the shared WebSocket feed. Configure per-point subscription or polling mode and polling intervals in the Explorer, then apply the pending changes.

Fallback behavior also depends on BACstac and the BACnet device. There is no global periodic full-refresh toggle in the integration's current setup interface.

### Connection monitoring

WebSocket connections are monitored through a heartbeat timeout. When a connection is lost, the integration reconnects with a bounded backoff and restores its subscriptions. Diagnostics in the Explorer distinguish raw BACnet notifications, processed object updates, suppressed duplicates, callbacks, and polling updates.

## Runtime settings

Point-specific transport, entity, and write settings are managed through the **BACnet Explorer**. The current integration does not expose a separate global **Configure** options form. Snapshot transport and heartbeat handling are automatic; received push-value logging follows Home Assistant's debug logging level (see below).

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

When multiple Engelsoft Beacon BACnet/IP connections are configured, `config_entry_id` must also be supplied.

After releasing a priority, some gateways return an empty `presentValue` together with `relinquishDefault`. In that case, the integration uses the BACnet fallback value so Home Assistant does not continue showing a stale commanded state.

## Virtual binary sensors

The Explorer can create virtual Binary Sensor entities from a selected BACnet source point. Each virtual entity supports:

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

The integration reduces repeated work in larger BACnet installations:

- unchanged push values are filtered before they reach Home Assistant
- only the affected entity writes a new Home Assistant state
- an indexed search matches points before preparing full editor metadata
- runtime requests return changed point records instead of resending every loaded point
- stable table rows update while the pointer is over the table, while active edits are preserved
- feedback candidates are grouped once per device during point preparation
- browser updates pause while the Explorer tab is hidden
- write confirmation reads a single object instead of the complete BACnet database
- history is bounded and browser-side history is kept only for the selected point
- failed write confirmations are coalesced into a single full fallback refresh

## Troubleshooting

### The integration cannot be configured

- verify that Engelsoft BACstac is running
- check the configured host and port
- verify API reachability from the Home Assistant network
- inspect both the add-on and Home Assistant logs

### An entity does not update

- inspect its subscription and polling status in the BACnet Explorer
- verify that the gateway reports a new BACnet value
- temporarily enable debug logging (see below) to inspect received push values
- check the log for subscription, heartbeat, or fallback-polling messages

### The Explorer shows an old version after updating

1. Restart Home Assistant completely.
2. Reload the browser page while bypassing or clearing the cache.
3. Check the integration version and frontend build displayed in the Explorer desktop header.

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
4. Review the Explorer diagnostics and apply any pending point-setting changes.

A Home Assistant configuration backup is recommended before updating.

## Privacy and network access

Communication remains local between Home Assistant and the configured Engelsoft BACstac API. The integration itself does not require a cloud service. Refer to the BACstac documentation for any additional network requirements of the gateway service.

## Support

When reporting a problem, please include:

- integration version and frontend build
- Home Assistant version
- Engelsoft BACstac version and relevant configuration
- affected BACnet device ID, object type, and object ID
- relevant BACnet Explorer diagnostics
- a short debug-log excerpt covering the time of the problem

Review diagnostics, exports, and logs before sharing them: they may contain addresses, point names, values, or credentials. Remove sensitive information first.

Please use the GitHub repository's issue tracker for bug reports and feature requests.

## Technical compatibility note

The integration domain, installation directory, Home Assistant action names, and existing generated entity IDs retain the internal identifier `bepacom` for backwards compatibility. These identifiers do not indicate support for another gateway and must not be renamed manually. All BACnet gateway functionality documented here targets **[Engelsoft BACstac](https://github.com/engelsofta/engelsoft-bacstac-ha-addon)**.
