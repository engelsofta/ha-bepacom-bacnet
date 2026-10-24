# Engelsoft Beacon BACnet/IP 1.6.1

## 1.6.1 - 2026-10-24

**No BACstac? No panic. We brought directions.**

- Explain the BACstac prerequisite at the start of setup and link directly to its installation repository. Your gateway no longer needs to be found by interpretive dance.
- Keep automatic setup open when BACstac cannot be reached, with **Search again** and **Configure an external gateway** actions.
- Show a separate update message for an incompatible gateway. Offline and outdated now have their own name tags.
- Include German and English guidance, with regression coverage for retries, compatibility checks, and successful discovery.
- Redact API tokens and connection titles from downloaded diagnostics. Credentials have declined their invitation to the bug report.

### Updating and validation

Requires Engelsoft BACstac Protocol V2 and Home Assistant 2026.6.0 or newer. Update through HACS and restart Home Assistant. Integration version: **1.6.1**; unchanged frontend build: **0722**.

Automated checks are recorded in GitHub Actions for the release commit. Live Home Assistant setup and a real gateway have not been verified for this release.
