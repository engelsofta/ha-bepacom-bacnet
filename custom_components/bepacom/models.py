"""Data models for the Bepacom integration."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class BacnetObject:
    device_id: str
    object_id: str
    object_type: str
    object_name: str
    present_value: Any = None
    units: str | None = None
    writable: bool = False
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class BacnetDevice:
    device_id: str
    name: str
    vendor: str | None = None
    model: str | None = None
    firmware: str | None = None