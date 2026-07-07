"""Number platform for the Bepacom integration."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.number import NumberEntity, NumberMode
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
    """Set up number entities from a config entry."""

    coordinator: BepacomCoordinator = hass.data[DOMAIN][entry.entry_id][
        "coordinator"
    ]

    # Create number entities for writable analog objects
    entities: list[NumberEntity] = []

    for obj in coordinator.discovery.objects.values():
        entity_type = BacnetObjectTypeMapper.get_entity_type(obj)

        if entity_type == EntityType.NUMBER:
            entities.append(BepacomNumber(coordinator, obj))

    if entities:
        async_add_entities(entities)
        _LOGGER.info("Added %d number entities", len(entities))


class BepacomNumber(CoordinatorEntity[BepacomCoordinator], NumberEntity):
    """Represents a Bepacom BACnet number (writable analog) entity."""

    def __init__(
        self,
        coordinator: BepacomCoordinator,
        obj: BacnetObject,
    ) -> None:
        """Initialize the number entity."""
        super().__init__(coordinator)

        self._obj = obj
        self._attr_unique_id = obj.unique_id
        display_name, has_entity_name = BacnetObjectTypeMapper.get_display_name(obj)
        self._attr_name = display_name
        self._attr_has_entity_name = has_entity_name
        self._attr_native_unit_of_measurement = (
            BacnetObjectTypeMapper.get_unit_of_measurement(obj)
        )
        self._attr_device_class = BacnetObjectTypeMapper.get_device_class(obj)
        self._attr_mode = NumberMode.BOX
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
        return BacnetObjectTypeMapper.build_device_info(
            domain=DOMAIN,
            obj=self._obj,
            device=device,
        )

    @property
    def native_value(self) -> float | None:
        """Return the current value."""
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

        value = self._obj.present_value

        if value is None:
            return None

        try:
            return float(value)
        except (ValueError, TypeError):
            _LOGGER.warning(
                "Cannot convert %s to float for %s",
                value,
                self._obj.unique_id,
            )
            return None

    async def async_set_native_value(self, value: float) -> None:
        """Set new value."""
        if not self._obj.writable:
            _LOGGER.error(
                "Cannot write to non-writable object %s",
                self._obj.unique_id,
            )
            return

        try:
            client = self.coordinator.client
            await client.async_write_property(
                device_id=self._obj.device_id,
                object_type=self._obj.object_type,
                object_id=self._obj.object_id,
                value=value,
            )
            
            # Force coordinator update to reflect new state
            await self.coordinator.async_request_refresh()
            
        except WriteError as err:
            _LOGGER.error(
                "Failed to set value for %s: %s",
                self._obj.unique_id,
                err,
            )
        except Exception as err:
            _LOGGER.exception(
                "Unexpected error setting value for %s",
                self._obj.unique_id,
            )

    @property
    def available(self) -> bool:
        """Return whether the entity is available."""
        return self.coordinator.last_update_success
