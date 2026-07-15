"""Number platform for the Bepacom integration."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from homeassistant.components.number import NumberEntity, NumberMode
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

DEFAULT_ANALOG_VALUE_MIN = -1_000_000.0
DEFAULT_ANALOG_VALUE_MAX = 1_000_000.0
DEFAULT_ANALOG_VALUE_STEP = 0.01


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
    overrides = BepacomOverrideManager(entry.options)

    for obj in coordinator.point_registry.all():
        if not overrides.is_enabled(obj):
            continue

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
        self._overrides = BepacomOverrideManager(coordinator._entry.options)
        self._write_lock = asyncio.Lock()
        self._attr_unique_id = obj.unique_id
        self._attr_entity_id = f"number.{obj.entity_id}"
        self._attr_suggested_object_id = obj.entity_id
        display_name, has_entity_name = BacnetObjectTypeMapper.get_display_name(obj)
        self._attr_name = display_name
        self._attr_has_entity_name = has_entity_name
        self._attr_native_unit_of_measurement = (
            self._overrides.get_unit_of_measurement(obj)
        )
        self._attr_device_class = self._overrides.get_device_class(obj)
        self._attr_mode = NumberMode.BOX
        self._attr_native_min_value = self._overrides.get_number_setting(
            obj, "number_min", DEFAULT_ANALOG_VALUE_MIN
        )
        self._attr_native_max_value = self._overrides.get_number_setting(
            obj, "number_max", DEFAULT_ANALOG_VALUE_MAX
        )
        self._attr_native_step = self._overrides.get_number_setting(
            obj, "number_step", DEFAULT_ANALOG_VALUE_STEP
        )
        self._attr_device_info = self._build_device_info()
        self._attr_extra_state_attributes = self._build_extra_state_attributes()
        self._last_point_revision = coordinator.point_registry.revision(obj)
        self._last_coordinator_success = coordinator.last_update_success
        self._last_data_revision = coordinator.data_revision

    def _build_extra_state_attributes(self) -> dict[str, Any]:
        """Build the small stable attribute set exposed on the HA entity."""
        return self.coordinator.point_registry.entity_attributes(self._obj)

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
        success = self.coordinator.last_update_success
        data_revision = self.coordinator.data_revision
        if (
            revision == self._last_point_revision
            and success == self._last_coordinator_success
            and data_revision == self._last_data_revision
        ):
            return
        self._last_point_revision = revision
        self._last_coordinator_success = success
        self._last_data_revision = data_revision
        self.async_write_ha_state()

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
                            self._overrides.get_unit_of_measurement(self._obj)
                        )
                        self._attr_device_class = self._overrides.get_device_class(
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
        object_type = BacnetObjectTypeMapper._normalize_object_type(
            self._obj.object_type
        )
        is_analog_value = object_type == "analog_value"
        is_multistate_output = object_type == "multi_state_output"
        uses_api_v2_write = is_analog_value or is_multistate_output

        if not self._obj.writable and not uses_api_v2_write:
            _LOGGER.error(
                "Cannot write to non-writable object %s",
                self._obj.unique_id,
            )
            return

        try:
            client = self.coordinator.client
            revision_before_write = self.coordinator.point_registry.revision(self._obj)
            if is_analog_value:
                if self._overrides.get_write_profile(self._obj) == "glt_set_as":
                    await self._async_write_glt_set_as(value)
                else:
                    await client.async_write_analog_value(
                        device_id=self._obj.device_id,
                        object_id=self._obj.object_id,
                        value=value,
                        priority=self._overrides.get_write_priority(self._obj),
                    )
            elif is_multistate_output:
                if self._overrides.get_write_profile(self._obj) == "glt_set_stage":
                    await self._async_write_glt_set_stage(value)
                else:
                    await client.async_write_multistate_output(
                        device_id=self._obj.device_id,
                        object_id=self._obj.object_id,
                        value=value,
                        priority=self._overrides.get_write_priority(self._obj),
                    )
            else:
                await client.async_write_property(
                    device_id=self._obj.device_id,
                    object_type=self._obj.object_type,
                    object_id=self._obj.object_id,
                    value=value,
                )
            
            self.coordinator.schedule_write_confirmation(
                self._obj, revision_before_write
            )
            
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

    async def _async_write_glt_set_as(self, value: float) -> None:
        """Run the configured GLT -> set value -> AS write profile."""
        async with self._write_lock:
            client = self.coordinator.client
            device_id = self._obj.device_id
            object_id = self._obj.object_id
            priority = 8
            operation_error: Exception | None = None
            cleanup_error: Exception | None = None
            glt_switch_attempted = False

            try:
                glt_switch_attempted = True
                await client.async_write_binary_value(
                    device_id=device_id,
                    object_id=object_id,
                    value=True,
                    priority=priority,
                )
                await asyncio.sleep(
                    self._overrides.get_write_delay_ms(
                        self._obj, "glt_delay_ms", 1200
                    ) / 1000
                )
                await client.async_write_analog_value(
                    device_id=device_id,
                    object_id=object_id,
                    value=value,
                    priority=priority,
                )
                await asyncio.sleep(
                    self._overrides.get_write_delay_ms(
                        self._obj, "as_delay_ms", 1200
                    ) / 1000
                )
            except Exception as err:  # cleanup must still return control to AS
                operation_error = err
            finally:
                if glt_switch_attempted:
                    try:
                        await client.async_write_binary_value(
                            device_id=device_id,
                            object_id=object_id,
                            value=False,
                            priority=priority,
                        )
                    except Exception as err:
                        cleanup_error = err
                        _LOGGER.exception(
                            "Failed to return %s to AS control",
                            self._obj.unique_id,
                        )

                    await asyncio.sleep(
                        self._overrides.get_write_delay_ms(
                            self._obj, "release_delay_ms", 200
                        ) / 1000
                    )

                    if self._overrides.should_release_write_priority(self._obj):
                        for release_type in ("binaryValue", "analogValue"):
                            try:
                                await client.async_release_present_value(
                                    device_id=device_id,
                                    object_type=release_type,
                                    object_id=object_id,
                                    priority=priority,
                                )
                            except Exception as err:
                                cleanup_error = cleanup_error or err
                                _LOGGER.exception(
                                    "Failed to release %s priority for %s",
                                    release_type,
                                    self._obj.unique_id,
                                )

            if operation_error is not None:
                raise operation_error
            if cleanup_error is not None:
                raise cleanup_error

    async def _async_write_glt_set_stage(self, value: float) -> None:
        """Switch to GLT control, then write a Multi-State Output stage."""
        async with self._write_lock:
            client = self.coordinator.client
            device_id = self._obj.device_id
            object_id = self._obj.object_id
            priority = 8

            await client.async_write_binary_value(
                device_id=device_id,
                object_id=object_id,
                value=True,
                priority=priority,
            )
            await asyncio.sleep(
                self._overrides.get_write_delay_ms(
                    self._obj, "glt_delay_ms", 2000
                ) / 1000
            )
            await client.async_write_multistate_output(
                device_id=device_id,
                object_id=object_id,
                value=value,
                priority=priority,
            )

    @property
    def available(self) -> bool:
        """Return whether the entity is available."""
        return self.coordinator.last_update_success
