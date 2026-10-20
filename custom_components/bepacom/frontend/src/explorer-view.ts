import { EXPLORER_BASE_STYLES } from "./explorer-base-styles";
import { ENGELSOFT_THEME, ENGELSOFT_NAV_ICONS } from "./engelsoft-theme";
import { ExplorerApi } from "./explorer-api";
import { ExplorerPreferences } from "./explorer-state";
import { localizeDom, normalizeLanguage, translateText } from "./i18n";
import { virtualRuleMatches } from "./virtual-rule";

export class BepacomExplorerView extends HTMLElement {
  // The view is fed by Home Assistant websocket payloads whose shape depends on
  // the installed backend version. Keep that dynamic boundary explicit while
  // allowing TypeScript to check the implementation and extracted domain code.
  [key: string]: any;

  constructor() {
    super();
    this._preferences = new ExplorerPreferences();
    this.attachShadow({ mode: "open" });
    this._entryId = null;
    this._points = [];
    this._runtimeVersions = {};
    this._pendingTableUpdates = new Set();
    this._entries = [];
    this._selected = null;
    this._inspector = {};
    this._loading = false;
    this._saving = false;
    this._error = null;
    this._message = null;
    this._toast = null;
    this._toastTimer = null;
    this._filters = {
      search: "",
      object_type: "all",
      only_overrides: false,
      only_subscribe: false,
      device_id: "all",
      runtime: "all",
    };
    this._virtualSearch = this._loadSetting("bepacom_virtual_search", "");
    this._refreshTimer = null;
    this._debounce = null;
    this._pointsGeneration = 0;
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
    this._dirtyFieldIds = new Set();
    this._editorErrors = [];
    this._pendingReloadIds = new Set();
    this._pendingTransportIds = new Set();
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
    this._beforeUnloadHandler = (event) => {
      if (!this._editorDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    this._virtualStateUpdateQueued = false;
    this._liveChanges = [];
    this._liveCursor = 0;
    this._liveTimer = null;
    this._liveRefreshInFlight = false;
    this._liveGeneration = 0;
    this._livePaused = false;
    this._dashboardTab = this._loadSetting("bepacom_dashboard_tab", "live");
    this._mainSection = this._loadSetting("bepacom_main_section", "configuration");
    if (!["configuration", "live", "diagnostics"].includes(this._mainSection)) {
      this._mainSection = "configuration";
    }
    if (this._mainSection === "live") this._dashboardTab = "live";
    if (this._mainSection === "diagnostics") this._dashboardTab = "developer";
    this._liveFilters = { search: "", source: "all", object_type: "all" };
    this._api = null;
    this._language = "en";
    this._localizationFrame = null;
    this._narrow = false;
    this._edgeTouchStart = null;
    this._edgeTouchTriggered = false;
    this._edgeTouchStartHandler = (event) => this._handleEdgeTouchStart(event);
    this._edgeTouchMoveHandler = (event) => this._handleEdgeTouchMove(event);
    this._edgeTouchEndHandler = () => this._resetEdgeTouch();
  }

  _versionLabel() {
    const cfg = this.panel?.config || {};
    const version = cfg.version || "1.2.3";
    const build = cfg.frontend_build || "0688";
    return `Version ${version} · Frontend-Build ${build}`;
  }

  _showToast(message, tone = "success") {
    if (this._toastTimer) window.clearTimeout(this._toastTimer);
    this._toast = { message, tone };
    this._render();
    this._toastTimer = window.setTimeout(() => {
      this._toast = null;
      this._toastTimer = null;
      this._render();
    }, 3600);
  }

  connectedCallback() {
    if (this._connected) return;
    this._connected = true;
    this._entryId = this.panel?.config?.entry_id || null;
    window.addEventListener("keydown", this._keyboardHandler);
    document.addEventListener("visibilitychange", this._visibilityHandler);
    window.addEventListener("beforeunload", this._beforeUnloadHandler);
    this.addEventListener("touchstart", this._edgeTouchStartHandler, { passive: true });
    this.addEventListener("touchmove", this._edgeTouchMoveHandler, { passive: true });
    this.addEventListener("touchend", this._edgeTouchEndHandler, { passive: true });
    this.addEventListener("touchcancel", this._edgeTouchEndHandler, { passive: true });
    this.shadowRoot.addEventListener("click", this._rootClickHandler);
    this._startInitialLoad();
    this._startRefreshTimer();
    this._startLiveTimer();
    this._render();
  }

  disconnectedCallback() {
    this._connected = false;
    this._pointsGeneration += 1;
    this._stopRefreshTimer();
    this._stopLiveTimer();
    this._refreshGeneration += 1;
    this._refreshInFlight = false;
    if (this._debounce) window.clearTimeout(this._debounce);
    if (this._recentChangeTimer) {
      window.clearTimeout(this._recentChangeTimer);
      this._recentChangeTimer = null;
    }
    if (this._toastTimer) window.clearTimeout(this._toastTimer);
    if (this._localizationFrame !== null) window.cancelAnimationFrame(this._localizationFrame);
    window.removeEventListener("keydown", this._keyboardHandler);
    document.removeEventListener("visibilitychange", this._visibilityHandler);
    window.removeEventListener("beforeunload", this._beforeUnloadHandler);
    this.removeEventListener("touchstart", this._edgeTouchStartHandler);
    this.removeEventListener("touchmove", this._edgeTouchMoveHandler);
    this.removeEventListener("touchend", this._edgeTouchEndHandler);
    this.removeEventListener("touchcancel", this._edgeTouchEndHandler);
    this.shadowRoot.removeEventListener("click", this._rootClickHandler);
  }

  set panel(panel) {
    this._panel = panel;
    const configuredEntryId = panel?.config?.entry_id;
    if (configuredEntryId) this._entryId = configuredEntryId;
  }

  get panel() {
    return this._panel;
  }

  set narrow(narrow) {
    const next = Boolean(narrow);
    if (next === this._narrow) return;
    this._narrow = next;
    if (this._connected) this._render();
  }

  get narrow() {
    return this._narrow;
  }

  _toggleHomeAssistantMenu() {
    this.dispatchEvent(new CustomEvent("hass-toggle-menu", {
      bubbles: true,
      composed: true,
    }));
  }

  _handleEdgeTouchStart(event) {
    const touch = event.touches?.[0];
    // Keep the activation area deliberately narrow so horizontal controls and
    // tables remain usable while opening the HA menu from the left edge.
    if (!touch || touch.clientX > 28 || event.touches.length !== 1) {
      this._resetEdgeTouch();
      return;
    }
    this._edgeTouchStart = { x: touch.clientX, y: touch.clientY };
    this._edgeTouchTriggered = false;
  }

  _handleEdgeTouchMove(event) {
    if (!this._edgeTouchStart || this._edgeTouchTriggered) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    const deltaX = touch.clientX - this._edgeTouchStart.x;
    const deltaY = Math.abs(touch.clientY - this._edgeTouchStart.y);
    if (deltaX >= 64 && deltaX > deltaY * 1.35) {
      this._edgeTouchTriggered = true;
      this._toggleHomeAssistantMenu();
    }
  }

  _resetEdgeTouch() {
    this._edgeTouchStart = null;
    this._edgeTouchTriggered = false;
  }

  _hasUnsavedChanges() {
    return this._editorDirty;
  }

  _discardEditorChanges() {
    if (!this._selected) return;
    this._editorDirty = false;
    this._dirtyFieldIds.clear();
    this._editorErrors = [];
    this._showToast("Ungespeicherte Änderungen wurden verworfen.", "info");
    this._render();
  }

  _validateEditor() {
    const errors = [];
    const entityId = String(this.shadowRoot?.getElementById("editEntityId")?.value || "").trim();
    if (entityId) {
      if (!/^[a-z0-9_]+\.[a-z0-9_]+$/.test(entityId)) {
        errors.push("Entity-ID: nur Kleinbuchstaben, Zahlen und Unterstriche im Format domain.name.");
      }
      const conflict = this._points.find(
        (point) => point.unique_id !== this._selected?.unique_id && point.entity_id === entityId,
      );
      if (conflict) errors.push(`Entity-ID wird bereits von ${conflict.object_key || conflict.unique_id} verwendet.`);
    }
    const min = Number(this.shadowRoot?.getElementById("editNumberMin")?.value);
    const max = Number(this.shadowRoot?.getElementById("editNumberMax")?.value);
    const step = Number(this.shadowRoot?.getElementById("editNumberStep")?.value);
    if (Number.isFinite(min) && Number.isFinite(max) && min >= max) errors.push("Der Mindestwert muss kleiner als der Höchstwert sein.");
    if (Number.isFinite(step) && step <= 0) errors.push("Die Schrittweite muss größer als 0 sein.");
    const priority = Number(this.shadowRoot?.getElementById("editWritePriority")?.value);
    if (Number.isFinite(priority) && (priority < 1 || priority > 16)) errors.push("BACnet-Priorität muss zwischen 1 und 16 liegen.");
    this._editorErrors = errors;
    const box = this.shadowRoot?.getElementById("editorValidation");
    if (box) {
      box.innerHTML = errors.map((error) => `<div>${this._escape(error)}</div>`).join("");
      box.hidden = !errors.length;
    }
    const save = this.shadowRoot?.getElementById("saveOverride");
    if (save) save.disabled = this._saving || errors.length > 0;
    const warning = this.shadowRoot?.getElementById("priorityWarning");
    if (warning) warning.hidden = !(Number.isFinite(priority) && priority >= 1 && priority <= 7);
    return errors.length === 0;
  }

  _updateEditorState() {
    const banner = this.shadowRoot?.getElementById("editorDirtyBanner");
    if (banner) banner.hidden = !this._editorDirty;
    const discard = this.shadowRoot?.getElementById("discardEditor");
    if (discard) discard.disabled = !this._editorDirty || this._saving;
    this._validateEditor();
  }

  set hass(hass) {
    const language = normalizeLanguage(hass?.language || hass?.locale?.language);
    const languageChanged = language !== this._language;
    this._language = language;
    this._hass = hass;
    this._api = hass ? new ExplorerApi(hass) : null;
    const wrap = this.shadowRoot?.querySelector(".wrap");
    if (wrap) {
      const light = !this._isDarkTheme(hass);
      wrap.classList.toggle("theme-light", light);
      wrap.classList.toggle("theme-dark", !light);
    }
    this._scheduleVirtualStateDomUpdate();
    if (!this._hasHass) {
      this._hasHass = true;
      this._startInitialLoad();
    }
    if (languageChanged && this._connected) this._render();
  }

  get hass() {
    return this._hass;
  }

  _scheduleLocalization() {
    if (this._language !== "en" || !this.shadowRoot) return;
    if (this._localizationFrame !== null) window.cancelAnimationFrame(this._localizationFrame);
    this._localizationFrame = window.requestAnimationFrame(() => {
      this._localizationFrame = null;
      if (this._connected && this._language === "en") localizeDom(this.shadowRoot, this._language);
    });
  }

  _confirm(message) {
    return window.confirm(translateText(message, this._language));
  }

  _isDarkTheme(hass = this._hass) {
    if (typeof hass?.themes?.darkMode === "boolean") return hass.themes.darkMode;
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
  }

  _scheduleVirtualStateDomUpdate() {
    if (this._virtualStateUpdateQueued) return;
    this._virtualStateUpdateQueued = true;
    queueMicrotask(() => {
      this._virtualStateUpdateQueued = false;
      if (!this._connected) return;
      this._updateVirtualStateDom();
      // Linked HA entities can change independently of their BACnet source.
      const table = this.shadowRoot?.getElementById("tableWrap");
      for (const row of table?.rows || []) {
        if (row.kind !== "point") continue;
        if ((row.linkedEntities || []).some((link, index) =>
          (this.hass?.states?.[link.entityId] || null) !== row.linkedStates?.[index])) {
          this._pendingTableUpdates.add(row.uniqueId);
        }
      }
      this._flushTableUpdates();
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
    if (!this.hass || !this._entryId || this._mainSection !== "live" || this._dashboardTab !== "live" || this._livePaused || this._liveRefreshInFlight || document.hidden) return;
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
    if (!this._api) throw new Error("Home Assistant ist nicht verbunden");
    let timeoutId;
    try {
      return await Promise.race([
        this._api.call(message),
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
    if (this._debounce) window.clearTimeout(this._debounce);
    this._debounce = null;
    const generation = ++this._pointsGeneration;
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
      // A newer query may already be pending in the debounce timer.
      if (generation !== this._pointsGeneration || !this._connected) return;
      this._entryId = result.entry_id || this._entryId;
      this._points = result.points || [];
      this._runtimeVersions = {};
      this._pendingTableUpdates.clear();
      this._diagnostics = result.diagnostics || {};
      this._trackClientHistory(this._points);
      this._total = result.total || this._points.length;
      this._limited = !!result.limited;
      if (this._selected) {
        const updated = this._points.find((p) => p.unique_id === this._selected.unique_id);
        if (updated) this._selected = updated;
      }
    } catch (err) {
      if (generation !== this._pointsGeneration || !this._connected) return;
      this._error = this._formatError(err);
    } finally {
      if (generation !== this._pointsGeneration || !this._connected) return;
      this._loading = false;
      if (showLoading) {
        this._render();
      } else {
        this._updateListDom();
        this._updateHeaderDom();
        this._configureExplorerToolbar();
        this._updateDetailDom();
      }
    }
  }

  _isUserInteractingWithTable() {
    const active = this.shadowRoot?.activeElement;
    const tableWrap = this.shadowRoot?.getElementById("tableWrap");
    if (!tableWrap) return false;
    if (active && tableWrap.contains(active)) {
      const tag = (active.tagName || "").toLowerCase();
      if (["select", "input", "textarea"].includes(tag) || active.isContentEditable) return true;
    }
    // Hover and focused action buttons do not block keyed Lit value updates.
    return false;
  }

  _mergeRuntimePoints(updates) {
    const byUid = new Map(updates.map((point) => [point.unique_id, point]));
    const changed = [];
    this._points = this._points.map((point) => {
      const update = byUid.get(point.unique_id) as Record<string, any> | undefined;
      if (!update) return point;
      if (update.runtime_version) this._runtimeVersions[point.unique_id] = update.runtime_version;
      // Also support older backends which return a full runtime snapshot.
      const differs = Object.keys(update).some((key) => key !== "runtime_version"
        && JSON.stringify(point[key]) !== JSON.stringify(update[key]));
      if (!differs) return point;
      const merged = { ...point, ...update };
      changed.push(merged);
      this._pendingTableUpdates.add(point.unique_id);
      return merged;
    });
    return changed;
  }

  _flushTableUpdates() {
    if (!this._pendingTableUpdates.size || this._isUserInteractingWithTable()) return;
    this._updateListDom(new Set(this._pendingTableUpdates));
    this._pendingTableUpdates.clear();
  }


  async _refreshPointsInPlace() {
    if (!this.hass || !this._entryId) return;
    if (document.hidden) return;
    if (this._refreshInFlight) return;
    const generation = ++this._refreshGeneration;
    const pointsGeneration = this._pointsGeneration;
    this._refreshInFlight = true;
    // Während der Benutzer tippt oder rechts editiert, darf der Auto-Refresh
    // die DOM-Struktur nicht neu aufbauen. Sonst verlieren Eingabefelder den
    // Fokus und die Tabelle springt nach oben.
    try {
      const result = await this._callWSWithTimeout({
        type: "bepacom/explorer/points_runtime",
        entry_id: this._entryId || undefined,
        unique_ids: this._points.map((point) => point.unique_id),
        known_versions: this._runtimeVersions,
      });
      if (generation !== this._refreshGeneration || pointsGeneration !== this._pointsGeneration || document.hidden || !this._connected) return;
      this._entryId = result.entry_id || this._entryId;
      const changed = this._mergeRuntimePoints(result.points || []);
      this._diagnostics = result.diagnostics || {};
      this._trackClientHistory(changed);
      if (this._selected) {
        const updated = this._points.find((p) => p.unique_id === this._selected.unique_id);
        if (updated && this._pendingTableUpdates.has(updated.unique_id)) {
          this._selected = updated;
        }
      }
      this._flushTableUpdates();
      this._updateHeaderDom();
    } catch (err) {
      if (generation !== this._refreshGeneration || pointsGeneration !== this._pointsGeneration || document.hidden || !this._connected) return;
      this._error = this._formatError(err);
      this._render();
    } finally {
      if (generation === this._refreshGeneration) this._refreshInFlight = false;
    }
  }

  _updateDetailDom() {
    if (!this._detailsVisible) return;
    const side = this.shadowRoot?.getElementById("pointInspector");
    if (!side || !this._selected) return;

    const active = this.shadowRoot?.activeElement;
    if (active && side.contains(active)) {
      // Während der Benutzer im rechten Editor tippt, die Felder nicht neu zeichnen.
      return;
    }

    const sideScrollTop = this._rememberSideScroll();
    this._configurePointInspector();
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
    const mainStatus = this.shadowRoot?.querySelector(".main-status-strip");
    if (mainStatus) mainStatus.outerHTML = this._mainStatusHtml();
    const dashboard = this.shadowRoot?.getElementById("dashboard");
    if (dashboard) {
      const active = this.shadowRoot?.activeElement;
      const liveMonitor = this.shadowRoot?.getElementById("liveMonitorHost");
      // The runtime refresh runs every five seconds. Replacing the complete
      // dashboard while a live filter is focused would destroy its input node
      // and make typing jump out of the field. Incoming changes continue to be
      // buffered and the next refresh after blur updates the complete view.
      if (!(active && liveMonitor?.contains(active))) {
        this._configureRuntimeDashboard();
      }
    }
    this._scheduleLocalization();
  }

  _updateListDom(changedIds = null) {
    const wrap = this.shadowRoot?.getElementById("tableWrap");
    if (!wrap) return;

    const scrollTop = wrap.scrollTop;
    this._lastTableScrollTop = scrollTop;
    this._configurePointTable(changedIds);
    window.requestAnimationFrame(() => {
      const nextWrap = this.shadowRoot?.getElementById("tableWrap");
      if (nextWrap) nextWrap.scrollTop = scrollTop;
    });
  }

  _formatError(err) {
    if (!err) return "Unbekannter Fehler";
    return err.message || err.code || JSON.stringify(err);
  }

  _setFilter(key, value) {
    if (this._filters[key] === value) return;
    this._filters[key] = value;
    this._lastTableScrollTop = 0;
    const table = this.shadowRoot?.getElementById("tableWrap");
    if (table) table.scrollTop = 0;
    // Device filtering is entirely local; keep any pending server query intact.
    if (key === "device_id") {
      this._updateListDom();
      this._configureExplorerToolbar();
      return;
    }
    // Invalidate immediately, including while the next query is debounced.
    this._pointsGeneration += 1;
    if (this._debounce) window.clearTimeout(this._debounce);
    // Wichtig: beim Tippen NICHT die komplette Seite neu rendern.
    // Sonst verliert das Suchfeld den Fokus. Nur die Datenzeilen werden
    // nachgeladen und gezielt aktualisiert.
    this._debounce = window.setTimeout(() => this._loadPoints(false), key === "search" ? 150 : 0);
  }

  _selectPoint(point) {
    if (
      this._editorDirty
      && this._selected?.unique_id !== point?.unique_id
      && !this._confirm("Ungespeicherte Änderungen verwerfen und einen anderen Punkt öffnen?")
    ) {
      return;
    }
    this._editorDirty = false;
    this._dirtyFieldIds.clear();
    this._editorErrors = [];
    this._manualReloadRunning = false;
    this._manualReloadUntil = 0;
    this._selected = point;
    this._clientHistory.clear();
    this._historyByUid.clear();
    this._message = null;
    // Wichtig: Der Verlauf ist je BACnet-Punkt getrennt. Beim Wechsel der
    // Auswahl darf kein alter Verlauf einer anderen Entität übernommen werden.
    this._loadInspector(point.unique_id);
    // Keep the table host mounted so selecting a row cannot reset scrollTop.
    this._configurePointTable();
    this._configurePointInspector();
  }

  async _loadInspector(uniqueId) {
    if (!this.hass) return;
    try {
      const result = await this.hass.callWS({
        type: "bepacom/explorer/point",
        entry_id: this._entryId || undefined,
        unique_id: uniqueId,
      });
      if (this._selected?.unique_id !== uniqueId) return;
      this._selected = result.point;
      this._inspector = result.inspector || {};
      this._setHistoryForSelected(result.history || [], uniqueId);
    } catch (err) {
      this._error = this._formatError(err);
    }
    this._configurePointTable();
    this._configurePointInspector();
  }

  async _saveSelected() {
    if (!this.hass || !this._selected) return;
    const previousUpdateMode = this._selected.update_mode || "disabled";
    const changedFields = new Set(this._dirtyFieldIds);
    if (!this._validateEditor()) {
      this._error = "Bitte korrigiere zuerst die markierten Eingaben.";
      return;
    }
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
    const multistateFeedbackUniqueId = this.shadowRoot.getElementById("editMultistateFeedbackUniqueId")?.value || "";
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
        multistate_feedback_unique_id: multistateFeedbackUniqueId,
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
      this._editorDirty = false;
      this._dirtyFieldIds.clear();
      this._editorErrors = [];
      const transportChanged = (this._selected.update_mode || "disabled") !== previousUpdateMode;
      const requiresReload = [...changedFields].some((field) => field && field !== "editUpdateMode");
      if (requiresReload) this._pendingReloadIds.add(this._selected.unique_id);
      if (transportChanged) {
        this._pendingTransportIds.add(this._selected.unique_id);
      }
      this._inspector = result.inspector || {};
      this._setHistoryForSelected(result.history || [], this._selected?.unique_id);
      this._message = null;
      this._showToast(
        transportChanged || requiresReload
          ? "Gespeichert. Die Änderung wartet auf „Änderungen anwenden“."
          : "Änderungen gespeichert.",
      );
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
    const ok = this._confirm(`Virtuelle Entität löschen?\n\n${label}\n\nDiese Aktion entfernt die virtuelle Entität aus der Engelsoft-Beacon-Konfiguration und aus der Home-Assistant-Entity-Registry. Danach bitte die Integration neu laden.`);
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
      this._pendingReloadIds.add(sourceUid);
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
    const previousUpdateMode = this._selected.update_mode || "disabled";
    this._editorDirty = false;
    this._dirtyFieldIds.clear();
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
      this._pendingReloadIds.add(this._selected.unique_id);
      this._pendingTransportIds.add(this._selected.unique_id);
      if ((this._selected.update_mode || "disabled") !== previousUpdateMode) {
        this._pendingTransportIds.add(this._selected.unique_id);
      }
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

    const preview = this._reloadPreview();
    if (
      preview.changed > 0
      && !this._confirm(
        `Integration neu laden?\n\n${preview.changed} geänderte Punkte werden angewendet.\n`
        + `${preview.enabled} aktiv · ${preview.disabled} deaktiviert.\n\n`
        + "Während des Reloads können Entitäten kurz nicht verfügbar sein.",
      )
    ) return;

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
        this._pendingReloadIds.clear();
        this._pendingTransportIds.clear();
      }
      // Während des Reloads keine weiteren Reloads oder Auto-Refreshes auslösen.
      window.setTimeout(async () => {
        this._manualReloadRunning = false;
        this._saving = false;
        try {
          await this._loadEntries();
          await this._loadPoints(false);
          this._message = null;
          this._showToast("Integration wurde neu geladen. Alle Änderungen sind aktiv.");
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

  async _applyUpdateModes() {
    if (!this.hass || !this._entryId || !this._pendingTransportIds.size || this._saving) return false;
    const changed = this._pendingTransportIds.size;
    this._saving = true;
    this._message = `${changed} Aktualisierungsmodi werden an BACstac übertragen …`;
    this._error = null;
    this._render();
    try {
      const result = await this.hass.callWS({
        type: "bepacom/explorer/apply_update_modes",
        entry_id: this._entryId || undefined,
      });
      this._pendingTransportIds.clear();
      this._message = null;
      this._showToast(`Transport aktiv: ${result.cov || 0} Push · ${result.polling || 0} Polling · ${result.disabled || 0} aus.`);
      await this._loadPoints(false);
      return true;
    } catch (err) {
      this._error = this._formatError(err);
      return false;
    } finally {
      this._saving = false;
      this._render();
    }
  }

  async _applyPendingChanges() {
    if (this._saving || (!this._pendingTransportIds.size && !this._pendingReloadIds.size)) return;
    if (this._pendingTransportIds.size) {
      const applied = await this._applyUpdateModes();
      if (!applied) return;
    }
    if (this._pendingReloadIds.size) {
      await this._reloadIntegration();
      return;
    }
    this._showToast("Alle Änderungen sind aktiv.");
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

  _overridePayload(point) {
    return {
      unique_id: point.unique_id,
      unit: point.override_unit || "__auto__",
      device_class: point.override_device_class || "__auto__",
      state_class: point.override_state_class || "__auto__",
      update_mode: point.update_mode || "disabled",
      entity_id: point.entity_id || "",
      entity_name: point.entity_name || "",
      number_min: point.number_min,
      number_max: point.number_max,
      number_step: point.number_step,
      multistate_representation: point.multistate_representation || "number",
      multistate_off_value: point.multistate_off_value,
      multistate_on_value: point.multistate_on_value,
      multistate_feedback_unique_id: point.multistate_feedback_unique_id || "",
      write_priority: point.write_priority ?? 8,
      write_profile: point.write_profile || "direct",
      glt_delay_ms: point.glt_delay_ms,
      as_delay_ms: point.as_delay_ms,
      release_delay_ms: point.release_delay_ms,
      release_priority: point.release_priority !== false,
      virtual_entities: Array.isArray(point.virtual_binaries) ? point.virtual_binaries : [],
    };
  }

  _exportOverrides() {
    const overrides = this._points
      .filter(
        (point) => point.override_active
          || (Array.isArray(point.virtual_binaries) && point.virtual_binaries.length),
      )
      .map((point) => this._overridePayload(point));
    this._download(
      "bepacom_overrides.json",
      JSON.stringify({ format: "bepacom-overrides", version: 1, overrides }, null, 2),
      "application/json;charset=utf-8",
    );
  }

  _openOverrideImport() {
    this.shadowRoot?.getElementById("importOverridesFile")?.click();
  }

  async _importOverrides(file) {
    if (!file || !this.hass) return;
    try {
      const document = JSON.parse(await file.text());
      if (document?.format !== "bepacom-overrides" || !Array.isArray(document.overrides)) {
        throw new Error("Die Datei ist kein Engelsoft-Beacon-Override-Export.");
      }
      if (document.overrides.length > 2000) throw new Error("Die Importdatei enthält mehr als 2000 Overrides.");
      const known = new Set(this._points.map((point) => point.unique_id));
      const items = document.overrides.filter((item) => item && known.has(item.unique_id));
      const skipped = document.overrides.length - items.length;
      if (!items.length) throw new Error("Keiner der importierten Punkte ist in diesem Gateway vorhanden.");
      if (!this._confirm(`${items.length} Overrides importieren${skipped ? ` (${skipped} unbekannte überspringen)` : ""}?`)) return;

      this._saving = true;
      this._error = null;
      this._render();
      for (const item of items) {
        const { virtual_entities: virtualEntities = [], ...override } = item;
        await this.hass.callWS({
          ...override,
          type: "bepacom/explorer/save_override",
          entry_id: this._entryId || undefined,
          unique_id: item.unique_id,
        });
        for (const virtual of Array.isArray(virtualEntities) ? virtualEntities : []) {
          await this.hass.callWS({
            ...override,
            type: "bepacom/explorer/save_override",
            entry_id: this._entryId || undefined,
            unique_id: item.unique_id,
            virtual_binary_enabled: true,
            virtual_binary_name: virtual.name || "",
            virtual_binary_unique_id: virtual.unique_id || "",
            virtual_binary_device_class: virtual.device_class || "",
            virtual_binary_on_value: String(virtual.on_value ?? ""),
            virtual_binary_off_value: String(virtual.off_value ?? ""),
            virtual_binary_else_state: virtual.else_state || "unavailable",
          });
        }
        this._pendingReloadIds.add(item.unique_id);
        if (item.update_mode) this._pendingTransportIds.add(item.unique_id);
      }
      this._message = `${items.length} Overrides importiert${skipped ? `, ${skipped} unbekannte Punkte übersprungen` : ""}. Bitte Integration neu laden.`;
      await this._loadPoints(false);
    } catch (err) {
      this._error = this._formatError(err);
    } finally {
      this._saving = false;
      const input = this.shadowRoot?.getElementById("importOverridesFile");
      if (input) input.value = "";
      this._render();
    }
  }

  _reloadPreview() {
    const changedPoints = this._points.filter((point) => this._pendingReloadIds.has(point.unique_id));
    return {
      changed: changedPoints.length,
      enabled: changedPoints.filter((point) => point.update_mode !== "disabled").length,
      disabled: changedPoints.filter((point) => point.update_mode === "disabled").length,
    };
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
    const backend = Number((d as Record<string, any>).value_changes ?? 0) || 0;
    const client = this._clientValueChangeTotal();
    // Backend ist die Quelle der Wahrheit. Falls es nach einem Reload noch nicht
    // weiterzählt, zeigt der Explorer mindestens die im Browser erkannten
    // Änderungen seit dem Öffnen des Panels.
    return Math.max(backend, client);
  }

  _normalizeBacnetObjectType(value) {
    return String(value ?? "").toLowerCase().replace(/[^a-z]/g, "");
  }

  _bacnetObjectInstance(value) {
    if (value === null || value === undefined || value === "") return "";
    const text = String(value).trim();
    const trailing = text.match(/(?:[:),]|\])\s*(\d+)\s*\)?$/);
    if (trailing) return trailing[1];
    return /^\d+$/.test(text) ? text : "";
  }

  _pointForLiveChange(item) {
    const exact = this._points.find((point) => point.unique_id === item?.unique_id);
    if (exact) return exact;

    const eventType = this._normalizeBacnetObjectType(item?.object_type || item?.object_key || item?.unique_id);
    const eventInstance = this._bacnetObjectInstance(item?.object_id)
      || this._bacnetObjectInstance(item?.object_key)
      || this._bacnetObjectInstance(item?.unique_id);
    const eventDevice = String(item?.device_id ?? "").trim();
    if (!eventType || !eventInstance) return undefined;

    return this._points.find((point) => {
      const pointType = this._normalizeBacnetObjectType(point.object_type || point.object_key || point.unique_id);
      const pointInstance = this._bacnetObjectInstance(point.instance)
        || this._bacnetObjectInstance(point.object_id)
        || this._bacnetObjectInstance(point.object_key)
        || this._bacnetObjectInstance(point.unique_id);
      const pointDevice = String(point.device_id ?? "").trim();
      return pointType === eventType
        && pointInstance === eventInstance
        && (!eventDevice || !pointDevice || eventDevice === pointDevice);
    });
  }

  _livePointLabels(item) {
    const point = this._pointForLiveChange(item);
    const entityId = point?.entity_id || item?.entity_id || "";
    const state = entityId ? this.hass?.states?.[entityId] : undefined;
    const friendlyName = state?.attributes?.friendly_name
      || point?.entity_name
      || point?.entity_original_name
      || point?.object_name
      || point?.description
      || item?.friendly_name
      || item?.object_name
      || entityId
      || item?.object_key
      || item?.unique_id;
    return { point, entityId, friendlyName };
  }

  _filteredLiveChanges() {
    const search = String(this._liveFilters.search || "").trim();
    const pointByUid = new Map(this._points.map((point) => [point.unique_id, point]));
    return this._liveChanges.filter((item) => {
      if (this._liveFilters.source !== "all" && String(item.source) !== this._liveFilters.source) return false;
      if (this._liveFilters.object_type !== "all" && String(item.object_type) !== this._liveFilters.object_type) return false;
      if (!search) return true;
      const point = pointByUid.get(item.unique_id) || this._pointForLiveChange(item);
      const { entityId, friendlyName } = this._livePointLabels(item);
      const haystack = [
        item.device_id, item.object_type, item.object_id, item.object_key,
        item.object_name, item.unique_id, entityId, friendlyName,
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
    const bars = bins.map((count) => {
      const height = peak ? Math.max(3, Math.round((count / peak) * 50)) : 3;
      return `<i style="height:${height}px" title="${count} Änderung${count === 1 ? "" : "en"}"></i>`;
    }).join("");
    const sources = [...new Set(this._liveChanges.map((item) => String(item.source || "unknown")))].sort();
    const types = [...new Set(this._liveChanges.map((item) => String(item.object_type || "unknown")))].sort();
    const options = (values, selected) => values.map((value) => `<option value="${this._escape(value)}" ${value === selected ? "selected" : ""}>${this._escape(value)}</option>`).join("");
    const rows = filtered.slice(-120).reverse().map((item) => {
      const { entityId, friendlyName } = this._livePointLabels(item);
      const secondaryLabel = entityId || item.object_key || item.unique_id;
      return `<tr data-live-uid="${this._escape(item.unique_id)}" title="${this._escape(`${item.device_id}/${item.object_type}:${item.object_id} · Im Point Inspector öffnen`)}">
        <td>${this._escape(this._formatTime(item.ts))}</td>
        <td><b>${this._escape(friendlyName)}</b><small>${this._escape(secondaryLabel)}</small></td>
        <td class="live-value">${this._escape(this._value(item.previous_value))}<span>→</span>${this._escape(this._value(item.value))}</td>
        <td><span class="live-source">${this._escape(item.source || "-")}</span></td>
      </tr>`;
    }).join("");
    return `<div class="live-monitor">
      <div class="live-chart" aria-label="Änderungen der letzten 60 Sekunden">${bars}</div>
      <div class="live-filters">
        <input id="liveSearch" value="${this._escape(this._liveFilters.search)}" placeholder="Filter / Wildcards …">
        <select id="liveSource"><option value="all">Alle Quellen</option>${options(sources, this._liveFilters.source)}</select>
        <select id="liveObjectType"><option value="all">Alle Typen</option>${options(types, this._liveFilters.object_type)}</select>
        <button id="liveClear" class="secondary live-small-btn" title="Monitorverlauf leeren">Leeren</button>
        <button id="livePause" class="secondary live-small-btn">${this._livePaused ? "Fortsetzen" : "Pausieren"}</button>
      </div>
      <div class="live-table-wrap">
        <table class="live-table"><thead><tr><th>Zeit</th><th>Punkt</th><th>Alt → Neu</th><th>Quelle</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="4" class="muted">Noch keine passenden Wertänderungen.</td></tr>`}</tbody></table>
      </div>
      <div class="live-foot">Ringpuffer: maximal 10.000 Änderungen · angezeigt werden die neuesten 120 Treffer</div>
    </div>`;
  }

  _updateLiveMonitorDom(force = false) {
    const dashboard = this.shadowRoot?.getElementById("dashboard");
    if (!dashboard || this._dashboardTab !== "live") return;
    const active = this.shadowRoot?.activeElement;
    if (!force && active && dashboard.contains(active)) return;
    this._configureRuntimeDashboard();
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
      ["Push / COV", d.configured_push ?? "-"],
      ["Polling", d.configured_polling ?? "-"],
      ["Deaktiviert", d.configured_disabled ?? d.disabled ?? "-"],
      ["Individuell konfiguriert", d.overrides ?? "-"],
    ];
    if (Array.isArray(d.firmware_versions) && d.firmware_versions.length) {
      configured.push(["Firmware", d.firmware_versions.join(", ")]);
    }
    if (Array.isArray(d.device_models) && d.device_models.length) {
      configured.push(["Gerätemodelle", d.device_models.join(", ")]);
    }
    const valueChanges = this._dashboardValueChanges(d);
    const pushNotificationsRaw = d.bacnet_push_notifications ?? d.websocket_updates ?? d.push_count;
    const pushNotifications = Number(pushNotificationsRaw);
    const averageChangesPerPush = Number.isFinite(pushNotifications) && pushNotifications > 0
      ? (Number(valueChanges) / pushNotifications).toLocaleString(this._language === "de" ? "de-DE" : "en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "-";
    const pushChangeValue = `${pushNotificationsRaw ?? "-"} / ${averageChangesPerPush}`;
    const runtime = [
      ["API / Protokoll", d.api_transport_label ?? "Legacy API"],
      ["App-Version", d.gateway_app_version ?? "-"],
      ["Protokollversion", d.gateway_protocol_version ?? "-"],
      ["WebSocket", d.connected === undefined ? "-" : (d.connected ? "Verbunden" : "Getrennt")],
      ["Reconnects", d.reconnect_count ?? "-"],
      ["Verbindungsfehler", d.connection_failures ?? "-"],
      ["\u00d8 Verarbeitung", d.dispatch_time_avg_ms === undefined ? "-" : `${Number(d.dispatch_time_avg_ms).toFixed(2)} ms`],
      ["Max. Verarbeitung", d.dispatch_time_max_ms === undefined ? "-" : `${Number(d.dispatch_time_max_ms).toFixed(2)} ms`],
    ];
    const filterRate = (() => {
      const inspected = Number(d.websocket_payload_objects || 0);
      const filtered = Number(d.websocket_prefiltered_no_change_objects || 0);
      return inspected > 0 ? `${((filtered / inspected) * 100).toFixed(1)} %` : "-";
    })();
    const developer = [
      ["Filterquote", filterRate],
      ["\u00d8 \u00c4nderungen / Nachricht", averageChangesPerPush],
      ["Unterdr\u00fcckte gleiche Werte", d.suppressed_updates ?? "-"],
    ];
    const renderCards = (cards) => cards.map(([label, value]) => {
      const icon = this._statusIcon(label, value);
      const cls = this._statusClass(label, value);
      return `<bepacom-status-metric label="${this._escape(label)}" value="${this._escape(value)}" icon="${this._escape(icon)}" tone="${this._escape(cls)}"></bepacom-status-metric>`;
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
        </button>
        ${open ? `<div class="dashboard-content">
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
    if (label.includes("Verbindungsfehler")) return "⚠️";
    if (label.includes("Verbunden")) return value === "Ja" ? "🟢" : "🔴";
    if (label.includes("Subscription") || label.includes("Push")) return "📡";
    if (label.includes("Polling")) return "🔄";
    if (label.includes("Wert")) return "📈";
    if (label.includes("Reconnect")) return "🔌";
    if (label.includes("Verarbeitung")) return "⏱️";
    if (label.includes("Override")) return "✏️";
    if (label.includes("Entit")) return "🏷️";
    if (label.includes("Firmware")) return "🧩";
    if (label.includes("Gerätemodell")) return "🖥️";
    if (label.includes("Deaktiviert")) return "⏸️";
    if (label.includes("Punkte") || label.includes("Objekte")) return "🧩";
    return "ℹ️";
  }

  _statusClass(label, value) {
    if (label.includes("Verbunden")) return value === "Ja" ? "stat-ok" : "stat-bad";
    if (label.includes("Verbindungsfehler") && Number(value) > 0) return Number(value) > 10 ? "stat-bad" : "stat-warn";
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
    if (!p.writable) return `<div class="muted">Dieser BACnet-Punkt unterstützt keinen Schreibzugriff.</div>`;
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
    const pendingChanges = new Set([...this._pendingTransportIds, ...this._pendingReloadIds]).size;
    const sectionTitle = this._mainSection === "live" ? "Live-Ansicht"
      : this._mainSection === "diagnostics" ? "Diagnose"
      : this._activeView === "virtual" ? "Virtuelle Entitäten" : "Explorer";
    const styles = EXPLORER_BASE_STYLES;

    const languageStyles = this._language === "en" ? `
      @media (max-width: 760px) {
        .virtual-table td:nth-child(1)::before { content:"Source"; }
        .virtual-table td:nth-child(2)::before { content:"HA entity"; }
        .virtual-table td:nth-child(3)::before { content:"Type"; }
        .virtual-table td:nth-child(4)::before { content:"State"; }
        .virtual-table td:nth-child(8)::before { content:"Actions"; }
        .table-wrap td[data-col='write-profile']::before { content:"Write"; }
        .table-wrap td.select-col::before { content:"Selection"; }
        .table-wrap td[data-col='object']::before { content:"Object"; }
        .table-wrap td[data-col='entity']::before { content:"HA entity"; }
        .table-wrap td[data-col='value']::before { content:"Value"; }
        .table-wrap td[data-col='unit']::before { content:"Unit"; }
      }
    ` : "";
    this.shadowRoot.innerHTML = `
      <style>${styles}${languageStyles}${ENGELSOFT_THEME}</style>
      <div class="wrap ${this._isDarkTheme() ? "theme-dark" : "theme-light"} ${this._narrow ? "ha-narrow" : ""} lang-${this._language}">
        <div class="engelsoft-shell">
        ${this._mainNavigationHtml()}
        <main class="workspace">
        <div class="header">
          <div class="mobile-header-row">
            <button id="haMenuToggle" class="ha-menu-toggle" type="button" title="Home Assistant Menü" aria-label="Home Assistant Menü öffnen">☰</button>
            <div class="brand-lockup">
              <div class="brand-copy">
              <div class="brand-eyebrow">BACnet · Building Automation</div>
              <div class="brand-heading"><h1>Engelsoft Beacon</h1><span class="brand-section">${this._escape(sectionTitle)}</span></div>
              </div>
            </div>
          </div>
          <div class="header-primary-actions">
            ${pendingChanges ? `<span class="pending-reload">${pendingChanges} Änderung${pendingChanges === 1 ? "" : "en"} wartet${pendingChanges === 1 ? "" : "en"}</span>` : ""}
            <button class="primary" id="applyChanges" ${(!pendingChanges || this._saving) ? "disabled" : ""}>Änderungen anwenden${pendingChanges ? ` (${pendingChanges})` : ""}</button>
            <button class="secondary" id="refresh">Aktualisieren${this._loading ? " …" : ""}</button>
            <div class="header-actions-menu">
            <button id="moreActionsToggle" class="secondary more-actions-toggle" type="button" title="Weitere Aktionen" aria-label="Weitere Aktionen öffnen" aria-expanded="false">⋮ Mehr</button>
            <div class="header-action-buttons">
              <button class="secondary" id="exportJson">JSON</button>
              <button class="secondary" id="exportCsv">CSV</button>
              <button class="secondary" id="exportExcel">Excel</button>
              <button class="secondary" id="exportOverrides">Overrides exportieren</button>
              <button class="secondary" id="importOverrides">Overrides importieren</button>
              <input id="importOverridesFile" type="file" accept="application/json,.json" hidden>
              <button class="secondary" id="reloadIntegration" ${(this._saving || this._manualReloadRunning || Date.now() < this._manualReloadUntil) ? "disabled" : ""}>Integration neu laden${this._pendingReloadIds.size ? ` (${this._pendingReloadIds.size})` : ""}</button>
            </div>
            </div>
          </div>
        </div>

        ${this._error ? `<div class="error">${this._escape(this._error)}</div>` : ""}
        ${this._message ? `<div class="notice">${this._escape(this._message)}</div>` : ""}
        ${this._toast ? `<div class="toast ${this._escape(this._toast.tone)}" role="status">${this._escape(this._toast.message)}</div>` : ""}

        ${this._mainStatusHtml()}

        ${this._mainSection === "configuration" ? `
          ${this._activeView === "virtual" ? `
          <div class="toolbar card virtual-filterbar">
            <div class="toolbar-nav">${this._viewTabsHtml()}</div>
            <div class="search-field"><label>Suche virtuelle Entitäten</label><input id="virtualSearch" value="${this._escape(this._virtualSearch || "")}" placeholder="Name, ID, Quelle · * und ? möglich"></div>
            <div class="reset-field"><label>&nbsp;</label><button id="clearVirtualSearch" class="secondary">Reset</button></div>
          </div>` : `<bepacom-explorer-toolbar id="explorerToolbar"></bepacom-explorer-toolbar>`}

          ${this._activeView === "virtual" ? this._virtualEntitiesPageHtml() : `
          <div id="explorerView">
            ${this._bulkToolbarHtml()}
            <div class="content ${this._detailsVisible ? "" : "details-hidden"}">
              <bepacom-point-table id="tableWrap" class="table-wrap"></bepacom-point-table>
              <button id="detailRailToggle" class="detail-rail-toggle" type="button" title="${this._detailsVisible ? "Details nach rechts einklappen" : "Details von rechts ausklappen"}" aria-label="${this._detailsVisible ? "Details einklappen" : "Details ausklappen"}">${this._detailsVisible ? "›" : "‹"}</button>
              ${this._detailsVisible ? `<bepacom-point-inspector id="pointInspector" class="card side"></bepacom-point-inspector>` : ""}
            </div>
          </div>`}
        ` : `<bepacom-runtime-dashboard id="dashboard" class="dashboard main-dashboard"></bepacom-runtime-dashboard>`}
        </main>
        </div>
      </div>
    `;

    this._bindEvents();
    if (this._language === "en") {
      localizeDom(this.shadowRoot, this._language);
      this._scheduleLocalization();
    }
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

  _mainNavigationHtml() {
    const item = (id, icon, label, description) => `
      <button class="main-nav-item ${this._mainSection === id ? "active" : ""}" data-main-section="${id}" type="button" title="${label}" aria-label="${label}" ${this._mainSection === id ? 'aria-current="page"' : ""}>
        <span class="main-nav-icon">${icon}</span>
        <span class="main-nav-copy"><strong>${label}</strong><small>${description}</small></span>
      </button>`;
    const addonPath = this._bacstacAddonPanelPath();
    return `<nav class="main-nav" aria-label="Hauptbereiche">
      ${item("configuration", ENGELSOFT_NAV_ICONS.configuration, "Konfiguration", "Explorer und virtuelle Entitäten")}
      ${item("live", ENGELSOFT_NAV_ICONS.live, "Live-Ansicht", "Diagramm und Live-Log")}
      ${item("diagnostics", ENGELSOFT_NAV_ICONS.diagnostics, "Diagnose", "Status, Laufzeit und Push-Werte")}
      <a class="main-nav-item" data-bacstac-addon href="${this._escape(addonPath)}" title="BACstac Add-on" aria-label="BACstac Add-on">
        <span class="main-nav-icon">${ENGELSOFT_NAV_ICONS.gateway}</span>
        <span class="main-nav-copy"><strong>BACstac Add-on</strong><small>Gateway-Oberfläche</small></span>
      </a>
    </nav>`;
  }

  _bacstacAddonPanelPath() {
    const panelPaths = Object.keys(this._hass?.panels || {});
    const installedPath = panelPaths.find(
      (path) => path === "cd3bc810_engelsoft_bacstac"
        || path.endsWith("_engelsoft_bacstac"),
    );
    return `/${encodeURIComponent(installedPath || "cd3bc810_engelsoft_bacstac")}`;
  }

  _mainStatusHtml() {
    const diagnostics = this._diagnostics || {};
    const pushTime = diagnostics.dispatch_time_avg_ms === undefined
      ? "-"
      : `${Number(diagnostics.dispatch_time_avg_ms).toFixed(2)} ms`;
    const valueChanges = this._dashboardValueChanges(diagnostics);
    const pushNotificationsRaw = diagnostics.bacnet_push_notifications
      ?? diagnostics.websocket_updates
      ?? diagnostics.push_count;
    const pushNotifications = Number(pushNotificationsRaw);
    const averageChangesPerPush = Number.isFinite(pushNotifications) && pushNotifications > 0
      ? (Number(valueChanges) / pushNotifications).toLocaleString(this._language === "de" ? "de-DE" : "en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "-";
    const connectionFailures = Number(diagnostics.connection_failures || 0);
    const connectedLabel = diagnostics.connected === undefined ? "-" : (diagnostics.connected ? "Ja" : "Nein");
    const connectionTone = diagnostics.connected === false
      ? "stat-bad"
      : (connectionFailures > 0 ? "stat-warn" : "stat-ok");
    const covPushUpdates = diagnostics.processed_push_updates ?? diagnostics.push_updates ?? "-";
    const pollingUpdates = diagnostics.processed_polling_updates ?? diagnostics.polling_updates ?? "-";
    const updateCounts = [covPushUpdates, pollingUpdates]
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    const totalUpdates = updateCounts.length
      ? updateCounts.reduce((total, value) => total + value, 0)
      : "-";
    const overview = `
      <div class="dashboard-headline-card status-overview">
        <div class="status-overview-grid">
          <span class="status-overview-value total"><strong>${this._escape(diagnostics.objects ?? this._total ?? "-")}</strong><small>Punkte insgesamt</small></span>
          <span class="status-overview-value active">
            <strong>${this._escape(diagnostics.enabled ?? "-")}</strong>
            <small>Aktive Entitäten</small>
            <span class="status-transport-line">
              <i class="push-dot" aria-hidden="true"></i>${this._escape(diagnostics.configured_push ?? "-")} Push
              <i class="poll-dot" aria-hidden="true"></i>${this._escape(diagnostics.configured_polling ?? "-")} Polling
            </span>
          </span>
          <span class="status-overview-value disabled"><strong>${this._escape(diagnostics.configured_disabled ?? diagnostics.disabled ?? "-")}</strong><small>Deaktiviert</small></span>
        </div>
      </div>`;
    const connectionOverview = `
      <div class="dashboard-headline-card status-overview ${connectionTone}">
        <div class="status-overview-grid status-overview-grid-two">
          <span class="status-overview-value connected"><strong>${this._escape(connectedLabel)}</strong><small>Verbunden</small></span>
          <span class="status-overview-value errors ${Number(connectionFailures) > 0 ? "has-errors" : ""}"><strong>${this._escape(connectionFailures)}</strong><small>Verbindungsfehler</small></span>
        </div>
      </div>`;
    const protocolV2 = diagnostics.api_transport === "protocol_v2";
    const processingCard = `
      <div class="dashboard-headline-card api-protocol-card ${protocolV2 ? "protocol-v2" : "legacy-api"}">
        <div class="api-protocol-content">
          <div class="api-protocol-title"><i class="api-protocol-dot" aria-hidden="true"></i>API / Protokoll</div>
          <div class="api-protocol-row">
            <strong class="api-protocol-name">${this._escape(diagnostics.api_transport_label ?? "Legacy API")}</strong>
            <span class="api-protocol-badge">${protocolV2 ? "Aktiv" : "Fallback"}</span>
          </div>
          <div class="api-protocol-meta">Push-Verarbeitung · ${this._escape(pushTime)}</div>
        </div>
      </div>`;
    const transportOverview = `
      <div class="dashboard-headline-card status-overview transport-overview">
        <div class="status-overview-grid status-overview-grid-two">
          <span class="status-overview-value updates">
            <strong>${this._escape(totalUpdates)}</strong>
            <small>Updates</small>
            <span class="status-transport-line">
              <i class="push-dot" aria-hidden="true"></i>${this._escape(covPushUpdates)} Push
              <i class="poll-dot" aria-hidden="true"></i>${this._escape(pollingUpdates)} Polling
            </span>
          </span>
          <span class="status-overview-value efficiency"><strong>${this._escape(averageChangesPerPush)}</strong><small>Ø Änderungen/Nachricht</small></span>
        </div>
      </div>`;
    return `<section class="main-status-strip" aria-label="Systemstatus">${overview}${connectionOverview}${processingCard}${transportOverview}</section>`;
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
      this._pendingReloadIds.add(uniqueId);
      if (field === "mode") this._pendingTransportIds.add(uniqueId);
      this._message = field === "mode"
        ? "Aktualisierungsmodus gespeichert. Wenn du fertig bist, oben gesammelt anwenden."
        : "Inline-Änderung gespeichert. Für Entity-Änderungen bitte Integration neu laden.";
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
          <td data-col="object"><div class="object-main"><bepacom-object-badge kind="${this._escape(this._typeClass(p.object_type).replace("type-", ""))}" label="${this._escape(this._objectIcon(p.object_type))}" description="${this._escape(p.object_type || "")}"></bepacom-object-badge><div><div class="name">${this._escape(p.object_key)}</div><div class="muted">Device ${this._escape(p.device_id)}</div></div></div></td>
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
    return `<bepacom-write-profile-indicator ${viaGlt ? "glt" : ""}></bepacom-write-profile-indicator>`;
  }

  _displayItems() {
    let points = this._points || [];
    if (this._filters.device_id && this._filters.device_id !== "all") points = points.filter((p) => String(p.device_id) === String(this._filters.device_id));
    if (this._filters.runtime && this._filters.runtime !== "all") {
      points = points.filter((point) => {
        if (this._filters.runtime === "enabled") return point.update_mode !== "disabled";
        if (this._filters.runtime === "disabled") return point.update_mode === "disabled";
        if (this._filters.runtime === "subscribe") return point.update_mode === "subscribe";
        if (this._filters.runtime === "polling") return point.update_mode === "polling";
        if (this._filters.runtime === "fallback") return point.fallback_polling === true;
        return true;
      });
    }
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
    return this._preferences.get(key, fallback);
  }

  _setSetting(key, value) {
    this._preferences.set(key, value);
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
    if (!count) return "";
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
        if (unit || deviceClass || stateClass) this._pendingReloadIds.add(p.unique_id);
        if (updateMode && updateMode !== (p.update_mode || "disabled")) {
          this._pendingTransportIds.add(p.unique_id);
        }
      }
      this._message = null;
      this._showToast(`${targets.length} Objekte gespeichert. Mit „Änderungen anwenden“ aktivieren.`);
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
        this._pendingReloadIds.add(p.unique_id);
        this._pendingTransportIds.add(p.unique_id);
      }
      this._message = null;
      this._showToast(`${targets.length} Overrides wurden zurückgesetzt.`);
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
    const row = this.shadowRoot?.querySelector(`tr[data-uid="${this._cssEscape(this._selected.unique_id)}"]`);
    if (!row) return;
    row.scrollIntoView({ block: "center", behavior: "smooth" });
    row.classList.add("source-jump-highlight");
    window.setTimeout(() => row.classList.remove("source-jump-highlight"), 2200);
  }

  _configureExplorerToolbar() {
    const toolbar = this.shadowRoot?.getElementById("explorerToolbar");
    if (!toolbar) return;
    toolbar.activeView = this._activeView;
    toolbar.virtualCount = this._allVirtualEntities().length;
    toolbar.filters = { ...this._filters };
    toolbar.language = this._language;
    toolbar.devices = Array.from(
      new Set(
        (this._points || [])
          .map((point) => String(point.device_id ?? "-"))
          .filter(Boolean),
      ),
    ).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    toolbar.objectTypes = Array.from(
      new Set((this._points || []).map((point) => String(point.object_type || "")).filter(Boolean)),
    ).sort();
    toolbar.groupBy = this._groupBy || "none";
    this._scheduleLocalization();
    if (toolbar.dataset.actionsBound === "1") return;
    toolbar.dataset.actionsBound = "1";
    toolbar.addEventListener("bepacom-toolbar-action", (event) => {
      const { action, key, value } = event.detail || {};
      if (action === "layout") {
        toolbar.updateComplete.then(() => this._scheduleLocalization());
        return;
      }
      if (action === "view") {
        if (this._editorDirty && !this._confirm("Ungespeicherte Änderungen verwerfen und Ansicht wechseln?")) return;
        this._editorDirty = false;
        this._dirtyFieldIds.clear();
        this._editorErrors = [];
        this._activeView = value || "explorer";
        this._setSetting("bepacom_active_view", this._activeView);
        this._render();
        return;
      }
      if (action === "filter") {
        this._setFilter(key, value);
        return;
      }
      if (action === "runtime") {
        this._filters.runtime = value || "all";
        this._visibleStart = 0;
        this._updateListDom();
        return;
      }
      if (action === "group") {
        this._groupBy = value || "none";
        this._setSetting("bepacom_group_by", this._groupBy);
        this._visibleStart = 0;
        this._render();
        return;
      }
      if (action === "reset") {
        this._filters = {
          search: "",
          object_type: "all",
          only_overrides: false,
          only_subscribe: false,
          device_id: "all",
          runtime: "all",
        };
        this._loadPoints();
      }
    });
  }

  _configurePointTable(changedIds = null) {
    const table = this.shadowRoot?.getElementById("tableWrap");
    if (!table) return;
    const items = this._displayItems();
    const rows = [];
    const previousRows = new Map((table.rows || [])
      .filter((row) => row.kind === "point").map((row) => [row.uniqueId, row]));
    // Render the filtered rows as one stable Lit list. Replacing virtual
    // spacer rows during the native scroll event caused some browsers to
    // restore scrollTop=0, making the list appear glued to its first row.
    for (const item of items) {
      if (item.kind === "group") {
        rows.push({ ...item });
        continue;
      }
      const point = item.point;
      if (changedIds && !changedIds.has(point.unique_id) && previousRows.has(point.unique_id)) {
        rows.push(previousRows.get(point.unique_id));
        continue;
      }
      const linkedEntities = this._linkedEntities(point).map((link) => {
        const entityId = link.entity_id || "";
        const name = this._linkedEntityName(link);
        return {
          entityId,
          icon: this._linkedEntityIcon(link),
          name,
          state: this._binaryStateLabel(this._linkedEntityState(link), link.device_class),
          title: entityId
            ? `${name} · ${entityId} · HA Dialog öffnen`
            : "Nach dem Neuladen der Integration verfügbar",
        };
      });
      const requested = this._desiredTransportPresentation(point);
      const effective = this._effectiveTransportPresentation(point);
      rows.push({
        kind: "point",
        uniqueId: point.unique_id,
        selected: this._selected?.unique_id === point.unique_id,
        checked: this._selectedIds.has(point.unique_id),
        changeClass: this._valueChangeClass(point.unique_id),
        objectKind: this._typeClass(point.object_type).replace("type-", ""),
        objectIcon: this._objectIcon(point.object_type),
        objectType: point.object_type || "",
        objectKey: point.object_key || "",
        deviceId: String(point.device_id ?? "-"),
        entityId: point.entity_id || "",
        entityName: this._displayEntityName(point),
        linkedEntities,
        linkedStates: this._linkedEntities(point).map((link) => this._linkedEntityLive(link)),
        value: this._value(point.present_value),
        unit: this._displayUnit(point),
        overrideActive: !!point.override_active,
        writeViaGlt: ["glt_set_as", "glt_set_stage"].includes(point.write_profile),
        runtimeState: effective.state,
        runtimeLabel: effective.label,
        requestedState: requested.state,
        requestedLabel: requested.label,
        effectiveDetail: effective.detail,
        transportMismatch: effective.mismatch,
      });
    }
    table.rows = rows;
    table.emptyMessage = "Keine BACnet-Objekte gefunden.";
    table.sortKey = this._sortKey;
    table.sortDirection = this._sortDir;
    this._scheduleLocalization();
    if (table.dataset.actionsBound === "1") return;
    table.dataset.actionsBound = "1";
    table.addEventListener("focusout", () => queueMicrotask(() => this._flushTableUpdates()));
    table.addEventListener("bepacom-table-action", (event) => {
      const { action, key, uniqueId, entityId, checked } = event.detail || {};
      if (action === "sort") {
        this._setSort(key);
      } else if (action === "toggle-group") {
        this._toggleGroup(key);
      } else if (action === "more-info") {
        this._openMoreInfo(entityId);
      } else if (action === "select-point" || action === "open-details") {
        const point = this._points.find((candidate) => candidate.unique_id === uniqueId);
        if (!point) return;
        if (action === "open-details") this._openDetailsFor(point);
        else this._selectPoint(point);
      } else if (action === "select-row") {
        checked ? this._selectedIds.add(uniqueId) : this._selectedIds.delete(uniqueId);
        this._render();
      } else if (action === "select-visible") {
        for (const candidate of this._displayItems()) {
          if (candidate.kind !== "point") continue;
          checked
            ? this._selectedIds.add(candidate.point.unique_id)
            : this._selectedIds.delete(candidate.point.unique_id);
        }
        this._render();
      }
    });
  }

  _configureRuntimeDashboard() {
    const dashboard = this.shadowRoot?.getElementById("dashboard");
    if (!dashboard) return;
    const d = this._diagnostics || {};
    const valueChanges = this._dashboardValueChanges(d);
    const pushNotificationsRaw = d.bacnet_push_notifications ?? d.websocket_updates ?? d.push_count;
    const pushNotifications = Number(pushNotificationsRaw);
    const averageChangesPerPush = Number.isFinite(pushNotifications) && pushNotifications > 0
      ? (Number(valueChanges) / pushNotifications).toLocaleString(this._language === "de" ? "de-DE" : "en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "-";
    const pushChangeValue = `${pushNotificationsRaw ?? "-"} / ${averageChangesPerPush}`;
    const configured = [
      ["Push / COV", d.configured_push ?? "-"],
      ["Polling", d.configured_polling ?? "-"],
      ["Deaktiviert", d.configured_disabled ?? d.disabled ?? "-"],
      ["Individuell konfiguriert", d.overrides ?? "-"],
    ];
    if (Array.isArray(d.firmware_versions) && d.firmware_versions.length) configured.push(["Firmware", d.firmware_versions.join(", ")]);
    if (Array.isArray(d.device_models) && d.device_models.length) configured.push(["Gerätemodelle", d.device_models.join(", ")]);
    const runtime = [
      ["WebSocket", d.connected === undefined ? "-" : (d.connected ? "Verbunden" : "Getrennt")],
      ["Reconnects", d.reconnect_count ?? "-"],
      ["Verbindungsfehler", d.connection_failures ?? "-"],
      ["\u00d8 Verarbeitung", d.dispatch_time_avg_ms === undefined ? "-" : `${Number(d.dispatch_time_avg_ms).toFixed(2)} ms`],
      ["Max. Verarbeitung", d.dispatch_time_max_ms === undefined ? "-" : `${Number(d.dispatch_time_max_ms).toFixed(2)} ms`],
    ];
    const filterRate = (() => {
      const inspected = Number(d.websocket_payload_objects || 0);
      const filtered = Number(d.websocket_prefiltered_no_change_objects || 0);
      return inspected > 0 ? `${((filtered / inspected) * 100).toFixed(1)} %` : "-";
    })();
    const developer = [
      ["Filterquote", filterRate],
      ["\u00d8 \u00c4nderungen / Nachricht", averageChangesPerPush],
      ["Unterdr\u00fcckte gleiche Werte", d.suppressed_updates ?? "-"],
    ];
    const cards = (items) => items.map(([label, value]) => ({
      label,
      value,
      icon: this._statusIcon(label, value),
      tone: this._statusClass(label, value),
    }));
    dashboard.model = {
      open: !!this._statusOpen,
      tab: ["configuration", "developer"].includes(this._dashboardTab) ? this._dashboardTab : "live",
      summary: [
        `API: ${d.api_transport_label ?? "Legacy API"}`,
        `Punkte: ${d.objects ?? this._total ?? "-"}`,
        `aktiv: ${d.enabled ?? "-"}`,
        `Push: ${d.configured_push ?? "-"}/${d.subscribed ?? "-"}`,
        `Polling: ${d.configured_polling ?? "-"}/${d.fallback_polling ?? "-"}`,
        `Pushs / Ø Änderungen: ${pushChangeValue}`,
      ].join(" · "),
      configured: cards(configured),
      runtime: cards(runtime),
      developer: cards(developer),
      pipeline: {
        messages: pushNotificationsRaw ?? "-",
        inspected: d.websocket_payload_objects ?? "-",
        filtered: d.websocket_prefiltered_no_change_objects ?? "-",
        updates: d.websocket_callback_invocations ?? "-",
        changes: d.websocket_callback_value_changes ?? valueChanges ?? "-",
        filterRate,
      },
      protocol: {
        active: d.api_transport === "protocol_v2",
        connected: d.connected === true,
        lastEvent: d.last_push_age ?? "-",
        sequence: d.protocol_sequence ?? "-",
        resyncs: d.protocol_resyncs ?? 0,
        commandSuccesses: d.protocol_command_successes ?? 0,
        commandErrors: d.protocol_command_errors ?? 0,
        commandLatency: Number(d.protocol_command_successes || 0) > 0 ? `${Number(d.protocol_command_avg_ms).toFixed(1)} ms` : "-",
        appVersion: d.gateway_app_version ?? "-",
        protocolVersion: d.gateway_protocol_version ?? "-",
      },
      livePaused: this._livePaused,
      liveFilters: { ...this._liveFilters },
      liveChanges: this._liveChanges.map((item) => {
        const { point, entityId, friendlyName } = this._livePointLabels(item);
        return {
          ...item,
          entity_id: entityId,
          resolved_unique_id: point?.unique_id || item.unique_id,
          friendly_name: friendlyName,
        };
      }),
    };
    this._scheduleLocalization();
    if (dashboard.dataset.actionsBound === "1") return;
    dashboard.dataset.actionsBound = "1";
    dashboard.addEventListener("bepacom-dashboard-action", (event) => {
      const { action, key, value, uniqueId } = event.detail || {};
      if (action === "toggle") {
        this._setStatusOpen(!this._statusOpen);
      } else if (action === "tab") {
        this._dashboardTab = ["configuration", "developer"].includes(value) ? value : "live";
        this._setSetting("bepacom_dashboard_tab", this._dashboardTab);
        this._configureRuntimeDashboard();
        if (this._dashboardTab === "live") this._refreshLiveChanges();
      } else if (action === "toggle-live") {
        this._livePaused = !this._livePaused;
        this._liveGeneration += 1;
        this._configureRuntimeDashboard();
        if (!this._livePaused) this._refreshLiveChanges();
      } else if (action === "clear-live") {
        this._liveChanges = [];
        this._liveGeneration += 1;
        this._configureRuntimeDashboard();
      } else if (action === "live-filter") {
        this._liveFilters[key] = value || (key === "search" ? "" : "all");
        this._configureRuntimeDashboard();
      } else if (action === "select-point") {
        const point = this._points.find((candidate) => candidate.unique_id === uniqueId);
        if (!point) return;
        this._detailsVisible = true;
        this._setSetting("bepacom_details_visible", "1");
        this._selectPoint(point);
      }
    });
  }

  _configurePointInspector() {
    const inspector = this.shadowRoot?.getElementById("pointInspector");
    if (!inspector) return;
    const sectionOpen = {};
    for (const id of ["config", "virtual-config", "inspector", "engineering"]) {
      try {
        const stored = window.localStorage.getItem(`bepacom_section_${id}_open`);
        sectionOpen[id] = stored === "1" || stored === "true";
      } catch (_) {
        sectionOpen[id] = false;
      }
    }
    inspector.model = {
      sideTab: ["virtual", "technical", "engineering"].includes(this._sideTab) ? this._sideTab : "inspector",
      selected: this._selected,
      inspector: this._inspector || {},
      linkedEntities: this._selected ? this._linkedEntities(this._selected) : [],
      saving: this._saving,
      dirty: this._editorDirty,
      errors: [...this._editorErrors],
      sectionOpen,
      preview: this._selected
        ? this._virtualRulePreviewData(this._selected)
        : { sourceValue: "-", result: "unavailable", tone: "unav" },
    };
    this._scheduleLocalization();
    if (inspector.dataset.actionsBound !== "1") {
      inspector.dataset.actionsBound = "1";
      inspector.addEventListener("bepacom-inspector-action", (event) => {
        const { action, value, virtualUid, name } = event.detail || {};
        if (action === "tab") {
          this._rememberSideScroll();
          this._sideTab = ["virtual", "technical", "engineering"].includes(value) ? value : "inspector";
          this._setSetting("bepacom_side_tab", this._sideTab);
          this._configurePointInspector();
        } else if (action === "create-virtual") {
          this._sideTab = "inspector";
          this._setSetting("bepacom_side_tab", this._sideTab);
          this._configurePointInspector();
          setTimeout(() => this.shadowRoot?.getElementById("virtualBinaryName")?.focus(), 0);
        } else if (action === "edit-virtual") {
          this._editVirtualEntity(this._selected?.unique_id, virtualUid, false);
        } else if (action === "duplicate-virtual") {
          this._editVirtualEntity(this._selected?.unique_id, virtualUid, true);
        } else if (action === "delete-virtual") {
          this._deleteVirtualEntity(this._selected?.unique_id, virtualUid, name || "");
        }
      });
    }
    inspector.addEventListener("bepacom-inspector-rendered", () => {
      if (this._language === "en") localizeDom(inspector, this._language);
      this._bindInspectorEvents();
      this._restoreSideScroll();
    }, { once: true });
  }

  _bindEvents() {
    this._configureExplorerToolbar();
    this._configurePointTable();
    this._configureRuntimeDashboard();
    this._configurePointInspector();
    this.shadowRoot.querySelectorAll("[data-main-section]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const section = button.getAttribute("data-main-section") || "configuration";
        if (
          section !== "configuration"
          && this._editorDirty
          && !this._confirm("Ungespeicherte Änderungen verwerfen und den Bereich wechseln?")
        ) return;
        this._editorDirty = false;
        this._dirtyFieldIds.clear();
        this._editorErrors = [];
        this._mainSection = ["live", "diagnostics"].includes(section) ? section : "configuration";
        this._dashboardTab = this._mainSection === "live" ? "live" : "developer";
        this._statusOpen = true;
        this._setSetting("bepacom_main_section", this._mainSection);
        this._setSetting("bepacom_dashboard_tab", this._dashboardTab);
        this._render();
        if (this._mainSection === "live") {
          window.setTimeout(() => this._refreshLiveChanges(), 0);
        }
      });
    });
    this.shadowRoot.querySelector("[data-bacstac-addon]")?.addEventListener("click", (event) => {
      if (
        this._editorDirty
        && !this._confirm("Ungespeicherte Änderungen verwerfen und das BACstac Add-on öffnen?")
      ) {
        event.preventDefault();
      }
    });
    const moreActionsToggle = this.shadowRoot.getElementById("moreActionsToggle");
    this.shadowRoot.getElementById("haMenuToggle")?.addEventListener("click", (event) => {
      event.preventDefault();
      this._toggleHomeAssistantMenu();
    });
    moreActionsToggle?.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const menu = moreActionsToggle.closest(".header-actions-menu");
      const open = menu?.classList.toggle("open") || false;
      moreActionsToggle.setAttribute("aria-expanded", open ? "true" : "false");
      moreActionsToggle.setAttribute(
        "aria-label",
        open ? "Aktionen schließen" : "Aktionen öffnen",
      );
    });
    this.shadowRoot.querySelectorAll("[data-view-tab]").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        if (this._editorDirty && !this._confirm("Ungespeicherte Änderungen verwerfen und Ansicht wechseln?")) return;
        this._editorDirty = false;
        this._dirtyFieldIds.clear();
        this._editorErrors = [];
        this._activeView = button.getAttribute("data-view-tab") || "explorer";
        this._setSetting("bepacom_active_view", this._activeView);
        this._render();
      });
    });
    this.shadowRoot.getElementById("refresh")?.addEventListener("click", () => this._loadPoints());
    this.shadowRoot.getElementById("detailRailToggle")?.addEventListener("click", () => {
      this._detailsVisible = !this._detailsVisible;
      this._setSetting("bepacom_details_visible", this._detailsVisible ? "1" : "0");
      this._render();
    });
    this.shadowRoot.getElementById("exportJson")?.addEventListener("click", () => this._exportJson());
    this.shadowRoot.getElementById("exportCsv")?.addEventListener("click", () => this._exportCsv());
    this.shadowRoot.getElementById("exportExcel")?.addEventListener("click", () => this._exportExcel());
    this.shadowRoot.getElementById("exportOverrides")?.addEventListener("click", () => this._exportOverrides());
    this.shadowRoot.getElementById("importOverrides")?.addEventListener("click", () => this._openOverrideImport());
    this.shadowRoot.getElementById("importOverridesFile")?.addEventListener("change", (ev) => this._importOverrides(ev.target.files?.[0]));
    this.shadowRoot.getElementById("reloadIntegration")?.addEventListener("click", () => this._reloadIntegration());
    this.shadowRoot.getElementById("applyChanges")?.addEventListener("click", () => this._applyPendingChanges());
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
    this.shadowRoot.getElementById("runtime")?.addEventListener("change", (ev) => {
      this._filters.runtime = ev.target.value || "all";
      this._visibleStart = 0;
      this._updateListDom();
    });
    this.shadowRoot.getElementById("groupBy")?.addEventListener("change", (ev) => { this._groupBy = ev.target.value || "none"; this._setSetting("bepacom_group_by", this._groupBy); this._visibleStart = 0; this._render(); });
    this.shadowRoot.querySelectorAll("[data-sort]").forEach((el) => el.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); this._setSort(el.getAttribute("data-sort")); }));
    this.shadowRoot.getElementById("onlyOverrides")?.addEventListener("change", (ev) => this._setFilter("only_overrides", ev.target.checked));
    this.shadowRoot.getElementById("onlySubscribe")?.addEventListener("change", (ev) => this._setFilter("only_subscribe", ev.target.checked));
    this.shadowRoot.getElementById("clear")?.addEventListener("click", () => {
      this._filters = { search: "", object_type: "all", only_overrides: false, only_subscribe: false, device_id: "all", runtime: "all" };
      this._loadPoints();
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
      };
    }
    this._bindRowEvents();
  }

  _bindInspectorEvents() {
    this._bindDetailToggles();
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
    this.shadowRoot.getElementById("writeValueBtn")?.addEventListener("click", () => this._writeSelected());
    const saveButton = this.shadowRoot.getElementById("saveOverride");
    const resetButton = this.shadowRoot.getElementById("resetOverride");
    saveButton?.addEventListener("pointerdown", (ev) => ev.stopPropagation());
    resetButton?.addEventListener("pointerdown", (ev) => ev.stopPropagation());
    this.shadowRoot.getElementById("applyObjectAssistant")?.addEventListener("click", () => this._applyObjectAssistantSuggestion());
    this.shadowRoot.getElementById("editMultistateRepresentation")?.addEventListener("change", (ev) => {
      const switchValues = this.shadowRoot.getElementById("multistateSwitchValues");
      if (switchValues) switchValues.style.display = ["switch", "light", "outlet"].includes(ev.target.value) ? "contents" : "none";
      const feedback = this.shadowRoot.getElementById("multistateFeedbackSettings");
      if (feedback) feedback.style.display = ["switch", "light", "outlet"].includes(ev.target.value) ? "block" : "none";
    });
    this._syncContextualEditorFields();
    this.shadowRoot.querySelectorAll(".side input, .side select, .side textarea").forEach((el) => {
      el.addEventListener("input", () => {
        this._editorDirty = true;
        if (el.id) this._dirtyFieldIds.add(el.id);
        this._syncContextualEditorFields();
        this._updateEditorState();
        if (el.id && el.id.startsWith("virtualBinary")) this._refreshVirtualRulePreview();
      });
      el.addEventListener("change", () => {
        this._editorDirty = true;
        if (el.id) this._dirtyFieldIds.add(el.id);
        this._syncContextualEditorFields();
        this._updateEditorState();
        if (el.id && el.id.startsWith("virtualBinary")) this._refreshVirtualRulePreview();
      });
      el.addEventListener("keydown", (ev) => {
        ev.stopPropagation();
        if (ev.key === "Enter" && (el.id === "editEntityName" || el.id === "editEntityId")) {
          ev.preventDefault();
          this._saveSelected();
        }
      });
    });
    this.shadowRoot.getElementById("discardEditor")?.addEventListener("click", () => this._discardEditorChanges());
    this.shadowRoot.querySelectorAll(".side .linked-entity-link").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._openMoreInfo(button.dataset.entityId);
      });
    });
    this.shadowRoot.querySelectorAll(".side .virtual-source-btn").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const point = this._points.find((candidate) => candidate.unique_id === button.dataset.sourceUid);
        if (!point) return;
        this._sideTab = "inspector";
        this._setSetting("bepacom_side_tab", this._sideTab);
        this._selectPoint(point);
        setTimeout(() => this._scrollSelectedIntoView(), 0);
      });
    });
    this.shadowRoot.querySelectorAll(".side .virtual-edit-btn").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._editVirtualEntity(button.dataset.sourceUid, button.dataset.virtualUid, false);
      });
    });
    this.shadowRoot.querySelectorAll(".side .virtual-duplicate-btn").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._editVirtualEntity(button.dataset.sourceUid, button.dataset.virtualUid, true);
      });
    });
    this.shadowRoot.querySelectorAll(".side .virtual-delete-btn").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._deleteVirtualEntity(
          button.dataset.sourceUid,
          button.dataset.virtualUid,
          button.dataset.virtualName || "",
        );
      });
    });
    const sideBody = this.shadowRoot.querySelector(".side-body");
    if (sideBody) {
      sideBody.onscroll = () => {
        this._sideScrollPositions.set(this._sideScrollKey(), sideBody.scrollTop);
      };
    }
  }

  _syncContextualEditorFields() {
    const profile = this.shadowRoot?.getElementById("editWriteProfile")?.value || "direct";
    this.shadowRoot?.querySelectorAll(".glt-profile-field").forEach((field) => {
      field.hidden = profile === "direct";
    });
    this.shadowRoot?.querySelectorAll(".glt-as-profile-field").forEach((field) => {
      field.hidden = profile !== "glt_set_as";
    });
    const virtualEnabled = !!this.shadowRoot?.getElementById("virtualBinaryEnabled")?.checked;
    const virtualFields = this.shadowRoot?.getElementById("virtualBinaryFields");
    if (virtualFields) virtualFields.hidden = !virtualEnabled;
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
    const devices = Array.from(new Set((this._points || []).map((p) => String(p.device_id ?? "-")).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b), undefined, {numeric:true}));
    const current = String(this._filters.device_id || "all");
    const all = [`<option value="all" ${current === "all" ? "selected" : ""}>Alle Devices</option>`];
    return all.concat(devices.map((d) => `<option value="${this._escape(d)}" ${current === d ? "selected" : ""}>Device ${this._escape(d)}</option>`)).join("");
  }

  _typeOptions() {
    const types = Array.from(new Set(this._points.map((p) => p.object_type))).filter(Boolean).sort();
    const all = [`<option value="all" ${this._filters.object_type === "all" ? "selected" : ""}>Alle Objekttypen</option>`];
    return all.concat(types.map((t) => `<option value="${this._escape(t)}" ${this._filters.object_type === t ? "selected" : ""}>${this._escape(t)}</option>`)).join("");
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
    if (virtualRuleMatches(sourceValue, onRule)) {
      result = "ON";
      cls = "on";
    } else if (virtualRuleMatches(sourceValue, offRule)) {
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
    if (!box || !this._selected) return;
    const preview = this._virtualRulePreviewData(this._selected);
    const values = box.querySelectorAll("strong");
    if (values[0]) values[0].textContent = preview.sourceValue;
    if (values[1]) {
      values[1].textContent = preview.result;
      values[1].className = `rule-result ${preview.tone}`;
    }
  }

  _virtualRulePreviewData(p) {
    const onEl = this.shadowRoot?.getElementById("virtualBinaryOnValue");
    const offEl = this.shadowRoot?.getElementById("virtualBinaryOffValue");
    const elseEl = this.shadowRoot?.getElementById("virtualBinaryElseState");
    const sourceValue = p?.present_value;
    const onRule = onEl ? onEl.value : (p?.virtual_binary?.on_value ?? "2");
    const offRule = offEl ? offEl.value : (p?.virtual_binary?.off_value ?? "1");
    const elseState = elseEl ? elseEl.value : (p?.virtual_binary?.else_state || "unavailable");
    let result = "unavailable";
    let tone = "unav";
    if (virtualRuleMatches(sourceValue, onRule)) {
      result = "ON";
      tone = "on";
    } else if (virtualRuleMatches(sourceValue, offRule) || String(elseState).toLowerCase() === "off") {
      result = "OFF";
      tone = "off";
    }
    return { sourceValue: this._value(sourceValue), result, tone };
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
    const multistateRepresentation = ["switch", "light", "outlet"].includes(p.multistate_representation) ? p.multistate_representation : "number";
    const haEntitySuppressed = p.ha_entity_suppressed === true;
    const feedbackConsumer = p.multistate_feedback_consumer || {};
    const feedbackCandidates = Array.isArray(p.multistate_feedback_candidates) ? p.multistate_feedback_candidates : [];
    const feedbackOptions = feedbackCandidates
      .sort((a, b) => Number(b.same_object_id) - Number(a.same_object_id))
      .map((candidate) => `<option value="${this._escape(candidate.unique_id)}" ${candidate.unique_id === p.multistate_feedback_unique_id ? "selected" : ""}>${this._escape(`${candidate.name} · MSI ${candidate.object_id}${candidate.same_object_id ? " (gleiche Objekt-ID)" : ""}`)}</option>`)
      .join("");
    const multistateEntitySettings = isMultiStateOutput ? `
      <h3 style="margin-top:14px;">Darstellung in Home Assistant</h3>
      <div class="muted" style="margin-bottom:8px;">Als Schalter, Licht oder Steckdose wird nur der konfigurierte AUS- bzw. EIN-Wert geschrieben. Andere aktuelle Werte werden als unbekannt angezeigt.</div>
      <div class="edit-grid">
        <div><label>Entitätstyp</label><select id="editMultistateRepresentation">
          <option value="number" ${multistateRepresentation === "number" ? "selected" : ""}>Zahlenwert</option>
          <option value="switch" ${multistateRepresentation === "switch" ? "selected" : ""}>Schalter</option>
          <option value="light" ${multistateRepresentation === "light" ? "selected" : ""}>Licht</option>
          <option value="outlet" ${multistateRepresentation === "outlet" ? "selected" : ""}>Steckdose</option>
        </select></div>
        <div id="multistateSwitchValues" class="edit-grid" style="display:${["switch", "light", "outlet"].includes(multistateRepresentation) ? "contents" : "none"}">
          <div><label>AUS-Wert</label><input id="editMultistateOffValue" type="number" step="any" value="${this._escape(p.multistate_off_value ?? 1)}"></div>
          <div><label>EIN-Wert</label><input id="editMultistateOnValue" type="number" step="any" value="${this._escape(p.multistate_on_value ?? 2)}"></div>
        </div>
        <div id="multistateFeedbackSettings" style="display:${["switch", "light", "outlet"].includes(multistateRepresentation) ? "block" : "none"};margin-top:10px;">
          <label>Optionale Rückmeldung</label>
          <select id="editMultistateFeedbackUniqueId">
            <option value="">Keine – Zustand aus dem MSO</option>
            ${feedbackOptions}
          </select>
          <div class="muted" style="margin-top:6px;">Bei Auswahl kommt der Schalterzustand aus diesem MSI. Dessen separate HA-Entität wird entfernt.</div>
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
      ${haEntitySuppressed ? `
        <div class="transport-comparison" style="margin-bottom:10px;opacity:.78;">
          <div><small>Keine eigene HA-Entität</small><strong>Rückmeldung für ${this._escape(feedbackConsumer.name || feedbackConsumer.unique_id || "MSO-Schalter")}</strong></div>
          <p>Dieser MSI wird intern für den Schalter verwendet. Die zugehörige Sensor-Entität wird nicht angelegt.</p>
        </div>
      ` : ""}
      <div class="edit-grid">
        <fieldset ${haEntitySuppressed ? "disabled" : ""} class="edit-grid" style="grid-column:1/-1;border:0;padding:0;margin:0;opacity:${haEntitySuppressed ? ".48" : "1"}">
          <div><label>HA Entity ID</label><input id="editEntityId" value="${this._escape(p.entity_id || "")}" placeholder="${haEntitySuppressed ? "Nicht angelegt (als Rückmeldung verwendet)" : "z.B. sensor.rollostellung_eg_speis"}"></div>
          <div><label>HA Entitätsname</label><input id="editEntityName" value="${this._escape(p.entity_name || "")}" placeholder="leer = Standardname"></div>
          <div><label>Einheit</label><select id="editUnit">${this._unitOptions(p)}</select></div>
          <div><label>Device Class</label><select id="editDeviceClass">${this._deviceClassOptions(p)}</select></div>
          <div><label>State Class</label><select id="editStateClass">${this._stateClassOptions(p)}</select></div>
        </fieldset>
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
        <button id="discardEditor" class="secondary" ${(!this._editorDirty || this._saving) ? "disabled" : ""}>Änderungen verwerfen</button>
        <button id="resetOverride" class="secondary" ${this._saving ? "disabled" : ""}>Override zurücksetzen</button>
      </div>
    `;

    const inspectorContent = kv.map(([k,v]) => `<div class="kv"><div class="k">${this._escape(k)}</div><div class="v">${this._escape(v)}</div></div>`).join("");

    return `
      <div class="point-inspector-head">
        <div><h2>${this._escape(p.object_key)}</h2><div class="muted">${this._escape(p.object_name || "-")}</div></div>
        ${editActions}
      </div>
      <div id="editorDirtyBanner" class="dirty-banner" ${this._editorDirty ? "" : "hidden"}><strong>Ungespeicherte Änderungen</strong> – bitte speichern oder verwerfen.</div>
      <div id="editorValidation" class="validation-errors" ${this._editorErrors.length ? "" : "hidden"}>${this._editorErrors.map((error) => `<div>${this._escape(error)}</div>`).join("")}</div>
      <div id="priorityWarning" class="priority-warning" ${(Number(p.write_priority) >= 1 && Number(p.write_priority) <= 7) ? "" : "hidden"}><strong>Achtung:</strong> Eine BACnet-Priorität zwischen 1 und 7 übersteuert den üblichen Bedienwert auf Priorität 8.</div>
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
      ["polling", "🟢 Polling"],
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
    const dot = (state, label) => `<bepacom-runtime-indicator state="${state}" label="${this._escape(label)}"></bepacom-runtime-indicator>`;
    if (p.update_mode === "disabled") return dot("off", "Aus");
    if (
      p.update_mode === "subscribe"
      && this._diagnostics?.snapshot_websocket_mode === true
      && this._diagnostics?.subscriptions_initialized === true
      && this._diagnostics?.connected === true
      && Number(this._diagnostics?.snapshot_targets || 0) > 0
    ) {
      return dot(
        "snapshot",
        "Snapshot aktiv – Aktualisierung über die gemeinsame Snapshot-Verbindung",
      );
    }
    if (p.subscribed === true) return dot("push", "Push aktiv");
    if (p.fallback_polling === true) return dot("poll", "Polling-Fallback aktiv");
    if (p.update_mode === "polling") return dot("poll", "Polling aktiv");
    return dot("wait", "Wartet");
  }

  _desiredTransportPresentation(point) {
    if (point.update_mode === "subscribe") return { mode: "cov", state: "push", label: "Push / COV" };
    if (point.update_mode === "polling") return { mode: "polling", state: "poll", label: "Polling" };
    return { mode: "disabled", state: "off", label: "Deaktiviert" };
  }

  _effectiveTransportPresentation(point) {
    const desired = this._desiredTransportPresentation(point);
    const effectiveMode = String(point.effective_update_mode || "unknown");
    const effectiveState = String(point.effective_update_state || "unknown");
    const reasonLabels = {
      cov_limit: "Grund: COV-Limit erreicht",
      cov_silent: "Grund: keine COV-Werte",
      cov_failed: "Grund: COV-Anmeldung fehlgeschlagen",
    };
    let state = "wait";
    let label = "Noch nicht gemeldet";
    if (effectiveState === "cov_active") {
      state = "push";
      label = "COV aktiv";
    } else if (effectiveState === "subscribing") {
      label = "COV-Anmeldung";
    } else if (effectiveState === "cov_waiting") {
      label = "Wartet auf COV";
    } else if (effectiveState === "polling") {
      state = "poll";
      label = "Polling aktiv";
    } else if (effectiveState === "polling_fallback") {
      state = "poll";
      label = "Polling-Fallback";
    } else if (effectiveState === "polling_waiting") {
      label = "Wartet auf Gerät";
    } else if (effectiveState === "polling_error") {
      label = "Polling gestört";
    } else if (["disabled", "cancelled"].includes(effectiveState)) {
      state = "off";
      label = effectiveState === "disabled" ? "Deaktiviert" : "Beendet";
    } else if (effectiveMode === "cov") {
      state = "push";
      label = "COV aktiv";
    } else if (effectiveMode === "polling") {
      state = "poll";
      label = "Polling aktiv";
    } else if (effectiveMode === "disabled") {
      state = "off";
      label = "Deaktiviert";
    } else if (point.subscribed === true) {
      state = "push";
      label = "Push aktiv (lokal)";
    } else if (point.fallback_polling === true || point.update_mode === "polling") {
      state = "poll";
      label = point.fallback_polling ? "Polling-Fallback (lokal)" : "Polling aktiv (lokal)";
    }

    let detail = reasonLabels[point.effective_update_reason] || point.effective_update_error || "";
    const gatewayRequested = point.gateway_requested_mode;
    if (!detail && gatewayRequested && gatewayRequested !== desired.mode) {
      detail = `BACstac-Vorgabe: ${gatewayRequested === "cov" ? "COV" : gatewayRequested === "polling" ? "Polling" : "Aus"}`;
    }
    const settled = !["unknown", "waiting"].includes(effectiveMode)
      && !["subscribing", "cov_waiting", "polling_waiting"].includes(effectiveState);
    return {
      state,
      label,
      detail,
      mismatch: !!detail || (settled && effectiveMode !== desired.mode),
    };
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

if (!customElements.get("bepacom-explorer-view")) {
  customElements.define("bepacom-explorer-view", BepacomExplorerView);
}
