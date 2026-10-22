# Explorer layout regression test

Run after rebuilding the frontend:

```text
node --test tests/test_explorer_layout.cjs
```

Requires `playwright` and its Chromium browser. `NODE_PATH` may point to an
existing Playwright package directory; `PLAYWRIGHT_EXECUTABLE_PATH` may select
an existing Chromium executable. No running gateway or Home Assistant is needed.

The test loads the production bundle and real table/Inspector components with
demo data. It checks sticky header positions, opaque backgrounds, foreground
hit testing and single-row Inspector actions in light/dark mode at desktop and
phone widths. Fixture CSS only constrains the workspace and scroll containers.
The desktop table header is checked on desktop; mobile uses the existing cards.

This does not replace live Home Assistant installation validation.
