"""Models used by the integration."""

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class BacnetObject:
    device_id: str
    object_id: str
    object_name: str
    object_type: str
    present_value: Any
    units: str | None
    writable: bool = False


@dataclass(slots=True)
class BacnetDevice:
    device_id: str
    object_name: str
    vendor_name: str | None
    model_name: str | None