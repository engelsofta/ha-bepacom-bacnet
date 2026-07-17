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
from .models import BacnetObject
from .override_manager import BepacomOverrideManager
from .point_registry import BepacomPointRegistry
from .websocket_manager import BepacomWebSocketManager

_LOGGER = logging.getLogger(__name__)
_MAX_INVALID_FALLBACK_RESPONSES = 3
_PUSH_UPDATE_DEBOUNCE_SECONDS = 0.5
_SUBSCRIBE_CONCURRENCY = 5
_INVENTORY_STABLE_SAMPLES = 3
_INVENTORY_STABLE_SAMPLE_DELAY_SECONDS = 5
_INVENTORY_MISSING_POINT_GRACE_SECONDS = 60
_INVENTORY_MAX_TOLERATED_MISSING_POINTS = 2


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
        self._inventory_readiness_samples = 0
        self._inventory_missing_configured_points = 0
        self._pending_push_update_task: asyncio.Task[None] | None = None
        self._write_confirmation_tasks: dict[str, asyncio.Task[None]] = {}
        self._write_fallback_refresh_task: asyncio.Task[None] | None = None
        self._data_revision = 0

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
                "inventory_readiness_samples": self._inventory_readiness_samples,
                "inventory_missing_configured_points": (
                    self._inventory_missing_configured_points
                ),
                "fallback_objects": len(self._fallback_objects),
            }
        )
        return diagnostics

    @property
    def data_revision(self) -> int:
        """Return a revision that changes only after a full database refresh."""
        return self._data_revision

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
                discovery, raw = await self._async_wait_for_stable_inventory(raw)

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
            self._data_revision += 1


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

    async def _async_wait_for_stable_inventory(
        self,
        initial_raw: dict[str, Any],
    ) -> tuple[DiscoveryEngine, dict[str, Any]]:
        """Wait until the gateway inventory is complete and stable.

        A gateway restart can return a valid but steadily growing BACnet
        database.  Require all previously configured runtime points and virtual
        sources, then require the complete inventory signature to remain
        unchanged for several samples before creating Home Assistant entities.
        """
        required_ids = self._overrides.configured_runtime_point_ids()
        required_ids.update(
            str(item.get("source_unique_id") or "").strip()
            for item in self._overrides.get_virtual_entities()
            if item.get("source_unique_id")
        )

        raw = initial_raw
        previous_signature: frozenset[str] | None = None
        stable_samples = 0

        grace_samples = (
            _INVENTORY_MISSING_POINT_GRACE_SECONDS
            // _INVENTORY_STABLE_SAMPLE_DELAY_SECONDS
        ) + 1
        # If the last configured point appears at the end of the grace period,
        # still allow enough follow-up samples to confirm that relevant set.
        max_samples = grace_samples + _INVENTORY_STABLE_SAMPLES - 1

        for sample in range(1, max_samples + 1):
            discovery = DiscoveryEngine()
            discovery.parse(raw)

            if not discovery.devices or not discovery.objects:
                raise UpdateFailed(
                    "BACnet inventory is not ready yet "
                    f"({len(discovery.devices)} devices / "
                    f"{len(discovery.objects)} objects)"
                )

            missing_ids = required_ids.difference(discovery.objects)
            self._inventory_missing_configured_points = len(missing_ids)

            # Once persistent runtime configuration exists, only those points
            # determine readiness. Gateways may continue adding/removing
            # unrelated internal objects even though every point Home Assistant
            # actually uses is already available. Without configured points,
            # retain the conservative full-inventory comparison.
            signature = (
                frozenset(required_ids.intersection(discovery.objects))
                if required_ids
                else frozenset(discovery.objects)
            )
            if signature == previous_signature:
                stable_samples += 1
            else:
                previous_signature = signature
                stable_samples = 1

            self._inventory_readiness_samples = stable_samples
            _LOGGER.info(
                "BACnet inventory readiness: stable=%s/%s devices=%s "
                "objects=%s missing_configured=%s",
                stable_samples,
                _INVENTORY_STABLE_SAMPLES,
                len(discovery.devices),
                len(discovery.objects),
                len(missing_ids),
            )

            if stable_samples >= _INVENTORY_STABLE_SAMPLES and not missing_ids:
                return discovery, raw

            elapsed_seconds = (
                sample - 1
            ) * _INVENTORY_STABLE_SAMPLE_DELAY_SECONDS
            grace_expired = elapsed_seconds >= _INVENTORY_MISSING_POINT_GRACE_SECONDS

            if (
                grace_expired
                and stable_samples >= _INVENTORY_STABLE_SAMPLES
                and len(missing_ids) <= _INVENTORY_MAX_TOLERATED_MISSING_POINTS
            ):
                _LOGGER.warning(
                    "BACnet inventory is stable but %s configured point(s) are "
                    "missing after %ss; starting without: %s",
                    len(missing_ids),
                    _INVENTORY_MISSING_POINT_GRACE_SECONDS,
                    ", ".join(sorted(missing_ids)),
                )
                return discovery, raw

            if sample < max_samples:
                await asyncio.sleep(_INVENTORY_STABLE_SAMPLE_DELAY_SECONDS)
                raw = await self.client.async_get_database()
                if not isinstance(raw, dict):
                    raise UpdateFailed(
                        f"Unexpected response type while checking inventory: {type(raw)}"
                    )

        missing_ids = required_ids.difference(discovery.objects)
        if len(missing_ids) > _INVENTORY_MAX_TOLERATED_MISSING_POINTS:
            raise UpdateFailed(
                "BACnet inventory is still incomplete after the startup grace period; "
                f"waiting for {len(missing_ids)} configured point(s)"
            )

        raise UpdateFailed(
            "BACnet inventory is still changing after the startup grace period"
        )

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

        confirmation_tasks = list(self._write_confirmation_tasks.values())
        self._write_confirmation_tasks.clear()
        for task in confirmation_tasks:
            task.cancel()
        if confirmation_tasks:
            await asyncio.gather(*confirmation_tasks, return_exceptions=True)

        if self._write_fallback_refresh_task is not None:
            self._write_fallback_refresh_task.cancel()
            await asyncio.gather(
                self._write_fallback_refresh_task, return_exceptions=True
            )
            self._write_fallback_refresh_task = None

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
        *,
        source: str = "push",
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
        return self.point_registry.update_point(
            device_id, object_id, merged_data, source=source
        )

    def schedule_write_confirmation(
        self,
        obj: BacnetObject,
        revision_before_write: int,
    ) -> None:
        """Confirm a write without blocking the service or loading all objects."""
        previous = self._write_confirmation_tasks.get(obj.unique_id)
        if previous is not None and not previous.done():
            previous.cancel()

        task = self.hass.async_create_task(
            self._async_confirm_written_object(obj, revision_before_write),
            name=f"bepacom-confirm-write-{obj.unique_id}",
        )
        self._write_confirmation_tasks[obj.unique_id] = task

    async def _async_confirm_written_object(
        self,
        obj: BacnetObject,
        revision_before_write: int,
    ) -> None:
        """Wait for COV, then read one object and use a full refresh as fallback."""
        task = asyncio.current_task()
        try:
            await asyncio.sleep(0.75)
            if self.point_registry.revision(obj) > revision_before_write:
                return

            object_key = f"{obj.object_type}:{obj.object_id}"
            payload = await self.client.async_get_object(
                str(obj.device_id), object_key
            )
            if self._apply_object_update(
                str(obj.device_id), object_key, payload, source="poll"
            ):
                self._schedule_push_update()
        except asyncio.CancelledError:
            raise
        except Exception:
            _LOGGER.warning(
                "Targeted write confirmation failed for %s; falling back to full refresh",
                obj.unique_id,
                exc_info=True,
            )
            self._schedule_write_fallback_refresh()
        finally:
            if self._write_confirmation_tasks.get(obj.unique_id) is task:
                self._write_confirmation_tasks.pop(obj.unique_id, None)

    def _schedule_write_fallback_refresh(self) -> None:
        """Coalesce rare targeted-read failures into one full refresh."""
        if (
            self._write_fallback_refresh_task is not None
            and not self._write_fallback_refresh_task.done()
        ):
            return
        self._write_fallback_refresh_task = self.hass.async_create_task(
            self._async_write_fallback_refresh(),
            name="bepacom-write-fallback-refresh",
        )

    async def _async_write_fallback_refresh(self) -> None:
        """Run the coalesced full refresh used only as a write fallback."""
        try:
            await asyncio.sleep(0.25)
            await self.async_request_refresh()
        except asyncio.CancelledError:
            raise
        finally:
            self._write_fallback_refresh_task = None

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

                    if self._apply_object_update(
                        device_id, object_id, payload, source="poll"
                    ):
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
