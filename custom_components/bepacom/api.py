"""Async REST client for the Bepacom BACnet gateway."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import aiohttp

from .exceptions import CannotConnect, InvalidResponse, WriteError

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

    async def _get(self, path: str) -> Any:
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

    async def _post(self, path: str, data: dict[str, Any]) -> Any:
        """Perform a POST request."""

        await self.async_connect()

        assert self._session is not None

        url = f"{self._base}{path}"

        _LOGGER.debug("POST %s with data: %s", url, data)

        try:
            async with self._session.post(
                url,
                json=data,
                headers={"Content-Type": "application/json"},
            ) as response:
                _LOGGER.debug("HTTP Status: %s", response.status)

                response.raise_for_status()

                text = await response.text()
                _LOGGER.debug("Response: %s", text[:500])

                return await response.json()

        except asyncio.TimeoutError as err:
            _LOGGER.exception("Timeout while writing to Bepacom")
            raise CannotConnect from err

        except aiohttp.ClientError as err:
            _LOGGER.exception("HTTP error while writing to Bepacom")
            raise CannotConnect from err

        except Exception as err:
            _LOGGER.exception("Unexpected API error during write")
            raise InvalidResponse from err

    async def async_get_database(self) -> dict[str, Any]:
        """Read the complete BACnet database."""
        return await self._get("/apiv1/json")

    async def async_ping(self) -> bool:
        """Test the connection."""
        try:
            await self.async_get_database()
            return True
        except Exception:
            return False

    async def async_write_property(
        self,
        device_id: str,
        object_type: str,
        object_id: str,
        value: Any,
        priority: int = 8,
    ) -> bool:
        """Write a property to a BACnet object.

        Args:
            device_id: The BACnet device ID
            object_type: The BACnet object type (e.g., 'analog_output', 'binary_output')
            object_id: The object ID within the device
            value: The value to write
            priority: BACnet priority (1-16, default 8 for manual operation)

        Returns:
            True if write was successful

        Raises:
            CannotConnect: If gateway is unreachable
            InvalidResponse: If response is invalid
            WriteError: If write operation failed
        """
        payload = {
            "device_id": device_id,
            "object_type": object_type,
            "object_id": object_id,
            "value": value,
            "priority": priority,
        }

        try:
            result = await self._post("/apiv1/write-property", payload)

            # Check if write was successful
            if isinstance(result, dict):
                success = result.get("success", False)

                if success:
                    _LOGGER.info(
                        "Successfully wrote %s to %s:%s on device %s",
                        value,
                        object_type,
                        object_id,
                        device_id,
                    )
                    return True
                else:
                    error_msg = result.get("error", "Unknown error")
                    _LOGGER.error(
                        "Write failed for %s:%s on device %s: %s",
                        object_type,
                        object_id,
                        device_id,
                        error_msg,
                    )
                    raise WriteError(error_msg)

            raise WriteError("Invalid response from gateway")

        except (CannotConnect, InvalidResponse):
            raise
        except WriteError:
            raise
        except Exception as err:
            _LOGGER.exception("Unexpected error during write operation")
            raise WriteError(str(err)) from err
