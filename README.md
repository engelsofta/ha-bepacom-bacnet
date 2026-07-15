# Bepacom BACnet/IP für Home Assistant

![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2026.6.0%2B-41BDF5)
![HACS](https://img.shields.io/badge/HACS-Custom-orange)

Die Bepacom-Integration bindet BACnet/IP-Datenpunkte eines Bepacom-Gateways in Home Assistant ein. Sie erkennt unterstützte BACnet-Objekte automatisch, erstellt passende Home-Assistant-Entitäten und aktualisiert sie bevorzugt per WebSocket/COV. Über den integrierten **BACnet Explorer** lassen sich Datenpunkte verwalten, diagnostizieren und an die eigene Anlage anpassen.

> [!IMPORTANT]
> Diese Integration benötigt zwingend das Add-on aus **[Bepacom-Raalte/bepacom-HA-Addons](https://github.com/Bepacom-Raalte/bepacom-HA-Addons)**. Das Add-on stellt die von der Integration verwendete Bepacom-HTTP- und WebSocket-Schnittstelle bereit. Ohne ein installiertes, gestartetes und erreichbares Add-on funktioniert die Integration nicht.

## Funktionsumfang

- automatische Erkennung der vom Bepacom-Gateway bereitgestellten BACnet-Geräte und -Objekte
- Einrichtung vollständig über die Home-Assistant-Oberfläche
- stabile Entity-IDs nach dem Schema `bepacom_<device>_<objekttyp>_<objekt-id>`
- automatische Zuordnung zu `sensor`, `binary_sensor`, `number` und `switch`
- automatische Normalisierung verbreiteter BACnet-Einheiten
- automatische Erkennung geeigneter Home-Assistant-Geräte- und Zustandsklassen
- Push-Aktualisierung über WebSocket/COV
- Fallback-Polling bei nicht verfügbaren oder fehlerhaften Subscriptions
- Wiederverbindung, Heartbeat-Überwachung und Schutz vor Push-Duplikaten
- direkte Schreibzugriffe auf Analog Value, Multi-State Output und Binary Value
- konfigurierbare BACnet-Schreibpriorität
- Freigabe von BACnet-Prioritätseinträgen
- spezielle GLT-/AS-Schreibprofile
- integrierter BACnet Explorer in der Home-Assistant-Seitenleiste
- individuelle Anpassungen je BACnet-Datenpunkt
- virtuelle Binary-Sensoren aus numerischen oder mehrstufigen BACnet-Werten
- Diagnosezähler, Änderungsverlauf und Datenexport
- Unterstützung mehrerer Bepacom-Verbindungen

## Voraussetzungen

- Home Assistant `2026.6.0` oder neuer
- HACS für die empfohlene Installation als benutzerdefiniertes Repository
- installiertes und laufendes **[Bepacom Home Assistant Add-on](https://github.com/Bepacom-Raalte/bepacom-HA-Addons)**
- Netzwerkzugriff von Home Assistant auf die HTTP-/WebSocket-Schnittstelle des Add-ons
- standardmäßig TCP-Port `8099`, sofern im Add-on nicht anders konfiguriert

Die Integration selbst ist kein BACnet/IP-Stack. Kommunikation, BACnet-Erkennung und die Gateway-API werden vom Bepacom-Add-on bereitgestellt.

## Installation

### 1. Bepacom-Add-on installieren

Installiere zuerst das Add-on aus dem Repository:

**[github.com/Bepacom-Raalte/bepacom-HA-Addons](https://github.com/Bepacom-Raalte/bepacom-HA-Addons)**

Konfiguriere und starte das Add-on. Prüfe anschließend, ob seine HTTP-Schnittstelle von Home Assistant erreichbar ist. Der Standardport der Integration ist `8099`.

### 2. Installation über HACS

1. Öffne HACS in Home Assistant.
2. Öffne den Bereich **Integrationen**.
3. Öffne das Menü oben rechts und wähle **Benutzerdefinierte Repositories**.
4. Trage die URL dieses GitHub-Repositories ein.
5. Wähle als Kategorie **Integration**.
6. Installiere **Bepacom**.
7. Starte Home Assistant vollständig neu.

### 3. Manuelle Installation

1. Kopiere den Ordner `custom_components/bepacom` in das Verzeichnis `custom_components` deiner Home-Assistant-Konfiguration.
2. Die resultierende Struktur muss `config/custom_components/bepacom/manifest.json` enthalten.
3. Starte Home Assistant vollständig neu.

## Einrichtung

1. Öffne **Einstellungen → Geräte & Dienste**.
2. Wähle **Integration hinzufügen**.
3. Suche nach **Bepacom**.
4. Trage Host/IP-Adresse und Port der Bepacom-Schnittstelle ein.
5. Bestätige die Einrichtung.

| Einstellung | Beschreibung | Standard |
|---|---|---:|
| Host | IP-Adresse oder Hostname des Bepacom-Add-ons | – |
| Port | Port der HTTP-/WebSocket-Schnittstelle | `8099` |

Nach dem ersten vollständigen Datenabruf erstellt die Integration Geräte und Entitäten. Zusätzlich erscheint der **BACnet Explorer** in der Home-Assistant-Seitenleiste.

## Unterstützte BACnet-Objekte

Die endgültige Zuordnung berücksichtigt Objekttyp, Schreibbarkeit und vorhandene Metadaten.

| BACnet-Objekttyp | Home-Assistant-Entität | Schreibbar |
|---|---|---|
| Analog Input | Sensor | nein |
| Analog Value | Number | ja |
| Analog Output | Number | ja, wenn vom Gateway unterstützt |
| Binary Input | Binary Sensor | nein |
| Binary Value | Switch | ja |
| Binary Output | Switch | ja, wenn vom Gateway unterstützt |
| Multi-State Input | Sensor | nein |
| Multi-State Output | Number | ja |
| Temperature Sensor | Sensor | nein |
| Humidity Sensor | Sensor | nein |
| Pressure Sensor | Sensor | nein |
| Loop | Sensor | abhängig von den Gateway-Metadaten |

Unbekannte interne oder proprietäre Objekttypen werden nicht automatisch als beliebige Sensoren angelegt. Schreibbare Inputs können abhängig von den Gateway-Metadaten als `number` erscheinen.

## BACnet Explorer

Der BACnet Explorer ist die zentrale Oberfläche für Verwaltung und Diagnose. Er bietet:

- Suche und Filter nach Gerät, Objekttyp, Name, Beschreibung, Entity-ID und Zustand
- Anzeige von BACnet-Pfad, Objekt-ID, aktuellem Wert und Metadaten
- Aktivieren oder Deaktivieren einzelner Datenpunkte
- Bearbeiten von Name und Entity-ID
- Überschreiben von Einheit, Device Class und State Class
- Einstellen von Minimum, Maximum und Schrittweite für Number-Entitäten
- Auswahl zwischen Subscription und Polling
- Einstellung des Polling-Intervalls
- Auswahl der Schreibpriorität und des Schreibprofils
- direktes Testschreiben auf unterstützte BACnet-Objekte
- Anzeige verknüpfter Home-Assistant-Entitäten
- Erstellen, Bearbeiten, Duplizieren und Löschen virtueller Binary-Sensoren
- Laufzeitdiagnose für Push, Polling, Wertänderungen und unterdrückte Duplikate
- Verlauf der letzten Wertänderungen
- Export als JSON, CSV oder Excel-kompatible Datei
- Bulk-Bearbeitung mehrerer BACnet-Punkte

Änderungen an Eigenschaften, die die Art einer Home-Assistant-Entität beeinflussen, werden nach einem Reload der Integration beziehungsweise einem Neustart vollständig wirksam.

## Aktualisierung und Datenfluss

### WebSocket/COV

Die Integration verwendet bevorzugt die vom Gateway angebotenen WebSocket-Subscriptions. Nur tatsächliche Wertänderungen werden an die betroffene Home-Assistant-Entität weitergegeben. Identische Snapshot-Werte und Push-Duplikate werden frühzeitig herausgefiltert.

### Fallback-Polling

Kann für einen Datenpunkt keine Subscription aufgebaut werden, aktiviert die Integration automatisch ein gezieltes Fallback-Polling. Das Standardintervall beträgt 30 Sekunden. Optional kann außerdem eine zyklische vollständige Aktualisierung aktiviert werden.

### Verbindungsüberwachung

Die WebSocket-Verbindung wird per Heartbeat überwacht. Bei einem Abbruch versucht die Integration mit begrenztem Backoff eine erneute Verbindung und Subscription. Diagnosezähler im Explorer helfen bei der Unterscheidung zwischen BACnet-Pushs, verarbeiteten Werten, unterdrückten Duplikaten und Polling-Aktualisierungen.

## Globale Optionen

Unter **Einstellungen → Geräte & Dienste → Bepacom → Konfigurieren** stehen die globalen Laufzeitoptionen zur Verfügung:

| Option | Funktion |
|---|---|
| Zyklische Datenaktualisierung | aktiviert einen regelmäßigen vollständigen Datenabruf |
| Snapshot-WebSocket-Modus | verarbeitet Gateways, die vollständige Snapshots statt einzelner Objektmeldungen senden |
| Push-Werte protokollieren | schreibt empfangene Push-Werte zur Fehlersuche in das Log |
| Heartbeat-Timeout | Zeit bis zur Erkennung einer inaktiven WebSocket-Verbindung |

Objektspezifische Einstellungen werden ausschließlich im BACnet Explorer vorgenommen.

## Schreiben von BACnet-Werten

### Direktes Schreiben

Bei `direct` wird der gewünschte Wert direkt mit der für den Datenpunkt eingestellten BACnet-Priorität geschrieben. Die Voreinstellung ist Priorität `8`.

Nach einem Schreibvorgang wartet die Integration kurz auf eine Push-Bestätigung. Bleibt sie aus, wird gezielt nur das geschriebene Objekt gelesen. Ein vollständiger Datenabruf dient ausschließlich als Rückfalllösung.

### Schreibprofil „GLT → Wert setzen → AS“

Dieses Profil ist für Analog Values vorgesehen, bei denen dieselbe Objekt-ID für GLT-/AS-Umschaltung und Sollwert verwendet wird:

1. zugehörigen Binary Value auf GLT setzen
2. konfigurierbare Wartezeit abwarten
3. Analog Value schreiben
4. AS-Wartezeit abwarten
5. Binary Value auf AS zurückstellen
6. optional Priorität von Binary Value und Analog Value freigeben

Die Rückkehr zu AS wird auch dann versucht, wenn der eigentliche Schreibvorgang fehlschlägt.

### Schreibprofil „GLT → Stufe setzen“

Dieses Profil ist für Multi-State Outputs vorgesehen:

1. zugehörigen Binary Value auf GLT setzen
2. konfigurierbare Wartezeit abwarten
3. gewünschte Stufe auf den Multi-State Output schreiben

## BACnet-Prioritäten freigeben

Die Integration stellt drei Home-Assistant-Aktionen bereit:

- `bepacom.release_analog_value_priority`
- `bepacom.release_multistate_output_priority`
- `bepacom.release_binary_value_priority`

Beispiel für die Freigabe eines Binary Value auf Priorität 8:

```yaml
action: bepacom.release_binary_value_priority
data:
  device_id: 1
  object_id: 82476
  priority: 8
```

Beispiel für einen Multi-State Output:

```yaml
action: bepacom.release_multistate_output_priority
data:
  device_id: 1
  object_id: 82476
  priority: 8
```

Sind mehrere Bepacom-Verbindungen eingerichtet, muss zusätzlich `config_entry_id` angegeben werden.

Beim Freigeben kann das Gateway einen leeren `presentValue` zusammen mit `relinquishDefault` liefern. Die Integration verwendet in diesem Fall den BACnet-Rückfallwert, damit Home Assistant nicht dauerhaft den zuvor geschriebenen Zustand anzeigt.

## Virtuelle Binary-Sensoren

Aus einem BACnet-Sensor oder Multi-State Input können im Explorer virtuelle Binary-Sensoren erzeugt werden. Für jede virtuelle Entität lassen sich definieren:

- Name und Unique ID
- Home-Assistant-Device-Class
- Bedingung für `on`
- Bedingung für `off`
- Verhalten für alle übrigen Werte: `unknown` oder `unavailable`

Unterstützt werden unter anderem:

- einzelne Werte, beispielsweise `2`
- Textwerte wie `active` oder `inactive`
- mehrere Alternativen, beispielsweise `alarm,fault`
- Vergleiche wie `>2`, `<=10`, `==3` oder `!=0`
- Bereiche

Die virtuellen Entitäten verwenden den Zustand des ausgewählten BACnet-Quellobjekts und werden gemeinsam mit diesem aktualisiert.

## Entity-IDs und Migration

Neue Entitäten erhalten stabile IDs, zum Beispiel:

```text
sensor.bepacom_1_analoginput_601
number.bepacom_1_multistateoutput_82476
switch.bepacom_1_binaryvalue_82476
```

Beim Start versucht die Integration, ältere automatisch erzeugte Entity-IDs auf dieses stabile Schema zu migrieren. Bereits manuell belegte Ziel-IDs werden nicht überschrieben; ein entsprechender Hinweis erscheint im Log.

## Performance

Version 1.0.0 ist auf größere BACnet-Installationen ausgelegt:

- unveränderte Push-Werte werden vor Home Assistant herausgefiltert
- nur die tatsächlich betroffene Entität schreibt einen neuen HA-Zustand
- der Explorer lädt zyklisch nur kompakte Laufzeitdaten
- GUI-Aktualisierungen pausieren in inaktiven Browser-Tabs
- Schreibbestätigungen lesen gezielt ein Objekt statt die gesamte BACnet-Datenbank
- Historien sind begrenzt und werden im Browser nur für den ausgewählten Punkt geführt
- fehlerhafte Schreibbestätigungen werden zu einem gemeinsamen vollständigen Fallback-Abruf zusammengefasst

## Fehlerdiagnose

### Integration kann nicht eingerichtet werden

- prüfen, ob das Bepacom-Add-on läuft
- Host und Port kontrollieren
- Erreichbarkeit der Add-on-API aus dem Home-Assistant-Netz prüfen
- Add-on- und Home-Assistant-Protokoll kontrollieren

### Entität aktualisiert sich nicht

- im BACnet Explorer den Subscription- und Polling-Status prüfen
- kontrollieren, ob der BACnet-Punkt im Gateway einen neuen Wert liefert
- bei Bedarf Push-Wert-Protokollierung vorübergehend aktivieren
- auf Meldungen zu Subscription, Heartbeat oder Fallback-Polling achten

### Explorer zeigt nach einem Update die alte Version

1. Home Assistant vollständig neu starten.
2. Browser-Seite mit geleertem Cache neu laden.
3. In der Explorer-Kopfzeile Version und Frontend-Build prüfen.

### Debug-Protokollierung

```yaml
logger:
  default: info
  logs:
    custom_components.bepacom: debug
```

Debug-Protokollierung kann sehr viele Meldungen erzeugen und sollte nach der Fehlersuche wieder deaktiviert werden.

## Aktualisierung

1. Neue Version über HACS installieren oder den Integrationsordner manuell ersetzen.
2. Home Assistant vollständig neu starten.
3. Browser-Cache neu laden, falls der Explorer noch den vorherigen Frontend-Build zeigt.
4. Nach größeren Updates die Bepacom-Integration einmal neu laden und die Diagnose im Explorer prüfen.

Vor einem Update empfiehlt sich eine Sicherung der Home-Assistant-Konfiguration.

## Datenschutz und Netzwerk

Die Kommunikation erfolgt lokal zwischen Home Assistant und der konfigurierten Bepacom-Schnittstelle. Die Integration benötigt selbst keinen Cloud-Dienst. Ob das verwendete Add-on weitere Netzwerkverbindungen benötigt, ist dessen eigener Dokumentation zu entnehmen.

## Support

Bei Problemen sollten folgende Informationen angegeben werden:

- Version der Integration und Frontend-Build
- Home-Assistant-Version
- Version und Konfiguration des Bepacom-Add-ons
- betroffene BACnet Device-ID, Objektart und Objekt-ID
- relevante Diagnosewerte aus dem BACnet Explorer
- ein zeitlich begrenzter Debug-Logausschnitt rund um den Fehler

Fehler und Funktionswünsche können über den Issue-Bereich des GitHub-Repositories gemeldet werden.

## Danksagung

Die Integration setzt auf der Schnittstelle des Projekts **[Bepacom-Raalte/bepacom-HA-Addons](https://github.com/Bepacom-Raalte/bepacom-HA-Addons)** auf. Vielen Dank an die Beteiligten für die Bereitstellung der Home-Assistant-/BACnet-Gateway-Funktionalität.
