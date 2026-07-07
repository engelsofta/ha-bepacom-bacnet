# Contributing

Thanks for considering contributing to Bepacom BACnet/IP.

## Development setup

1. Clone the repository.
2. Copy `custom_components/bepacom` into your Home Assistant test instance.
3. Restart Home Assistant.
4. Enable debug logging when testing communication issues.

Example logger configuration:

```yaml
logger:
  default: info
  logs:
    custom_components.bepacom: debug
```

## Bug reports

Please include:

- Home Assistant version
- Integration version
- Gateway model/version
- Relevant logs
- Whether cyclic polling is enabled
- Whether Snapshot WebSocket mode is enabled
- Number of subscribed objects
