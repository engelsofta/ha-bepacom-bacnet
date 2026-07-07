"""Sensor platform for the Bepacom integration."""

from __future__ import annotations

import logging
import re
from decimal import Decimal, InvalidOperation
from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import EntityCategory
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import BepacomCoordinator
from .entity_factory import BacnetObjectTypeMapper, EntityType
from .models import BacnetObject

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up sensor entities from a config entry."""

    coordinator: BepacomCoordinator = hass.data[DOMAIN][entry.entry_id][
        "coordinator"
    ]

    # Create sensors for read-only analog/sensor objects
    entities: list[SensorEntity] = []

    for obj in coordinator.discovery.objects.values():
        entity_type = BacnetObjectTypeMapper.get_entity_type(obj)

        if entity_type == EntityType.SENSOR:
            entities.append(BepacomSensor(coordinator, obj))

    entities.append(BepacomDiagnosticsSensor(coordinator, entry.entry_id))

    if entities:
        async_add_entities(entities)
        _LOGGER.info("Added %d sensor entities", len(entities))


class BepacomDiagnosticsSensor(CoordinatorEntity[BepacomCoordinator], SensorEntity):
    """Diagnostic sensor for the Bepacom WebSocket connection."""

    _attr_has_entity_name = True
    _attr_name = "WebSocket Diagnose"
    _attr_icon = "mdi:lan-connect"
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(
        self,
        coordinator: BepacomCoordinator,
        entry_id: str,
    ) -> None:
        """Initialize diagnostic sensor."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{entry_id}_websocket_diagnostics"

    @property
    def native_value(self) -> str:
        """Return diagnostic state."""
        diagnostics = self.coordinator.websocket_diagnostics
        return "connected" if diagnostics.get("connected") else "disconnected"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return WebSocket diagnostics."""
        return self.coordinator.websocket_diagnostics


class BepacomSensor(CoordinatorEntity[BepacomCoordinator], SensorEntity):
    """Represents a Bepacom BACnet sensor entity."""

    def __init__(
        self,
        coordinator: BepacomCoordinator,
        obj: BacnetObject,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)

        self._obj = obj
        self._attr_unique_id = obj.unique_id
        display_name, has_entity_name = BacnetObjectTypeMapper.get_display_name(obj)
        self._attr_name = display_name
        self._attr_has_entity_name = has_entity_name
        self._attr_native_unit_of_measurement = BacnetObjectTypeMapper.get_unit_of_measurement(
            obj
        )
        self._attr_device_class = BacnetObjectTypeMapper.get_device_class(obj)
        self._attr_state_class = BacnetObjectTypeMapper.get_state_class(obj)
        self._attr_suggested_display_precision = self._suggested_precision_from_resolution(
            obj.resolution
        )
        self._attr_device_info = self._build_device_info()
        self._attr_extra_state_attributes = self._build_extra_state_attributes()

    def _build_device_info(self) -> DeviceInfo:
        """Build Home Assistant device info for this BACnet device."""
        device = self.coordinator.discovery.devices.get(self._obj.device_id)
        return BacnetObjectTypeMapper.build_device_info(
            domain=DOMAIN,
            obj=self._obj,
            device=device,
        )

    def _get_bacnet_attr(self, name: str, default: Any = None) -> Any:
        """Return a BACnet object attribute using snake_case or camelCase names."""
        if hasattr(self._obj, name):
            return getattr(self._obj, name)

        parts = name.split("_")
        camel_name = parts[0] + "".join(part.title() for part in parts[1:])

        if hasattr(self._obj, camel_name):
            return getattr(self._obj, camel_name)

        return default

    @staticmethod
    def _suggested_precision_from_resolution(resolution: Any) -> int | None:
        """Convert BACnet resolution to Home Assistant display precision.

        Examples:
        - 1      -> 0 decimals
        - 0.1    -> 1 decimal
        - 0.01   -> 2 decimals
        - 0.001  -> 3 decimals
        """
        if resolution in (None, "", "unknown", "unavailable"):
            return None

        try:
            decimal_resolution = Decimal(str(resolution)).normalize()
        except (InvalidOperation, ValueError, TypeError):
            return None

        if decimal_resolution <= 0:
            return None

        exponent = decimal_resolution.as_tuple().exponent

        if exponent >= 0:
            return 0

        return min(abs(exponent), 6)

    @staticmethod
    def _format_reliability(reliability: Any) -> str:
        """Return a readable BACnet reliability value."""
        value = str(reliability).strip()

        known_values = {
            "noFaultDetected": "OK",
            "no-fault-detected": "OK",
            "no_fault_detected": "OK",
            "noSensor": "No sensor",
            "no-sensor": "No sensor",
            "overRange": "Over range",
            "over-range": "Over range",
            "underRange": "Under range",
            "under-range": "Under range",
            "openLoop": "Open loop",
            "open-loop": "Open loop",
            "shortedLoop": "Shorted loop",
            "shorted-loop": "Shorted loop",
            "unreliableOther": "Unreliable other",
            "unreliable-other": "Unreliable other",
            "processError": "Process error",
            "process-error": "Process error",
            "multiStateFault": "Multi-state fault",
            "multi-state-fault": "Multi-state fault",
            "configurationError": "Configuration error",
            "configuration-error": "Configuration error",
            "communicationFailure": "Communication failure",
            "communication-failure": "Communication failure",
            "memberFault": "Member fault",
            "member-fault": "Member fault",
            "monitoredObjectFault": "Monitored object fault",
            "monitored-object-fault": "Monitored object fault",
            "tripped": "Tripped",
        }

        if value in known_values:
            return known_values[value]

        words = value.replace("-", " ").replace("_", " ")
        words = re.sub(r"(?<!^)(?=[A-Z])", " ", words)
        return words[:1].upper() + words[1:]

    def _build_extra_state_attributes(self) -> dict[str, Any]:
        """Build extra attributes from BACnet metadata."""
        attrs: dict[str, Any] = {
            "device_id": self._obj.device_id,
            "object_id": self._obj.object_id,
            "object_type": self._obj.object_type,
            "description": self._obj.description,
            "writable": self._obj.writable,
        }

        optional_attrs = {
            "bacnet_unit": self._get_bacnet_attr("units"),
            "resolution": self._get_bacnet_attr("resolution"),
            "out_of_service": self._get_bacnet_attr("out_of_service"),
            "cov_increment": self._get_bacnet_attr("cov_increment"),
        }

        for key, value in optional_attrs.items():
            if value is not None:
                attrs[key] = value

        reliability = self._get_bacnet_attr("reliability")
        if reliability is not None:
            attrs["reliability"] = self._format_reliability(reliability)

        status_flags = self._get_bacnet_attr("status_flags")

        if status_flags is not None:
            normalized_flags = self._normalize_status_flags(status_flags)
            attrs["status_flags"] = normalized_flags if normalized_flags else status_flags

        return attrs

    @staticmethod
    def _normalize_status_flags(status_flags: Any) -> dict[str, Any]:
        """Normalize BACnet statusFlags to readable Home Assistant attributes."""
        flag_names = ("in_alarm", "fault", "overridden", "out_of_service")

        if isinstance(status_flags, dict):
            normalized: dict[str, Any] = {}

            for flag_name in flag_names:
                camel_name = flag_name.split("_")[0] + "".join(
                    part.title() for part in flag_name.split("_")[1:]
                )

                if flag_name in status_flags:
                    normalized[flag_name] = bool(status_flags[flag_name])
                elif camel_name in status_flags:
                    normalized[flag_name] = bool(status_flags[camel_name])

            return normalized

        if isinstance(status_flags, (list, tuple)) and len(status_flags) >= 4:
            return {
                flag_name: bool(status_flags[index])
                for index, flag_name in enumerate(flag_names)
            }

        if isinstance(status_flags, str):
            values = [
                flag.strip().lower().replace("-", "_").replace(" ", "_")
                for flag in status_flags.split(",")
                if flag.strip()
            ]

            if len(values) >= 4 and all(value in {"0", "1", "false", "true"} for value in values[:4]):
                return {
                    flag_name: values[index] in {"1", "true"}
                    for index, flag_name in enumerate(flag_names)
                }

            return {
                flag_name: flag_name in values
                for flag_name in flag_names
            }

        return {}


    @property
    def native_value(self) -> Any:
        """Return the state of the sensor."""
        # Update the object from latest data
        if self.coordinator.data:
            device_key = f"device:{self._obj.device_id}"

            if device_key in self.coordinator.data:
                device_data = self.coordinator.data[device_key]

                obj_key = f"{self._obj.object_type}:{self._obj.object_id}"

                if obj_key in device_data:
                    obj_data = device_data[obj_key]

                    if isinstance(obj_data, dict):
                        self._obj.update(obj_data)
                        display_name, has_entity_name = (
                            BacnetObjectTypeMapper.get_display_name(self._obj)
                        )
                        self._attr_name = display_name
                        self._attr_has_entity_name = has_entity_name
                        self._attr_native_unit_of_measurement = (
                            BacnetObjectTypeMapper.get_unit_of_measurement(self._obj)
                        )
                        self._attr_device_class = BacnetObjectTypeMapper.get_device_class(
                            self._obj
                        )
                        self._attr_state_class = BacnetObjectTypeMapper.get_state_class(
                            self._obj
                        )
                        self._attr_extra_state_attributes = (
                            self._build_extra_state_attributes()
                        )

        value = self._obj.present_value
        if value is None:
            return None

        if isinstance(value, bool):
            return value

        if BacnetObjectTypeMapper.should_native_value_be_float(self._obj):
            try:
                return float(value)
            except (TypeError, ValueError):
                _LOGGER.warning(
                    "Cannot convert %s to float for %s",
                    value,
                    self._obj.unique_id,
                )
                return None

        if isinstance(value, str):
            return value

        if isinstance(value, (int, float)):
            return float(value)

        return str(value)

    @property
    def available(self) -> bool:
        """Return whether the entity is available."""
        return self.coordinator.last_update_success
