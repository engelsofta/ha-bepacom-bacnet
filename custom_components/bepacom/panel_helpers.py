"""Pure data helpers for the Engelsoft Beacon Explorer panel."""

from __future__ import annotations

import re
import hashlib
import json
from functools import lru_cache
from typing import Any


SEARCH_FIELDS = (
    "unique_id", "device_id", "object_key", "object_type", "object_id",
    "object_name", "description", "present_value", "bacnet_unit", "ha_unit",
    "device_class", "entity_id", "entity_name", "entity_original_name",
)


class ExplorerSearchIndex:
    """Cache normalized search documents without retaining full editor payloads.

    Signatures are checked on each query so discovery, overrides, HA renames and
    live values are reflected immediately without relying on external events.
    """

    def __init__(self) -> None:
        self._documents: dict[str, tuple[tuple[str, ...], str]] = {}

    def matches(self, point: dict[str, Any], message: dict[str, Any]) -> bool:
        unique_id = point["unique_id"]
        signature = tuple(str(point.get(key) or "") for key in SEARCH_FIELDS)
        cached = self._documents.get(unique_id)
        if cached is None or cached[0] != signature:
            cached = (signature, " ".join(signature).lower())
            self._documents[unique_id] = cached
        return matches_filters(point, message, haystack=cached[1])

    def retain(self, unique_ids: set[str]) -> None:
        for unique_id in self._documents.keys() - unique_ids:
            del self._documents[unique_id]


def runtime_version(point: dict[str, Any]) -> str:
    """Fingerprint runtime state; elapsed age alone is not a point change."""
    ignored = {
        "runtime_version", "effective_last_cov_age", "effective_last_poll_age",
        "effective_value_age",
    }
    payload = {key: value for key, value in point.items() if key not in ignored}
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, default=str, ensure_ascii=False).encode()
    ).hexdigest()[:24]


def feedback_candidates_by_device(objects, normalize_type) -> dict[str, list[dict[str, Any]]]:
    """Build MSI candidate descriptors once per device, including disabled MSI."""
    candidates: dict[str, list[dict[str, Any]]] = {}
    for obj in objects:
        if normalize_type(obj.object_type) != "multi_state_input":
            continue
        candidates.setdefault(str(obj.device_id), []).append({
            "unique_id": obj.unique_id,
            "object_id": obj.object_id,
            "name": obj.object_name or obj.description or obj.unique_id,
        })
    return candidates


def effective_transport(status: dict[str, Any] | None) -> dict[str, Any]:
    """Normalize BACstac target diagnostics for the Explorer frontend."""
    if not status:
        return {
            "gateway_requested_mode": None,
            "effective_update_mode": "unknown",
            "effective_update_state": "unknown",
            "effective_update_reason": None,
            "effective_update_error": None,
        }

    state = str(status.get("state") or "waiting").strip().lower()
    fallback = bool(status.get("fallback_active"))
    polling_states = {
        "polling",
        "polling_waiting",
        "polling_error",
        "polling_fallback",
    }
    if fallback or state in polling_states:
        effective_mode = "polling"
    elif state in {"cov_active", "cov_waiting", "subscribing"} or status.get(
        "cov_task_active"
    ):
        effective_mode = "cov"
    elif state in {"disabled", "cancelled"}:
        effective_mode = "disabled"
    else:
        effective_mode = "waiting"

    return {
        "gateway_requested_mode": status.get("requested_mode"),
        "effective_update_mode": effective_mode,
        "effective_update_state": state,
        "effective_update_reason": status.get("fallback_reason"),
        "effective_update_error": status.get("last_error"),
        "effective_subscription_confirmed": bool(
            status.get("subscription_confirmed")
        ),
        "effective_last_cov_age": status.get("last_cov_age_seconds"),
        "effective_last_poll_age": status.get("last_poll_age_seconds"),
        "effective_value_age": status.get("last_value_age_seconds"),
    }


@lru_cache(maxsize=128)
def _search_terms(query: str):
    """Compile a query once, rather than once per BACnet point."""
    return tuple(
        re.compile(re.escape(term).replace(r"\*", ".*").replace(r"\?", "."), re.DOTALL)
        if "*" in term or "?" in term else term
        for term in query.strip().lower().split()
    )


def matches_search_query(haystack: str, query: str) -> bool:
    """Match whitespace-separated terms with optional glob wildcards."""
    normalized_haystack = str(haystack or "").lower()
    terms = _search_terms(str(query or ""))
    for term in terms:
        if isinstance(term, str):
            if term not in normalized_haystack:
                return False
            continue
        if term.search(normalized_haystack) is None:
            return False
    return True


def matches_filters(
    point: dict[str, Any], message: dict[str, Any], *, haystack: str | None = None,
) -> bool:
    """Return whether a serialized point matches frontend filters."""
    search = str(message.get("search") or "").strip().lower()
    object_type = str(message.get("object_type") or "").strip().lower()
    if object_type not in {"", "all"} and point["object_type"].lower() != object_type:
        return False
    if bool(message.get("only_overrides", False)) and not point["override_active"]:
        return False
    if bool(message.get("only_subscribe", False)) and not (
        point.get("update_mode") == "subscribe" or point["subscribed"]
    ):
        return False
    if search:
        if haystack is None:
            haystack = " ".join(str(point.get(key) or "") for key in SEARCH_FIELDS).lower()
        if not matches_search_query(haystack, search):
            return False
    return True


def parse_write_value(value: Any) -> Any:
    """Parse frontend write input into a BACnet-friendly value."""
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    text = str(value).strip()
    if text.lower() in {"true", "on", "active", "1", "ja", "ein"}:
        return True
    if text.lower() in {"false", "off", "inactive", "0", "nein", "aus"}:
        return False
    try:
        if "." in text or "," in text:
            return float(text.replace(",", "."))
        return int(text)
    except ValueError:
        return text


def normalize_empty(value: Any) -> str | None:
    """Normalize frontend text input."""
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None
