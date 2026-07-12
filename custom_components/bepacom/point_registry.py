"""Entity override handling for the Bepacom integration."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorDeviceClass, SensorStateClass
from homeassistant.const import UnitOfTemperature

from .const import CONF_ENTITY_OVERRIDES, CONF_VIRTUAL_ENTITIES
from .entity_factory import BacnetObjectTypeMapper
from .models import BacnetObject

AUTO_OVERRIDE = "__auto__"
NONE_OVERRIDE = "__none__"

_AUTO_SENTINELS = {AUTO_OVERRIDE, "auto", "automatic", "automatisch"}
_NONE_SENTINELS = {NONE_OVERRIDE, "none", "null", "keine", "no", "false"}


def _override_value(override: dict[str, Any], *keys: str) -> tuple[bool, Any]:
    """Return whether an override key exists and its raw value.

    A missing key always means automatic behaviour.  Older versions sometimes
    wrote JSON null; callers decide whether that legacy null means automatic or
    explicit none.
    """
    for key in keys:
        if key in override:
            return True, override.get(key)
    return False, None


def _is_auto(value: Any) -> bool:
    """Return True when a value explicitly requests automatic behaviour."""
    return isinstance(value, str) and value.strip().lower() in _AUTO_SENTINELS


def _is_none(value: Any, *, legacy_null_is_none: bool = True) -> bool:
    """Return True when a value explicitly requests no HA value."""
    if value is None:
        return legacy_null_is_none
    return isinstance(value, str) and value.strip().lower() in _NONE_SENTINELS


class OverrideResolver:
    """Resolve tri-state overrides consistently.

    Tri-state values:
    - missing / __auto__ -> original value
    - __none__          -> None
    - custom value      -> normalized custom value
    """

    @staticmethod
    def resolve(
        override: dict[str, Any],
        original: Any,
        *keys: str,
        normalizer=None,
        legacy_null_is_none: bool = True,
    ) -> Any:
        has_override, value = _override_value(override, *keys)

        if not has_override or _is_auto(value):
            return original

        if _is_none(value, legacy_null_is_none=legacy_null_is_none):
            return None

        if normalizer is not None:
            return normalizer(value)

        return value

class BepacomOverrideManager:
    """Apply user configured entity overrides.

    Overrides are stored in config_entry.options[CONF_ENTITY_OVERRIDES].  A point can
    be addressed by one of these keys:

    - obj.unique_id, for example: bepacom_1_analoginput_545
    - device/object key, for example: 1|analogInput:545
    - object key only, for example: analogInput:545
    """

    def __init__(self, options: dict[str, Any] | None) -> None:
        self._options = options or {}
        overrides = self._options.get(CONF_ENTITY_OVERRIDES, {})
        self._overrides: dict[str, Any] = overrides if isinstance(overrides, dict) else {}

    def get_override(self, obj: BacnetObject) -> dict[str, Any]:
        """Return the override dictionary for a BACnet object."""
        object_key = f"{obj.object_type}:{obj.object_id}"
        keys = (
            obj.unique_id,
            f"{obj.device_id}|{object_key}",
            object_key,
        )

        for key in keys:
            value = self._overrides.get(key)
            if isinstance(value, dict):
                return value

        return {}

    def get_number_setting(self, obj: BacnetObject, key: str, default: float) -> float:
        """Return a finite numeric entity setting or its default."""
        value = self.get_override(obj).get(key)
        try:
            parsed = float(value)
        except (TypeError, ValueError):
            return default
        return parsed if parsed == parsed and abs(parsed) != float("inf") else default

    def get_write_priority(self, obj: BacnetObject, default: int = 8) -> int:
        """Return the configured BACnet write priority (1-16)."""
        value = self.get_override(obj).get("write_priority", default)
        try:
            return max(1, min(int(value), 16))
        except (TypeError, ValueError):
            return default

    def get_write_profile(self, obj: BacnetObject) -> str:
        """Return the configured Analog Value write profile."""
        value = str(self.get_override(obj).get("write_profile", "direct")).strip().lower()
        return "glt_set_as" if value == "glt_set_as" else "direct"

    def get_write_delay_ms(
        self,
        obj: BacnetObject,
        key: str,
        default: int,
    ) -> int:
        """Return a bounded write-profile delay in milliseconds."""
        value = self.get_override(obj).get(key, default)
        try:
            return max(0, min(int(value), 60_000))
        except (TypeError, ValueError):
            return default

    def should_release_write_priority(self, obj: BacnetObject) -> bool:
        """Return whether both profile priority slots should be released."""
        return bool(self.get_override(obj).get("release_priority", True))


    def get_virtual_entities(self, obj: BacnetObject | None = None) -> list[dict[str, Any]]:
        """Return configured virtual entities, optionally filtered by source object."""
        raw = self._options.get(CONF_VIRTUAL_ENTITIES, [])
        if isinstance(raw, dict):
            items = list(raw.values())
        elif isinstance(raw, list):
            items = raw
        else:
            items = []

        result: list[dict[str, Any]] = []
        source_unique_id = obj.unique_id if obj is not None else None
        for item in items:
            if not isinstance(item, dict):
                continue
            if not item.get("enabled", True):
                continue
            if source_unique_id is not None and item.get("source_unique_id") != source_unique_id:
                continue
            result.append(dict(item))
        return result

    def get_virtual_binary(self, obj: BacnetObject) -> dict[str, Any] | None:
        """Return the first virtual binary entity configured for a source object."""
        for item in self.get_virtual_entities(obj):
            if item.get("entity_type") == "binary_sensor":
                return item
        return None

    def get_unit_of_measurement(self, obj: BacnetObject) -> str | None:
        """Return the Home Assistant unit after applying tri-state overrides."""
        override = self.get_override(obj)
        original = BacnetObjectTypeMapper.get_unit_of_measurement(obj)

        def normalize_unit(value: Any) -> str | None:
            normalized = BacnetObjectTypeMapper._normalize_unit_value(value)
            return normalized if normalized is not None else str(value).strip()

        return OverrideResolver.resolve(
            override,
            original,
            "unit",
            "unit_of_measurement",
            normalizer=normalize_unit,
            legacy_null_is_none=True,
        )

    def get_device_class(self, obj: BacnetObject) -> SensorDeviceClass | str | None:
        """Return the Home Assistant device class after applying tri-state overrides."""
        override = self.get_override(obj)

        # Do not blindly convert a BACnet unit of °C into a temperature device
        # class. Some BACnet gateways report °C for every analog value. Only use
        # temperature automatically when the object type/name makes that plausible.
        unit = BacnetObjectTypeMapper.get_unit_of_measurement(obj)
        original: SensorDeviceClass | str | None
        if unit in {
            UnitOfTemperature.CELSIUS,
            UnitOfTemperature.FAHRENHEIT,
            UnitOfTemperature.KELVIN,
        } and not self._looks_like_temperature(obj):
            original = None
        else:
            original = BacnetObjectTypeMapper.get_device_class(obj)

        return OverrideResolver.resolve(
            override,
            original,
            "device_class",
            normalizer=self._normalize_device_class,
            legacy_null_is_none=True,
        )

    def get_state_class(self, obj: BacnetObject) -> SensorStateClass | str | None:
        """Return the Home Assistant state class after applying tri-state overrides."""
        override = self.get_override(obj)
        original = BacnetObjectTypeMapper.get_state_class(obj)

        # Important: older sidebar versions sometimes stored JSON null for
        # state_class when no explicit override was intended.  Treat legacy null
        # as automatic here to avoid unintentionally removing long-term
        # statistics.  A deliberate "Keine" selection is stored as __none__.
        return OverrideResolver.resolve(
            override,
            original,
            "state_class",
            normalizer=self._normalize_state_class,
            legacy_null_is_none=False,
        )

    def get_update_mode(self, obj: BacnetObject, default: str = "disabled") -> str:
        """Return the configured per-object update mode.

        New installations store a single ``update_mode`` value:

        - ``disabled``: entity is disabled/not updated
        - ``subscribe``: COV/Push subscription
        - ``polling``: per-object fallback polling

        Older overrides with separate ``enabled`` and ``subscribe`` keys are still
        accepted and migrated logically at runtime.
        """
        override = self.get_override(obj)
        value = override.get("update_mode")

        if isinstance(value, str):
            normalized = value.strip().lower().replace("-", "_").replace(" ", "_")
            if normalized in {"disabled", "disable", "off", "aus", "inactive", "deaktiviert"}:
                return "disabled"
            if normalized in {"subscribe", "subscribed", "push", "cov", "subscription"}:
                return "subscribe"
            if normalized in {"polling", "poll", "zyklisch"}:
                return "polling"

        # Legacy compatibility: enabled=false wins.
        enabled = override.get("enabled")
        if isinstance(enabled, bool) and enabled is False:
            return "disabled"
        if isinstance(enabled, str) and enabled.strip().lower() in {"0", "false", "no", "nein", "off", "aus"}:
            return "disabled"

        subscribe = override.get("subscribe")
        if isinstance(subscribe, bool):
            return "subscribe" if subscribe else "polling"
        if isinstance(subscribe, str):
            normalized = subscribe.strip().lower()
            if normalized in {"1", "true", "yes", "ja", "on", "subscribe", "push", "cov"}:
                return "subscribe"
            if normalized in {"0", "false", "no", "nein", "off", "polling", "poll"}:
                return "polling"

        return default

    def use_subscribe(self, obj: BacnetObject, default: bool | None = None) -> bool | None:
        """Return whether this object should use Subscribe/Push."""
        mode = self.get_update_mode(obj, "disabled" if default is None else ("subscribe" if default else "polling"))
        if mode == "subscribe":
            return True
        if mode in {"polling", "disabled"}:
            return False
        return default

    def use_polling(self, obj: BacnetObject, default: bool = False) -> bool:
        """Return whether this object should use per-object polling."""
        return self.get_update_mode(obj, "polling" if default else "disabled") == "polling"

    def is_enabled(self, obj: BacnetObject, default: bool = False) -> bool:
        """Return whether a point should be created/updated."""
        return self.get_update_mode(obj, "subscribe" if default else "disabled") != "disabled"

    @staticmethod
    def _looks_like_temperature(obj: BacnetObject) -> bool:
        """Return True when object metadata makes temperature plausible."""
        text = f"{obj.object_type} {obj.object_name} {obj.description}".lower()
        return any(
            token in text
            for token in (
                "temperature",
                "temperatur",
                "temp",
                "raumregelung",
                "heizung",
                "sollwert",
                "setpoint",
            )
        )

    @staticmethod
    def _normalize_device_class(value: Any) -> SensorDeviceClass | str | None:
        """Normalize device class strings to HA constants when possible."""
        if value is None:
            return None

        normalized = str(value).strip().lower().replace(" ", "_").replace("-", "_")
        if normalized in _NONE_SENTINELS:
            return None

        aliases = {
            "temperature": "TEMPERATURE",
            "temperatur": "TEMPERATURE",
            "humidity": "HUMIDITY",
            "feuchte": "HUMIDITY",
            "pressure": "PRESSURE",
            "druck": "PRESSURE",
            "power": "POWER",
            "leistung": "POWER",
            "energy": "ENERGY",
            "energie": "ENERGY",
            "voltage": "VOLTAGE",
            "spannung": "VOLTAGE",
            "current": "CURRENT",
            "strom": "CURRENT",
            "frequency": "FREQUENCY",
            "frequenz": "FREQUENCY",
            "duration": "DURATION",
            "dauer": "DURATION",
            "illuminance": "ILLUMINANCE",
            "beleuchtungsstaerke": "ILLUMINANCE",
            "co2": "CO2",
            "pm25": "PM25",
            "pm2_5": "PM25",
            "pm10": "PM10",
        }
        attr = aliases.get(normalized, normalized.upper())
        return getattr(SensorDeviceClass, attr, normalized)

    @staticmethod
    def _normalize_state_class(value: Any) -> SensorStateClass | str | None:
        """Normalize state class strings to HA constants when possible."""
        if value is None:
            return None

        normalized = str(value).strip().lower().replace(" ", "_").replace("-", "_")
        if normalized in _NONE_SENTINELS:
            return None

        aliases = {
            "measurement": "MEASUREMENT",
            "messwert": "MEASUREMENT",
            "total": "TOTAL",
            "gesamt": "TOTAL",
            "total_increasing": "TOTAL_INCREASING",
            "zaehler": "TOTAL_INCREASING",
            "zähler": "TOTAL_INCREASING",
        }
        attr = aliases.get(normalized, normalized.upper())
        return getattr(SensorStateClass, attr, normalized)
