# Bepacom BACnet/IP Home Assistant Integration

Home Assistant integration für die Bepacom BACnet/IP Interface.

Diese Integration ermöglicht die Verbindung zu einem Bepacom BACnet/IP Gateway und die Überwachung von BACnet-Geräten und -Objekten direkt in Home Assistant.

## Installation

### Über HACS (empfohlen)

1. Öffne Home Assistant und navigiere zu **HACS**
2. Klicke auf **Integrationen**
3. Suche nach **Bepacom**
4. Klicke auf **Installieren**
5. Starte Home Assistant neu

### Manuelle Installation

1. Lade den Inhalt dieses Repositories herunter
2. Kopiere den `custom_components/bepacom` Ordner in dein Home Assistant `custom_components` Verzeichnis
3. Starte Home Assistant neu

## Konfiguration

### Über die UI

1. Gehe zu **Einstellungen > Geräte und Dienste > Integrationen**
2. Klicke auf **+ Neue Integration erstellen**
3. Suche nach **Bepacom** und klicke darauf
4. Gib die Host-Adresse und den Port deines Bepacom Gateways ein (Standard: 8099)
5. Klicke auf **Absenden**

Die Integration wird automatisch BACnet-Geräte und -Objekte erkennen und als Sensoren verfügbar machen.

## Funktionen

- 🔍 Automatische Erkennung von BACnet-Geräten
- 📊 Überwachung von BACnet-Objekten (Sensoren, Werte, etc.)
- 🔄 Regelmäßige Datenabfrage (standardmäßig alle 30 Sekunden)
- 📱 Vollständige Integration mit Home Assistant UI

## Anforderungen

- Home Assistant 2023.12 oder höher
- Bepacom BACnet/IP Gateway (erreichbar im lokalen Netzwerk)

## Bekannte Limitierungen

- Diese Version ist **Alpha** und wird noch aktiv entwickelt
- Nur Lesezugriff auf BACnet-Objekte (Schreiben wird in zukünftigen Versionen unterstützt)
- Es werden derzeit nur einfache Sensoren erstellt

## Troubleshooting

### Integration verbindet sich nicht

- Überprüfe die Host-Adresse und den Port deines Bepacom Gateways
- Stelle sicher, dass das Gateway im selben Netzwerk erreichbar ist
- Prüfe deine Firewall-Einstellungen

### Keine Sensoren werden erstellt

- Überprüfe die Home Assistant Logs auf Fehler
- Stelle sicher, dass dein Bepacom Gateway BACnet-Objekte enthält
- Die Integration sucht nach Geräten mit dem Präfix `device:` in der API-Response

## Support

Für Bugs, Feature-Requests oder Fragen, bitte öffne ein [Issue](https://github.com/engelsofta/bepacom/issues).

## Lizenz

[Siehe LICENSE Datei](LICENSE)
