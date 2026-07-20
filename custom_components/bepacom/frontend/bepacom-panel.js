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
    this._virtualSearch = this._loadSetting("bepacom_virtual_search", "");
    this._refreshTimer = null;
    this._debounce = null;
    this._diagnostics = {};
    this._historyByUid = new Map();
    this._clientHistory = new Map();
    this._clientValueChangeCount = new Map();
    this._lastSeenValues = new Map();
    this._writing = false;
    this._statusOpen = this._loadStatusOpen();
    // localStorage is scoped to the current origin. A fresh access path (for
    // example the Cloudflare hostname instead of the local HA address) must
    // therefore start with the same useful grouping on its first visit.
    this._groupBy = this._loadSetting("bepacom_group_by", "type");
    this._sortKey = this._loadSetting("bepacom_sort_key", "object_key");
    this._sortDir = this._loadSetting("bepacom_sort_dir", "asc");
    // Rechte Detail-/Konfigurationsspalte standardmäßig ausblenden, damit die Tabelle mehr Platz hat.
    this._detailsVisible = this._loadSetting("bepacom_details_visible", "0") === "1";
    this._selectedIds = new Set();
    this._visibleStart = 0;
    this._rowHeight = 74;
    this._overscan = 8;
    this._lastTableScrollTop = 0;
    this._recentValueChanges = new Map();
    this._recentValueDirections = new Map();
    this._recentChangeTimer = null;
    this._keyboardHandler = (ev) => this._handleKeyboard(ev);
    this._rootClickHandler = (ev) => this._handleRootClick(ev);
    this._editorDirty = false;
    this._manualReloadRunning = false;
    this._manualReloadUntil = 0;
    this._refreshInFlight = false;
    this._sideScrollPositions = new Map();
    this._activeView = this._loadSetting("bepacom_active_view", "explorer");
    this._sideTab = this._loadSetting("bepacom_side_tab", "inspector");
    this._connected = false;
    this._initialLoadStarted = false;
    this._refreshGeneration = 0;
    this._visibilityHandler = () => this._handleVisibilityChange();
    this._virtualStateUpdateQueued = false;
    this._liveChanges = [];
    this._liveCursor = 0;
    this._liveTimer = null;
    this._liveRefreshInFlight = false;
    this._liveGeneration = 0;
    this._livePaused = false;
    this._dashboardTab = this._loadSetting("bepacom_dashboard_tab", "live");
    this._liveFilters = { search: "", source: "all", object_type: "all" };
  }

  _versionLabel() {
    const cfg = this.panel?.config || {};
    const version = cfg.version || "1.1.6";
    const build = cfg.frontend_build || "0613";
    return `Version ${version} · Frontend-Build ${build}`;
  }

  connectedCallback() {
    if (this._connected) return;
    this._connected = true;
    this._entryId = this.panel?.config?.entry_id || null;
    window.addEventListener("keydown", this._keyboardHandler);
    document.addEventListener("visibilitychange", this._visibilityHandler);
    this.shadowRoot.addEventListener("click", this._rootClickHandler);
    this._startInitialLoad();
    this._startRefreshTimer();
    this._startLiveTimer();
    this._render();
  }

  disconnectedCallback() {
    this._connected = false;
    this._stopRefreshTimer();
    this._stopLiveTimer();
    this._refreshGeneration += 1;
    this._refreshInFlight = false;
    if (this._debounce) window.clearTimeout(this._debounce);
    if (this._recentChangeTimer) {
      window.clearTimeout(this._recentChangeTimer);
      this._recentChangeTimer = null;
    }
    window.removeEventListener("keydown", this._keyboardHandler);
    document.removeEventListener("visibilitychange", this._visibilityHandler);
    this.shadowRoot.removeEventListener("click", this._rootClickHandler);
  }

  set hass(hass) {
    this._hass = hass;
    this._scheduleVirtualStateDomUpdate();
    if (!this._hasHass) {
      this._hasHass = true;
      this._startInitialLoad();
    }
  }

  get hass() {
    return this._hass;
  }

  _scheduleVirtualStateDomUpdate() {
    if (this._virtualStateUpdateQueued) return;
    this._virtualStateUpdateQueued = true;
    queueMicrotask(() => {
      this._virtualStateUpdateQueued = false;
      if (!this._connected) return;
      this._updateVirtualStateDom();
    });
  }

  _updateVirtualStateDom() {
    if (!this.shadowRoot || !this.hass?.states) return;
    this.shadowRoot.querySelectorAll("[data-virtual-state-entity-id]").forEach((badge) => {
      const entityId = badge.dataset.virtualStateEntityId || "";
      const state = this.hass.states[entityId]?.state ?? "unavailable";
      const normalized = String(state).toLowerCase();
      let cls = "unknown";
      if (normalized === "on" || normalized === "true" || normalized === "1") cls = "on";
      else if (normalized === "off" || normalized === "false" || normalized === "0") cls = "off";
      else if (["unavailable", "unknown", "-"].includes(normalized)) cls = "unavailable";

      badge.classList.remove("on", "off", "unavailable", "unknown", "neutral");
      badge.classList.add(cls);
      badge.textContent = this._binaryStateLabel(state, badge.dataset.deviceClass || "");
    });
  }

  _startInitialLoad() {
    if (!this._connected || !this.hass || this._initialLoadStarted) return;
    this._initialLoadStarted = true;
    this._loadEntries();
    this._loadPoints(false);
  }

  _startRefreshTimer() {
    if (!this._connected || document.hidden || this._refreshTimer) return;
    this._refreshTimer = window.setInterval(() => this._refreshPointsInPlace(), 5000);
  }

  _stopRefreshTimer() {
    if (!this._refreshTimer) return;
    window.clearInterval(this._refreshTimer);
    this._refreshTimer = null;
  }

  _startLiveTimer() {
    if (!this._connected || document.hidden || this._liveTimer) return;
    this._refreshLiveChanges();
    this._liveTimer = window.setInterval(() => this._refreshLiveChanges(), 1000);
  }

  _stopLiveTimer() {
    if (!this._liveTimer) return;
    window.clearInterval(this._liveTimer);
    this._liveTimer = null;
  }

  _handleVisibilityChange() {
    if (document.hidden) {
      this._stopRefreshTimer();
      this._stopLiveTimer();
      // Invalidate a request that may never settle while the browser suspends
      // the tab. Its late result must not overwrite the fresh visible state.
      this._refreshGeneration += 1;
      this._refreshInFlight = false;
      return;
    }

    if (!this._connected) return;
    this._startRefreshTimer();
    this._startLiveTimer();
    this._refreshPointsInPlace();
  }

  async _refreshLiveChanges() {
    if (!this.hass || !this._entryId || !this._statusOpen || this._dashboardTab !== "live" || this._livePaused || this._liveRefreshInFlight || document.hidden) return;
    this._liveRefreshInFlight = true;
    const generation = this._liveGeneration;
    try {
      const result = await this._callWSWithTimeout({
        type: "bepacom/explorer/changes",
        entry_id: this._entryId,
        after: this._liveCursor,
        limit: 10000,
      });
      const latestSequence = Number(result.latest_sequence) || 0;
      if (generation !== this._liveGeneration) return;
      if (latestSequence < this._liveCursor) {
        // The integration was reloaded and its in-memory sequence restarted.
        this._liveCursor = 0;
        this._liveChanges = [];
        return;
      }
      const incoming = Array.isArray(result.changes) ? result.changes : [];
      if (incoming.length) {
        this._liveChanges.push(...incoming);
        if (this._liveChanges.length > 10000) {
          this._liveChanges.splice(0, this._liveChanges.length - 10000);
        }
        this._liveCursor = Number(incoming[incoming.length - 1].sequence) || this._liveCursor;
        this._updateLiveMonitorDom();
      } else if (!this._liveCursor) {
        this._liveCursor = latestSequence;
      }
    } catch (_) {
      // The regular dashboard connection state already exposes transport errors.
    } finally {
      this._liveRefreshInFlight = false;
    }
  }

  async _callWSWithTimeout(message, timeoutMs = 15000) {
    if (!this.hass) throw new Error("Home Assistant ist nicht verbunden");
    let timeoutId;
    try {
      return await Promise.race([
        this.hass.callWS(message),
        new Promise((_, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error("Zeitüberschreitung bei der Verbindung zu Home Assistant")),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  }

  async _loadEntries() {
    if (!this.hass) return;
    try {
      const result = await this._callWSWithTimeout({ type: "bepacom/explorer/entries" });
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
      const result = await this._callWSWithTimeout({
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

  _isUserInteractingWithTable() {
    const active = this.shadowRoot?.activeElement;
    const tableWrap = this.shadowRoot?.getElementById("tableWrap");
    if (!tableWrap) return false;
    if (active && tableWrap.contains(active)) {
      const tag = (active.tagName || "").toLowerCase();
      if (["select", "input", "textarea", "button"].includes(tag)) return true;
    }
    // Beim Mouseover den Tabellen-DOM nicht ersetzen. Sonst verschwinden Tooltips/Infos
    // und gerade geöffnete Controls klappen durch den Auto-Refresh wieder zu.
    return tableWrap.matches(":hover");
  }


  async _refreshPointsInPlace() {
    if (!this.hass || !this._entryId) return;
    if (document.hidden) return;
    if (this._refreshInFlight) return;
    const generation = ++this._refreshGeneration;
    this._refreshInFlight = true;
    // Während der Benutzer tippt oder rechts editiert, darf der Auto-Refresh
    // die DOM-Struktur nicht neu aufbauen. Sonst verlieren Eingabefelder den
    // Fokus und die Tabelle springt nach oben.
    try {
      const result = await this._callWSWithTimeout({
        type: "bepacom/explorer/points_runtime",
        entry_id: this._entryId || undefined,
        unique_ids: this._points.map((point) => point.unique_id),
      });
      if (generation !== this._refreshGeneration || document.hidden || !this._connected) return;
      this._entryId = result.entry_id || this._entryId;
      const runtimeByUid = new Map((result.points || []).map((point) => [point.unique_id, point]));
      this._points = this._points.map((point) => ({
        ...point,
        ...(runtimeByUid.get(point.unique_id) || {}),
      }));
      this._diagnostics = result.diagnostics || {};
      this._trackClientHistory(this._points);
      if (this._selected) {
        const updated = this._points.find((p) => p.unique_id === this._selected.unique_id);
        if (updated) {
          this._selected = { ...this._selected, ...updated };
        }
      }
      if (!this._isUserInteractingWithTable()) {
        this._updateListDom();
      }
      this._updateHeaderDom();
    } catch (err) {
      if (generation !== this._refreshGeneration || document.hidden || !this._connected) return;
      this._error = this._formatError(err);
      this._render();
    } finally {
      if (generation === this._refreshGeneration) this._refreshInFlight = false;
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

    const sideScrollTop = this._rememberSideScroll();
    side.innerHTML = this._sidePanelHtml(this._selected);
    this._bindEvents();
    this._restoreSideScroll(sideScrollTop);
  }

  _sideScrollKey() {
    const selectedId = this._selected?.unique_id || "none";
    return `${selectedId}:${this._sideTab || "inspector"}`;
  }

  _rememberSideScroll() {
    const body = this.shadowRoot?.querySelector(".side-body");
    const scrollTop = body?.scrollTop ?? 0;
    this._sideScrollPositions.set(this._sideScrollKey(), scrollTop);
    return scrollTop;
  }

  _restoreSideScroll(fallback = null) {
    const body = this.shadowRoot?.querySelector(".side-body");
    if (!body) return;
    const stored = this._sideScrollPositions.get(this._sideScrollKey());
    const scrollTop = stored ?? fallback ?? 0;
    window.requestAnimationFrame(() => {
      body.scrollTop = scrollTop;
    });
  }

  _updateHeaderDom() {
    const subtitle = this.shadowRoot?.getElementById("subtitle");
    if (subtitle) {
      subtitle.textContent = `Sidebar-Ansicht für gefundene BACnet-Objekte${this._total !== undefined ? ` · ${this._points.length} von ${this._total}` : ""}${this._limited ? " · Liste begrenzt" : ""}`;
    }
    const dashboard = this.shadowRoot?.getElementById("dashboard");
    if (dashboard) {
      const active = this.shadowRoot?.activeElement;
      const liveMonitor = this.shadowRoot?.getElementById("liveMonitorHost");
      // The runtime refresh runs every five seconds. Replacing the complete
      // dashboard while a live filter is focused would destroy its input node
      // and make typing jump out of the field. Incoming changes continue to be
      // buffered and the next refresh after blur updates the complete view.
      if (!(active && liveMonitor?.contains(active))) {
        dashboard.innerHTML = this._dashboardHtml();
        this._bindDashboardToggle();
      }
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
      // Recreate the complete page once when transitioning from the empty
      // state so header and toolbar bindings are installed exactly once.
      this._render();
      return;
    }

    body.innerHTML = this._rowsHtml();
    // Only row nodes were replaced. Rebinding the whole page here would add
    // duplicate listeners to long-lived toolbar controls on every refresh.
    this._bindRowEvents();
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
    this._debounce = window.setTimeout(() => this._loadPoints(false), 250);
  }

  _selectPoint(point) {
    this._editorDirty = false;
    this._manualReloadRunning = false;
    this._manualReloadUntil = 0;
    this._selected = point;
    this._clientHistory.clear();
    this._historyByUid.clear();
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
    const numberMin = this.shadowRoot.getElementById("editNumberMin")?.value;
    const numberMax = this.shadowRoot.getElementById("editNumberMax")?.value;
    const numberStep = this.shadowRoot.getElementById("editNumberStep")?.value;
    const multistateRepresentation = this.shadowRoot.getElementById("editMultistateRepresentation")?.value;
    const multistateOffValue = this.shadowRoot.getElementById("editMultistateOffValue")?.value;
    const multistateOnValue = this.shadowRoot.getElementById("editMultistateOnValue")?.value;
    const writePriority = this.shadowRoot.getElementById("editWritePriority")?.value;
    const writeProfile = this.shadowRoot.getElementById("editWriteProfile")?.value;
    const gltDelayMs = this.shadowRoot.getElementById("editGltDelayMs")?.value;
    const asDelayMs = this.shadowRoot.getElementById("editAsDelayMs")?.value;
    const releaseDelayMs = this.shadowRoot.getElementById("editReleaseDelayMs")?.value;
    const releasePriority = this.shadowRoot.getElementById("editReleasePriority")?.checked;
    const virtualBinaryEnabled = this.shadowRoot.getElementById("virtualBinaryEnabled")?.checked || false;
    const virtualBinaryName = this.shadowRoot.getElementById("virtualBinaryName")?.value || "";
    const virtualBinaryUniqueId = this.shadowRoot.getElementById("virtualBinaryUniqueId")?.value || "";
    const virtualBinaryDeviceClass = this.shadowRoot.getElementById("virtualBinaryDeviceClass")?.value || "";
    const virtualBinaryOnValue = this.shadowRoot.getElementById("virtualBinaryOnValue")?.value || "";
    const virtualBinaryOffValue = this.shadowRoot.getElementById("virtualBinaryOffValue")?.value || "";
    const virtualBinaryElseState = this.shadowRoot.getElementById("virtualBinaryElseState")?.value || "unavailable";

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
        number_min: numberMin,
        number_max: numberMax,
        number_step: numberStep,
        multistate_representation: multistateRepresentation,
        multistate_off_value: multistateOffValue,
        multistate_on_value: multistateOnValue,
        write_priority: writePriority,
        write_profile: writeProfile,
        glt_delay_ms: gltDelayMs,
        as_delay_ms: asDelayMs,
        release_delay_ms: releaseDelayMs,
        release_priority: releasePriority,
        virtual_binary_enabled: virtualBinaryEnabled,
        virtual_binary_name: virtualBinaryName,
        virtual_binary_unique_id: virtualBinaryUniqueId,
        virtual_binary_device_class: virtualBinaryDeviceClass,
        virtual_binary_on_value: virtualBinaryOnValue,
        virtual_binary_off_value: virtualBinaryOffValue,
        virtual_binary_else_state: virtualBinaryElseState,
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


  _findVirtualEntity(sourceUid, virtualUid) {
    const source = (this._points || []).find((p) => p.unique_id === sourceUid);
    const ent = source ? this._linkedEntities(source).find((e) => String(e.unique_id || "") === String(virtualUid || "")) : null;
    return { source, ent };
  }

  _fillVirtualForm(ent, duplicate = false) {
    if (!ent) return;
    const suffix = duplicate ? " Kopie" : "";
    const uidSuffix = duplicate ? "_copy" : "";
    const setValue = (id, value) => {
      const el = this.shadowRoot?.getElementById(id);
      if (!el) return false;
      if (el.type === "checkbox") el.checked = !!value;
      else el.value = value ?? "";
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    };
    const ok = setValue("virtualBinaryEnabled", true);
    if (!ok) return;
    setValue("virtualBinaryName", `${ent.name || ent.friendly_name || ent.entity_name || "Virtuelle Entität"}${suffix}`);
    setValue("virtualBinaryUniqueId", `${ent.unique_id || "virtual_binary"}${uidSuffix}`);
    setValue("virtualBinaryDeviceClass", ent.device_class || "");
    setValue("virtualBinaryOnValue", ent.on_value ?? "2");
    setValue("virtualBinaryOffValue", ent.off_value ?? "1");
    setValue("virtualBinaryElseState", ent.else_state || "unavailable");
    this._editorDirty = true;
    this._refreshVirtualRulePreview();
    this._message = duplicate ? "Virtuelle Entität wurde als Kopie in den Editor übernommen. Zum Anlegen bitte Speichern klicken." : "Virtuelle Entität wurde in den Editor übernommen. Zum Anwenden bitte Speichern klicken.";
    this._updateHeaderDom();
  }

  _editVirtualEntity(sourceUid, virtualUid, duplicate = false) {
    const { source, ent } = this._findVirtualEntity(sourceUid, virtualUid);
    if (!source || !ent) return;
    this._activeView = "explorer";
    this._sideTab = "inspector";
    this._detailsVisible = true;
    this._setSetting("bepacom_active_view", this._activeView);
    this._setSetting("bepacom_side_tab", this._sideTab);
    this._setSetting("bepacom_details_visible", "1");
    this._selectPoint(source);
    // Der Inspector wird ggf. asynchron nachgeladen; deshalb nach dem nächsten Render und noch einmal verzögert füllen.
    setTimeout(() => this._fillVirtualForm(ent, duplicate), 0);
    setTimeout(() => this._fillVirtualForm(ent, duplicate), 300);
  }

  async _deleteVirtualEntity(sourceUid, virtualUid, virtualName = "") {
    if (!this.hass || !sourceUid || !virtualUid) return;
    const label = virtualName || virtualUid;
    const ok = window.confirm(`Virtuelle Entität löschen?\n\n${label}\n\nDiese Aktion entfernt die virtuelle Entität aus der Engelsoft-Beacon-Konfiguration und aus der Home-Assistant-Entity-Registry. Danach bitte die Integration neu laden.`);
    if (!ok) return;

    this._saving = true;
    this._message = null;
    this._error = null;
    try {
      const result = await this.hass.callWS({
        type: "bepacom/explorer/delete_virtual_entity",
        entry_id: this._entryId || undefined,
        source_unique_id: sourceUid,
        virtual_unique_id: virtualUid,
      });
      if (this._selected?.unique_id === sourceUid) {
        this._selected = result.point;
        this._inspector = result.inspector || {};
        this._setHistoryForSelected(result.history || [], sourceUid);
      }
      this._message = result.removed_entity_id
        ? `Virtuelle Entität gelöscht: ${result.removed_entity_id}. Bitte Integration neu laden.`
        : "Virtuelle Entität gelöscht. Bitte Integration neu laden.";
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
    this._stopRefreshTimer();
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
          this._startRefreshTimer();
          this._render();
        }
      }, 8000);
    } catch (err) {
      this._manualReloadRunning = false;
      this._saving = false;
      this._error = this._formatError(err);
      this._startRefreshTimer();
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
        if (this._selected?.unique_id === uid) {
          list.push({ ts: point.last_update || now, value, source: point.last_update_source || "refresh" });
          if (list.length > 50) list.splice(0, list.length - 50);
          this._clientHistory.set(uid, list);
        }
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
    this._scheduleRecentChangeCleanup();
  }

  _scheduleRecentChangeCleanup() {
    if (this._recentChangeTimer || !this._recentValueChanges.size) return;
    const nextExpiry = Math.min(...this._recentValueChanges.values()) + 4100;
    const delay = Math.max(50, nextExpiry - Date.now());
    this._recentChangeTimer = window.setTimeout(() => {
      this._recentChangeTimer = null;
      const now = Date.now();
      let removed = false;
      for (const [uid, ts] of this._recentValueChanges.entries()) {
        if (now - ts < 4000) continue;
        this._recentValueChanges.delete(uid);
        this._recentValueDirections.delete(uid);
        removed = true;
      }
      if (removed && this._connected && !document.hidden) this._updateListDom();
      this._scheduleRecentChangeCleanup();
    }, delay);
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
      // The backend confirms writes asynchronously after allowing a short COV
      // window. Refresh once more so the displayed value follows that result
      // without waiting for the normal Explorer interval.
      window.setTimeout(() => {
        if (this._connected && !document.hidden) {
          void this._refreshPointsInPlace();
        }
      }, 1100);
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
    if (this._statusOpen && this._dashboardTab === "live") this._refreshLiveChanges();
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

  _filteredLiveChanges() {
    const search = String(this._liveFilters.search || "").trim();
    const pointByUid = new Map(this._points.map((point) => [point.unique_id, point]));
    return this._liveChanges.filter((item) => {
      if (this._liveFilters.source !== "all" && String(item.source) !== this._liveFilters.source) return false;
      if (this._liveFilters.object_type !== "all" && String(item.object_type) !== this._liveFilters.object_type) return false;
      if (!search) return true;
      const point = pointByUid.get(item.unique_id);
      const haystack = [
        item.device_id, item.object_type, item.object_id, item.object_key,
        item.object_name, item.unique_id, point?.entity_id,
        item.previous_value, item.value, item.source,
      ].filter((value) => value !== null && value !== undefined).join(" ");
      return this._matchesSearchQuery(haystack, search);
    });
  }

  _liveMonitorHtml() {
    const filtered = this._filteredLiveChanges();
    const now = Date.now();
    const bins = Array.from({ length: 60 }, () => 0);
    for (const item of this._liveChanges) {
      const age = Math.floor((now - Date.parse(item.ts || 0)) / 1000);
      if (age >= 0 && age < 60) bins[59 - age] += 1;
    }
    const peak = Math.max(0, ...bins);
    const lastMinute = bins.reduce((sum, count) => sum + count, 0);
    const average = (lastMinute / 60).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const bars = bins.map((count) => {
      const height = peak ? Math.max(2, Math.round((count / peak) * 34)) : 2;
      return `<i style="height:${height}px" title="${count} Änderung${count === 1 ? "" : "en"}"></i>`;
    }).join("");
    const sources = [...new Set(this._liveChanges.map((item) => String(item.source || "unknown")))].sort();
    const types = [...new Set(this._liveChanges.map((item) => String(item.object_type || "unknown")))].sort();
    const options = (values, selected) => values.map((value) => `<option value="${this._escape(value)}" ${value === selected ? "selected" : ""}>${this._escape(value)}</option>`).join("");
    const rows = filtered.slice(-120).reverse().map((item) => {
      const point = this._points.find((candidate) => candidate.unique_id === item.unique_id);
      const entityId = point?.entity_id || "";
      const friendlyName = this.hass?.states?.[entityId]?.attributes?.friendly_name
        || point?.entity_name
        || point?.entity_original_name
        || item.object_name
        || item.object_key
        || item.unique_id;
      const secondaryLabel = entityId || item.object_key || item.unique_id;
      return `<tr data-live-uid="${this._escape(item.unique_id)}" title="${this._escape(`${item.device_id}/${item.object_type}:${item.object_id} · Im Point Inspector öffnen`)}">
        <td>${this._escape(this._formatTime(item.ts))}</td>
        <td><b>${this._escape(friendlyName)}</b><small>${this._escape(secondaryLabel)}</small></td>
        <td class="live-value">${this._escape(this._value(item.previous_value))}<span>→</span>${this._escape(this._value(item.value))}</td>
        <td><span class="live-source">${this._escape(item.source || "-")}</span></td>
      </tr>`;
    }).join("");
    return `<div class="live-monitor">
      <div class="live-summary">
        <span><b>${this._liveChanges.length.toLocaleString("de-DE")}</b> gespeichert</span>
        <span><b>${filtered.length.toLocaleString("de-DE")}</b> im Filter</span>
        <span><b>${average}/s</b> letzte Minute</span>
        <span><b>${peak}/s</b> Spitze</span>
        <button id="livePause" class="secondary live-small-btn">${this._livePaused ? "Fortsetzen" : "Pausieren"}</button>
      </div>
      <div class="live-chart" aria-label="Änderungen der letzten 60 Sekunden">${bars}</div>
      <div class="live-filters">
        <input id="liveSearch" value="${this._escape(this._liveFilters.search)}" placeholder="Filter / Wildcards …">
        <select id="liveSource"><option value="all">Alle Quellen</option>${options(sources, this._liveFilters.source)}</select>
        <select id="liveObjectType"><option value="all">Alle Typen</option>${options(types, this._liveFilters.object_type)}</select>
        <button id="liveClear" class="secondary live-small-btn" title="Monitorverlauf leeren">Leeren</button>
      </div>
      <div class="live-table-wrap">
        <table class="live-table"><thead><tr><th>Zeit</th><th>Punkt</th><th>Alt → Neu</th><th>Quelle</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="4" class="muted">Noch keine passenden Wertänderungen.</td></tr>`}</tbody></table>
      </div>
      <div class="live-foot">Ringpuffer: maximal 10.000 Änderungen · angezeigt werden die neuesten 120 Treffer</div>
    </div>`;
  }

  _updateLiveMonitorDom(force = false) {
    const host = this.shadowRoot?.getElementById("liveMonitorHost");
    if (!host || this._dashboardTab !== "live") return;
    const active = this.shadowRoot?.activeElement;
    if (!force && active && host.contains(active)) return;
    host.innerHTML = this._liveMonitorHtml();
    this._bindLiveMonitorEvents();
  }

  _bindLiveMonitorEvents() {
    const root = this.shadowRoot?.getElementById("liveMonitorHost");
    if (!root) return;
    root.querySelector("#livePause")?.addEventListener("click", () => {
      this._livePaused = !this._livePaused;
      // Invalidate a response that may already be in flight so no values can
      // slip into the table after the monitor has visibly been paused.
      this._liveGeneration += 1;
      this._updateLiveMonitorDom(true);
      if (!this._livePaused) this._refreshLiveChanges();
    });
    root.querySelector("#liveClear")?.addEventListener("click", () => {
      this._liveChanges = [];
      this._liveGeneration += 1;
      this._updateLiveMonitorDom(true);
    });
    root.querySelector("#liveSearch")?.addEventListener("input", (ev) => {
      this._liveFilters.search = ev.target.value || "";
      const cursor = ev.target.selectionStart;
      this._updateLiveMonitorDom(true);
      const input = this.shadowRoot?.getElementById("liveSearch");
      input?.focus();
      input?.setSelectionRange(cursor, cursor);
    });
    root.querySelector("#liveSource")?.addEventListener("change", (ev) => {
      this._liveFilters.source = ev.target.value || "all";
      this._updateLiveMonitorDom(true);
    });
    root.querySelector("#liveObjectType")?.addEventListener("change", (ev) => {
      this._liveFilters.object_type = ev.target.value || "all";
      this._updateLiveMonitorDom(true);
    });
    root.querySelectorAll("tr[data-live-uid]").forEach((row) => row.addEventListener("click", () => {
      const point = this._points.find((candidate) => candidate.unique_id === row.dataset.liveUid);
      if (!point) return;
      this._detailsVisible = true;
      this._setSetting("bepacom_details_visible", "1");
      this._selectPoint(point);
    }));
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
    const pushNotificationsRaw = d.bacnet_push_notifications ?? d.websocket_updates ?? d.push_count;
    const pushNotifications = Number(pushNotificationsRaw);
    const averageChangesPerPush = Number.isFinite(pushNotifications) && pushNotifications > 0
      ? (Number(valueChanges) / pushNotifications).toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "-";
    const pushChangeValue = `${pushNotificationsRaw ?? "-"} / ${averageChangesPerPush}`;
    const runtime = [
      ["Verbunden", d.connected === undefined ? "-" : (d.connected ? "Ja" : "Nein")],
      ["Aktive Subscriptions", d.subscribed ?? d.subscriptions ?? "-"],
      ["Aktives Polling", d.fallback_polling ?? d.fallback_objects ?? "-"],
      ["Pushs / Ø Änderungen", pushChangeValue],
      ["Ø Push-Verarbeitung ms", d.dispatch_time_avg_ms === undefined ? "-" : Number(d.dispatch_time_avg_ms).toFixed(2)],
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
    const dashboardTab = this._dashboardTab === "developer" ? "developer" : "live";
    const summary = [
      `Punkte: ${d.objects ?? this._total ?? "-"}`,
      `aktiv: ${d.enabled ?? "-"}`,
      `Push: ${d.configured_push ?? "-"}/${d.subscribed ?? "-"}`,
      `Polling: ${d.configured_polling ?? "-"}/${d.fallback_polling ?? "-"}`,
      `Pushs / Ø Änderungen: ${pushChangeValue}`,
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
          <section class="dashboard-group dashboard-group-wide dashboard-monitor-group">
            <div class="dashboard-monitor-tabs">
              <button class="dashboard-monitor-tab ${dashboardTab === "developer" ? "active" : ""}" data-dashboard-tab="developer">Entwickler / Push-Diagnose</button>
              <button class="dashboard-monitor-tab ${dashboardTab === "live" ? "active" : ""}" data-dashboard-tab="live">Live-Monitor <span class="live-dot ${this._livePaused ? "paused" : ""}"></span></button>
            </div>
            ${dashboardTab === "developer"
              ? `<div class="dashboard-cards">${renderCards(developer)}</div>`
              : `<div id="liveMonitorHost">${this._liveMonitorHtml()}</div>`}
          </section>
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
    if (label.includes("Ø Push-Verarbeitung")) {
      if (Number(value) > 50) return "stat-bad";
      if (Number(value) > 20) return "stat-warn";
    }
    if (label.includes("Max Push-Verarbeitung")) {
      if (Number(value) > 250) return "stat-bad";
      if (Number(value) > 100) return "stat-warn";
    }
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
    this._historyByUid.clear();
    this._historyByUid.set(uid, compacted.slice(-100));
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
    const sideScrollTop = this._rememberSideScroll();
    const active = this.shadowRoot.activeElement;
    const focusId = active?.id || null;
    const tableScrollTop = this.shadowRoot.getElementById("tableWrap")?.scrollTop ?? 0;
    const selectionStart = typeof active?.selectionStart === "number" ? active.selectionStart : null;
    const selectionEnd = typeof active?.selectionEnd === "number" ? active.selectionEnd : null;
    const selected = this._selected;
    const styles = `
      :host { display:block; color: var(--primary-text-color); background: var(--primary-background-color); height:100vh; overflow:hidden; }
      .wrap { height:100vh; box-sizing:border-box; padding: 12px 20px 16px; max-width: 1900px; margin: 0 auto; display:flex; flex-direction:column; overflow:hidden; }
      .header { flex:0 0 auto; display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:12px; }
      .header-actions-menu { position:relative; margin:0; }
      .mobile-actions-toggle { display:none; }
      .header-action-buttons { display:flex; gap:8px; align-items:center; }
      h1 { margin:0; font-size:28px; font-weight:500; }
      h2 { margin:0 0 4px 0; font-size:20px; font-weight:500; }
      h3 { margin:18px 0 8px 0; font-size:15px; font-weight:600; }
      .subtitle { color: var(--secondary-text-color); margin-top:4px; }
      .frontend-version { display:inline-flex; margin-top:6px; padding:2px 8px; border-radius:999px; border:1px solid var(--divider-color); color:var(--secondary-text-color); font-size:11px; background:var(--secondary-background-color); }
      .toolbar { flex:0 0 auto; display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; margin-bottom:8px; padding:8px; background:linear-gradient(135deg, color-mix(in srgb, var(--card-background-color) 96%, var(--primary-color)), var(--card-background-color)); }
      .toolbar > div { padding:4px 6px; }
      .toolbar .toolbar-nav { align-self:stretch; display:flex; align-items:center; padding:4px 12px 4px 4px; margin-right:2px; border-right:1px solid var(--divider-color); }
      .toolbar .search-field { flex:1 1 280px; min-width:220px; }
      .toolbar .filter-field { flex:0 1 145px; min-width:112px; }
      .toolbar .check-field { flex:0 1 132px; min-width:112px; }
      .toolbar .reset-field { flex:0 0 auto; }
      .toolbar .search-field input { max-width:none; border-color:color-mix(in srgb, var(--primary-color) 32%, var(--divider-color)); background:color-mix(in srgb, var(--secondary-background-color) 96%, var(--primary-color)); }
      .toolbar .search-field input:focus { outline:2px solid color-mix(in srgb, var(--primary-color) 42%, transparent); outline-offset:1px; border-color:var(--primary-color); }
      .toolbar label { margin-bottom:4px; font-size:10px; text-transform:uppercase; letter-spacing:.02em; }
      .toolbar input, .toolbar select { padding:7px 9px; font-size:12px; min-height:32px; }
      .toolbar .check { height:32px; font-size:12px; }
      .dashboard { flex:0 0 auto; margin-bottom:10px; }
      .dashboard-shell { border-radius:12px; background: var(--card-background-color); border:1px solid var(--divider-color); box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.18)); overflow:hidden; }
      .dashboard-toggle { width:100%; display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:0; background: var(--card-background-color); color: var(--primary-text-color); text-align:left; border:0; }
      .dashboard-toggle-title { font-weight:700; white-space:nowrap; }
      .dashboard-summary { color: var(--secondary-text-color); font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .chevron { font-size:16px; width:18px; }
      .dashboard-content { display:grid; grid-template-columns: 1fr 1.25fr; gap:12px; padding:0 12px 12px 12px; }
      .dashboard-group { border-radius:12px; background: var(--secondary-background-color); border:1px solid var(--divider-color); padding:12px; }
      .dashboard-title { font-size:13px; font-weight:700; color: var(--primary-text-color); margin-bottom:10px; }
      .dashboard-group-wide { grid-column:1 / -1; }
      .dashboard-monitor-group { padding:10px; min-width:0; }
      .dashboard-monitor-tabs { display:flex; align-items:center; gap:5px; margin-bottom:8px; overflow-x:auto; }
      .dashboard-monitor-tab { flex:0 0 auto; padding:6px 10px; border-radius:14px; background:transparent; color:var(--secondary-text-color); border:1px solid transparent; font-size:11px; }
      .dashboard-monitor-tab.active { color:var(--primary-text-color); border-color:var(--divider-color); background:color-mix(in srgb, var(--primary-color) 14%, var(--secondary-background-color)); }
      .live-dot { display:inline-block; width:7px; height:7px; margin-left:4px; border-radius:50%; background:var(--success-color, #43a047); box-shadow:0 0 0 2px color-mix(in srgb, var(--success-color, #43a047) 20%, transparent); }
      .live-dot.paused { background:var(--warning-color, #ffa600); }
      .live-monitor { min-width:0; }
      .live-summary { display:flex; align-items:center; flex-wrap:wrap; gap:6px 12px; color:var(--secondary-text-color); font-size:11px; margin-bottom:5px; }
      .live-summary b { color:var(--primary-text-color); }
      .live-small-btn { padding:4px 9px; min-height:26px; font-size:10px; margin-left:auto; }
      .live-chart { height:38px; display:flex; align-items:flex-end; gap:2px; padding:3px 5px; border:1px solid var(--divider-color); border-radius:8px; background:color-mix(in srgb, var(--secondary-background-color) 88%, transparent); overflow:hidden; }
      .live-chart i { flex:1 1 0; min-width:1px; max-width:12px; border-radius:2px 2px 0 0; background:linear-gradient(180deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 55%, transparent)); }
      .live-filters { display:grid; grid-template-columns:minmax(150px,2fr) minmax(100px,.7fr) minmax(110px,.8fr) auto; gap:6px; margin:7px 0; }
      .live-filters input, .live-filters select { height:30px; padding:4px 8px; border-radius:7px; font-size:11px; }
      .live-table-wrap { max-height:238px; overflow:auto; border:1px solid var(--divider-color); border-radius:8px; }
      .live-table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:11px; }
      .live-table th { position:sticky; top:0; z-index:1; background:var(--secondary-background-color); color:var(--secondary-text-color); text-align:left; padding:5px 7px; }
      .live-table td { padding:5px 7px; border-top:1px solid color-mix(in srgb, var(--divider-color) 65%, transparent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .live-table tbody tr { cursor:pointer; }
      .live-table tbody tr:hover { background:color-mix(in srgb, var(--primary-color) 9%, transparent); }
      .live-table th:nth-child(1), .live-table td:nth-child(1) { width:72px; }
      .live-table th:nth-child(3), .live-table td:nth-child(3) { width:150px; }
      .live-table th:nth-child(4), .live-table td:nth-child(4) { width:70px; }
      .live-table td small { display:block; color:var(--secondary-text-color); overflow:hidden; text-overflow:ellipsis; }
      .live-value span { color:var(--primary-color); padding:0 5px; }
      .live-source { display:inline-flex; border:1px solid var(--divider-color); border-radius:10px; padding:1px 5px; font-size:10px; }
      .live-foot { color:var(--secondary-text-color); font-size:9px; margin-top:4px; text-align:right; }
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
      button.danger { color: var(--error-color, #db4437); }
      button:disabled { opacity:.55; cursor:default; }
      .view-tabs { flex:0 0 auto; display:flex; flex-wrap:wrap; gap:6px; margin:0; }
      .view-tab { background:var(--secondary-background-color); color:var(--primary-text-color); border:1px solid var(--divider-color); border-radius:999px; padding:8px 14px; }
      .view-tab.active { background: color-mix(in srgb, var(--primary-color) 18%, var(--secondary-background-color)); border-color: color-mix(in srgb, var(--primary-color) 45%, var(--divider-color)); color:var(--primary-text-color); }
      .view-panel { flex:1 1 auto; min-height:0; margin-top:0; overflow:auto; }
      .virtual-actions { display:flex; flex-wrap:wrap; gap:6px; }
      .virtual-actions button { padding:6px 10px; font-size:12px; border-radius:14px; }
      .virtual-icon-actions { display:flex; align-items:center; gap:6px; flex-wrap:nowrap; }
      .icon-action { width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; padding:0; border-radius:50%; border:1px solid var(--divider-color); background:var(--secondary-background-color); color:var(--primary-text-color); cursor:pointer; font-size:14px; line-height:1; }
      .icon-action:hover { border-color:var(--primary-color); background:rgba(33,150,243,.12); }
      .icon-action.danger:hover { border-color:var(--error-color, #db4437); background:rgba(219,68,55,.14); color:var(--error-color, #db4437); }
      .icon-action:disabled { opacity:.45; cursor:default; }
      .compact-source { appearance:none; border:0; background:transparent; color:var(--primary-color); padding:0; font:inherit; font-weight:600; cursor:pointer; text-align:left; }
      .compact-source:hover { text-decoration:underline; }
      .virtual-type-badge { display:inline-flex; align-items:center; gap:4px; border:1px solid var(--divider-color); background:rgba(255,255,255,.04); border-radius:999px; padding:3px 8px; white-space:nowrap; font-weight:600; }
      .virtual-state-badge { display:inline-flex; align-items:center; justify-content:center; min-width:44px; border-radius:999px; padding:3px 8px; font-size:11px; font-weight:700; border:1px solid var(--divider-color); }
      .virtual-state-badge.on { color:#7ee787; background:rgba(46,160,67,.18); border-color:rgba(46,160,67,.45); }
      .virtual-state-badge.off { color:var(--secondary-text-color); background:rgba(128,128,128,.16); border-color:rgba(128,128,128,.35); }
      .virtual-state-badge.unavailable, .virtual-state-badge.unknown { color:#ffb86c; background:rgba(255,184,108,.15); border-color:rgba(255,184,108,.4); }
      .virtual-badge { display:inline-flex; align-items:center; gap:4px; width:max-content; border-radius:999px; border:1px solid var(--divider-color); background:var(--secondary-background-color); color:var(--secondary-text-color); padding:1px 7px; font-size:11px; margin-top:3px; }
      .check { display:flex; gap:8px; align-items:center; height:44px; color: var(--primary-text-color); }
      .check input { width:auto; }
      #explorerView { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; overflow:hidden; }
      .content { flex:1 1 auto; min-height:0; display:grid; grid-template-columns: minmax(0, 3fr) minmax(560px, 2fr); gap:12px; overflow:hidden; }
      .content.details-hidden { grid-template-columns: minmax(0, 1fr); }
      .content.details-hidden .side { display:none; }
      .side { padding:0; height:100%; min-height:0; overflow:hidden; display:flex; flex-direction:column; }
      .side-tabs { flex:0 0 auto; display:flex; gap:6px; padding:10px 12px 0 12px; border-bottom:1px solid var(--divider-color); background:var(--card-background-color); position:relative; z-index:30; box-shadow:0 1px 0 var(--divider-color); }
      .side-tab { border:1px solid var(--divider-color); border-bottom:0; border-radius:10px 10px 0 0; background:var(--secondary-background-color); color:var(--primary-text-color); padding:8px 10px; font-size:12px; }
      .side-tab.active { background:color-mix(in srgb, var(--primary-color) 18%, var(--card-background-color)); border-color:color-mix(in srgb, var(--primary-color) 45%, var(--divider-color)); }
      .side-body { flex:1 1 auto; min-height:0; overflow-y:auto; overflow-x:hidden; padding:14px 16px 16px 16px; position:relative; }
      .side-section-head { background:var(--card-background-color); margin:-14px -16px 12px -16px; padding:14px 16px 10px 16px; border-bottom:1px solid var(--divider-color); }
      .point-inspector-head { position:sticky; top:-14px; z-index:25; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin:-14px -16px 12px -16px; padding:14px 16px 10px 16px; border-bottom:1px solid var(--divider-color); background:color-mix(in srgb, var(--card-background-color) 96%, transparent); box-shadow:0 2px 8px rgba(0,0,0,.16); backdrop-filter:blur(10px); }
      .point-inspector-head h2 { font-weight:700; overflow-wrap:anywhere; }
      .inspector-head-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:6px; flex:0 0 auto; }
      .inspector-head-actions button { padding:7px 11px; font-size:12px; white-space:nowrap; }
      .save-hint { margin:8px 0 12px; }
      .point-summary { display:grid; grid-template-columns:1fr auto; gap:10px; align-items:start; border:1px solid var(--divider-color); border-radius:10px; background:var(--secondary-background-color); padding:10px; margin:0 0 12px 0; }
      .point-summary-title { font-size:16px; font-weight:700; line-height:1.2; overflow-wrap:anywhere; }
      .point-summary-sub { color:var(--secondary-text-color); font-size:12px; margin-top:3px; overflow-wrap:anywhere; }
      .point-summary-value { justify-self:end; display:flex; flex-direction:column; align-items:flex-end; gap:4px; min-width:74px; }
      .point-summary-value strong { font-size:18px; line-height:1; }
      .point-summary-unit { color:var(--secondary-text-color); font-size:12px; }
      .point-summary-meta { grid-column:1 / -1; display:flex; flex-wrap:wrap; gap:6px; }
      .side .virtual-overview { margin:0; border:0; box-shadow:none; background:transparent; padding:0; }
      .side .virtual-table { min-width:0; table-layout:auto; }
      .side .virtual-table th, .side .virtual-table td { font-size:11px; padding:6px; }
      .side-virtual-cards { display:flex; flex-direction:column; gap:10px; }
      .side-virtual-card { border:1px solid var(--divider-color); border-radius:12px; padding:10px; background:rgba(255,255,255,.03); }
      .side-virtual-card-title { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
      .side-virtual-card-name { font-weight:700; overflow:hidden; text-overflow:ellipsis; }
      .side-virtual-card-meta { display:flex; align-items:center; gap:8px; color:var(--secondary-text-color); font-size:12px; margin:4px 0; overflow:hidden; overflow-wrap:anywhere; }
      .side-virtual-card-rules { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; margin:8px 0; }
      .side-virtual-card-rules div { min-width:0; border:1px solid var(--divider-color); border-radius:8px; padding:5px; background:rgba(0,0,0,.12); }
      .side-virtual-card-rules span { display:block; color:var(--secondary-text-color); font-size:10px; }
      .side-virtual-card-rules code { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .side-virtual-card { border:1px solid color-mix(in srgb, var(--divider-color) 84%, var(--primary-color)); border-radius:10px; background:linear-gradient(180deg, color-mix(in srgb, var(--secondary-background-color) 92%, var(--primary-color)), var(--secondary-background-color)); padding:10px; overflow:hidden; }
      .side-virtual-card-title { display:flex; align-items:center; justify-content:space-between; gap:8px; font-weight:700; }
      .side-virtual-card-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .side-virtual-card-meta { color:var(--secondary-text-color); font-size:12px; overflow-wrap:anywhere; margin-top:3px; }
      .side-virtual-card-rules { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-top:8px; font-size:11px; }
      .side-virtual-card-rules div { border:1px solid var(--divider-color); border-radius:8px; padding:5px 6px; background:var(--card-background-color); min-width:0; }
      .side-virtual-card-rules span { display:block; color:var(--secondary-text-color); margin-bottom:2px; }
      .side-virtual-card-rules code { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; }
      .virtual-rule-flow { display:grid; grid-template-columns:1fr auto 1fr; gap:6px; align-items:center; margin:9px 0; }
      .virtual-rule-box { min-width:0; border:1px solid var(--divider-color); border-radius:8px; background:var(--card-background-color); padding:6px 8px; }
      .virtual-rule-box span { display:block; color:var(--secondary-text-color); font-size:10px; text-transform:uppercase; letter-spacing:.03em; margin-bottom:2px; }
      .virtual-rule-box code { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .virtual-rule-arrow { color:var(--secondary-text-color); font-size:13px; }
      .selected-source-box { border:1px solid var(--divider-color); border-radius:10px; padding:10px; margin:0 0 12px 0; background:var(--secondary-background-color); }
      table { width:100%; min-width:980px; border-collapse:collapse; table-layout:fixed; }
      col.select-col-col { width:42px; }
      col.object-col-col { width:210px; }
      col.entity-col-col { width:auto; min-width:330px; }
      col.value-col-col { width:108px; }
      col.unit-col-col { width:130px; }
      col.override-col-col { width:90px; }
      col.runtime-col-col { width:42px; }
      th, td { text-align:left; padding:9px 12px; border-bottom:1px solid color-mix(in srgb, var(--divider-color) 72%, transparent); font-size:13px; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; }
      th[data-sort='present_value'], td[data-col='value'], th[data-sort='override'], td[data-col='override'], th[data-sort='runtime'], td[data-col='status'] { text-align:center; }
      td[data-col='entity'] { white-space:normal; }
      td[data-col='value'] { padding-left:6px; padding-right:6px; }
      td[data-col='override'] { padding-left:6px; padding-right:6px; }
      td[data-col='status'] { padding-left:6px; padding-right:6px; }
      th { color: var(--secondary-text-color); font-weight:600; font-size:12px; position:sticky; top:0; background: color-mix(in srgb, var(--card-background-color) 94%, var(--primary-background-color)); z-index:20; overflow:hidden; box-shadow: 0 1px 0 var(--divider-color); }
      th.sortable { cursor:pointer; user-select:none; }
      .sort-btn { border:0; border-radius:0; background:transparent; color:inherit; padding:0; font:inherit; cursor:pointer; }
      td.select-col { position:sticky; left:0; z-index:2; background:var(--card-background-color); }
      th.select-col { position:sticky; left:0; z-index:30; background:var(--card-background-color); }
      td[data-col='object'] { position:sticky; left:42px; z-index:2; background:var(--card-background-color); box-shadow: 1px 0 0 var(--divider-color); }
      th.object-col { position:sticky; left:42px; z-index:29; background:var(--card-background-color); box-shadow: 1px 0 0 var(--divider-color), 0 1px 0 var(--divider-color); }

      .rule-help { margin-top:8px; padding:8px 10px; border-radius:8px; background:var(--secondary-background-color); font-size:12px; line-height:1.45; }
      .rule-help code { font-family:var(--code-font-family, monospace); background:rgba(127,127,127,.12); border-radius:4px; padding:1px 4px; }
      .virtual-overview { margin:0 0 12px 0; padding:12px; }
      .virtual-filterbar { grid-template-columns: minmax(260px, 520px) auto 1fr; }
      tr.source-jump-highlight { outline:2px solid var(--primary-color); background: color-mix(in srgb, var(--primary-color) 18%, transparent) !important; }
      .virtual-overview-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
      .virtual-overview-title { font-weight:700; }
      .virtual-table-wrap { overflow:auto; }
      .virtual-table { width:100%; min-width:860px; table-layout:fixed; }
      .virtual-table th, .virtual-table td { position:static; padding:10px 8px; font-size:12px; white-space:normal; overflow-wrap:anywhere; vertical-align:middle; }
      .virtual-table th:nth-child(1) { width:110px; }
      .virtual-table th:nth-child(2) { width:300px; }
      .virtual-table th:nth-child(3) { width:120px; }
      .virtual-table th:nth-child(4) { width:80px; }
      .virtual-table th:nth-child(5), .virtual-table th:nth-child(6), .virtual-table th:nth-child(7) { width:90px; }
      .virtual-table th:nth-child(8) { width:170px; }
      .virtual-table tr { cursor:default; }
      .virtual-table .link-cell { font-size:13px; }
      .virtual-name-link { color:var(--primary-text-color); font-weight:600; }
      .entity-id-line { margin-top:3px; font-size:11px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
      .virtual-source-btn { appearance:none; border:0; background:transparent; color:var(--primary-color); padding:0; font:inherit; cursor:pointer; text-align:left; }
      .virtual-source-btn:hover { text-decoration:underline; }
      .assistant-card { margin:10px 0 12px; padding:10px 12px; border:1px solid color-mix(in srgb, var(--primary-color) 35%, var(--divider-color)); border-radius:10px; background:color-mix(in srgb, var(--primary-color) 8%, var(--card-background-color)); }
      .assistant-card .assistant-title { font-weight:700; margin-bottom:4px; }
      .assistant-card .assistant-grid { display:grid; grid-template-columns:82px minmax(0,1fr); gap:3px 8px; margin-top:8px; font-size:12px; }
      .assistant-card .assistant-grid span:nth-child(odd) { color:var(--secondary-text-color); }
      .assistant-card button { margin-top:10px; }
      .rule-preview { margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .rule-preview > div { border:1px solid var(--divider-color); border-radius:8px; padding:8px 10px; background:var(--card-background-color); }
      .rule-preview span, .rule-preview strong { display:block; }
      .rule-result.on { color:var(--success-color, #0b8); }
      .rule-result.off { color:var(--secondary-text-color); }
      .rule-result.unav { color:var(--error-color, #d33); }

      .virtual-spacer td { padding:0 !important; border-bottom:0 !important; }
      .virtual-spacer:hover { background:transparent; }
      tr:hover td[data-col='object'], tr:hover td.select-col { background:var(--secondary-background-color); }
      tr.selected td[data-col='object'], tr.selected td.select-col { background: color-mix(in srgb, var(--primary-color) 16%, var(--card-background-color)); }
      .inline-select { min-width:100px; max-width:140px; padding:6px 8px; font-size:13px; border-radius:7px; }
      .unit-stack { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      .unit-display { font-weight:600; }
      tr { cursor:pointer; }
      tr:hover { background: color-mix(in srgb, var(--secondary-background-color) 88%, var(--primary-color)); }
      tr.selected { background: color-mix(in srgb, var(--primary-color) 16%, transparent); outline: 1px solid color-mix(in srgb, var(--primary-color) 28%, transparent); }
      tr.value-up { --bepacom-change-color: var(--success-color, #43a047); }
      tr.value-down { --bepacom-change-color: var(--error-color, #e53935); }
      tr.value-changed { --bepacom-change-color: var(--warning-color, #fb8c00); }
      tr.value-flash td[data-col='value'] .value-link { animation: bepacom-value-pill 3.2s ease-out; }
      tr.value-flash td[data-col='value'] .value-link::after { animation: bepacom-value-ring 1.6s ease-out; }
      @keyframes bepacom-value-pill {
        0% {
          color: var(--primary-text-color);
          background: color-mix(in srgb, var(--bepacom-change-color, #43a047) 34%, var(--card-background-color));
          box-shadow:
            0 0 0 1px color-mix(in srgb, var(--bepacom-change-color, #43a047) 60%, transparent),
            0 0 18px color-mix(in srgb, var(--bepacom-change-color, #43a047) 34%, transparent);
          transform: translateY(-1px) scale(1.035);
        }
        22% {
          background: color-mix(in srgb, var(--bepacom-change-color, #43a047) 22%, var(--card-background-color));
          box-shadow:
            0 0 0 1px color-mix(in srgb, var(--bepacom-change-color, #43a047) 42%, transparent),
            0 0 12px color-mix(in srgb, var(--bepacom-change-color, #43a047) 24%, transparent);
          transform: translateY(0) scale(1);
        }
        100% {
          color: var(--primary-text-color);
          background: transparent;
          box-shadow: 0 0 0 1px transparent, 0 0 0 transparent;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes bepacom-value-ring {
        0% { opacity:.95; transform:scale(.88); }
        70% { opacity:0; transform:scale(1.32); }
        100% { opacity:0; transform:scale(1.32); }
      }
      .table-wrap { height:100%; min-height:0; overflow:auto; scrollbar-color: color-mix(in srgb, var(--secondary-text-color) 42%, transparent) transparent; scrollbar-width:thin; }
      .table-wrap::-webkit-scrollbar, .side-body::-webkit-scrollbar, .view-panel::-webkit-scrollbar, .virtual-table-wrap::-webkit-scrollbar { width:8px; height:8px; }
      .table-wrap::-webkit-scrollbar-thumb, .side-body::-webkit-scrollbar-thumb, .view-panel::-webkit-scrollbar-thumb, .virtual-table-wrap::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--secondary-text-color) 36%, transparent); border-radius:999px; }
      .table-wrap::-webkit-scrollbar-track, .side-body::-webkit-scrollbar-track, .view-panel::-webkit-scrollbar-track, .virtual-table-wrap::-webkit-scrollbar-track { background:transparent; }
      .select-col { width:36px; text-align:center; }
      .object-main { display:flex; align-items:center; gap:10px; }
      .type-icon { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:10px; font-size:11px; font-weight:800; letter-spacing:.2px; color:white; flex:0 0 auto; }
      .type-ai { background:#1e88e5; } .type-ao { background:#8e24aa; } .type-av { background:#00897b; }
      .type-bi { background:#43a047; } .type-bo { background:#ef6c00; } .type-bv { background:#6d4c41; }
      .type-ms { background:#546e7a; } .type-other { background:#757575; }
      .group-row td { background: color-mix(in srgb, var(--primary-color) 10%, var(--card-background-color)); position:sticky; top:0; z-index:1; }
      .group-toggle { appearance:none; border:0; background:transparent; color:var(--primary-text-color); font-weight:700; cursor:pointer; padding:6px 0; }
      .virtual-spacer td { padding:0; border:0; }
      .bulkbar { flex:0 0 auto; display:flex; flex-wrap:wrap; gap:10px; align-items:end; padding:10px 12px; margin-bottom:10px; }
      .bulkbar-empty { color: var(--secondary-text-color); font-size:12px; margin-bottom:8px; }
      .bulkbar label { display:flex; flex-direction:column; gap:3px; font-size:11px; color:var(--secondary-text-color); }
      .bulkbar select { min-width:130px; }
      .name { font-weight:700; }
      .muted { color: var(--secondary-text-color); font-size:12px; }

      .link-cell { appearance:none; border:0; background:transparent; color:var(--primary-text-color); padding:0; margin:0; font:inherit; text-align:left; cursor:pointer; }
      .link-cell:hover { color:var(--primary-color); text-decoration:underline; }
      .value-link { position:relative; display:inline-flex; align-items:center; justify-content:center; min-width:44px; max-width:100%; padding:4px 9px; border-radius:999px; font-weight:700; font-size:14px; line-height:1.25; transition:background .18s ease, box-shadow .18s ease, color .18s ease; }
      .value-link::after { content:""; position:absolute; inset:-4px; border-radius:inherit; border:1px solid var(--bepacom-change-color, #43a047); opacity:0; pointer-events:none; }
      .entity-stack { display:flex; flex-direction:column; gap:4px; min-width:0; }
      .linked-entities { display:flex; flex-direction:column; gap:3px; min-width:0; }
      .linked-entity-link { appearance:none; border:0; background:transparent; color:var(--secondary-text-color); padding:0; margin:0; font:inherit; font-size:12px; line-height:1.25; text-align:left; cursor:pointer; max-width:100%; display:flex; align-items:center; gap:4px; white-space:normal; overflow-wrap:anywhere; }
      .linked-entity-link:hover { color:var(--primary-color); text-decoration:underline; }
      .linked-entity-link:disabled { opacity:.65; cursor:default; text-decoration:none; }
      .linked-icon { flex:0 0 auto; opacity:.9; }
      .linked-name { min-width:0; overflow-wrap:anywhere; }
      .linked-state { display:inline-flex; align-items:center; border-radius:999px; padding:1px 6px; margin-left:4px; font-size:11px; background:var(--secondary-background-color); border:1px solid var(--divider-color); color:var(--primary-text-color); white-space:nowrap; }
      .runtime-filter { gap:6px; }
      .runtime-head { text-align:center; }
      .write-profile-head, .write-profile-cell { width:72px; text-align:center; }
      .write-profile-dot { display:inline-block; width:11px; height:11px; border-radius:50%; vertical-align:middle; border:1px solid color-mix(in srgb, var(--divider-color) 55%, transparent); }
      .write-profile-dot.direct { background:#1e88e5; box-shadow:0 0 0 3px color-mix(in srgb, #1e88e5 18%, transparent); }
      .write-profile-dot.glt { background:#8e24aa; box-shadow:0 0 0 3px color-mix(in srgb, #8e24aa 18%, transparent); }
      .runtime-dot { display:inline-flex; width:12px; height:12px; border-radius:50%; border:1px solid color-mix(in srgb, var(--divider-color) 70%, transparent); box-shadow:0 0 0 3px color-mix(in srgb, var(--divider-color) 20%, transparent); vertical-align:middle; }
      .runtime-off { background:#7a7a7a; }
      .runtime-poll { background:#f57c00; box-shadow:0 0 0 3px color-mix(in srgb, #f57c00 18%, transparent); }
      .runtime-push { background:#43a047; box-shadow:0 0 0 3px color-mix(in srgb, #43a047 18%, transparent); }
      .runtime-snapshot { background:#1e88e5; box-shadow:0 0 0 3px color-mix(in srgb, #1e88e5 18%, transparent); }
      .runtime-wait { background:#ffa600; box-shadow:0 0 0 3px color-mix(in srgb, #ffa600 18%, transparent); }
      .mode-chip { display:inline-flex; align-items:center; gap:6px; width:max-content; border-radius:999px; border:1px solid var(--divider-color); background:var(--secondary-background-color); color:var(--primary-text-color); padding:3px 8px; font-size:12px; font-weight:600; }
      .mode-chip::before { content:""; width:8px; height:8px; border-radius:50%; background:#7a7a7a; box-shadow:0 0 0 3px color-mix(in srgb, #7a7a7a 18%, transparent); }
      .mode-chip.push { border-color:color-mix(in srgb, #1e88e5 48%, var(--divider-color)); background:color-mix(in srgb, #1e88e5 12%, var(--secondary-background-color)); }
      .mode-chip.push::before { background:#1e88e5; box-shadow:0 0 0 3px color-mix(in srgb, #1e88e5 18%, transparent); }
      .mode-chip.polling { border-color:color-mix(in srgb, #43a047 48%, var(--divider-color)); background:color-mix(in srgb, #43a047 12%, var(--secondary-background-color)); }
      .mode-chip.polling::before { background:#43a047; box-shadow:0 0 0 3px color-mix(in srgb, #43a047 18%, transparent); }
      .mode-chip.wait { border-color:color-mix(in srgb, #ffa600 48%, var(--divider-color)); background:color-mix(in srgb, #ffa600 12%, var(--secondary-background-color)); }
      .mode-chip.wait::before { background:#ffa600; box-shadow:0 0 0 3px color-mix(in srgb, #ffa600 18%, transparent); }
      .mode-chip.off { color:var(--secondary-text-color); }
      .pill { display:inline-flex; align-items:center; border-radius:999px; padding:3px 8px; font-size:12px; background: var(--secondary-background-color); border:1px solid var(--divider-color); margin-right:4px; white-space:nowrap; }
      .ok { color: var(--success-color, #43a047); }
      .warn { color: var(--warning-color, #ffa600); }
      .bad { color: var(--error-color, #db4437); }
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
      @media (max-width: 1100px) { :host { height:auto; overflow:visible; } .wrap { height:auto; min-height:100vh; overflow:visible; } .toolbar { align-items:stretch; } .toolbar .toolbar-nav { flex:1 0 100%; border-right:0; border-bottom:1px solid var(--divider-color); padding:2px 2px 8px; } .dashboard-content { grid-template-columns: 1fr; } .dashboard-cards { grid-template-columns: repeat(2, 1fr); } #explorerView { overflow:visible; } .content { grid-template-columns: 1fr; overflow:visible; } .table-wrap { height:70vh; } .side { height:70vh; } }
      @media (max-width: 700px) {
        .dashboard-monitor-group { padding:8px; }
        .live-summary { gap:4px 9px; }
        .live-summary span:nth-child(2) { display:none; }
        .live-filters { grid-template-columns:1fr 1fr; }
        .live-filters input { grid-column:1 / -1; }
        .live-small-btn { margin-left:0; }
        .live-table-wrap { max-height:260px; }
        .live-table th:nth-child(1), .live-table td:nth-child(1) { width:58px; }
        .live-table th:nth-child(3), .live-table td:nth-child(3) { width:104px; }
        .live-table th:nth-child(4), .live-table td:nth-child(4) { display:none; }
        .live-foot { text-align:left; }
        .wrap { padding:8px; }
        .header { align-items:flex-start; gap:8px; }
        h1 { font-size:20px; line-height:1.2; }
        .subtitle { font-size:12px; }
        .mobile-actions-toggle { display:flex; align-items:center; justify-content:center; width:42px; height:42px; padding:0; margin:0; border-radius:50%; border:1px solid var(--divider-color); background:var(--secondary-background-color); color:var(--primary-text-color); cursor:pointer; font-size:22px; }
        .header-actions-menu.open > .mobile-actions-toggle { background:color-mix(in srgb, var(--primary-color) 18%, var(--secondary-background-color)); border-color:var(--primary-color); }
        .header-actions-menu > .header-action-buttons { display:none; }
        .header-actions-menu.open > .header-action-buttons { position:absolute; z-index:100; top:48px; right:0; width:min(280px, calc(100vw - 16px)); box-sizing:border-box; display:grid; grid-template-columns:1fr 1fr; gap:7px; padding:10px; border:1px solid var(--divider-color); border-radius:12px; background:var(--card-background-color); box-shadow:0 8px 28px rgba(0,0,0,.35); }
        .header-action-buttons button { width:100%; padding:9px 8px; font-size:12px; }
        .header-action-buttons #toggleDetails, .header-action-buttons #reloadIntegration { grid-column:1 / -1; }
        .toolbar .search-field, .toolbar .filter-field, .toolbar .check-field { flex:1 1 100%; min-width:0; }
        .toolbar .reset-field { margin-left:auto; }
        .view-tab { flex:1 1 auto; padding:8px 10px; }
        .dashboard-cards { grid-template-columns:1fr 1fr; }
        .content { display:block; }
        .table-wrap { height:72vh; border:0; background:transparent; box-shadow:none; overflow-y:auto; overflow-x:hidden; }
        .table-wrap > table { display:block; min-width:0; width:100%; table-layout:auto; border-collapse:separate; }
        .table-wrap > table colgroup, .table-wrap > table > thead { display:none; }
        .table-wrap > table > tbody { display:block; }
        .table-wrap > table > tbody > tr:not(.group-row):not(.virtual-spacer) { display:block; margin:0 0 10px; border:1px solid var(--divider-color); border-radius:12px; background:var(--card-background-color); box-shadow:var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.18)); overflow:hidden; }
        .table-wrap > table > tbody > tr:not(.group-row):not(.virtual-spacer) > td { position:static !important; display:grid; grid-template-columns:86px minmax(0,1fr); gap:10px; align-items:center; width:auto; min-height:38px; padding:7px 10px; text-align:left !important; white-space:normal; overflow:visible; border-bottom:1px solid color-mix(in srgb, var(--divider-color) 65%, transparent); background:transparent !important; box-shadow:none !important; }
        .table-wrap > table > tbody > tr:not(.group-row):not(.virtual-spacer) > td:last-child { border-bottom:0; }
        .table-wrap td::before { color:var(--secondary-text-color); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        .table-wrap td.select-col { display:flex !important; justify-content:flex-end; min-height:28px !important; padding:5px 10px !important; }
        .table-wrap td.select-col::before { content:"Auswahl"; margin-right:auto; }
        .table-wrap td[data-col='object']::before { content:"Objekt"; }
        .table-wrap td[data-col='entity']::before { content:"HA Entität"; }
        .table-wrap td[data-col='value']::before { content:"Wert"; }
        .table-wrap td[data-col='unit']::before { content:"Einheit"; }
        .table-wrap td[data-col='override']::before { content:"Override"; }
        .table-wrap td[data-col='write-profile']::before { content:"Schreiben"; }
        .table-wrap td[data-col='status']::before { content:"Status"; }
        .table-wrap .group-row { display:block; margin:8px 0; }
        .table-wrap .group-row td { display:block; position:static; padding:8px; }
        .table-wrap .virtual-spacer { display:block; }
        .table-wrap .virtual-spacer td { display:block; }
        .linked-entities { margin-top:5px; }
        .inline-select { max-width:none; }
        .virtual-overview { padding:9px; }
        .virtual-overview-head { align-items:flex-start; flex-direction:column; }
        .virtual-table-wrap { overflow:visible; }
        .virtual-table { display:block; min-width:0; width:100%; }
        .virtual-table thead { display:none; }
        .virtual-table tbody { display:block; }
        .virtual-table tr { display:block; margin-bottom:10px; padding:5px 0; border:1px solid var(--divider-color); border-radius:12px; background:var(--secondary-background-color); overflow:hidden; }
        .virtual-table td { display:grid; grid-template-columns:78px minmax(0,1fr); gap:8px; align-items:center; width:auto !important; padding:7px 10px !important; border-bottom:1px solid color-mix(in srgb, var(--divider-color) 65%, transparent); overflow:visible; }
        .virtual-table td:last-child { border-bottom:0; }
        .virtual-table td::before { color:var(--secondary-text-color); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        .virtual-table td:nth-child(1)::before { content:"Quelle"; }
        .virtual-table td:nth-child(2)::before { content:"HA Entität"; }
        .virtual-table td:nth-child(3)::before { content:"Typ"; }
        .virtual-table td:nth-child(4)::before { content:"Zustand"; }
        .virtual-table td:nth-child(5)::before { content:"ON"; }
        .virtual-table td:nth-child(6)::before { content:"OFF"; }
        .virtual-table td:nth-child(7)::before { content:"ELSE"; }
        .virtual-table td:nth-child(8)::before { content:"Aktionen"; }
        .virtual-icon-actions { flex-wrap:wrap; }
        .side { height:70vh; min-height:70vh; max-height:70vh; margin-top:10px; overflow:hidden; }
        .point-inspector-head { flex-direction:column; }
        .inspector-head-actions { width:100%; justify-content:flex-start; }
      }
    `;

    const rows = this._rowsHtml();

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="wrap">
        <div class="header">
          <div>
            <h1>Engelsoft Beacon BACnet/IP</h1>
            <div id="subtitle" class="subtitle">Sidebar-Ansicht für gefundene BACnet-Objekte${this._total !== undefined ? ` · ${this._points.length} von ${this._total}` : ""}${this._limited ? " · Liste begrenzt" : ""}</div><div class="frontend-version">${this._versionLabel()}</div>
          </div>
          <div class="header-actions-menu">
            <button id="mobileActionsToggle" class="mobile-actions-toggle" type="button" title="Aktionen" aria-label="Aktionen öffnen" aria-expanded="false">☰</button>
            <div class="header-action-buttons">
              <button class="secondary" id="exportJson">JSON</button>
              <button class="secondary" id="exportCsv">CSV</button>
              <button class="secondary" id="exportExcel">Excel</button>
              <button class="secondary ${this._detailsVisible ? "details-toggle-active" : ""}" id="toggleDetails">${this._detailsVisible ? "Details ausblenden" : "Details anzeigen"}</button>
              <button class="secondary" id="reloadIntegration" ${(this._saving || this._manualReloadRunning || Date.now() < this._manualReloadUntil) ? "disabled" : ""}>Integration neu laden</button>
              <button class="secondary" id="refresh">Aktualisieren${this._loading ? " …" : ""}</button>
            </div>
          </div>
        </div>

        ${this._error ? `<div class="error">${this._escape(this._error)}</div>` : ""}
        ${this._message ? `<div class="notice">${this._escape(this._message)}</div>` : ""}

        <div id="dashboard" class="dashboard">${this._dashboardHtml()}</div>

        ${this._activeView === "virtual" ? `
        <div class="toolbar card virtual-filterbar">
          <div class="toolbar-nav">${this._viewTabsHtml()}</div>
          <div class="search-field"><label>Suche virtuelle Entitäten</label><input id="virtualSearch" value="${this._escape(this._virtualSearch || "")}" placeholder="Name, ID, Quelle · * und ? möglich"></div>
          <div class="reset-field"><label>&nbsp;</label><button id="clearVirtualSearch" class="secondary">Reset</button></div>
        </div>` : `
        <div class="toolbar card">
          <div class="toolbar-nav">${this._viewTabsHtml()}</div>
          <div class="search-field"><label>Suche BACnet-Objekte</label><input id="search" value="${this._escape(this._filters.search)}" placeholder="820*, Rollo, multiStateInput 82*"></div>
          <div class="filter-field"><label>Device</label><select id="device">${this._deviceOptions()}</select></div>
          <div class="filter-field"><label>Objekttyp</label><select id="type">${this._typeOptions()}</select></div>
          <div class="filter-field"><label>Gruppierung</label><select id="groupBy">${this._groupOptions()}</select></div>
          <div class="check-field"><label>Overrides</label><div class="check"><input id="onlyOverrides" type="checkbox" ${this._filters.only_overrides ? "checked" : ""}> nur Overrides</div></div>
          <div class="check-field"><label>Modus</label><div class="check runtime-filter"><input id="onlySubscribe" type="checkbox" ${this._filters.only_subscribe ? "checked" : ""}> <span class="runtime-dot runtime-push"></span><span>Subscribe</span></div></div>
          <div class="reset-field"><label>&nbsp;</label><button id="clear" class="secondary">Reset</button></div>
        </div>`}

        ${this._activeView === "virtual" ? this._virtualEntitiesPageHtml() : `
        <div id="explorerView">
          ${this._bulkToolbarHtml()}
          <div class="content ${this._detailsVisible ? "" : "details-hidden"}">
            <div id="tableWrap" class="card table-wrap">
              ${rows ? `<table>${this._tableColgroupHtml()}<thead><tr>${this._tableHeaderHtml()}</tr></thead><tbody id="pointsBody">${rows}</tbody></table>` : `<div id="emptyState" class="empty">Keine BACnet-Objekte gefunden.</div>`}
            </div>
            ${this._detailsVisible ? `<div class="card side">
              ${this._sidePanelHtml(selected)}
            </div>` : ""}
          </div>
        </div>`}
      </div>
    `;

    this._bindEvents();
    const tableWrap = this.shadowRoot.getElementById("tableWrap");
    if (tableWrap) tableWrap.scrollTop = tableScrollTop;
    this._restoreSideScroll(sideScrollTop);
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



  _viewTabsHtml() {
    const count = this._allVirtualEntities().length;
    const tab = (id, label) => `<button class="view-tab ${this._activeView === id ? "active" : ""}" data-view-tab="${id}" type="button">${label}</button>`;
    return `<div class="view-tabs">${tab("explorer", "Explorer")}${tab("virtual", `Virtuelle Entitäten${count ? ` (${count})` : ""}`)}</div>`;
  }

  _virtualEntitiesPageHtml() {
    return `<div class="view-panel">${this._virtualEntitiesOverviewHtml(true)}</div>`;
  }

  _allVirtualEntities() {
    const rows = [];
    const q = this._normalizeSearch(this._virtualSearch || "");
    for (const p of this._points || []) {
      for (const ent of this._linkedEntities(p)) {
        const haystack = [
          ent.name, ent.friendly_name, ent.entity_name, ent.entity_id, ent.unique_id,
          ent.entity_type, ent.device_class, ent.on_value, ent.off_value, ent.else_state,
          p.object_key, p.object_name, p.unique_id, p.device_id, p.object_type, p.instance
        ].map((x) => x === undefined || x === null ? "" : String(x)).join(" ");
        if (!q || this._matchesSearchQuery(haystack, q)) rows.push({ source: p, ent });
      }
    }
    return rows;
  }

  _compactSourceLabel(p) {
    const type = String(p?.object_type || p?.object_key || "").toLowerCase();
    const inst = p?.instance ?? "";
    const map = {
      analoginput: "AI", "analog-input": "AI", analogvalue: "AV", "analog-value": "AV",
      binaryinput: "BI", "binary-input": "BI", binaryvalue: "BV", "binary-value": "BV",
      multistateinput: "MSI", "multi-state-input": "MSI", multistateoutput: "MSO", "multi-state-output": "MSO",
      device: "DEV", file: "FILE"
    };
    const key = type.replace(/[^a-z]/g, "");
    const prefix = map[type] || map[key] || String(p?.object_type || "OBJ").toUpperCase();
    return `${prefix} ${inst || ""}`.trim();
  }

  _sourceTooltip(p) {
    return [p?.object_key, p?.object_name, p?.unique_id].filter(Boolean).join(" · ");
  }

  _virtualDisplayName(ent) {
    return ent?.name || ent?.friendly_name || ent?.entity_name || ent?.entity_id || ent?.unique_id || "Virtuelle Entität";
  }

  _binaryStateLabel(state, deviceClass = "") {
    const value = String(state ?? "-").toLowerCase();
    if (value !== "on" && value !== "off") return String(state ?? "-");

    const labels = {
      battery: ["Batterie schwach", "Batterie in Ordnung"],
      battery_charging: ["Lädt", "Lädt nicht"],
      carbon_monoxide: ["Kohlenmonoxid erkannt", "Kein Kohlenmonoxid"],
      cold: ["Kalt", "Normal"],
      connectivity: ["Verbunden", "Nicht verbunden"],
      door: ["Geöffnet", "Geschlossen"],
      garage_door: ["Geöffnet", "Geschlossen"],
      gas: ["Gas erkannt", "Kein Gas"],
      heat: ["Hitze erkannt", "Keine Hitze"],
      light: ["Licht erkannt", "Kein Licht"],
      lock: ["Entriegelt", "Verriegelt"],
      moisture: ["Feucht", "Trocken"],
      motion: ["Bewegung erkannt", "Keine Bewegung"],
      moving: ["In Bewegung", "Stillstand"],
      occupancy: ["Belegt", "Nicht belegt"],
      opening: ["Geöffnet", "Geschlossen"],
      plug: ["Eingesteckt", "Ausgesteckt"],
      power: ["Strom erkannt", "Kein Strom"],
      presence: ["Anwesend", "Abwesend"],
      problem: ["Problem", "OK"],
      running: ["Läuft", "Läuft nicht"],
      safety: ["Unsicher", "Sicher"],
      smoke: ["Rauch erkannt", "Kein Rauch"],
      sound: ["Geräusch erkannt", "Kein Geräusch"],
      tamper: ["Manipulation erkannt", "Keine Manipulation"],
      update: ["Update verfügbar", "Aktuell"],
      vibration: ["Vibration erkannt", "Keine Vibration"],
      window: ["Geöffnet", "Geschlossen"],
    };
    const pair = labels[String(deviceClass || "").toLowerCase()];
    return pair ? pair[value === "on" ? 0 : 1] : value.toUpperCase();
  }

  _virtualStateBadge(state, ent = null, entityId = "") {
    const st = String(state ?? "-").toLowerCase();
    let cls = "unknown";
    if (st === "on" || st === "true" || st === "1") cls = "on";
    else if (st === "off" || st === "false" || st === "0") cls = "off";
    else if (st === "unavailable" || st === "unknown" || st === "-") cls = "unavailable";
    const deviceClass = ent?.device_class || ent?.deviceClass || "";
    const liveAttrs = entityId
      ? ` data-virtual-state-entity-id="${this._escape(entityId)}" data-device-class="${this._escape(deviceClass)}"`
      : "";
    return `<span class="virtual-state-badge ${cls}"${liveAttrs}>${this._escape(this._binaryStateLabel(state, deviceClass))}</span>`;
  }

  _virtualTypeBadge(ent) {
    const type = ent?.entity_type || "binary_sensor";
    const dc = String(ent?.device_class || "").toLowerCase();
    const icon = dc === "plug" ? "🔌" : type === "binary_sensor" ? "🔘" : "🔗";
    const label = type === "binary_sensor" ? "Binary" : type.replace("_", " ");
    return `<span class="virtual-type-badge" title="${this._escape(type)}">${icon} ${this._escape(label)}</span>`;
  }


  _virtualLiveState(ent) {
    const entityId = typeof ent === "string" ? ent : (ent?.entity_id || ent?.entityId || "");
    if (!entityId || !this.hass || !this.hass.states) {
      return { state: "unavailable", label: "unavailable", cls: "unavailable" };
    }

    const st = this.hass.states[entityId];
    if (!st) {
      return { state: "unavailable", label: "unavailable", cls: "unavailable" };
    }

    const value = String(st.state ?? "unknown");
    if (value === "on") return { state: value, label: "ON", cls: "on" };
    if (value === "off") return { state: value, label: "OFF", cls: "off" };
    if (value === "unavailable" || value === "unknown") {
      return { state: value, label: value, cls: "unavailable" };
    }
    return { state: value, label: value, cls: "neutral" };
  }

  _virtualActionsHtml(source, ent, name, entityId) {
    const sourceUid = this._escape(source?.unique_id || "");
    const virtualUid = this._escape(ent?.unique_id || "");
    const safeName = this._escape(name || "Virtuelle Entität");
    const safeEntity = this._escape(entityId || "");
    return `<div class="virtual-icon-actions">
      <button class="icon-action virtual-source-btn" data-source-uid="${sourceUid}" title="Quelle öffnen" aria-label="Quelle öffnen" type="button">📍</button>
      <button class="icon-action linked-entity-link" data-entity-id="${safeEntity}" ${entityId ? "" : "disabled"} title="HA-Dialog öffnen" aria-label="HA-Dialog öffnen" type="button">🏠</button>
      <button class="icon-action virtual-edit-btn" data-source-uid="${sourceUid}" data-virtual-uid="${virtualUid}" title="Bearbeiten" aria-label="Bearbeiten" type="button">✏️</button>
      <button class="icon-action virtual-duplicate-btn" data-source-uid="${sourceUid}" data-virtual-uid="${virtualUid}" title="Duplizieren" aria-label="Duplizieren" type="button">📄</button>
      <button class="icon-action danger virtual-delete-btn" data-source-uid="${sourceUid}" data-virtual-uid="${virtualUid}" data-virtual-name="${safeName}" title="Löschen" aria-label="Löschen" type="button">🗑️</button>
    </div>`;
  }

  _virtualEntitiesOverviewHtml(fullPage = false, sourcePoint = null) {
    const rows = sourcePoint
      ? this._linkedEntities(sourcePoint).map((ent) => ({ source: sourcePoint, ent }))
      : this._allVirtualEntities();
    if (!rows.length) {
      const emptyText = sourcePoint
        ? "Für diesen BACnet-Punkt ist noch keine virtuelle Entität angelegt."
        : "Noch keine virtuellen Entitäten angelegt. Öffne im Explorer einen BACnet-Datenpunkt und erstelle dort unter „Virtuelle Entität“ einen neuen Eintrag.";
      return `<div class="card virtual-overview"><div class="virtual-overview-head"><div><div class="virtual-overview-title">Virtuelle Entitäten</div><div class="muted">${emptyText}</div></div></div></div>`;
    }

    if (!fullPage) {
      const cards = rows.map(({ source, ent }) => {
        const entityId = ent.entity_id || "";
        const live = this._virtualLiveState({ entity_id: entityId });
        const state = live?.state ?? ent.state ?? "-";
        const name = this._virtualDisplayName(ent);
        const sourceLabel = this._compactSourceLabel(source);
        const sourceTitle = this._sourceTooltip(source);
        return `<div class="side-virtual-card">
          <div class="side-virtual-card-title"><span class="side-virtual-card-name" title="${this._escape(name)}">${this._escape(name)}</span>${this._virtualStateBadge(state, ent, entityId)}</div>
          <div class="side-virtual-card-meta">${this._virtualTypeBadge(ent)}<span title="${this._escape(entityId || ent.unique_id || "")}">${this._escape(entityId || ent.unique_id || "nach Reload verfügbar")}</span></div>
          <div class="side-virtual-card-meta">Quelle: <button class="virtual-source-btn compact-source" data-source-uid="${this._escape(source.unique_id)}" title="${this._escape(sourceTitle)}">${this._escape(sourceLabel)}</button></div>
          <div class="virtual-rule-flow">
            <div class="virtual-rule-box"><span>Wenn EIN</span><code title="${this._escape(ent.on_value ?? "")}">${this._escape(ent.on_value ?? "")}</code></div>
            <div class="virtual-rule-arrow">/</div>
            <div class="virtual-rule-box"><span>Wenn AUS</span><code title="${this._escape(ent.off_value ?? "")}">${this._escape(ent.off_value ?? "")}</code></div>
          </div>
          <div class="side-virtual-card-meta">Sonst: <code>${this._escape(ent.else_state || "unavailable")}</code></div>
          ${this._virtualActionsHtml(source, ent, name, entityId)}
        </div>`;
      }).join("");
      return `<div class="virtual-overview"><div class="virtual-overview-head"><div><div class="virtual-overview-title">Virtuelle Entitäten</div></div><div class="muted">${rows.length} verknüpfte Entität${rows.length === 1 ? "" : "en"}</div></div><div class="side-virtual-cards">${cards}</div></div>`;
    }

    const body = rows.map(({ source, ent }) => {
      const entityId = ent.entity_id || "";
      const live = this._virtualLiveState({ entity_id: entityId });
      const state = live?.state ?? ent.state ?? "-";
      const name = this._virtualDisplayName(ent);
      const sourceLabel = this._compactSourceLabel(source);
      const sourceTitle = this._sourceTooltip(source);
      return `<tr>
        <td><button class="virtual-source-btn compact-source" data-source-uid="${this._escape(source.unique_id)}" title="${this._escape(sourceTitle)}">${this._escape(sourceLabel)}</button></td>
        <td><button class="link-cell linked-entity-link virtual-name-link" data-entity-id="${this._escape(entityId)}" ${entityId ? "" : "disabled"}>${this._escape(name)}</button><div class="muted entity-id-line" title="${this._escape(entityId || ent.unique_id || "")}">${this._escape(entityId || ent.unique_id || "nach Reload verfügbar")}</div></td>
        <td>${this._virtualTypeBadge(ent)}</td>
        <td>${this._virtualStateBadge(state, ent, entityId)}</td>
        <td><code title="${this._escape(ent.on_value ?? "")}">${this._escape(ent.on_value ?? "")}</code></td>
        <td><code title="${this._escape(ent.off_value ?? "")}">${this._escape(ent.off_value ?? "")}</code></td>
        <td><code title="${this._escape(ent.else_state || "unavailable")}">${this._escape(ent.else_state || "unavailable")}</code></td>
        <td>${this._virtualActionsHtml(source, ent, name, entityId)}</td>
      </tr>`;
    }).join("");
    return `<div class="card virtual-overview">
      <div class="virtual-overview-head"><div><div class="virtual-overview-title">Virtuelle Entitäten</div><div class="muted">Eigene Übersicht aller aus BACnet-Datenpunkten erzeugten virtuellen Home-Assistant-Entitäten.</div></div><div class="muted">${rows.length} verknüpfte Entität${rows.length === 1 ? "" : "en"}</div></div>
      <div class="virtual-table-wrap"><table class="virtual-table"><thead><tr><th>Quelle</th><th>HA Entität</th><th>Typ</th><th>Zustand</th><th>ON</th><th>OFF</th><th>ELSE</th><th>Aktionen</th></tr></thead><tbody>${body}</tbody></table></div>
    </div>`;
  }

  _displayEntityName(p) {
    return p.entity_name || p.entity_original_name || p.object_name || p.object_key || p.entity_id || "-";
  }

  _linkedEntities(p) {
    return Array.isArray(p?.linked_virtual_entities) ? p.linked_virtual_entities : [];
  }

  _linkedEntityLive(link) {
    const entityId = link?.entity_id || "";
    return entityId && this.hass?.states ? this.hass.states[entityId] : null;
  }

  _linkedEntityState(link) {
    const live = this._linkedEntityLive(link);
    return live?.state ?? link?.state ?? "-";
  }

  _linkedEntityName(link) {
    const live = this._linkedEntityLive(link);
    return live?.attributes?.friendly_name || link?.name || link?.friendly_name || link?.entity_name || link?.entity_id || link?.unique_id || "Virtuelle Entität";
  }

  _linkedEntityIcon(link) {
    const dc = String(link?.device_class || "").toLowerCase();
    const entityId = String(link?.entity_id || "").toLowerCase();
    if (dc === "plug" || entityId.includes("plug") || entityId.includes("steckdose")) return "🔌";
    if (dc === "light" || entityId.includes("licht")) return "💡";
    if (dc === "running") return "▶";
    if (dc === "power") return "⚡";
    return "🔗";
  }

  _linkedEntitiesHtml(p) {
    const links = this._linkedEntities(p);
    if (!links.length) return "";
    return `<div class="linked-entities"><span class="virtual-badge" title="${links.length} virtuelle Entität${links.length === 1 ? "" : "en"}">🔗 ${links.length}</span>${links.map((link) => {
      const entityId = link.entity_id || "";
      const label = this._linkedEntityName(link);
      const icon = this._linkedEntityIcon(link);
      const state = this._linkedEntityState(link);
      const disabled = entityId ? "" : " disabled";
      const title = entityId ? `${label} · ${entityId} · HA Dialog öffnen` : "Nach dem Neuladen der Integration verfügbar";
      return `<button class="linked-entity-link" data-entity-id="${this._escape(entityId)}" title="${this._escape(title)}"${disabled}>↳ <span class="linked-icon">${this._escape(icon)}</span> <span class="linked-name">${this._escape(label)}</span> <span class="linked-state">${this._escape(this._binaryStateLabel(state, link.device_class))}</span></button>`;
    }).join("")}</div>`;
  }

  _openMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId },
    }));
  }



  _tableColgroupHtml() {
    return `<colgroup>
      <col class="select-col-col">
      <col class="object-col-col">
      <col class="entity-col-col">
      <col class="value-col-col">
      <col class="unit-col-col">
      <col class="override-col-col">
      <col class="write-profile-col-col">
      <col class="runtime-col-col">
    </colgroup>`;
  }

  _tableHeaderHtml() {
    const cols = [
      ["object_key", "Objekt", "object-col"],
      ["entity", "HA Entität", ""],
      ["present_value", "Wert", ""],
      ["unit", "Einheit", ""],
      ["override", "Override", ""],
      ["write_profile", "Schreiben", "write-profile-head"],
      ["runtime", "", "runtime-head"],
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
      if (key === "unit") return this._displayUnit(p);
      if (key === "override") return p.override_active ? 1 : 0;
      if (key === "write_profile") return p.write_profile === "direct" ? "direct" : "glt";
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

  _displayUnit(p) {
    if (this._triStateCurrent(p?.override_unit) === "__none__") return "-";
    return p?.ha_unit || p?.bacnet_unit || "-";
  }

  _inlineUnitOptions(p) {
    const current = this._triStateCurrent(p.override_unit);
    return this._options([["__auto__", "Auto"], ["__none__", "Keine"], ["%", "%"], ["°C", "°C"], ["cm", "cm"], ["W", "W"], ["kW", "kW"], ["min", "min"], ["s", "s"]], current);
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
      this._render();
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

    const viewport = this._tableViewport(items);
    // Mobile rows are rendered as labelled cards and are therefore taller than
    // desktop table rows. Keep virtual scrolling aligned with the card height.
    const rowHeight = this._effectiveRowHeight();
    const totalHeight = items.length * rowHeight;
    const start = Math.max(0, Math.min(items.length, viewport.start));
    const end = Math.max(start, Math.min(items.length, viewport.end));
    const topHeight = start * rowHeight;
    const bottomHeight = Math.max(0, totalHeight - end * rowHeight);
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
          <td data-col="entity"><div class="entity-stack"><button class="link-cell entity-link" data-entity-id="${this._escape(p.entity_id || "")}">${this._escape(this._displayEntityName(p))}</button>${this._linkedEntitiesHtml(p)}</div></td>
          <td data-col="value"><button class="link-cell value-link" data-entity-id="${this._escape(p.entity_id || "")}">${this._escape(this._value(p.present_value))}</button></td>
          <td data-col="unit"><div class="unit-stack"><span class="unit-display">${this._escape(this._displayUnit(p))}</span></div></td>
          <td data-col="override">${p.override_active ? '<span class="pill ok">Override</span>' : '<span class="pill">Standard</span>'}</td>
          <td data-col="write-profile" class="write-profile-cell">${this._writeProfileDot(p)}</td>
          <td data-col="status">${this._runtimeLabel(p)}</td>
        </tr>
      `);
    }

    if (bottomHeight) rows.push(`<tr class="virtual-spacer"><td colspan="8" style="height:${bottomHeight}px"></td></tr>`);
    return rows.join("");
  }

  _writeProfileDot(p) {
    const viaGlt = ["glt_set_as", "glt_set_stage"].includes(p?.write_profile);
    const label = viaGlt ? "Über GLT schreiben" : "Direkt schreiben";
    const cls = viaGlt ? "glt" : "direct";
    return `<span class="write-profile-dot ${cls}" title="${label}" aria-label="${label}"></span>`;
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

  _tableViewport(items = null) {
    const wrap = this.shadowRoot?.getElementById("tableWrap");
    const scrollTop = wrap ? wrap.scrollTop : this._lastTableScrollTop || 0;
    const height = wrap ? wrap.clientHeight : 700;
    items = items || this._displayItems();
    const rowHeight = this._effectiveRowHeight();
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - this._overscan);
    const visible = Math.ceil(height / rowHeight) + this._overscan * 2;
    return { start, end: Math.min(items.length, start + visible) };
  }

  _effectiveRowHeight() {
    return window.matchMedia?.("(max-width: 700px)")?.matches ? 310 : this._rowHeight;
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
        <label>Modus <select id="bulkUpdateMode"><option value="">Nicht ändern</option><option value="subscribe">🔵 Push / Subscribe</option><option value="polling">Polling</option><option value="disabled">Deaktiviert</option></select></label>
        <label>Einheit <select id="bulkUnit"><option value="">Nicht ändern</option><option value="__auto__">Automatisch</option><option value="__none__">Keine Einheit</option><option value="%">%</option><option value="°C">°C</option><option value="cm">cm</option><option value="W">W</option><option value="kW">kW</option><option value="min">min</option><option value="s">s</option></select></label>
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
    this.shadowRoot?.querySelectorAll("[data-dashboard-tab]").forEach((tab) => {
      tab.onclick = (ev) => {
        ev.preventDefault();
        this._dashboardTab = tab.dataset.dashboardTab || "live";
        this._setSetting("bepacom_dashboard_tab", this._dashboardTab);
        this._updateHeaderDom();
        if (this._dashboardTab === "live") this._refreshLiveChanges();
      };
    });
    this._bindLiveMonitorEvents();
  }

  _scrollSelectedIntoView() {
    if (!this._selected) return;
    const row = this.shadowRoot?.querySelector(`tr[data-uid="${CSS.escape(this._selected.unique_id)}"]`);
    if (!row) return;
    row.scrollIntoView({ block: "center", behavior: "smooth" });
    row.classList.add("source-jump-highlight");
    window.setTimeout(() => row.classList.remove("source-jump-highlight"), 2200);
  }

  _bindEvents() {
    this._bindDashboardToggle();
    this._bindDetailToggles();
    const mobileActionsToggle = this.shadowRoot.getElementById("mobileActionsToggle");
    mobileActionsToggle?.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const menu = mobileActionsToggle.closest(".header-actions-menu");
      const open = menu?.classList.toggle("open") || false;
      mobileActionsToggle.setAttribute("aria-expanded", open ? "true" : "false");
      mobileActionsToggle.setAttribute(
        "aria-label",
        open ? "Aktionen schließen" : "Aktionen öffnen",
      );
    });
    this.shadowRoot.querySelectorAll("[data-side-tab]").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        this._rememberSideScroll();
        this._sideTab = button.getAttribute("data-side-tab") || "inspector";
        this._setSetting("bepacom_side_tab", this._sideTab);
        this._render();
      });
    });
    this.shadowRoot.getElementById("createVirtualForSelected")?.addEventListener("click", (ev) => {
      ev.preventDefault();
      this._sideTab = "inspector";
      this._setSetting("bepacom_side_tab", this._sideTab);
      this._render();
      setTimeout(() => this.shadowRoot?.getElementById("virtualBinaryName")?.focus(), 0);
    });
    this.shadowRoot.querySelectorAll("[data-view-tab]").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        this._activeView = button.getAttribute("data-view-tab") || "explorer";
        this._setSetting("bepacom_active_view", this._activeView);
        this._render();
      });
    });
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
    this.shadowRoot.getElementById("virtualSearch")?.addEventListener("input", (ev) => {
      this._virtualSearch = ev.target.value || "";
      this._setSetting("bepacom_virtual_search", this._virtualSearch);
      this._render();
    });
    this.shadowRoot.getElementById("clearVirtualSearch")?.addEventListener("click", () => {
      this._virtualSearch = "";
      this._setSetting("bepacom_virtual_search", "");
      this._render();
    });
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
    this.shadowRoot.getElementById("applyObjectAssistant")?.addEventListener("click", () => this._applyObjectAssistantSuggestion());
    this.shadowRoot.getElementById("editMultistateRepresentation")?.addEventListener("change", (ev) => {
      const switchValues = this.shadowRoot.getElementById("multistateSwitchValues");
      if (switchValues) switchValues.style.display = ev.target.value === "switch" ? "contents" : "none";
    });
    this.shadowRoot.querySelectorAll(".side input, .side select, .side textarea").forEach((el) => {
      el.addEventListener("input", () => { this._editorDirty = true; if (el.id && el.id.startsWith("virtualBinary")) this._refreshVirtualRulePreview(); });
      el.addEventListener("change", () => { this._editorDirty = true; if (el.id && el.id.startsWith("virtualBinary")) this._refreshVirtualRulePreview(); });
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
    const sideBody = this.shadowRoot.querySelector(".side-body");
    if (sideBody) {
      sideBody.onscroll = () => {
        this._sideScrollPositions.set(this._sideScrollKey(), sideBody.scrollTop);
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
    this.shadowRoot.querySelectorAll(".virtual-source-btn").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        const point = this._points.find((p) => p.unique_id === button.dataset.sourceUid);
        if (point) {
          this._activeView = "explorer";
          this._sideTab = "inspector";
          this._detailsVisible = true;
          this._setSetting("bepacom_active_view", this._activeView);
          this._setSetting("bepacom_side_tab", this._sideTab);
          this._setSetting("bepacom_details_visible", "1");
          this._selectPoint(point);
          setTimeout(() => this._scrollSelectedIntoView(), 0);
        }
      });
    });
    this.shadowRoot.querySelectorAll(".virtual-edit-btn").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        this._editVirtualEntity(button.dataset.sourceUid, button.dataset.virtualUid, false);
      });
    });
    this.shadowRoot.querySelectorAll(".virtual-duplicate-btn").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        this._editVirtualEntity(button.dataset.sourceUid, button.dataset.virtualUid, true);
      });
    });
    this.shadowRoot.querySelectorAll(".virtual-delete-btn").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        this._deleteVirtualEntity(button.dataset.sourceUid, button.dataset.virtualUid, button.dataset.virtualName || "");
      });
    });
    this.shadowRoot.querySelectorAll(".linked-entity-link").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        this._openMoreInfo(button.dataset.entityId);
      });
    });
    this.shadowRoot.querySelectorAll("tr[data-uid]").forEach((row) => {
      row.onclick = (ev) => {
        const moreInfoTarget = ev.target?.closest?.(".entity-link, .value-link, .linked-entity-link");
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
        if (ev.target?.closest?.("input, select, button, .entity-link, .value-link, .linked-entity-link, .linked-entity-link")) return;
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


  _virtualRuleNormalize(value) {
    return String(value ?? "").trim().replace(/^['\"]|['\"]$/g, "").toLowerCase();
  }

  _virtualRuleNumber(value) {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim().replace(/^['\"]|['\"]$/g, "").replace(",", ".");
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }

  _virtualRuleEqual(value, expr) {
    const a = this._virtualRuleNumber(value);
    const b = this._virtualRuleNumber(expr);
    if (a !== null && b !== null) return a === b;
    return this._virtualRuleNormalize(value) === this._virtualRuleNormalize(expr);
  }

  _virtualRuleAdvancedMatches(value, expression) {
    let expr = String(expression || "").trim();
    if (!expr) return null;
    expr = expr.replaceAll("&&", " && ").replaceAll("||", " || ");

    // Safe mini evaluator for live preview only. Backend remains authoritative.
    // Allowed characters/operators: value, numbers, quotes, (), + - * / % & | ^,
    // comparisons and && / || / !. Anything else disables the preview result.
    if (!/^[a-zA-Z0-9_\s()<>!=&|^+*\/%.,'"-]+$/.test(expr)) return null;

    const valueNum = this._virtualRuleNumber(value);
    const preparedValue = valueNum !== null ? String(valueNum) : JSON.stringify(this._virtualRuleNormalize(value));
    let jsExpr = expr
      .replace(/\bvalue\b/g, preparedValue)
      .replace(/([^=!])=([^=])/g, "$1==$2");

    try {
      // eslint-disable-next-line no-new-func
      return !!Function(`"use strict"; return (${jsExpr});`)();
    } catch (_err) {
      return null;
    }
  }

  _virtualRuleMatches(value, condition) {
    const raw = String(condition ?? "").trim();
    if (!raw) return false;

    if (raw.includes("value") || raw.includes("&&") || raw.includes("||")) {
      const advanced = this._virtualRuleAdvancedMatches(value, raw);
      if (advanced !== null) return advanced;
    }

    if (raw.includes(",")) {
      return raw.split(",").some((part) => this._virtualRuleMatches(value, part.trim()));
    }

    const valueNum = this._virtualRuleNumber(value);
    const ops = [">=", "<=", "!=", "==", ">", "<"];
    for (const op of ops) {
      if (!raw.startsWith(op)) continue;
      const rhs = raw.slice(op.length).trim();
      const rhsNum = this._virtualRuleNumber(rhs);
      if (valueNum !== null && rhsNum !== null) {
        if (op === ">=") return valueNum >= rhsNum;
        if (op === "<=") return valueNum <= rhsNum;
        if (op === "!=") return valueNum !== rhsNum;
        if (op === "==") return valueNum === rhsNum;
        if (op === ">") return valueNum > rhsNum;
        if (op === "<") return valueNum < rhsNum;
      }
      if (op === "!=") return !this._virtualRuleEqual(value, rhs);
      if (op === "==") return this._virtualRuleEqual(value, rhs);
      return false;
    }

    const dashIndex = raw.slice(1).indexOf("-");
    if (dashIndex >= 0) {
      const splitAt = dashIndex + 1;
      const left = raw.slice(0, splitAt).trim();
      const right = raw.slice(splitAt + 1).trim();
      const leftNum = this._virtualRuleNumber(left);
      const rightNum = this._virtualRuleNumber(right);
      if (valueNum !== null && leftNum !== null && rightNum !== null) {
        const low = Math.min(leftNum, rightNum);
        const high = Math.max(leftNum, rightNum);
        return valueNum >= low && valueNum <= high;
      }
    }

    return this._virtualRuleEqual(value, raw);
  }

  _virtualRulePreviewHtml(p) {
    const onEl = this.shadowRoot?.getElementById("virtualBinaryOnValue");
    const offEl = this.shadowRoot?.getElementById("virtualBinaryOffValue");
    const elseEl = this.shadowRoot?.getElementById("virtualBinaryElseState");
    const sourceValue = p?.present_value;
    const onRule = onEl ? onEl.value : (p?.virtual_binary?.on_value ?? "2");
    const offRule = offEl ? offEl.value : (p?.virtual_binary?.off_value ?? "1");
    const elseState = elseEl ? elseEl.value : (p?.virtual_binary?.else_state || "unavailable");

    let result = "unavailable";
    let cls = "unav";
    if (this._virtualRuleMatches(sourceValue, onRule)) {
      result = "ON";
      cls = "on";
    } else if (this._virtualRuleMatches(sourceValue, offRule)) {
      result = "OFF";
      cls = "off";
    } else if (String(elseState || "unavailable").toLowerCase() === "off") {
      result = "OFF";
      cls = "off";
    }

    return `<div class="rule-preview">
      <div><span class="muted">Aktueller BACnet-Wert</span><strong>${this._escape(this._value(sourceValue))}</strong></div>
      <div><span class="muted">Regelergebnis</span><strong class="rule-result ${cls}">${this._escape(result)}</strong></div>
    </div>`;
  }

  _refreshVirtualRulePreview() {
    const box = this.shadowRoot?.getElementById("virtualRulePreview");
    if (box && this._selected) box.innerHTML = this._virtualRulePreviewHtml(this._selected);
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


  _normalizeSearch(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .trim();
  }

  _matchesSearchQuery(haystack, query) {
    const normalizedHaystack = this._normalizeSearch(haystack || "");
    const terms = this._normalizeSearch(query || "").split(/\s+/).filter(Boolean);

    return terms.every((term) => {
      if (!term.includes("*") && !term.includes("?")) {
        return normalizedHaystack.includes(term);
      }

      const escaped = term.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      const pattern = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
      try {
        return new RegExp(pattern, "s").test(normalizedHaystack);
      } catch (_) {
        return normalizedHaystack.includes(term);
      }
    });
  }

  _slugify(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  _objectAssistantHtml(p) {
    const rec = p?.object_assistant;
    if (!rec || rec.kind !== "virtual_binary") return "";
    return `<div class="assistant-card">
      <div class="assistant-title">Objekt-Assistent: ${this._escape(rec.title || "Vorschlag")}</div>
      <div class="muted">${this._escape(rec.reason || "")}</div>
      <div class="assistant-grid">
        <span>Name</span><strong>${this._escape(rec.name || "-")}</strong>
        <span>Device Class</span><strong>${this._escape(rec.device_class || "-")}</strong>
        <span>EIN wenn</span><code>${this._escape(rec.on_value || "")}</code>
        <span>AUS wenn</span><code>${this._escape(rec.off_value || "")}</code>
      </div>
      <button id="applyObjectAssistant" class="secondary" type="button">Vorschlag übernehmen</button>
    </div>`;
  }

  _applyObjectAssistantSuggestion() {
    const rec = this._selected?.object_assistant;
    if (!rec || rec.kind !== "virtual_binary") return;
    const setValue = (id, value) => {
      const el = this.shadowRoot?.getElementById(id);
      if (!el) return;
      if (el.type === "checkbox") el.checked = !!value;
      else el.value = value ?? "";
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    setValue("virtualBinaryEnabled", true);
    setValue("virtualBinaryName", rec.name || this._selected?.object_name || "");
    setValue("virtualBinaryUniqueId", rec.unique_id || `bacnet_binary_${this._slugify(this._selected?.object_name || this._selected?.object_key || this._selected?.unique_id)}`);
    setValue("virtualBinaryDeviceClass", rec.device_class || "");
    setValue("virtualBinaryOnValue", rec.on_value || "2");
    setValue("virtualBinaryOffValue", rec.off_value || "1");
    setValue("virtualBinaryElseState", rec.else_state || "unavailable");
    this._editorDirty = true;
    this._refreshVirtualRulePreview();
    this._message = "Objekt-Assistent: Vorschlag übernommen. Zum Anwenden bitte Speichern klicken.";
    this._updateHeaderDom();
  }


  _sidePanelHtml(selected) {
    const count = selected ? this._linkedEntities(selected).length : 0;
    const tab = (id, label) => `<button class="side-tab ${this._sideTab === id ? "active" : ""}" data-side-tab="${id}" type="button">${label}</button>`;
    const body = this._sideTab === "virtual" ? this._sideVirtualHtml(selected) : (selected ? this._detailHtml(selected) : `<div class="side-section-head"><h2>Point Inspector</h2><div class="muted">Wähle links ein Objekt aus.</div></div>`);
    return `<div class="side-tabs">${tab("inspector", "Point Inspector")}${tab("virtual", `Virtuelle Entitäten${count ? ` (${count})` : ""}`)}</div><div class="side-body">${body}</div>`;
  }

  _sideVirtualHtml(selected) {
    if (selected) {
      const linkedCount = this._linkedEntities(selected).length;
      return `<div class="side-section-head"><h2>Virtuelle Entitäten</h2>
        <div class="selected-source-box">
          <div><strong>Quelle:</strong> ${this._escape(selected.object_key || selected.unique_id || "-")}</div>
          <div class="muted">${this._escape(selected.object_name || "")}</div>
          <div class="muted">${linkedCount} verknüpfte virtuelle Entität${linkedCount === 1 ? "" : "en"}</div>
        </div></div>
        ${this._virtualEntitiesOverviewHtml(false, selected)}
        <div class="actions"><button id="createVirtualForSelected" type="button">+ Neue virtuelle Entität</button></div>
        <div class="muted" style="margin-top:8px;">Hier werden ausschließlich die virtuellen Entitäten angezeigt, die dem aktuell ausgewählten BACnet-Punkt zugeordnet sind. Neue Einträge werden im Reiter „Point Inspector“ unter „Konfiguration der Entität“ angelegt.</div>`;
    }
    return `<div class="side-section-head"><h2>Virtuelle Entitäten</h2><div class="muted">Wähle links einen BACnet-Punkt aus. Anschließend werden hier nur dessen zugeordnete virtuelle Entitäten angezeigt.</div></div>`;
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

    const vb = p.virtual_binary || {};
    const vbEnabled = !!p.virtual_binary;
    const vbName = vb.name || "";
    const vbUniqueId = vb.unique_id || `${p.unique_id}_binary`;
    const vbDeviceClass = vb.device_class || "plug";
    const vbOn = vb.on_value ?? "2";
    const vbOff = vb.off_value ?? "1";
    const vbElse = vb.else_state || "unavailable";

    const normalizedObjectType = String(p.object_type || "").toLowerCase().replace(/[^a-z]/g, "");
    const isAnalogValue = normalizedObjectType === "analogvalue";
    const isMultiStateOutput = normalizedObjectType === "multistateoutput";
    const allowedWriteProfiles = isAnalogValue
      ? ["direct", "glt_set_as"]
      : isMultiStateOutput
        ? ["direct", "glt_set_stage"]
        : ["direct"];
    const writeProfile = allowedWriteProfiles.includes(p.write_profile) ? p.write_profile : "direct";
    const multistateRepresentation = p.multistate_representation === "switch" ? "switch" : "number";
    const multistateEntitySettings = isMultiStateOutput ? `
      <h3 style="margin-top:14px;">Darstellung in Home Assistant</h3>
      <div class="muted" style="margin-bottom:8px;">Als Schalter wird nur der konfigurierte AUS- bzw. EIN-Wert geschrieben. Andere aktuelle Werte werden als unbekannt angezeigt.</div>
      <div class="edit-grid">
        <div><label>Entitätstyp</label><select id="editMultistateRepresentation">
          <option value="number" ${multistateRepresentation === "number" ? "selected" : ""}>Zahlenwert</option>
          <option value="switch" ${multistateRepresentation === "switch" ? "selected" : ""}>Schalter</option>
        </select></div>
        <div id="multistateSwitchValues" class="edit-grid" style="display:${multistateRepresentation === "switch" ? "contents" : "none"}">
          <div><label>AUS-Wert</label><input id="editMultistateOffValue" type="number" step="any" value="${this._escape(p.multistate_off_value ?? 1)}"></div>
          <div><label>EIN-Wert</label><input id="editMultistateOnValue" type="number" step="any" value="${this._escape(p.multistate_on_value ?? 2)}"></div>
        </div>
      </div>` : "";
    const profileDescription = isMultiStateOutput
      ? "Beim GLT/Stufe-Profil wird zuerst das binaryValue mit derselben Objekt-ID aktiviert und danach der Multi-State Output geschrieben. Beide Schreibvorgänge erfolgen fest auf BACnet-Priorität 8."
      : "Beim GLT/SET/AS-Profil wird das binaryValue mit derselben Objekt-ID verwendet. Alle Schreib- und Freigabevorgänge erfolgen fest auf BACnet-Priorität 8.";
    const numberSettings = (isAnalogValue || isMultiStateOutput) ? `
      <h3 style="margin-top:14px;">Stellbereich</h3>
      <div class="muted" style="margin-bottom:8px;">Grenzen und Schrittweite der Home-Assistant-Number sowie die BACnet-Schreibpriorität für direktes Schreiben.</div>
      <div class="edit-grid">
        <div><label>Mindestwert</label><input id="editNumberMin" type="number" step="any" value="${this._escape(p.number_min ?? -1000000)}"></div>
        <div><label>Höchstwert</label><input id="editNumberMax" type="number" step="any" value="${this._escape(p.number_max ?? 1000000)}"></div>
        <div><label>Schrittweite</label><input id="editNumberStep" type="number" min="0.000001" step="any" value="${this._escape(p.number_step ?? 0.01)}"></div>
        <div><label>BACnet-Priorität</label><input id="editWritePriority" type="number" min="1" max="16" step="1" value="${this._escape(p.write_priority ?? 8)}"></div>
      </div>
      <h3 style="margin-top:14px;">Schreibprofil</h3>
      <div class="muted" style="margin-bottom:8px;">${profileDescription}</div>
      <div class="edit-grid">
        <div><label>Profil</label><select id="editWriteProfile">
          <option value="direct" ${writeProfile === "direct" ? "selected" : ""}>Direkt schreiben</option>
          ${isAnalogValue ? `<option value="glt_set_as" ${writeProfile === "glt_set_as" ? "selected" : ""}>GLT → Wert setzen → AS</option>` : ""}
          ${isMultiStateOutput ? `<option value="glt_set_stage" ${writeProfile === "glt_set_stage" ? "selected" : ""}>GLT → Stufe setzen</option>` : ""}
        </select></div>
        <div><label>Wartezeit nach GLT aktivieren (ms)</label><input id="editGltDelayMs" type="number" min="0" max="60000" step="1" value="${this._escape(p.glt_delay_ms ?? (isMultiStateOutput ? 2000 : 1200))}"></div>
        ${isAnalogValue ? `
          <div><label>Wartezeit nach Wert schreiben (ms)</label><input id="editAsDelayMs" type="number" min="0" max="60000" step="1" value="${this._escape(p.as_delay_ms ?? 1200)}"></div>
          <div><label>Wartezeit vor Freigabe (ms)</label><input id="editReleaseDelayMs" type="number" min="0" max="60000" step="1" value="${this._escape(p.release_delay_ms ?? 200)}"></div>
          <div><label>Priorität 8 anschließend freigeben</label><div class="check"><input id="editReleasePriority" type="checkbox" ${p.release_priority !== false ? "checked" : ""}> analogValue und binaryValue freigeben</div></div>
        ` : ""}
      </div>` : "";

    const editContent = `
      <div class="edit-grid">
        <div><label>HA Entity ID</label><input id="editEntityId" value="${this._escape(p.entity_id || "")}" placeholder="z.B. sensor.rollostellung_eg_speis"></div>
        <div><label>HA Entitätsname</label><input id="editEntityName" value="${this._escape(p.entity_name || "")}" placeholder="leer = Standardname"></div>
        <div><label>Einheit</label><select id="editUnit">${this._unitOptions(p)}</select></div>
        <div><label>Device Class</label><select id="editDeviceClass">${this._deviceClassOptions(p)}</select></div>
        <div><label>State Class</label><select id="editStateClass">${this._stateClassOptions(p)}</select></div>
        <div><label>Aktualisierungsmodus</label><select id="editUpdateMode">${this._updateModeOptions(p)}</select></div>
      </div>
      ${multistateEntitySettings}
      ${numberSettings}
    `;

    const virtualEntityContent = `
      <div class="muted" style="margin-bottom:8px;">Erzeugt zusätzlich eine neue Binary-Sensor-Entität aus diesem Rohwert. Die vorhandene BACnet-Entität bleibt bestehen. Für mehrere virtuelle Entitäten einfach eine andere Unique ID verwenden und erneut speichern.</div>
      <div class="rule-help">
        <strong>Regel-Hilfe:</strong>
        <code>2</code> bedeutet <code>value == 2</code>, <code>&gt;2</code>, <code>&gt;=2</code>, <code>&lt;5</code>, <code>&lt;=10</code>, <code>!=0</code>, <code>1,2,5</code>, <code>2-5</code>, <code>active</code>, <code>inactive</code>, <code>alarm,fault</code>, <code>value &gt; 10 &amp;&amp; value &lt; 20</code>, <code>value == 2 || value == 5</code>, <code>(value &amp; 4096) != 0</code>, <code>((value - 1) &amp; 4) != 0</code>
      </div>
      ${this._objectAssistantHtml(p)}
      <div class="edit-grid">
        <div><label>Virtuellen Binary Sensor erzeugen</label><div class="check"><input id="virtualBinaryEnabled" type="checkbox" ${vbEnabled ? "checked" : ""}> aktiv</div></div>
        <div><label>Name</label><input id="virtualBinaryName" value="${this._escape(vbName)}" placeholder="z.B. Steckdose Wohnen/Terrasse"></div>
        <div><label>Unique ID</label><input id="virtualBinaryUniqueId" value="${this._escape(vbUniqueId)}" placeholder="z.B. bacnet_plug_wohnen_terrasse"></div>
        <div><label>Device Class</label><select id="virtualBinaryDeviceClass">${this._binaryDeviceClassOptions(vbDeviceClass)}</select></div>
        <div><label>EIN wenn</label><input id="virtualBinaryOnValue" value="${this._escape(vbOn)}" placeholder="z.B. 2, &gt;2, active oder alarm,fault"></div>
        <div><label>AUS wenn</label><input id="virtualBinaryOffValue" value="${this._escape(vbOff)}" placeholder="z.B. 1, &lt;=2 oder inactive"></div>
        <div><label>Sonst</label><select id="virtualBinaryElseState">
          <option value="unavailable" ${vbElse === "unavailable" ? "selected" : ""}>unavailable</option>
          <option value="off" ${vbElse === "off" ? "selected" : ""}>off</option>
          <option value="unknown" ${vbElse === "unknown" ? "selected" : ""}>unknown</option>
        </select></div>
      </div>
      <div id="virtualRulePreview">${this._virtualRulePreviewHtml(p)}</div>
    `;

    const editActions = `
      <div class="inspector-head-actions">
        <button id="saveOverride" ${this._saving ? "disabled" : ""}>Speichern${this._saving ? " …" : ""}</button>
        <button id="resetOverride" class="secondary" ${this._saving ? "disabled" : ""}>Override zurücksetzen</button>
      </div>
    `;

    const inspectorContent = kv.map(([k,v]) => `<div class="kv"><div class="k">${this._escape(k)}</div><div class="v">${this._escape(v)}</div></div>`).join("");

    return `
      <div class="point-inspector-head">
        <div><h2>${this._escape(p.object_key)}</h2><div class="muted">${this._escape(p.object_name || "-")}</div></div>
        ${editActions}
      </div>
      ${this._detailSection("config", "Konfiguration der Entität", editContent)}
      ${this._detailSection("virtual-config", "Virtuelle Entität konfigurieren", virtualEntityContent)}
      <div class="muted save-hint">Änderungen werden gespeichert, ohne die Integration sofort neu zu laden. Wenn du fertig bist, oben „Integration neu laden“ klicken.</div>
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
      ["__none__", "Keine Einheit"], ["%", "%"], ["°C", "°C"], ["cm", "cm"], ["W", "W"], ["kW", "kW"],
      ["Wh", "Wh"], ["kWh", "kWh"], ["V", "V"], ["A", "A"], ["Hz", "Hz"],
      ["lx", "lx"], ["Pa", "Pa"], ["bar", "bar"], ["min", "min"], ["s", "s"], ["h", "h"],
    ];
    return this._options(values, current);
  }

  _binaryDeviceClassOptions(current) {
    return this._options([
      ["", "Keine"], ["battery", "Batterie"], ["battery_charging", "Batterie lädt"],
      ["carbon_monoxide", "Kohlenmonoxid"], ["cold", "Kälte"], ["connectivity", "Verbindung"],
      ["door", "Tür"], ["garage_door", "Garagentor"], ["gas", "Gas"], ["heat", "Hitze"],
      ["light", "Licht"], ["lock", "Schloss"], ["moisture", "Feuchtigkeit"], ["motion", "Bewegung"],
      ["moving", "Bewegung / Stillstand"], ["occupancy", "Belegung"], ["opening", "Öffnung"],
      ["plug", "Steckdose / Plug"], ["power", "Strom"], ["presence", "Anwesenheit"],
      ["problem", "Problem"], ["running", "Läuft"], ["safety", "Sicherheit"],
      ["smoke", "Rauch"], ["sound", "Geräusch"], ["tamper", "Manipulation"],
      ["update", "Update"], ["vibration", "Vibration"], ["window", "Fenster"],
    ], current || "");
  }

  _deviceClassOptions(p) {
    const current = this._triStateCurrent(p.override_device_class);
    return this._options([
      ["__auto__", `Automatisch (${p.device_class || "keine"})`], ["__none__", "Keine"], ["temperature", "Temperatur"], ["humidity", "Luftfeuchtigkeit"],
      ["power", "Leistung"], ["energy", "Energie"], ["voltage", "Spannung"], ["current", "Strom"],
      ["frequency", "Frequenz"], ["pressure", "Druck"], ["distance", "Entfernung"], ["illuminance", "Beleuchtungsstärke"], ["duration", "Dauer"],
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
      ["subscribe", "🔵 Push / Subscribe"],
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

  _modeChipHtml(p) {
    const mode = p.update_mode === "subscribe" ? "push" : (p.update_mode === "polling" ? "polling" : "off");
    return `<span class="mode-chip ${mode}">${this._escape(this._plainModeLabel(p))}</span>`;
  }

  _plainModeLabel(p) {
    if (p.update_mode === "subscribe") return "Push / Subscribe";
    if (p.update_mode === "polling") return "Polling";
    return "Deaktiviert";
  }

  _runtimeLabel(p) {
    const dot = (cls, label) => `<span class="runtime-dot ${cls}" title="${this._escape(label)}" aria-label="${this._escape(label)}"></span>`;
    if (p.update_mode === "disabled") return dot("runtime-off", "Aus");
    if (
      p.update_mode === "subscribe"
      && this._diagnostics?.snapshot_websocket_mode === true
      && this._diagnostics?.subscriptions_initialized === true
      && this._diagnostics?.connected === true
      && Number(this._diagnostics?.snapshot_targets || 0) > 0
    ) {
      return dot(
        "runtime-snapshot",
        "Snapshot aktiv – Aktualisierung über die gemeinsame Snapshot-Verbindung",
      );
    }
    if (p.subscribed === true) return dot("runtime-push", "Push aktiv");
    if (p.fallback_polling === true) return dot("runtime-poll", "Polling-Fallback aktiv");
    if (p.update_mode === "polling") return dot("runtime-poll", "Polling aktiv");
    return dot("runtime-wait", "Wartet");
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
