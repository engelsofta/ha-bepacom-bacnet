"""Central BACnet point registry for the Bepacom integration."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from collections import deque
from typing import Any, Iterable

from .entity_factory import BacnetObjectTypeMapper
from .models import BacnetDevice, BacnetObject
from .override_manager import BepacomOverrideManager


@dataclass(slots=True)
class PointRuntimeState:
    """Runtime metadata for one BACnet point."""

    last_update: datetime | None = None
    last_update_source: str | None = None
    subscribed: bool | None = None
    fallback_polling: bool = False
    history: deque[dict[str, Any]] = field(default_factory=lambda: deque(maxlen=100))
    push_updates: int = 0
    polling_updates: int = 0
    value_changes: int = 0
    suppressed_updates: int = 0
    revision: int = 0
    has_value: bool = False
    last_value: Any = None




def _comparable_value(value: Any) -> Any:
    """Return a stable comparable representation for BACnet values.

    BACnet notifications may deliver the same logical value as int, float or
    string depending on the source path.  The live history must not treat
    "58", 58 and 58.0 as different value changes.
    """
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return round(float(value), 10)
    text = str(value).strip()
    if text == "":
        return ""
    try:
        return round(float(text), 10)
    except (TypeError, ValueError):
        return text


def _values_equal(left: Any, right: Any) -> bool:
    """Compare BACnet values by logical value instead of transport type."""
    return _comparable_value(left) == _comparable_value(right)


class BepacomPointRegistry:
    """Single source of truth for discovered BACnet points.

    Discovery still owns the raw inventory, but all platforms and future UI code
    should read points through this registry.  It combines BACnet metadata,
    user overrides and runtime state in one place.
    """

    def __init__(self, options: dict[str, Any] | None = None) -> None:
        self._options = options or {}
        self._overrides = BepacomOverrideManager(self._options)
        self.devices: dict[str, BacnetDevice] = {}
        self.objects: dict[str, BacnetObject] = {}
        self._by_path: dict[tuple[str, str], BacnetObject] = {}
        self._runtime: dict[str, PointRuntimeState] = {}
        self._change_history: deque[dict[str, Any]] = deque(maxlen=10_000)
        self._change_sequence = 0

    def _record_change(
        self,
        obj: BacnetObject,
        previous_value: Any,
        value: Any,
        source: str,
        timestamp: datetime,
    ) -> None:
        """Store one real value change for the compact live monitor."""
        self._change_sequence += 1
        self._change_history.append(
            {
                "sequence": self._change_sequence,
                "ts": timestamp.isoformat(),
                "unique_id": obj.unique_id,
                "device_id": str(obj.device_id),
                "object_type": obj.object_type,
                "object_id": str(obj.object_id),
                "object_key": self.object_key(obj),
                "object_name": obj.object_name,
                "previous_value": previous_value,
                "value": value,
                "source": source or "unknown",
            }
        )

    def changes_since(self, sequence: int = 0, *, limit: int = 1000) -> dict[str, Any]:
        """Return global value changes after a monotonically increasing cursor."""
        safe_limit = max(1, min(int(limit), 10_000))
        changes = [
            item for item in self._change_history if int(item["sequence"]) > int(sequence)
        ][:safe_limit]
        oldest_sequence = (
            int(self._change_history[0]["sequence"]) if self._change_history else self._change_sequence
        )
        return {
            "changes": changes,
            "latest_sequence": self._change_sequence,
            "oldest_sequence": oldest_sequence,
            "retained": len(self._change_history),
        }

    def refresh_options(self, options: dict[str, Any] | None) -> None:
        """Refresh option backed helpers after options changed."""
        self._options = options or {}
        self._overrides = BepacomOverrideManager(self._options)

    @property
    def overrides(self) -> BepacomOverrideManager:
        """Return the active override manager."""
        return self._overrides

    def load_discovery(
        self,
        devices: dict[str, BacnetDevice],
        objects: dict[str, BacnetObject],
    ) -> None:
        """Load the latest discovery result into the registry."""
        self.devices = devices
        self.objects = objects
        self._by_path = {}

        for obj in objects.values():
            object_key = self.object_key(obj)
            self._by_path[(str(obj.device_id), object_key)] = obj
            runtime = self._runtime.setdefault(obj.unique_id, PointRuntimeState())
            self.apply_overrides(obj)

            now = datetime.now(UTC)

            # Discovery/full database refresh provides the initial/current value,
            # but it is not counted as per-object polling unless an explicit
            # polling update path calls update_point(..., source="poll").
            value_changed = (not runtime.has_value) or not _values_equal(runtime.last_value, obj.present_value)
            if runtime.has_value and not value_changed:
                runtime.suppressed_updates += 1
            if value_changed:
                previous_value = runtime.last_value if runtime.has_value else None
                runtime.revision += 1
                runtime.last_update = now
                runtime.last_update_source = "poll"
                if runtime.has_value:
                    runtime.value_changes += 1
                newest = runtime.history[-1] if runtime.history else None
                if newest is None or not _values_equal(newest.get("value"), obj.present_value):
                    runtime.history.append(
                        {
                            "ts": now.isoformat(),
                            "value": obj.present_value,
                            "source": "poll",
                        }
                    )
                runtime.has_value = True
                runtime.last_value = obj.present_value
                if previous_value is not None:
                    self._record_change(obj, previous_value, obj.present_value, "poll", now)

    def all(self, *, include_disabled: bool = False) -> Iterable[BacnetObject]:
        """Iterate over all points, optionally including disabled ones."""
        for obj in self.objects.values():
            if include_disabled or self._overrides.is_enabled(obj):
                yield obj

    def get_by_unique_id(self, unique_id: str) -> BacnetObject | None:
        """Return a point by unique id."""
        return self.objects.get(unique_id)

    def get_by_path(self, device_id: str, object_key: str) -> BacnetObject | None:
        """Return a point by device id and BACnet object key."""
        return self._by_path.get((str(device_id), object_key))

    def apply_overrides(self, obj: BacnetObject) -> BacnetObject:
        """Copy user override values onto the point model for UI/debugging."""
        override = self._overrides.get_override(obj)

        obj.override_unit = override.get("unit", override.get("unit_of_measurement"))
        obj.override_device_class = override.get("device_class")
        obj.override_state_class = override.get("state_class")
        obj.subscribe = self._overrides.use_subscribe(obj)
        obj.enabled = self._overrides.is_enabled(obj)

        scan_interval = override.get("scan_interval")
        try:
            obj.scan_interval = int(scan_interval) if scan_interval not in (None, "") else None
        except (TypeError, ValueError):
            obj.scan_interval = None

        return obj

    def update_point(
        self,
        device_id: str,
        object_key: str,
        payload: dict[str, Any],
        *,
        source: str = "unknown",
    ) -> bool:
        """Update one point and runtime metadata."""
        obj = self.get_by_path(device_id, object_key)
        if obj is None:
            return False

        obj.update(payload)
        self.apply_overrides(obj)
        runtime = self._runtime.setdefault(obj.unique_id, PointRuntimeState())
        previous_value = runtime.last_value if runtime.has_value else obj.present_value
        now = datetime.now(UTC)
        runtime.last_update = now
        runtime.last_update_source = source

        normalized_source = (source or "unknown").lower()
        if normalized_source == "push":
            runtime.push_updates += 1
        elif normalized_source in {"poll", "polling"}:
            runtime.polling_updates += 1

        value_changed = (not runtime.has_value) or not _values_equal(obj.present_value, previous_value)
        if value_changed:
            had_previous = runtime.has_value
            runtime.revision += 1
            # As a final safety net, compare against the newest persisted
            # history entry as well. This prevents duplicate visible history
            # rows if a backend reload or mixed push/poll source already stored
            # the same logical value.
            newest = runtime.history[-1] if runtime.history else None
            if newest is None or not _values_equal(newest.get("value"), obj.present_value):
                if runtime.has_value:
                    runtime.value_changes += 1
                runtime.history.append(
                    {
                        "ts": now.isoformat(),
                        "value": obj.present_value,
                        "source": source,
                    }
                )
            runtime.has_value = True
            runtime.last_value = obj.present_value
            if had_previous:
                self._record_change(
                    obj,
                    previous_value,
                    obj.present_value,
                    source,
                    now,
                )
        else:
            runtime.suppressed_updates += 1
            # Keep the canonical last value aligned after the first ever update,
            # even if the payload represents the same logical value.
            if not runtime.has_value:
                runtime.has_value = True
                runtime.last_value = obj.present_value
        return value_changed

    def mark_subscription(
        self,
        device_id: str,
        object_key: str,
        subscribed: bool,
    ) -> None:
        """Record whether a point has an active gateway subscription."""
        obj = self.get_by_path(device_id, object_key)
        if obj is None:
            return
        self._runtime.setdefault(obj.unique_id, PointRuntimeState()).subscribed = subscribed

    def mark_fallback_polling(
        self,
        device_id: str,
        object_key: str,
        enabled: bool,
    ) -> None:
        """Record fallback polling state for a point."""
        obj = self.get_by_path(device_id, object_key)
        if obj is None:
            return
        self._runtime.setdefault(obj.unique_id, PointRuntimeState()).fallback_polling = enabled

    def runtime(self, obj: BacnetObject) -> PointRuntimeState:
        """Return runtime state for a point."""
        return self._runtime.setdefault(obj.unique_id, PointRuntimeState())

    def revision(self, obj: BacnetObject) -> int:
        """Return the value revision used to suppress unrelated HA writes."""
        return self.runtime(obj).revision

    def history(self, obj: BacnetObject, *, limit: int = 120) -> list[dict[str, Any]]:
        """Return recent value history for a point."""
        runtime = self.runtime(obj)
        items = list(runtime.history)
        if limit > 0:
            items = items[-limit:]
        return items

    def performance_summary(self) -> dict[str, Any]:
        """Return basic registry performance and status counters."""
        objects = list(self.objects.values())
        runtimes = [self.runtime(obj) for obj in objects]
        update_modes = {obj.unique_id: self._overrides.get_update_mode(obj) for obj in objects}
        configured_push = sum(1 for mode in update_modes.values() if mode == "subscribe")
        configured_polling = sum(1 for mode in update_modes.values() if mode == "polling")
        configured_disabled = sum(1 for mode in update_modes.values() if mode == "disabled")
        return {
            # Configured values from the user's BACnet Explorer settings.
            "objects": len(objects),
            "enabled": sum(1 for obj in objects if self._overrides.is_enabled(obj)),
            "disabled": sum(1 for obj in objects if not self._overrides.is_enabled(obj)),
            "configured_push": configured_push,
            "configured_polling": configured_polling,
            "configured_disabled": configured_disabled,
            "overrides": sum(1 for obj in objects if self._overrides.get_override(obj)),
            "subscribe_overrides": sum(1 for obj in objects if self._overrides.get_override(obj).get("subscribe") is not None),
            # Runtime/system values measured while the integration is running.
            "subscribed": sum(1 for state in runtimes if state.subscribed is True),
            "fallback_polling": sum(1 for state in runtimes if state.fallback_polling),
            "updated_points": sum(1 for state in runtimes if state.last_update is not None),
            "push_updates": sum(state.push_updates for state in runtimes),
            "processed_push_updates": sum(state.push_updates for state in runtimes),
            "polling_updates": sum(state.polling_updates for state in runtimes),
            "processed_polling_updates": sum(state.polling_updates for state in runtimes),
            "value_changes": sum(state.value_changes for state in runtimes),
            "suppressed_updates": sum(state.suppressed_updates for state in runtimes),
        }

    @staticmethod
    def entity_attributes(obj: BacnetObject) -> dict[str, Any]:
        """Return small, stable attributes for Home Assistant state entities.

        Runtime counters, raw BACnet payloads and override diagnostics belong
        to the Explorer inspector. Keeping them off HA states avoids emitting
        state_changed events merely because diagnostic metadata changed.
        """
        attrs: dict[str, Any] = {
            "bacnet_device_id": obj.device_id,
            "bacnet_object_type": obj.object_type,
            "bacnet_object_instance": obj.object_id,
            "writable": obj.writable,
        }
        if obj.description:
            attrs["description"] = obj.description
        return attrs

    def inspector_attributes(self, obj: BacnetObject) -> dict[str, Any]:
        """Return a compact BACnet Point Inspector attribute set."""
        runtime = self.runtime(obj)
        override = self._overrides.get_override(obj)
        public_override = self._public_override(override)
        ha_unit = self._overrides.get_unit_of_measurement(obj)
        ha_device_class = self._overrides.get_device_class(obj)
        ha_state_class = self._overrides.get_state_class(obj)

        attrs: dict[str, Any] = {
            "bacnet_device_id": obj.device_id,
            "bacnet_object_key": self.object_key(obj),
            "bacnet_object_type": obj.object_type,
            "bacnet_object_instance": obj.object_id,
            "bacnet_object_name": obj.object_name,
            "bacnet_description": obj.description,
            "bacnet_present_value": obj.present_value,
            "bacnet_unit": obj.units,
            "ha_unit": ha_unit,
            "ha_device_class": str(ha_device_class) if ha_device_class is not None else None,
            "ha_state_class": str(ha_state_class) if ha_state_class is not None else None,
            "override_active": bool(override),
            "override": public_override or None,
            "enabled": self._overrides.is_enabled(obj),
            "subscribe_override": obj.subscribe,
            "subscribed": runtime.subscribed,
            "fallback_polling": runtime.fallback_polling,
            "writable": obj.writable,
            "resolution": obj.resolution,
            "reliability": obj.reliability,
            "status_flags": obj.status_flags,
            "out_of_service": obj.out_of_service,
            "cov_increment": obj.cov_increment,
            "last_update_source": runtime.last_update_source,
            "last_update": runtime.last_update.isoformat() if runtime.last_update else None,
            "raw": obj.raw or None,
            "history_count": len(runtime.history),
            "push_updates": runtime.push_updates,
            "polling_updates": runtime.polling_updates,
            "value_changes": runtime.value_changes,
            "suppressed_updates": runtime.suppressed_updates,
        }

        return {key: value for key, value in attrs.items() if value is not None}

    @staticmethod
    def _public_override(override: dict[str, Any]) -> dict[str, Any]:
        """Return override diagnostics without leaking internal tri-state markers."""
        public: dict[str, Any] = {}
        for key, value in override.items():
            if isinstance(value, str):
                normalized = value.strip().lower()
                if normalized == "__none__":
                    public[key] = "none"
                    continue
                if normalized == "__auto__":
                    public[key] = "auto"
                    continue
            public[key] = value
        return public

    def option_map(self) -> dict[str, str]:
        """Return selectable BACnet object labels for options flows."""
        options_with_order: list[tuple[tuple[str, int, str, str], str, str]] = []

        for obj in self.objects.values():
            object_key = self.object_key(obj)
            object_type = obj.object_type.lower()
            object_name = obj.object_name.strip() if obj.object_name else "-"
            object_instance = self._object_instance(object_key)
            override_marker = " *" if self._overrides.get_override(obj) else ""

            label = (
                f"[{object_type}] {obj.device_id}/{object_key}"
                f" | Name: {object_name}{override_marker}"
            )
            option_key = self.subscription_option_key(obj.device_id, object_key)
            sort_key = (object_type, object_instance, object_name.lower(), str(obj.device_id))
            options_with_order.append((sort_key, option_key, label))

        return {
            option_key: label
            for _, option_key, label in sorted(options_with_order, key=lambda item: item[0])
        }

    @staticmethod
    def object_key(obj: BacnetObject) -> str:
        """Return BACnet object key, for example analogInput:545."""
        return f"{obj.object_type}:{obj.object_id}"

    @staticmethod
    def subscription_option_key(device_id: str, object_key: str) -> str:
        """Build a stable options key for one BACnet object."""
        return f"{device_id}|{object_key}"

    @staticmethod
    def _object_instance(object_key: str) -> int:
        """Return numeric BACnet object instance for sorting."""
        if ":" not in object_key:
            return 999999999
        _, instance = object_key.split(":", 1)
        try:
            return int(instance)
        except ValueError:
            return 999999999
