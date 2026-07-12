{
  "config": {
    "step": {
      "user": {
        "title": "Bepacom Gateway",
        "description": "Bitte Host und Port eingeben.",
        "data": {
          "host": "Host",
          "port": "Port"
        }
      }
    },
    "error": {
      "cannot_connect": "Verbindung fehlgeschlagen.",
      "unknown": "Unbekannter Fehler."
    },
    "abort": {
      "already_configured": "Gateway ist bereits eingerichtet."
    }
  },
  "options": {
    "step": {
      "init": {
        "title": "Bepacom Optionen",
        "description": "Allgemeine Grundeinstellungen. Objektverwaltung, Overrides, Subscribe/Polling, Explorer und Bulk-Edit erfolgen über die Sidebar „BACnet Explorer“.",
        "menu_options": {
          "general": "Allgemeine Einstellungen"
        }
      },
      "general": {
        "title": "Allgemeine Einstellungen",
        "description": "Hier bleiben nur globale Basisoptionen. BACnet-Objekte, Subscribe/Polling und Overrides werden ausschließlich in der Sidebar „BACnet Explorer“ bearbeitet.",
        "data": {
          "enable_polling": "Zyklische Datenaktualisierung aktivieren",
          "snapshot_websocket_mode": "Snapshot-WebSocket-Modus",
          "push_value_logging": "Push-Werte protokollieren",
          "heartbeat_timeout": "Heartbeat-Timeout"
        }
      }
    },
    "error": {},
    "abort": {
      "no_objects": "Es wurden noch keine BACnet Objekte gefunden. Starte Home Assistant neu oder warte, bis die Discovery abgeschlossen ist."
    }
  }
}