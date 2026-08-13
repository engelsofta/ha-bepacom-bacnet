# Engelsoft Beacon BACnet/IP für Home Assistant

[English](README.md) | **Deutsch**

![Version](https://img.shields.io/badge/Version-1.3.0-gold)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2026.6.0%2B-41BDF5)
![HACS](https://img.shields.io/badge/HACS-Custom-orange)
[![GitHub Downloads](https://img.shields.io/github/downloads/engelsofta/ha-bepacom-bacnet/total?label=Downloads)](https://github.com/engelsofta/ha-bepacom-bacnet/releases)

> [!WARNING]
> **BACstac ist erforderlich**
> Seit Version 1.2.6 wird das frühere Bepacom-BACnet-Add-on nicht mehr unterstützt. Vor dem Update muss auf **[Engelsoft BACstac](https://github.com/engelsofta/engelsoft-bacstac-ha-addon)** umgestellt werden. Bestehende interne Home-Assistant-Bezeichner wie `bepacom.*` bleiben aus Kompatibilitätsgründen unverändert.

Die Integration **Engelsoft Beacon BACnet/IP** verbindet BACnet/IP-Datenpunkte aus Engelsoft BACstac mit Home Assistant. Sie erkennt unterstützte BACnet-Objekte automatisch, erstellt passende Home-Assistant-Entitäten und aktualisiert sie vorrangig über WebSocket-/COV-Benachrichtigungen. Der integrierte **BACnet Explorer** dient zur Konfiguration, Überwachung und Diagnose.

> [!IMPORTANT]
> Benötigt wird das **[Engelsoft BACstac Home Assistant Add-on](https://github.com/engelsofta/engelsoft-bacstac-ha-addon)**. Ohne ein laufendes und von Home Assistant erreichbares BACstac funktioniert die Integration nicht.

## Funktionen

- automatische Erkennung von BACnet-Geräten und -Objekten
- Einrichtung vollständig über die Home-Assistant-Oberfläche
- stabile Entity-IDs im Format `bepacom_<device>_<object-type>_<object-id>`
- automatische Zuordnung zu `sensor`, `binary_sensor`, `number` und `switch`
- automatische Einheiten-, Device-Class- und State-Class-Erkennung
- WebSocket-/COV-Push-Aktualisierungen mit gezieltem Fallback-Polling
- automatische Wiederverbindung, Heartbeat-Überwachung und Unterdrückung doppelter Werte
- Schreiben auf Analog Value, Multi-State Output und Binary Value
- konfigurierbare BACnet-Prioritäten sowie GLT-/AS-Schreibprofile
- integrierter BACnet Explorer mit Konfiguration, Live-Ansicht und Diagnose
- Massenbearbeitung sowie Import und Export von Overrides
- virtuelle Binary-Sensoren aus numerischen oder Multi-State-Werten
- Unterstützung mehrerer BACstac-Verbindungen
- deutsch- und englischsprachige Explorer-Oberfläche entsprechend der Home-Assistant-Sprache

## Voraussetzungen

- Home Assistant `2026.6.0` oder neuer
- HACS für die empfohlene Installation als benutzerdefiniertes Repository
- installiertes und laufendes Engelsoft-BACstac-Add-on
- Netzwerkzugriff von Home Assistant auf die HTTP- und WebSocket-API
- standardmäßig TCP-Port `8099`, sofern im Add-on nicht anders konfiguriert

Die Integration enthält keinen eigenen BACnet/IP-Stack. BACnet-Kommunikation, Discovery, COV-Abonnements, Polling und die Gateway-API werden von Engelsoft BACstac bereitgestellt.

## Installation

### 1. Engelsoft BACstac installieren

Installiere das Add-on aus:

**[github.com/engelsofta/engelsoft-bacstac-ha-addon](https://github.com/engelsofta/engelsoft-bacstac-ha-addon)**

Konfiguriere und starte BACstac. Prüfe anschließend, ob die HTTP-API aus Home Assistant erreichbar ist. Standardport ist `8099`.

### 2. Installation über HACS

1. Öffne HACS in Home Assistant.
2. Öffne **Integrationen**.
3. Wähle oben rechts **Benutzerdefinierte Repositories**.
4. Trage die URL dieses GitHub-Repositories ein.
5. Wähle als Kategorie **Integration**.
6. Installiere **Engelsoft Beacon BACnet/IP**.
7. Starte Home Assistant vollständig neu.

### 3. Manuelle Installation

1. Kopiere `custom_components/bepacom` in das Verzeichnis `custom_components` deiner Home-Assistant-Konfiguration.
2. Danach muss `config/custom_components/bepacom/manifest.json` vorhanden sein.
3. Starte Home Assistant vollständig neu.

## Einrichtung

1. Öffne **Einstellungen → Geräte & Dienste**.
2. Wähle **Integration hinzufügen**.
3. Suche nach **Engelsoft Beacon BACnet/IP**.
4. Trage Host/IP-Adresse und API-Port von Engelsoft BACstac ein.
5. Bestätige die Einrichtung.

| Einstellung | Beschreibung | Standard |
|---|---|---:|
| Host | IP-Adresse oder Hostname des BACstac-Add-ons | – |
| Port | Port der HTTP-/WebSocket-API | `8099` |

Nach dem Laden des vollständigen BACnet-Inventars werden Geräte und Entitäten angelegt. Der BACnet Explorer erscheint zusätzlich in der Home-Assistant-Seitenleiste.

## Unterstützte BACnet-Objekte

| BACnet-Objekttyp | Home-Assistant-Entität | Schreibbar |
|---|---|---|
| Analog Input | Sensor | nein |
| Analog Value | Number | ja |
| Analog Output | Number | abhängig vom Gateway |
| Binary Input | Binary Sensor | nein |
| Binary Value | Switch | ja |
| Binary Output | Switch | abhängig vom Gateway |
| Multi-State Input | Sensor | nein |
| Multi-State Output | Number | ja |
| Temperature Sensor | Sensor | nein |
| Humidity Sensor | Sensor | nein |
| Pressure Sensor | Sensor | nein |
| Loop | Sensor | abhängig von den Gateway-Metadaten |

Unbekannte interne oder proprietäre Objekte werden nicht ungeprüft als Home-Assistant-Sensoren veröffentlicht. Schreibbare Eingänge können als `number` dargestellt werden, wenn die Gateway-Metadaten sie entsprechend kennzeichnen.

## BACnet Explorer

Der Explorer bietet unter anderem:

- Suche und Filter nach Gerät, Objekttyp, Name, Beschreibung, Entity-ID und Status
- Anzeige von BACnet-Pfad, Objekt-ID, aktuellem Wert und Metadaten
- Aktivieren und Deaktivieren einzelner BACnet-Punkte
- Bearbeiten von Entity-Namen und Entity-IDs
- Overrides für Einheit, Device Class und State Class
- Grenzwerte und Schrittweite für Number-Entitäten
- Auswahl von Push/COV oder Polling
- Schreibpriorität, Schreibprofil und direkte Test-Schreibvorgänge
- Erstellen, Bearbeiten, Duplizieren und Löschen virtueller Binary-Sensoren
- Live-Monitor und Laufzeitdiagnose
- Export als JSON, CSV und Excel-kompatible Datei
- Massenbearbeitung mehrerer BACnet-Punkte

Änderungen am Entitätstyp oder an Registry-Metadaten können ein Neuladen der Integration oder einen Neustart von Home Assistant erfordern.

## Aktualisierung und Datenfluss

### WebSocket/COV

Die Integration verwendet vorrangig die WebSocket-Abonnements des Gateways. Nur tatsächliche Wertänderungen werden an die betroffene Home-Assistant-Entität weitergegeben. Identische Snapshot-Werte und doppelte Push-Nachrichten werden vorher gefiltert.

### Fallback-Polling

Kann für einen BACnet-Punkt kein Abonnement aufgebaut werden, aktiviert die Integration gezieltes Fallback-Polling. Das Standardintervall beträgt 30 Sekunden. Optional kann zusätzlich ein periodischer vollständiger Datenabruf aktiviert werden.

### Verbindungsüberwachung

Ein Heartbeat überwacht die WebSocket-Verbindung. Nach einem Verbindungsabbruch verbindet sich die Integration mit begrenztem Backoff erneut und stellt ihre Abonnements wieder her.

## Globale Optionen

Öffne **Einstellungen → Geräte & Dienste → Engelsoft Beacon BACnet/IP → Konfigurieren**.

| Option | Beschreibung |
|---|---|
| Periodische Datenaktualisierung | lädt regelmäßig die vollständige BACnet-Datenbank |
| Snapshot-WebSocket-Modus | unterstützt Gateways, die vollständige Snapshots senden |
| Push-Werte protokollieren | schreibt empfangene Push-Werte zur Fehlersuche ins Log |
| Heartbeat-Timeout | bestimmt, wann eine inaktive Verbindung als getrennt gilt |

Objektspezifische Einstellungen werden ausschließlich im BACnet Explorer verwaltet.

## BACnet-Werte schreiben

Das Profil `direct` schreibt den gewünschten Wert mit der für den Punkt konfigurierten BACnet-Priorität. Standard ist Priorität `8`.

Beim Profil **GLT → Wert setzen → AS** wird zuerst die GLT-Steuerung aktiviert, danach der Analog Value geschrieben und anschließend zur AS-Steuerung zurückgekehrt. Optional werden die belegten Prioritätsslots wieder freigegeben.

Beim Profil **GLT → Stufe setzen** wird zuerst der zugehörige Binary Value auf GLT geschaltet und danach die gewünschte Stufe auf den Multi-State Output geschrieben.

## BACnet-Prioritäten freigeben

Die Integration registriert folgende Home-Assistant-Aktionen:

- `bepacom.release_analog_value_priority`
- `bepacom.release_multistate_output_priority`
- `bepacom.release_binary_value_priority`

Beispiel für Binary Value auf Priorität 8:

```yaml
action: bepacom.release_binary_value_priority
data:
  device_id: 1
  object_id: 82476
  priority: 8
```

Bei mehreren konfigurierten Verbindungen muss zusätzlich `config_entry_id` angegeben werden.

## Virtuelle Binary-Sensoren

Aus BACnet-Sensoren und Multi-State Inputs können virtuelle Binary-Sensoren erzeugt werden. Unterstützt werden:

- eigener Name und eigene Unique ID
- Home-Assistant-Device-Class
- Regeln für `on` und `off`
- Fallback auf `unknown` oder `unavailable`
- Einzelwerte wie `2`
- Textwerte wie `active` oder `inactive`
- mehrere Alternativen wie `alarm,fault`
- Vergleiche wie `>2`, `<=10`, `==3` oder `!=0`
- numerische Bereiche

## Entity-IDs und Migration

Neue Entitäten erhalten stabile IDs, beispielsweise:

```text
sensor.bepacom_1_analoginput_601
number.bepacom_1_multistateoutput_82476
switch.bepacom_1_binaryvalue_82476
```

Beim Start versucht die Integration, ältere automatisch erzeugte IDs in dieses Format zu migrieren. Bereits belegte Ziel-IDs werden niemals überschrieben.

## Fehlerbehebung

### Die Integration lässt sich nicht einrichten

- Prüfe, ob Engelsoft BACstac läuft.
- Kontrolliere Host und Port.
- Prüfe die API-Erreichbarkeit aus dem Home-Assistant-Netzwerk.
- Kontrolliere die Logs des Add-ons und von Home Assistant.

### Eine Entität wird nicht aktualisiert

- Prüfe den COV-/Polling-Status im Explorer.
- Kontrolliere, ob das Gateway einen neuen BACnet-Wert liefert.
- Aktiviere bei Bedarf vorübergehend die Protokollierung von Push-Werten.
- Suche im Log nach Fehlern zu Abonnement, Heartbeat oder Fallback-Polling.

### Der Explorer zeigt nach dem Update eine alte Version

1. Starte Home Assistant vollständig neu.
2. Lade die Browserseite ohne Cache neu.
3. Prüfe Integration-Version und Frontend-Build im Explorer-Kopf.

### Debug-Protokollierung

```yaml
logger:
  default: info
  logs:
    custom_components.bepacom: debug
```

Debug-Protokollierung kann viele Meldungen erzeugen und sollte nach der Fehlersuche wieder deaktiviert werden.

## Aktualisieren

1. Installiere die neue Version über HACS oder ersetze das Integrationsverzeichnis manuell.
2. Starte Home Assistant vollständig neu.
3. Leere den Browser-Cache, falls weiterhin ein alter Frontend-Build angezeigt wird.
4. Prüfe nach größeren Updates die Diagnose im Explorer.

Vor einem Update wird ein Home-Assistant-Backup empfohlen.

## Datenschutz und Netzwerk

Die Kommunikation bleibt lokal zwischen Home Assistant und der konfigurierten BACstac-API. Die Integration selbst benötigt keinen Cloud-Dienst.

## Support

Bitte füge einer Fehlermeldung folgende Angaben bei:

- Integrationsversion und Frontend-Build
- Home-Assistant-Version
- BACstac-Version und relevante Konfiguration
- betroffenes BACnet-Gerät, Objekttyp und Objekt-ID
- relevante Explorer-Diagnose
- kurzer Debug-Log-Auszug zum Fehlerzeitpunkt

Fehlerberichte und Funktionswünsche gehören in den Issue-Tracker dieses GitHub-Repositories.

## Technischer Kompatibilitätshinweis

Integrationsdomain, Installationsverzeichnis, Home-Assistant-Aktionsnamen und bestehende Entity-IDs behalten aus Kompatibilitätsgründen den internen Bezeichner `bepacom`. Alle hier beschriebenen Gateway-Funktionen beziehen sich auf **[Engelsoft BACstac](https://github.com/engelsofta/engelsoft-bacstac-ha-addon)**.
