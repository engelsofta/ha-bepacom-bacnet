"""The Bepacom integration."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from .api import BepacomClient
from .const import DOMAIN
from .coordinator import BepacomCoordinator
from .panel import async_register_explorer_panel, async_unregister_explorer_panel_if_unused

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[str] = ["sensor", "binary_sensor", "switch", "number"]


def _expected_entity_id(entity_entry: er.RegistryEntry) -> str | None:
    """Return the stable Bepacom entity_id for a registry entry."""
    unique_id = str(entity_entry.unique_id or "").strip()
    if not unique_id.startswith("bepacom_"):
        return None

    domain = entity_entry.entity_id.split(".", 1)[0]
    if not domain:
        return None

    return f"{domain}.{unique_id}"


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


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Bepacom integration."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    """Set up Bepacom from a config entry."""

    _LOGGER.info("Starting Bepacom integration")

    client = BepacomClient(
        host=entry.data["host"],
        port=entry.data["port"],
    )

    coordinator = BepacomCoordinator(
        hass=hass,
        client=client,
        entry=entry,
    )

    # Ersten Abruf durchführen
    await coordinator.async_config_entry_first_refresh()

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {
        "client": client,
        "coordinator": coordinator,
    }
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))

    await _async_migrate_legacy_entity_ids(hass, entry)

    if PLATFORMS:
        await hass.config_entries.async_forward_entry_setups(
            entry,
            PLATFORMS,
        )

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
