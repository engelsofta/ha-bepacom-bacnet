"""Sidebar BACnet Explorer panel for Bepacom."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any
import inspect

import voluptuous as vol

from homeassistant.components import panel_custom, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN, CONF_ENTITY_OVERRIDES
from .models import BacnetObject
from .exceptions import WriteError

_LOGGER = logging.getLogger(__name__)

PANEL_URL = "bepacom_explorer"
PANEL_NAME = "bepacom-explorer-panel"
PANEL_STATIC_URL = "/bepacom_static"
PANEL_EVENT = "bepacom_explorer_updated"
PANEL_VERSION = "0.3.8-beta.1"

_WS_REGISTERED = "websocket_registered"
_PANEL_REGISTERED = "panel_registered"


async def async_register_explorer_panel(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Register the sidebar panel and WebSocket commands."""
    hass.data.setdefault(DOMAIN, {})

    if not hass.data[DOMAIN].get(_WS_REGISTERED):
        websocket_api.async_register_command(hass, websocket_explorer_entries)
        websocket_api.async_register_command(hass, websocket_explorer_points)
        websocket_api.async_register_command(hass, websocket_explorer_point)
        websocket_api.async_register_command(hass, websocket_explorer_save_override)
        websocket_api.async_register_command(hass, websocket_explorer_reset_override)
        websocket_api.async_register_command(hass, websocket_explorer_reload_entry)
        websocket_api.async_register_command(hass, websocket_explorer_history)
        websocket_api.async_register_command(hass, websocket_explorer_write_property)
        hass.data[DOMAIN][_WS_REGISTERED] = True

    if hass.data[DOMAIN].get(_PANEL_REGISTERED):
        return

    static_path = Path(__file__).parent / "frontend"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(PANEL_STATIC_URL, str(static_path), True)]
    )

    result = panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL,
        webcomponent_name=PANEL_NAME,
        sidebar_title="BACnet Explorer",
        sidebar_icon="mdi:database-search",
        module_url=f"{PANEL_STATIC_URL}/bepacom-panel.js?v={PANEL_VERSION}",
        config={"domain": DOMAIN, "entry_id": entry.entry_id},
        require_admin=True,
    )
    if inspect.isawaitable(result):
        await result

    hass.data[DOMAIN][_PANEL_REGISTERED] = True
    _LOGGER.info("Bepacom BACnet Explorer sidebar panel registered")


async def async_unregister_explorer_panel_if_unused(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> None:
    """Unregister the sidebar panel when the last Bepacom entry is unloaded."""
    domain_data = hass.data.get(DOMAIN, {})
    remaining_entry_ids = [key for key in domain_data if isinstance(key, str) and key != entry.entry_id]

    if remaining_entry_ids:
        return

    if domain_data.get(_PANEL_REGISTERED):
        try:
            result = panel_custom.async_unregister_panel(hass, PANEL_URL)
            if inspect.isawaitable(result):
                await result
        except Exception:  # pragma: no cover - defensive for HA version differences
            _LOGGER.debug("Could not unregister Bepacom Explorer panel", exc_info=True)
        domain_data.pop(_PANEL_REGISTERED, None)


@callback
def _entry_data(hass: HomeAssistant, entry_id: str | None) -> tuple[str | None, dict[str, Any] | None]:
    """Return one Bepacom entry data mapping."""
    domain_data = hass.data.get(DOMAIN, {})

    if entry_id and entry_id in domain_data:
        return entry_id, domain_data[entry_id]

    for key, value in domain_data.items():
        if isinstance(value, dict) and "coordinator" in value:
            return str(key), value

    return None, None




@callback
def _entity_registry_entry(hass: HomeAssistant, entry_id: str | None, unique_id: str):
    """Return the Home Assistant entity registry entry for a Bepacom point."""
    ent_reg = er.async_get(hass)
    for entity in ent_reg.entities.values():
        if entity.unique_id != unique_id:
            continue
        if entity.platform != DOMAIN:
            continue
        if entry_id and getattr(entity, "config_entry_id", None) not in (None, entry_id):
            continue
        return entity
    return None



def _override_display_value(override: dict[str, Any], *keys: str) -> str:
    """Return frontend override state: __auto__, __none__, or configured value."""
    for key in keys:
        if key in override:
            value = override.get(key)
            if value is None:
                return "__none__"
            text = str(value).strip()
            if text.lower() in {"", "auto", "automatic", "automatisch", "__auto__"}:
                return "__auto__"
            if text.lower() in {"none", "null", "keine", "no", "false", "__none__"}:
                return "__none__"
            return text
    return "__auto__"

@callback
def _serialize_point(obj: BacnetObject, registry, hass: HomeAssistant | None = None, entry_id: str | None = None) -> dict[str, Any]:
    """Serialize one BACnet point for the frontend panel."""
    runtime = registry.runtime(obj)
    override = registry.overrides.get_override(obj)
    object_key = registry.object_key(obj)

    ha_unit = registry.overrides.get_unit_of_measurement(obj)
    ha_device_class = registry.overrides.get_device_class(obj)
    ha_state_class = registry.overrides.get_state_class(obj)
    update_mode = registry.overrides.get_update_mode(obj, "disabled")
    entity_entry = _entity_registry_entry(hass, entry_id, obj.unique_id) if hass is not None else None

    return {
        "unique_id": obj.unique_id,
        "device_id": str(obj.device_id),
        "object_key": object_key,
        "object_type": obj.object_type,
        "object_id": obj.object_id,
        "object_name": obj.object_name or "",
        "description": obj.description or "",
        "present_value": obj.present_value,
        "bacnet_unit": obj.units,
        "ha_unit": str(ha_unit) if ha_unit is not None else None,
        "device_class": str(ha_device_class) if ha_device_class is not None else None,
        "state_class": str(ha_state_class) if ha_state_class is not None else None,
        "override_unit": _override_display_value(override, "unit", "unit_of_measurement"),
        "override_device_class": _override_display_value(override, "device_class"),
        "override_state_class": _override_display_value(override, "state_class"),
        "override_active": bool(override),
        "subscribe": obj.subscribe,
        "update_mode": update_mode,
        "subscribed": runtime.subscribed,
        "fallback_polling": runtime.fallback_polling,
        "enabled": registry.overrides.is_enabled(obj),
        "writable": bool(obj.writable),
        "last_update": runtime.last_update.isoformat() if runtime.last_update else None,
        "last_update_source": runtime.last_update_source,
        "push_updates": runtime.push_updates,
        "polling_updates": runtime.polling_updates,
        "value_changes": runtime.value_changes,
        "suppressed_updates": runtime.suppressed_updates,
        "entity_id": entity_entry.entity_id if entity_entry else None,
        "entity_name": getattr(entity_entry, "name", None) if entity_entry else None,
        "entity_original_name": getattr(entity_entry, "original_name", None) if entity_entry else None,
    }


@callback
def _matches_filters(point: dict[str, Any], msg: dict[str, Any]) -> bool:
    """Return whether a serialized point matches frontend filters."""
    search = str(msg.get("search") or "").strip().lower()
    object_type = str(msg.get("object_type") or "").strip().lower()
    only_overrides = bool(msg.get("only_overrides", False))
    only_subscribe = bool(msg.get("only_subscribe", False))

    if object_type and object_type != "all" and point["object_type"].lower() != object_type:
        return False

    if only_overrides and not point["override_active"]:
        return False

    if only_subscribe and not (point.get("update_mode") == "subscribe" or point["subscribed"]):
        return False

    if search:
        haystack = " ".join(
            str(point.get(key) or "")
            for key in (
                "unique_id",
                "device_id",
                "object_key",
                "object_type",
                "object_id",
                "object_name",
                "description",
                "present_value",
                "bacnet_unit",
                "ha_unit",
                "device_class",
                "entity_id",
                "entity_name",
                "entity_original_name",
            )
        ).lower()
        if search not in haystack:
            return False

    return True


@websocket_api.websocket_command({vol.Required("type"): "bepacom/explorer/entries"})
@websocket_api.async_response
async def websocket_explorer_entries(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return available Bepacom config entries for the Explorer panel."""
    entries: list[dict[str, Any]] = []

    for entry in hass.config_entries.async_entries(DOMAIN):
        entry_id, data = _entry_data(hass, entry.entry_id)
        coordinator = data.get("coordinator") if data else None
        count = len(coordinator.point_registry.objects) if coordinator else 0
        entries.append(
            {
                "entry_id": entry.entry_id,
                "title": entry.title or entry.data.get("host") or entry.entry_id,
                "points": count,
            }
        )

    connection.send_result(msg["id"], {"entries": entries})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "bepacom/explorer/points",
        vol.Optional("entry_id"): str,
        vol.Optional("search", default=""): str,
        vol.Optional("object_type", default="all"): str,
        vol.Optional("only_overrides", default=False): bool,
        vol.Optional("only_subscribe", default=False): bool,
        vol.Optional("include_disabled", default=True): bool,
        vol.Optional("limit", default=500): int,
    }
)
@websocket_api.async_response
async def websocket_explorer_points(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return filtered BACnet points for the Explorer panel."""
    entry_id, data = _entry_data(hass, msg.get("entry_id"))

    if data is None:
        connection.send_error(msg["id"], "not_found", "No Bepacom config entry is loaded")
        return

    coordinator = data["coordinator"]
    registry = coordinator.point_registry
    points = [_serialize_point(obj, registry, hass, entry_id) for obj in registry.all(include_disabled=msg["include_disabled"])]
    points = [point for point in points if _matches_filters(point, msg)]

    points.sort(key=lambda p: (str(p["object_type"]).lower(), int(p["object_id"] or 999999999), str(p["object_name"]).lower()))

    limit = max(1, min(int(msg["limit"]), 2000))
    connection.send_result(
        msg["id"],
        {
            "entry_id": entry_id,
            "points": points[:limit],
            "total": len(points),
            "limited": len(points) > limit,
            "diagnostics": {**coordinator.websocket_diagnostics, **registry.performance_summary()},
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "bepacom/explorer/point",
        vol.Optional("entry_id"): str,
        vol.Required("unique_id"): str,
    }
)
@websocket_api.async_response
async def websocket_explorer_point(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return detailed point inspector data."""
    entry_id, data = _entry_data(hass, msg.get("entry_id"))

    if data is None:
        connection.send_error(msg["id"], "not_found", "No Bepacom config entry is loaded")
        return

    coordinator = data["coordinator"]
    registry = coordinator.point_registry
    obj = registry.get_by_unique_id(msg["unique_id"])

    if obj is None:
        connection.send_error(msg["id"], "not_found", "BACnet point not found")
        return

    connection.send_result(
        msg["id"],
        {
            "entry_id": entry_id,
            "point": _serialize_point(obj, registry, hass, entry_id),
            "inspector": registry.inspector_attributes(obj),
            "history": registry.history(obj),
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "bepacom/explorer/history",
        vol.Optional("entry_id"): str,
        vol.Required("unique_id"): str,
        vol.Optional("limit", default=120): int,
    }
)
@websocket_api.async_response
async def websocket_explorer_history(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return recent value history for one point."""
    entry_id, data = _entry_data(hass, msg.get("entry_id"))

    if data is None:
        connection.send_error(msg["id"], "not_found", "No Bepacom config entry is loaded")
        return

    registry = data["coordinator"].point_registry
    obj = registry.get_by_unique_id(msg["unique_id"])

    if obj is None:
        connection.send_error(msg["id"], "not_found", "BACnet point not found")
        return

    limit = max(1, min(int(msg.get("limit", 120)), 300))
    connection.send_result(
        msg["id"],
        {
            "entry_id": entry_id,
            "unique_id": obj.unique_id,
            "history": registry.history(obj, limit=limit),
        },
    )


def _parse_write_value(value: Any) -> Any:
    """Parse frontend write input into a BACnet-friendly value."""
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    text = str(value).strip()
    if text.lower() in {"true", "on", "1", "ja", "ein"}:
        return True
    if text.lower() in {"false", "off", "0", "nein", "aus"}:
        return False
    try:
        if "." in text or "," in text:
            return float(text.replace(",", "."))
        return int(text)
    except ValueError:
        return text


@websocket_api.websocket_command(
    {
        vol.Required("type"): "bepacom/explorer/write_property",
        vol.Optional("entry_id"): str,
        vol.Required("unique_id"): str,
        vol.Required("value"): vol.Any(str, int, float, bool),
        vol.Optional("priority", default=8): int,
    }
)
@websocket_api.async_response
async def websocket_explorer_write_property(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Write presentValue for one writable BACnet point from the Explorer."""
    entry_id, data = _entry_data(hass, msg.get("entry_id"))

    if data is None:
        connection.send_error(msg["id"], "not_found", "No Bepacom config entry is loaded")
        return

    coordinator = data["coordinator"]
    client = data["client"]
    registry = coordinator.point_registry
    obj = registry.get_by_unique_id(msg["unique_id"])

    if obj is None:
        connection.send_error(msg["id"], "not_found", "BACnet point not found")
        return

    if not obj.writable:
        connection.send_error(msg["id"], "not_writable", "BACnet point is not writable")
        return

    priority = max(1, min(int(msg.get("priority", 8)), 16))
    value = _parse_write_value(msg.get("value"))

    try:
        await client.async_write_property(
            device_id=obj.device_id,
            object_type=obj.object_type,
            object_id=obj.object_id,
            value=value,
            priority=priority,
        )
        await coordinator.async_request_refresh()
    except WriteError as err:
        connection.send_error(msg["id"], "write_failed", str(err))
        return
    except Exception as err:  # pragma: no cover - defensive
        _LOGGER.exception("Explorer BACnet write failed")
        connection.send_error(msg["id"], "write_failed", str(err))
        return

    obj = registry.get_by_unique_id(msg["unique_id"]) or obj
    connection.send_result(
        msg["id"],
        {
            "entry_id": entry_id,
            "point": _serialize_point(obj, registry, hass, entry_id),
            "inspector": registry.inspector_attributes(obj),
            "history": registry.history(obj),
        },
    )


def _normalize_empty(value: Any) -> str | None:
    """Normalize frontend text input."""
    if value is None:
        return None
    value = str(value).strip()
    return value or None


async def _async_update_entity_registry_from_msg(
    hass: HomeAssistant,
    entry_id: str | None,
    obj: BacnetObject,
    msg: dict[str, Any],
) -> None:
    """Apply optional Home Assistant entity registry changes from the sidebar."""
    if "entity_id" not in msg and "entity_name" not in msg:
        return

    entity_entry = _entity_registry_entry(hass, entry_id, obj.unique_id)
    if entity_entry is None:
        return

    ent_reg = er.async_get(hass)
    kwargs: dict[str, Any] = {}

    if "entity_name" in msg:
        # Empty string resets the custom name to the integration-provided default.
        name = msg.get("entity_name")
        kwargs["name"] = None if name is None or str(name).strip() == "" else str(name).strip()

    if "entity_id" in msg:
        new_entity_id = _normalize_empty(msg.get("entity_id"))
        if new_entity_id and new_entity_id != entity_entry.entity_id:
            kwargs["new_entity_id"] = new_entity_id

    if kwargs:
        ent_reg.async_update_entity(entity_entry.entity_id, **kwargs)

def _clean_override(data: dict[str, Any]) -> dict[str, Any]:
    """Return a compact override dictionary from frontend payload."""
    cleaned: dict[str, Any] = {}

    def _store_tri_state(payload_key: str, override_key: str) -> None:
        value = data.get(payload_key)
        if value is None:
            return
        normalized = str(value).strip().lower()
        if normalized in {"", "auto", "automatic", "automatisch", "__auto__"}:
            return
        if normalized in {"none", "null", "keine", "no", "false", "__none__"}:
            cleaned[override_key] = "__none__"
            return
        cleaned[override_key] = str(value).strip()

    _store_tri_state("unit", "unit")
    _store_tri_state("device_class", "device_class")
    _store_tri_state("state_class", "state_class")

    update_mode = data.get("update_mode")
    if isinstance(update_mode, str):
        value = update_mode.strip().lower().replace("-", "_").replace(" ", "_")
        if value in {"disabled", "disable", "off", "aus", "inactive", "deaktiviert"}:
            cleaned["update_mode"] = "disabled"
            cleaned["enabled"] = False
        elif value in {"subscribe", "subscribed", "push", "cov", "subscription"}:
            cleaned["update_mode"] = "subscribe"
            cleaned["enabled"] = True
            cleaned["subscribe"] = True
        elif value in {"polling", "poll", "zyklisch"}:
            cleaned["update_mode"] = "polling"
            cleaned["enabled"] = True
            cleaned["subscribe"] = False

    return cleaned


async def _async_apply_override_options(
    hass: HomeAssistant,
    entry: ConfigEntry,
    data: dict[str, Any],
    *,
    reset_key: str | None = None,
) -> None:
    """Store overrides in config entry options and refresh runtime registry."""
    options = dict(entry.options)
    overrides = options.get(CONF_ENTITY_OVERRIDES, {})
    overrides = dict(overrides) if isinstance(overrides, dict) else {}

    if reset_key is not None:
        overrides.pop(reset_key, None)
    else:
        unique_id = data["unique_id"]
        cleaned = _clean_override(data)
        if cleaned:
            overrides[unique_id] = cleaned
        else:
            overrides.pop(unique_id, None)

    options[CONF_ENTITY_OVERRIDES] = overrides
    hass.data.setdefault(DOMAIN, {}).setdefault("_suppress_reload_entries", set()).add(entry.entry_id)
    hass.config_entries.async_update_entry(entry, options=options)

    entry_data = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    coordinator = entry_data.get("coordinator") if isinstance(entry_data, dict) else None
    if coordinator is not None:
        coordinator.point_registry.refresh_options(options)
        coordinator.point_registry.load_discovery(
            coordinator.discovery.devices,
            coordinator.discovery.objects,
        )
        coordinator.async_set_updated_data(coordinator.data)



@websocket_api.websocket_command(
    {
        vol.Required("type"): "bepacom/explorer/save_override",
        vol.Optional("entry_id"): str,
        vol.Required("unique_id"): str,
        vol.Optional("unit"): vol.Any(str, None),
        vol.Optional("device_class"): vol.Any(str, None),
        vol.Optional("state_class"): vol.Any(str, None),
        vol.Optional("update_mode"): vol.Any(str, None),
        vol.Optional("entity_id"): vol.Any(str, None),
        vol.Optional("entity_name"): vol.Any(str, None),
    }
)
@websocket_api.async_response
async def websocket_explorer_save_override(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Save one point override from the sidebar explorer."""
    entry_id, data = _entry_data(hass, msg.get("entry_id"))

    if data is None or entry_id is None:
        connection.send_error(msg["id"], "not_found", "No Bepacom config entry is loaded")
        return

    entry = hass.config_entries.async_get_entry(entry_id)
    if entry is None:
        connection.send_error(msg["id"], "not_found", "Bepacom config entry not found")
        return

    coordinator = data["coordinator"]
    registry = coordinator.point_registry
    obj = registry.get_by_unique_id(msg["unique_id"])

    if obj is None:
        connection.send_error(msg["id"], "not_found", "BACnet point not found")
        return

    await _async_update_entity_registry_from_msg(hass, entry_id, obj, msg)
    await _async_apply_override_options(hass, entry, msg)
    obj = registry.get_by_unique_id(msg["unique_id"]) or obj

    connection.send_result(
        msg["id"],
        {
            "entry_id": entry_id,
            "point": _serialize_point(obj, registry, hass, entry_id),
            "inspector": registry.inspector_attributes(obj),
            "history": registry.history(obj),
            "requires_reload": True,
        },
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "bepacom/explorer/reset_override",
        vol.Optional("entry_id"): str,
        vol.Required("unique_id"): str,
    }
)
@websocket_api.async_response
async def websocket_explorer_reset_override(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Reset one point override from the sidebar explorer."""
    entry_id, data = _entry_data(hass, msg.get("entry_id"))

    if data is None or entry_id is None:
        connection.send_error(msg["id"], "not_found", "No Bepacom config entry is loaded")
        return

    entry = hass.config_entries.async_get_entry(entry_id)
    if entry is None:
        connection.send_error(msg["id"], "not_found", "Bepacom config entry not found")
        return

    coordinator = data["coordinator"]
    registry = coordinator.point_registry
    obj = registry.get_by_unique_id(msg["unique_id"])

    if obj is None:
        connection.send_error(msg["id"], "not_found", "BACnet point not found")
        return

    await _async_apply_override_options(hass, entry, msg, reset_key=msg["unique_id"])
    obj = registry.get_by_unique_id(msg["unique_id"]) or obj

    connection.send_result(
        msg["id"],
        {
            "entry_id": entry_id,
            "point": _serialize_point(obj, registry, hass, entry_id),
            "inspector": registry.inspector_attributes(obj),
            "history": registry.history(obj),
            "requires_reload": True,
        },
    )




@websocket_api.websocket_command(
    {
        vol.Required("type"): "bepacom/explorer/reload_entry",
        vol.Optional("entry_id"): str,
    }
)
@websocket_api.async_response
async def websocket_explorer_reload_entry(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Reload a Bepacom config entry on explicit user request.

    The reload is scheduled after the WebSocket response has been sent. Reloading
    the entry can temporarily tear down parts of the integration while the panel
    is still open. If the frontend waits for the reload call itself, some
    browsers/HA versions can retry or leave the panel in an unstable state. A
    short server-side lock also prevents accidental reload loops.
    """
    entry_id, data = _entry_data(hass, msg.get("entry_id"))
    if data is None or entry_id is None:
        connection.send_error(msg["id"], "not_found", "No Bepacom config entry is loaded")
        return

    domain_data = hass.data.setdefault(DOMAIN, {})
    in_progress = domain_data.setdefault("_manual_reload_in_progress", set())
    if entry_id in in_progress:
        connection.send_result(
            msg["id"],
            {"entry_id": entry_id, "scheduled": False, "reason": "reload_already_running"},
        )
        return

    in_progress.add(entry_id)
    connection.send_result(msg["id"], {"entry_id": entry_id, "scheduled": True})

    async def _do_reload() -> None:
        try:
            _LOGGER.info("Manual Bepacom reload requested from sidebar")
            await hass.config_entries.async_reload(entry_id)
        except Exception:  # noqa: BLE001 - log and release the lock
            _LOGGER.exception("Manual Bepacom reload from sidebar failed")
        finally:
            current = hass.data.setdefault(DOMAIN, {}).setdefault("_manual_reload_in_progress", set())
            if isinstance(current, set):
                current.discard(entry_id)

    def _schedule_reload(_now: Any) -> None:
        hass.async_create_task(_do_reload())

    async_call_later(hass, 0.2, _schedule_reload)

@callback
def async_notify_explorer_updated(hass: HomeAssistant) -> None:
    """Notify optional frontend listeners that point data changed."""
    async_dispatcher_send(hass, PANEL_EVENT)
