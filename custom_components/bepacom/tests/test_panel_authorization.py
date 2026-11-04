"""Authorization regression coverage for every registered Explorer command."""
from __future__ import annotations

import ast
import asyncio
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import Mock

SOURCE = Path(__file__).parents[1] / "panel.py"


class ExplorerAuthorizationTests(unittest.TestCase):
    def test_all_registered_commands_require_admin_before_scheduling(self):
        tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
        register = next(n for n in tree.body if isinstance(n, ast.AsyncFunctionDef)
                        and n.name == "async_register_explorer_panel")
        names = {n.args[1].id for n in ast.walk(register)
                 if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
                 and n.func.attr == "async_register_command"}
        self.assertEqual(len(names), 12)
        for node in tree.body:
            if isinstance(node, ast.AsyncFunctionDef) and node.name in names:
                with self.subTest(command=node.name):
                    decorators = [ast.unparse(d) for d in node.decorator_list]
                    self.assertEqual(decorators[-2:], ["websocket_api.require_admin",
                                                       "websocket_api.async_response"])

    def test_real_home_assistant_authorization(self):
        try:
            from homeassistant.components import websocket_api
            from homeassistant.exceptions import Unauthorized
        except ImportError:
            self.skipTest("Home Assistant is required; exercised by repository CI")
        tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
        for node in tree.body:
            if not isinstance(node, ast.AsyncFunctionDef) or not node.name.startswith("websocket_explorer_"):
                continue
            with self.subTest(command=node.name):
                # Exercise the actual decorators and their order without device access.
                node.body = [ast.Pass()]
                node.decorator_list = node.decorator_list[-2:]
                scope = {"websocket_api": websocket_api}
                exec(compile(ast.fix_missing_locations(ast.Module(body=[node], type_ignores=[])),
                             str(SOURCE), "exec", flags=__future_annotations), scope)
                handler = scope[node.name]
                hass = SimpleNamespace(async_create_background_task=Mock())
                for user in (None, SimpleNamespace(is_admin=False)):
                    with self.assertRaises(Unauthorized):
                        handler(hass, SimpleNamespace(user=user), {"id": 1})
                hass.async_create_background_task.assert_not_called()
                handler(hass, SimpleNamespace(user=SimpleNamespace(is_admin=True)), {"id": 1})
                hass.async_create_background_task.assert_called_once()
                asyncio.run(hass.async_create_background_task.call_args.args[0])


import __future__
__future_annotations = __future__.annotations.compiler_flag

if __name__ == "__main__":
    unittest.main()
