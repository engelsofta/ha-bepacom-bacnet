class BepacomExplorerPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._entryId = null;
    this._points = [];
    this._entries = [];
    this._selected = null;
    this._inspector = {};
    this._loading = false;
    this._saving = false;
    this._error = null;
    this._message = null;
    this._filters = {
      search: "",
      object_type: "all",
      only_overrides: false,
      only_subscribe: false,
      device_id: "all",
    };
    this._refreshTimer = null;
    this._debounce = null;
    this._diagnostics = {};
    this._historyByUid = new Map();
    this._clientHistory = new Map();
    this._clientValueChangeCount = new Map();
    this._lastSeenValues = new Map();
    this._writing = false;
    this._statusOpen = this._loadStatusOpen();
    this._groupBy = this._loadSetting("bepacom_group_by", "none");
    this._sortKey = this._loadSetting("bepacom_sort_key", "object_key");
    this._sortDir = this._loadSetting("bepacom_sort_dir", "asc");
    // Rechte Detail-/Konfigurationsspalte standardmäßig ausblenden, damit die Tabelle mehr Platz hat.
    this._detailsVisible = this._loadSetting("bepacom_details_visible", "0") === "1";
    this._selectedIds = new Set();
    this._visibleStart = 0;
    this._rowHeight = 52;
    this._overscan = 8;
    this._lastTableScrollTop = 0;
    this._recentValueChanges = new Map();
    this._recentValueDirections = new Map();
    this._keyboardHandler = (ev) => this._handleKeyboard(ev);
    this._rootClickHandler = (ev) => this._handleRootClick(ev);
    this._editorDirty = false;
    this._manualReloadRunning = false;
    this._manualReloadUntil = 0;
  }

  connectedCallback() {
    this._entryId = this.panel?.config?.entry_id || null;
    window.addEventListener("keydown", this._keyboardHandler);
    this.shadowRoot.addEventListener("click", this._rootClickHandler);
    this._loadEntries();
    this._loadPoints(false);
    this._refreshTimer = window.setInterval(() => this._refreshPointsInPlace(), 5000);
    this._render();
  }

  disconnectedCallback() {
    if (this._refreshTimer) {
      window.clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
    if (this._debounce) window.clearTimeout(this._debounce);
    window.removeEventListener("keydown", this._keyboardHandler);
    this.shadowRoot.removeEventListener("click", this._rootClickHandler);
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._hasHass) {
      this._hasHass = true;
      this._loadEntries();
      this._loadPoints(false);
    }
  }

  get hass() {
    return this._hass;
  }

  async _loadEntries() {
    if (!this.hass) return;
    try {
      const result = await this.hass.callWS({ type: "bepacom/explorer/entries" });
      this._entries = result.entries || [];
      if (!this._entryId && this._entries.length) this._entryId = this._entries[0].entry_id;
      this._render();
    } catch (err) {
      this._error = this._formatError(err);
      this._render();
    }
  }

  async _loadPoints(showLoading = true) {
    if (!this.hass) return;
    if (showLoading) this._loading = true;
    this._error = null;
    if (showLoading) this._render();

    try {
      const result = await this.hass.callWS({
        type: "bepacom/explorer/points",
        entry_id: this._entryId || undefined,
        search: this._filters.search,
        object_type: this._filters.object_type,
        only_overrides: this._filters.only_overrides,
        only_subscribe: this._filters.only_subscribe,
        include_disabled: true,
        limit: 2000,
      });
      this._entryId = result.entry_id || this._entryId;
      this._points = result.points || [];
      this._diagnostics = result.diagnostics || {};
      this._trackClientHistory(this._points);
      this._total = result.total || this._points.length;
      this._limited = !!result.limited;
      if (this._selected) {
        const updated = this._points.find((p) => p.unique_id === this._selected.unique_id);
        if (updated) this._selected = updated;
      }
    } catch (err) {
      this._error = this._formatError(err);
    } finally {
      this._loading = false;
      this._render();
    }
  }



  async _refreshPointsInPlace() {
    if (!this.hass || !this._entryId) return;
    // Während der Benutzer tippt oder rechts editiert, darf der Auto-Refresh
    // die DOM-Struktur nicht neu aufbauen. Sonst verlieren Eingabefelder den
    // Fokus und die Tabelle springt nach oben.
    try {
      const result = await this.hass.callWS({
        type: "bepacom/explorer/points",
        entry_id: this._entryId || undefined,
        search: this._filters.search,
        object_type: this._filters.object_type,
        only_overrides: this._filters.only_overrides,
        only_subscribe: this._filters.only_subscribe,
        include_disabled: true,
        limit: 2000,
      });
      this._entryId = result.entry_id || this._entryId;
      this._points = result.points || [];
      this._diagnostics = result.diagnostics || {};
      this._trackClientHistory(this._points);
      this._total = result.total || this._points.length;
      this._limited = !!result.limited;
      if (this._selected) {
        const updated = this._points.find((p) => p.unique_id === this._selected.unique_id);
        if (updated) {
          this._selected = { ...this._selected, ...updated };
          this._updateDetailDom();
        }
      }
      this._updateListDom();
      this._updateHeaderDom();
    } catch (err) {
      this._error = this._formatError(err);
      this._render();
    }
  }

  _updateDetailDom() {
    if (!this._detailsVisible) return;
    const side = this.shadowRoot?.querySelector(".side");
    if (!side || !this._selected) return;

    const active = this.shadowRoot?.activeElement;
    if (active && side.contains(active)) {
      // Während der Benutzer im rechten Editor tippt, die Felder nicht neu zeichnen.
      return;
    }

    side.innerHTML = this._detailHtml(this._selected);
    this._bindEvents();
  }

  _updateHeaderDom() {
    const subtitle = this.shadowRoot?.getElementById("subtitle");
    if (subtitle) {
      subtitle.textContent = `Sidebar-Ansicht für gefundene BACnet-Objekte${this._total !== undefined ? ` · ${this._points.length} von ${this._total}` : ""}${this._limited ? " · Liste begrenzt" : ""}`;
    }
    const dashboard = this.shadowRoot?.getElementById("dashboard");
    if (dashboard) {
      dashboard.innerHTML = this._dashboardHtml();
      this._bindDashboardToggle();
    }
  }

  _updateListDom() {
    const wrap = this.shadowRoot?.getElementById("tableWrap");
    const body = this.shadowRoot?.getElementById("pointsBody");
    if (!wrap) return;

    const scrollTop = wrap.scrollTop;
    this._lastTableScrollTop = scrollTop;

    if (!this._points.length) {
      wrap.innerHTML = `<div id="emptyState" class="empty">Keine BACnet-Objekte gefunden.</div>`;
      wrap.scrollTop = scrollTop;
      return;
    }

    if (!body) {
      wrap.innerHTML = `<table><thead><tr>${this._tableHeaderHtml()}</tr></thead><tbody id="pointsBody">${this._rowsHtml()}</tbody></table>`;
    } else {
      body.innerHTML = this._rowsHtml();
    }
    this._bindEvents();
    const nextWrap = this.shadowRoot?.getElementById("tableWrap");
    if (nextWrap) nextWrap.scrollTop = scrollTop;
  }

  _formatError(err) {
    if (!err) return "Unbekannter Fehler";
    return err.message || err.code || JSON.stringify(err);
  }

  _setFilter(key, value) {
    this._filters[key] = value;
    if (this._debounce) window.clearTimeout(this._debounce);
    // Wichtig: beim Tippen NICHT die komplette Seite neu rendern.
    // Sonst verliert das Suchfeld den Fokus. Nur die Datenzeilen werden
    // nachgeladen und gezielt aktualisiert.
    this._debounce = window.setTimeout(() => this._refreshPointsInPlace(), 250);
  }

  _selectPoint(point) {
    this._editorDirty = false;
    this._manualReloadRunning = false;
    this._manualReloadUntil = 0;
    this._selected = point;
    this._message = null;
    // Wichtig: Der Verlauf ist je BACnet-Punkt getrennt. Beim Wechsel der
    // Auswahl darf kein alter Verlauf einer anderen Entität übernommen werden.
    this._loadInspector(point.unique_id);
    this._render();
  }

  async _loadInspector(uniqueId) {
    if (!this.hass) return;
    try {
      const result = await this.hass.callWS({
        type: "bepacom/explorer/point",
        entry_id: this._entryId || undefined,
        unique_id: uniqueId,
      });
      this._selected = result.point;
      this._inspector = result.inspector || {};
      this._setHistoryForSelected(result.history || [], uniqueId);
    } catch (err) {
      this._error = this._formatError(err);
    }
    this._render();
  }

  async _saveSelected() {
    if (!this.hass || !this._selected) return;
    const unit = this.shadowRoot.getElementById("editUnit")?.value || "__auto__";
    const deviceClass = this.shadowRoot.getElementById("editDeviceClass")?.value || "auto";
    const stateClass = this.shadowRoot.getElementById("editStateClass")?.value || "auto";
    const updateMode = this.shadowRoot.getElementById("editUpdateMode")?.value || "disabled";
    const entityId = this.shadowRoot.getElementById("editEntityId")?.value || "";
    const entityName = this.shadowRoot.getElementById("editEntityName")?.value ?? "";

    this._editorDirty = false;
    this._manualReloadRunning = false;
    this._manualReloadUntil = 0;
    this._saving = true;
    this._message = null;
    this._error = null;

    try {
      const result = await this.hass.callWS({
        type: "bepacom/explorer/save_override",
        entry_id: this._entryId || undefined,
        unique_id: this._selected.unique_id,
        unit,
        device_class: deviceClass,
        state_class: stateClass,
        update_mode: updateMode,
        entity_id: entityId,
        entity_name: entityName,
      });
      this._selected = result.point;
      this._inspector = result.inspector || {};
      this._setHistoryForSelected(result.history || [], this._selected?.unique_id);
      this._message = "Gespeichert. Die Integration wird nicht automatisch neu geladen. Wenn du mit allen Änderungen fertig bist, nutze oben 'Integration neu laden'.";
      await this._loadPoints(false);
    } catch (err) {
      this._error = this._formatError(err);
    } finally {
      this._saving = false;
      this._render();
    }
  }

  async _resetSelected() {
    if (!this.hass || !this._selected) return;
    this._editorDirty = false;
    this._manualReloadRunning = false;
    this._manualReloadUntil = 0;
    this._saving = true;
    this._message = null;
    this._error = null;

    try {
      const result = await this.hass.callWS({
        type: "bepacom/explorer/reset_override",
        entry_id: this._entryId || undefined,
        unique_id: this._selected.unique_id,
      });
      this._selected = result.point;
      this._inspector = result.inspector || {};
      this._setHistoryForSelected(result.history || [], this._selected?.unique_id);
      this._message = "Override zurückgesetzt. Spätestens nach einem Reload der Integration ist alles vollständig wirksam.";
      await this._loadPoints(false);
    } catch (err) {
      this._error = this._formatError(err);
    } finally {
      this._saving = false;
      this._render();
    }
  }


  async _reloadIntegration() {
    if (!this.hass || !this._entryId) return;
    const now = Date.now();
    if (this._manualReloadRunning || now < this._manualReloadUntil) {
      this._message = "Integration wird bereits neu geladen. Bitte einen Moment warten.";
      this._render();
      return;
    }

    this._manualReloadRunning = true;
    this._manualReloadUntil = now + 15000;
    this._saving = true;
    this._message = "Integration wird neu geladen …";
    this._error = null;
    if (this._refreshTimer) {
      window.clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
    this._render();
    try {
      const result = await this.hass.callWS({
        type: "bepacom/explorer/reload_entry",
        entry_id: this._entryId || undefined,
      });
      if (result && result.scheduled === false) {
        this._message = "Integration wird bereits neu geladen. Bitte kurz warten.";
      } else {
        this._message = "Neuladen wurde gestartet. Die Ansicht wird gleich aktualisiert.";
      }
      // Während des Reloads keine weiteren Reloads oder Auto-Refreshes auslösen.
      window.setTimeout(async () => {
        this._manualReloadRunning = false;
        this._saving = false;
        try {
          await this._loadEntries();
          await this._loadPoints(false);
          this._message = "Integration wurde neu geladen.";
        } catch (err) {
          this._error = this._formatError(err);
        } finally {
          if (!this._refreshTimer) {
            this._refreshTimer = window.setInterval(() => this._refreshPointsInPlace(), 5000);
          }
          this._render();
        }
      }, 8000);
    } catch (err) {
      this._manualReloadRunning = false;
      this._saving = false;
      this._error = this._formatError(err);
      if (!this._refreshTimer) {
        this._refreshTimer = window.setInterval(() => this._refreshPointsInPlace(), 5000);
      }
      this._render();
    }
  }

  _comparableValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "boolean") return value;
    const text = String(value).trim();
    if (text === "") return "";
    const num = Number(text);
    if (Number.isFinite(num)) return Number(num.toFixed(10));
    return text;
  }

  _sameValue(a, b) {
    return this._comparableValue(a) === this._comparableValue(b);
  }

  _changeDirection(previous, value) {
    const oldValue = this._comparableValue(previous);
    const newValue = this._comparableValue(value);
    if (typeof oldValue === "number" && typeof newValue === "number") {
      if (newValue > oldValue) return "up";
      if (newValue < oldValue) return "down";
    }
    return "changed";
  }

  _trackClientHistory(points) {
    const now = new Date().toISOString();
    for (const point of points || []) {
      if (!point?.unique_id) continue;
      const uid = point.unique_id;
      const list = this._clientHistory.get(uid) || [];
      const value = point.present_value;
      const hadPrevious = this._lastSeenValues.has(uid);
      const previous = this._lastSeenValues.get(uid);
      const changed = !hadPrevious || !this._sameValue(previous, value);

      if (changed) {
        list.push({ ts: point.last_update || now, value, source: point.last_update_source || "refresh" });
        if (list.length > 300) list.splice(0, list.length - 300);
        this._clientHistory.set(uid, list);
        this._lastSeenValues.set(uid, value);
        if (hadPrevious) {
          this._clientValueChangeCount.set(uid, (this._clientValueChangeCount.get(uid) || 0) + 1);
          this._markValueChanged(uid, this._changeDirection(previous, value));
        }
      }
    }
  }


  _markValueChanged(uid, direction = "changed") {
    if (!uid) return;
    this._recentValueChanges.set(uid, Date.now());
    this._recentValueDirections.set(uid, direction);
    window.setTimeout(() => {
      const ts = this._recentValueChanges.get(uid);
      if (ts && Date.now() - ts >= 4000) {
        this._recentValueChanges.delete(uid);
        this._recentValueDirections.delete(uid);
        this._updateListDom();
      }
    }, 4100);
  }

  _isRecentlyChanged(uid) {
    const ts = this._recentValueChanges.get(uid);
    if (!ts) return false;
    if (Date.now() - ts > 4000) {
      this._recentValueChanges.delete(uid);
      this._recentValueDirections.delete(uid);
      return false;
    }
    return true;
  }

  _valueChangeClass(uid) {
    if (!this._isRecentlyChanged(uid)) return "";
    const direction = this._recentValueDirections.get(uid) || "changed";
    return `value-flash value-${direction}`;
  }

  _isEditableTarget(target, ev = null) {
    // Keyboard shortcuts are registered on window. Events coming from inside
    // this shadow DOM are retargeted to the custom element, so checking only
    // ev.target is not enough. Use the original composed path to avoid
    // shortcuts like Enter/Esc/Arrow keys while the user is editing fields.
    const candidates = [];
    if (ev && typeof ev.composedPath === "function") candidates.push(...ev.composedPath());
    if (target) candidates.push(target);
    return candidates.some((node) => {
      const tag = node?.tagName;
      return ["INPUT", "SELECT", "TEXTAREA", "HA-TEXTFIELD", "HA-SELECT"].includes(tag) || !!node?.isContentEditable;
    });
  }

  _visiblePointItems() {
    return this._displayItems().filter((item) => item.kind === "point").map((item) => item.point);
  }

  _selectRelative(delta) {
    const points = this._visiblePointItems();
    if (!points.length) return;
    const currentUid = this._selected?.unique_id;
    let idx = points.findIndex((p) => p.unique_id === currentUid);
    if (idx < 0) idx = delta > 0 ? -1 : 0;
    const nextIdx = Math.max(0, Math.min(points.length - 1, idx + delta));
    const next = points[nextIdx];
    if (!next) return;
    this._selectPoint(next);
    window.setTimeout(() => this._scrollSelectedIntoView(), 0);
  }

  _scrollSelectedIntoView() {
    if (!this._selected?.unique_id) return;
    const row = this.shadowRoot?.querySelector(`tr[data-uid="${this._cssEscape(this._selected.unique_id)}"]`);
    if (row) row.scrollIntoView({ block: "nearest" });
  }

  _openDetailsFor(point) {
    if (point) this._selected = point;
    if (!this._detailsVisible) {
      this._detailsVisible = true;
      this._setSetting("bepacom_details_visible", "1");
    }
    if (this._selected) this._loadInspector(this._selected.unique_id);
    else this._render();
  }

  _closeDetails() {
    if (!this._detailsVisible) return;
    this._detailsVisible = false;
    this._setSetting("bepacom_details_visible", "0");
    this._render();
  }

  _handleRootClick(ev) {
    const path = typeof ev.composedPath === "function" ? ev.composedPath() : [];
    const save = path.find((node) => node?.id === "saveOverride");
    const reset = path.find((node) => node?.id === "resetOverride");
    if (save) {
      ev.preventDefault();
      ev.stopPropagation();
      this._saveSelected();
      return;
    }
    if (reset) {
      ev.preventDefault();
      ev.stopPropagation();
      this._resetSelected();
      return;
    }
  }

  _handleKeyboard(ev) {
    if (!this.isConnected || ev.defaultPrevented) return;
    if (this._isEditableTarget(ev.target, ev)) return;
    if (ev.key === "Escape") {
      ev.preventDefault();
      this._closeDetails();
      return;
    }
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      this._selectRelative(1);
      return;
    }
    if (ev.key === "ArrowUp") {
      ev.preventDefault();
      this._selectRelative(-1);
      return;
    }
    if (ev.key === "Enter") {
      if (this._selected?.entity_id) {
        ev.preventDefault();
        this._openMoreInfo(this._selected.entity_id);
      }
    }
  }

  async _writeSelected() {
    if (!this.hass || !this._selected) return;
    const value = this.shadowRoot.getElementById("writeValue")?.value;
    const priority = Number(this.shadowRoot.getElementById("writePriority")?.value || 8);
    if (value === undefined || value === null || String(value).trim() === "") {
      this._error = "Bitte einen Schreibwert eintragen.";
      this._render();
      return;
    }
    this._writing = true;
    this._message = null;
    this._error = null;
    this._render();
    try {
      const result = await this.hass.callWS({
        type: "bepacom/explorer/write_property",
        entry_id: this._entryId || undefined,
        unique_id: this._selected.unique_id,
        value,
        priority,
      });
      this._selected = result.point;
      this._inspector = result.inspector || {};
      this._setHistoryForSelected(result.history || [], this._selected?.unique_id);
      this._message = "BACnet-Wert wurde geschrieben.";
      await this._refreshPointsInPlace();
    } catch (err) {
      this._error = this._formatError(err);
    } finally {
      this._writing = false;
      this._render();
    }
  }

  _download(filename, content, type = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    this.shadowRoot.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  _exportJson() {
    this._download("bepacom_bacnet_objects.json", JSON.stringify(this._points, null, 2), "application/json;charset=utf-8");
  }

  _exportCsv() {
    const headers = ["object_key","object_name","description","entity_id","present_value","bacnet_unit","ha_unit","device_class","state_class","override_active","update_mode","subscribed","enabled","writable","last_update"];
    const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const rows = [headers.join(";")].concat(this._points.map((p) => headers.map((h) => esc(p[h])).join(";")));
    this._download("bepacom_bacnet_objects.csv", rows.join("\n"), "text/csv;charset=utf-8");
  }

  _exportExcel() {
    const headers = ["Objekt","Name","Beschreibung","HA Entität","Wert","BACnet Unit","HA Unit","Device Class","State Class","Override","Subscribe","Subscribed","Aktiv","Schreibbar","Letztes Update"];
    const keys = ["object_key","object_name","description","entity_id","present_value","bacnet_unit","ha_unit","device_class","state_class","override_active","update_mode","subscribed","enabled","writable","last_update"];
    const rows = this._points.map((p) => `<tr>${keys.map((k) => `<td>${this._escape(p[k])}</td>`).join("")}</tr>`).join("");
    const html = `<html><head><meta charset="utf-8"></head><body><table><thead><tr>${headers.map((h) => `<th>${this._escape(h)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
    this._download("bepacom_bacnet_objects.xls", html, "application/vnd.ms-excel;charset=utf-8");
  }

  _loadStatusOpen() {
    try {
      const stored = window.localStorage.getItem("bepacom_status_open");
      return stored === "1" || stored === "true";
    } catch (_) {
      return false;
    }
  }

  _setStatusOpen(open) {
    this._statusOpen = !!open;
    try {
      window.localStorage.setItem("bepacom_status_open", this._statusOpen ? "1" : "0");
    } catch (_) {}
    // Nur den Dashboard-Bereich neu zeichnen. Alle anderen DOM-Bereiche bleiben
    // unverändert, damit Fokus, Tabellen-Scroll und Auswahl stabil bleiben.
    this._updateHeaderDom();
  }

  _clientValueChangeTotal() {
    let total = 0;
    for (const value of this._clientValueChangeCount.values()) total += Number(value) || 0;
    return total;
  }

  _dashboardValueChanges(d = {}) {
    const backend = Number(d.value_changes ?? 0) || 0;
    const client = this._clientValueChangeTotal();
    // Backend ist die Quelle der Wahrheit. Falls es nach einem Reload noch nicht
    // weiterzählt, zeigt der Explorer mindestens die im Browser erkannten
    // Änderungen seit dem Öffnen des Panels.
    return Math.max(backend, client);
  }

  _dashboardHtml() {
    const d = this._diagnostics || {};
    const configured = [
      ["BACnet-Punkte", d.objects ?? this._total ?? "-"],
      ["Aktive Entitäten", d.enabled ?? "-"],
      ["Deaktiviert", d.configured_disabled ?? d.disabled ?? "-"],
      ["Push konfiguriert", d.configured_push ?? "-"],
      ["Polling konfiguriert", d.configured_polling ?? "-"],
      ["Overrides", d.overrides ?? "-"],
    ];
    const valueChanges = this._dashboardValueChanges(d);
    const runtime = [
      ["Verbunden", d.connected === undefined ? "-" : (d.connected ? "Ja" : "Nein")],
      ["Aktive Subscriptions", d.subscribed ?? d.subscriptions ?? "-"],
      ["Aktives Polling", d.fallback_polling ?? d.fallback_objects ?? "-"],
      ["Push-Nachrichten", d.bacnet_push_notifications ?? d.websocket_updates ?? d.push_count ?? "-"],
      ["Ø Push-Verarbeitung ms", d.dispatch_time_avg_ms === undefined ? "-" : Number(d.dispatch_time_avg_ms).toFixed(2)],
      ["Echte Wertänderungen", valueChanges],
      ["Reconnects", d.reconnect_count ?? "-"],
    ];
    const developer = [
      ["Direkt-Pushs", d.websocket_direct_messages ?? "-"],
      ["Snapshot-Pushs", d.websocket_snapshot_messages ?? "-"],
      ["Fallback-Pushs", d.websocket_fallback_messages ?? "-"],
      ["Payload geprüft", d.websocket_payload_objects ?? "-"],
      ["Payload verarbeitet", d.websocket_processed_objects ?? "-"],
      ["Payload ignoriert", d.websocket_ignored_objects ?? "-"],
      ["Vor Callback gefiltert", d.websocket_prefiltered_no_change_objects ?? "-"],
      ["Callback-Aufrufe", d.websocket_callback_invocations ?? "-"],
      ["Callbacks mit Änderung", d.websocket_callback_value_changes ?? "-"],
      ["Callbacks ohne Änderung", d.websocket_callback_no_changes ?? "-"],
      ["Push-Punktupdates", d.processed_push_updates ?? d.push_updates ?? "-"],
      ["Polling-Punktupdates", d.processed_polling_updates ?? d.polling_updates ?? "-"],
      ["Unterdrückte gleiche Werte", d.suppressed_updates ?? "-"],
      ["Max Push-Verarbeitung ms", d.dispatch_time_max_ms === undefined ? "-" : Number(d.dispatch_time_max_ms).toFixed(2)],
    ];
    const renderCards = (cards) => cards.map(([label, value]) => {
      const icon = this._statusIcon(label, value);
      const cls = this._statusClass(label, value);
      return `<div class="stat ${cls}"><div class="stat-line"><span class="stat-icon">${icon}</span><div><div class="stat-value">${this._escape(value)}</div><div class="stat-label">${this._escape(label)}</div></div></div></div>`;
    }).join("");
    const open = !!this._statusOpen;
    const showDeveloper = !!d.push_value_logging;
    const summary = [
      `Punkte: ${d.objects ?? this._total ?? "-"}`,
      `aktiv: ${d.enabled ?? "-"}`,
      `Push: ${d.configured_push ?? "-"}/${d.subscribed ?? "-"}`,
      `Polling: ${d.configured_polling ?? "-"}/${d.fallback_polling ?? "-"}`,
      `Änderungen: ${valueChanges}`,
      `Push-Nachrichten: ${d.bacnet_push_notifications ?? d.websocket_updates ?? d.push_count ?? "-"}`,
    ].join(" · ");
    return `
      <section class="dashboard-shell ${open ? "open" : "closed"}">
        <button id="toggleDashboard" class="dashboard-toggle" type="button" title="Status ein-/ausklappen">
          <span class="chevron">${open ? "▾" : "▸"}</span>
          <span class="dashboard-toggle-title">Status / Laufzeit</span>
          <span class="dashboard-summary">${this._escape(summary)}</span>
        </button>
        ${open ? `<div class="dashboard-content">
          <section class="dashboard-group">
            <div class="dashboard-title">Konfiguration</div>
            <div class="dashboard-cards">${renderCards(configured)}</div>
          </section>
          <section class="dashboard-group">
            <div class="dashboard-title">System / Laufzeit</div>
            <div class="dashboard-cards">${renderCards(runtime)}</div>
          </section>
          ${showDeveloper ? `<section class="dashboard-group dashboard-group-wide">
            <div class="dashboard-title">Entwickler / Push-Diagnose</div>
            <div class="dashboard-cards">${renderCards(developer)}</div>
          </section>` : ""}
        </div>` : ""}
      </section>
    `;
  }


  _statusIcon(label, value) {
    if (label.includes("Verbunden")) return value === "Ja" ? "🟢" : "🔴";
    if (label.includes("Subscription") || label.includes("Push")) return "📡";
    if (label.includes("Polling")) return "🔄";
    if (label.includes("Wert")) return "📈";
    if (label.includes("Reconnect")) return "🔌";
    if (label.includes("Verarbeitung")) return "⏱️";
    if (label.includes("Override")) return "✏️";
    if (label.includes("Entit")) return "🏷️";
    if (label.includes("Punkte") || label.includes("Objekte")) return "🧩";
    return "•";
  }

  _statusClass(label, value) {
    if (label.includes("Verbunden")) return value === "Ja" ? "stat-ok" : "stat-bad";
    if (label.includes("Reconnect") && Number(value) > 0) return Number(value) > 10 ? "stat-bad" : "stat-warn";
    if (label.includes("Verarbeitung") && Number(value) > 5) return "stat-warn";
    if (label.includes("Deaktiviert") && Number(value) > 0) return "stat-muted";
    return "";
  }
  _setHistoryForSelected(history, uniqueId = null) {
    const uid = uniqueId || this._selected?.unique_id;
    if (!uid) return;

    const incoming = Array.isArray(history) ? history : [];
    const existing = this._historyByUid.get(uid) || [];
    const merged = [];
    const seen = new Set();

    // Nur Verlauf für DIESE Entität zusammenführen. Keine globale _history mehr,
    // weil sonst beim Wechsel des ausgewählten Objekts Werte anderer Entitäten
    // in den Live-Monitor geraten.
    for (const item of [...existing, ...incoming]) {
      if (!item) continue;
      const key = `${item.ts || ""}|${String(item.value)}|${item.source || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }

    merged.sort((a, b) => String(a.ts || "").localeCompare(String(b.ts || "")));

    const compacted = [];
    for (const item of merged) {
      const previous = compacted[compacted.length - 1];
      if (previous && this._sameValue(previous.value, item.value)) continue;
      compacted.push(item);
    }
    this._historyByUid.set(uid, compacted.slice(-300));
  }

  _historyHtml() {
    const uid = this._selected?.unique_id;
    const backendHistory = uid ? (this._historyByUid.get(uid) || []) : [];
    const clientHistory = uid ? (this._clientHistory.get(uid) || []) : [];
    const merged = [];
    const seen = new Set();

    for (const item of [...backendHistory, ...clientHistory]) {
      if (!item) continue;
      const key = `${item.ts || ""}|${String(item.value)}|${item.source || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }

    merged.sort((a, b) => String(a.ts || "").localeCompare(String(b.ts || "")));
    const compacted = [];
    for (const item of merged) {
      const previous = compacted[compacted.length - 1];
      if (previous && this._sameValue(previous.value, item.value)) continue;
      compacted.push(item);
    }
    const recent = compacted.slice(-30).reverse();
    if (!recent.length) return `<div class="muted">Noch kein Verlauf vorhanden. Der Verlauf füllt sich mit eingehenden Wertänderungen.</div>`;
    return `<div class="history-list">${recent.map((item) => `<div class="history-row"><span>${this._escape(this._formatTime(item.ts))}</span><b>${this._escape(this._value(item.value))}</b><span>${this._escape(item.source || "")}</span></div>`).join("")}</div>`;
  }

  _engineeringHtml() {
    const inspector = this._inspector || {};
    const raw = inspector.raw || {};
    const rows = Object.entries(raw).length ? Object.entries(raw) : Object.entries(inspector);
    if (!rows.length) return `<div class="muted">Keine zusätzlichen Engineering-Daten vorhanden.</div>`;
    return rows.map(([k, v]) => `<div class="kv"><div class="k">${this._escape(k)}</div><div class="v"><code>${this._escape(this._value(v))}</code></div></div>`).join("");
  }

  _writeHtml(p) {
    if (!p.writable) return `<div class="muted">Dieser BACnet-Punkt ist laut Discovery nicht schreibbar.</div>`;
    return `<div class="edit-grid"><div><label>Neuer Wert</label><input id="writeValue" value="${this._escape(this._value(p.present_value))}"></div><div><label>BACnet Priority</label><select id="writePriority">${Array.from({length:16}, (_,i)=>i+1).map((v)=>`<option value="${v}" ${v===8?"selected":""}>${v}</option>`).join("")}</select></div></div><div class="actions"><button id="writeValueBtn" ${this._writing ? "disabled" : ""}>Wert schreiben${this._writing ? " …" : ""}</button></div>`;
  }

  _formatTime(ts) {
    if (!ts) return "-";
    try { return new Date(ts).toLocaleTimeString(); } catch (_) { return String(ts); }
  }

  _render() {
    if (!this.shadowRoot) return;
    const active = this.shadowRoot.activeElement;
    const focusId = active?.id || null;
    const tableScrollTop = this.shadowRoot.getElementById("tableWrap")?.scrollTop ?? 0;
    const selectionStart = typeof active?.selectionStart === "number" ? active.selectionStart : null;
    const selectionEnd = typeof active?.selectionEnd === "number" ? active.selectionEnd : null;
    const selected = this._selected;
    const styles = `
      :host { display:block; color: var(--primary-text-color); background: var(--primary-background-color); min-height:100vh; }
      .wrap { padding: 20px; max-width: 1900px; margin: 0 auto; }
      .header { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:20px; }
      h1 { margin:0; font-size:28px; font-weight:500; }
      h2 { margin:0 0 4px 0; font-size:20px; font-weight:500; }
      h3 { margin:18px 0 8px 0; font-size:15px; font-weight:600; }
      .subtitle { color: var(--secondary-text-color); margin-top:4px; }
      .toolbar { display:grid; grid-template-columns: minmax(160px, 240px) 130px 155px 165px 135px 155px 82px; gap:8px; align-items:end; margin-bottom:12px; }
      .toolbar .search-field input { max-width:240px; }
      .toolbar > div { padding:8px 10px !important; }
      .toolbar input, .toolbar select { padding:8px 10px; font-size:13px; }
      .toolbar .check { height:36px; font-size:13px; }
      .dashboard { margin-bottom:16px; }
      .dashboard-shell { border-radius:12px; background: var(--card-background-color); border:1px solid var(--divider-color); box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.18)); overflow:hidden; }
      .dashboard-toggle { width:100%; display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:0; background: var(--card-background-color); color: var(--primary-text-color); text-align:left; border:0; }
      .dashboard-toggle-title { font-weight:700; white-space:nowrap; }
      .dashboard-summary { color: var(--secondary-text-color); font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .chevron { font-size:16px; width:18px; }
      .dashboard-content { display:grid; grid-template-columns: 1fr 1.25fr; gap:12px; padding:0 12px 12px 12px; }
      .dashboard-group { border-radius:12px; background: var(--secondary-background-color); border:1px solid var(--divider-color); padding:12px; }
      .dashboard-title { font-size:13px; font-weight:700; color: var(--primary-text-color); margin-bottom:10px; }
      .dashboard-cards { display:grid; grid-template-columns: repeat(3, minmax(86px, 1fr)); gap:8px; }
      .stat { padding:9px 10px; border-radius:10px; background: var(--secondary-background-color); border:1px solid var(--divider-color); min-width:0; }
      .stat-ok { border-color: color-mix(in srgb, var(--success-color, #43a047) 45%, var(--divider-color)); background: color-mix(in srgb, var(--success-color, #43a047) 10%, var(--secondary-background-color)); }
      .stat-warn { border-color: color-mix(in srgb, var(--warning-color, #ffa600) 55%, var(--divider-color)); background: color-mix(in srgb, var(--warning-color, #ffa600) 12%, var(--secondary-background-color)); }
      .stat-bad { border-color: color-mix(in srgb, var(--error-color, #db4437) 55%, var(--divider-color)); background: color-mix(in srgb, var(--error-color, #db4437) 12%, var(--secondary-background-color)); }
      .stat-muted { opacity:.78; }
      .stat-line { display:flex; align-items:center; gap:8px; min-width:0; }
      .stat-icon { font-size:16px; width:20px; text-align:center; }
      .stat-value { font-size:17px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .stat-label { color: var(--secondary-text-color); font-size:11px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .card { background: var(--card-background-color); border-radius: 12px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.2)); border: 1px solid var(--divider-color); }
      input, select { width:100%; box-sizing:border-box; border:1px solid var(--divider-color); background: var(--secondary-background-color); color: var(--primary-text-color); border-radius:8px; padding:12px; font-size:15px; }
      label { display:block; font-size:12px; color: var(--secondary-text-color); margin-bottom:6px; }
      button { border:0; border-radius:20px; background: var(--primary-color); color: var(--text-primary-color); padding:10px 16px; cursor:pointer; font-weight:500; }
      button.secondary { background: var(--secondary-background-color); color: var(--primary-text-color); border:1px solid var(--divider-color); }
      button.danger { background: var(--error-color, #db4437); color: white; }
      button:disabled { opacity:.55; cursor:default; }
      .check { display:flex; gap:8px; align-items:center; height:44px; color: var(--primary-text-color); }
      .check input { width:auto; }
      .content { display:grid; grid-template-columns: minmax(0, 1fr) 460px; gap:16px; }
      .content.details-hidden { grid-template-columns: minmax(0, 1fr); }
      .content.details-hidden .side { display:none; }
      table { width:100%; min-width:1120px; border-collapse:collapse; table-layout:fixed; }
      th, td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--divider-color); font-size:14px; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; }
      th { color: var(--secondary-text-color); font-weight:500; position:sticky; top:0; background: var(--card-background-color); z-index:20; overflow:hidden; box-shadow: 0 1px 0 var(--divider-color); }
      th.sortable { cursor:pointer; user-select:none; }
      .sort-btn { border:0; border-radius:0; background:transparent; color:inherit; padding:0; font:inherit; cursor:pointer; }
      td.select-col { position:sticky; left:0; z-index:2; background:var(--card-background-color); }
      th.select-col { position:sticky; left:0; z-index:30; background:var(--card-background-color); }
      td[data-col='object'] { position:sticky; left:42px; z-index:2; background:var(--card-background-color); box-shadow: 1px 0 0 var(--divider-color); }
      th.object-col { position:sticky; left:42px; z-index:29; background:var(--card-background-color); box-shadow: 1px 0 0 var(--divider-color), 0 1px 0 var(--divider-color); }
      .virtual-spacer td { padding:0 !important; border-bottom:0 !important; }
      .virtual-spacer:hover { background:transparent; }
      tr:hover td[data-col='object'], tr:hover td.select-col { background:var(--secondary-background-color); }
      tr.selected td[data-col='object'], tr.selected td.select-col { background: color-mix(in srgb, var(--primary-color) 16%, var(--card-background-color)); }
      .inline-select { min-width:100px; max-width:140px; padding:6px 8px; font-size:13px; border-radius:7px; }
      .unit-stack { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      tr { cursor:pointer; }
      tr:hover { background: var(--secondary-background-color); }
      tr.selected { background: color-mix(in srgb, var(--primary-color) 16%, transparent); outline: 1px solid color-mix(in srgb, var(--primary-color) 28%, transparent); }
      tr.value-flash td[data-col='value'] { animation: bepacom-value-flash 4s ease-out; }
      tr.value-flash td[data-col='value'] .value-link { animation: bepacom-value-pulse 4s ease-out; border-radius: 8px; }
      tr.value-up { --bepacom-change-color: var(--success-color, #43a047); }
      tr.value-down { --bepacom-change-color: var(--error-color, #e53935); }
      tr.value-changed { --bepacom-change-color: var(--warning-color, #fb8c00); }
      @keyframes bepacom-value-flash {
        0% { background: color-mix(in srgb, var(--bepacom-change-color, #43a047) 44%, transparent); box-shadow: inset 0 0 0 9999px color-mix(in srgb, var(--bepacom-change-color, #43a047) 24%, transparent); }
        12% { background: color-mix(in srgb, var(--bepacom-change-color, #43a047) 34%, transparent); box-shadow: inset 0 0 0 9999px color-mix(in srgb, var(--bepacom-change-color, #43a047) 16%, transparent); }
        55% { background: color-mix(in srgb, var(--bepacom-change-color, #43a047) 16%, transparent); box-shadow: inset 0 0 0 9999px color-mix(in srgb, var(--bepacom-change-color, #43a047) 8%, transparent); }
        100% { background: transparent; box-shadow: none; }
      }
      @keyframes bepacom-value-pulse {
        0% { transform: scale(1.08); color: var(--bepacom-change-color, #43a047); font-weight: 700; }
        25% { transform: scale(1.04); color: var(--bepacom-change-color, #43a047); font-weight: 700; }
        100% { transform: scale(1); color: var(--primary-text-color); font-weight: 500; }
      }
      .table-wrap { max-height: calc(100vh - 205px); overflow:auto; }
      .select-col { width:36px; text-align:center; }
      .object-main { display:flex; align-items:center; gap:10px; }
      .type-icon { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:10px; font-size:11px; font-weight:800; letter-spacing:.2px; color:white; flex:0 0 auto; }
      .type-ai { background:#1e88e5; } .type-ao { background:#8e24aa; } .type-av { background:#00897b; }
      .type-bi { background:#43a047; } .type-bo { background:#ef6c00; } .type-bv { background:#6d4c41; }
      .type-ms { background:#546e7a; } .type-other { background:#757575; }
      .group-row td { background: color-mix(in srgb, var(--primary-color) 10%, var(--card-background-color)); position:sticky; top:0; z-index:1; }
      .group-toggle { appearance:none; border:0; background:transparent; color:var(--primary-text-color); font-weight:700; cursor:pointer; padding:6px 0; }
      .virtual-spacer td { padding:0; border:0; }
      .bulkbar { display:flex; flex-wrap:wrap; gap:10px; align-items:end; padding:10px 12px; margin-bottom:12px; }
      .bulkbar-empty { color: var(--secondary-text-color); font-size:12px; margin-bottom:8px; }
      .bulkbar label { display:flex; flex-direction:column; gap:3px; font-size:11px; color:var(--secondary-text-color); }
      .bulkbar select { min-width:130px; }
      .name { font-weight:500; }
      .muted { color: var(--secondary-text-color); font-size:12px; }

      .link-cell { appearance:none; border:0; background:transparent; color:var(--primary-text-color); padding:0; margin:0; font:inherit; text-align:left; cursor:pointer; }
      .link-cell:hover { color:var(--primary-color); text-decoration:underline; }
      .value-link { font-weight:700; font-size:14px; }
      .pill { display:inline-flex; align-items:center; border-radius:999px; padding:3px 8px; font-size:12px; background: var(--secondary-background-color); border:1px solid var(--divider-color); margin-right:4px; white-space:nowrap; }
      .ok { color: var(--success-color, #43a047); }
      .warn { color: var(--warning-color, #ffa600); }
      .bad { color: var(--error-color, #db4437); }
      .side { padding:16px; max-height: calc(100vh - 170px); overflow:auto; }
      .details-toggle-active { background: color-mix(in srgb, var(--primary-color) 16%, var(--secondary-background-color)) !important; border-color: color-mix(in srgb, var(--primary-color) 38%, var(--divider-color)) !important; }
      .kv { display:grid; grid-template-columns: 145px minmax(0, 1fr); gap:8px; padding:7px 0; border-bottom:1px solid var(--divider-color); }
      .kv .k { color: var(--secondary-text-color); }
      .kv .v { overflow-wrap:anywhere; }
      .edit-grid { display:grid; grid-template-columns: 1fr; gap:10px; }
      .actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
      .history-list { border:1px solid var(--divider-color); border-radius:8px; overflow:hidden; }
      .history-row { display:grid; grid-template-columns: 90px 1fr 80px; gap:8px; padding:6px 8px; border-bottom:1px solid var(--divider-color); font-size:13px; }
      .history-row:last-child { border-bottom:0; }
      code { font-family: var(--code-font-family, monospace); font-size:12px; }
      details summary { cursor:pointer; margin: 8px 0; color: var(--primary-text-color); }
      details.detail-section { border:1px solid var(--divider-color); border-radius:10px; padding:8px 10px; margin-top:12px; background: var(--secondary-background-color); }
      details.detail-section > summary { font-weight:700; margin:0; }
      .detail-section-body { margin-top:12px; }
      .notice { background: color-mix(in srgb, var(--primary-color) 12%, transparent); border:1px solid color-mix(in srgb, var(--primary-color) 35%, transparent); border-radius:8px; padding:10px; margin:10px 0; }
      .error { background: color-mix(in srgb, var(--error-color, #db4437) 16%, transparent); color: var(--error-color, #db4437); border: 1px solid color-mix(in srgb, var(--error-color, #db4437) 35%, transparent); border-radius:8px; padding:12px; margin-bottom:12px; }
      .empty { padding:32px; text-align:center; color: var(--secondary-text-color); }
      @media (max-width: 1100px) { .toolbar { grid-template-columns: 1fr; } .dashboard-content { grid-template-columns: 1fr; } .dashboard-cards { grid-template-columns: repeat(2, 1fr); } .content { grid-template-columns: 1fr; } .side { max-height:none; } }
    `;

    const rows = this._rowsHtml();

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="wrap">
        <div class="header">
          <div>
            <h1>BACnet Explorer</h1>
            <div id="subtitle" class="subtitle">Sidebar-Ansicht für gefundene BACnet-Objekte${this._total !== undefined ? ` · ${this._points.length} von ${this._total}` : ""}${this._limited ? " · Liste begrenzt" : ""}</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="secondary" id="exportJson">JSON</button>
            <button class="secondary" id="exportCsv">CSV</button>
            <button class="secondary" id="exportExcel">Excel</button>
            <button class="secondary ${this._detailsVisible ? "details-toggle-active" : ""}" id="toggleDetails">${this._detailsVisible ? "Details ausblenden" : "Details anzeigen"}</button>
            <button class="secondary" id="reloadIntegration" ${(this._saving || this._manualReloadRunning || Date.now() < this._manualReloadUntil) ? "disabled" : ""}>Integration neu laden</button>
            <button class="secondary" id="refresh">Aktualisieren${this._loading ? " …" : ""}</button>
          </div>
        </div>

        ${this._error ? `<div class="error">${this._escape(this._error)}</div>` : ""}
        ${this._message ? `<div class="notice">${this._escape(this._message)}</div>` : ""}

        <div id="dashboard" class="dashboard">${this._dashboardHtml()}</div>

        <div class="toolbar card">
          <div class="search-field"><label>Suche</label><input id="search" value="${this._escape(this._filters.search)}" placeholder="1249, Rollo, Temp"></div>
          <div><label>Device</label><select id="device">${this._deviceOptions()}</select></div>
          <div><label>Objekttyp</label><select id="type">${this._typeOptions()}</select></div>
          <div><label>Gruppierung</label><select id="groupBy">${this._groupOptions()}</select></div>
          <div><label>Overrides</label><div class="check"><input id="onlyOverrides" type="checkbox" ${this._filters.only_overrides ? "checked" : ""}> nur Overrides</div></div>
          <div><label>Modus</label><div class="check"><input id="onlySubscribe" type="checkbox" ${this._filters.only_subscribe ? "checked" : ""}> nur Push / Subscribe</div></div>
          <div><label>&nbsp;</label><button id="clear" class="secondary">Reset</button></div>
        </div>

        ${this._bulkToolbarHtml()}

        <div class="content ${this._detailsVisible ? "" : "details-hidden"}">
          <div id="tableWrap" class="card table-wrap">
            ${rows ? `<table><thead><tr>${this._tableHeaderHtml()}</tr></thead><tbody id="pointsBody">${rows}</tbody></table>` : `<div id="emptyState" class="empty">Keine BACnet-Objekte gefunden.</div>`}
          </div>
          ${this._detailsVisible ? `<div class="card side">
            ${selected ? this._detailHtml(selected) : `<h2>Point Inspector</h2><div class="muted">Wähle ein Objekt aus.</div>`}
          </div>` : ""}
        </div>
      </div>
    `;

    this._bindEvents();
    const tableWrap = this.shadowRoot.getElementById("tableWrap");
    if (tableWrap) tableWrap.scrollTop = tableScrollTop;
    if (focusId) {
      const next = this.shadowRoot.getElementById(focusId);
      if (next) {
        next.focus();
        if (selectionStart !== null && typeof next.setSelectionRange === "function") {
          next.setSelectionRange(selectionStart, selectionEnd ?? selectionStart);
        }
      }
    }
  }


  _displayEntityName(p) {
    return p.entity_name || p.entity_original_name || p.object_name || p.object_key || p.entity_id || "-";
  }

  _openMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId },
    }));
  }



  _tableHeaderHtml() {
    const cols = [
      ["object_key", "Objekt", "object-col"],
      ["entity", "HA Entität", ""],
      ["present_value", "Wert", ""],
      ["unit", "Einheit", ""],
      ["override", "Override", ""],
      ["mode", "Modus", ""],
      ["runtime", "Laufzeit", ""],
    ];
    return `<th class="select-col"><input id="selectVisible" type="checkbox" title="Sichtbare auswählen"></th>` + cols.map(([key, label, cls]) => {
      const marker = this._sortKey === key ? (this._sortDir === "asc" ? " ▲" : " ▼") : "";
      return `<th class="sortable ${cls}" data-sort="${this._escape(key)}"><button class="sort-btn" data-sort="${this._escape(key)}">${this._escape(label)}${marker}</button></th>`;
    }).join("");
  }

  _sortPoints(points) {
    const key = this._sortKey || "object_key";
    const dir = this._sortDir === "desc" ? -1 : 1;
    const val = (p) => {
      if (key === "entity") return this._displayEntityName(p);
      if (key === "unit") return p.ha_unit || p.bacnet_unit || "";
      if (key === "override") return p.override_active ? 1 : 0;
      if (key === "mode") return p.update_mode || "";
      if (key === "runtime") return p.last_update || "";
      return p[key] ?? "";
    };
    return [...points].sort((a, b) => {
      const av = val(a), bv = val(b);
      const an = Number(av), bn = Number(bv);
      if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" }) * dir;
    });
  }

  _setSort(key) {
    if (this._sortKey === key) this._sortDir = this._sortDir === "asc" ? "desc" : "asc";
    else { this._sortKey = key; this._sortDir = "asc"; }
    this._setSetting("bepacom_sort_key", this._sortKey);
    this._setSetting("bepacom_sort_dir", this._sortDir);
    this._updateListDom();
  }

  _inlineUnitOptions(p) {
    const current = this._triStateCurrent(p.override_unit);
    return this._options([["__auto__", "Auto"], ["__none__", "Keine"], ["%", "%"], ["°C", "°C"], ["W", "W"], ["kW", "kW"], ["min", "min"], ["s", "s"]], current);
  }

  _inlineModeOptions(p) {
    return this._options([["disabled", "Aus"], ["subscribe", "Push"], ["polling", "Polling"]], p.update_mode || "disabled");
  }

  async _saveInline(uniqueId, field, value) {
    if (!this.hass || !uniqueId) return;
    const p = this._points.find((point) => point.unique_id === uniqueId);
    if (!p) return;
    const payload = {
      type: "bepacom/explorer/save_override",
      entry_id: this._entryId || undefined,
      unique_id: uniqueId,
      unit: p.override_unit || "__auto__",
      device_class: p.override_device_class || "__auto__",
      state_class: p.override_state_class || "__auto__",
      update_mode: p.update_mode || "disabled",
      entity_id: p.entity_id || "",
      entity_name: p.entity_name || "",
    };
    if (field === "unit") payload.unit = value || "__auto__";
    if (field === "mode") payload.update_mode = value || "disabled";
    this._saving = true;
    try {
      const result = await this.hass.callWS(payload);
      const updated = result.point;
      if (updated) {
        const idx = this._points.findIndex((point) => point.unique_id === uniqueId);
        if (idx >= 0) this._points[idx] = { ...this._points[idx], ...updated };
        if (this._selected?.unique_id === uniqueId) this._selected = { ...this._selected, ...updated };
      }
      this._message = "Inline-Änderung gespeichert. Wenn du fertig bist, bitte Integration neu laden.";
      this._updateListDom();
      this._updateHeaderDom();
      this._updateDetailDom();
    } catch (err) {
      this._error = this._formatError(err);
      this._render();
    } finally {
      this._saving = false;
    }
  }

  _rowsHtml() {
    const items = this._displayItems();
    if (!items.length) return "";

    const viewport = this._tableViewport();
    const totalHeight = items.length * this._rowHeight;
    const start = Math.max(0, Math.min(items.length, viewport.start));
    const end = Math.max(start, Math.min(items.length, viewport.end));
    const topHeight = start * this._rowHeight;
    const bottomHeight = Math.max(0, totalHeight - end * this._rowHeight);
    const visible = items.slice(start, end);
    const selected = this._selected;
    const rows = [];

    if (topHeight) rows.push(`<tr class="virtual-spacer"><td colspan="8" style="height:${topHeight}px"></td></tr>`);

    for (const item of visible) {
      if (item.kind === "group") {
        rows.push(`<tr class="group-row" data-group="${this._escape(item.key)}"><td colspan="8"><button class="group-toggle" data-group="${this._escape(item.key)}">${item.open ? "▾" : "▸"} ${this._escape(item.label)} <span class="muted">(${item.count})</span></button></td></tr>`);
        continue;
      }
      const p = item.point;
      rows.push(`
        <tr class="${selected?.unique_id === p.unique_id ? "selected" : ""} ${this._valueChangeClass(p.unique_id)}" data-uid="${this._escape(p.unique_id)}">
          <td class="select-col"><input class="row-select" type="checkbox" data-uid="${this._escape(p.unique_id)}" ${this._selectedIds.has(p.unique_id) ? "checked" : ""}></td>
          <td data-col="object"><div class="object-main"><span class="type-icon ${this._escape(this._typeClass(p.object_type))}" title="${this._escape(p.object_type || "")}">${this._objectIcon(p.object_type)}</span><div><div class="name">${this._escape(p.object_key)}</div><div class="muted">Device ${this._escape(p.device_id)}</div></div></div></td>
          <td data-col="entity"><button class="link-cell entity-link" data-entity-id="${this._escape(p.entity_id || "")}">${this._escape(this._displayEntityName(p))}</button></td>
          <td data-col="value"><button class="link-cell value-link" data-entity-id="${this._escape(p.entity_id || "")}">${this._escape(this._value(p.present_value))}</button></td>
          <td data-col="unit"><div class="unit-stack"><select class="inline-select inline-unit" data-uid="${this._escape(p.unique_id)}">${this._inlineUnitOptions(p)}</select><span class="pill">HA: ${this._escape(p.ha_unit || "-")}</span></div></td>
          <td data-col="override">${p.override_active ? '<span class="pill ok">Override</span>' : '<span class="pill">Standard</span>'}</td>
          <td data-col="mode"><select class="inline-select inline-mode" data-uid="${this._escape(p.unique_id)}">${this._inlineModeOptions(p)}</select></td>
          <td data-col="status">${this._runtimeLabel(p)}</td>
        </tr>
      `);
    }

    if (bottomHeight) rows.push(`<tr class="virtual-spacer"><td colspan="8" style="height:${bottomHeight}px"></td></tr>`);
    return rows.join("");
  }

  _displayItems() {
    let points = this._points || [];
    if (this._filters.device_id && this._filters.device_id !== "all") points = points.filter((p) => String(p.device_id) === String(this._filters.device_id));
    points = this._sortPoints(points);
    if (this._groupBy === "none") return points.map((point) => ({ kind: "point", point }));

    const groups = new Map();
    for (const point of points) {
      const key = this._groupBy === "device" ? `Device ${point.device_id ?? "-"}` : this._objectTypeLabel(point.object_type || "-");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(point);
    }

    const items = [];
    for (const key of Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
      const groupPoints = groups.get(key) || [];
      const open = this._groupOpen(key);
      items.push({ kind: "group", key, label: key, count: groupPoints.length, open });
      if (open) items.push(...groupPoints.map((point) => ({ kind: "point", point })));
    }
    return items;
  }

  _tableViewport() {
    const wrap = this.shadowRoot?.getElementById("tableWrap");
    const scrollTop = wrap ? wrap.scrollTop : this._lastTableScrollTop || 0;
    const height = wrap ? wrap.clientHeight : 700;
    const items = this._displayItems();
    const start = Math.max(0, Math.floor(scrollTop / this._rowHeight) - this._overscan);
    const visible = Math.ceil(height / this._rowHeight) + this._overscan * 2;
    return { start, end: Math.min(items.length, start + visible) };
  }

  _groupOptions() {
    return this._options([["none", "Keine"], ["type", "Nach BACnet-Typ"], ["device", "Nach Device"]], this._groupBy || "none");
  }

  _loadSetting(key, fallback) {
    try { return window.localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
  }

  _setSetting(key, value) {
    try { window.localStorage.setItem(key, value); } catch (_) {}
  }

  _groupStorageKey(key) { return `bepacom_group_open_${this._groupBy}_${key}`; }

  _groupOpen(key) {
    try {
      const stored = window.localStorage.getItem(this._groupStorageKey(key));
      return stored === null ? true : stored === "1";
    } catch (_) { return true; }
  }

  _toggleGroup(key) {
    const open = !this._groupOpen(key);
    try { window.localStorage.setItem(this._groupStorageKey(key), open ? "1" : "0"); } catch (_) {}
    this._updateListDom();
  }

  _objectTypeLabel(type) {
    const t = String(type || "").toLowerCase();
    if (t.includes("analoginput")) return "Analog Inputs";
    if (t.includes("analogoutput")) return "Analog Outputs";
    if (t.includes("analogvalue")) return "Analog Values";
    if (t.includes("binaryinput")) return "Binary Inputs";
    if (t.includes("binaryoutput")) return "Binary Outputs";
    if (t.includes("binaryvalue")) return "Binary Values";
    if (t.includes("multistateinput")) return "Multi State Inputs";
    if (t.includes("multistateoutput")) return "Multi State Outputs";
    if (t.includes("multistatevalue")) return "Multi State Values";
    return type || "Andere";
  }

  _typeClass(type) {
    const t = String(type || "").toLowerCase();
    if (t.includes("analoginput")) return "type-ai";
    if (t.includes("analogoutput")) return "type-ao";
    if (t.includes("analogvalue")) return "type-av";
    if (t.includes("binaryinput")) return "type-bi";
    if (t.includes("binaryoutput")) return "type-bo";
    if (t.includes("binaryvalue")) return "type-bv";
    if (t.includes("multistate")) return "type-ms";
    return "type-other";
  }

  _objectIcon(type) {
    const cls = this._typeClass(type);
    if (cls === "type-ai") return "AI";
    if (cls === "type-ao") return "AO";
    if (cls === "type-av") return "AV";
    if (cls === "type-bi") return "BI";
    if (cls === "type-bo") return "BO";
    if (cls === "type-bv") return "BV";
    if (cls === "type-ms") return "MS";
    return "?";
  }

  _bulkToolbarHtml() {
    const count = this._selectedIds.size;
    if (!count) return `<div class="bulkbar bulkbar-empty"><span>Mehrfachbearbeitung: Wähle links Objekte aus.</span></div>`;
    return `
      <div class="bulkbar card">
        <b>${count} ausgewählt</b>
        <label>Modus <select id="bulkUpdateMode"><option value="">Nicht ändern</option><option value="subscribe">Push / Subscribe</option><option value="polling">Polling</option><option value="disabled">Deaktiviert</option></select></label>
        <label>Einheit <select id="bulkUnit"><option value="">Nicht ändern</option><option value="__auto__">Automatisch</option><option value="__none__">Keine Einheit</option><option value="%">%</option><option value="°C">°C</option><option value="W">W</option><option value="kW">kW</option><option value="min">min</option><option value="s">s</option></select></label>
        <label>Device Class <select id="bulkDeviceClass"><option value="">Nicht ändern</option><option value="__auto__">Automatisch</option><option value="__none__">Keine</option><option value="temperature">Temperatur</option><option value="power">Leistung</option><option value="duration">Dauer</option></select></label>
        <label>State Class <select id="bulkStateClass"><option value="">Nicht ändern</option><option value="__auto__">Automatisch</option><option value="__none__">Keine</option><option value="measurement">measurement</option><option value="total">total</option><option value="total_increasing">total_increasing</option></select></label>
        <button id="bulkApply">Anwenden</button>
        <button id="bulkReset" class="secondary">Overrides zurücksetzen</button>
        <button id="bulkClear" class="secondary">Auswahl leeren</button>
      </div>`;
  }

  async _bulkApply() {
    if (!this.hass || !this._selectedIds.size) return;
    const updateMode = this.shadowRoot.getElementById("bulkUpdateMode")?.value || "";
    const unit = this.shadowRoot.getElementById("bulkUnit")?.value || "";
    const deviceClass = this.shadowRoot.getElementById("bulkDeviceClass")?.value || "";
    const stateClass = this.shadowRoot.getElementById("bulkStateClass")?.value || "";
    const targets = this._points.filter((p) => this._selectedIds.has(p.unique_id));
    this._saving = true;
    this._message = null;
    this._error = null;
    this._render();
    try {
      for (const p of targets) {
        await this.hass.callWS({
          type: "bepacom/explorer/save_override",
          entry_id: this._entryId || undefined,
          unique_id: p.unique_id,
          unit: unit || p.override_unit || "__auto__",
          device_class: deviceClass || p.override_device_class || "__auto__",
          state_class: stateClass || p.override_state_class || "__auto__",
          update_mode: updateMode || p.update_mode || "disabled",
          entity_id: p.entity_id || "",
          entity_name: p.entity_name || "",
        });
      }
      this._message = `${targets.length} Objekte wurden aktualisiert. Wenn du fertig bist, bitte Integration neu laden.`;
      await this._loadPoints(false);
    } catch (err) {
      this._error = this._formatError(err);
    } finally {
      this._saving = false;
      this._render();
    }
  }

  async _bulkReset() {
    if (!this.hass || !this._selectedIds.size) return;
    const targets = this._points.filter((p) => this._selectedIds.has(p.unique_id));
    this._saving = true;
    this._message = null;
    this._error = null;
    this._render();
    try {
      for (const p of targets) {
        await this.hass.callWS({ type: "bepacom/explorer/reset_override", entry_id: this._entryId || undefined, unique_id: p.unique_id });
      }
      this._message = `${targets.length} Overrides wurden zurückgesetzt.`;
      await this._loadPoints(false);
    } catch (err) {
      this._error = this._formatError(err);
    } finally {
      this._saving = false;
      this._render();
    }
  }

  _bindDashboardToggle() {
    const button = this.shadowRoot?.getElementById("toggleDashboard");
    if (!button) return;
    // onclick bewusst jedes Mal setzen. Der Dashboard-HTML-Block wird beim
    // Auf-/Zuklappen ersetzt; dataset-bound kann dabei zu verlorenen Listenern
    // führen. Mit onclick bleibt der Toggle zuverlässig anklickbar.
    button.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this._setStatusOpen(!this._statusOpen);
    };
  }

  _bindEvents() {
    this._bindDashboardToggle();
    this._bindDetailToggles();
    this.shadowRoot.getElementById("refresh")?.addEventListener("click", () => this._loadPoints());
    this.shadowRoot.getElementById("toggleDetails")?.addEventListener("click", () => {
      this._detailsVisible = !this._detailsVisible;
      this._setSetting("bepacom_details_visible", this._detailsVisible ? "1" : "0");
      this._render();
    });
    this.shadowRoot.getElementById("exportJson")?.addEventListener("click", () => this._exportJson());
    this.shadowRoot.getElementById("exportCsv")?.addEventListener("click", () => this._exportCsv());
    this.shadowRoot.getElementById("exportExcel")?.addEventListener("click", () => this._exportExcel());
    this.shadowRoot.getElementById("writeValueBtn")?.addEventListener("click", () => this._writeSelected());
    this.shadowRoot.getElementById("reloadIntegration")?.addEventListener("click", () => this._reloadIntegration());
    this.shadowRoot.getElementById("search")?.addEventListener("input", (ev) => this._setFilter("search", ev.target.value));
    this.shadowRoot.getElementById("device")?.addEventListener("change", (ev) => this._setFilter("device_id", ev.target.value));
    this.shadowRoot.getElementById("type")?.addEventListener("change", (ev) => this._setFilter("object_type", ev.target.value));
    this.shadowRoot.getElementById("groupBy")?.addEventListener("change", (ev) => { this._groupBy = ev.target.value || "none"; this._setSetting("bepacom_group_by", this._groupBy); this._visibleStart = 0; this._render(); });
    this.shadowRoot.querySelectorAll("[data-sort]").forEach((el) => el.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); this._setSort(el.getAttribute("data-sort")); }));
    this.shadowRoot.getElementById("onlyOverrides")?.addEventListener("change", (ev) => this._setFilter("only_overrides", ev.target.checked));
    this.shadowRoot.getElementById("onlySubscribe")?.addEventListener("change", (ev) => this._setFilter("only_subscribe", ev.target.checked));
    this.shadowRoot.getElementById("clear")?.addEventListener("click", () => {
      this._filters = { search: "", object_type: "all", only_overrides: false, only_subscribe: false, device_id: "all" };
      this._loadPoints();
    });
    const saveButton = this.shadowRoot.getElementById("saveOverride");
    const resetButton = this.shadowRoot.getElementById("resetOverride");
    saveButton?.addEventListener("pointerdown", (ev) => ev.stopPropagation());
    resetButton?.addEventListener("pointerdown", (ev) => ev.stopPropagation());
    this.shadowRoot.querySelectorAll(".side input, .side select, .side textarea").forEach((el) => {
      el.addEventListener("input", () => { this._editorDirty = true; });
      el.addEventListener("change", () => { this._editorDirty = true; });
      el.addEventListener("keydown", (ev) => {
        ev.stopPropagation();
        if (ev.key === "Enter" && (el.id === "editEntityName" || el.id === "editEntityId")) {
          ev.preventDefault();
          this._saveSelected();
        }
      });
    });
    this.shadowRoot.getElementById("bulkApply")?.addEventListener("click", () => this._bulkApply());
    this.shadowRoot.getElementById("bulkReset")?.addEventListener("click", () => this._bulkReset());
    this.shadowRoot.getElementById("bulkClear")?.addEventListener("click", () => { this._selectedIds.clear(); this._render(); });
    this.shadowRoot.getElementById("selectVisible")?.addEventListener("change", (ev) => {
      const checked = ev.target.checked;
      for (const item of this._displayItems()) { if (item.kind === "point") { checked ? this._selectedIds.add(item.point.unique_id) : this._selectedIds.delete(item.point.unique_id); } }
      this._render();
    });
    const wrap = this.shadowRoot.getElementById("tableWrap");
    if (wrap) {
      wrap.onscroll = () => {
        this._lastTableScrollTop = wrap.scrollTop;
        if (this._scrollFrame) return;
        this._scrollFrame = window.requestAnimationFrame(() => { this._scrollFrame = null; this._updateListDom(); });
      };
    }
    this._bindRowEvents();
  }



  _bindRowEvents() {
    this.shadowRoot.querySelectorAll(".row-select").forEach((checkbox) => {
      checkbox.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const uid = checkbox.getAttribute("data-uid");
        if (!uid) return;
        checkbox.checked ? this._selectedIds.add(uid) : this._selectedIds.delete(uid);
        this._render();
      });
    });
    this.shadowRoot.querySelectorAll(".group-toggle").forEach((button) => {
      button.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); this._toggleGroup(button.getAttribute("data-group")); });
    });
    this.shadowRoot.querySelectorAll(".inline-unit").forEach((select) => {
      select.addEventListener("click", (ev) => ev.stopPropagation());
      select.addEventListener("change", (ev) => { ev.stopPropagation(); this._saveInline(select.getAttribute("data-uid"), "unit", select.value); });
    });
    this.shadowRoot.querySelectorAll(".inline-mode").forEach((select) => {
      select.addEventListener("click", (ev) => ev.stopPropagation());
      select.addEventListener("change", (ev) => { ev.stopPropagation(); this._saveInline(select.getAttribute("data-uid"), "mode", select.value); });
    });
    this.shadowRoot.querySelectorAll("tr[data-uid]").forEach((row) => {
      row.onclick = (ev) => {
        const moreInfoTarget = ev.target?.closest?.(".entity-link, .value-link");
        if (moreInfoTarget) {
          ev.preventDefault();
          ev.stopPropagation();
          this._openMoreInfo(moreInfoTarget.dataset.entityId);
          return;
        }
        const uid = row.getAttribute("data-uid");
        const point = this._points.find((p) => p.unique_id === uid);
        if (point) this._selectPoint(point);
      };
      row.ondblclick = (ev) => {
        if (ev.target?.closest?.("input, select, button, .entity-link, .value-link")) return;
        ev.preventDefault();
        ev.stopPropagation();
        const uid = row.getAttribute("data-uid");
        const point = this._points.find((p) => p.unique_id === uid);
        if (point) this._openDetailsFor(point);
      };
    });
  }


  _deviceOptions() {
    const devices = Array.from(new Set((this._points || []).map((p) => String(p.device_id ?? "-")).filter(Boolean))).sort((a,b)=>a.localeCompare(b, undefined, {numeric:true}));
    const current = String(this._filters.device_id || "all");
    const all = [`<option value="all" ${current === "all" ? "selected" : ""}>Alle Devices</option>`];
    return all.concat(devices.map((d) => `<option value="${this._escape(d)}" ${current === d ? "selected" : ""}>Device ${this._escape(d)}</option>`)).join("");
  }

  _typeOptions() {
    const types = Array.from(new Set(this._points.map((p) => p.object_type))).filter(Boolean).sort();
    const all = [`<option value="all" ${this._filters.object_type === "all" ? "selected" : ""}>Alle Objekttypen</option>`];
    return all.concat(types.map((t) => `<option value="${this._escape(t)}" ${this._filters.object_type === t ? "selected" : ""}>${this._escape(t)}</option>`)).join("");
  }

  _detailSection(id, title, content) {
    const key = `bepacom_section_${id}_open`;
    let open = false;
    try {
      const stored = window.localStorage.getItem(key);
      open = stored === "1" || stored === "true";
    } catch (_) {}
    return `<details class="detail-section" data-section="${this._escape(id)}" ${open ? "open" : ""}><summary>${this._escape(title)}</summary><div class="detail-section-body">${content}</div></details>`;
  }

  _bindDetailToggles() {
    this.shadowRoot.querySelectorAll("details.detail-section[data-section]").forEach((details) => {
      details.addEventListener("toggle", () => {
        const id = details.getAttribute("data-section");
        if (!id) return;
        try {
          window.localStorage.setItem(`bepacom_section_${id}_open`, details.open ? "1" : "0");
        } catch (_) {}
      });
    });
  }

  _detailHtml(p) {
    const inspector = this._inspector || {};
    const kv = [
      ["Objekt", p.object_key],
      ["Name", p.object_name || "-"],
      ["HA Entity ID", p.entity_id || "-"],
      ["HA Entity Name", p.entity_name || p.entity_original_name || "-"],
      ["Device", p.device_id],
      ["Present Value", this._value(p.present_value)],
      ["BACnet Unit", p.bacnet_unit || "-"],
      ["HA Unit", p.ha_unit || "-"],
      ["Device Class", p.device_class || "-"],
      ["State Class", p.state_class || "-"],
      ["Override", p.override_active ? "Ja" : "Nein"],
      ["Modus", this._plainModeLabel(p)],
      ["Subscribed", p.subscribed === null || p.subscribed === undefined ? "-" : (p.subscribed ? "Ja" : "Nein")],
      ["Aktives Polling", p.fallback_polling ? "Ja" : "Nein"],
      ["Schreibbar", p.writable ? "Ja" : "Nein"],
      ["Aktiv", p.enabled ? "Ja" : "Nein"],
      ["Letztes Update", p.last_update || "-"],
      ["Quelle", p.last_update_source || "-"],
      ["Reliability", inspector.reliability || "-"],
      ["Status Flags", inspector.status_flags || "-"],
      ["COV Increment", inspector.cov_increment || "-"],
      ["Push Updates", p.push_updates ?? inspector.push_updates ?? "-"],
      ["Polling Updates", p.polling_updates ?? inspector.polling_updates ?? "-"],
      ["Value Changes", p.value_changes ?? inspector.value_changes ?? "-"],
    ];

    const editContent = `
      <div class="edit-grid">
        <div><label>HA Entity ID</label><input id="editEntityId" value="${this._escape(p.entity_id || "")}" placeholder="z.B. sensor.rollostellung_eg_speis"></div>
        <div><label>HA Entitätsname</label><input id="editEntityName" value="${this._escape(p.entity_name || "")}" placeholder="leer = Standardname"></div>
        <div><label>Einheit</label><select id="editUnit">${this._unitOptions(p)}</select></div>
        <div><label>Device Class</label><select id="editDeviceClass">${this._deviceClassOptions(p)}</select></div>
        <div><label>State Class</label><select id="editStateClass">${this._stateClassOptions(p)}</select></div>
        <div><label>Aktualisierungsmodus</label><select id="editUpdateMode">${this._updateModeOptions(p)}</select></div>
      </div>
      <div class="actions">
        <button id="saveOverride" ${this._saving ? "disabled" : ""}>Speichern${this._saving ? " …" : ""}</button>
        <button id="resetOverride" class="secondary" ${this._saving ? "disabled" : ""}>Override zurücksetzen</button>
      </div>
      <div class="muted" style="margin-top:8px;">Änderungen werden gespeichert, ohne die Integration sofort neu zu laden. Wenn du fertig bist, oben „Integration neu laden“ klicken.</div>
    `;

    const inspectorContent = kv.map(([k,v]) => `<div class="kv"><div class="k">${this._escape(k)}</div><div class="v">${this._escape(v)}</div></div>`).join("");

    return `
      <h2>${this._escape(p.object_key)}</h2>
      <div class="muted">${this._escape(p.object_name || "-")}</div>
      ${this._detailSection("config", "Konfiguration der Entität", editContent)}
      <h3>BACnet Write</h3>
      ${this._writeHtml(p)}
      ${this._detailSection("live", "Live-Monitor / Verlauf", this._historyHtml())}
      ${this._detailSection("inspector", "Inspector", inspectorContent)}
      ${this._detailSection("engineering", "Engineering-Properties", this._engineeringHtml())}
    `;
  }

  _triStateCurrent(value) {
    if (value === null || value === undefined || value === "" || value === "auto") return "__auto__";
    const normalized = String(value).trim().toLowerCase();
    if (["__auto__", "automatic", "automatisch"].includes(normalized)) return "__auto__";
    if (["__none__", "none", "null", "keine", "no", "false"].includes(normalized)) return "__none__";
    return String(value);
  }

  _unitOptions(p) {
    const current = this._triStateCurrent(p.override_unit);
    const values = [
      ["__auto__", `Automatisch (BACnet: ${p.bacnet_unit || "keine"})`],
      ["__none__", "Keine Einheit"], ["%", "%"], ["°C", "°C"], ["W", "W"], ["kW", "kW"],
      ["Wh", "Wh"], ["kWh", "kWh"], ["V", "V"], ["A", "A"], ["Hz", "Hz"],
      ["lx", "lx"], ["Pa", "Pa"], ["bar", "bar"], ["min", "min"], ["s", "s"], ["h", "h"],
    ];
    return this._options(values, current);
  }

  _deviceClassOptions(p) {
    const current = this._triStateCurrent(p.override_device_class);
    return this._options([
      ["__auto__", `Automatisch (${p.device_class || "keine"})`], ["__none__", "Keine"], ["temperature", "Temperatur"], ["humidity", "Luftfeuchtigkeit"],
      ["power", "Leistung"], ["energy", "Energie"], ["voltage", "Spannung"], ["current", "Strom"],
      ["frequency", "Frequenz"], ["pressure", "Druck"], ["illuminance", "Beleuchtungsstärke"], ["duration", "Dauer"],
      ["co2", "CO₂"], ["pm25", "PM2.5"], ["pm10", "PM10"],
    ], current);
  }

  _stateClassOptions(p) {
    const current = this._triStateCurrent(p.override_state_class);
    return this._options([
      ["__auto__", `Automatisch (${p.state_class || "keine"})`], ["__none__", "Keine"], ["measurement", "measurement"], ["total", "total"], ["total_increasing", "total_increasing"],
    ], current);
  }

  _updateModeOptions(p) {
    const current = p.update_mode || (p.enabled === false ? "disabled" : (p.subscribe === true ? "subscribe" : "disabled"));
    return this._options([
      ["disabled", "Deaktiviert / keine Aktualisierung"],
      ["subscribe", "Push / Subscribe"],
      ["polling", "Polling"],
    ], current);
  }

  _options(values, current) {
    const hasCurrent = values.some(([value]) => value === current);
    const list = hasCurrent || current === "auto" ? values : [[current, `${current} (aktuell)`], ...values];
    return list.map(([value, label]) => `<option value="${this._escape(value)}" ${value === current ? "selected" : ""}>${this._escape(label)}</option>`).join("");
  }

  _modeLabel(p) {
    const label = this._plainModeLabel(p);
    const cls = p.update_mode === "subscribe" ? "ok" : (p.update_mode === "polling" ? "warn" : "bad");
    return `<span class="pill ${cls}">${this._escape(label)}</span>`;
  }

  _plainModeLabel(p) {
    if (p.update_mode === "subscribe") return "Push / Subscribe";
    if (p.update_mode === "polling") return "Polling";
    return "Deaktiviert";
  }

  _runtimeLabel(p) {
    if (p.update_mode === "disabled") return '<span class="bad">aus</span>';
    if (p.subscribed === true) return '<span class="ok">Push aktiv</span>';
    if (p.fallback_polling === true || p.update_mode === "polling") return '<span class="warn">Polling</span>';
    return '<span class="muted">wartet</span>';
  }

  _value(value) {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  _cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

if (!customElements.get("bepacom-explorer-panel")) {
  customElements.define("bepacom-explorer-panel", BepacomExplorerPanel);
}
