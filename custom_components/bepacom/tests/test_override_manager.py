"""Tests for entity representation and feedback overrides."""

from __future__ import annotations

import pytest

from custom_components.bepacom.models import BacnetObject
from custom_components.bepacom.override_manager import BepacomOverrideManager


def _multistate_output(object_id: str = "42") -> BacnetObject:
    return BacnetObject(
        device_id="1",
        object_id=object_id,
        object_type="multiStateOutput",
    )


@pytest.mark.parametrize("representation", ["switch", "light", "outlet"])
def test_multistate_representation_accepts_supported_entities(
    representation: str,
) -> None:
    """Supported entity representations survive option normalization."""
    point = _multistate_output()
    overrides = BepacomOverrideManager(
        {
            "entity_overrides": {
                point.unique_id: {"multistate_representation": representation}
            }
        }
    )

    assert overrides.get_multistate_representation(point) == representation


def test_multistate_representation_rejects_unknown_value() -> None:
    """Unknown representations safely fall back to a number entity."""
    point = _multistate_output()
    overrides = BepacomOverrideManager(
        {
            "entity_overrides": {
                point.unique_id: {"multistate_representation": "fan"}
            }
        }
    )

    assert overrides.get_multistate_representation(point) == "number"


def test_multistate_feedback_tracks_its_consumer() -> None:
    """An MSI used as feedback is linked to its MSO consumer."""
    point = _multistate_output()
    feedback_unique_id = "bepacom_1_multistateinput_42"
    overrides = BepacomOverrideManager(
        {
            "entity_overrides": {
                point.unique_id: {
                    "multistate_representation": "light",
                    "multistate_feedback_unique_id": feedback_unique_id,
                }
            }
        }
    )

    assert overrides.get_multistate_feedback_unique_id(point) == feedback_unique_id
    assert overrides.consumed_multistate_feedback_unique_ids() == {
        feedback_unique_id
    }
    assert overrides.multistate_feedback_consumer_unique_ids(feedback_unique_id) == [
        point.unique_id
    ]
