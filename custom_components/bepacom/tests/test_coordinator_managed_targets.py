"""Tests for integration-controlled gateway targets."""

from __future__ import annotations

from types import SimpleNamespace

from custom_components.bepacom.coordinator import BepacomCoordinator


class _Registry:
    def __init__(self, points):
        self._points = points

    def all(self, *, include_disabled: bool = False):
        assert include_disabled is True
        return iter(self._points)


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
