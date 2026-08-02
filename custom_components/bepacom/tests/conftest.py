"""Shared test helpers for Bepacom."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path
import sys

import pytest


@pytest.fixture(autouse=True)
def integration_parent_on_path() -> Iterator[None]:
    """Make the repository's custom_components package importable."""
    repository_root = Path(__file__).parents[3]
    sys.path.insert(0, str(repository_root))
    try:
        yield
    finally:
        sys.path.remove(str(repository_root))
