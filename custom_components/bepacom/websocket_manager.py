"""WebSocket subscription management for the Bepacom integration."""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

import aiohttp

from .api import BepacomClient
from .exceptions import InvalidResponse

_LOGGER = logging.getLogger(__name__)

type UpdateCallback = Callable[[str, str, dict[str, Any]], Awaitable[None] | None]
type FailureCallback = Callable[[str, str], Awaitable[None] | None]


@dataclass(slots=True)
class _SubscriptionState:
    """Tracks one object subscription."""

    device_id: str
    object_id: str
    ws_url: str
    task: asyncio.Task[None] | None = None
    websocket: aiohttp.ClientWebSocketResponse | None = None
    stop_event: asyncio.Event = field(default_factory=asyncio.Event)


class BepacomWebSocketManager:
    """Manage WebSocket connections for BACnet object subscriptions."""

    def __init__(
        self,
        client: BepacomClient,
        on_update: UpdateCallback,
        on_subscription_failure: FailureCallback | None = None,
    ) -> None:
        """Initialize the WebSocket manager."""
        self._client = client
        self._on_update = on_update
        self._on_subscription_failure = on_subscription_failure
        self._subscriptions: dict[tuple[str, str], _SubscriptionState] = {}
        self._max_backoff = 60

    async def async_subscribe(self, device_id: str, object_id: str) -> bool:
        """Subscribe to an object's change feed."""
        key = (device_id, object_id)

        if key in self._subscriptions:
            return True

        try:
            ws_url = await self._client.async_subscribe(device_id, object_id)
        except InvalidResponse:
            _LOGGER.warning(
                "Gateway returned invalid subscription payload for %s/%s",
                device_id,
                object_id,
            )

            if self._on_subscription_failure is not None:
                await self._invoke_failure_callback(device_id, object_id)

            return False
        except Exception:
            _LOGGER.exception(
                "Failed to create subscription for %s/%s",
                device_id,
                object_id,
            )

            if self._on_subscription_failure is not None:
                await self._invoke_failure_callback(device_id, object_id)

            return False

        state = _SubscriptionState(
            device_id=device_id,
            object_id=object_id,
            ws_url=ws_url,
        )
        state.task = asyncio.create_task(
            self._async_run_subscription(state),
            name=f"bepacom-subscription-{device_id}-{object_id}",
        )
        self._subscriptions[key] = state
        return True

    async def async_unsubscribe(self, device_id: str, object_id: str) -> None:
        """Unsubscribe from an object's change feed."""
        key = (device_id, object_id)
        state = self._subscriptions.pop(key, None)

        if state is None:
            return

        state.stop_event.set()

        if state.websocket is not None and not state.websocket.closed:
            await state.websocket.close()

        if state.task is not None:
            state.task.cancel()

            try:
                await state.task
            except asyncio.CancelledError:
                pass

        try:
            await self._client.async_unsubscribe(device_id, object_id)
        except Exception:
            _LOGGER.exception(
                "Failed to remove subscription for %s/%s",
                device_id,
                object_id,
            )

    async def async_unsubscribe_all(self) -> None:
        """Unsubscribe from all active object feeds."""
        for device_id, object_id in list(self._subscriptions):
            await self.async_unsubscribe(device_id, object_id)

    async def _async_run_subscription(self, state: _SubscriptionState) -> None:
        """Keep a single subscription connected."""
        reconnect_delay = 1

        while not state.stop_event.is_set():
            try:
                await self._async_listen(state)
                reconnect_delay = 1
            except asyncio.CancelledError:
                break
            except Exception:
                _LOGGER.exception(
                    "WebSocket connection failed for %s/%s",
                    state.device_id,
                    state.object_id,
                )

            if state.stop_event.is_set():
                break

            _LOGGER.debug(
                "Reconnecting subscription for %s/%s in %s seconds",
                state.device_id,
                state.object_id,
                reconnect_delay,
            )
            await asyncio.sleep(reconnect_delay)
            reconnect_delay = min(reconnect_delay * 2, self._max_backoff)

    async def _async_listen(self, state: _SubscriptionState) -> None:
        """Listen for updates on one WebSocket."""
        websocket = await self._client.async_ws_connect(state.ws_url)
        state.websocket = websocket

        try:
            async for message in websocket:
                if state.stop_event.is_set():
                    break

                if message.type in (
                    aiohttp.WSMsgType.TEXT,
                    aiohttp.WSMsgType.BINARY,
                ):
                    payload = self._parse_message(message.data)
                elif message.type == aiohttp.WSMsgType.ERROR:
                    raise RuntimeError("WebSocket error received from gateway")
                else:
                    continue

                if payload is None:
                    continue

                await self._invoke_update_callback(
                    state.device_id,
                    state.object_id,
                    payload,
                )
        finally:
            state.websocket = None

    def _parse_message(self, message: str | bytes) -> dict[str, Any] | None:
        """Parse one WebSocket message into object data."""
        if isinstance(message, bytes):
            try:
                message = message.decode("utf-8")
            except UnicodeDecodeError:
                _LOGGER.warning("Ignoring non-UTF-8 WebSocket message")
                return None

        if not message:
            return None

        try:
            payload = json.loads(message)
        except json.JSONDecodeError:
            if message.lstrip().startswith(("{", "[")):
                _LOGGER.warning("Ignoring malformed WebSocket payload: %s", message)
                return None

            return {"presentValue": message}

        return self._normalize_payload(payload)

    def _normalize_payload(self, payload: Any) -> dict[str, Any]:
        """Normalize subscription payloads into object-like data."""
        if isinstance(payload, dict):
            if "presentValue" in payload:
                return payload

            if "value" in payload:
                normalized = dict(payload)
                normalized.setdefault("presentValue", payload["value"])
                return normalized

            if "data" in payload:
                data = payload["data"]

                if isinstance(data, dict):
                    return self._normalize_payload(data)

                return {"presentValue": data}

            return payload

        return {"presentValue": payload}

    async def _invoke_update_callback(
        self,
        device_id: str,
        object_id: str,
        payload: dict[str, Any],
    ) -> None:
        """Invoke the update callback."""
        result = self._on_update(device_id, object_id, payload)

        if asyncio.iscoroutine(result):
            await result

    async def _invoke_failure_callback(
        self,
        device_id: str,
        object_id: str,
    ) -> None:
        """Invoke the failure callback."""
        if self._on_subscription_failure is None:
            return

        result = self._on_subscription_failure(device_id, object_id)

        if asyncio.iscoroutine(result):
            await result
