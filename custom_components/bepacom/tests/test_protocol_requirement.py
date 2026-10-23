"""Exercise the actual negotiation method without a Home Assistant runtime.

Run with: python -m unittest discover -s tests -p test_protocol_requirement.py
"""
import ast
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock


class UnsupportedGateway(Exception):
    """Isolated equivalent of the integration's gateway error."""


source = ast.parse((Path(__file__).parents[1] / "api.py").read_text(encoding="utf-8"))
method = next(n for n in ast.walk(source)
              if isinstance(n, ast.AsyncFunctionDef) and n.name == "async_validate_stac")
namespace = {"UnsupportedGateway": UnsupportedGateway, "PROTOCOL_VERSION": 2}
exec(compile(ast.Module(body=[method], type_ignores=[]), "api.py", "exec"), namespace)
validate = namespace["async_validate_stac"]


class ProtocolRequirementTests(unittest.IsolatedAsyncioTestCase):
    async def test_only_current_product_and_v2_are_accepted(self):
        for info in [
            {"product": "engelsoft-bacstac", "protocol_versions": [2]},
            {"product": "engelsoft-bacstac", "protocol_version": 2},
        ]:
            client = SimpleNamespace(_get=AsyncMock(return_value=info))
            await validate(client)
            self.assertEqual(client._gateway_info, info)
            client._get.assert_awaited_once_with("/bepacom/info")

    async def test_old_foreign_and_malformed_gateways_never_fall_back(self):
        for info in [None, {}, {"paths": {"/apiv1/managed/targets": {}}},
                     {"product": "other", "protocol_versions": [2]},
                     {"product": "engelsoft-bacstac", "protocol_versions": [1]},
                     {"product": "engelsoft-bacstac", "protocol_versions": None}]:
            client = SimpleNamespace(_get=AsyncMock(return_value=info))
            with self.assertRaises(UnsupportedGateway):
                await validate(client)
            client._get.assert_awaited_once_with("/bepacom/info")

    async def test_unavailable_gateway_keeps_connection_error(self):
        client = SimpleNamespace(_get=AsyncMock(side_effect=ConnectionError("offline")))
        with self.assertRaises(ConnectionError):
            await validate(client)
        client._get.assert_awaited_once_with("/bepacom/info")
