"""Entity factory for creating Home Assistant entities from BACnet objects."""

from __future__ import annotations

import logging
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

    BACNET_TO_HA_UNIT_MAP = {
        "degreescelsius": UnitOfTemperature.CELSIUS,
        "degreesfahrenheit": UnitOfTemperature.FAHRENHEIT,
        "kelvin": UnitOfTemperature.KELVIN,
        "percent": PERCENTAGE,
        "pascals": UnitOfPressure.PA,
        "watts": UnitOfPower.WATT,
        "kilowatthours": UnitOfEnergy.KILO_WATT_HOUR,
    }

    # Mapping of BACnet object types to HA entity types
    OBJECT_TYPE_MAP = {
        # Analog inputs - always read-only sensors
        "analog_input": EntityType.SENSOR,
        "analog_value": EntityType.SENSOR,
        # Analog outputs - writable number entities
        "analog_output": EntityType.NUMBER,
        # Binary inputs - read-only binary sensors
        "binary_input": EntityType.BINARY_SENSOR,
        "binary_value": EntityType.SWITCH,
        # Binary outputs - switches
        "binary_output": EntityType.SWITCH,
        # Multi-state input - sensor
        "multi_state_input": EntityType.SENSOR,
        # Multi-state output - number
        "multi_state_output": EntityType.NUMBER,
        # Temperature sensor - sensor with temperature device class
        "temperature_sensor": EntityType.SENSOR,
        # Humidity sensor - sensor with humidity device class
        "humidity_sensor": EntityType.SENSOR,
        # Pressure sensor - sensor with pressure device class
        "pressure_sensor": EntityType.SENSOR,
        # Loop object (setpoint, feedback) - sensor or number
        "loop": EntityType.SENSOR,
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
        """Determine the best Home Assistant entity type for a BACnet object.

        Args:
            obj: BacnetObject to map

        Returns:
            EntityType enum value
        """
        obj_type_lower = BacnetObjectTypeMapper._normalize_object_type(obj.object_type)

        # Check exact match first
        if obj_type_lower in BacnetObjectTypeMapper.OBJECT_TYPE_MAP:
            entity_type = BacnetObjectTypeMapper.OBJECT_TYPE_MAP[obj_type_lower]
            # Override for writable objects
            if obj.writable and entity_type == EntityType.SENSOR:
                return EntityType.NUMBER
            return entity_type

        # Default mapping based on common patterns
        if "input" in obj_type_lower:
            return EntityType.BINARY_SENSOR if "binary" in obj_type_lower else EntityType.SENSOR
        elif "output" in obj_type_lower:
            return EntityType.SWITCH if "binary" in obj_type_lower else EntityType.NUMBER
        elif "switch" in obj_type_lower:
            return EntityType.SWITCH
        elif "setpoint" in obj_type_lower or "command" in obj_type_lower:
            return EntityType.NUMBER
        else:
            # Default to sensor for unknown types
            return EntityType.SENSOR

    @staticmethod
    def get_device_class(obj: BacnetObject) -> str | None:
        """Determine the Home Assistant device class for a BACnet object.

        Args:
            obj: BacnetObject to map

        Returns:
            Device class string or None
        """
        obj_type_lower = BacnetObjectTypeMapper._normalize_object_type(obj.object_type)
        obj_name_lower = obj.object_name.lower() if obj.object_name else ""
        unit = BacnetObjectTypeMapper.get_unit_of_measurement(obj)

        # Temperature
        if (
            "temperature" in obj_type_lower
            or "temp" in obj_name_lower
            or unit
            in {
                UnitOfTemperature.CELSIUS,
                UnitOfTemperature.FAHRENHEIT,
                UnitOfTemperature.KELVIN,
            }
        ):
            return SensorDeviceClass.TEMPERATURE
        # Humidity
        if "humidity" in obj_type_lower or "humidity" in obj_name_lower:
            return SensorDeviceClass.HUMIDITY
        # Pressure
        if "pressure" in obj_type_lower or "pressure" in obj_name_lower:
            return SensorDeviceClass.PRESSURE
        # Power
        if "power" in obj_name_lower or "watt" in obj_name_lower:
            return SensorDeviceClass.POWER
        # Energy
        if "energy" in obj_name_lower or "kwh" in obj_name_lower:
            return SensorDeviceClass.ENERGY
        # CO2
        if "co2" in obj_name_lower:
            return SensorDeviceClass.CO2
        # PM2.5
        if "pm2.5" in obj_name_lower or "pm25" in obj_name_lower:
            return SensorDeviceClass.PM25
        # PM10
        if "pm10" in obj_name_lower:
            return SensorDeviceClass.PM10

        return None

    @staticmethod
    def get_unit_of_measurement(obj: BacnetObject) -> str | None:
        """Get the unit of measurement for a BACnet object.

        Args:
            obj: BacnetObject to map

        Returns:
            Unit string or None (Home Assistant will auto-detect from device class)
        """
        # If BACnet object already has units, map them to Home Assistant standards
        if obj.units:
            unit_key = obj.units.strip().lower()
            return BacnetObjectTypeMapper.BACNET_TO_HA_UNIT_MAP.get(unit_key, obj.units)

        # Try to infer from object name
        obj_name_lower = obj.object_name.lower() if obj.object_name else ""

        if "temperature" in obj_name_lower:
            return UnitOfTemperature.CELSIUS
        elif "humidity" in obj_name_lower:
            return PERCENTAGE
        elif "pressure" in obj_name_lower:
            return UnitOfPressure.PA
        elif "power" in obj_name_lower:
            return UnitOfPower.WATT
        elif "energy" in obj_name_lower:
            return UnitOfEnergy.KILO_WATT_HOUR

        return None

    @staticmethod
    def is_writable(obj: BacnetObject) -> bool:
        """Check if a BACnet object is writable.

        Args:
            obj: BacnetObject to check

        Returns:
            True if object supports write operations
        """
        return obj.writable

    @staticmethod
    def get_state_class(obj: BacnetObject) -> str | None:
        """Determine the Home Assistant state class for a BACnet object.

        Args:
            obj: BacnetObject to map

        Returns:
            State class string or None
        """
        obj_name_lower = obj.object_name.lower() if obj.object_name else ""
        obj_type_lower = BacnetObjectTypeMapper._normalize_object_type(obj.object_type)
        device_class = BacnetObjectTypeMapper.get_device_class(obj)

        # total_increasing - for counters/energy meters
        if any(
            x in obj_name_lower
            for x in ["counter", "total", "cumulative", "energy", "kwh"]
        ):
            return SensorStateClass.TOTAL_INCREASING

        # measurement - state changes frequently, important for statistics
        if (
            "analog" in obj_type_lower
            or any(
                x in obj_type_lower
                for x in ["input", "sensor", "temperature", "humidity", "pressure"]
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
    def should_use_numeric_value(obj: BacnetObject) -> bool:
        """Determine whether the object should expose a numeric native value."""
        obj_type_lower = BacnetObjectTypeMapper._normalize_object_type(obj.object_type)
        return (
            "analog" in obj_type_lower
            or BacnetObjectTypeMapper.get_state_class(obj) in {
                SensorStateClass.MEASUREMENT,
                SensorStateClass.TOTAL_INCREASING,
            }
        )

    @staticmethod
    def get_entity_name(obj: BacnetObject) -> str:
        """Return a user-friendly entity name with object identifier."""
        object_name = (obj.object_name or "").strip()

        if BacnetObjectTypeMapper._is_raw_object_identifier_name(obj, object_name):
            object_name = ""

        if object_name:
            object_id = str(obj.object_id)
            tokens = (
                object_name.replace("(", " ")
                .replace(")", " ")
                .replace("[", " ")
                .replace("]", " ")
                .replace(",", " ")
                .split()
            )
            if object_id and object_id not in tokens:
                return f"{object_name} {object_id}"
            return object_name

        return f"{obj.object_type} {obj.object_id}"
