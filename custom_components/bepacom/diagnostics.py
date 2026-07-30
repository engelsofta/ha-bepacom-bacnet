"""Diagnostics support for the Bepacom integration."""

from __future__ import annotations

from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_PORT
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .coordinator import BepacomCoordinator

_TO_REDACT = {
    CONF_HOST,
    "hostname",
    "ip_address",
    "token",
    "access_token",
    "password",
}


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> dict[str, Any]:
    """Return privacy-safe diagnostics for one Bepacom config entry."""
    entry_data = hass.data.get(DOMAIN, {}).get(entry.entry_id, {})
    coordinator: BepacomCoordinator | None = (
        entry_data.get("coordinator") if isinstance(entry_data, dict) else None
    )

    diagnostics: dict[str, Any] = {
        "config_entry": {
            "title": entry.title,
            "data": async_redact_data(dict(entry.data), _TO_REDACT),
            "options": _diagnostic_option_summary(entry.options),
        },
        "coordinator": {
            "loaded": coordinator is not None,
        },
    }

    if coordinator is None:
        return diagnostics

    points = coordinator.point_registry.all(include_disabled=True)
    enabled_points = coordinator.point_registry.all()
    device_ids = {str(point.device_id) for point in points}

    diagnostics["inventory"] = {
        "device_count": len(device_ids),
        "point_count": len(points),
        "enabled_point_count": len(enabled_points),
        "disabled_point_count": len(points) - len(enabled_points),
    }
    diagnostics["coordinator"].update(
        {
            "last_update_success": coordinator.last_update_success,
            "data_revision": coordinator.data_revision,
        }
    )
    diagnostics["transport"] = coordinator.websocket_diagnostics

    return diagnostics


def _diagnostic_option_summary(options: dict[str, Any]) -> dict[str, Any]:
    """Return counts instead of potentially sensitive point configuration."""
    summary: dict[str, Any] = {
        "configured": bool(options),
        "option_keys": sorted(str(key) for key in options),
    }

    for key, value in options.items():
        if isinstance(value, (dict, list, tuple, set)):
            summary[f"{key}_count"] = len(value)

    return async_redact_data(summary, _TO_REDACT)
