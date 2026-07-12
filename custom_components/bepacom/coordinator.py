"""DataUpdateCoordinator for the Bepacom integration."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import (
    DataUpdateCoordinator,
    UpdateFailed,
)

from .api import BepacomClient
from .const import (
    CONF_ENABLE_POLLING,
    CONF_HEARTBEAT_TIMEOUT,
    CONF_PUSH_VALUE_LOGGING,
    CONF_SNAPSHOT_WEBSOCKET_MODE,
    CONF_SUBSCRIBED_OBJECTS,
    DEFAULT_ENABLE_POLLING,
    DEFAULT_HEARTBEAT_TIMEOUT,
    DEFAULT_PUSH_VALUE_LOGGING,
    DEFAULT_SCAN_INTERVAL,
    DEFAULT_SNAPSHOT_WEBSOCKET_MODE,
    DOMAIN,
    FALLBACK_POLL_INTERVAL,
)
from .discovery import DiscoveryEngine
from .exceptions import InvalidResponse
from .override_manager import BepacomOverrideManager
from .point_registry import BepacomPointRegistry
from .websocket_manager import BepacomWebSocketManager

_LOGGER = logging.getLogger(__name__)
_MAX_INVALID_FALLBACK_RESPONSES = 3
_PUSH_UPDATE_DEBOUNCE_SECONDS = 0.5
_SUBSCRIBE_CONCURRENCY = 5


class BepacomCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Coordinator responsible for fetching and analysing BACnet data."""

    def __init__(
        self,
        hass: HomeAssistant,
        client: BepacomClient,
        entry,
    ) -> None:
        """Initialize coordinator."""

        self._polling_enabled = entry.options.get(
            CONF_ENABLE_POLLING,
            DEFAULT_ENABLE_POLLING,
        )
        self._snapshot_websocket_mode = entry.options.get(
            CONF_SNAPSHOT_WEBSOCKET_MODE,
            DEFAULT_SNAPSHOT_WEBSOCKET_MODE,
        )
        self._push_value_logging = entry.options.get(
            CONF_PUSH_VALUE_LOGGING,
            DEFAULT_PUSH_VALUE_LOGGING,
        )
        self._heartbeat_timeout = entry.options.get(
            CONF_HEARTBEAT_TIMEOUT,
            DEFAULT_HEARTBEAT_TIMEOUT,
        )

        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=DEFAULT_SCAN_INTERVAL if self._polling_enabled else None,
        )

        self.client = client
        self._entry = entry
        self._overrides = BepacomOverrideManager(entry.options)

        if self._polling_enabled:
            _LOGGER.info(
                "Bepacom cyclic polling enabled: interval=%s",
                DEFAULT_SCAN_INTERVAL,
            )
        else:
            _LOGGER.info(
                "Bepacom cyclic polling disabled; using initial discovery and WebSocket/subscription updates only",
            )

        if self._snapshot_websocket_mode:
            _LOGGER.info(
                "Bepacom snapshot WebSocket mode enabled; only one gateway subscription will be created and configured objects will be processed from each snapshot",
            )

        self.discovery = DiscoveryEngine()
        self.point_registry = BepacomPointRegistry(entry.options)

        self._discovery_completed = False

        self.data: dict[str, Any] = {}
        self._websocket_manager = BepacomWebSocketManager(
            client=client,
            on_update=self._async_handle_subscription_update,
            on_subscription_failure=self._async_handle_subscription_failure,
            heartbeat_timeout=self._heartbeat_timeout,
            push_value_logging=self._push_value_logging,
        )
        self._fallback_objects: set[tuple[str, str]] = set()
        self._fallback_invalid_responses: dict[tuple[str, str], int] = {}
        self._fallback_task = None
        self._subscriptions_started = False
        self._subscriptions_initialized = False
        self._last_subscription_summary: tuple[int, int] | None = None
        self._last_inventory_summary: tuple[int, int] | None = None
        self._pending_push_update_task: asyncio.Task[None] | None = None

    @property
    def websocket_diagnostics(self) -> dict[str, Any]:
        """Return WebSocket diagnostics for diagnostic entities."""
        diagnostics = dict(self._websocket_manager.diagnostics)
        diagnostics.update(
            {
                "polling_enabled": self._polling_enabled,
                "snapshot_websocket_mode": self._snapshot_websocket_mode,
                "subscriptions_started": self._subscriptions_started,
                "subscriptions_initialized": self._subscriptions_initialized,
                "last_subscription_summary": self._last_subscription_summary,
                "fallback_objects": len(self._fallback_objects),
            }
        )
        return diagnostics

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch data from the Bepacom gateway."""

        _LOGGER.debug("Requesting BACnet database...")

        try:
            raw = await self.client.async_get_database()

            if raw is None:
                raise UpdateFailed("Gateway returned no data.")

            if not isinstance(raw, dict):
                raise UpdateFailed(
                    f"Unexpected response type: {type(raw)}"
                )




            if not self._discovery_completed:
                _LOGGER.info("Running initial BACnet discovery...")

                # The gateway can answer HTTP requests before its BACnet
                # inventory is ready after a full host reboot. Do not commit a
                # temporary empty/incomplete snapshot: platform setup only runs
                # once and virtual entities whose source is absent would
                # otherwise not be created until the integration is reloaded.
                discovery = DiscoveryEngine()
                discovery.parse(raw)

                if not discovery.devices or not discovery.objects:
                    raise UpdateFailed(
                        "BACnet inventory is not ready yet "
                        f"({len(discovery.devices)} devices / "
                        f"{len(discovery.objects)} objects)"
                    )

                configured_virtual_sources = {
                    str(item.get("source_unique_id") or "").strip()
                    for item in self._overrides.get_virtual_entities()
                    if item.get("source_unique_id")
                }
                missing_virtual_sources = configured_virtual_sources.difference(
                    discovery.objects
                )
                if missing_virtual_sources:
                    raise UpdateFailed(
                        "BACnet inventory is still incomplete; waiting for "
                        f"{len(missing_virtual_sources)} configured virtual-entity "
                        "source point(s)"
                    )

                self.discovery = discovery

                inventory_summary = (
                    len(self.discovery.devices),
                    len(self.discovery.objects),
                )

                _LOGGER.info(
                    "Discovery finished: %s devices / %s objects",
                    inventory_summary[0],
                    inventory_summary[1],
                )

                self._last_inventory_summary = inventory_summary
                self.point_registry.load_discovery(self.discovery.devices, self.discovery.objects)
                self._discovery_completed = True

            self.data = raw


            if (
                self._subscriptions_started
                and self._websocket_manager.subscriptions_enabled
                and not self._subscriptions_initialized
            ):
                await self._async_initialize_subscriptions()

            if self._discovery_completed:
                self.point_registry.load_discovery(self.discovery.devices, self.discovery.objects)

            return raw

        except Exception as err:
            if self._discovery_completed:
                _LOGGER.exception("Coordinator update failed")
            else:
                # Home Assistant retries a failed first refresh with backoff.
                _LOGGER.warning("Bepacom is not ready yet: %s", err)

            raise UpdateFailed(str(err)) from err

    async def async_start(self) -> None:
        """Start object subscriptions after the initial refresh."""
        if self._subscriptions_started:
            return

        self._subscriptions_started = True
        await self._async_initialize_subscriptions()

    async def async_shutdown(self) -> None:
        """Stop subscriptions and fallback polling."""
        self._subscriptions_started = False
        self._subscriptions_initialized = False
        self._last_subscription_summary = None

        if self._fallback_task is not None:
            self._fallback_task.cancel()

            try:
                await self._fallback_task
            except asyncio.CancelledError:
                pass

            self._fallback_task = None
        
        if self._pending_push_update_task is not None:
            self._pending_push_update_task.cancel()
            
            try:
                await self._pending_push_update_task
            except asyncio.CancelledError:
                pass
            
            self._pending_push_update_task = None

        self._fallback_objects.clear()
        self._fallback_invalid_responses.clear()
        await self._websocket_manager.async_unsubscribe_all()

    async def _async_initialize_subscriptions(self) -> None:
        """Initialize subscriptions once after discovery has completed."""
        if self._subscriptions_initialized:
            return

        if not self._websocket_manager.subscriptions_enabled:
            _LOGGER.debug("Skipping Bepacom subscriptions because subscriptions are disabled.")
            return

        targets = self._iter_subscription_targets()
        polling_targets = self._iter_polling_targets()
        self._set_configured_polling_targets(polling_targets)

        if not targets:
            if polling_targets:
                _LOGGER.info(
                    "No Bepacom subscription targets configured; starting per-object polling for %s objects.",
                    len(polling_targets),
                )
                self._ensure_fallback_polling()
            else:
                _LOGGER.debug(
                    "No Bepacom subscription or per-object polling targets configured."
                )
            self._subscriptions_initialized = True
            self._last_subscription_summary = (0, 0)
            return

        if self._snapshot_websocket_mode:
            initial_values = self._snapshot_initial_values(targets)
            self._websocket_manager.set_snapshot_targets(targets, initial_values)
            gateway_targets = targets[:1]

            _LOGGER.info(
                "Initializing Bepacom snapshot WebSocket subscription: trigger=%s/%s, processed_targets=%s",
                gateway_targets[0][0],
                gateway_targets[0][1],
                len(targets),
            )
        else:
            gateway_targets = targets
            self._websocket_manager.clear_snapshot_targets()

            _LOGGER.info("Initializing Bepacom subscriptions for %s objects...", len(targets))

        successful = await self._async_subscribe_discovered_objects(gateway_targets)

        self._subscriptions_initialized = True
        self._last_subscription_summary = (successful, len(targets))

        if self._snapshot_websocket_mode:
            _LOGGER.info(
                "Bepacom snapshot WebSocket initialized: gateway_subscriptions=%s processed_targets=%s",
                successful,
                len(targets),
            )
        else:
            _LOGGER.info(
                "Bepacom subscriptions initialized: %s/%s active",
                successful,
                len(targets),
            )

    def _snapshot_initial_values(
        self,
        targets: list[tuple[str, str]],
    ) -> dict[tuple[str, str], Any]:
        """Return current registry values for snapshot prefilter seeding."""
        initial_values: dict[tuple[str, str], Any] = {}

        for device_id, object_id in targets:
            point = self.point_registry.get_by_path(device_id, object_id)
            if point is None:
                continue
            initial_values[(device_id, object_id)] = point.present_value

        return initial_values

    async def _async_subscribe_discovered_objects(
        self,
        targets: list[tuple[str, str]] | None = None,
    ) -> int:
        """Subscribe to discovered objects and return the number of active subscriptions."""
        if not self._websocket_manager.subscriptions_enabled:
            return 0

        subscription_targets = targets if targets is not None else self._iter_subscription_targets()

        if not subscription_targets:
            return 0

        successful = await self._async_subscribe_targets(subscription_targets)

        self._ensure_fallback_polling()
        return successful

    async def _async_subscribe_targets(
        self,
        targets: list[tuple[str, str]],
    ) -> int:
        """Subscribe targets with bounded concurrency.

        This is the central subscription scheduler. It is used during startup and can later
        also be reused for reconnect/resubscribe handling.
        """
        if not targets:
            return 0

        queue: asyncio.Queue[tuple[str, str]] = asyncio.Queue()

        for target in targets:
            queue.put_nowait(target)

        successful = 0
        successful_lock = asyncio.Lock()

        async def worker(worker_id: int) -> None:
            nonlocal successful

            while True:
                try:
                    device_id, object_id = queue.get_nowait()
                except asyncio.QueueEmpty:
                    return

                try:
                    subscribed = await self._websocket_manager.async_subscribe(
                        device_id,
                        object_id,
                    )

                    if subscribed:
                        self._fallback_objects.discard((device_id, object_id))
                        self.point_registry.mark_subscription(device_id, object_id, True)
                        self.point_registry.mark_fallback_polling(device_id, object_id, False)
                        self._fallback_invalid_responses.pop((device_id, object_id), None)

                        async with successful_lock:
                            successful += 1

                except Exception:
                    _LOGGER.exception(
                        "Subscription worker %s failed for %s/%s",
                        worker_id,
                        device_id,
                        object_id,
                    )
                finally:
                    queue.task_done()

        worker_count = min(_SUBSCRIBE_CONCURRENCY, len(targets))

        _LOGGER.debug(
            "Starting Bepacom subscription scheduler: targets=%s workers=%s",
            len(targets),
            worker_count,
        )

        workers = [
            self.hass.async_create_task(
                worker(index + 1),
                name=f"bepacom-subscribe-worker-{index + 1}",
            )
            for index in range(worker_count)
        ]

        try:
            await queue.join()
        finally:
            for task in workers:
                if not task.done():
                    task.cancel()

            await asyncio.gather(*workers, return_exceptions=True)

        _LOGGER.debug(
            "Bepacom subscription scheduler finished: successful=%s targets=%s",
            successful,
            len(targets),
        )

        return successful


    def _iter_polling_targets(self) -> list[tuple[str, str]]:
        """Return all object paths configured for per-object polling."""
        targets: list[tuple[str, str]] = []
        for obj in self.point_registry.all(include_disabled=True):
            if not self._overrides.is_enabled(obj):
                continue
            if self._overrides.use_polling(obj):
                targets.append((str(obj.device_id), f"{obj.object_type}:{obj.object_id}"))
        return targets

    def _set_configured_polling_targets(self, targets: list[tuple[str, str]]) -> None:
        """Synchronize configured per-object polling targets with runtime state."""
        target_set = set(targets)
        # Remove no-longer configured polling targets that are not subscription fallbacks.
        for device_id, object_id in tuple(self._fallback_objects):
            if (device_id, object_id) not in target_set:
                obj = self.point_registry.get_by_path(device_id, object_id)
                if obj is not None and self._overrides.use_polling(obj):
                    continue
                self._fallback_objects.discard((device_id, object_id))
                self.point_registry.mark_fallback_polling(device_id, object_id, False)

        for device_id, object_id in target_set:
            self._fallback_objects.add((device_id, object_id))
            self.point_registry.mark_fallback_polling(device_id, object_id, True)

    def _iter_subscription_targets(self) -> list[tuple[str, str]]:
        """Return all object paths that can be subscribed."""
        targets: list[tuple[str, str]] = []
        for device_key, device_data in self.data.items():
            if not device_key.startswith("device:") or not isinstance(device_data, dict):
                continue

            device_id = device_key.split(":", 1)[1]

            for object_key, object_data in device_data.items():
                if ":" not in object_key or not isinstance(object_data, dict):
                    continue

                object_type = object_key.split(":", 1)[0].lower()

                if object_type in {"device", "file"}:
                    continue

                obj = self.point_registry.get_by_path(device_id, object_key)
                if obj is not None and not self._overrides.is_enabled(obj):
                    continue

                subscribe_override = (
                    self._overrides.use_subscribe(obj) if obj is not None else None
                )

                # Subscribe/Polling is now configured only per object in the
                # sidebar explorer. The old global subscription list is ignored.
                if subscribe_override is not True:
                    continue

                targets.append((device_id, object_key))

        return targets

    def subscription_option_map(self) -> dict[str, str]:
        """Return selectable subscriptions for the options flow."""
        return self.point_registry.option_map()

    def _object_instance(self, object_id: str) -> int:
        """Return BACnet object instance for sorting, if available."""
        if ":" not in object_id:
            return 999999999

        _, instance = object_id.split(":", 1)

        try:
            return int(instance)
        except ValueError:
            return 999999999

    def _enabled_subscription_keys(self) -> set[str]:
        """Return option keys for objects that should use subscribe."""
        selected = self._entry.options.get(CONF_SUBSCRIBED_OBJECTS, [])

        if not isinstance(selected, list):
            return set()

        return {str(item) for item in selected}

    def _subscription_option_key(self, device_id: str, object_id: str) -> str:
        """Build a stable key for per-object subscription options."""
        return f"{device_id}|{object_id}"

    async def _async_handle_subscription_update(
        self,
        device_id: str,
        object_id: str,
        payload: dict[str, Any],
    ) -> bool:
        """Apply one pushed object update and return whether the value changed."""
        changed = self._apply_object_update(device_id, object_id, payload)
        if changed:
            self._schedule_push_update()
        return changed

    async def _async_handle_subscription_failure(
        self,
        device_id: str,
        object_id: str,
    ) -> None:
        """Fall back to coordinator polling when subscriptions fail."""
        _LOGGER.debug(
            "Subscription unavailable for %s/%s, using periodic full-database polling",
            device_id,
            object_id,
        )

    def _apply_object_update(
        self,
        device_id: str,
        object_id: str,
        payload: dict[str, Any],
    ) -> bool:
        """Merge an object update into coordinator data."""
        device_key = f"device:{device_id}"
        device_data = self.data.get(device_key)

        if not isinstance(device_data, dict):
            return False

        existing_data = device_data.get(object_id)
        merged_data: dict[str, Any]

        if isinstance(existing_data, dict):
            merged_data = dict(existing_data)
            merged_data.update(self._normalize_object_payload(payload, device_id, object_id))
        else:
            merged_data = self._normalize_object_payload(payload, device_id, object_id)

        device_data[object_id] = merged_data
        self._update_discovery_object(device_id, object_id, merged_data)
        return self.point_registry.update_point(device_id, object_id, merged_data, source="push")

    def _normalize_object_payload(
        self,
        payload: dict[str, Any],
        device_id: str,
        object_id: str,
    ) -> dict[str, Any]:
        """Normalize object payloads from REST or WebSocket updates."""
        if object_id in payload and isinstance(payload[object_id], dict):
            return payload[object_id]

        device_key = f"device:{device_id}"

        if device_key in payload and isinstance(payload[device_key], dict):
            nested_object = payload[device_key].get(object_id)

            if isinstance(nested_object, dict):
                return nested_object

        return payload

    def _update_discovery_object(
        self,
        device_id: str,
        object_id: str,
        payload: dict[str, Any],
    ) -> None:
        """Keep the discovery cache aligned with latest object data."""
        if ":" not in object_id:
            return

        object_type, bacnet_object_id = object_id.split(":", 1)
        obj = self.point_registry.get_by_path(device_id, object_id)

        if obj is not None:
            obj.update(payload)
            self.point_registry.apply_overrides(obj)

    def _discovered_object(self, device_id: str, object_id: str):
        """Return a discovered BACnet object by device/object path."""
        if ":" not in object_id:
            return None

        object_type, bacnet_object_id = object_id.split(":", 1)
        unique_id = f"bepacom_{device_id}_{object_type.lower()}_{bacnet_object_id}"
        return self.point_registry.get_by_unique_id(unique_id)

    def _ensure_fallback_polling(self) -> None:
        """Start the fallback polling task when needed."""
        if not self._fallback_objects or self._fallback_task is not None:
            return

        self._fallback_task = self.hass.async_create_task(
            self._async_fallback_poll_loop(),
            name="bepacom-fallback-polling",
        )

    async def _async_fallback_poll_loop(self) -> None:
        """Poll objects whose subscriptions could not be created."""
        try:
            while self._fallback_objects:
                for device_id, object_id in tuple(self._fallback_objects):
                    try:
                        payload = await self.client.async_get_object(device_id, object_id)
                        self._fallback_invalid_responses.pop((device_id, object_id), None)
                    except InvalidResponse:
                        object_key = (device_id, object_id)
                        attempts = self._fallback_invalid_responses.get(object_key, 0) + 1
                        self._fallback_invalid_responses[object_key] = attempts

                        if attempts >= _MAX_INVALID_FALLBACK_RESPONSES:
                            _LOGGER.warning(
                                "Disabling fallback polling for %s/%s after %s invalid gateway responses",
                                device_id,
                                object_id,
                                attempts,
                            )
                            self._fallback_objects.discard(object_key)
                            self._fallback_invalid_responses.pop(object_key, None)
                        else:
                            _LOGGER.debug(
                                "Invalid fallback payload for %s/%s (%s/%s)",
                                device_id,
                                object_id,
                                attempts,
                                _MAX_INVALID_FALLBACK_RESPONSES,
                            )
                        continue
                    except Exception:
                        self._fallback_invalid_responses.pop((device_id, object_id), None)
                        _LOGGER.exception(
                            "Fallback polling failed for %s/%s",
                            device_id,
                            object_id,
                        )
                        continue

                    if self._apply_object_update(device_id, object_id, payload):
                        self._schedule_push_update()

                await asyncio.sleep(FALLBACK_POLL_INTERVAL.total_seconds())
        except asyncio.CancelledError:
            raise
        finally:
            self._fallback_task = None

    def _schedule_push_update(self) -> None:
        """Batch frequent push updates into a single coordinator update."""
        if self._pending_push_update_task is not None and not self._pending_push_update_task.done():
            return

        self._pending_push_update_task = self.hass.async_create_task(
            self._async_flush_push_update(),
            name="bepacom-push-update-flush",
        )

    async def _async_flush_push_update(self) -> None:
        """Flush pending push updates after a short debounce window.

        Important:
        Do not use async_set_updated_data() here. Home Assistant's
        DataUpdateCoordinator treats that as fresh coordinator data and resets
        the normal polling timer. With frequent WebSocket pushes, that can delay
        the scheduled full database poll indefinitely.

        The WebSocket handler already merged the pushed payload into
        self.data. Therefore we only need to notify listeners here and keep the
        regular poll schedule independent from push updates.
        """
        try:
            await asyncio.sleep(_PUSH_UPDATE_DEBOUNCE_SECONDS)
            self.async_update_listeners()
        except asyncio.CancelledError:
            raise
        finally:
            self._pending_push_update_task = None
