"""Tests for the Engelsoft STAC managed snapshot WebSocket."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import Any

import aiohttp
import pytest

from custom_components.bepacom.api import BepacomClient
from custom_components.bepacom.websocket_manager import (
    BepacomWebSocketManager,
    _SubscriptionState,
)


class ManagedSnapshotClient(BepacomClient):
    """Record gateway unsubscribe calls."""

    def __init__(self) -> None:
        super().__init__("stac-gateway.local")
        self.unsubscribe_calls: list[tuple[str, str]] = []

    async def async_unsubscribe(self, device_id: str, object_id: str) -> None:
        self.unsubscribe_calls.append((device_id, object_id))


@pytest.mark.asyncio
async def test_managed_snapshot_skips_individual_subscribe_and_unsubscribe() -> None:
    """The global listener never mutates individual gateway subscriptions."""
    client = ManagedSnapshotClient()

    async def on_update(*args: Any) -> None:
        return None

    manager = BepacomWebSocketManager(client, on_update)
    blocker = asyncio.Event()

    async def hold_connection(state: Any) -> None:
        await blocker.wait()

    manager._async_run_subscription = hold_connection  # type: ignore[method-assign]

    assert await manager.async_connect_managed_snapshot() is True
    assert await manager.async_connect_managed_snapshot() is True
    assert manager.diagnostics["subscriptions"] == 1

    await manager.async_unsubscribe_all()

    assert client.unsubscribe_calls == []


@pytest.mark.asyncio
async def test_reconnect_restore_can_receive_protocol_result() -> None:
    """The socket reader must run while reconnect targets are restored."""
    restore_started = asyncio.Event()
    restore_confirmed = asyncio.Event()

    class ReconnectWebSocket:
        """Yield a protocol result after the restore command has been sent."""

        def __aiter__(self) -> ReconnectWebSocket:
            return self

        async def __anext__(self) -> SimpleNamespace:
            if restore_confirmed.is_set():
                raise StopAsyncIteration
            await restore_started.wait()
            return SimpleNamespace(
                type=aiohttp.WSMsgType.TEXT,
                data='{"type":"result","id":"restore"}',
            )

        async def send_json(self, message: dict[str, Any]) -> None:
            return None

    class ReconnectClient(BepacomClient):
        """Provide a deterministic protocol-v2 WebSocket connection."""

        def __init__(self) -> None:
            super().__init__("stac-gateway.local")
            self._transport = "protocol_v2"

        async def async_ws_connect(self, url: str) -> ReconnectWebSocket:
            return ReconnectWebSocket()

        async def async_restore_protocol_targets(self) -> None:
            return None

        def handle_protocol_result(self, message: dict[str, Any]) -> None:
            restore_confirmed.set()

    async def on_update(*args: Any) -> None:
        return None

    async def restore_targets() -> None:
        restore_started.set()
        await restore_confirmed.wait()

    client = ReconnectClient()
    manager = BepacomWebSocketManager(
        client,
        on_update,
        on_reconnect=restore_targets,
    )
    state = _SubscriptionState(
        device_id="1",
        object_id="global",
        ws_url="ws://stac-gateway.local/ws/v2",
    )
    manager._stats_for_url(state.ws_url).connect_count = 1

    await asyncio.wait_for(manager._async_listen(state), timeout=1)

    assert restore_confirmed.is_set()
    assert state.websocket is None
