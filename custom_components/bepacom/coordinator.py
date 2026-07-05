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
    DOMAIN,
    FALLBACK_POLL_INTERVAL,
)
from .discovery import DiscoveryEngine
from .websocket_manager import BepacomWebSocketManager

_LOGGER = logging.getLogger(__name__)


class BepacomCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Coordinator responsible for fetching and analysing BACnet data."""

    def __init__(
        self,
        hass: HomeAssistant,
        client: BepacomClient,
    ) -> None:
        """Initialize coordinator."""

        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
        )

        self.client = client

        self.discovery = DiscoveryEngine()

        self.data: dict[str, Any] = {}
        self._websocket_manager = BepacomWebSocketManager(
            client=client,
            on_update=self._async_handle_subscription_update,
            on_subscription_failure=self._async_handle_subscription_failure,
        )
        self._fallback_objects: set[tuple[str, str]] = set()
        self._fallback_task = None
        self._subscriptions_started = False

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch data from the Bepacom gateway."""

        _LOGGER.info("Requesting BACnet database...")

        try:
            raw = await self.client.async_get_database()

            if raw is None:
                raise UpdateFailed("Gateway returned no data.")

            if not isinstance(raw, dict):
                raise UpdateFailed(
                    f"Unexpected response type: {type(raw)}"
                )

            self.discovery.parse(raw)

            self.data = raw

            _LOGGER.info(
                "Discovery finished: %s devices / %s objects",
                len(self.discovery.devices),
                len(self.discovery.objects),
            )

            if self._subscriptions_started:
                await self._async_subscribe_discovered_objects()

            return raw

        except Exception as err:
            _LOGGER.exception("Coordinator update failed")

            raise UpdateFailed(str(err)) from err

    async def async_start(self) -> None:
        """Start object subscriptions after the initial refresh."""
        if self._subscriptions_started:
            return

        self._subscriptions_started = True
        await self._async_subscribe_discovered_objects()

    async def async_shutdown(self) -> None:
        """Stop subscriptions and fallback polling."""
        self._subscriptions_started = False

        if self._fallback_task is not None:
            self._fallback_task.cancel()

            try:
                await self._fallback_task
            except asyncio.CancelledError:
                pass

            self._fallback_task = None

        self._fallback_objects.clear()
        await self._websocket_manager.async_unsubscribe_all()

    async def _async_subscribe_discovered_objects(self) -> None:
        """Subscribe to every discovered object."""
        for device_id, object_id in self._iter_subscription_targets():
            if await self._websocket_manager.async_subscribe(device_id, object_id):
                self._fallback_objects.discard((device_id, object_id))

        self._ensure_fallback_polling()

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

                targets.append((device_id, object_key))

        return targets

    async def _async_handle_subscription_update(
        self,
        device_id: str,
        object_id: str,
        payload: dict[str, Any],
    ) -> None:
        """Apply one pushed object update."""
        if self._apply_object_update(device_id, object_id, payload):
            self.async_set_updated_data(self.data)

    async def _async_handle_subscription_failure(
        self,
        device_id: str,
        object_id: str,
    ) -> None:
        """Enable fallback polling for an object."""
        self._fallback_objects.add((device_id, object_id))
        self._ensure_fallback_polling()

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
        return True

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
        unique_id = f"{device_id}_{object_type}_{bacnet_object_id}"
        obj = self.discovery.objects.get(unique_id)

        if obj is not None:
            obj.update(payload)

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
                    except Exception:
                        _LOGGER.exception(
                            "Fallback polling failed for %s/%s",
                            device_id,
                            object_id,
                        )
                        continue

                    if self._apply_object_update(device_id, object_id, payload):
                        self.async_set_updated_data(self.data)

                await asyncio.sleep(FALLBACK_POLL_INTERVAL.total_seconds())
        except asyncio.CancelledError:
            raise
        finally:
            self._fallback_task = None