"""Async REST client for the Bepacom BACnet gateway."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from collections import deque
from typing import Any

import aiohttp
from yarl import URL

from .const import DEFAULT_SUBSCRIPTION_LIFETIME
from .exceptions import CannotConnect, InvalidResponse, WriteError

_LOGGER = logging.getLogger(__name__)
# Gateways return different key names depending on firmware/API variant.
_SUBSCRIPTION_URL_KEYS = (
    "url",
    "ws_url",
    "wsUrl",
    "websocket_url",
    "websocketUrl",
    "webSocketUrl",
    "websocket",
    "webSocket",
    "location",
)
_SUBSCRIPTION_HEADER_KEYS = (
    "Location",
    "Content-Location",
    "X-Subscription-Url",
    "X-Subscription-URL",
    "X-WebSocket-Url",
    "X-WebSocket-URL",
)
_MAX_SUBSCRIPTION_DIAGNOSTIC_LOGS = 5
_SUBSCRIPTION_CONFIRMATION_TYPE_FALLBACKS = (
    "confirmed",
    "unconfirmed",
    "true",
    "false",
)
_DEFAULT_SUBSCRIPTION_WS_PATH = "/ws"


class BepacomClient:
    """REST client."""

    def __init__(self, host: str, port: int = 8099) -> None:
        self._base = f"http://{host}:{port}"
        self._session: aiohttp.ClientSession | None = None
        self._subscription_diagnostic_logs = 0

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

    def _default_subscription_websocket_url(self) -> str:
        """Return the default WebSocket endpoint used by current addon firmware."""
        base_url = URL(self._base).with_scheme("ws")
        return str(base_url.join(URL(_DEFAULT_SUBSCRIPTION_WS_PATH)))

    def _normalize_device_path_id(self, device_id: str) -> str:
        """Normalize device identifiers for API paths.

        The OpenAPI schema documents device ids as ``device:instance``.
        """
        if device_id.startswith("device:"):
            return device_id

        return f"device:{device_id}"

    def _normalize_object_path_id(self, object_id: str) -> str:
        """Normalize object identifiers for legacy API paths.

        The gateway JSON uses keys like ``analogValue:729`` while the BACnet API
        paths expect BACnet notation like ``analog-value,729``.
        """
        if "," in object_id:
            return object_id

        if ":" not in object_id:
            return object_id

        object_type, bacnet_object_id = object_id.split(":", 1)
        normalized_type = re.sub(r"(?<!^)(?=[A-Z])", "-", object_type).lower()
        return f"{normalized_type},{bacnet_object_id}"

    def _get_device_path_candidates(self, device_id: str) -> list[str]:
        """Return device path variants for different gateway firmware."""
        candidates: list[str] = []

        for candidate in (self._normalize_device_path_id(device_id), device_id):
            if candidate and candidate not in candidates:
                candidates.append(candidate)

        return candidates

    def _get_object_path_candidates(self, object_id: str) -> list[str]:
        """Return object path variants for different gateway firmware."""
        normalized_object_id = self._normalize_object_path_id(object_id)
        candidates: list[str] = []

        for candidate in (object_id, normalized_object_id):
            if candidate and candidate not in candidates:
                candidates.append(candidate)

        return candidates

    def _extract_subscription_url(self, payload: Any) -> str | None:
        """Extract WebSocket URLs from string or nested dict subscription payloads."""
        queue: deque[Any] = deque([payload])
        visited: set[int] = set()

        while queue:
            candidate = queue.popleft()
            candidate_id = id(candidate)

            if candidate_id in visited:
                continue

            visited.add(candidate_id)

            if isinstance(candidate, str):
                return candidate

            if not isinstance(candidate, dict):
                continue

            for key in _SUBSCRIPTION_URL_KEYS:
                value = candidate.get(key)

                if isinstance(value, str):
                    return value

            # Common response wrappers used by different gateway firmware variants.
            for key in ("data", "result", "subscription"):
                nested_payload = candidate.get(key)

                if nested_payload is not None:
                    queue.append(nested_payload)

        return None

    def _log_invalid_subscription_response(
        self,
        device_id: str,
        object_id: str,
        status: int,
        headers: aiohttp.typedefs.LooseHeaders,
        body: str,
    ) -> None:
        """Log a short diagnostic for unexpected subscription responses."""
        if self._subscription_diagnostic_logs >= _MAX_SUBSCRIPTION_DIAGNOSTIC_LOGS:
            return

        self._subscription_diagnostic_logs += 1
        relevant_headers = {
            key: value
            for key, value in headers.items()
            if key.lower() in {"location", "content-location", "content-type"}
            or key.lower().startswith("x-")
        }
        body_preview = body.strip().replace("\n", " ")[:300]
        _LOGGER.warning(
            "Unexpected subscribe response for %s/%s: status=%s headers=%s body=%s",
            device_id,
            object_id,
            status,
            relevant_headers,
            body_preview,
        )

    async def async_get_database(self) -> dict[str, Any]:
        """Read the complete BACnet database."""
        result = await self._get("/apiv1/json")

        # Some gateway builds occasionally return a transient null payload.
        if result is None:
            await asyncio.sleep(0.2)
            result = await self._get("/apiv1/json")

        return result

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
        for device_path_id in self._get_device_path_candidates(device_id):
            for object_path_id in self._get_object_path_candidates(object_id):
                result = await self._get(f"/apiv1/{device_path_id}/{object_path_id}")

                if isinstance(result, dict):
                    return result

        raise InvalidResponse

    async def async_subscribe(
        self,
        device_id: str,
        object_id: str,
        confirmation_type: str = "confirmed",
        lifetime: int = DEFAULT_SUBSCRIPTION_LIFETIME,
    ) -> str:
        """Create a gateway subscription for one BACnet object."""
        await self.async_connect()

        assert self._session is not None

        path_candidates: list[tuple[str, str]] = []

        for device_path_id in self._get_device_path_candidates(device_id):
            for object_path_id in self._get_object_path_candidates(object_id):
                candidate = (device_path_id, object_path_id)

                if candidate not in path_candidates:
                    path_candidates.append(candidate)

        attempted_confirmation_types: list[str] = []
        confirmation_types_to_try = [confirmation_type]

        for fallback_confirmation_type in _SUBSCRIPTION_CONFIRMATION_TYPE_FALLBACKS:
            if fallback_confirmation_type not in confirmation_types_to_try:
                confirmation_types_to_try.append(fallback_confirmation_type)

        try:
            for device_path_id, object_path_id in path_candidates:
                url = f"{self._base}/apiv1/subscribe/{device_path_id}/{object_path_id}"

                for confirmation_type_candidate in confirmation_types_to_try:
                    attempted_confirmation_types.append(
                        f"{device_path_id}/{object_path_id}:{confirmation_type_candidate}"
                    )
                    params = {
                        "confirmationType": confirmation_type_candidate,
                        "lifetime": lifetime,
                    }

                    _LOGGER.debug("POST %s with params: %s", url, params)

                    async with self._session.post(url, params=params) as response:
                        _LOGGER.debug("HTTP Status: %s", response.status)

                        response.raise_for_status()

                        text = await response.text()
                        _LOGGER.debug("Subscription response: %s", text[:500])

                        try:
                            result = self._decode_response(text)
                        except InvalidResponse:
                            result = text.strip() or None

                        ws_url = self._extract_subscription_url(result)

                        if ws_url is None:
                            for header_name in _SUBSCRIPTION_HEADER_KEYS:
                                header_value = response.headers.get(header_name)

                                if header_value:
                                    ws_url = header_value
                                    break

                        if ws_url is not None:
                            if (
                                confirmation_type_candidate != confirmation_type
                                or device_path_id != device_id
                                or object_path_id != object_id
                            ):
                                _LOGGER.debug(
                                    "Bepacom subscribe for %s/%s succeeded with path=%s/%s confirmationType=%s",
                                    device_id,
                                    object_id,
                                    device_path_id,
                                    object_path_id,
                                    confirmation_type_candidate,
                                )

                            return self._normalize_websocket_url(ws_url)

                        # Current addon variants return `null` on successful subscribe
                        # and push updates over the global `/ws` endpoint.
                        if result is None and response.status == 200:
                            if (
                                confirmation_type_candidate != confirmation_type
                                or device_path_id != device_id
                                or object_path_id != object_id
                            ):
                                _LOGGER.debug(
                                    "Bepacom subscribe for %s/%s succeeded with path=%s/%s confirmationType=%s (using default websocket endpoint)",
                                    device_id,
                                    object_id,
                                    device_path_id,
                                    object_path_id,
                                    confirmation_type_candidate,
                                )

                            return self._default_subscription_websocket_url()

                        if str(result).strip().strip('"').lower() in {"400", "none"}:
                            continue

                        self._log_invalid_subscription_response(
                            device_id=device_id,
                            object_id=object_id,
                            status=response.status,
                            headers=response.headers,
                            body=text,
                        )
                        break

        except asyncio.TimeoutError as err:
            _LOGGER.exception("Timeout while creating Bepacom subscription")
            raise CannotConnect from err

        except aiohttp.ClientError as err:
            _LOGGER.exception("HTTP error while creating Bepacom subscription")
            raise CannotConnect from err

        except Exception as err:
            _LOGGER.exception("Unexpected API error during subscription")
            raise InvalidResponse from err

        _LOGGER.debug(
            "Bepacom subscribe for %s/%s failed for confirmation types: %s",
            device_id,
            object_id,
            attempted_confirmation_types,
        )
        raise InvalidResponse

    async def async_unsubscribe(
        self,
        device_id: str,
        object_id: str,
    ) -> None:
        """Remove a gateway subscription for one BACnet object."""
        for device_path_id in self._get_device_path_candidates(device_id):
            for object_path_id in self._get_object_path_candidates(object_id):
                try:
                    await self._delete(f"/apiv1/subscribe/{device_path_id}/{object_path_id}")
                    return
                except InvalidResponse:
                    continue

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

    async def async_write_analog_value(
        self,
        device_id: str,
        object_id: str,
        value: float,
        priority: int = 8,
    ) -> bool:
        """Write an Analog Value presentValue through the gateway API v2."""
        device_path_id = self._normalize_device_path_id(str(device_id))
        object_path_id = f"analogValue:{object_id}"

        try:
            await self._post(
                f"/apiv2/{device_path_id}/{object_path_id}/presentValue",
                params={"value": value, "priority": priority},
            )
        except (CannotConnect, InvalidResponse) as err:
            raise WriteError(str(err)) from err

        _LOGGER.info(
            "Successfully wrote %s to %s on %s at priority %s",
            value,
            object_path_id,
            device_path_id,
            priority,
        )
        return True

    async def async_write_multistate_output(
        self,
        device_id: str,
        object_id: str,
        value: float,
        priority: int = 8,
    ) -> bool:
        """Write a Multi-state Output presentValue through gateway API v2."""
        device_path_id = self._normalize_device_path_id(str(device_id))
        object_path_id = f"multiStateOutput:{object_id}"
        write_value: int | float = int(value) if float(value).is_integer() else value

        try:
            await self._post(
                f"/apiv2/{device_path_id}/{object_path_id}/presentValue",
                params={"value": write_value, "priority": priority},
            )
        except (CannotConnect, InvalidResponse) as err:
            raise WriteError(str(err)) from err

        _LOGGER.info(
            "Successfully wrote %s to %s on %s at priority %s",
            value,
            object_path_id,
            device_path_id,
            priority,
        )
        return True

    async def async_write_binary_value(
        self,
        device_id: str,
        object_id: str,
        value: bool,
        priority: int = 8,
    ) -> bool:
        """Write a Binary Value presentValue through gateway API v2.

        The gateway expects the BACnet BinaryPV labels ``active`` and
        ``inactive`` here.  Numeric 1/0 values can be accepted as booleans by
        Home Assistant but are not a reliable wire representation for this
        endpoint.
        """
        device_path_id = self._normalize_device_path_id(str(device_id))
        object_path_id = f"binaryValue:{object_id}"
        write_value = "active" if value else "inactive"

        try:
            await self._post(
                f"/apiv2/{device_path_id}/{object_path_id}/presentValue",
                params={"value": write_value, "priority": priority},
            )
        except (CannotConnect, InvalidResponse) as err:
            raise WriteError(str(err)) from err

        _LOGGER.info(
            "Successfully wrote %s to %s on %s at priority %s",
            write_value,
            object_path_id,
            device_path_id,
            priority,
        )
        return True

    async def async_release_present_value(
        self,
        device_id: str,
        object_type: str,
        object_id: str,
        priority: int = 8,
    ) -> bool:
        """Release one command priority slot through gateway API v2."""
        device_path_id = self._normalize_device_path_id(str(device_id))
        object_path_id = f"{object_type}:{object_id}"

        try:
            await self._post(
                f"/apiv2/{device_path_id}/{object_path_id}/presentValue",
                params={"priority": priority},
            )
        except (CannotConnect, InvalidResponse) as err:
            raise WriteError(str(err)) from err

        _LOGGER.info(
            "Released %s on %s at priority %s",
            object_path_id,
            device_path_id,
            priority,
        )
        return True
