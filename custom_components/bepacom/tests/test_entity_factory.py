"""Tests for BACnet-to-Home Assistant entity metadata mapping."""

from __future__ import annotations

import pytest

from custom_components.bepacom.entity_factory import (
    UNIT_AMPERE,
    BacnetObjectTypeMapper,
)
from custom_components.bepacom.models import BacnetObject


@pytest.mark.parametrize("units", [255, "255", "noUnits", "no-units", "none"])
def test_explicitly_unitless_value_suppresses_name_inference(units: str | int) -> None:
    """Explicit no-unit metadata wins over ambiguous words in the name."""
    point = BacnetObject(
        device_id="1",
        object_id="33",
        object_type="analogInput",
        object_name="Current operating state",
        units=units,
    )

    assert BacnetObjectTypeMapper.get_unit_of_measurement(point) is None


def test_missing_unit_still_allows_name_inference() -> None:
    """The useful legacy fallback remains available when metadata is absent."""
    point = BacnetObject(
        device_id="1",
        object_id="34",
        object_type="analogInput",
        object_name="Motor current",
        units=None,
    )

    assert BacnetObjectTypeMapper.get_unit_of_measurement(point) == UNIT_AMPERE


def test_explicit_measurement_unit_takes_precedence() -> None:
    """A real BACnet engineering unit continues to map normally."""
    point = BacnetObject(
        device_id="1",
        object_id="35",
        object_type="analogInput",
        object_name="Current operating state",
        units="percent",
    )

    assert BacnetObjectTypeMapper.get_unit_of_measurement(point) == "%"
