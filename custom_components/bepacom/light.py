"""Light platform for Multi-State Outputs exposed as simple lights."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from homeassistant.components.light import ColorMode, LightEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import BepacomCoordinator
from .entity_factory import BacnetObjectTypeMapper
from .exceptions import WriteError
from .models import BacnetObject
from .override_manager import BepacomOverrideManager

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up simple light entities backed by Multi-State Outputs."""
    coordinator: BepacomCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    overrides = BepacomOverrideManager(entry.options)
    entities: list[LightEntity] = []

    for obj in coordinator.point_registry.all():
        if (
            BacnetObjectTypeMapper._normalize_object_type(obj.object_type)
            == "multi_state_output"
            and overrides.get_multistate_representation(obj) == "light"
        ):
            entities.append(BepacomMultistateLight(coordinator, obj))

    if entities:
        async_add_entities(entities)
        _LOGGER.debug("Added %d Multi-State Output light entities", len(entities))


class BepacomMultistateLight(
    CoordinatorEntity[BepacomCoordinator], LightEntity
):
    """Represent a Multi-State Output as an on/off light."""

    _attr_supported_color_modes = {ColorMode.ONOFF}
    _attr_color_mode = ColorMode.ONOFF

    def __init__(self, coordinator: BepacomCoordinator, obj: BacnetObject) -> None:
        super().__init__(coordinator)
        self._obj = obj
        self._overrides = BepacomOverrideManager(coordinator._entry.options)
        self._feedback_obj = self._resolve_feedback_object()
        self._write_lock = asyncio.Lock()
        self._attr_unique_id = obj.unique_id
        self._attr_entity_id = f"light.{obj.entity_id}"
        self._attr_suggested_object_id = obj.entity_id
        display_name, has_entity_name = BacnetObjectTypeMapper.get_display_name(obj)
        self._attr_name = display_name
        self._attr_has_entity_name = has_entity_name
        self._attr_device_info = self._build_device_info()
        self._last_point_revision = coordinator.point_registry.revision(obj)
        self._last_feedback_revision = (
            coordinator.point_registry.revision(self._feedback_obj)
            if self._feedback_obj is not None
            else None
        )
        self._last_coordinator_success = coordinator.last_update_success
        self._last_data_revision = coordinator.data_revision

    def _resolve_feedback_object(self) -> BacnetObject | None:
        unique_id = self._overrides.get_multistate_feedback_unique_id(self._obj)
        feedback = (
            self.coordinator.point_registry.get_by_unique_id(unique_id)
            if unique_id is not None
            else None
        )
        if feedback is None or str(feedback.device_id) != str(self._obj.device_id):
            return None
        if BacnetObjectTypeMapper._normalize_object_type(feedback.object_type) != "multi_state_input":
            return None
        return feedback

    def _build_device_info(self) -> DeviceInfo:
        device = self.coordinator.discovery.devices.get(self._obj.device_id)
        return BacnetObjectTypeMapper.build_device_info(
            domain=DOMAIN, obj=self._obj, device=device
        )

    @callback
    def _handle_coordinator_update(self) -> None:
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
        value = (
            self._feedback_obj.present_value
            if self._feedback_obj is not None
            else self._obj.present_value
        )
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

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        attributes = dict(self.coordinator.point_registry.entity_attributes(self._obj))
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
        await self._async_write(
            self._overrides.get_multistate_switch_value(
                self._obj, "multistate_on_value", 2
            )
        )

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self._async_write(
            self._overrides.get_multistate_switch_value(
                self._obj, "multistate_off_value", 1
            )
        )

    async def _async_write(self, value: float) -> None:
        if not self._obj.effective_writable:
            _LOGGER.error("Cannot write to non-writable light %s", self._obj.unique_id)
            return
        revision_before_write = self.coordinator.point_registry.revision(self._obj)
        try:
            async with self._write_lock:
                priority = self._overrides.get_write_priority(self._obj)
                if self._overrides.get_write_profile(self._obj) == "glt_set_stage":
                    priority = 8
                    await self.coordinator.client.async_write_binary_value(
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
                await self.coordinator.client.async_write_multistate_output(
                    device_id=self._obj.device_id,
                    object_id=self._obj.object_id,
                    value=value,
                    priority=priority,
                )
            self.coordinator.schedule_write_confirmation(
                self._obj, revision_before_write
            )
        except WriteError as err:
            _LOGGER.error("Failed to write light %s: %s", self._obj.unique_id, err)
        except Exception:
            _LOGGER.exception("Unexpected error writing light %s", self._obj.unique_id)

    @property
    def available(self) -> bool:
        return self.coordinator.last_update_success
