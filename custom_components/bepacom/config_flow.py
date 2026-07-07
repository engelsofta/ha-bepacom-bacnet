"""Config flow for the Bepacom integration."""

from __future__ import annotations

import logging

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.const import CONF_HOST, CONF_PORT
from homeassistant.data_entry_flow import AbortFlow, FlowResult
from homeassistant.helpers import config_validation as cv

from .api import BepacomClient
from .const import (
    CONF_ENABLE_POLLING,
    CONF_HEARTBEAT_TIMEOUT,
    CONF_PUSH_VALUE_LOGGING,
    CONF_SNAPSHOT_WEBSOCKET_MODE,
    CONF_SUBSCRIBED_OBJECTS,
    DEFAULT_ENABLE_POLLING,
    DEFAULT_HEARTBEAT_TIMEOUT,
    DEFAULT_PORT,
    DEFAULT_PUSH_VALUE_LOGGING,
    DEFAULT_SNAPSHOT_WEBSOCKET_MODE,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)


class BepacomConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow."""

    VERSION = 1

    @staticmethod
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> BepacomOptionsFlow:
        """Get the options flow for this handler."""
        return BepacomOptionsFlow(config_entry)

    async def async_step_user(
        self,
        user_input: dict | None = None,
    ) -> FlowResult:

        errors: dict[str, str] = {}

        if user_input is not None:

            client = BepacomClient(
                host=user_input[CONF_HOST],
                port=user_input[CONF_PORT],
            )

            try:

                if await client.async_ping():

                    await self.async_set_unique_id(
                        f"{user_input[CONF_HOST]}:{user_input[CONF_PORT]}"
                    )

                    self._abort_if_unique_id_configured()

                    return self.async_create_entry(
                        title=f"Bepacom ({user_input[CONF_HOST]})",
                        data=user_input,
                    )

                errors["base"] = "cannot_connect"

            except AbortFlow:
                raise

            except Exception:
                _LOGGER.exception("Unexpected exception")

                errors["base"] = "unknown"

            finally:
                await client.async_close()

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_HOST): str,
                    vol.Required(
                        CONF_PORT,
                        default=DEFAULT_PORT,
                    ): int,
                }
            ),
            errors=errors,
        )


class BepacomOptionsFlow(config_entries.OptionsFlow):
    """Handle Bepacom options."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._config_entry = config_entry

    async def async_step_init(self, user_input: dict | None = None) -> FlowResult:
        """Manage options."""
        current_selected = self._config_entry.options.get(CONF_SUBSCRIBED_OBJECTS, [])
        current_enable_polling = self._config_entry.options.get(
            CONF_ENABLE_POLLING,
            DEFAULT_ENABLE_POLLING,
        )
        current_snapshot_websocket_mode = self._config_entry.options.get(
            CONF_SNAPSHOT_WEBSOCKET_MODE,
            DEFAULT_SNAPSHOT_WEBSOCKET_MODE,
        )
        current_push_value_logging = self._config_entry.options.get(
            CONF_PUSH_VALUE_LOGGING,
            DEFAULT_PUSH_VALUE_LOGGING,
        )
        current_heartbeat_timeout = self._config_entry.options.get(
            CONF_HEARTBEAT_TIMEOUT,
            DEFAULT_HEARTBEAT_TIMEOUT,
        )

        if user_input is not None:
            selected_objects = user_input.get(CONF_SUBSCRIBED_OBJECTS, [])
            enable_polling = user_input.get(
                CONF_ENABLE_POLLING,
                DEFAULT_ENABLE_POLLING,
            )
            snapshot_websocket_mode = user_input.get(
                CONF_SNAPSHOT_WEBSOCKET_MODE,
                DEFAULT_SNAPSHOT_WEBSOCKET_MODE,
            )
            push_value_logging = user_input.get(
                CONF_PUSH_VALUE_LOGGING,
                DEFAULT_PUSH_VALUE_LOGGING,
            )
            heartbeat_timeout = user_input.get(
                CONF_HEARTBEAT_TIMEOUT,
                DEFAULT_HEARTBEAT_TIMEOUT,
            )

            return self.async_create_entry(
                title="",
                data={
                    CONF_ENABLE_POLLING: enable_polling,
                    CONF_SNAPSHOT_WEBSOCKET_MODE: snapshot_websocket_mode,
                    CONF_PUSH_VALUE_LOGGING: push_value_logging,
                    CONF_HEARTBEAT_TIMEOUT: heartbeat_timeout,
                    CONF_SUBSCRIBED_OBJECTS: selected_objects,
                },
            )

        options_map: dict[str, str] = {}
        domain_data = self.hass.data.get(DOMAIN, {})
        entry_data = domain_data.get(self._config_entry.entry_id)

        if entry_data is not None:
            coordinator = entry_data.get("coordinator")
            if coordinator is not None:
                options_map = coordinator.subscription_option_map()

        schema = vol.Schema(
            {
                vol.Optional(
                    CONF_ENABLE_POLLING,
                    default=current_enable_polling,
                ): bool,
                vol.Optional(
                    CONF_SNAPSHOT_WEBSOCKET_MODE,
                    default=current_snapshot_websocket_mode,
                ): bool,
                vol.Optional(
                    CONF_PUSH_VALUE_LOGGING,
                    default=current_push_value_logging,
                ): bool,
                vol.Optional(
                    CONF_HEARTBEAT_TIMEOUT,
                    default=current_heartbeat_timeout,
                ): vol.All(vol.Coerce(int), vol.Range(min=15, max=3600)),
                vol.Optional(
                    CONF_SUBSCRIBED_OBJECTS,
                    default=current_selected,
                ): cv.multi_select(options_map),
            }
        )

        return self.async_show_form(
            step_id="init",
            data_schema=schema,
        )