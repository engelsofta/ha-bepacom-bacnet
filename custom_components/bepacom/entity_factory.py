"""Entity factory for creating Home Assistant entities from BACnet objects."""

from __future__ import annotations

import logging
import re
from enum import Enum
from typing import TYPE_CHECKING

from homeassistant.components.sensor import SensorDeviceClass, SensorStateClass
from homeassistant.const import (
    PERCENTAGE,
    UnitOfEnergy,
    UnitOfPower,
    UnitOfPressure,
    UnitOfTemperature,
)

if TYPE_CHECKING:
    from .models import BacnetObject

_LOGGER = logging.getLogger(__name__)


class EntityType(Enum):
    """Supported Home Assistant entity types."""

    SENSOR = "sensor"
    BINARY_SENSOR = "binary_sensor"
    SWITCH = "switch"
    NUMBER = "number"
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
        "°c": UnitOfTemperature.CELSIUS,
        "c": UnitOfTemperature.CELSIUS,
        "celsius": UnitOfTemperature.CELSIUS,
        "degreecelsius": UnitOfTemperature.CELSIUS,
        "degreescelsius": UnitOfTemperature.CELSIUS,
        "degreesfahrenheit": UnitOfTemperature.FAHRENHEIT,
        "kelvin": UnitOfTemperature.KELVIN,
        "%": PERCENTAGE,
        "percent": PERCENTAGE,
        "percentage": PERCENTAGE,
        "pa": UnitOfPressure.PA,
        "pascal": UnitOfPressure.PA,
        "pascals": UnitOfPressure.PA,
        "w": UnitOfPower.WATT,
        "watt": UnitOfPower.WATT,
        "watts": UnitOfPower.WATT,
        "kwh": UnitOfEnergy.KILO_WATT_HOUR,
        "kilowatthour": UnitOfEnergy.KILO_WATT_HOUR,
        "kilowatthours": UnitOfEnergy.KILO_WATT_HOUR,
    }

    UNIT_KEYWORD_MAP = {
        "temperature": UnitOfTemperature.CELSIUS,
        "temp": UnitOfTemperature.CELSIUS,
        "humidity": PERCENTAGE,
        "pressure": UnitOfPressure.PA,
        "power": UnitOfPower.WATT,
        "watt": UnitOfPower.WATT,
        "energy": UnitOfEnergy.KILO_WATT_HOUR,
        "kwh": UnitOfEnergy.KILO_WATT_HOUR,
    }

    @staticmethod
    def _normalize_object_type(object_type: str) -> str:
        """Normalize BACnet object type formatting."""
        return object_type.lower().replace("-", "_")

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
        return EntityType.SENSOR

    @staticmethod
    def get_device_class(obj: BacnetObject) -> SensorDeviceClass | None:
        """Determine the Home Assistant device class for a BACnet object."""
        obj_type_lower = BacnetObjectTypeMapper._normalize_object_type(obj.object_type)
        obj_name_lower = obj.object_name.lower() if obj.object_name else ""
        normalized_unit = BacnetObjectTypeMapper.get_unit_of_measurement(obj)

        if (
            normalized_unit
            in {
                UnitOfTemperature.CELSIUS,
                UnitOfTemperature.FAHRENHEIT,
                UnitOfTemperature.KELVIN,
            }
            or "temperature" in obj_type_lower
            or "temp" in obj_name_lower
        ):
            return SensorDeviceClass.TEMPERATURE
        if "humidity" in obj_type_lower or "humidity" in obj_name_lower:
            return SensorDeviceClass.HUMIDITY
        if (
            normalized_unit == UnitOfPressure.PA
            or "pressure" in obj_type_lower
            or "pressure" in obj_name_lower
        ):
            return SensorDeviceClass.PRESSURE
        if (
            normalized_unit == UnitOfPower.WATT
            or "power" in obj_name_lower
            or "watt" in obj_name_lower
        ):
            return SensorDeviceClass.POWER
        if (
            normalized_unit == UnitOfEnergy.KILO_WATT_HOUR
            or "energy" in obj_name_lower
            or "kwh" in obj_name_lower
        ):
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
        if normalized_unit == UnitOfEnergy.KILO_WATT_HOUR:
            return SensorStateClass.TOTAL_INCREASING
        if normalized_unit in {
            UnitOfTemperature.CELSIUS,
            UnitOfTemperature.FAHRENHEIT,
            UnitOfTemperature.KELVIN,
            PERCENTAGE,
            UnitOfPressure.PA,
            UnitOfPower.WATT,
        }:
            return SensorStateClass.MEASUREMENT

        obj_name_lower = obj.object_name.lower() if obj.object_name else ""
        obj_type_lower = BacnetObjectTypeMapper._normalize_object_type(obj.object_type)
        device_class = BacnetObjectTypeMapper.get_device_class(obj)

        if any(token in obj_name_lower for token in ["counter", "total", "cumulative"]):
            return SensorStateClass.TOTAL_INCREASING

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
        if object_name and BacnetObjectTypeMapper._is_human_friendly_name(object_name, obj):
            return object_name, False

        return BacnetObjectTypeMapper.get_measurement_label(obj), True

    @staticmethod
    def get_measurement_label(obj: BacnetObject) -> str:
        """Return a readable measurement label for an object."""
        device_class = BacnetObjectTypeMapper.get_device_class(obj)
        if device_class == SensorDeviceClass.TEMPERATURE:
            return "Temperature"
        if device_class == SensorDeviceClass.HUMIDITY:
            return "Humidity"
        if device_class == SensorDeviceClass.PRESSURE:
            return "Pressure"
        if device_class == SensorDeviceClass.POWER:
            return "Power"
        if device_class == SensorDeviceClass.ENERGY:
            return "Energy"
        if device_class == SensorDeviceClass.CO2:
            return "CO2"
        if device_class == SensorDeviceClass.PM25:
            return "PM2.5"
        if device_class == SensorDeviceClass.PM10:
            return "PM10"
        if BacnetObjectTypeMapper.get_unit_of_measurement(obj) == PERCENTAGE:
            return "Percent"

        object_type = obj.object_type.replace("-", " ").replace("_", " ").strip().title()
        if object_type:
            return f"{object_type} {obj.object_id}"
        return f"Object {obj.object_id}"

    @staticmethod
    def _normalize_unit_value(unit: str | None) -> str | None:
        """Normalize BACnet units to Home Assistant units."""
        if not unit:
            return None

        unit_str = str(unit).strip()
        if not unit_str:
            return None

        if unit_str in BacnetObjectTypeMapper.UNIT_NORMALIZATION_MAP:
            return BacnetObjectTypeMapper.UNIT_NORMALIZATION_MAP[unit_str]

        normalized_key = re.sub(r"[\s_\-]+", "", unit_str).lower()
        return BacnetObjectTypeMapper.UNIT_NORMALIZATION_MAP.get(normalized_key)

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
