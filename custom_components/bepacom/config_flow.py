"""Config flow for the Bepacom integration."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.const import CONF_HOST, CONF_PORT
from homeassistant.data_entry_flow import AbortFlow, FlowResult

from .api import BepacomClient
from .const import (
    CONF_API_TOKEN,
    DEFAULT_PORT,
    DOMAIN,
    LOCAL_APP_HOSTS,
)
from .exceptions import CannotConnect, InvalidResponse, UnsupportedGateway

_LOGGER = logging.getLogger(__name__)


class BepacomConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow."""

    VERSION = 1

    async def _async_create_for_host(self, host: str, port: int, api_token: str = "") -> FlowResult | None:
        """Validate and create an entry for one local or external gateway."""
        client = BepacomClient(host=host, port=port, api_token=api_token)
        try:
            await client.async_validate_stac()
            if not await client.async_ping():
                return None
            await self.async_set_unique_id(f"{host}:{port}")
            self._abort_if_unique_id_configured()
            return self.async_create_entry(
                title=f"Engelsoft Beacon BACnet/IP ({host})",
                data={CONF_HOST: host, CONF_PORT: port, CONF_API_TOKEN: api_token},
                options={},
            )
        except (CannotConnect, InvalidResponse, UnsupportedGateway):
            return None
        finally:
            await client.async_close()

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Handle the initial setup step."""
        return self.async_show_menu(
            step_id="user", menu_options=["automatic", "manual"]
        )

    async def async_step_automatic(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Find the HA OS app by its stable aliases, with loopback fallback."""
        for host in LOCAL_APP_HOSTS:
            result = await self._async_create_for_host(host, DEFAULT_PORT)
            if result is not None:
                return result
        return self.async_abort(reason="app_not_found")

    async def async_step_manual(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Configure an externally hosted gateway."""
        errors: dict[str, str] = {}

        if user_input is not None:
            client = BepacomClient(
                host=user_input[CONF_HOST],
                port=user_input[CONF_PORT],
                api_token=user_input.get(CONF_API_TOKEN),
            )

            try:
                await client.async_validate_stac()
                if await client.async_ping():
                    await self.async_set_unique_id(
                        f"{user_input[CONF_HOST]}:{user_input[CONF_PORT]}"
                    )
                    self._abort_if_unique_id_configured()

                    return self.async_create_entry(
                        title=f"Engelsoft Beacon BACnet/IP ({user_input[CONF_HOST]})",
                        data=user_input,
                        options={},
                    )

                errors["base"] = "cannot_connect"

            except UnsupportedGateway:
                errors["base"] = "unsupported_gateway"
            except (CannotConnect, InvalidResponse):
                errors["base"] = "cannot_connect"
            except AbortFlow:
                raise
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Unexpected exception while setting up Engelsoft Beacon")
                errors["base"] = "unknown"
            finally:
                await client.async_close()

        return self.async_show_form(
            step_id="manual",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_HOST): str,
                    vol.Required(CONF_PORT, default=DEFAULT_PORT): int,
                    vol.Optional(CONF_API_TOKEN, default=""): str,
                }
            ),
            errors=errors,
        )
