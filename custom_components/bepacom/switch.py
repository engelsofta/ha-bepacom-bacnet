"""Switch platform for the Bepacom integration."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from homeassistant.components.switch import SwitchDeviceClass, SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import BepacomCoordinator
from .entity_factory import BacnetObjectTypeMapper, EntityType
from .exceptions import WriteError
from .models import BacnetObject
from .override_manager import BepacomOverrideManager

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

    overrides = BepacomOverrideManager(entry.options)
    entities: list[SwitchEntity] = []

    for obj in coordinator.point_registry.all():
        entity_type = BacnetObjectTypeMapper.get_entity_type(obj)

        is_multistate_switch = (
            BacnetObjectTypeMapper._normalize_object_type(obj.object_type)
            == "multi_state_output"
            and overrides.get_multistate_representation(obj) in {"switch", "outlet"}
        )
        if entity_type == EntityType.SWITCH or is_multistate_switch:
            entities.append(BepacomSwitch(coordinator, obj))

    if entities:
        async_add_entities(entities)
        _LOGGER.debug("Added %d switch entities", len(entities))


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
        self._overrides = BepacomOverrideManager(coordinator._entry.options)
        self._feedback_obj = self._resolve_feedback_object()
        self._write_lock = asyncio.Lock()
        self._attr_unique_id = obj.unique_id
        self._attr_entity_id = f"switch.{obj.entity_id}"
        self._attr_suggested_object_id = obj.entity_id
        display_name, has_entity_name = BacnetObjectTypeMapper.get_display_name(obj)
        self._attr_name = display_name
        self._attr_has_entity_name = has_entity_name
        self._attr_device_info = self._build_device_info()
        if self._overrides.get_multistate_representation(obj) == "outlet":
            self._attr_device_class = SwitchDeviceClass.OUTLET
        self._attr_extra_state_attributes = (
            coordinator.point_registry.entity_attributes(obj)
        )
        self._last_point_revision = coordinator.point_registry.revision(obj)
        self._last_feedback_revision = (
            coordinator.point_registry.revision(self._feedback_obj)
            if self._feedback_obj is not None
            else None
        )
        self._last_coordinator_success = coordinator.last_update_success
        self._last_data_revision = coordinator.data_revision

    def _resolve_feedback_object(self) -> BacnetObject | None:
        """Resolve a valid MSI feedback point on the same BACnet device."""
        unique_id = self._overrides.get_multistate_feedback_unique_id(self._obj)
        if unique_id is None:
            return None
        feedback = self.coordinator.point_registry.get_by_unique_id(unique_id)
        if feedback is None:
            return None
        if str(feedback.device_id) != str(self._obj.device_id):
            return None
        if BacnetObjectTypeMapper._normalize_object_type(feedback.object_type) != "multi_state_input":
            return None
        return feedback

    def _build_device_info(self) -> DeviceInfo:
        """Build Home Assistant device info for this BACnet device."""
        device = self.coordinator.discovery.devices.get(self._obj.device_id)
        return BacnetObjectTypeMapper.build_device_info(
            domain=DOMAIN,
            obj=self._obj,
            device=device,
        )

    @callback
    def _handle_coordinator_update(self) -> None:
        """Write HA state only when this point or availability changed."""
        revision = self.coordinator.point_registry.revision(self._obj)
        feedback_revision = (
            self.coordinator.point_registry.revision(self._feedback_obj)
            if self._feedback_obj is not None
            else None
        )
        success = self.coordinator.last_update_success
        data_revision = self.coordinator.data_revision
        if (
            revision == self._last_point_revision
            and feedback_revision == self._last_feedback_revision
            and success == self._last_coordinator_success
            and data_revision == self._last_data_revision
        ):
            return
        self._last_point_revision = revision
        self._last_feedback_revision = feedback_revision
        self._last_coordinator_success = success
        self._last_data_revision = data_revision
        self.async_write_ha_state()

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

        value = (
            self._feedback_obj.present_value
            if self._feedback_obj is not None
            else self._obj.present_value
        )

        if value is None:
            return None

        object_type = BacnetObjectTypeMapper._normalize_object_type(
            self._obj.object_type
        )
        if object_type == "multi_state_output":
            try:
                current = float(value)
            except (TypeError, ValueError):
                return None
            on_value = self._overrides.get_multistate_switch_value(
                self._obj, "multistate_on_value", 2
            )
            off_value = self._overrides.get_multistate_switch_value(
                self._obj, "multistate_off_value", 1
            )
            if current == on_value:
                return True
            if current == off_value:
                return False
            return None

        # Handle common boolean representations
        if isinstance(value, bool):
            return value
        elif isinstance(value, (int, float)):
            return value != 0
        elif isinstance(value, str):
            normalized = value.strip().strip('"\'').lower()
            if normalized in ("true", "yes", "on", "1", "active"):
                return True
            if normalized in ("false", "no", "off", "0", "inactive"):
                return False
            return False

        return bool(value)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return point metadata and optional Multi-State feedback details."""
        attributes = dict(
            self.coordinator.point_registry.entity_attributes(self._obj)
        )
        if self._feedback_obj is not None:
            attributes.update(
                {
                    "command_value": self._obj.present_value,
                    "feedback_value": self._feedback_obj.present_value,
                    "feedback_source": self._feedback_obj.unique_id,
                }
            )
        return attributes

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Turn the switch on."""
        object_type = BacnetObjectTypeMapper._normalize_object_type(
            self._obj.object_type
        )
        is_binary_value = object_type == "binary_value"
        is_multistate_output = object_type == "multi_state_output"

        if not self._obj.effective_writable:
            _LOGGER.error(
                "Cannot write to non-writable switch %s",
                self._obj.unique_id,
            )
            return

        try:
            client = self.coordinator.client
            revision_before_write = self.coordinator.point_registry.revision(self._obj)
            if is_binary_value:
                await client.async_write_binary_value(
                    device_id=self._obj.device_id,
                    object_id=self._obj.object_id,
                    value=True,
                    priority=self._overrides.get_write_priority(self._obj),
                )
            elif is_multistate_output:
                await self._async_write_multistate_switch(
                    self._overrides.get_multistate_switch_value(
                        self._obj, "multistate_on_value", 2
                    )
                )
            else:
                await client.async_write_property(
                    device_id=self._obj.device_id,
                    object_type=self._obj.object_type,
                    object_id=self._obj.object_id,
                    value=True,
                )
            
            self.coordinator.schedule_write_confirmation(
                self._obj, revision_before_write
            )
            
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
        object_type = BacnetObjectTypeMapper._normalize_object_type(
            self._obj.object_type
        )
        is_binary_value = object_type == "binary_value"
        is_multistate_output = object_type == "multi_state_output"

        if not self._obj.effective_writable:
            _LOGGER.error(
                "Cannot write to non-writable switch %s",
                self._obj.unique_id,
            )
            return

        try:
            client = self.coordinator.client
            revision_before_write = self.coordinator.point_registry.revision(self._obj)
            if is_binary_value:
                await client.async_write_binary_value(
                    device_id=self._obj.device_id,
                    object_id=self._obj.object_id,
                    value=False,
                    priority=self._overrides.get_write_priority(self._obj),
                )
            elif is_multistate_output:
                await self._async_write_multistate_switch(
                    self._overrides.get_multistate_switch_value(
                        self._obj, "multistate_off_value", 1
                    )
                )
            else:
                await client.async_write_property(
                    device_id=self._obj.device_id,
                    object_type=self._obj.object_type,
                    object_id=self._obj.object_id,
                    value=False,
                )
            
            self.coordinator.schedule_write_confirmation(
                self._obj, revision_before_write
            )
            
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

    async def _async_write_multistate_switch(self, value: float) -> None:
        """Write one of the configured Multi-State Output switch values."""
        async with self._write_lock:
            client = self.coordinator.client
            priority = self._overrides.get_write_priority(self._obj)
            if self._overrides.get_write_profile(self._obj) == "glt_set_stage":
                priority = 8
                await client.async_write_binary_value(
                    device_id=self._obj.device_id,
                    object_id=self._obj.object_id,
                    value=True,
                    priority=priority,
                )
                await asyncio.sleep(
                    self._overrides.get_write_delay_ms(
                        self._obj, "glt_delay_ms", 2000
                    ) / 1000
                )
            await client.async_write_multistate_output(
                device_id=self._obj.device_id,
                object_id=self._obj.object_id,
                value=value,
                priority=priority,
            )

    @property
    def available(self) -> bool:
        """Return whether the entity is available."""
        return self.coordinator.last_update_success
