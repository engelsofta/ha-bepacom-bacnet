"""Async REST client for the Bepacom BACnet gateway."""

from __future__ import annotations

import asyncio
import logging

import aiohttp

from .exceptions import CannotConnect, InvalidResponse

_LOGGER = logging.getLogger(__name__)


class BepacomClient:
    """REST client."""

    def __init__(self, host: str, port: int = 8099) -> None:
        self._base = f"http://{host}:{port}"
        self._session: aiohttp.ClientSession | None = None

    async def async_connect(self) -> None:
        """Create HTTP session."""
        if self._session is None:
            timeout = aiohttp.ClientTimeout(total=20)
            self._session = aiohttp.ClientSession(timeout=timeout)

    async def async_close(self) -> None:
        """Close HTTP session."""
        if self._session:
            await self._session.close()
            self._session = None

    async def _get(self, path: str):
        """Perform a GET request."""

        await self.async_connect()

        assert self._session is not None

        url = f"{self._base}{path}"

        _LOGGER.debug("GET %s", url)

        try:
            async with self._session.get(url) as response:
                _LOGGER.debug("HTTP Status: %s", response.status)

                response.raise_for_status()

                text = await response.text()
                _LOGGER.debug("Response: %s", text[:500])

                return await response.json()

        except asyncio.TimeoutError as err:
            _LOGGER.exception("Timeout while connecting to Bepacom")
            raise CannotConnect from err

        except aiohttp.ClientError as err:
            _LOGGER.exception("HTTP error while connecting to Bepacom")
            raise CannotConnect from err

        except Exception as err:
            _LOGGER.exception("Unexpected API error")
            raise InvalidResponse from err

    async def async_get_database(self):
        """Read the complete BACnet database."""
        return await self._get("/apiv1/json")

    async def async_ping(self) -> bool:
        """Test the connection."""
        try:
            await self.async_get_database()
            return True
        except Exception:
            return False