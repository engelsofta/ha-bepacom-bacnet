"""WebSocket subscription management for the Bepacom integration."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

import aiohttp

from .api import BepacomClient
from .exceptions import InvalidResponse

_LOGGER = logging.getLogger(__name__)
_MAX_INVALID_SUBSCRIPTION_WARNINGS = 5
_MAX_INVALID_SUBSCRIPTION_FAILURES = 25
_UNSUBSCRIBE_CONCURRENCY = 20

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
    owns_connection: bool = False


@dataclass(slots=True)
class _ConnectionStatistics:
    """Diagnostic counters for one WebSocket URL."""

    connect_count: int = 0
    reconnect_count: int = 0
    push_count: int = 0
    last_connect: float | None = None
    last_disconnect: float | None = None
    last_push: float | None = None


class BepacomWebSocketManager:
    """Manage WebSocket connections for BACnet object subscriptions."""

    def __init__(
        self,
        client: BepacomClient,
        on_update: UpdateCallback,
        on_subscription_failure: FailureCallback | None = None,
        heartbeat_timeout: int = 60,
        push_value_logging: bool = False,
    ) -> None:
        """Initialize the WebSocket manager."""
        self._client = client
        self._on_update = on_update
        self._on_subscription_failure = on_subscription_failure
        self._heartbeat_timeout = heartbeat_timeout
        self._push_value_logging = push_value_logging
        self._subscriptions: dict[tuple[str, str], _SubscriptionState] = {}
        self._max_backoff = 60
        self._invalid_subscription_warnings = 0
        self._invalid_subscription_failures = 0
        self._subscriptions_disabled = False
        self._subscribe_attempts = 0
        self._subscribe_successes = 0
        self._websocket_connects = 0
        self._websocket_updates = 0
        self._connection_statistics: dict[str, _ConnectionStatistics] = {}
        self._snapshot_targets: set[tuple[str, str]] = set()
        self._heartbeat_closes = 0
        self._last_resubscribe: float | None = None

    def _stats_for_url(self, ws_url: str) -> _ConnectionStatistics:
        """Return diagnostic statistics for one WebSocket URL."""
        return self._connection_statistics.setdefault(ws_url, _ConnectionStatistics())

    def _subscription_count_for_url(self, ws_url: str) -> int:
        """Return how many subscriptions currently use one WebSocket URL."""
        return sum(
            1
            for subscription in self._subscriptions.values()
            if subscription.ws_url == ws_url
        )

    @staticmethod
    def _format_age(timestamp: float | None) -> str:
        """Return a compact age string for a monotonic timestamp."""
        if timestamp is None:
            return "never"

        age = max(0.0, time.monotonic() - timestamp)

        if age < 60:
            return f"{age:.0f}s ago"

        if age < 3600:
            return f"{age / 60:.1f}m ago"

        return f"{age / 3600:.1f}h ago"

    def _log_diagnostics(self, ws_url: str, *, reason: str) -> None:
        """Write connection diagnostics at debug level."""
        if not _LOGGER.isEnabledFor(logging.DEBUG):
            return

        stats = self._stats_for_url(ws_url)

        _LOGGER.debug(
            (
                "Bepacom WebSocket diagnostics (%s): url=%s subscriptions=%s "
                "connects=%s reconnects=%s pushes=%s last_connect=%s "
                "last_disconnect=%s last_push=%s total_attempts=%s "
                "total_successes=%s total_updates=%s"
            ),
            reason,
            ws_url,
            self._subscription_count_for_url(ws_url),
            stats.connect_count,
            stats.reconnect_count,
            stats.push_count,
            self._format_age(stats.last_connect),
            self._format_age(stats.last_disconnect),
            self._format_age(stats.last_push),
            self._subscribe_attempts,
            self._subscribe_successes,
            self._websocket_updates,
        )

    def set_snapshot_targets(self, targets: list[tuple[str, str]]) -> None:
        """Set targets that should be processed from full snapshot WebSocket payloads.

        In snapshot mode the gateway is only subscribed once, but each push contains
        a full device snapshot. These targets are therefore processed without creating
        one gateway subscription per object.
        """
        self._snapshot_targets = set(targets)
        _LOGGER.info(
            "Bepacom snapshot WebSocket mode active: processing %s targets from snapshot payloads",
            len(self._snapshot_targets),
        )

    def clear_snapshot_targets(self) -> None:
        """Clear snapshot processing targets."""
        self._snapshot_targets.clear()

    @property
    def subscriptions_enabled(self) -> bool:
        """Return whether subscription attempts are still enabled."""
        return not self._subscriptions_disabled

    @property
    def diagnostics(self) -> dict[str, Any]:
        """Return current WebSocket diagnostics."""
        total_reconnects = sum(stats.reconnect_count for stats in self._connection_statistics.values())
        total_pushes = sum(stats.push_count for stats in self._connection_statistics.values())
        last_push = max(
            (stats.last_push for stats in self._connection_statistics.values() if stats.last_push is not None),
            default=None,
        )
        last_connect = max(
            (stats.last_connect for stats in self._connection_statistics.values() if stats.last_connect is not None),
            default=None,
        )
        last_disconnect = max(
            (stats.last_disconnect for stats in self._connection_statistics.values() if stats.last_disconnect is not None),
            default=None,
        )
        connected = any(
            state.websocket is not None and not state.websocket.closed
            for state in self._subscriptions.values()
        )

        return {
            "connected": connected,
            "subscriptions": len(self._subscriptions),
            "snapshot_targets": len(self._snapshot_targets),
            "websocket_urls": len(self._connection_statistics),
            "push_count": total_pushes,
            "reconnect_count": total_reconnects,
            "heartbeat_closes": self._heartbeat_closes,
            "last_push_age": self._format_age(last_push),
            "last_connect_age": self._format_age(last_connect),
            "last_disconnect_age": self._format_age(last_disconnect),
            "subscribe_attempts": self._subscribe_attempts,
            "subscribe_successes": self._subscribe_successes,
            "websocket_connects": self._websocket_connects,
            "websocket_updates": self._websocket_updates,
            "subscriptions_enabled": self.subscriptions_enabled,
            "push_value_logging": self._push_value_logging,
            "heartbeat_timeout": self._heartbeat_timeout,
        }

    async def async_subscribe(self, device_id: str, object_id: str) -> bool:
        """Subscribe to an object's change feed."""
        key = (device_id, object_id)
        self._subscribe_attempts += 1

        if self._subscriptions_disabled:
            _LOGGER.debug(
                "Skipping subscription for %s/%s because subscriptions are disabled",
                device_id,
                object_id,
            )
            return False

        if key in self._subscriptions:
            _LOGGER.debug(
                "Subscription for %s/%s already exists",
                device_id,
                object_id,
            )
            return True

        _LOGGER.debug(
            "Creating subscription for %s/%s (attempt %s)",
            device_id,
            object_id,
            self._subscribe_attempts,
        )

        try:
            ws_url = await self._client.async_subscribe(device_id, object_id)
        except InvalidResponse:
            self._invalid_subscription_failures += 1

            if self._invalid_subscription_warnings < _MAX_INVALID_SUBSCRIPTION_WARNINGS:
                _LOGGER.warning(
                    "Gateway returned invalid subscription payload for %s/%s",
                    device_id,
                    object_id,
                )
            elif self._invalid_subscription_warnings == _MAX_INVALID_SUBSCRIPTION_WARNINGS:
                _LOGGER.warning(
                    "Additional invalid subscription payload warnings suppressed; using polling fallback",
                )

            self._invalid_subscription_warnings += 1

            if (
                self._invalid_subscription_failures >= _MAX_INVALID_SUBSCRIPTION_FAILURES
                and not self._subscriptions
            ):
                self._subscriptions_disabled = True
                _LOGGER.warning(
                    "Disabling Bepacom subscriptions globally after repeated invalid responses; using polling only",
                )
                _LOGGER.warning(
                    "Subscription diagnostics: attempts=%s subscribe_successes=%s websocket_connects=%s websocket_updates=%s",
                    self._subscribe_attempts,
                    self._subscribe_successes,
                    self._websocket_connects,
                    self._websocket_updates,
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
        self._subscribe_successes += 1
        self._stats_for_url(ws_url)

        _LOGGER.debug(
            "Subscription created for %s/%s using WebSocket URL %s",
            device_id,
            object_id,
            ws_url,
        )

        owner_state = next(
            (
                existing
                for existing in self._subscriptions.values()
                if existing.ws_url == ws_url and existing.task is not None
            ),
            None,
        )

        if owner_state is None:
            state.owns_connection = True
            state.task = asyncio.create_task(
                self._async_run_subscription(state),
                name=f"bepacom-subscription-{device_id}-{object_id}",
            )
            _LOGGER.debug(
                "Created new WebSocket listener for %s via %s",
                f"{device_id}/{object_id}",
                ws_url,
            )
        else:
            _LOGGER.debug(
                "Reusing existing WebSocket listener for %s via %s",
                f"{device_id}/{object_id}",
                ws_url,
            )

        self._subscriptions[key] = state
        self._log_diagnostics(ws_url, reason="subscribe")
        return True

    async def async_unsubscribe(self, device_id: str, object_id: str) -> None:
        """Unsubscribe from an object's change feed."""
        key = (device_id, object_id)
        state = self._subscriptions.pop(key, None)

        if state is None:
            return

        _LOGGER.debug(
            "Removing subscription for %s/%s via %s",
            device_id,
            object_id,
            state.ws_url,
        )

        state.stop_event.set()

        if state.owns_connection:
            if state.websocket is not None and not state.websocket.closed:
                await state.websocket.close()

            if state.task is not None:
                state.task.cancel()

                try:
                    await state.task
                except asyncio.CancelledError:
                    pass

            await self._async_promote_shared_connection(state.ws_url)

        self._log_diagnostics(state.ws_url, reason="unsubscribe")

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
        states = list(self._subscriptions.values())

        self.clear_snapshot_targets()

        if not states:
            return

        _LOGGER.debug("Removing all Bepacom subscriptions (%s objects)", len(states))

        self._subscriptions.clear()

        # Close all active websockets first.
        for state in states:
            state.stop_event.set()

            if state.websocket is not None and not state.websocket.closed:
                await state.websocket.close()

        # Cancel owner tasks without trying to promote replacements during shutdown.
        for state in states:
            if state.task is None:
                continue

            state.task.cancel()

            try:
                await state.task
            except asyncio.CancelledError:
                pass

        # Unsubscribe on the gateway in bounded parallelism.
        semaphore = asyncio.Semaphore(_UNSUBSCRIBE_CONCURRENCY)

        async def _unsubscribe_state(state: _SubscriptionState) -> None:
            async with semaphore:
                try:
                    await self._client.async_unsubscribe(state.device_id, state.object_id)
                except Exception:
                    _LOGGER.exception(
                        "Failed to remove subscription for %s/%s",
                        state.device_id,
                        state.object_id,
                    )

        await asyncio.gather(*(_unsubscribe_state(state) for state in states))

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

            stats = self._stats_for_url(state.ws_url)
            stats.reconnect_count += 1

            _LOGGER.debug(
                "Reconnecting subscription for %s/%s via %s in %s seconds (reconnect #%s)",
                state.device_id,
                state.object_id,
                state.ws_url,
                reconnect_delay,
                stats.reconnect_count,
            )
            self._log_diagnostics(state.ws_url, reason="reconnect scheduled")
            await asyncio.sleep(reconnect_delay)
            await self._async_resubscribe_for_url(state.ws_url)
            reconnect_delay = min(reconnect_delay * 2, self._max_backoff)

    async def _async_heartbeat_watchdog(
        self,
        state: _SubscriptionState,
        websocket: aiohttp.ClientWebSocketResponse,
    ) -> None:
        """Close stale WebSocket connections when no pushes arrive."""
        while not state.stop_event.is_set() and not websocket.closed:
            await asyncio.sleep(max(5, min(30, self._heartbeat_timeout / 2)))

            stats = self._stats_for_url(state.ws_url)
            reference = stats.last_push or stats.last_connect

            if reference is None:
                continue

            age = time.monotonic() - reference

            if age < self._heartbeat_timeout:
                continue

            self._heartbeat_closes += 1
            _LOGGER.warning(
                "Bepacom WebSocket heartbeat timeout: url=%s owner=%s/%s no_push_for=%.1fs timeout=%ss; reconnecting",
                state.ws_url,
                state.device_id,
                state.object_id,
                age,
                self._heartbeat_timeout,
            )

            await websocket.close()
            return

    async def _async_resubscribe_for_url(self, ws_url: str) -> None:
        """Renew gateway subscriptions for one WebSocket URL after reconnect."""
        states = [
            subscription
            for subscription in tuple(self._subscriptions.values())
            if subscription.ws_url == ws_url
        ]

        if not states:
            return

        self._last_resubscribe = time.monotonic()

        _LOGGER.info(
            "Renewing Bepacom subscriptions after reconnect: url=%s objects=%s",
            ws_url,
            len(states),
        )

        for subscription in states:
            if subscription.stop_event.is_set():
                continue

            try:
                await self._client.async_subscribe(
                    subscription.device_id,
                    subscription.object_id,
                )
            except Exception:
                _LOGGER.exception(
                    "Failed to renew subscription for %s/%s",
                    subscription.device_id,
                    subscription.object_id,
                )

    async def _async_listen(self, state: _SubscriptionState) -> None:
        """Listen for updates on one WebSocket."""
        websocket = await self._client.async_ws_connect(state.ws_url)
        now = time.monotonic()
        stats = self._stats_for_url(state.ws_url)
        stats.connect_count += 1
        stats.last_connect = now
        self._websocket_connects += 1

        _LOGGER.debug(
            "Bepacom WebSocket connected: url=%s owner=%s/%s subscriptions=%s connect_count=%s",
            state.ws_url,
            state.device_id,
            state.object_id,
            self._subscription_count_for_url(state.ws_url),
            stats.connect_count,
        )
        self._log_diagnostics(state.ws_url, reason="connected")

        if self._websocket_connects == 1:
            _LOGGER.info(
                "Bepacom WebSocket connected for %s/%s; subscription diagnostics: attempts=%s subscribe_successes=%s",
                state.device_id,
                state.object_id,
                self._subscribe_attempts,
                self._subscribe_successes,
            )
        state.websocket = websocket
        heartbeat_task = asyncio.create_task(
            self._async_heartbeat_watchdog(state, websocket),
            name=f"bepacom-heartbeat-{state.device_id}-{state.object_id}",
        )

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

                self._websocket_updates += 1
                stats.push_count += 1
                stats.last_push = time.monotonic()

                processed, ignored = await self._dispatch_payload(state, payload)

                if self._push_value_logging and (
                    stats.push_count <= 5 or stats.push_count % 100 == 0
                ):
                    _LOGGER.debug(
                        "Bepacom WebSocket push received: url=%s owner=%s/%s processed=%s ignored=%s value=%s push_count=%s total_updates=%s",
                        state.ws_url,
                        state.device_id,
                        state.object_id,
                        processed,
                        ignored,
                        self._payload_debug_summary(payload),
                        stats.push_count,
                        self._websocket_updates,
                    )
        finally:
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass

            stats.last_disconnect = time.monotonic()
            _LOGGER.debug(
                "Bepacom WebSocket disconnected: url=%s owner=%s/%s pushes=%s",
                state.ws_url,
                state.device_id,
                state.object_id,
                stats.push_count,
            )
            self._log_diagnostics(state.ws_url, reason="disconnected")
            state.websocket = None

    async def _async_promote_shared_connection(self, ws_url: str) -> None:
        """Promote another subscription to own a shared WebSocket connection."""
        for candidate in self._subscriptions.values():
            if candidate.ws_url != ws_url:
                continue

            if candidate.task is not None:
                return

            _LOGGER.debug(
                "Promoting %s/%s to own shared WebSocket connection %s",
                candidate.device_id,
                candidate.object_id,
                ws_url,
            )
            candidate.stop_event.clear()
            candidate.owns_connection = True
            candidate.task = asyncio.create_task(
                self._async_run_subscription(candidate),
                name=f"bepacom-subscription-{candidate.device_id}-{candidate.object_id}",
            )
            return

    async def _dispatch_payload(
        self,
        state: _SubscriptionState,
        payload: dict[str, Any],
    ) -> tuple[int, int]:
        """Dispatch one websocket payload to matching subscriptions.

        Returns:
            A tuple with (processed, ignored).

        The Bepacom gateway may send a full device snapshot for every push.
        In snapshot mode we only create one gateway subscription and process the
        configured snapshot targets from each payload.
        """
        # Object-specific payloads belong to the owning subscription only.
        if "presentValue" in payload or "value" in payload:
            await self._invoke_update_callback(state.device_id, state.object_id, payload)
            return (1, 0)

        processed = 0
        ignored = 0

        if self._snapshot_targets:
            target_iterable = tuple(self._snapshot_targets)
        else:
            target_iterable = tuple(
                (subscribed_state.device_id, subscribed_state.object_id)
                for subscribed_state in self._subscriptions.values()
                if subscribed_state.ws_url == state.ws_url
            )

        for device_id, object_id in target_iterable:
            subscribed_payload = self._payload_for_subscription(
                payload,
                device_id,
                object_id,
            )

            if subscribed_payload is None:
                ignored += 1
                continue

            processed += 1

            await self._invoke_update_callback(
                device_id,
                object_id,
                subscribed_payload,
            )

        total_objects = self._count_object_payloads(payload)
        if total_objects > processed:
            ignored = max(ignored, total_objects - processed)

        return (processed, ignored)


    def _count_object_payloads(self, payload: dict[str, Any]) -> int:
        """Count object-like payloads in a nested device snapshot."""
        count = 0

        for device_key, device_payload in payload.items():
            if not isinstance(device_payload, dict):
                continue

            # Expected format:
            # {
            #   "device:1": {
            #       "analogInput:17": {...},
            #       "analogInput:25": {...},
            #   }
            # }
            if str(device_key).startswith("device:"):
                for object_key, object_payload in device_payload.items():
                    if ":" in str(object_key) and isinstance(object_payload, dict):
                        count += 1

        return count


    def _payload_for_subscription(
        self,
        payload: dict[str, Any],
        device_id: str,
        object_id: str,
    ) -> dict[str, Any] | None:
        """Return the object-specific payload for one subscription if present."""
        if object_id in payload and isinstance(payload[object_id], dict):
            return payload[object_id]

        device_key = f"device:{device_id}"
        device_payload = payload.get(device_key)

        if isinstance(device_payload, dict):
            object_payload = device_payload.get(object_id)

            if isinstance(object_payload, dict):
                return object_payload

        return None

    def _payload_debug_summary(self, payload: dict[str, Any]) -> str:
        """Return a compact value summary for WebSocket debug logging."""
        summaries = self._collect_payload_value_summaries(payload)

        if summaries:
            if len(summaries) > 5:
                return "; ".join(summaries[:5]) + f"; ... (+{len(summaries) - 5} more)"
            return "; ".join(summaries)

        try:
            compact_payload = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        except (TypeError, ValueError):
            compact_payload = str(payload)

        if len(compact_payload) > 800:
            compact_payload = compact_payload[:800] + "...(truncated)"

        return f"payload={compact_payload}"

    def _collect_payload_value_summaries(
        self,
        payload: Any,
        *,
        path: str = "",
    ) -> list[str]:
        """Collect useful value summaries from nested WebSocket payloads."""
        value_keys = {
            "presentValue",
            "present_value",
            "value",
            "newValue",
            "new_value",
            "currentValue",
            "current_value",
            "propertyValue",
            "property_value",
            "property-value",
        }

        if isinstance(payload, dict):
            summaries: list[str] = []

            for key, value in payload.items():
                key_text = str(key)
                child_path = f"{path}/{key_text}" if path else key_text

                if key_text in value_keys:
                    summaries.append(f"{child_path}={value}")
                    continue

                if isinstance(value, dict):
                    summaries.extend(
                        self._collect_payload_value_summaries(
                            value,
                            path=child_path,
                        )
                    )
                elif isinstance(value, list):
                    for index, item in enumerate(value[:10]):
                        summaries.extend(
                            self._collect_payload_value_summaries(
                                item,
                                path=f"{child_path}[{index}]",
                            )
                        )

            return summaries

        return []


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
