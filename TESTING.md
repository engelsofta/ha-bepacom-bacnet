# Tests

The automated tests simulate gateway behavior. No physical BACnet gateway is
required.

## Run locally

Home Assistant 2026.7 requires Python 3.14.

```bash
python -m venv .venv
```

Activate the virtual environment and install the test dependencies:

```bash
python -m pip install -r requirements_test.txt
python -m pytest
```

## Run on GitHub

The workflow in `.github/workflows/tests.yml` runs automatically for every push
and pull request. It can also be started manually:

1. Open the repository on GitHub.
2. Select **Actions**.
3. Select **Tests**.
4. Select **Run workflow**.

A green check means all automated tests passed. Open a failed run to see which
expectation was not met.

## Lit frontend

The Explorer source lives in `custom_components/bepacom/frontend/src`. Install
the pinned frontend dependencies and create the browser bundle with:

```bash
pnpm install
pnpm run check:frontend
pnpm run build:frontend
```

The generated `custom_components/bepacom/frontend/bepacom-panel.js` file is the
only frontend module loaded by Home Assistant. GitHub verifies that this bundle
matches the committed TypeScript source.
