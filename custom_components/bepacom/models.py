"""Data models for the Bepacom integration."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class BacnetObject:
    """Represents a single BACnet object."""

    device_id: str
    object_id: str
    object_type: str

    object_name: str = ""

    present_value: Any = None
    description: str = ""
    units: str | None = None

    writable: bool = False

    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def unique_id(self) -> str:
        """Return a unique id for Home Assistant."""
        device_id = str(self.device_id).strip()
        object_type = str(self.object_type).strip().lower()
        object_id = str(self.object_id).strip()
        return f"{device_id}_{object_type}_{object_id}"

    @property
    def entity_id(self) -> str:
        """Return a suggested entity id."""
        name = self.object_name or f"{self.object_type}_{self.object_id}"

        name = (
            name.lower()
            .replace(" ", "_")
            .replace("-", "_")
            .replace("/", "_")
            .replace(".", "_")
        )

        while "__" in name:
            name = name.replace("__", "_")

        return name

    def update(self, data: dict[str, Any]) -> None:
        """Update the object from raw BACnet data."""

        self.raw = data

        self.object_name = data.get("objectName", self.object_name)
        self.present_value = data.get("presentValue")
        self.units = data.get("units")
        self.description = data.get("description", self.description)

        writable = data.get("writable", [])

        if isinstance(writable, list):
            self.writable = "presentValue" in writable
        else:
            self.writable = False


@dataclass(slots=True)
class BacnetDevice:
    """Represents a BACnet device."""

    device_id: str
    name: str

    vendor: str | None = None
    model: str | None = None
    firmware: str | None = None

    objects: dict[str, BacnetObject] = field(default_factory=dict)

    def add_object(self, obj: BacnetObject) -> None:
        """Register an object."""
        self.objects[obj.unique_id] = obj

    @property
    def object_count(self) -> int:
        """Return number of discovered objects."""
        return len(self.objects)