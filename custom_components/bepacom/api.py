"""Async REST client for the Bepacom BACnet gateway."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from typing import Any

import aiohttp
from yarl import URL

from .const import PROTOCOL_VERSION, WEBSOCKET_PING_INTERVAL
from .exceptions import CannotConnect, InvalidResponse, UnsupportedGateway, WriteError

_LOGGER = logging.getLogger(__name__)


class BepacomClient:
    """REST client."""

    def __init__(self, host: str, port: int = 8099, api_token: str | None = None) -> None:
        self._base = f"http://{host}:{port}"
        self._session: aiohttp.ClientSession | None = None
        self._gateway_info: dict[str, Any] = {}
        self._transport = "protocol_v2"
        self._transport_reason = "Protocol V2 has not been negotiated"
        self._protocol_socket: aiohttp.ClientWebSocketResponse | None = None
        self._protocol_request_id = 0
        self._managed_targets: list[tuple[str, str, str]] = []
        self._api_token = str(api_token or "")
        self._protocol_pending: dict[str, asyncio.Future[Any]] = {}
        self._protocol_commands = 0
        self._protocol_command_successes = 0
        self._protocol_command_errors = 0
        self._protocol_command_time_total = 0.0

    @property
    def api_token(self) -> str:
        """Return the configured V2 authentication token."""
        return self._api_token

    @property
    def transport(self) -> str:
        """Return the selected gateway transport."""
        return self._transport

    @property
    def transport_diagnostics(self) -> dict[str, Any]:
        """Return compatibility information suitable for diagnostics and UI."""
        return {
            "api_transport": self._transport,
            "api_transport_label": (
                "Protocol V2"
            ),
            "api_transport_reason": self._transport_reason,
            "gateway_product": self._gateway_info.get("product"),
            "gateway_app_version": self._gateway_info.get("app_version"),
            "gateway_protocol_version": self._gateway_info.get("protocol_version"),
            "gateway_capabilities": self._gateway_info.get("capabilities", []),
            "protocol_commands": self._protocol_commands,
            "protocol_command_successes": self._protocol_command_successes,
            "protocol_command_errors": self._protocol_command_errors,
            "protocol_commands_pending": len(self._protocol_pending),
            "protocol_command_avg_ms": (
                self._protocol_command_time_total
                / self._protocol_command_successes
                * 1000
                if self._protocol_command_successes
                else 0
            ),
        }

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
        self._protocol_socket = None

    def set_protocol_socket(
        self, websocket: aiohttp.ClientWebSocketResponse | None
    ) -> None:
        """Expose the manager-owned V2 socket for bidirectional commands."""
        self._protocol_socket = websocket

    async def _async_protocol_command(
        self, command: str, payload: dict[str, Any], *, wait_result: bool = True
    ) -> bool:
        """Send a command over the durable V2 channel when it is available."""
        websocket = self._protocol_socket
        if (
            websocket is None
            or websocket.closed
        ):
            return False
        self._protocol_request_id += 1
        started = time.monotonic()
        request_id = f"ha-{self._protocol_request_id}"
        future: asyncio.Future[Any] | None = None
        if wait_result:
            self._protocol_commands += 1
            future = asyncio.get_running_loop().create_future()
            self._protocol_pending[request_id] = future
        await websocket.send_json(
            {
                "type": "command",
                "id": request_id,
                "command": command,
                "payload": payload,
            }
        )
        if future is not None:
            try:
                await asyncio.wait_for(future, timeout=20)
                self._protocol_command_successes += 1
                self._protocol_command_time_total += time.monotonic() - started
            except Exception:
                self._protocol_command_errors += 1
                raise
            finally:
                self._protocol_pending.pop(request_id, None)
        return True

    def handle_protocol_result(self, message: dict[str, Any]) -> None:
        """Resolve a V2 request from the manager-owned socket reader."""
        future = self._protocol_pending.get(str(message.get("id")))
        if future is None or future.done():
            return
        if message.get("success"):
            future.set_result(message.get("payload"))
        else:
            error = message.get("error") or {}
            future.set_exception(InvalidResponse(str(error.get("message", error))))

    async def async_restore_protocol_targets(self) -> None:
        """Restore the target plan on a newly connected V2 channel."""
        if self._managed_targets:
            await self._async_protocol_command(
                "set_targets", self._managed_targets_payload(self._managed_targets),
                wait_result=False,
            )

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
                _LOGGER.debug(
                    "Bepacom GET completed: path=%s bytes=%s",
                    path,
                    len(text),
                )

                return self._decode_response(text)

        except asyncio.TimeoutError as err:
            _LOGGER.debug("Bepacom GET timed out: path=%s", path)
            raise CannotConnect from err

        except aiohttp.ClientResponseError as err:
            if path == "/bepacom/info" and err.status in (404, 405):
                raise UnsupportedGateway("Update BACstac: Protocol V2 is required") from err
            raise CannotConnect from err

        except aiohttp.ClientError as err:
            _LOGGER.debug("Bepacom GET failed: path=%s error=%s", path, err)
            raise CannotConnect from err

        except Exception as err:
            _LOGGER.exception("Unexpected Bepacom GET error: path=%s", path)
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

        _LOGGER.debug(
            "POST %s (json=%s params=%s)",
            url,
            data is not None,
            sorted(params) if params else [],
        )
        request_kwargs: dict[str, Any] = {"params": params}

        if data is not None:
            request_kwargs["json"] = data
            request_kwargs["headers"] = {"Content-Type": "application/json"}

        try:
            async with self._session.post(url, **request_kwargs) as response:
                _LOGGER.debug("HTTP Status: %s", response.status)

                response.raise_for_status()

                text = await response.text()
                _LOGGER.debug(
                    "Bepacom POST completed: path=%s bytes=%s",
                    path,
                    len(text),
                )

                return self._decode_response(text)

        except asyncio.TimeoutError as err:
            _LOGGER.debug("Bepacom POST timed out: path=%s", path)
            raise CannotConnect from err

        except aiohttp.ClientError as err:
            _LOGGER.debug("Bepacom POST failed: path=%s error=%s", path, err)
            raise CannotConnect from err

        except Exception as err:
            _LOGGER.exception("Unexpected Bepacom POST error: path=%s", path)
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
                _LOGGER.debug(
                    "Bepacom DELETE completed: path=%s bytes=%s",
                    path,
                    len(text),
                )

                return self._decode_response(text)

        except asyncio.TimeoutError as err:
            _LOGGER.debug("Bepacom DELETE timed out: path=%s", path)
            raise CannotConnect from err

        except aiohttp.ClientError as err:
            _LOGGER.debug("Bepacom DELETE failed: path=%s error=%s", path, err)
            raise CannotConnect from err

        except Exception as err:
            _LOGGER.exception("Unexpected Bepacom DELETE error: path=%s", path)
            raise InvalidResponse from err

    async def async_ws_connect(
        self,
        url: str,
    ) -> aiohttp.ClientWebSocketResponse:
        """Open a WebSocket connection."""
        await self.async_connect()

        assert self._session is not None

        return await self._session.ws_connect(
            url,
            heartbeat=WEBSOCKET_PING_INTERVAL,
            autoping=True,
        )

    def _decode_response(self, text: str) -> Any:
        """Decode a gateway response."""
        if not text:
            return None

        try:
            return json.loads(text)
        except json.JSONDecodeError as err:
            raise InvalidResponse from err


    def snapshot_websocket_url(self) -> str:
        """Return Engelsoft STAC's global managed-target WebSocket."""
        base_url = URL(self._base).with_scheme("ws")
        return str(base_url.join(URL("/ws/v2")))

    def _normalize_device_path_id(self, device_id: str) -> str:
        """Normalize device identifiers for API paths.

        The OpenAPI schema documents device ids as ``device:instance``.
        """
        if device_id.startswith("device:"):
            return device_id

        return f"device:{device_id}"

    def _normalize_object_path_id(self, object_id: str) -> str:
        """Normalize object identifiers for gateway REST API paths.

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

    async def async_validate_stac(self) -> None:
        """Require a compatible Engelsoft BACstac Protocol V2 gateway."""
        info = await self._get("/bepacom/info")
        versions = info.get("protocol_versions", [info.get("protocol_version")]) if isinstance(info, dict) else []
        if not (
            isinstance(info, dict)
            and info.get("product") == "engelsoft-bacstac"
            and isinstance(versions, list)
            and PROTOCOL_VERSION in versions
        ):
            raise UnsupportedGateway(
                "Gateway requires Protocol V2; update BACstac and the integration together"
            )
        self._gateway_info = info
        self._transport_reason = "Gateway and integration support Protocol V2"

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

    async def async_set_managed_targets(
        self,
        targets: list[tuple[str, str, str]],
    ) -> dict[str, Any]:
        """Send managed targets and their requested transports to the gateway."""
        self._managed_targets = list(targets)
        payload = self._managed_targets_payload(targets)
        if await self._async_protocol_command("set_targets", payload):
            return {"accepted": True, "transport": "protocol_v2", "targets": len(targets)}

        await self.async_connect()
        assert self._session is not None

        url = f"{self._base}/apiv1/managed/targets"
        try:
            async with self._session.post(url, json=payload) as response:
                if response.status == 404:
                    raise UnsupportedGateway(
                        "Engelsoft STAC managed-target API is unavailable"
                    )
                response.raise_for_status()
                result = self._decode_response(await response.text())
        except asyncio.TimeoutError as err:
            raise CannotConnect from err
        except aiohttp.ClientError as err:
            raise CannotConnect from err

        if not isinstance(result, dict):
            raise InvalidResponse
        return result

    async def async_get_subscription_diagnostics(self) -> dict[str, Any]:
        """Return BACstac's effective per-target transport state."""
        result = await self._get("/apiv1/diagnostics/subscriptions")
        if not isinstance(result, dict):
            raise InvalidResponse
        return result

    @staticmethod
    def _managed_targets_payload(
        targets: list[tuple[str, str, str]],
    ) -> dict[str, list[dict[str, str]]]:
        """Serialize Engelsoft STAC managed targets."""
        return {
            "targets": [
                {
                    "device_id": device_id,
                    "object_id": object_id,
                    "update_mode": update_mode,
                }
                for device_id, object_id, update_mode in targets
            ]
        }


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

        protocol_object_id = f"{object_type}:{object_id}"
        if await self._async_protocol_command("write_property", {
            "device_id": str(device_id),
            "object_id": protocol_object_id,
            "property": "presentValue",
            "value": value,
            "priority": priority,
        }):
            return True

        try:
            result = await self._post("/apiv1/write-property", payload)

            # Check if write was successful
            if isinstance(result, dict):
                success = result.get("success", False)

                if success:
                    _LOGGER.debug(
                        "Bepacom write succeeded for %s:%s on device %s",
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

        if await self._async_protocol_command("write_property", {
            "device_id": str(device_id), "object_id": object_path_id,
            "property": "presentValue", "value": value, "priority": priority,
        }):
            return True

        try:
            await self._post(
                f"/apiv2/{device_path_id}/{object_path_id}/presentValue",
                params={"value": value, "priority": priority},
            )
        except (CannotConnect, InvalidResponse) as err:
            raise WriteError(str(err)) from err

        _LOGGER.debug(
            "Bepacom write succeeded for %s on %s at priority %s",
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

        if await self._async_protocol_command("write_property", {
            "device_id": str(device_id), "object_id": object_path_id,
            "property": "presentValue", "value": write_value, "priority": priority,
        }):
            return True

        try:
            await self._post(
                f"/apiv2/{device_path_id}/{object_path_id}/presentValue",
                params={"value": write_value, "priority": priority},
            )
        except (CannotConnect, InvalidResponse) as err:
            raise WriteError(str(err)) from err

        _LOGGER.debug(
            "Bepacom write succeeded for %s on %s at priority %s",
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

        if await self._async_protocol_command("write_property", {
            "device_id": str(device_id), "object_id": object_path_id,
            "property": "presentValue", "value": write_value, "priority": priority,
        }):
            return True

        try:
            await self._post(
                f"/apiv2/{device_path_id}/{object_path_id}/presentValue",
                params={"value": write_value, "priority": priority},
            )
        except (CannotConnect, InvalidResponse) as err:
            raise WriteError(str(err)) from err

        _LOGGER.debug(
            "Bepacom write succeeded for %s on %s at priority %s",
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

        if await self._async_protocol_command("release_priority", {
            "device_id": str(device_id), "object_id": object_path_id,
            "priority": priority,
        }):
            return True

        try:
            await self._post(
                f"/apiv2/{device_path_id}/{object_path_id}/presentValue",
                params={"priority": priority},
            )
        except (CannotConnect, InvalidResponse) as err:
            raise WriteError(str(err)) from err

        _LOGGER.debug(
            "Released %s on %s at priority %s",
            object_path_id,
            device_path_id,
            priority,
        )
        return True
