"""Tests for integration-controlled gateway targets."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from custom_components.bepacom.coordinator import BepacomCoordinator


class _Registry:
    def __init__(self, points):
        self._points = points
        self.refreshed_options = None

    def all(self, *, include_disabled: bool = False):
        assert include_disabled is True
        return iter(self._points)

    def refresh_options(self, options):
        self.refreshed_options = options


class _Overrides:
    def __init__(self, modes):
        self._modes = modes

    def get_update_mode(self, point):
        return self._modes[point.unique_id]


def test_managed_targets_map_all_integration_modes() -> None:
    """Every discovered point is sent with its requested add-on transport."""
    points = [
        SimpleNamespace(
            unique_id="push", device_id="21", object_type="analogInput", object_id="403"
        ),
        SimpleNamespace(
            unique_id="poll", device_id="21", object_type="analogInput", object_id="404"
        ),
        SimpleNamespace(
            unique_id="off", device_id="21", object_type="analogInput", object_id="405"
        ),
    ]
    coordinator = SimpleNamespace(
        point_registry=_Registry(points),
        _overrides=_Overrides(
            {"push": "subscribe", "poll": "polling", "off": "disabled"}
        ),
    )

    assert BepacomCoordinator._iter_managed_targets(coordinator) == [
        ("21", "analogInput:403", "cov"),
        ("21", "analogInput:404", "polling"),
        ("21", "analogInput:405", "disabled"),
    ]


def test_refresh_options_updates_managed_target_modes_without_reload() -> None:
    """A saved transport mode is used by Stac Update immediately."""
    point = SimpleNamespace(
        unique_id="point", device_id="21", object_type="analogInput", object_id="403"
    )
    registry = _Registry([point])
    coordinator = SimpleNamespace(
        point_registry=registry,
        _overrides=_Overrides({"point": "polling"}),
    )
    options = {
        "entity_overrides": {
            "point": {
                "update_mode": "subscribe",
                "enabled": True,
                "subscribe": True,
            }
        }
    }

    BepacomCoordinator.refresh_options(coordinator, options)

    assert registry.refreshed_options == options
    assert BepacomCoordinator._iter_managed_targets(coordinator) == [
        ("21", "analogInput:403", "cov")
    ]


@pytest.mark.asyncio
async def test_apply_managed_targets_sends_one_complete_profile() -> None:
    """Saved modes are applied in one request without reconnecting WebSocket."""
    targets = [
        ("21", "analogInput:403", "cov"),
        ("21", "analogInput:404", "polling"),
        ("21", "analogInput:405", "disabled"),
    ]
    client = SimpleNamespace(
        async_set_managed_targets=AsyncMock(
            return_value={"accepted": True, "strategy": "integration"}
        )
    )
    websocket_manager = SimpleNamespace(set_snapshot_targets=Mock())
    coordinator = SimpleNamespace(
        _snapshot_websocket_mode=True,
        _managed_target_restore_lock=asyncio.Lock(),
        client=client,
        _websocket_manager=websocket_manager,
        _iter_managed_targets=lambda: targets,
        _snapshot_initial_values=lambda active: {},
        async_gateway_target_status=AsyncMock(return_value={}),
    )

    result = await BepacomCoordinator.async_apply_managed_targets(coordinator)

    client.async_set_managed_targets.assert_awaited_once_with(targets)
    websocket_manager.set_snapshot_targets.assert_called_once_with(
        [("21", "analogInput:403"), ("21", "analogInput:404")], {}
    )
    coordinator.async_gateway_target_status.assert_awaited_once_with(force=True)
    assert result == {
        "total": 3,
        "cov": 1,
        "polling": 1,
        "disabled": 1,
        "accepted": True,
        "strategy": "integration",
    }
