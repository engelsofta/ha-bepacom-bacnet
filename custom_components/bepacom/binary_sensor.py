"""Binary sensor platform for the Bepacom integration."""

from __future__ import annotations

import ast
import logging
import operator
from typing import Any

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.util import slugify
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import BepacomCoordinator
from .entity_factory import BacnetObjectTypeMapper, EntityType
from .models import BacnetObject

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up binary sensor entities from a config entry."""

    coordinator: BepacomCoordinator = hass.data[DOMAIN][entry.entry_id][
        "coordinator"
    ]

    # Create binary sensors for BACnet binary input/output objects
    entities: list[BinarySensorEntity] = []

    for obj in coordinator.point_registry.all():
        entity_type = BacnetObjectTypeMapper.get_entity_type(obj)

        if entity_type == EntityType.BINARY_SENSOR:
            entities.append(BepacomBinarySensor(coordinator, obj))

    # Additional virtual binary sensors keep the original BACnet raw entity intact.
    # They map a source point's raw presentValue to on/off according to the
    # user configuration in the BACnet Explorer sidebar.
    for obj in coordinator.point_registry.all(include_disabled=True):
        for config in coordinator.point_registry.overrides.get_virtual_entities(obj):
            if config.get("entity_type") == "binary_sensor":
                entities.append(BepacomVirtualBinarySensor(coordinator, obj, config))

    if entities:
        async_add_entities(entities)
        _LOGGER.info("Added %d binary sensor entities", len(entities))


class BepacomBinarySensor(CoordinatorEntity[BepacomCoordinator], BinarySensorEntity):
    """Represents a Bepacom BACnet binary sensor entity."""

    def __init__(
        self,
        coordinator: BepacomCoordinator,
        obj: BacnetObject,
    ) -> None:
        """Initialize the binary sensor."""
        super().__init__(coordinator)

        self._obj = obj
        self._attr_unique_id = obj.unique_id
        self._attr_entity_id = f"binary_sensor.{obj.entity_id}"
        self._attr_suggested_object_id = obj.entity_id
        display_name, has_entity_name = BacnetObjectTypeMapper.get_display_name(obj)
        self._attr_name = display_name
        self._attr_has_entity_name = has_entity_name
        self._attr_device_class = BacnetObjectTypeMapper.get_device_class(obj)
        self._attr_device_info = self._build_device_info()
        self._attr_extra_state_attributes = (
            coordinator.point_registry.entity_attributes(obj)
        )
        self._last_point_revision = coordinator.point_registry.revision(obj)
        self._last_coordinator_success = coordinator.last_update_success
        self._last_data_revision = coordinator.data_revision

    def _build_device_info(self) -> DeviceInfo:
        """Build Home Assistant device info for this BACnet device."""
        device = self.coordinator.discovery.devices.get(self._obj.device_id)
        return BacnetObjectTypeMapper.build_device_info(
            domain=DOMAIN,
            obj=self._obj,
            device=device,
        )

    @callback
    def _handle_coordinator_update(self) -> None:
        """Write HA state only when this point or availability changed."""
        revision = self.coordinator.point_registry.revision(self._obj)
        success = self.coordinator.last_update_success
        data_revision = self.coordinator.data_revision
        if (
            revision == self._last_point_revision
            and success == self._last_coordinator_success
            and data_revision == self._last_data_revision
        ):
            return
        self._last_point_revision = revision
        self._last_coordinator_success = success
        self._last_data_revision = data_revision
        self.async_write_ha_state()

    @property
    def is_on(self) -> bool | None:
        """Return True if the binary sensor is on."""
        # Update the object from latest data
        if self.coordinator.data:
            device_key = f"device:{self._obj.device_id}"

            if device_key in self.coordinator.data:
                device_data = self.coordinator.data[device_key]

                obj_key = f"{self._obj.object_type}:{self._obj.object_id}"

                if obj_key in device_data:
                    obj_data = device_data[obj_key]

                    if isinstance(obj_data, dict):
                        self._obj.update(obj_data)
                        display_name, has_entity_name = (
                            BacnetObjectTypeMapper.get_display_name(self._obj)
                        )
                        self._attr_name = display_name
                        self._attr_has_entity_name = has_entity_name
                        self._attr_device_class = BacnetObjectTypeMapper.get_device_class(
                            self._obj
                        )

        # Convert present_value to boolean
        value = self._obj.present_value

        if value is None:
            return None

        # Handle common boolean representations
        if isinstance(value, bool):
            return value
        elif isinstance(value, (int, float)):
            return value != 0
        elif isinstance(value, str):
            return value.strip().lower() in ("true", "yes", "on", "1", "active")

        return bool(value)

    @property
    def available(self) -> bool:
        """Return whether the entity is available."""
        return self.coordinator.last_update_success


class BepacomVirtualBinarySensor(CoordinatorEntity[BepacomCoordinator], BinarySensorEntity):
    """Virtual binary sensor derived from a BACnet source point."""

    def __init__(
        self,
        coordinator: BepacomCoordinator,
        source_obj: BacnetObject,
        config: dict[str, Any],
    ) -> None:
        """Initialize the virtual binary sensor."""
        super().__init__(coordinator)
        self._source_obj = source_obj
        self._config = config

        unique_id = str(config.get("unique_id") or f"{source_obj.unique_id}_virtual_binary").strip()
        name = str(config.get("name") or f"{source_obj.object_name or source_obj.unique_id} Binary").strip()

        self._attr_unique_id = unique_id
        self._attr_entity_id = f"binary_sensor.{slugify(unique_id)}"
        self._attr_suggested_object_id = slugify(unique_id)
        self._attr_name = name
        self._attr_has_entity_name = False
        self._attr_device_class = config.get("device_class") or None
        self._attr_device_info = self._build_device_info()
        self._attr_extra_state_attributes = {
            "virtual_entity": True,
            "source_unique_id": source_obj.unique_id,
            "source_object": f"device:{source_obj.device_id}/{source_obj.object_type}:{source_obj.object_id}",
            "on_condition": config.get("on_value"),
            "off_condition": config.get("off_value"),
            "else_state": config.get("else_state", "unavailable"),
        }
        self._last_point_revision = coordinator.point_registry.revision(source_obj)
        self._last_coordinator_success = coordinator.last_update_success
        self._last_data_revision = coordinator.data_revision

    @callback
    def _handle_coordinator_update(self) -> None:
        """Update only when the virtual entity source or availability changed."""
        revision = self.coordinator.point_registry.revision(self._source_obj)
        success = self.coordinator.last_update_success
        data_revision = self.coordinator.data_revision
        if (
            revision == self._last_point_revision
            and success == self._last_coordinator_success
            and data_revision == self._last_data_revision
        ):
            return
        self._last_point_revision = revision
        self._last_coordinator_success = success
        self._last_data_revision = data_revision
        self.async_write_ha_state()

    def _build_device_info(self) -> DeviceInfo:
        """Build Home Assistant device info for this BACnet device."""
        device = self.coordinator.discovery.devices.get(self._source_obj.device_id)
        return BacnetObjectTypeMapper.build_device_info(
            domain=DOMAIN,
            obj=self._source_obj,
            device=device,
        )

    def _source_value(self) -> Any:
        """Return the current source point value from coordinator data."""
        if self.coordinator.data:
            device_key = f"device:{self._source_obj.device_id}"
            device_data = self.coordinator.data.get(device_key)
            if isinstance(device_data, dict):
                obj_key = f"{self._source_obj.object_type}:{self._source_obj.object_id}"
                obj_data = device_data.get(obj_key)
                if isinstance(obj_data, dict):
                    self._source_obj.update(obj_data)
        return self._source_obj.present_value

    @staticmethod
    def _as_float(value: Any) -> float | None:
        """Return value as float when possible."""
        try:
            return float(str(value).strip().strip('\"\'').replace(",", "."))
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _normalize_text(value: Any) -> str:
        """Normalize BACnet text values for user condition matching."""
        return str(value).strip().strip('\"\'').lower()

    @classmethod
    def _equal(cls, left: Any, right: Any) -> bool:
        """Compare BACnet values in a type-tolerant way."""
        if left is None or right is None:
            return left is right
        left_num = cls._as_float(left)
        right_num = cls._as_float(right)
        if left_num is not None and right_num is not None:
            return left_num == right_num
        return cls._normalize_text(left) == cls._normalize_text(right)

    @classmethod
    def _safe_eval_expression(cls, value: Any, expression: str) -> bool | None:
        """Safely evaluate an advanced condition expression.

        Supported examples:
        - value > 10 && value < 20
        - value == 2 || value == 5
        - (value & 4096) != 0
        - ((value - 1) & 4) != 0

        This deliberately does not use eval(). Only a small AST subset with the
        variable ``value`` and numeric/string constants is accepted.
        """
        source_value_num = cls._as_float(value)
        source_value = source_value_num if source_value_num is not None else cls._normalize_text(value)
        expr = expression.replace("&&", " and ").replace("||", " or ")

        try:
            tree = ast.parse(expr, mode="eval")
        except SyntaxError:
            return None

        binary_ops = {
            ast.Add: operator.add,
            ast.Sub: operator.sub,
            ast.Mult: operator.mul,
            ast.Div: operator.truediv,
            ast.Mod: operator.mod,
            ast.BitAnd: lambda a, b: int(a) & int(b),
            ast.BitOr: lambda a, b: int(a) | int(b),
            ast.BitXor: lambda a, b: int(a) ^ int(b),
        }
        compare_ops = {
            ast.Eq: operator.eq,
            ast.NotEq: operator.ne,
            ast.Gt: operator.gt,
            ast.GtE: operator.ge,
            ast.Lt: operator.lt,
            ast.LtE: operator.le,
        }

        def resolve(node: ast.AST) -> Any:
            if isinstance(node, ast.Expression):
                return resolve(node.body)
            if isinstance(node, ast.Name):
                if node.id != "value":
                    raise ValueError("only 'value' is allowed")
                return source_value
            if isinstance(node, ast.Constant):
                if isinstance(node.value, (int, float, str, bool)) or node.value is None:
                    return node.value
                raise ValueError("unsupported constant")
            if isinstance(node, ast.UnaryOp):
                operand = resolve(node.operand)
                if isinstance(node.op, ast.USub):
                    return -float(operand)
                if isinstance(node.op, ast.UAdd):
                    return +float(operand)
                if isinstance(node.op, ast.Not):
                    return not bool(operand)
                if isinstance(node.op, ast.Invert):
                    return ~int(operand)
                raise ValueError("unsupported unary operator")
            if isinstance(node, ast.BoolOp):
                values = [bool(resolve(v)) for v in node.values]
                if isinstance(node.op, ast.And):
                    return all(values)
                if isinstance(node.op, ast.Or):
                    return any(values)
                raise ValueError("unsupported boolean operator")
            if isinstance(node, ast.BinOp):
                op_func = binary_ops.get(type(node.op))
                if op_func is None:
                    raise ValueError("unsupported binary operator")
                return op_func(resolve(node.left), resolve(node.right))
            if isinstance(node, ast.Compare):
                left = resolve(node.left)
                for op, comparator in zip(node.ops, node.comparators, strict=True):
                    right = resolve(comparator)
                    op_func = compare_ops.get(type(op))
                    if op_func is None:
                        raise ValueError("unsupported comparison operator")
                    if not op_func(left, right):
                        return False
                    left = right
                return True
            raise ValueError("unsupported expression")

        try:
            return bool(resolve(tree))
        except Exception:
            return None

    @classmethod
    def _matches_condition(cls, value: Any, condition: Any) -> bool:
        """Evaluate a simple user-defined ON/OFF condition.

        Supported examples:
        - 2: value equals 2
        - >1, >=2, <5, <=10, !=0
        - 1,2,5 or active,alarm: value equals one of the listed values
        - 2-5: numeric range, inclusive
        - active / inactive: text matching, quotes are ignored
        """
        if condition in (None, ""):
            return False

        expr = str(condition).strip()
        if not expr:
            return False

        # Advanced expression mode. Use only when the user explicitly references
        # the variable name or boolean/bit operators; simple rules remain fast and
        # easy to read.
        if "value" in expr or "&&" in expr or "||" in expr:
            advanced = cls._safe_eval_expression(value, expr)
            if advanced is not None:
                return advanced

        # OR-list: 1,2,5 / >1,<=5 / active,alarm
        if "," in expr:
            return any(cls._matches_condition(value, part.strip()) for part in expr.split(",") if part.strip())

        value_num = cls._as_float(value)
        expr_num = cls._as_float(expr)

        for op in (">=", "<=", "!=", "==", ">", "<"):
            if expr.startswith(op):
                rhs = expr[len(op):].strip()
                rhs_num = cls._as_float(rhs)
                if value_num is not None and rhs_num is not None:
                    if op == ">=":
                        return value_num >= rhs_num
                    if op == "<=":
                        return value_num <= rhs_num
                    if op == "!=":
                        return value_num != rhs_num
                    if op == "==":
                        return value_num == rhs_num
                    if op == ">":
                        return value_num > rhs_num
                    if op == "<":
                        return value_num < rhs_num
                if op == "!=":
                    return not cls._equal(value, rhs)
                if op == "==":
                    return cls._equal(value, rhs)
                return False

        # Inclusive numeric range: 2-5. Negative single numbers like -1 still work as equality.
        if "-" in expr[1:]:
            left, right = expr.split("-", 1)
            left_num = cls._as_float(left.strip())
            right_num = cls._as_float(right.strip())
            if value_num is not None and left_num is not None and right_num is not None:
                low, high = sorted((left_num, right_num))
                return low <= value_num <= high

        # Plain value means equality.
        if value_num is not None and expr_num is not None:
            return value_num == expr_num
        return cls._equal(value, expr)

    def _rule_result(self) -> bool | None:
        """Return rule result for the current source value."""
        value = self._source_value()
        if value is None:
            return None

        on_value = self._config.get("on_value")
        off_value = self._config.get("off_value")
        else_state = str(self._config.get("else_state") or "unavailable").strip().lower()

        if on_value not in (None, "") and self._matches_condition(value, on_value):
            return True
        if off_value not in (None, "") and self._matches_condition(value, off_value):
            return False

        # Backward-compatible behavior: old configs with only ON condition default to OFF.
        if off_value in (None, "") and "else_state" not in self._config and on_value not in (None, ""):
            return False

        if else_state in {"off", "aus", "false", "0"}:
            return False
        return None

    @property
    def is_on(self) -> bool | None:
        """Return True if the virtual binary sensor is on."""
        return self._rule_result()

    @property
    def available(self) -> bool:
        """Return whether the entity is available."""
        if not self.coordinator.last_update_success:
            return False
        else_state = str(self._config.get("else_state") or "unavailable").strip().lower()
        if else_state in {"unavailable", "nicht verfügbar", "nicht_verfügbar"}:
            return self._rule_result() is not None
        return True
