"""Constants for the Bepacom integration."""

from datetime import timedelta

DOMAIN = "bepacom"
VERSION = "1.4.2"
CONF_ENTITY_OVERRIDES = "entity_overrides"
CONF_VIRTUAL_ENTITIES = "virtual_entities"
CONF_PUSH_VALUE_LOGGING = "push_value_logging"
CONF_HEARTBEAT_TIMEOUT = "heartbeat_timeout"
CONF_API_TOKEN = "api_token"

DEFAULT_PORT = 8099
PROTOCOL_VERSION = 2
LOCAL_APP_HOSTS = (
    "local-engelsoft-bacstac",
    "engelsoft-bacstac",
    "172.30.32.1",
    "127.0.0.1",
)

DEFAULT_SCAN_INTERVAL = timedelta(seconds=5)
DEFAULT_PUSH_VALUE_LOGGING = False
DEFAULT_HEARTBEAT_TIMEOUT = 60
# Keep the config entry in Home Assistant's initializing state while the local
# add-on is normally still booting. Only afterwards hand retries back to HA.
STARTUP_CONNECTION_RETRY_WINDOW = 90
STARTUP_CONNECTION_RETRY_INTERVAL = 5
# Keep transient add-on startup failures out of Repairs. Home Assistant retries a
# ConfigEntryNotReady automatically while the add-on finishes booting.
STARTUP_UNAVAILABLE_GRACE_PERIOD = 300
WEBSOCKET_PING_INTERVAL = 30
DEFAULT_SUBSCRIPTION_LIFETIME = 3600
FALLBACK_POLL_INTERVAL = timedelta(seconds=30)
