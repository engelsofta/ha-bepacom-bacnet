"""Discovery engine for Bepacom BACnet objects."""

from __future__ import annotations

import logging

from .models import BacnetDevice, BacnetObject

_LOGGER = logging.getLogger(__name__)



class DiscoveryEngine:
    """Discovers BACnet devices and objects from the raw API."""

    def __init__(self) -> None:
        """Initialize discovery."""
        self.devices: dict[str, BacnetDevice] = {}
        self.objects: dict[str, BacnetObject] = {}
        self._last_summary_signature: tuple[int, int, tuple[tuple[str, int], ...]] | None = None

    def clear(self) -> None:
        """Clear current discovery cache."""
        self.devices.clear()
        self.objects.clear()

    def parse(self, data: dict) -> None:
        """Parse the complete Bepacom JSON."""

        self.clear()

        if not isinstance(data, dict):
            _LOGGER.warning("Discovery received invalid data.")
            return

        for device_key, device_data in data.items():

            if not device_key.startswith("device:"):
                continue

            device_id = device_key.split(":")[1]

            device = BacnetDevice(
                device_id=device_id,
                name=device_data.get("objectName", f"Device {device_id}"),
                vendor=device_data.get("vendorName"),
                model=device_data.get("modelName"),
                firmware=device_data.get("firmwareRevision"),
            )

            self.devices[device_id] = device

            self._parse_device(device, device_data)

        self._print_summary()

    def _parse_device(
        self,
        device: BacnetDevice,
        device_data: dict,
    ) -> None:
        """Parse one BACnet device."""

        for key, value in device_data.items():

            if ":" not in key:
                continue

            object_type, object_id = key.split(":", 1)

            if not isinstance(value, dict):
                continue

            obj = BacnetObject(
                device_id=device.device_id,
                object_id=object_id,
                object_type=object_type,
            )

            obj.update(value)

            device.add_object(obj)

            self.objects[obj.unique_id] = obj

    def _print_summary(self) -> None:
        """Write discovery summary to the log."""

        counter: dict[str, int] = {}

        for obj in self.objects.values():
            counter[obj.object_type] = counter.get(obj.object_type, 0) + 1

        summary_signature = (
            len(self.devices),
            len(self.objects),
            tuple(sorted(counter.items())),
        )

        if summary_signature == self._last_summary_signature:
            return

        self._last_summary_signature = summary_signature

        _LOGGER.info("========== Bepacom Discovery ==========")
        _LOGGER.info("Devices found : %s", len(self.devices))
        _LOGGER.info("Objects found : %s", len(self.objects))

        for object_type in sorted(counter):
            _LOGGER.info(
                "%-20s %5d",
                object_type,
                counter[object_type],
            )

        _LOGGER.info("=======================================")
