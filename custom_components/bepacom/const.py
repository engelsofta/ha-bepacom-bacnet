"""Constants for the Bepacom integration."""

from datetime import timedelta

DOMAIN = "bepacom"
VERSION = "1.1.0"
CONF_SUBSCRIBED_OBJECTS = "subscribed_objects"
CONF_ENTITY_OVERRIDES = "entity_overrides"
CONF_VIRTUAL_ENTITIES = "virtual_entities"
CONF_ENTITY_OVERRIDES_JSON = "entity_overrides_json"
CONF_ENABLE_POLLING = "enable_polling"
CONF_SNAPSHOT_WEBSOCKET_MODE = "snapshot_websocket_mode"
CONF_PUSH_VALUE_LOGGING = "push_value_logging"
CONF_HEARTBEAT_TIMEOUT = "heartbeat_timeout"

DEFAULT_PORT = 8099

DEFAULT_SCAN_INTERVAL = timedelta(seconds=5)
DEFAULT_ENABLE_POLLING = False
DEFAULT_SNAPSHOT_WEBSOCKET_MODE = False
DEFAULT_PUSH_VALUE_LOGGING = False
DEFAULT_HEARTBEAT_TIMEOUT = 60
DEFAULT_SUBSCRIPTION_LIFETIME = 3600
FALLBACK_POLL_INTERVAL = timedelta(seconds=30)
