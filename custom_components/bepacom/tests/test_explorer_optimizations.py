"""Explorer search/delta regression tests without a running HA installation.

Run: python -m unittest discover -s tests -p test_explorer_optimizations.py
"""

from __future__ import annotations

import ast
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock


ROOT = Path(__file__).parents[1]
spec = importlib.util.spec_from_file_location("explorer_helpers", ROOT / "panel_helpers.py")
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)


def obj(uid, device="1", kind="analogInput", object_id="1", name="Temperature"):
    return SimpleNamespace(
        unique_id=uid, device_id=device, object_type=kind, object_id=object_id,
        object_name=name, description="Room", present_value=20, units="degreesCelsius",
        subscribe=False, effective_writable=True, writable=True,
    )


def normalize(kind):
    return {"multiStateInput": "multi_state_input", "multiStateOutput": "multi_state_output"}.get(kind, kind)


def run(coroutine):
    """Drive handlers whose only awaited operation is an immediate AsyncMock."""
    try:
        coroutine.send(None)
    except StopIteration as result:
        return result.value
    finally:
        coroutine.close()
    raise AssertionError("Unexpected real I/O in a unit test")


class ExplorerOptimizationsTests(unittest.TestCase):
    def setUp(self):
        self.objects = {"a": obj("a"), "b": obj("b", object_id="2", name="Heating")}
        self.overrides = {}
        self.runtime = {}
        self.registry = SimpleNamespace(
            objects=self.objects,
            all=lambda **kwargs: iter(self.objects.values()),
            get_by_unique_id=self.objects.get,
            object_key=lambda point: f"{point.object_type}:{point.object_id}",
            runtime=self.get_runtime,
            overrides=SimpleNamespace(
                get_override=lambda point: self.overrides.get(point.unique_id, {}),
                get_multistate_representation=lambda point: self.overrides.get(point.unique_id, {}).get("multistate_representation", "number"),
                get_unit_of_measurement=lambda point: self.overrides.get(point.unique_id, {}).get("unit", "°C"),
                get_device_class=lambda point: self.overrides.get(point.unique_id, {}).get("device_class", "temperature"),
                get_state_class=lambda point: "measurement",
                get_update_mode=lambda point, default: self.overrides.get(point.unique_id, {}).get("update_mode", default),
                multistate_feedback_consumer_unique_ids=lambda uid: [],
                get_virtual_binary=lambda point: None,
                get_virtual_entities=lambda point: [],
                is_enabled=lambda point: True,
            ),
        )
        self.status = {}
        self.coordinator = SimpleNamespace(
            point_registry=self.registry,
            async_gateway_target_status=AsyncMock(return_value=self.status),
            gateway_target_status_for=lambda point, statuses: statuses.get(point.unique_id),
        )
        self.hass = SimpleNamespace()
        self.entities = {}
        self.result = None
        self.connection = SimpleNamespace(send_result=self.send_result)
        scope = {
            "callback": lambda func: func,
            "ExplorerSearchIndex": helpers.ExplorerSearchIndex,
            "feedback_candidates_by_device": helpers.feedback_candidates_by_device,
            "runtime_version": helpers.runtime_version,
            "_effective_transport": helpers.effective_transport,
            "BacnetObjectTypeMapper": SimpleNamespace(
                _normalize_object_type=normalize,
                get_entity_type=lambda point: SimpleNamespace(value="sensor"),
            ),
            "_entity_registry_entry": lambda hass, entry, uid, domain, entries: (entries or self.entities).get(uid),
            "_entity_registry_entries_by_unique_id": lambda hass, entry: self.entities,
            "_linked_virtual_entities": lambda *args: [],
            "_point_assistant_suggestion": lambda point: None,
            "_entry_data": lambda hass, entry: ("entry", {"coordinator": self.coordinator}),
            "_explorer_diagnostics": lambda *args: {},
        }
        names = {
            "_override_display_value", "_point_entity_entry", "_search_point", "_serialize_point",
            "_serialize_point_runtime", "websocket_explorer_points", "websocket_explorer_points_runtime",
        }
        nodes = [node for node in ast.parse((ROOT / "panel.py").read_text(encoding="utf-8")).body
                 if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names]
        for node in nodes:
            node.decorator_list = []
        exec(compile(ast.Module(body=nodes, type_ignores=[]), "panel.py", "exec"), scope)
        self.scope = scope

    def get_runtime(self, point):
        return self.runtime.setdefault(point.unique_id, SimpleNamespace(
            subscribed=False, fallback_polling=False, last_update=None, last_update_source=None,
            push_updates=0, polling_updates=0, value_changes=0, suppressed_updates=0,
        ))

    def send_result(self, message_id, result):
        self.result = result

    def search(self, **filters):
        message = dict(id=1, include_disabled=True, limit=2000, **filters)
        run(self.scope["websocket_explorer_points"](self.hass, self.connection, message))
        return self.result

    def poll(self, known=None):
        message = dict(id=1, unique_ids=list(self.objects))
        if known is not None:
            message["known_versions"] = known
        run(self.scope["websocket_explorer_points_runtime"](self.hass, self.connection, message))
        return self.result["points"]

    def test_search_document_matches_every_original_search_field(self):
        self.entities["a"] = SimpleNamespace(entity_id="sensor.room", name="Room HA", original_name="BACnet Room")
        point = self.objects["a"]
        document = self.scope["_search_point"](point, self.registry, self.hass, "entry", self.entities)
        full = self.scope["_serialize_point"](point, self.registry, self.hass, "entry", self.entities)
        for field in helpers.SEARCH_FIELDS:
            with self.subTest(field=field):
                self.assertEqual(document[field], full[field])

    def test_search_serializes_only_matches_up_to_limit(self):
        original = self.scope["_serialize_point"]
        calls = []
        def serialize(point, *args):
            calls.append(point.unique_id)
            return original(point, *args)
        self.scope["_serialize_point"] = serialize
        result = self.search(search="heat*")
        self.assertEqual(calls, ["b"])
        self.assertEqual(result["total"], 1)
        calls.clear()
        run(self.scope["websocket_explorer_points"](
            self.hass, self.connection, dict(id=1, include_disabled=True, limit=1)))
        self.assertEqual(calls, ["a"])
        self.assertEqual(self.result["total"], 2)
        self.assertTrue(self.result["limited"])

    def test_no_matches_does_not_wait_for_gateway_status(self):
        self.assertEqual(self.search(search="no-match")["points"], [])
        self.coordinator.async_gateway_target_status.assert_not_awaited()

    def test_large_search_only_builds_one_editor_payload(self):
        self.objects.clear()
        self.objects.update({str(i): obj(str(i), object_id=str(i), name=f"Point-{i}") for i in range(1000)})
        calls = []
        original = self.scope["_serialize_point"]
        def serialize(point, *args):
            calls.append(point.unique_id)
            return original(point, *args)
        self.scope["_serialize_point"] = serialize
        result = self.search(search="Point-999")
        self.assertEqual(result["total"], 1)
        self.assertEqual(calls, ["999"])

    def test_disabled_feedback_is_available_even_when_disabled_points_are_hidden(self):
        self.objects["out"] = obj("out", kind="multiStateOutput")
        self.objects["disabled"] = obj("disabled", kind="multiStateInput")
        self.registry.all = lambda **kwargs: (
            point for point in self.objects.values()
            if kwargs["include_disabled"] or point.unique_id != "disabled"
        )
        run(self.scope["websocket_explorer_points"](self.hass, self.connection, {
            "id": 1, "include_disabled": False, "limit": 2000, "object_type": "multiStateOutput",
        }))
        self.assertEqual(self.result["points"][0]["multistate_feedback_candidates"][0]["unique_id"], "disabled")

    def test_search_index_tracks_values_overrides_and_ha_renames(self):
        self.assertEqual(self.search(search="12345")["total"], 0)
        index = self.registry._explorer_search_index
        self.objects["a"].present_value = 12345
        self.assertEqual(self.search(search="12345")["total"], 1)
        self.overrides["a"] = {"entity_name": "NewName"}
        self.assertEqual(self.search(search="NewName")["total"], 1)
        self.entities["a"] = SimpleNamespace(entity_id="sensor.a", name="Renamed", original_name="Original")
        self.assertEqual(self.search(search="Renamed")["total"], 1)
        self.assertIs(self.registry._explorer_search_index, index)
        del self.objects["b"]
        self.search()
        self.assertNotIn("b", index._documents)

    def test_filters_and_wildcards_keep_their_semantics(self):
        self.overrides["b"] = {"update_mode": "subscribe"}
        self.assertEqual(self.search(search="hea?ing 2", only_subscribe=True)["total"], 1)
        self.assertEqual(self.search(object_type="binaryOutput")["total"], 0)
        self.assertEqual(self.search(only_overrides=True)["total"], 1)

    def test_feedback_candidates_are_built_once_and_stay_on_their_device(self):
        self.objects.update({
            "out1": obj("out1", kind="multiStateOutput"),
            "out2": obj("out2", kind="multiStateOutput", object_id="2"),
            "in1": obj("in1", kind="multiStateInput"),
            "foreign": obj("foreign", device="2", kind="multiStateInput"),
        })
        original = self.scope["feedback_candidates_by_device"]
        calls = []
        def candidates(*args):
            calls.append(1)
            return original(*args)
        self.scope["feedback_candidates_by_device"] = candidates
        points = self.search(object_type="multiStateOutput")["points"]
        self.assertEqual(len(calls), 1)
        self.assertEqual(len(points), 2)
        self.assertEqual([point["multistate_feedback_candidates"][0]["unique_id"] for point in points], ["in1", "in1"])
        self.assertTrue(points[0]["multistate_feedback_candidates"][0]["same_object_id"])
        self.assertFalse(points[1]["multistate_feedback_candidates"][0]["same_object_id"])

    def test_poll_returns_only_changed_points_and_keeps_legacy_full_snapshot(self):
        initial = self.poll()
        versions = {point["unique_id"]: point["runtime_version"] for point in initial}
        self.assertEqual(self.poll(versions), [])
        self.objects["b"].present_value = 42
        changed = self.poll(versions)
        self.assertEqual([point["unique_id"] for point in changed], ["b"])
        versions["b"] = changed[0]["runtime_version"]
        self.assertEqual(self.poll(versions), [])
        self.assertEqual(len(self.poll()), 2)

    def test_transport_changes_are_sent_even_when_value_does_not_change(self):
        versions = {point["unique_id"]: point["runtime_version"] for point in self.poll()}
        self.status["a"] = {"state": "polling_error", "last_error": "Gateway offline"}
        self.assertEqual([point["unique_id"] for point in self.poll(versions)], ["a"])

    def test_counters_are_changes_but_elapsed_age_alone_is_not(self):
        first = {"unique_id": "a", "present_value": 1, "effective_value_age": 5}
        self.assertEqual(helpers.runtime_version(first), helpers.runtime_version({**first, "effective_value_age": 10}))
        self.assertNotEqual(helpers.runtime_version(first), helpers.runtime_version({**first, "push_updates": 1}))


if __name__ == "__main__":
    unittest.main()
