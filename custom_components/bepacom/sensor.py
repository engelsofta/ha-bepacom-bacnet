"""Sensor platform for the Bepacom integration."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import BepacomCoordinator
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

    # Erstelle Sensoren für alle erkannten BACnet-Objekte
    entities: list[SensorEntity] = []

    for obj in coordinator.discovery.objects.values():
        entities.append(BepacomSensor(coordinator, obj))

    if entities:
        async_add_entities(entities)
        _LOGGER.info("Added %d sensor entities", len(entities))
    else:
        _LOGGER.info("No BACnet objects found to create sensors")


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
        self._attr_name = obj.object_name or f"{obj.object_type} {obj.object_id}"
        self._attr_native_unit_of_measurement = obj.units
        self._attr_extra_state_attributes = {
            "device_id": obj.device_id,
            "object_id": obj.object_id,
            "object_type": obj.object_type,
            "description": obj.description,
            "writable": obj.writable,
        }

    @property
    def native_value(self) -> Any:
        """Return the state of the sensor."""
        # Aktualisiere das Objekt aus den neuesten Daten
        if self.coordinator.data:
            device_key = f"device:{self._obj.device_id}"

            if device_key in self.coordinator.data:
                device_data = self.coordinator.data[device_key]

                obj_key = f"{self._obj.object_type}:{self._obj.object_id}"

                if obj_key in device_data:
                    obj_data = device_data[obj_key]

                    if isinstance(obj_data, dict):
                        self._obj.update(obj_data)

        return self._obj.present_value

    @property
    def available(self) -> bool:
        """Return whether the entity is available."""
        return self.coordinator.last_update_success
