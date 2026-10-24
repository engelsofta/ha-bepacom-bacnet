# HACS default-store submission

Repository: https://github.com/engelsofta/ha-bepacom-bacnet
Category: integration
Integration domain: bepacom
Release: https://github.com/engelsofta/ha-bepacom-bacnet/releases/tag/1.6.1

## Repository requirements

- Public repository, MIT license, issues enabled, description and topics configured.
- One integration under custom_components/bepacom.
- Config flow, manifest, German/English translations and local brand/icon.png present.
- Root hacs.json uses the beacon.zip release asset and Home Assistant 2026.6.0 minimum.
- HACS and Hassfest workflows are enabled without ignored checks.
- BACstac Protocol V2 is required; setup links to the companion app repository.

## Submission steps

1. Confirm HACS, Hassfest, Tests and Validate succeeded on the exact 1.6.1 release commit.
2. Confirm the full release was published after validation and beacon.zip is attached.
3. Fork hacs/default into your personal account and create a branch from master.
4. Add engelsofta/ha-bepacom-bacnet alphabetically to the JSON array in integration.
5. Complete the current pull request template with the release URL and exact successful HACS/Hassfest run URLs. Allow maintainer edits.
6. Submit the pull request yourself. This preparation does not submit one or claim acceptance.

Official instructions: https://www.hacs.xyz/docs/publish/include/
HACS workflow: https://github.com/engelsofta/ha-bepacom-bacnet/actions/workflows/hacs.yaml
Hassfest workflow: https://github.com/engelsofta/ha-bepacom-bacnet/actions/workflows/hassfest.yaml

## Privacy review scope

Review the tracked release source and the final ZIP for credentials, private addresses and local files. Diagnostic exports redact the API token, host and connection title. Local credentials and Home Assistant state are excluded by .gitignore.

Git history contains an older author email that may be personal. Existing published history was not rewritten. New release commits use a GitHub noreply address. Automated content checks cannot prove that every historical revision or image is free of personal information.

## Live validation still required

Install through HACS, restart Home Assistant, and exercise the setup links, retry/manual navigation and a real BACstac gateway. Automated checks do not establish live installation behavior.
