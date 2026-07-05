"""Switch platform for the Bepacom integration."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import BepacomCoordinator
from .entity_factory import BacnetObjectTypeMapper, EntityType
from .exceptions import WriteError
from .models import BacnetObject

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up switch entities from a config entry."""

    coordinator: BepacomCoordinator = hass.data[DOMAIN][entry.entry_id][
        "coordinator"
    ]

    # Create switches for binary output objects
    entities: list[SwitchEntity] = []

    for obj in coordinator.discovery.objects.values():
        entity_type = BacnetObjectTypeMapper.get_entity_type(obj)

        if entity_type == EntityType.SWITCH:
            entities.append(BepacomSwitch(coordinator, obj))

    if entities:
        async_add_entities(entities)
        _LOGGER.info("Added %d switch entities", len(entities))


class BepacomSwitch(CoordinatorEntity[BepacomCoordinator], SwitchEntity):
    """Represents a Bepacom BACnet switch (binary output) entity."""

    def __init__(
        self,
        coordinator: BepacomCoordinator,
        obj: BacnetObject,
    ) -> None:
        """Initialize the switch."""
        super().__init__(coordinator)

        self._obj = obj
        self._attr_unique_id = obj.unique_id
        display_name, has_entity_name = BacnetObjectTypeMapper.get_display_name(obj)
        self._attr_name = display_name
        self._attr_has_entity_name = has_entity_name
        self._attr_device_info = self._build_device_info()
        self._attr_extra_state_attributes = {
            "device_id": obj.device_id,
            "object_id": obj.object_id,
            "object_type": obj.object_type,
            "description": obj.description,
            "writable": obj.writable,
        }

    def _build_device_info(self) -> DeviceInfo:
        """Build Home Assistant device info for this BACnet device."""
        device = self.coordinator.discovery.devices.get(self._obj.device_id)
        if device is None:
            return DeviceInfo(
                identifiers={(DOMAIN, f"device_{self._obj.device_id}")},
                name=f"Device {self._obj.device_id}",
            )

        return DeviceInfo(
            identifiers={(DOMAIN, f"device_{self._obj.device_id}")},
            name=device.name,
            manufacturer=device.vendor,
            model=device.model,
            sw_version=device.firmware,
        )

    @property
    def is_on(self) -> bool | None:
        """Return True if switch is on."""
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

        value = self._obj.present_value

        if value is None:
            return None

        # Handle common boolean representations
        if isinstance(value, bool):
            return value
        elif isinstance(value, (int, float)):
            return value != 0
        elif isinstance(value, str):
            return value.lower() in ("true", "yes", "on", "1")

        return bool(value)

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Turn the switch on."""
        if not self._obj.writable:
            _LOGGER.error(
                "Cannot write to non-writable switch %s",
                self._obj.unique_id,
            )
            return

        try:
            client = self.coordinator.client
            await client.async_write_property(
                device_id=self._obj.device_id,
                object_type=self._obj.object_type,
                object_id=self._obj.object_id,
                value=True,
            )
            
            # Force coordinator update to reflect new state
            await self.coordinator.async_request_refresh()
            
        except WriteError as err:
            _LOGGER.error(
                "Failed to turn on switch %s: %s",
                self._obj.unique_id,
                err,
            )
        except Exception as err:
            _LOGGER.exception(
                "Unexpected error turning on switch %s",
                self._obj.unique_id,
            )

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn the switch off."""
        if not self._obj.writable:
            _LOGGER.error(
                "Cannot write to non-writable switch %s",
                self._obj.unique_id,
            )
            return

        try:
            client = self.coordinator.client
            await client.async_write_property(
                device_id=self._obj.device_id,
                object_type=self._obj.object_type,
                object_id=self._obj.object_id,
                value=False,
            )
            
            # Force coordinator update to reflect new state
            await self.coordinator.async_request_refresh()
            
        except WriteError as err:
            _LOGGER.error(
                "Failed to turn off switch %s: %s",
                self._obj.unique_id,
                err,
            )
        except Exception as err:
            _LOGGER.exception(
                "Unexpected error turning off switch %s",
                self._obj.unique_id,
            )

    @property
    def available(self) -> bool:
        """Return whether the entity is available."""
        return self.coordinator.last_update_success
