"""Tests for pure Explorer panel helpers."""

from custom_components.bepacom.panel_helpers import (
    effective_transport,
    matches_filters,
    matches_search_query,
    normalize_empty,
    parse_write_value,
)


def test_effective_transport_normalizes_gateway_state() -> None:
    assert effective_transport(None)["effective_update_mode"] == "unknown"
    assert effective_transport({"state": "cov_active"})["effective_update_mode"] == "cov"
    assert effective_transport({"state": "polling_error"})["effective_update_mode"] == "polling"
    assert effective_transport({"state": "disabled"})["effective_update_mode"] == "disabled"


def test_search_supports_terms_and_wildcards() -> None:
    assert matches_search_query("Heating supply temperature", "heating temp*")
    assert matches_search_query("analogInput:169", "analog?nput:16*")
    assert not matches_search_query("Heating return", "supply")


def test_filters_use_serialized_point_fields() -> None:
    point = {
        "object_type": "analogInput",
        "override_active": True,
        "update_mode": "subscribe",
        "subscribed": True,
        "object_name": "Storage temperature",
    }
    assert matches_filters(
        point,
        {"search": "storage", "only_overrides": True, "only_subscribe": True},
    )
    assert not matches_filters(point, {"object_type": "binaryOutput"})


def test_write_and_empty_value_normalization() -> None:
    assert parse_write_value("12,5") == 12.5
    assert parse_write_value("active") is True
    assert parse_write_value("custom") == "custom"
    assert normalize_empty("  ") is None
    assert normalize_empty(" sensor.example ") == "sensor.example"
