"""DataUpdateCoordinator for the Bepacom integration."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import (
    DataUpdateCoordinator,
    UpdateFailed,
)

from .api import BepacomClient
from .const import DOMAIN
from .discovery import DiscoveryEngine

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
            update_interval=timedelta(seconds=30),
        )

        self.client = client

        self.discovery = DiscoveryEngine()

        self.data: dict[str, Any] = {}

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

            return raw

        except Exception as err:
            _LOGGER.exception("Coordinator update failed")

            raise UpdateFailed(str(err)) from err