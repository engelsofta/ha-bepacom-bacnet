"""Regression coverage for local gateway setup and retry navigation."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from custom_components.bepacom import config_flow
from custom_components.bepacom.exceptions import CannotConnect, UnsupportedGateway


def make_flow(monkeypatch, validation_error=None, ping=True):
    """Use the actual flow with an isolated gateway client."""
    client = SimpleNamespace(
        async_validate_stac=AsyncMock(side_effect=validation_error),
        async_ping=AsyncMock(return_value=ping),
        async_close=AsyncMock(),
    )
    monkeypatch.setattr(config_flow, "BepacomClient", lambda **kwargs: client)
    monkeypatch.setattr(config_flow, "LOCAL_APP_HOSTS", ("gateway.test",))
    flow = config_flow.BepacomConfigFlow()
    flow.async_set_unique_id = AsyncMock()
    flow._abort_if_unique_id_configured = Mock()
    return flow, client


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("error", "step"),
    [(CannotConnect(), "app_unavailable"), (UnsupportedGateway(), "app_incompatible")],
)
async def test_failure_offers_retry_and_manual_setup(monkeypatch, error, step):
    flow, client = make_flow(monkeypatch, error)
    result = await flow.async_step_automatic()
    assert result["type"] == "menu"
    assert result["step_id"] == step
    assert result["menu_options"] == ["automatic", "manual"]
    client.async_close.assert_awaited_once()


@pytest.mark.asyncio
async def test_retry_can_create_entry_after_gateway_starts(monkeypatch):
    flow, client = make_flow(monkeypatch, CannotConnect())
    assert (await flow.async_step_automatic())["step_id"] == "app_unavailable"
    client.async_validate_stac.side_effect = None
    result = await flow.async_step_automatic()
    assert result["type"] == "create_entry"
    assert result["data"]["host"] == "gateway.test"
    assert client.async_close.await_count == 2


@pytest.mark.asyncio
async def test_retry_clears_previous_incompatibility(monkeypatch):
    flow, client = make_flow(monkeypatch, UnsupportedGateway())
    assert (await flow.async_step_automatic())["step_id"] == "app_incompatible"
    client.async_validate_stac.side_effect = CannotConnect()
    assert (await flow.async_step_automatic())["step_id"] == "app_unavailable"


@pytest.mark.asyncio
async def test_failed_inventory_read_is_unavailable(monkeypatch):
    flow, client = make_flow(monkeypatch, ping=False)
    assert (await flow.async_step_automatic())["step_id"] == "app_unavailable"
    client.async_close.assert_awaited_once()


@pytest.mark.asyncio
async def test_compatible_alias_wins_over_incompatible_alias(monkeypatch):
    flow, client = make_flow(monkeypatch)
    monkeypatch.setattr(config_flow, "LOCAL_APP_HOSTS", ("old.test", "current.test"))
    client.async_validate_stac.side_effect = [UnsupportedGateway(), None]
    result = await flow.async_step_automatic()
    assert result["type"] == "create_entry"
    assert result["data"]["host"] == "current.test"
    assert client.async_close.await_count == 2
