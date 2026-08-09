"""Tests for Bepacom BACnet number entities."""

from __future__ import annotations

import pytest

from custom_components.bepacom.models import BacnetObject
from custom_components.bepacom.number import (
    DEFAULT_ANALOG_VALUE_STEP,
    native_step_from_resolution,
)
from custom_components.bepacom.override_manager import BepacomOverrideManager


@pytest.mark.parametrize(
    ("resolution", "expected"),
    [
        (1, 1.0),
        ("1.0", 1.0),
        (0.1, 0.1),
        ("0.01", 0.01),
    ],
)
def test_native_step_uses_bacnet_resolution(resolution: object, expected: float) -> None:
    """A valid BACnet resolution becomes the Home Assistant number step."""
    assert native_step_from_resolution(resolution) == expected


@pytest.mark.parametrize(
    "resolution",
    [None, "", "unknown", "unavailable", 0, -1, "invalid", "NaN", "Infinity"],
)
def test_native_step_falls_back_for_invalid_resolution(resolution: object) -> None:
    """Missing or invalid metadata uses the established safe fallback."""
    assert native_step_from_resolution(resolution) == DEFAULT_ANALOG_VALUE_STEP


def test_explicit_number_step_override_takes_precedence() -> None:
    """A user-selected step remains more specific than BACnet metadata."""
    point = BacnetObject(
        device_id="1",
        object_id="258",
        object_type="analogValue",
        resolution=1,
    )
    overrides = BepacomOverrideManager(
        {"entity_overrides": {point.unique_id: {"number_step": 0.5}}}
    )

    step = overrides.get_number_setting(
        point,
        "number_step",
        native_step_from_resolution(point.resolution),
    )

    assert step == 0.5
