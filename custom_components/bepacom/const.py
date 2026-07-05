"""Constants for the Bepacom integration."""

from datetime import timedelta

DOMAIN = "bepacom"

DEFAULT_PORT = 8099

DEFAULT_SCAN_INTERVAL = timedelta(seconds=5)
DEFAULT_SUBSCRIPTION_LIFETIME = 3600
FALLBACK_POLL_INTERVAL = timedelta(seconds=30)