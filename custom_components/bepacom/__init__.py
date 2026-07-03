"""The Bepacom integration."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .api import BepacomClient
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

# Plattformen werden später ergänzt
PLATFORMS: list[Platform] = []


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Bepacom integration."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    """Set up Bepacom from a config entry."""

    client = BepacomClient(
        host=entry.data["host"],
        port=entry.data["port"],
    )

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = client

    await hass.config_entries.async_forward_entry_setups(
        entry,
        PLATFORMS,
    )

    _LOGGER.info("Bepacom gateway %s connected", entry.title)

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

    if unload_ok:
        client: BepacomClient = hass.data[DOMAIN].pop(entry.entry_id)
        await client.async_close()

    return unload_ok