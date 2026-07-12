"""Config flow for the Bepacom integration.

The object management UI lives in the Bepacom sidebar panel.  The options flow is
kept intentionally small and only contains global base/runtime settings.
"""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.const import CONF_HOST, CONF_PORT
from homeassistant.data_entry_flow import AbortFlow, FlowResult

from .api import BepacomClient
from .const import (
    CONF_ENABLE_POLLING,
    CONF_HEARTBEAT_TIMEOUT,
    CONF_PUSH_VALUE_LOGGING,
    CONF_SNAPSHOT_WEBSOCKET_MODE,
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
        """Return the options flow."""
        return BepacomOptionsFlow(config_entry)

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Handle the initial setup step."""
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
                        options={
                            CONF_ENABLE_POLLING: DEFAULT_ENABLE_POLLING,
                            CONF_SNAPSHOT_WEBSOCKET_MODE: DEFAULT_SNAPSHOT_WEBSOCKET_MODE,
                            CONF_PUSH_VALUE_LOGGING: DEFAULT_PUSH_VALUE_LOGGING,
                            CONF_HEARTBEAT_TIMEOUT: DEFAULT_HEARTBEAT_TIMEOUT,
                        },
                    )

                errors["base"] = "cannot_connect"

            except AbortFlow:
                raise
            except Exception:  # noqa: BLE001
                _LOGGER.exception("Unexpected exception while setting up Bepacom")
                errors["base"] = "unknown"
            finally:
                await client.async_close()

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_HOST): str,
                    vol.Required(CONF_PORT, default=DEFAULT_PORT): int,
                }
            ),
            errors=errors,
        )


class BepacomOptionsFlow(config_entries.OptionsFlow):
    """Handle Bepacom options.

    Object-related settings were moved to the sidebar explorer.  Keeping this flow
    minimal avoids stale option steps and makes future maintenance safer.
    """

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize the options flow."""
        self._config_entry = config_entry

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Show the options menu."""
        return self.async_show_menu(
            step_id="init",
            menu_options=["general"],
        )

    async def async_step_general(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage global runtime options."""
        if user_input is not None:
            options = dict(self._config_entry.options)
            options.update(
                {
                    CONF_ENABLE_POLLING: user_input.get(
                        CONF_ENABLE_POLLING,
                        DEFAULT_ENABLE_POLLING,
                    ),
                    CONF_SNAPSHOT_WEBSOCKET_MODE: user_input.get(
                        CONF_SNAPSHOT_WEBSOCKET_MODE,
                        DEFAULT_SNAPSHOT_WEBSOCKET_MODE,
                    ),
                    CONF_PUSH_VALUE_LOGGING: user_input.get(
                        CONF_PUSH_VALUE_LOGGING,
                        DEFAULT_PUSH_VALUE_LOGGING,
                    ),
                    CONF_HEARTBEAT_TIMEOUT: user_input.get(
                        CONF_HEARTBEAT_TIMEOUT,
                        DEFAULT_HEARTBEAT_TIMEOUT,
                    ),
                }
            )
            return self.async_create_entry(title="", data=options)

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

        return self.async_show_form(
            step_id="general",
            data_schema=vol.Schema(
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
                }
            ),
            errors={},
        )
