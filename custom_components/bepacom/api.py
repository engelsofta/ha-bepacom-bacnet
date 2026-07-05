"""Async REST client for the Bepacom BACnet gateway."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import aiohttp
from yarl import URL

from .const import DEFAULT_SUBSCRIPTION_LIFETIME
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

                return self._decode_response(text)

        except asyncio.TimeoutError as err:
            _LOGGER.exception("Timeout while connecting to Bepacom")
            raise CannotConnect from err

        except aiohttp.ClientError as err:
            _LOGGER.exception("HTTP error while connecting to Bepacom")
            raise CannotConnect from err

        except Exception as err:
            _LOGGER.exception("Unexpected API error")
            raise InvalidResponse from err

    async def _post(
        self,
        path: str,
        data: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> Any:
        """Perform a POST request."""

        await self.async_connect()

        assert self._session is not None

        url = f"{self._base}{path}"

        _LOGGER.debug("POST %s with data: %s", url, data)
        request_kwargs: dict[str, Any] = {"params": params}

        if data is not None:
            request_kwargs["json"] = data
            request_kwargs["headers"] = {"Content-Type": "application/json"}

        try:
            async with self._session.post(url, **request_kwargs) as response:
                _LOGGER.debug("HTTP Status: %s", response.status)

                response.raise_for_status()

                text = await response.text()
                _LOGGER.debug("Response: %s", text[:500])

                return self._decode_response(text)

        except asyncio.TimeoutError as err:
            _LOGGER.exception("Timeout while writing to Bepacom")
            raise CannotConnect from err

        except aiohttp.ClientError as err:
            _LOGGER.exception("HTTP error while writing to Bepacom")
            raise CannotConnect from err

        except Exception as err:
            _LOGGER.exception("Unexpected API error during write")
            raise InvalidResponse from err

    async def _delete(
        self,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> Any:
        """Perform a DELETE request."""

        await self.async_connect()

        assert self._session is not None

        url = f"{self._base}{path}"

        _LOGGER.debug("DELETE %s", url)

        try:
            async with self._session.delete(url, params=params) as response:
                _LOGGER.debug("HTTP Status: %s", response.status)

                response.raise_for_status()

                text = await response.text()
                _LOGGER.debug("Response: %s", text[:500])

                return self._decode_response(text)

        except asyncio.TimeoutError as err:
            _LOGGER.exception("Timeout while deleting Bepacom resource")
            raise CannotConnect from err

        except aiohttp.ClientError as err:
            _LOGGER.exception("HTTP error while deleting Bepacom resource")
            raise CannotConnect from err

        except Exception as err:
            _LOGGER.exception("Unexpected API error during delete")
            raise InvalidResponse from err

    async def async_ws_connect(
        self,
        url: str,
    ) -> aiohttp.ClientWebSocketResponse:
        """Open a WebSocket connection."""
        await self.async_connect()

        assert self._session is not None

        return await self._session.ws_connect(url, heartbeat=30)

    def _decode_response(self, text: str) -> Any:
        """Decode a gateway response."""
        if not text:
            return None

        try:
            return json.loads(text)
        except json.JSONDecodeError as err:
            raise InvalidResponse from err

    def _normalize_websocket_url(self, url: str) -> str:
        """Normalize relative subscription URLs returned by the gateway."""
        parsed_url = URL(url)

        if parsed_url.is_absolute():
            return str(parsed_url)

        base_url = URL(self._base).with_scheme("ws")
        return str(base_url.join(parsed_url))

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

    async def async_get_object(
        self,
        device_id: str,
        object_id: str,
    ) -> dict[str, Any]:
        """Read a single BACnet object."""
        result = await self._get(f"/apiv1/{device_id}/{object_id}")

        if not isinstance(result, dict):
            raise InvalidResponse

        return result

    async def async_subscribe(
        self,
        device_id: str,
        object_id: str,
        confirmation_type: str = "changes",
        lifetime: int = DEFAULT_SUBSCRIPTION_LIFETIME,
    ) -> str:
        """Create a gateway subscription for one BACnet object."""
        result = await self._post(
            f"/apiv1/subscribe/{device_id}/{object_id}",
            params={
                "confirmationType": confirmation_type,
                "lifetime": lifetime,
            },
        )

        if not isinstance(result, str):
            raise InvalidResponse

        return self._normalize_websocket_url(result)

    async def async_unsubscribe(
        self,
        device_id: str,
        object_id: str,
    ) -> None:
        """Remove a gateway subscription for one BACnet object."""
        await self._delete(f"/apiv1/subscribe/{device_id}/{object_id}")

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
