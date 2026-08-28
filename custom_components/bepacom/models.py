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
    units: str | int | None = None
    resolution: float | None = None
    reliability: str | None = None
    status_flags: list[bool] | dict[str, bool] | None = None
    out_of_service: bool | None = None
    cov_increment: float | None = None

    # ``None`` means that the gateway did not report write-access metadata.
    # This must be kept distinct from an explicit ``False`` response.
    writable: bool | None = None

    # Home Assistant override metadata. These values are optional and are usually
    # supplied from config_entry.options by override_manager.py. They are kept on
    # the model so future UI code can work with one common point representation.
    override_unit: str | None = None
    override_device_class: str | None = None
    override_state_class: str | None = None
    subscribe: bool | None = None
    scan_interval: int | None = None
    enabled: bool = True

    raw: dict[str, Any] = field(default_factory=dict)


    @property
    def unique_id(self) -> str:
        device_id = str(self.device_id).strip()
        object_type = str(self.object_type).strip().lower()
        object_id = str(self.object_id).strip()

        return f"bepacom_{device_id}_{object_type}_{object_id}"



    @property
    def entity_id(self) -> str:
        """Return a stable suggested entity id suffix.

        Entity IDs should not be derived from the BACnet object name because
        object names can change and often contain generic prefixes.  The stable
        BACnet identifier is easier to search and does not produce duplicated
        names such as ``analoginput_analoginput_1249``.
        """
        return self.unique_id

    @property
    def effective_writable(self) -> bool:
        """Return whether the integration should offer writes for this object.

        ``writable`` is gateway-specific discovery metadata, not a BACnet
        property.  When it is absent, fall back to the BACnet object types that
        are commandable by definition plus the value types supported by the
        gateway's dedicated API v2 write endpoints.  An explicit gateway value
        always wins.
        """
        if self.writable is not None:
            return self.writable

        normalized_type = self.object_type.strip().replace("-", "_")
        normalized_type = "".join(
            f"_{char.lower()}" if char.isupper() else char
            for char in normalized_type
        ).lstrip("_")
        return normalized_type in {
            "analog_output",
            "binary_output",
            "multi_state_output",
            "analog_value",
            "binary_value",
        }

    def update(self, data: dict[str, Any]) -> None:
        """Update the object from raw BACnet data."""

        self.raw = data

        if "objectName" in data:
            self.object_name = data.get("objectName", self.object_name)

        if "presentValue" in data:
            present_value = data.get("presentValue")
            # Some gateway write acknowledgements and priority responses expose
            # ``presentValue`` as an empty list/object.  After relinquishing a
            # commandable object the same response can contain the effective
            # BACnet fallback in ``relinquishDefault``.  Prefer that value so HA
            # does not keep showing the previously commanded state forever.
            if isinstance(present_value, (list, dict)) and not present_value:
                relinquish_default = data.get(
                    "relinquishDefault", data.get("relinquish_default")
                )
                if relinquish_default is not None and not (
                    isinstance(relinquish_default, (list, dict))
                    and not relinquish_default
                ):
                    self.present_value = relinquish_default
                    self.raw = dict(data)
                    self.raw["presentValue"] = relinquish_default
                elif self.present_value is not None:
                    self.raw = dict(data)
                    self.raw["presentValue"] = self.present_value
            else:
                self.present_value = present_value

        # Keep the last known unit when incremental updates do not include units.
        if "units" in data:
            self.units = data.get("units")

        # Keep the last known BACnet metadata when incremental updates omit it.
        if "resolution" in data:
            self.resolution = data.get("resolution")

        if "reliability" in data:
            self.reliability = data.get("reliability")

        if "statusFlags" in data:
            self.status_flags = data.get("statusFlags")

        if "outOfService" in data:
            self.out_of_service = data.get("outOfService")

        if "covIncrement" in data:
            self.cov_increment = data.get("covIncrement")

        if "description" in data:
            self.description = data.get("description", self.description)

        # Do not reset writable state on partial updates that omit this field.
        if "writable" in data:
            writable = data.get("writable")

            if isinstance(writable, bool):
                self.writable = writable
            elif isinstance(writable, (list, tuple, set)):
                property_names = {
                    str(item).replace("_", "").replace("-", "").lower()
                    for item in writable
                }
                self.writable = "presentvalue" in property_names
            elif isinstance(writable, str):
                normalized = writable.strip().lower()
                if normalized in {"true", "yes", "1", "on"}:
                    self.writable = True
                elif normalized in {"false", "no", "0", "off"}:
                    self.writable = False
                else:
                    property_name = normalized.replace("_", "").replace("-", "")
                    self.writable = property_name == "presentvalue"
            elif writable is not None:
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
