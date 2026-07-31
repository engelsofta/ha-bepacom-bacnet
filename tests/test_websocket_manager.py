"""Tests for legacy WebSocket compatibility."""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from custom_components.bepacom.api import BepacomClient
from custom_components.bepacom.websocket_manager import BepacomWebSocketManager


class LegacyClient(BepacomClient):
    """Record gateway unsubscribe calls."""

    def __init__(self) -> None:
        super().__init__("legacy-gateway.local")
        self.unsubscribe_calls: list[tuple[str, str]] = []

    async def async_unsubscribe(self, device_id: str, object_id: str) -> None:
        self.unsubscribe_calls.append((device_id, object_id))


@pytest.mark.asyncio
async def test_legacy_snapshot_skips_subscribe_and_unsubscribe() -> None:
    """A legacy global listener never mutates gateway subscriptions."""
    client = LegacyClient()

    async def on_update(*args: Any) -> None:
        return None

    manager = BepacomWebSocketManager(client, on_update)
    blocker = asyncio.Event()

    async def hold_connection(state: Any) -> None:
        await blocker.wait()

    manager._async_run_subscription = hold_connection  # type: ignore[method-assign]

    assert await manager.async_connect_legacy_snapshot() is True
    assert await manager.async_connect_legacy_snapshot() is True
    assert manager.diagnostics["subscriptions"] == 1

    await manager.async_unsubscribe_all()

    assert client.unsubscribe_calls == []
