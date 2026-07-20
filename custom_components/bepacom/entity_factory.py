"""Entity factory for creating Home Assistant entities from BACnet objects."""

from __future__ import annotations

import logging
import re
from enum import Enum
from typing import TYPE_CHECKING, Any

from homeassistant.components.sensor import SensorDeviceClass, SensorStateClass
from homeassistant.const import (
    PERCENTAGE,
    UnitOfEnergy,
    UnitOfPower,
    UnitOfPressure,
    UnitOfTemperature,
)
from homeassistant.helpers.device_registry import DeviceInfo

try:
    from homeassistant.const import UnitOfElectricCurrent
except ImportError:  # compatibility with older HA versions
    UnitOfElectricCurrent = None  # type: ignore[assignment]

try:
    from homeassistant.const import UnitOfElectricPotential
except ImportError:
    UnitOfElectricPotential = None  # type: ignore[assignment]

try:
    from homeassistant.const import UnitOfFrequency
except ImportError:
    UnitOfFrequency = None  # type: ignore[assignment]

try:
    from homeassistant.const import UnitOfVolumeFlowRate
except ImportError:
    UnitOfVolumeFlowRate = None  # type: ignore[assignment]

try:
    from homeassistant.const import UnitOfSpeed
except ImportError:
    UnitOfSpeed = None  # type: ignore[assignment]

try:
    from homeassistant.const import UnitOfLength
except ImportError:
    UnitOfLength = None  # type: ignore[assignment]

try:
    from homeassistant.const import UnitOfTime
except ImportError:
    UnitOfTime = None  # type: ignore[assignment]

if TYPE_CHECKING:
    from .models import BacnetDevice, BacnetObject

_LOGGER = logging.getLogger(__name__)


def _const_value(container: Any, attr: str, fallback: str) -> str:
    """Return a Home Assistant unit constant with a safe fallback."""
    if container is None:
        return fallback
    return getattr(container, attr, fallback)


UNIT_VOLT = _const_value(UnitOfElectricPotential, "VOLT", "V")
UNIT_MILLIVOLT = _const_value(UnitOfElectricPotential, "MILLIVOLT", "mV")
UNIT_AMPERE = _const_value(UnitOfElectricCurrent, "AMPERE", "A")
UNIT_MILLIAMPERE = _const_value(UnitOfElectricCurrent, "MILLIAMPERE", "mA")
UNIT_HERTZ = _const_value(UnitOfFrequency, "HERTZ", "Hz")
UNIT_KILOHERTZ = _const_value(UnitOfFrequency, "KILOHERTZ", "kHz")
UNIT_CUBIC_METERS_PER_HOUR = _const_value(UnitOfVolumeFlowRate, "CUBIC_METERS_PER_HOUR", "m³/h")
UNIT_LITERS_PER_SECOND = _const_value(UnitOfVolumeFlowRate, "LITERS_PER_SECOND", "L/s")
UNIT_METERS_PER_SECOND = _const_value(UnitOfSpeed, "METERS_PER_SECOND", "m/s")
UNIT_KILOMETERS_PER_HOUR = _const_value(UnitOfSpeed, "KILOMETERS_PER_HOUR", "km/h")
UNIT_METER = _const_value(UnitOfLength, "METERS", "m")
UNIT_CENTIMETER = _const_value(UnitOfLength, "CENTIMETERS", "cm")
UNIT_SECOND = _const_value(UnitOfTime, "SECONDS", "s")
UNIT_MINUTE = _const_value(UnitOfTime, "MINUTES", "min")
UNIT_HOUR = _const_value(UnitOfTime, "HOURS", "h")

UNIT_LUX = "lx"
UNIT_PPM = "ppm"
UNIT_PPB = "ppb"
UNIT_BAR = "bar"
UNIT_KILOPASCAL = "kPa"
UNIT_VOLT_AMPERE = "VA"
UNIT_REACTIVE_POWER = "var"
UNIT_LITER_PER_MINUTE = "L/min"
UNIT_CUBIC_METER = "m³"
UNIT_LITER = "L"


class EntityType(Enum):
    """Supported Home Assistant entity types."""

    SENSOR = "sensor"
    BINARY_SENSOR = "binary_sensor"
    SWITCH = "switch"
    NUMBER = "number"
    NONE = "none"
    CLIMATE = "climate"


class BacnetObjectTypeMapper:
    """Maps BACnet object types to Home Assistant entity types."""

    OBJECT_TYPE_MAP = {
        "analog_input": EntityType.SENSOR,
        "analog_value": EntityType.SENSOR,
        "analog_output": EntityType.NUMBER,
        "binary_input": EntityType.BINARY_SENSOR,
        "binary_value": EntityType.SWITCH,
        "binary_output": EntityType.SWITCH,
        "multi_state_input": EntityType.SENSOR,
        "multi_state_output": EntityType.NUMBER,
        "temperature_sensor": EntityType.SENSOR,
        "humidity_sensor": EntityType.SENSOR,
        "pressure_sensor": EntityType.SENSOR,
        "loop": EntityType.SENSOR,
    }

    UNIT_NORMALIZATION_MAP = {
        # Temperature
        "c": UnitOfTemperature.CELSIUS,
        "celsius": UnitOfTemperature.CELSIUS,
        "degreecelsius": UnitOfTemperature.CELSIUS,
        "degreescelsius": UnitOfTemperature.CELSIUS,
        "degreescentigrade": UnitOfTemperature.CELSIUS,
        "centigrade": UnitOfTemperature.CELSIUS,
        "°c": UnitOfTemperature.CELSIUS,
        "f": UnitOfTemperature.FAHRENHEIT,
        "fahrenheit": UnitOfTemperature.FAHRENHEIT,
        "degreefahrenheit": UnitOfTemperature.FAHRENHEIT,
        "degreesfahrenheit": UnitOfTemperature.FAHRENHEIT,
        "°f": UnitOfTemperature.FAHRENHEIT,
        "k": UnitOfTemperature.KELVIN,
        "kelvin": UnitOfTemperature.KELVIN,
        "degreekelvin": UnitOfTemperature.KELVIN,
        "degreeskelvin": UnitOfTemperature.KELVIN,

        # Percentage / humidity
        "%": PERCENTAGE,
        "percent": PERCENTAGE,
        "percentage": PERCENTAGE,
        "percentrelativehumidity": PERCENTAGE,
        "relativehumidity": PERCENTAGE,

        # Pressure
        "pa": UnitOfPressure.PA,
        "pascal": UnitOfPressure.PA,
        "pascals": UnitOfPressure.PA,
        "kpa": UNIT_KILOPASCAL,
        "kilopascal": UNIT_KILOPASCAL,
        "kilopascals": UNIT_KILOPASCAL,
        "bar": UNIT_BAR,
        "millibar": "mbar",
        "mbar": "mbar",

        # Power
        "w": UnitOfPower.WATT,
        "watt": UnitOfPower.WATT,
        "watts": UnitOfPower.WATT,
        "kw": UnitOfPower.KILO_WATT,
        "kilowatt": UnitOfPower.KILO_WATT,
        "kilowatts": UnitOfPower.KILO_WATT,
        "mw": "MW",
        "megawatt": "MW",
        "megawatts": "MW",
        "va": UNIT_VOLT_AMPERE,
        "voltampere": UNIT_VOLT_AMPERE,
        "voltamperes": UNIT_VOLT_AMPERE,
        "kva": "kVA",
        "kilovoltampere": "kVA",
        "kilovoltamperes": "kVA",
        "var": UNIT_REACTIVE_POWER,
        "vars": UNIT_REACTIVE_POWER,
        "kilovar": "kvar",
        "kilovars": "kvar",

        # Energy
        "wh": UnitOfEnergy.WATT_HOUR,
        "watthour": UnitOfEnergy.WATT_HOUR,
        "watthours": UnitOfEnergy.WATT_HOUR,
        "kwh": UnitOfEnergy.KILO_WATT_HOUR,
        "kilowatthour": UnitOfEnergy.KILO_WATT_HOUR,
        "kilowatthours": UnitOfEnergy.KILO_WATT_HOUR,
        "mwh": "MWh",
        "megawatthour": "MWh",
        "megawatthours": "MWh",

        # Voltage / current
        "v": UNIT_VOLT,
        "volt": UNIT_VOLT,
        "volts": UNIT_VOLT,
        "mv": UNIT_MILLIVOLT,
        "millivolt": UNIT_MILLIVOLT,
        "millivolts": UNIT_MILLIVOLT,
        "kv": "kV",
        "kilovolt": "kV",
        "kilovolts": "kV",
        "a": UNIT_AMPERE,
        "ampere": UNIT_AMPERE,
        "amperes": UNIT_AMPERE,
        "amp": UNIT_AMPERE,
        "amps": UNIT_AMPERE,
        "ma": UNIT_MILLIAMPERE,
        "milliampere": UNIT_MILLIAMPERE,
        "milliamperes": UNIT_MILLIAMPERE,

        # Frequency
        "hz": UNIT_HERTZ,
        "hertz": UNIT_HERTZ,
        "khz": UNIT_KILOHERTZ,
        "kilohertz": UNIT_KILOHERTZ,

        # Light
        "lux": UNIT_LUX,
        "lx": UNIT_LUX,
        "lumens": "lm",
        "lumen": "lm",

        # Air quality / concentration
        "ppm": UNIT_PPM,
        "partspermillion": UNIT_PPM,
        "ppb": UNIT_PPB,
        "partsperbillion": UNIT_PPB,

        # Flow
        "cubicmetersperhour": UNIT_CUBIC_METERS_PER_HOUR,
        "cubicmeterperhour": UNIT_CUBIC_METERS_PER_HOUR,
        "m3h": UNIT_CUBIC_METERS_PER_HOUR,
        "m³h": UNIT_CUBIC_METERS_PER_HOUR,
        "literspersecond": UNIT_LITERS_PER_SECOND,
        "literpersecond": UNIT_LITERS_PER_SECOND,
        "lps": UNIT_LITERS_PER_SECOND,
        "ls": UNIT_LITERS_PER_SECOND,
        "litersperminute": UNIT_LITER_PER_MINUTE,
        "literperminute": UNIT_LITER_PER_MINUTE,
        "lpm": UNIT_LITER_PER_MINUTE,
        "lmin": UNIT_LITER_PER_MINUTE,

        # Speed / velocity
        "meterspersecond": UNIT_METERS_PER_SECOND,
        "meterpersecond": UNIT_METERS_PER_SECOND,
        "mps": UNIT_METERS_PER_SECOND,
        "ms": UNIT_METERS_PER_SECOND,
        "kilometersperhour": UNIT_KILOMETERS_PER_HOUR,
        "kilometerperhour": UNIT_KILOMETERS_PER_HOUR,
        "kmh": UNIT_KILOMETERS_PER_HOUR,

        # Length / volume / time
        "m": UNIT_METER,
        "meter": UNIT_METER,
        "meters": UNIT_METER,
        "cm": UNIT_CENTIMETER,
        "centimeter": UNIT_CENTIMETER,
        "centimeters": UNIT_CENTIMETER,
        "centimetre": UNIT_CENTIMETER,
        "centimetres": UNIT_CENTIMETER,
        "cubicmeter": UNIT_CUBIC_METER,
        "cubicmeters": UNIT_CUBIC_METER,
        "m3": UNIT_CUBIC_METER,
        "m³": UNIT_CUBIC_METER,
        "liter": UNIT_LITER,
        "liters": UNIT_LITER,
        "l": UNIT_LITER,
        "second": UNIT_SECOND,
        "seconds": UNIT_SECOND,
        "s": UNIT_SECOND,
        "minute": UNIT_MINUTE,
        "minutes": UNIT_MINUTE,
        "min": UNIT_MINUTE,
        "hour": UNIT_HOUR,
        "hours": UNIT_HOUR,
        "h": UNIT_HOUR,

        # Common BACnet engineering-unit aliases
        "nounits": None,
        "none": None,
        "unknown": None,
    }

    UNIT_KEYWORD_MAP = {
        "temperature": UnitOfTemperature.CELSIUS,
        "temperatur": UnitOfTemperature.CELSIUS,
        "temp": UnitOfTemperature.CELSIUS,
        "humidity": PERCENTAGE,
        "feuchte": PERCENTAGE,
        "pressure": UnitOfPressure.PA,
        "druck": UnitOfPressure.PA,
        "power": UnitOfPower.WATT,
        "leistung": UnitOfPower.WATT,
        "watt": UnitOfPower.WATT,
        "energy": UnitOfEnergy.KILO_WATT_HOUR,
        "energie": UnitOfEnergy.KILO_WATT_HOUR,
        "kwh": UnitOfEnergy.KILO_WATT_HOUR,
        "voltage": UNIT_VOLT,
        "spannung": UNIT_VOLT,
        "current": UNIT_AMPERE,
        "strom": UNIT_AMPERE,
        "frequency": UNIT_HERTZ,
        "frequenz": UNIT_HERTZ,
        "lux": UNIT_LUX,
        "illuminance": UNIT_LUX,
        "durchfluss": UNIT_CUBIC_METERS_PER_HOUR,
        "flow": UNIT_CUBIC_METERS_PER_HOUR,
        "volume": UNIT_CUBIC_METER,
        "volumen": UNIT_CUBIC_METER,
    }

    @staticmethod
    def _normalize_object_type(object_type: str) -> str:
        """Normalize BACnet object type formatting."""
        value = re.sub(r"(?<!^)(?=[A-Z])", "_", str(object_type).strip())
        return value.lower().replace("-", "_")

    @staticmethod
    def _is_raw_object_identifier_name(obj: BacnetObject, object_name: str) -> bool:
        """Check if object_name is just a BACnet object identifier representation."""
        normalized_name = object_name.lower().replace(" ", "")
        normalized_type = obj.object_type.lower().replace("_", "-")
        normalized_id = str(obj.object_id).lower().replace(" ", "")
        return normalized_name in {
            f"({normalized_type},{normalized_id})",
            f"{normalized_type}:{normalized_id}",
        }

    @staticmethod
    def get_entity_type(obj: BacnetObject) -> EntityType:
        """Determine the best Home Assistant entity type for a BACnet object."""
        obj_type_lower = BacnetObjectTypeMapper._normalize_object_type(obj.object_type)

        # BACnet Analog Value objects represent setpoints/parameters rather than
        # physical inputs.  The gateway firmware does not always advertise the
        # writable property metadata, although presentValue is writable through
        # its API v2 endpoint.
        if obj_type_lower == "analog_value":
            return EntityType.NUMBER

        if obj_type_lower in BacnetObjectTypeMapper.OBJECT_TYPE_MAP:
            entity_type = BacnetObjectTypeMapper.OBJECT_TYPE_MAP[obj_type_lower]
            if obj.writable and entity_type == EntityType.SENSOR:
                return EntityType.NUMBER
            return entity_type

        if "input" in obj_type_lower:
            return EntityType.BINARY_SENSOR if "binary" in obj_type_lower else EntityType.SENSOR
        if "output" in obj_type_lower:
            return EntityType.SWITCH if "binary" in obj_type_lower else EntityType.NUMBER
        if "switch" in obj_type_lower:
            return EntityType.SWITCH
        if "setpoint" in obj_type_lower or "command" in obj_type_lower:
            return EntityType.NUMBER
        # Unknown/internal gateway objects (for example file objects and
        # proprietary system data) must not become arbitrary HA sensors.
        return EntityType.NONE

    @staticmethod
    def get_device_class(obj: BacnetObject) -> SensorDeviceClass | str | None:
        """Determine the Home Assistant device class for a BACnet object."""
        normalized_unit = BacnetObjectTypeMapper.get_unit_of_measurement(obj)
        obj_type_lower = BacnetObjectTypeMapper._normalize_object_type(obj.object_type)
        obj_name_lower = obj.object_name.lower() if obj.object_name else ""

        if normalized_unit in {
            UnitOfTemperature.CELSIUS,
            UnitOfTemperature.FAHRENHEIT,
            UnitOfTemperature.KELVIN,
        }:
            return SensorDeviceClass.TEMPERATURE

        if normalized_unit == PERCENTAGE:
            if "humidity" in obj_type_lower or "humidity" in obj_name_lower or "feuchte" in obj_name_lower:
                return SensorDeviceClass.HUMIDITY
            return None

        device_class_by_unit = {
            UnitOfPressure.PA: SensorDeviceClass.PRESSURE,
            UNIT_KILOPASCAL: SensorDeviceClass.PRESSURE,
            UNIT_BAR: SensorDeviceClass.PRESSURE,
            UnitOfPower.WATT: SensorDeviceClass.POWER,
            UnitOfPower.KILO_WATT: SensorDeviceClass.POWER,
            "MW": SensorDeviceClass.POWER,
            UnitOfEnergy.WATT_HOUR: SensorDeviceClass.ENERGY,
            UnitOfEnergy.KILO_WATT_HOUR: SensorDeviceClass.ENERGY,
            "MWh": SensorDeviceClass.ENERGY,
            UNIT_VOLT: getattr(SensorDeviceClass, "VOLTAGE", None),
            UNIT_MILLIVOLT: getattr(SensorDeviceClass, "VOLTAGE", None),
            "kV": getattr(SensorDeviceClass, "VOLTAGE", None),
            UNIT_AMPERE: getattr(SensorDeviceClass, "CURRENT", None),
            UNIT_MILLIAMPERE: getattr(SensorDeviceClass, "CURRENT", None),
            UNIT_HERTZ: getattr(SensorDeviceClass, "FREQUENCY", None),
            UNIT_KILOHERTZ: getattr(SensorDeviceClass, "FREQUENCY", None),
            UNIT_LUX: getattr(SensorDeviceClass, "ILLUMINANCE", None),
            UNIT_METER: getattr(SensorDeviceClass, "DISTANCE", None),
            UNIT_CENTIMETER: getattr(SensorDeviceClass, "DISTANCE", None),
            UNIT_PPM: getattr(SensorDeviceClass, "CO2", None) if "co2" in obj_name_lower else None,
        }

        device_class = device_class_by_unit.get(normalized_unit)
        if device_class is not None:
            return device_class

        # Fallback for objects without a BACnet unit.
        if "temperature" in obj_type_lower or "temp" in obj_name_lower or "temperatur" in obj_name_lower:
            return SensorDeviceClass.TEMPERATURE
        if "humidity" in obj_type_lower or "humidity" in obj_name_lower or "feuchte" in obj_name_lower:
            return SensorDeviceClass.HUMIDITY
        if "pressure" in obj_type_lower or "pressure" in obj_name_lower or "druck" in obj_name_lower:
            return SensorDeviceClass.PRESSURE
        if "power" in obj_name_lower or "watt" in obj_name_lower or "leistung" in obj_name_lower:
            return SensorDeviceClass.POWER
        if "energy" in obj_name_lower or "kwh" in obj_name_lower or "energie" in obj_name_lower:
            return SensorDeviceClass.ENERGY
        if "co2" in obj_name_lower:
            return SensorDeviceClass.CO2
        if "pm2.5" in obj_name_lower or "pm25" in obj_name_lower:
            return SensorDeviceClass.PM25
        if "pm10" in obj_name_lower:
            return SensorDeviceClass.PM10

        return None

    @staticmethod
    def get_unit_of_measurement(obj: BacnetObject) -> str | None:
        """Get the unit of measurement for a BACnet object."""
        normalized_unit = BacnetObjectTypeMapper._normalize_unit_value(obj.units)
        if normalized_unit:
            return normalized_unit

        obj_name_lower = obj.object_name.lower() if obj.object_name else ""
        obj_type_lower = BacnetObjectTypeMapper._normalize_object_type(obj.object_type)
        combined = f"{obj_type_lower} {obj_name_lower}"

        for keyword, mapped_unit in BacnetObjectTypeMapper.UNIT_KEYWORD_MAP.items():
            if keyword in combined:
                return mapped_unit

        return None

    @staticmethod
    def is_writable(obj: BacnetObject) -> bool:
        """Check if a BACnet object is writable."""
        return obj.writable

    @staticmethod
    def get_state_class(obj: BacnetObject) -> SensorStateClass | None:
        """Determine the Home Assistant state class for a BACnet object."""
        normalized_unit = BacnetObjectTypeMapper.get_unit_of_measurement(obj)
        obj_name_lower = obj.object_name.lower() if obj.object_name else ""
        obj_type_lower = BacnetObjectTypeMapper._normalize_object_type(obj.object_type)

        if any(token in obj_name_lower for token in ["counter", "total", "cumulative", "zaehler", "zähler"]):
            return SensorStateClass.TOTAL_INCREASING

        if normalized_unit in {
            UnitOfEnergy.WATT_HOUR,
            UnitOfEnergy.KILO_WATT_HOUR,
            "MWh",
        }:
            return SensorStateClass.TOTAL_INCREASING

        if normalized_unit is not None:
            return SensorStateClass.MEASUREMENT

        device_class = BacnetObjectTypeMapper.get_device_class(obj)

        if (
            "analog" in obj_type_lower
            or any(
                token in obj_type_lower
                for token in ["input", "sensor", "temperature", "humidity", "pressure"]
            )
            or device_class
            in {
                SensorDeviceClass.TEMPERATURE,
                SensorDeviceClass.HUMIDITY,
                SensorDeviceClass.PRESSURE,
                SensorDeviceClass.POWER,
                SensorDeviceClass.ENERGY,
                SensorDeviceClass.CO2,
                SensorDeviceClass.PM25,
                SensorDeviceClass.PM10,
            }
        ):
            return SensorStateClass.MEASUREMENT

        return None

    @staticmethod
    def should_native_value_be_float(obj: BacnetObject) -> bool:
        """Return True if the object should expose a float native value."""
        obj_type_lower = BacnetObjectTypeMapper._normalize_object_type(obj.object_type)
        if obj_type_lower.startswith("analog_"):
            return True

        return BacnetObjectTypeMapper.get_state_class(obj) in {
            SensorStateClass.MEASUREMENT,
            SensorStateClass.TOTAL_INCREASING,
        }

    @staticmethod
    def get_display_name(obj: BacnetObject) -> tuple[str, bool]:
        """Return entity name and whether has_entity_name should be enabled."""
        object_name = obj.object_name.strip() if obj.object_name else ""
        if (
            object_name
            and BacnetObjectTypeMapper._is_human_friendly_name(object_name, obj)
            and not BacnetObjectTypeMapper._is_generic_measurement_name(object_name)
        ):
            return object_name, False

        return BacnetObjectTypeMapper.get_measurement_label(obj), True


    @staticmethod
    def get_measurement_label(obj: BacnetObject) -> str:
        """Return the object id as entity name suffix.

        With has_entity_name=True, Home Assistant builds:
        sensor.device_1_analoginput_545
        instead of:
        sensor.device_1_analoginput_analoginput_545
        """
        return str(obj.object_id)



    @staticmethod
    def _is_generic_measurement_name(name: str) -> bool:
        """Return True for generic labels that should not become entity names."""
        normalized = re.sub(r"[\s_\-]+", "", name).lower()
        generic_names = {
            "temperature",
            "temperatur",
            "humidity",
            "luftfeuchte",
            "pressure",
            "druck",
            "power",
            "leistung",
            "energy",
            "energie",
            "co2",
            "pm25",
            "pm2.5",
            "pm10",
            "percent",
            "prozent",
        }
        return normalized in generic_names

    @staticmethod
    def _normalize_unit_value(unit: str | None) -> str | None:
        """Normalize BACnet units to Home Assistant units."""
        if unit is None:
            return None

        unit_str = str(unit).strip()
        if not unit_str:
            return None

        direct = BacnetObjectTypeMapper.UNIT_NORMALIZATION_MAP.get(unit_str)
        if direct is not None or unit_str.lower() in {"no-units", "no units", "none", "unknown"}:
            return direct

        normalized_key = BacnetObjectTypeMapper._unit_key(unit_str)
        return BacnetObjectTypeMapper.UNIT_NORMALIZATION_MAP.get(normalized_key)

    @staticmethod
    def _unit_key(unit: str) -> str:
        """Normalize different BACnet unit spellings to one lookup key."""
        value = str(unit).strip()
        value = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", value)
        value = value.lower()
        value = value.replace("µ", "u")
        value = value.replace("³", "3")
        value = value.replace("²", "2")
        return re.sub(r"[\s_\-\/().]+", "", value)

    @staticmethod
    def _is_human_friendly_name(name: str, obj: BacnetObject) -> bool:
        """Return True if BACnet object name is readable for end users."""
        stripped = name.strip()
        lowered = stripped.lower()

        if BacnetObjectTypeMapper._is_raw_object_identifier_name(obj, stripped):
            return False

        technical_patterns = (
            f"{str(obj.object_type).lower()} {str(obj.object_id).lower()}",
            f"{str(obj.object_type).lower()}:{str(obj.object_id).lower()}",
        )
        if lowered in technical_patterns:
            return False

        if re.match(r"^\(.*\)$", stripped) and "[" in stripped and "]" in stripped:
            return False

        if any(
            token in lowered
            for token in (
                "analog-input",
                "analog_input",
                "analog-output",
                "analog_output",
                "binary-input",
                "binary_input",
                "binary-output",
                "binary_output",
                "multi-state",
                "multi_state",
            )
        ) and any(char.isdigit() for char in lowered):
            return False

        return True

    @staticmethod
    def get_device_group_key(obj: BacnetObject) -> str:
        """Return a stable device-group key for one BACnet object."""
        return BacnetObjectTypeMapper._normalize_object_type(obj.object_type)

    @staticmethod
    def get_device_group_name(obj: BacnetObject) -> str:
        """Return a readable device-group label for one BACnet object."""
        device_group_key = BacnetObjectTypeMapper.get_device_group_key(obj)

        return device_group_key.replace("_", " ").title()

    @staticmethod
    def build_device_info(
        domain: str,
        obj: BacnetObject,
        device: BacnetDevice | None,
    ) -> DeviceInfo:
        """Build Home Assistant device info for the BACnet device.

        One physical/logical BACnet device is represented as one Home Assistant
        device.  Older versions grouped objects by object type (for example
        "Device 1 - AnalogInput").  With Home Assistant's entity-name handling
        this produced duplicated entity IDs like
        ``sensor.device_1_analoginput_analoginput_1249``.
        """
        base_name = device.name if device is not None else f"Device {obj.device_id}"

        device_info = DeviceInfo(
            identifiers={(domain, f"device_{obj.device_id}")},
            name=base_name,
        )

        if device is not None:
            device_info["manufacturer"] = device.vendor
            device_info["model"] = device.model
            device_info["sw_version"] = device.firmware

        return device_info
