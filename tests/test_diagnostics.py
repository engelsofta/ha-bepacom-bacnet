"""Tests for privacy-safe integration diagnostics."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from custom_components.bepacom.const import DOMAIN
from custom_components.bepacom.diagnostics import (
    async_get_config_entry_diagnostics,
)
from custom_components.bepacom.models import BacnetObject


@pytest.mark.asyncio
async def test_diagnostics_redacts_host_and_summarizes_inventory() -> None:
    """Diagnostics contain useful counts but no gateway address or raw database."""
    point = BacnetObject(
        device_id="1",
        object_id="17",
        object_type="analogInput",
        object_name="Sensitive room name",
        present_value=21.5,
    )
    registry = MagicMock()
    registry.all.side_effect = lambda include_disabled=False: [point]
    coordinator = SimpleNamespace(
        point_registry=registry,
        last_update_success=True,
        data_revision=7,
        websocket_diagnostics={
            "connected": True,
            "reconnect_count": 2,
            "fallback_objects": 0,
        },
    )
    entry = SimpleNamespace(
        entry_id="entry-1",
        title="Bepacom",
        data={"host": "192.0.2.10", "port": 8099},
        options={"entity_overrides": {"private-point-id": {"enabled": True}}},
    )
    hass = SimpleNamespace(
        data={DOMAIN: {entry.entry_id: {"coordinator": coordinator}}}
    )

    result = await async_get_config_entry_diagnostics(hass, entry)
    serialized = repr(result)

    assert result["config_entry"]["data"]["host"] == "**REDACTED**"
    assert result["config_entry"]["data"]["port"] == 8099
    assert result["inventory"] == {
        "device_count": 1,
        "point_count": 1,
        "enabled_point_count": 1,
        "disabled_point_count": 0,
    }
    assert result["transport"]["connected"] is True
    assert "192.0.2.10" not in serialized
    assert "Sensitive room name" not in serialized
    assert "private-point-id" not in serialized
