"""Regression tests for entity IDs saved before an MSO representation change."""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from custom_components.bepacom import _async_apply_deferred_entity_registry_overrides
from custom_components.bepacom.const import CONF_ENTITY_OVERRIDES
from custom_components.bepacom.models import BacnetObject
from custom_components.bepacom.point_registry import BepacomPointRegistry


@pytest.mark.asyncio
@pytest.mark.parametrize("key_style", ["unique", "device", "object"])
@pytest.mark.parametrize("representation,domain", [("light", "light"), ("switch", "switch"), ("outlet", "switch")])
async def test_stale_domain_cleanup_preserves_settings_and_is_persistent(monkeypatch, key_style, representation, domain):
    obj = BacnetObject(device_id="1", object_id="42", object_type="multiStateOutput", object_name="Point", present_value=1)
    object_key = f"{obj.object_type}:{obj.object_id}"
    key = {"unique": obj.unique_id, "device": f"{obj.device_id}|{object_key}", "object": object_key}[key_style]
    override = {"entity_id": "number.old", "entity_name": "Custom", "multistate_representation": representation, "write_priority": 8}
    options = {CONF_ENTITY_OVERRIDES: {key: override, "unrelated": {"entity_id": "sensor.keep"}}, "other": True}
    entry = SimpleNamespace(options=options, entry_id="entry")
    points = BepacomPointRegistry(options)
    monkeypatch.setattr(points, "all", lambda: [obj])
    coordinator = SimpleNamespace(point_registry=points, refresh_options=points.refresh_options)
    registered = SimpleNamespace(unique_id=obj.unique_id, entity_id=f"{domain}.current", name="Old", platform="bepacom")
    registry = MagicMock()
    registry.async_get.return_value = None
    monkeypatch.setattr("custom_components.bepacom.er.async_get", lambda hass: registry)
    monkeypatch.setattr("custom_components.bepacom.er.async_entries_for_config_entry", lambda registry, entry_id: [registered])
    hass = MagicMock()
    def save(entry, *, options):
        entry.options = options
    hass.config_entries.async_update_entry.side_effect = save

    await _async_apply_deferred_entity_registry_overrides(hass, entry, coordinator)

    hass.config_entries.async_update_entry.assert_called_once()
    cleaned = entry.options[CONF_ENTITY_OVERRIDES][key]
    assert cleaned == {k: v for k, v in override.items() if k != "entity_id"}
    assert override["entity_id"] == "number.old"
    assert entry.options["other"] is True
    assert entry.options[CONF_ENTITY_OVERRIDES]["unrelated"] == {"entity_id": "sensor.keep"}
    registry.async_update_entity.assert_called_once_with(f"{domain}.current", name="Custom")
    await _async_apply_deferred_entity_registry_overrides(hass, entry, coordinator)
    hass.config_entries.async_update_entry.assert_called_once()


@pytest.mark.asyncio
async def test_same_domain_custom_id_is_applied_without_cleanup(monkeypatch):
    obj = BacnetObject(device_id="1", object_id="42", object_type="multiStateOutput", object_name="Point", present_value=1)
    override = {"entity_id": "light.custom", "multistate_representation": "light"}
    options = {CONF_ENTITY_OVERRIDES: {obj.unique_id: override}}
    entry = SimpleNamespace(options=options, entry_id="entry")
    points = BepacomPointRegistry(options)
    monkeypatch.setattr(points, "all", lambda: [obj])
    coordinator = SimpleNamespace(point_registry=points, refresh_options=points.refresh_options)
    registered = SimpleNamespace(unique_id=obj.unique_id, entity_id="light.current", name=None, platform="bepacom")
    registry = MagicMock()
    registry.async_get.return_value = None
    monkeypatch.setattr("custom_components.bepacom.er.async_get", lambda hass: registry)
    monkeypatch.setattr("custom_components.bepacom.er.async_entries_for_config_entry", lambda registry, entry_id: [registered])
    hass = MagicMock()

    await _async_apply_deferred_entity_registry_overrides(hass, entry, coordinator)

    registry.async_update_entity.assert_called_once_with("light.current", new_entity_id="light.custom")
    hass.config_entries.async_update_entry.assert_not_called()
    assert entry.options is options
