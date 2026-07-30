"""Tests for the Bepacom gateway API client."""

from __future__ import annotations

from typing import Any

import pytest

from custom_components.bepacom.api import BepacomClient


class RecordingClient(BepacomClient):
    """Client that records POST requests without opening a network connection."""

    def __init__(self) -> None:
        super().__init__("gateway.local")
        self.requests: list[tuple[str, dict[str, Any] | None, dict[str, Any] | None]] = []

    async def _post(
        self,
        path: str,
        data: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> Any:
        self.requests.append((path, data, params))
        return None


def test_normalize_device_path_id() -> None:
    """Device identifiers are normalized exactly once."""
    client = BepacomClient("gateway.local")

    assert client._normalize_device_path_id("17") == "device:17"
    assert client._normalize_device_path_id("device:17") == "device:17"


def test_normalize_object_path_id() -> None:
    """Gateway object identifiers support both API notations."""
    client = BepacomClient("gateway.local")

    assert client._normalize_object_path_id("analogValue:7") == "analog-value,7"
    assert client._normalize_object_path_id("analog-value,7") == "analog-value,7"


@pytest.mark.asyncio
async def test_write_binary_value_uses_bacnet_labels() -> None:
    """Binary values use active/inactive rather than ambiguous numeric values."""
    client = RecordingClient()

    await client.async_write_binary_value("1", "42", True, priority=8)
    await client.async_write_binary_value("1", "42", False, priority=4)

    assert client.requests == [
        (
            "/apiv2/device:1/binaryValue:42/presentValue",
            None,
            {"value": "active", "priority": 8},
        ),
        (
            "/apiv2/device:1/binaryValue:42/presentValue",
            None,
            {"value": "inactive", "priority": 4},
        ),
    ]


@pytest.mark.asyncio
async def test_release_present_value_omits_value() -> None:
    """Releasing a BACnet priority sends only the priority parameter."""
    client = RecordingClient()

    await client.async_release_present_value(
        "3",
        "analogValue",
        "9",
        priority=12,
    )

    assert client.requests == [
        (
            "/apiv2/device:3/analogValue:9/presentValue",
            None,
            {"priority": 12},
        )
    ]
