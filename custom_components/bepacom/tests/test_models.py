"""Tests for BACnet object model metadata."""

from __future__ import annotations

import pytest

from custom_components.bepacom.models import BacnetObject


def _point(object_type: str) -> BacnetObject:
    return BacnetObject(device_id="1", object_id="42", object_type=object_type)


@pytest.mark.parametrize(
    "object_type",
    [
        "analogOutput",
        "binaryOutput",
        "multiStateOutput",
        "analogValue",
        "binaryValue",
    ],
)
def test_missing_writable_metadata_uses_supported_type(object_type: str) -> None:
    point = _point(object_type)

    assert point.writable is None
    assert point.effective_writable is True


def test_missing_writable_metadata_does_not_enable_input() -> None:
    point = _point("analogInput")

    assert point.writable is None
    assert point.effective_writable is False


def test_explicit_false_writable_metadata_wins_over_type_fallback() -> None:
    point = _point("binaryOutput")

    point.update({"writable": False})

    assert point.writable is False
    assert point.effective_writable is False


@pytest.mark.parametrize(
    "metadata",
    [True, "true", "presentValue", "present_value", ["present-value"]],
)
def test_supported_writable_metadata_formats(metadata: object) -> None:
    point = _point("analogInput")

    point.update({"writable": metadata})

    assert point.writable is True
    assert point.effective_writable is True


def test_partial_update_preserves_reported_writable_state() -> None:
    point = _point("binaryOutput")
    point.update({"writable": False})

    point.update({"presentValue": True})

    assert point.writable is False
    assert point.effective_writable is False
