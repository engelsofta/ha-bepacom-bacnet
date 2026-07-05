"""Entity factory for creating Home Assistant entities from BACnet objects."""

from __future__ import annotations

import logging
from enum import Enum
from typing import TYPE_CHECKING

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

    # Mapping of BACnet object types to HA entity types
    OBJECT_TYPE_MAP = {
        # Analog inputs - always read-only sensors
        "analog_input": EntityType.SENSOR,
        # Analog outputs - writable number entities
        "analog_output": EntityType.NUMBER,
        # Binary inputs - read-only binary sensors
        "binary_input": EntityType.BINARY_SENSOR,
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
    def get_entity_type(obj: BacnetObject) -> EntityType:
        """Determine the best Home Assistant entity type for a BACnet object.

        Args:
            obj: BacnetObject to map

        Returns:
            EntityType enum value
        """
        obj_type_lower = obj.object_type.lower()

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
        obj_type_lower = obj.object_type.lower()
        obj_name_lower = obj.object_name.lower() if obj.object_name else ""

        # Temperature
        if "temperature" in obj_type_lower or "temp" in obj_name_lower:
            return "temperature"
        # Humidity
        if "humidity" in obj_type_lower or "humidity" in obj_name_lower:
            return "humidity"
        # Pressure
        if "pressure" in obj_type_lower or "pressure" in obj_name_lower:
            return "pressure"
        # Power
        if "power" in obj_name_lower or "watt" in obj_name_lower:
            return "power"
        # Energy
        if "energy" in obj_name_lower or "kwh" in obj_name_lower:
            return "energy"
        # CO2
        if "co2" in obj_name_lower:
            return "carbon_dioxide"
        # PM2.5
        if "pm2.5" in obj_name_lower or "pm25" in obj_name_lower:
            return "pm25"
        # PM10
        if "pm10" in obj_name_lower:
            return "pm10"

        return None

    @staticmethod
    def get_unit_of_measurement(obj: BacnetObject) -> str | None:
        """Get the unit of measurement for a BACnet object.

        Args:
            obj: BacnetObject to map

        Returns:
            Unit string or None (Home Assistant will auto-detect from device class)
        """
        # If BACnet object already has units, use them
        if obj.units:
            return obj.units

        # Try to infer from object name
        obj_name_lower = obj.object_name.lower() if obj.object_name else ""

        if "temperature" in obj_name_lower:
            return "°C"
        elif "humidity" in obj_name_lower:
            return "%"
        elif "pressure" in obj_name_lower:
            return "Pa"
        elif "power" in obj_name_lower:
            return "W"
        elif "energy" in obj_name_lower:
            return "kWh"

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
        obj_type_lower = obj.object_type.lower()

        # measurement - state changes frequently, important for statistics
        if any(
            x in obj_type_lower
            for x in ["input", "sensor", "temperature", "humidity", "pressure"]
        ):
            return "measurement"

        # total_increasing - for counters/energy meters
        if any(
            x in obj_name_lower
            for x in ["counter", "total", "cumulative", "energy", "kwh"]
        ):
            return "total_increasing"

        return None
