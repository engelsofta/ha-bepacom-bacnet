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


class LegacySchemaClient(BepacomClient):
    """Client exposing an old add-on OpenAPI schema."""

    def __init__(self) -> None:
        super().__init__("legacy-gateway.local")
        self.get_requests: list[str] = []

    async def _get(self, path: str) -> Any:
        self.get_requests.append(path)
        return {"paths": {"/apiv1/{deviceid}/{objectid}": {"post": {}}}}


class DiagnosticClient(BepacomClient):
    """Client exposing BACstac target diagnostics."""

    def __init__(self) -> None:
        super().__init__("gateway.local")
        self.get_requests: list[str] = []

    async def _get(self, path: str) -> Any:
        self.get_requests.append(path)
        return {"target_status": [{"device_id": "device:21", "object_id": "analogInput:403", "state": "cov_active"}]}


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
async def test_managed_targets_detects_legacy_schema_without_post() -> None:
    """Old add-ons are detected without hitting their generic write route."""
    client = LegacySchemaClient()

    first = await client.async_set_managed_targets([("1", "analogInput:403")])
    second = await client.async_set_managed_targets([("1", "analogInput:404")])

    assert first == {"accepted": False, "mode": "unsupported"}
    assert second == {"accepted": False, "mode": "unsupported"}
    assert client.get_requests == ["/openapi.json"]
    assert client._session is None


def test_legacy_snapshot_websocket_uses_global_endpoint() -> None:
    """Legacy compatibility connects directly to the add-on's global feed."""
    client = BepacomClient("192.0.2.10")

    assert client.legacy_snapshot_websocket_url() == "ws://192.0.2.10:8099/ws"


def test_managed_targets_payload_includes_requested_transport() -> None:
    """Per-object COV, polling and disabled modes are sent explicitly."""
    payload = BepacomClient._managed_targets_payload(
        [
            ("21", "analogInput:403", "cov"),
            ("21", "analogInput:404", "polling"),
            ("21", "analogInput:405", "disabled"),
        ]
    )

    assert payload == {
        "targets": [
            {
                "device_id": "21",
                "object_id": "analogInput:403",
                "update_mode": "cov",
            },
            {
                "device_id": "21",
                "object_id": "analogInput:404",
                "update_mode": "polling",
            },
            {
                "device_id": "21",
                "object_id": "analogInput:405",
                "update_mode": "disabled",
            },
        ]
    }


def test_managed_targets_payload_keeps_legacy_pairs_compatible() -> None:
    """Existing gateways still receive the original two-field payload."""
    assert BepacomClient._managed_targets_payload(
        [("1", "analogInput:7")]
    ) == {
        "targets": [
            {"device_id": "1", "object_id": "analogInput:7"}
        ]
    }


@pytest.mark.asyncio
async def test_subscription_diagnostics_use_dedicated_endpoint() -> None:
    """Effective transport state is read from BACstac diagnostics."""
    client = DiagnosticClient()

    result = await client.async_get_subscription_diagnostics()

    assert result["target_status"][0]["state"] == "cov_active"
    assert client.get_requests == ["/apiv1/diagnostics/subscriptions"]


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
