# 🌍 Engelsoft Beacon BACnet/IP 1.3.0

> **BACnet now speaks human — well, at least German and English. 😄**

## English

This release makes the integrated BACnet Explorer follow the active Home Assistant user language. German users keep the familiar German interface, English users get a fully translated Explorer, and every unknown locale falls back to English.

### Highlights

- Protocol V2 communication with capability negotiation and gateway compatibility checks
- optional API-token authentication for BACstac access
- clear Home Assistant repair issues for incompatible gateways and unavailable BACstac applications
- stronger WebSocket lifecycle, reconnect behavior, sequence tracking, resynchronization, command metrics, and diagnostics
- improved setup validation, error handling, connection diagnostics, and runtime transport visibility
- expanded Protocol V2 health, live activity, Point Inspector, and transport-state details in the Explorer
- reproducible frontend builds and reload-safe custom-element registration
- automatic German and English Explorer localization
- English fallback for unknown or missing Home Assistant locales
- translated configuration, live view, diagnostics, Point Inspector, dialogs, filters, and runtime transport labels
- locale-aware decimal formatting (`1,28` in German, `1.28` in English)
- safe localization after delayed Lit rendering and live partial updates, without persistent DOM observers
- complete German and English README documentation
- frontend cache build `0679`

### Upgrade notes

Restart Home Assistant after installing the update. If the Explorer still shows the previous language or frontend build, reload the page while bypassing the browser cache.

This is the stable `1.3.0` release and requires [Engelsoft BACstac](https://github.com/engelsofta/engelsoft-bacstac-ha-addon).

## Deutsch

Mit diesem Release richtet sich der integrierte BACnet Explorer nach der aktiven Home-Assistant-Benutzersprache. Deutsche Benutzer behalten die vertraute deutsche Oberfläche, englische Benutzer erhalten einen vollständig übersetzten Explorer und unbekannte Spracheinstellungen verwenden Englisch als Fallback.

### Highlights

- Protocol-V2-Kommunikation mit Funktionsaushandlung und Gateway-Kompatibilitätsprüfung
- optionale API-Token-Authentifizierung für den BACstac-Zugriff
- verständliche Home-Assistant-Reparaturhinweise für inkompatible Gateways und nicht verfügbare BACstac-Anwendungen
- robusterer WebSocket-Lebenszyklus mit Wiederverbindung, Sequenzverfolgung, Resynchronisation, Befehlsmetriken und Diagnose
- verbesserte Einrichtungsprüfung, Fehlerbehandlung, Verbindungsdiagnose und Sichtbarkeit der aktiven Transportzustände
- erweiterter Protocol-V2-Status, Live-Aktivität, Point Inspector und Transportdetails im Explorer
- reproduzierbare Frontend-Builds und sicheres erneutes Laden von Custom Elements
- automatische deutsche und englische Explorer-Oberfläche
- Englisch als Fallback für unbekannte oder fehlende Home-Assistant-Spracheinstellungen
- übersetzte Konfiguration, Live-Ansicht, Diagnose, Point Inspector, Dialoge, Filter und Transportzustände
- sprachabhängige Dezimalformatierung (`1,28` auf Deutsch, `1.28` auf Englisch)
- sichere Übersetzung nach verzögertem Lit-Rendering und partiellen Live-Aktualisierungen ohne dauerhafte DOM-Beobachter
- vollständige deutsche und englische README-Dokumentation
- Frontend-Cache-Build `0679`

### Hinweise zum Update

Starte Home Assistant nach der Installation vollständig neu. Falls der Explorer noch die vorherige Sprache oder Frontend-Version zeigt, lade die Seite einmal ohne Browser-Cache neu.

Dies ist das stabile Release `1.3.0` und benötigt [Engelsoft BACstac](https://github.com/engelsofta/engelsoft-bacstac-ha-addon).

---

# Engelsoft Beacon BACnet/IP 1.2.6

Version 1.2.6 promotes the complete integration-controlled BACnet workflow to the stable channel.

Configure points as Push/COV, Polling or Disabled, collect the changes in the Explorer and apply the full target profile once with **Stac Update**. BACstac calculates the difference and changes only affected BACnet tasks while the Home Assistant integration and global WebSocket remain online.

The release also delivers the redesigned light and dark interface, the full-width Live View, reliable friendly-name resolution, stable table scrolling, and the focused animated Diagnostics pipeline. The permanent status strip now combines Push and Polling activity in one **Updates** card with blue and green indicators.

> [!IMPORTANT]
> Version 1.2.6 requires [Engelsoft BACstac](https://github.com/engelsofta/engelsoft-bacstac-ha-addon). The legacy Bepacom BACnet add-on is no longer supported. Existing internal Home Assistant identifiers such as `bepacom.*` remain unchanged for backwards compatibility.

**No reloads, no noise — just BACnet in sync.**

---

# Engelsoft Beacon BACnet/IP 1.2.6 B3

This beta completes the Diagnostics redesign with a focused, animated view of the BACnet update path.

The remaining processing stages now use larger cards, individual visual accents, and a subtle moving signal between steps. Redundant configuration, runtime, efficiency, and raw technical card groups have been removed. Push and Polling configuration counts now live directly in the main entity status card.

Falling numeric values now flash violet instead of red, keeping red reserved for actual error states. Motion automatically stops when reduced animation is enabled at operating-system level.

**Follow the flow, lose the noise — BACnet diagnostics in motion.**

---

# Engelsoft Beacon BACnet/IP 1.2.6 B2

This beta turns the Diagnostics workspace from a wall of counters into an operational view of the complete update path.

WebSocket messages, inspected objects, unchanged-value filtering, dispatched updates, and effective changes are now presented as one visual processing pipeline. Important health values remain immediately visible, while duplicate low-level counters are preserved under Technical Details.

**Less number soup, more BACnet signal — diagnostics that finally speak human.**

---

# Engelsoft Beacon BACnet/IP 1.2.6 B1

This beta introduces batched, integration-controlled transport changes without restarting the integration.

Configure multiple BACnet points as Push/COV, Polling or Disabled, then apply the complete profile once from the Explorer. BACstac receives one desired-state update, performs the target diff and changes only the affected BACnet tasks while the global WebSocket stays connected.

Home Assistant entity structure changes still keep their separate reload option where it is genuinely required.

**One click, zero reloads — because even BACnet deserves fewer existential crises.**

---

Version 1.2.3 makes BACnet transport modes readable at a glance across the Explorer.

## Clear transport colors

- **Blue means Push/COV** in the Point Inspector and the Explorer table.
- **Green means Polling**, including managed polling fallbacks.
- Snapshot-based push updates now follow the same blue Push/COV language.
- Disabled points remain neutral and unobtrusive.

The update-mode selector also shows a green marker directly beside Polling, so configuration and runtime status now speak the same visual language.

## Compatibility

- Existing config entries and update-mode selections are preserved.
- Entity IDs, overrides and virtual entities remain unchanged.
- No migration or reconfiguration is required.
- Restart Home Assistant and reload the browser with `Ctrl+F5` after updating.

## Validation

- Python integration test suite.
- TypeScript type check.
- Reproducible Vite production build.
- JavaScript bundle syntax validation.
- Frontend build `0652`.

For the complete list of changes, see [CHANGELOG.md](CHANGELOG.md#123---2026-08-04).

**Blue for push. Green for poll. BACnet status at a glance.**
