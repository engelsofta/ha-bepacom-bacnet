"""Registry lookup regressions, runnable without Home Assistant installed.

Run: python -m unittest discover -s tests -p test_panel_lookup.py
"""

from __future__ import annotations

import ast
from pathlib import Path
from types import SimpleNamespace
import unittest


class PanelLookupTests(unittest.TestCase):
    def setUp(self):
        source = Path(__file__).parents[1] / "panel.py"
        tree = ast.parse(source.read_text(encoding="utf-8"))
        names = {"_entity_registry_entry", "_entity_registry_entries_by_unique_id"}
        functions = [
            node for node in tree.body
            if isinstance(node, ast.FunctionDef) and node.name in names
        ]
        # Execute the actual lookup functions with a minimal HA registry double.
        self.registry = SimpleNamespace(entities={})
        self.scans = 0

        def async_get(hass):
            self.scans += 1
            return self.registry

        scope = {
            "callback": lambda func: func,
            "er": SimpleNamespace(async_get=async_get),
            "DOMAIN": "bepacom",
        }
        module = ast.Module(body=functions, type_ignores=[])
        exec(compile(module, str(source), "exec", dont_inherit=False), scope)
        self.lookup = scope["_entity_registry_entry"]
        self.index = scope["_entity_registry_entries_by_unique_id"]

    def entity(self, entity_id, unique_id="point", entry="entry", platform="bepacom"):
        entity = SimpleNamespace(
            entity_id=entity_id, unique_id=unique_id,
            config_entry_id=entry, platform=platform,
        )
        self.registry.entities[entity_id] = entity
        return entity

    def test_bulk_lookup_scans_registry_once(self):
        expected = self.entity("sensor.point")
        index = self.index(None, "entry")
        for _ in range(2000):
            self.assertIs(self.lookup(None, "entry", "point", "sensor", index), expected)
        self.assertEqual(self.scans, 1)

    def test_missing_indexed_entity_does_not_rescan(self):
        self.assertIsNone(self.lookup(None, "entry", "missing", "sensor", {}))
        self.assertEqual(self.scans, 0)

    def test_domain_migration_retains_matching_entity(self):
        expected = self.entity("light.point")
        self.entity("switch.point")
        index = self.index(None, "entry")
        self.assertIs(self.lookup(None, "entry", "point", "light", index), expected)
        self.assertEqual(self.scans, 2)

    def test_index_excludes_other_integrations_and_config_entries(self):
        self.entity("sensor.other_entry", "other", entry="other")
        self.entity("sensor.other_platform", "foreign", platform="other")
        expected = self.entity("sensor.point")
        index = self.index(None, "entry")
        self.assertEqual(index, {"point": expected})

    def test_individual_lookup_still_works_without_index(self):
        expected = self.entity("sensor.point")
        self.assertIs(self.lookup(None, "entry", "point", "sensor"), expected)


if __name__ == "__main__":
    unittest.main()
