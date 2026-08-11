"""Exceptions for the Bepacom integration."""


class BepacomError(Exception):
    """Base exception."""


class CannotConnect(BepacomError):
    """Raised when the gateway cannot be reached."""


class InvalidAuth(BepacomError):
    """Raised when authentication fails."""


class InvalidResponse(BepacomError):
    """Raised when the gateway returns invalid data."""


class UnsupportedGateway(BepacomError):
    """Raised when the gateway is not a supported Engelsoft STAC."""


class WriteError(BepacomError):
    """Raised when a write operation fails."""
