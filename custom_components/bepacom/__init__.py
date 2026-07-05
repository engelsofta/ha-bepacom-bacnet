"""The Bepacom integration."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .api import BepacomClient
from .const import DOMAIN
from .coordinator import BepacomCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[str] = ["sensor", "binary_sensor", "switch", "number"]


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
    )

    # Ersten Abruf durchführen
    await coordinator.async_config_entry_first_refresh()

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {
        "client": client,
        "coordinator": coordinator,
    }

    if PLATFORMS:
        await hass.config_entries.async_forward_entry_setups(
            entry,
            PLATFORMS,
        )

    await coordinator.async_start()

    _LOGGER.info("Bepacom integration started successfully")

    return True


async def async_unload_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    """Unload a config entry."""

    unload_ok = await hass.config_entries.async_unload_platforms(
        entry,
        PLATFORMS,
    )

    if not unload_ok:
        return False

    data = hass.data[DOMAIN].pop(entry.entry_id)
    coordinator: BepacomCoordinator = data["coordinator"]
    client: BepacomClient = data["client"]

    await coordinator.async_shutdown()
    await client.async_close()

    return unload_ok
