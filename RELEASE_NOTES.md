# Engelsoft Beacon BACnet/IP 1.4.3

## 🚀 Less BAClog. More BACnet.

The Explorer has put its unnecessary busywork on a strict diet. Search no longer packs an entire moving van just to find one temperature sensor, and hovering your mouse over the table no longer freezes time.

### Faster searches, fewer dramatic pauses

- Search lightweight, cached documents instead of fully preparing every point's editor data. Only displayed matches get the deluxe treatment.
- Keep names, descriptions, values, units, HA entity names and IDs searchable, including wildcard and multi-term queries.
- Ignore outdated search responses. Yesterday's answer can stop interrupting today's question.
- Bind toolbar actions once, shorten the typing delay, apply device filters locally, and return to the top when filters change.

### The table has learned some manners

- Continue updating values while the mouse hovers over the table. The cursor is not a pause button.
- After the initial runtime comparison, return only changed point data and reuse unchanged row models and rendered rows.
- Detect transport errors and counter changes even when the numeric value stays put.
- Protect active inputs and flush deferred row updates when focus leaves the field.
- Keep linked HA feedback entities current even when their BACnet source does not change.

### Less paperwork backstage

- Build Multi-State Input feedback candidates once per device for each result batch, including disabled feedback inputs.
- Reuse the entity-registry index instead of sending every point on a sightseeing tour of all HA entities.
- Ship English-only documentation and retire the obsolete migration warning. The integration still requires Engelsoft BACstac.
- Add regression coverage for search ordering, runtime deltas, feedback grouping, input protection and entity lookup; run frontend regression tests in GitHub Actions.

### Updating

Update both the integration's Python files and its bundled frontend, then restart Home Assistant. Reload the Explorer without the browser cache if necessary. Integration version: `1.4.3`; frontend build: `0691`.

Existing entity IDs and point settings remain unchanged. Local targeted tests, type checking and the frontend build have passed; live Home Assistant behavior still needs installation testing.
