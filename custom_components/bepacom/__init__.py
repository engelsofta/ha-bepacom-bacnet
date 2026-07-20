"""The Bepacom integration."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er

from .api import BepacomClient
from .const import DOMAIN
from .const import CONF_ENTITY_OVERRIDES
from .coordinator import BepacomCoordinator
from .entity_factory import BacnetObjectTypeMapper, EntityType
from .panel import async_register_explorer_panel, async_unregister_explorer_panel_if_unused

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[str] = ["sensor", "binary_sensor", "switch", "number"]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

SERVICE_RELEASE_ANALOG_VALUE_PRIORITY = "release_analog_value_priority"
SERVICE_RELEASE_MULTISTATE_OUTPUT_PRIORITY = "release_multistate_output_priority"
SERVICE_RELEASE_BINARY_VALUE_PRIORITY = "release_binary_value_priority"

_RELEASE_SERVICE_OBJECT_TYPES = {
    SERVICE_RELEASE_ANALOG_VALUE_PRIORITY: "analogValue",
    SERVICE_RELEASE_MULTISTATE_OUTPUT_PRIORITY: "multiStateOutput",
    SERVICE_RELEASE_BINARY_VALUE_PRIORITY: "binaryValue",
}

_RELEASE_PRIORITY_SCHEMA = vol.Schema(
    {
        vol.Optional("config_entry_id"): str,
        vol.Optional("device_id", default=1): vol.All(vol.Coerce(int), vol.Range(min=0)),
        vol.Required("object_id"): vol.All(vol.Coerce(int), vol.Range(min=0)),
        vol.Optional("priority", default=8): vol.All(vol.Coerce(int), vol.Range(min=1, max=16)),
    }
)


def _loaded_entry_data(hass: HomeAssistant, config_entry_id: str | None) -> dict[str, Any]:
    """Return one loaded Bepacom entry for a service call."""
    domain_data = hass.data.get(DOMAIN, {})

    if config_entry_id:
        entry_data = domain_data.get(config_entry_id)
        if not isinstance(entry_data, dict) or "client" not in entry_data:
            raise HomeAssistantError(
                f"Bepacom config entry {config_entry_id!r} is not loaded"
            )
        return entry_data

    loaded_entries = [
        value
        for value in domain_data.values()
        if isinstance(value, dict) and "client" in value
    ]
    if not loaded_entries:
        raise HomeAssistantError("No Bepacom config entry is loaded")
    if len(loaded_entries) > 1:
        raise HomeAssistantError(
            "Multiple Bepacom config entries are loaded; config_entry_id is required"
        )
    return loaded_entries[0]


async def _async_release_priority_service(
    hass: HomeAssistant,
    call: ServiceCall,
) -> None:
    """Release a BACnet command priority through gateway API v2."""
    object_type = _RELEASE_SERVICE_OBJECT_TYPES[call.service]
    entry_data = _loaded_entry_data(hass, call.data.get("config_entry_id"))
    client: BepacomClient = entry_data["client"]

    await client.async_release_present_value(
        device_id=str(call.data["device_id"]),
        object_type=object_type,
        object_id=str(call.data["object_id"]),
        priority=call.data["priority"],
    )


def _async_register_services(hass: HomeAssistant) -> None:
    """Register Bepacom services once."""
    async def async_handle_release_priority(call: ServiceCall) -> None:
        await _async_release_priority_service(hass, call)

    for service in _RELEASE_SERVICE_OBJECT_TYPES:
        if hass.services.has_service(DOMAIN, service):
            continue
        hass.services.async_register(
            DOMAIN,
            service,
            async_handle_release_priority,
            schema=_RELEASE_PRIORITY_SCHEMA,
        )


def _expected_entity_id(entity_entry: er.RegistryEntry) -> str | None:
    """Return the stable Bepacom entity_id for a registry entry."""
    unique_id = str(entity_entry.unique_id or "").strip()
    if not unique_id.startswith("bepacom_"):
        return None

    domain = entity_entry.entity_id.split(".", 1)[0]
    if not domain:
        return None

    return f"{domain}.{unique_id}"


def _is_generated_legacy_entity_id(unique_id: str, entity_id: str) -> bool:
    """Return whether an override contains an old automatically generated ID.

    Older entity implementations derived their IDs from the BACnet device name
    and object label.  Depending on the Home Assistant version this produced
    variants such as ``switch.device_1_82980`` or
    ``sensor.device_1_analoginput_analoginput_17``.  Match only those exact
    generated shapes so genuinely user-defined IDs remain untouched.
    """
    parts = str(unique_id or "").strip().split("_", 3)
    if len(parts) != 4 or parts[0] != DOMAIN:
        return False

    device_id, object_type, object_id = parts[1:]
    normalized_entity_id = str(entity_id or "").strip().lower()
    if "." not in normalized_entity_id:
        return False

    _domain, object_slug = normalized_entity_id.split(".", 1)
    legacy_slugs = {
        f"device_{device_id}_{object_id}",
        f"device_{device_id}_{object_type}_{object_id}",
        f"device_{device_id}_{object_type}_{object_type}_{object_id}",
    }
    return object_slug in legacy_slugs


async def _async_migrate_legacy_entity_id_overrides(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> None:
    """Remove generated legacy IDs saved as Explorer overrides.

    The entity registry migration already assigns the stable BACnet-based ID.
    Keeping an old generated ID in the point override would rename the entity
    back again at the end of every integration reload.  Removing only the
    recognized generated value lets the normal stable suggestion take over and
    preserves every other point setting and custom user-assigned entity ID.
    """
    raw_overrides = entry.options.get(CONF_ENTITY_OVERRIDES, {})
    if not isinstance(raw_overrides, dict):
        return

    migrated = 0
    updated_overrides: dict[str, Any] = dict(raw_overrides)
    for key, raw_override in raw_overrides.items():
        if not isinstance(raw_override, dict):
            continue

        stored_entity_id = raw_override.get("entity_id")
        if not _is_generated_legacy_entity_id(str(key), str(stored_entity_id or "")):
            continue

        cleaned_override = dict(raw_override)
        cleaned_override.pop("entity_id", None)
        updated_overrides[key] = cleaned_override
        migrated += 1

    if not migrated:
        return

    options = dict(entry.options)
    options[CONF_ENTITY_OVERRIDES] = updated_overrides
    hass.config_entries.async_update_entry(entry, options=options)
    _LOGGER.info(
        "Removed %s generated legacy entity_id overrides; stable BACnet IDs will be used",
        migrated,
    )


async def _async_migrate_legacy_entity_ids(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> None:
    """Rename old generated entity_ids to the stable BACnet based schema.

    Older versions let Home Assistant build entity IDs from the device name and
    object label, which could produce IDs like
    ``sensor.device_1_analoginput_analoginput_17``.  Home Assistant keeps those
    IDs in the entity registry even after the integration is removed and added
    again if the unique_id is unchanged.

    This migration keeps the unique_id stable, but renames the registry entry to
    ``sensor.bepacom_1_analoginput_17`` when the target ID is free.
    """
    registry = er.async_get(hass)
    migrated = 0
    skipped = 0

    registry_entries = [
        entity_entry
        for entity_entry in registry.entities.values()
        if getattr(entity_entry, "platform", None) == DOMAIN
    ]

    for entity_entry in registry_entries:
        expected_entity_id = _expected_entity_id(entity_entry)
        if not expected_entity_id or entity_entry.entity_id == expected_entity_id:
            continue

        if registry.async_get(expected_entity_id) is not None:
            skipped += 1
            _LOGGER.warning(
                "Cannot migrate Bepacom entity_id %s to %s because target already exists",
                entity_entry.entity_id,
                expected_entity_id,
            )
            continue

        try:
            registry.async_update_entity(
                entity_entry.entity_id,
                new_entity_id=expected_entity_id,
            )
        except ValueError as err:
            skipped += 1
            _LOGGER.warning(
                "Cannot migrate Bepacom entity_id %s to %s: %s",
                entity_entry.entity_id,
                expected_entity_id,
                err,
            )
            continue

        migrated += 1

    if migrated or skipped:
        _LOGGER.info(
            "Bepacom entity_id migration finished: %s migrated, %s skipped",
            migrated,
            skipped,
        )


async def _async_remove_inactive_entity_entries(
    hass: HomeAssistant,
    entry: ConfigEntry,
    coordinator: BepacomCoordinator,
) -> None:
    """Remove raw entities for disabled or unsupported BACnet points."""
    registry = er.async_get(hass)
    objects_by_unique_id = {
        obj.unique_id: obj for obj in coordinator.point_registry.all(include_disabled=True)
    }
    removed = 0

    for entity_entry in list(er.async_entries_for_config_entry(registry, entry.entry_id)):
        if getattr(entity_entry, "platform", None) != DOMAIN:
            continue

        unique_id = str(entity_entry.unique_id or "")
        obj = objects_by_unique_id.get(unique_id)
        if obj is None:
            continue
        entity_type = BacnetObjectTypeMapper.get_entity_type(obj)
        expected_domain = entity_type.value
        if (
            BacnetObjectTypeMapper._normalize_object_type(obj.object_type)
            == "multi_state_output"
            and coordinator.point_registry.overrides.get_multistate_representation(obj)
            == "switch"
        ):
            expected_domain = "switch"

        entity_domain = entity_entry.entity_id.split(".", 1)[0]
        if (
            entity_type != EntityType.NONE
            and coordinator.point_registry.overrides.is_enabled(obj)
            and entity_domain == expected_domain
        ):
            continue

        registry.async_remove(entity_entry.entity_id)
        removed += 1

    if removed:
        _LOGGER.info("Removed %s inactive Bepacom entity registry entries", removed)


async def _async_apply_deferred_entity_registry_overrides(
    hass: HomeAssistant,
    entry: ConfigEntry,
    coordinator: BepacomCoordinator,
) -> None:
    """Apply Explorer name/ID edits saved before an entity entry existed."""
    raw_overrides = entry.options.get(CONF_ENTITY_OVERRIDES, {})
    if not isinstance(raw_overrides, dict):
        return

    registry = er.async_get(hass)
    entries_by_unique_id_and_domain = {
        (
            str(entity_entry.unique_id),
            entity_entry.entity_id.split(".", 1)[0],
        ): entity_entry
        for entity_entry in er.async_entries_for_config_entry(registry, entry.entry_id)
        if getattr(entity_entry, "platform", None) == DOMAIN
    }

    for obj in coordinator.point_registry.all():
        override = coordinator.point_registry.overrides.get_override(obj)
        if not isinstance(override, dict):
            continue

        entity_type = BacnetObjectTypeMapper.get_entity_type(obj)
        expected_domain = entity_type.value
        if (
            BacnetObjectTypeMapper._normalize_object_type(obj.object_type)
            == "multi_state_output"
            and coordinator.point_registry.overrides.get_multistate_representation(obj)
            == "switch"
        ):
            expected_domain = "switch"

        entity_entry = entries_by_unique_id_and_domain.get(
            (obj.unique_id, expected_domain)
        )
        if entity_entry is None:
            continue

        kwargs: dict[str, Any] = {}
        stored_name = override.get("entity_name")
        if stored_name is not None and str(stored_name).strip():
            desired_name = str(stored_name).strip()
            if entity_entry.name != desired_name:
                kwargs["name"] = desired_name

        stored_entity_id = override.get("entity_id")
        if stored_entity_id is not None and str(stored_entity_id).strip():
            desired_entity_id = str(stored_entity_id).strip()
            if entity_entry.entity_id != desired_entity_id:
                occupying_entry = registry.async_get(desired_entity_id)
                if occupying_entry is None:
                    kwargs["new_entity_id"] = desired_entity_id
                else:
                    _LOGGER.info(
                        "Skipping deferred entity_id override for %s: %s is "
                        "already used by %s",
                        obj.unique_id,
                        desired_entity_id,
                        occupying_entry.unique_id,
                    )

        if not kwargs:
            continue

        try:
            registry.async_update_entity(entity_entry.entity_id, **kwargs)
        except ValueError as err:
            _LOGGER.warning(
                "Cannot apply deferred entity registry override for %s: %s",
                obj.unique_id,
                err,
            )


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Bepacom integration."""
    hass.data.setdefault(DOMAIN, {})
    _async_register_services(hass)
    return True


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    """Set up Bepacom from a config entry."""

    _LOGGER.info("Starting Bepacom integration")

    # Migrate saved Explorer IDs before the coordinator snapshots entry.options.
    # Otherwise a legacy override can rename an entity back after the registry
    # migration later in this setup sequence.
    await _async_migrate_legacy_entity_id_overrides(hass, entry)

    client = BepacomClient(
        host=entry.data["host"],
        port=entry.data["port"],
    )

    coordinator = BepacomCoordinator(
        hass=hass,
        client=client,
        entry=entry,
    )

    # Only create platforms after a complete initial BACnet inventory is
    # available. A failed first refresh is retried by Home Assistant with
    # backoff instead of creating entities from a temporary startup snapshot.
    try:
        await coordinator.async_config_entry_first_refresh()
    except Exception:
        # This attempt is not stored in hass.data yet, so the normal unload hook
        # cannot close its HTTP session.
        await client.async_close()
        raise

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {
        "client": client,
        "coordinator": coordinator,
    }
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))

    await _async_migrate_legacy_entity_ids(hass, entry)
    await _async_remove_inactive_entity_entries(hass, entry, coordinator)

    if PLATFORMS:
        await hass.config_entries.async_forward_entry_setups(
            entry,
            PLATFORMS,
        )

    await _async_apply_deferred_entity_registry_overrides(hass, entry, coordinator)

    await coordinator.async_start()

    await async_register_explorer_panel(hass, entry)

    _LOGGER.info("Bepacom integration started successfully")

    return True


async def async_unload_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    """Unload a config entry."""

    data = hass.data[DOMAIN][entry.entry_id]
    coordinator: BepacomCoordinator = data["coordinator"]
    client: BepacomClient = data["client"]

    unload_ok = await hass.config_entries.async_unload_platforms(
        entry,
        PLATFORMS,
    )

    if not unload_ok:
        return False

    await coordinator.async_shutdown()
    await client.async_close()
    hass.data[DOMAIN].pop(entry.entry_id, None)
    await async_unregister_explorer_panel_if_unused(hass, entry)

    return unload_ok


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update by reloading the config entry.

    Sidebar Explorer saves are intentionally applied to the runtime registry without
    immediately reloading the integration. The user can reload explicitly after
    finishing multiple edits.
    """
    suppress = hass.data.get(DOMAIN, {}).get("_suppress_reload_entries")
    if isinstance(suppress, set) and entry.entry_id in suppress:
        suppress.discard(entry.entry_id)
        _LOGGER.debug("Bepacom options saved from sidebar without automatic reload")
        return

    await hass.config_entries.async_reload(entry.entry_id)
