"""Keep HACS default-store integration discovery unambiguous."""

from pathlib import Path


def test_one_integration_manifest_and_local_brand_assets():
    """HACS searches recursively and rejects multiple manifest.json files."""
    integration = Path(__file__).parents[1]
    assert sorted(integration.rglob("*manifest.json")) == [integration / "manifest.json"]
    assert (integration / "brand" / "icon.png").is_file()
    assert (integration / "brand" / "logo.png").is_file()
