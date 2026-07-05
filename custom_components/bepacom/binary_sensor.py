"""Binary sensor platform for the Bepacom integration."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
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
    """Set up binary sensor entities from a config entry."""

    coordinator: BepacomCoordinator = hass.data[DOMAIN][entry.entry_id][
        "coordinator"
    ]

    # Create binary sensors for BACnet binary input/output objects
    entities: list[BinarySensorEntity] = []

    for obj in coordinator.discovery.objects.values():
        entity_type = BacnetObjectTypeMapper.get_entity_type(obj)

        if entity_type == EntityType.BINARY_SENSOR:
            entities.append(BepacomBinarySensor(coordinator, obj))

    if entities:
        async_add_entities(entities)
        _LOGGER.info("Added %d binary sensor entities", len(entities))


class BepacomBinarySensor(CoordinatorEntity[BepacomCoordinator], BinarySensorEntity):
    """Represents a Bepacom BACnet binary sensor entity."""

    def __init__(
        self,
        coordinator: BepacomCoordinator,
        obj: BacnetObject,
    ) -> None:
        """Initialize the binary sensor."""
        super().__init__(coordinator)

        self._obj = obj
        self._attr_unique_id = obj.unique_id
        self._attr_name = obj.object_name or f"{obj.object_type} {obj.object_id}"
        self._attr_device_class = BacnetObjectTypeMapper.get_device_class(obj)
        self._attr_extra_state_attributes = {
            "device_id": obj.device_id,
            "object_id": obj.object_id,
            "object_type": obj.object_type,
            "description": obj.description,
        }

    @property
    def is_on(self) -> bool | None:
        """Return True if the binary sensor is on."""
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

        # Convert present_value to boolean
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

    @property
    def available(self) -> bool:
        """Return whether the entity is available."""
        return self.coordinator.last_update_success
