import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

type Option = [string, string];

export interface PointInspectorModel {
  sideTab: "inspector" | "virtual" | "technical" | "engineering";
  selected: Record<string, any> | null;
  inspector: Record<string, any>;
  linkedEntities: Array<Record<string, any>>;
  saving: boolean;
  dirty: boolean;
  errors: string[];
  sectionOpen: Record<string, boolean>;
  preview: { sourceValue: string; result: string; tone: string };
}

const EMPTY_MODEL: PointInspectorModel = {
  sideTab: "inspector",
  selected: null,
  inspector: {},
  linkedEntities: [],
  saving: false,
  dirty: false,
  errors: [],
  sectionOpen: {},
  preview: { sourceValue: "-", result: "unavailable", tone: "unknown" },
};

@customElement("bepacom-point-inspector")
export class BepacomPointInspector extends LitElement {
  @property({ attribute: false }) public model: PointInspectorModel = EMPTY_MODEL;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private _action(action: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(new CustomEvent("bepacom-inspector-action", {
      detail: { action, ...detail },
      bubbles: true,
      composed: true,
    }));
  }

  private _value(value: unknown): string {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "object") {
      try { return JSON.stringify(value); } catch { return String(value); }
    }
    return String(value);
  }

  private _current(value: unknown): string {
    if (value === null || value === undefined || value === "" || value === "auto") return "__auto__";
    const normalized = String(value).trim().toLowerCase();
    if (["__auto__", "automatic", "automatisch"].includes(normalized)) return "__auto__";
    if (["__none__", "none", "null", "keine", "no", "false"].includes(normalized)) return "__none__";
    return String(value);
  }

  private _options(values: Option[], current: string) {
    const list = values.some(([value]) => value === current) ? values : [[current, `${current} (aktuell)`] as Option, ...values];
    return list.map(([value, label]) => html`<option value=${value} ?selected=${value === current}>${label}</option>`);
  }

  private _desiredTransport(point: Record<string, any>): string {
    if (point.update_mode === "subscribe") return "Push / COV";
    if (point.update_mode === "polling") return "Polling";
    return "Deaktiviert";
  }

  private _effectiveTransport(point: Record<string, any>): string {
    const labels: Record<string, string> = {
      cov_active: "COV aktiv",
      cov_waiting: "Wartet auf COV",
      subscribing: "COV-Anmeldung läuft",
      polling: "Polling aktiv",
      polling_waiting: "Polling wartet auf Gerät",
      polling_error: "Polling gestört",
      polling_fallback: "Polling-Fallback",
      disabled: "Deaktiviert",
      cancelled: "Beendet",
      waiting: "Wartet",
      unknown: "Noch nicht von BACstac gemeldet",
    };
    return labels[point.effective_update_state] || labels[point.effective_update_mode] || String(point.effective_update_state || "Noch nicht gemeldet");
  }

  private _transportReason(point: Record<string, any>): string {
    const reasons: Record<string, string> = {
      cov_limit: "COV-Limit erreicht",
      cov_silent: "Keine COV-Werte empfangen",
      cov_failed: "COV-Anmeldung fehlgeschlagen",
    };
    return reasons[point.effective_update_reason] || point.effective_update_error || "";
  }

  private _section(id: string, title: string, content: unknown) {
    return html`
      <details class="detail-section" data-section=${id} ?open=${!!this.model.sectionOpen[id]}>
        <summary>${title}</summary>
        <div class="detail-section-body">${content}</div>
      </details>
    `;
  }

  private _tabs() {
    const count = this.model.linkedEntities.length;
    const tab = (id: PointInspectorModel["sideTab"], label: string) => html`
      <button class=${`side-tab ${this.model.sideTab === id ? "active" : ""}`} @click=${() => this._action("tab", { value: id })}>${label}</button>
    `;
    return html`
      <div class="side-tabs">
        ${tab("inspector", "Point Inspector")}
        ${tab("virtual", `Virtuelle Entitäten${count ? ` (${count})` : ""}`)}
        ${tab("technical", "Inspector")}
        ${tab("engineering", "Engineering-Properties")}
      </div>
    `;
  }

  private _virtualOverview() {
    const point = this.model.selected;
    if (!point) return html`<div class="side-section-head"><h2>Virtuelle Entitäten</h2><div class="muted">Wähle links einen BACnet-Punkt aus.</div></div>`;
    return html`
      <div class="side-section-head">
        <h2>Virtuelle Entitäten</h2>
        <div class="selected-source-box">
          <div><strong>Quelle:</strong> ${point.object_key || point.unique_id || "-"}</div>
          <div class="muted">${point.object_name || ""}</div>
          <div class="muted">${this.model.linkedEntities.length} verknüpfte virtuelle Entität${this.model.linkedEntities.length === 1 ? "" : "en"}</div>
        </div>
      </div>
      <div class="side-virtual-cards">
        ${this.model.linkedEntities.length
          ? this.model.linkedEntities.map((entity) => html`
              <div class="side-virtual-card">
                <div class="side-virtual-card-title">
                  <span class="side-virtual-card-name">${entity.name || entity.unique_id || "Virtuelle Entität"}</span>
                  <span class="pill">${entity.device_class || "binary"}</span>
                </div>
                <div class="side-virtual-card-meta">${entity.entity_id || "Nach Reload verfügbar"}</div>
                <div class="side-virtual-card-rules">
                  <div><span>ON</span><code>${entity.on_value ?? "-"}</code></div>
                  <div><span>OFF</span><code>${entity.off_value ?? "-"}</code></div>
                  <div><span>ELSE</span><code>${entity.else_state || "unavailable"}</code></div>
                </div>
                <div class="virtual-icon-actions">
                  <button class="secondary" @click=${() => this._action("edit-virtual", { virtualUid: entity.unique_id })}>Bearbeiten</button>
                  <button class="secondary" @click=${() => this._action("duplicate-virtual", { virtualUid: entity.unique_id })}>Duplizieren</button>
                  <button class="secondary" @click=${() => this._action("delete-virtual", { virtualUid: entity.unique_id, name: entity.name || "" })}>Löschen</button>
                </div>
              </div>
            `)
          : html`<div class="muted">Für diesen Punkt sind noch keine virtuellen Entitäten vorhanden.</div>`}
      </div>
      <div class="actions"><button @click=${() => this._action("create-virtual")}>+ Neue virtuelle Entität</button></div>
      <div class="muted" style="margin-top:8px;">Neue Einträge werden im Point Inspector unter „Virtuelle Entität konfigurieren“ angelegt.</div>
    `;
  }

  private _configuration(point: Record<string, any>) {
    const type = String(point.object_type || "").toLowerCase().replace(/[^a-z]/g, "");
    const analog = type === "analogvalue";
    const multistate = type === "multistateoutput";
    const representation = point.multistate_representation === "switch" ? "switch" : "number";
    const unit = this._current(point.override_unit);
    const deviceClass = this._current(point.override_device_class);
    const stateClass = this._current(point.override_state_class);
    const updateMode = point.update_mode || (point.enabled === false ? "disabled" : point.subscribe ? "subscribe" : "disabled");
    const writeProfile = point.write_profile || "direct";

    return html`
      <div class="edit-grid">
        <div><label>HA Entity ID</label><input id="editEntityId" .value=${point.entity_id || ""}></div>
        <div><label>HA Entitätsname</label><input id="editEntityName" .value=${point.entity_name || ""} placeholder="leer = Standardname"></div>
        <div><label>Einheit</label><select id="editUnit">${this._options([
          ["__auto__", `Automatisch (BACnet: ${point.bacnet_unit || "keine"})`], ["__none__", "Keine Einheit"],
          ["%", "%"], ["°C", "°C"], ["cm", "cm"], ["W", "W"], ["kW", "kW"], ["Wh", "Wh"], ["kWh", "kWh"],
          ["V", "V"], ["A", "A"], ["Hz", "Hz"], ["lx", "lx"], ["Pa", "Pa"], ["bar", "bar"], ["min", "min"], ["s", "s"], ["h", "h"],
        ], unit)}</select></div>
        <div><label>Device Class</label><select id="editDeviceClass">${this._options([
          ["__auto__", `Automatisch (${point.device_class || "keine"})`], ["__none__", "Keine"], ["temperature", "Temperatur"],
          ["humidity", "Luftfeuchtigkeit"], ["power", "Leistung"], ["energy", "Energie"], ["voltage", "Spannung"],
          ["current", "Strom"], ["frequency", "Frequenz"], ["pressure", "Druck"], ["distance", "Entfernung"],
          ["illuminance", "Beleuchtungsstärke"], ["duration", "Dauer"], ["co2", "CO₂"], ["pm25", "PM2.5"], ["pm10", "PM10"],
        ], deviceClass)}</select></div>
        <div><label>State Class</label><select id="editStateClass">${this._options([
          ["__auto__", `Automatisch (${point.state_class || "keine"})`], ["__none__", "Keine"],
          ["measurement", "measurement"], ["total", "total"], ["total_increasing", "total_increasing"],
        ], stateClass)}</select></div>
        <div><label>Aktualisierungsmodus</label><select id="editUpdateMode">${this._options([
          ["disabled", "Deaktiviert / keine Aktualisierung"], ["subscribe", "🔵 Push / Subscribe"], ["polling", "🟢 Polling"],
        ], updateMode)}</select></div>
      </div>
      <div class=${`transport-comparison ${point.effective_update_reason || point.effective_update_error ? "mismatch" : ""}`}>
        <div><small>Gewünscht</small><strong>${this._desiredTransport(point)}</strong></div>
        <span aria-hidden="true">→</span>
        <div><small>Tatsächlich aktiv</small><strong>${this._effectiveTransport(point)}</strong></div>
        ${this._transportReason(point) ? html`<p>${this._transportReason(point)}</p>` : nothing}
      </div>
      ${multistate ? html`
        <h3 style="margin-top:14px;">Darstellung in Home Assistant</h3>
        <div class="muted" style="margin-bottom:8px;">Als Schalter wird nur der konfigurierte AUS- bzw. EIN-Wert geschrieben.</div>
        <div class="edit-grid">
          <div><label>Entitätstyp</label><select id="editMultistateRepresentation">
            <option value="number" ?selected=${representation === "number"}>Zahlenwert</option>
            <option value="switch" ?selected=${representation === "switch"}>Schalter</option>
          </select></div>
          <div id="multistateSwitchValues" class="edit-grid" style=${`display:${representation === "switch" ? "contents" : "none"}`}>
            <div><label>AUS-Wert</label><input id="editMultistateOffValue" type="number" step="any" .value=${String(point.multistate_off_value ?? 1)}></div>
            <div><label>EIN-Wert</label><input id="editMultistateOnValue" type="number" step="any" .value=${String(point.multistate_on_value ?? 2)}></div>
          </div>
        </div>
      ` : nothing}
      ${(analog || multistate) ? html`
        <h3 style="margin-top:14px;">Stellbereich</h3>
        <div class="edit-grid">
          <div><label>Mindestwert</label><input id="editNumberMin" type="number" step="any" .value=${String(point.number_min ?? -1000000)}></div>
          <div><label>Höchstwert</label><input id="editNumberMax" type="number" step="any" .value=${String(point.number_max ?? 1000000)}></div>
          <div><label>Schrittweite</label><input id="editNumberStep" type="number" min="0.000001" step="any" .value=${String(point.number_step ?? 0.01)}></div>
          <div><label>BACnet-Priorität</label><input id="editWritePriority" type="number" min="1" max="16" .value=${String(point.write_priority ?? 8)}></div>
        </div>
        <h3 style="margin-top:14px;">Schreibprofil</h3>
        <div class="edit-grid">
          <div><label>Profil</label><select id="editWriteProfile">
            <option value="direct" ?selected=${writeProfile === "direct"}>Direkt schreiben</option>
            ${analog ? html`<option value="glt_set_as" ?selected=${writeProfile === "glt_set_as"}>GLT → Wert setzen → AS</option>` : nothing}
            ${multistate ? html`<option value="glt_set_stage" ?selected=${writeProfile === "glt_set_stage"}>GLT → Stufe setzen</option>` : nothing}
          </select></div>
          <div><label>Wartezeit nach GLT aktivieren (ms)</label><input id="editGltDelayMs" type="number" min="0" max="60000" .value=${String(point.glt_delay_ms ?? (multistate ? 2000 : 1200))}></div>
          ${analog ? html`
            <div><label>Wartezeit nach Wert schreiben (ms)</label><input id="editAsDelayMs" type="number" min="0" max="60000" .value=${String(point.as_delay_ms ?? 1200)}></div>
            <div><label>Wartezeit vor Freigabe (ms)</label><input id="editReleaseDelayMs" type="number" min="0" max="60000" .value=${String(point.release_delay_ms ?? 200)}></div>
            <div><label>Priorität 8 anschließend freigeben</label><div class="check"><input id="editReleasePriority" type="checkbox" .checked=${point.release_priority !== false}> analogValue und binaryValue freigeben</div></div>
          ` : nothing}
        </div>
      ` : nothing}
    `;
  }

  private _virtualConfiguration(point: Record<string, any>) {
    const virtual = point.virtual_binary || {};
    const assistant = point.object_assistant?.kind === "virtual_binary" ? point.object_assistant : null;
    const deviceClasses: Option[] = [
      ["", "Keine"], ["battery", "Batterie"], ["connectivity", "Verbindung"], ["door", "Tür"], ["garage_door", "Garagentor"],
      ["gas", "Gas"], ["heat", "Hitze"], ["light", "Licht"], ["lock", "Schloss"], ["moisture", "Feuchtigkeit"],
      ["motion", "Bewegung"], ["occupancy", "Belegung"], ["opening", "Öffnung"], ["plug", "Steckdose / Plug"],
      ["power", "Strom"], ["presence", "Anwesenheit"], ["problem", "Problem"], ["running", "Läuft"],
      ["safety", "Sicherheit"], ["smoke", "Rauch"], ["sound", "Geräusch"], ["tamper", "Manipulation"],
      ["vibration", "Vibration"], ["window", "Fenster"],
    ];
    return html`
      <div class="muted" style="margin-bottom:8px;">Erzeugt zusätzlich eine Binary-Sensor-Entität aus diesem Rohwert.</div>
      <div class="rule-help"><strong>Regel-Hilfe:</strong> <code>2</code>, <code>&gt;2</code>, <code>1,2,5</code>, <code>2-5</code>, <code>active</code> oder <code>value &gt; 10 &amp;&amp; value &lt; 20</code></div>
      ${assistant ? html`
        <div class="assistant-card">
          <div class="assistant-title">Objekt-Assistent: ${assistant.title || "Vorschlag"}</div>
          <div class="muted">${assistant.reason || ""}</div>
          <div class="assistant-grid">
            <span>Name</span><strong>${assistant.name || "-"}</strong>
            <span>Device Class</span><strong>${assistant.device_class || "-"}</strong>
            <span>EIN wenn</span><code>${assistant.on_value || ""}</code>
            <span>AUS wenn</span><code>${assistant.off_value || ""}</code>
          </div>
          <button id="applyObjectAssistant" class="secondary">Vorschlag übernehmen</button>
        </div>
      ` : nothing}
      <div class="edit-grid">
        <div><label>Virtuellen Binary Sensor erzeugen</label><div class="check"><input id="virtualBinaryEnabled" type="checkbox" .checked=${!!point.virtual_binary}> aktiv</div></div>
        <div><label>Name</label><input id="virtualBinaryName" .value=${virtual.name || ""}></div>
        <div><label>Unique ID</label><input id="virtualBinaryUniqueId" .value=${virtual.unique_id || `${point.unique_id}_binary`}></div>
        <div><label>Device Class</label><select id="virtualBinaryDeviceClass">${this._options(deviceClasses, virtual.device_class || "plug")}</select></div>
        <div><label>EIN wenn</label><input id="virtualBinaryOnValue" .value=${String(virtual.on_value ?? "2")}></div>
        <div><label>AUS wenn</label><input id="virtualBinaryOffValue" .value=${String(virtual.off_value ?? "1")}></div>
        <div><label>Sonst</label><select id="virtualBinaryElseState">
          ${this._options([["unavailable", "unavailable"], ["off", "off"], ["unknown", "unknown"]], virtual.else_state || "unavailable")}
        </select></div>
      </div>
      <div id="virtualRulePreview" class="rule-preview">
        <div><span class="muted">Aktueller BACnet-Wert</span><strong>${this.model.preview.sourceValue}</strong></div>
        <div><span class="muted">Regelergebnis</span><strong class=${`rule-result ${this.model.preview.tone}`}>${this.model.preview.result}</strong></div>
      </div>
    `;
  }

  private _inspector() {
    const point = this.model.selected;
    if (!point) return html`<div class="side-section-head"><h2>Point Inspector</h2><div class="muted">Wähle links ein Objekt aus.</div></div>`;
    const inspector = this.model.inspector || {};
    const values: Array<[string, unknown]> = [
      ["Objekt", point.object_key], ["Name", point.object_name || "-"], ["HA Entity ID", point.entity_id || "-"],
      ["HA Entity Name", point.entity_name || point.entity_original_name || "-"], ["Device", point.device_id],
      ["Present Value", this._value(point.present_value)], ["BACnet Unit", point.bacnet_unit || "-"], ["HA Unit", point.ha_unit || "-"],
      ["Device Class", point.device_class || "-"], ["State Class", point.state_class || "-"], ["Override", point.override_active ? "Ja" : "Nein"],
      ["Modus", point.update_mode === "subscribe" ? "Push / Subscribe" : point.update_mode === "polling" ? "Polling" : "Deaktiviert"],
      ["Subscribed", point.subscribed == null ? "-" : point.subscribed ? "Ja" : "Nein"], ["Aktives Polling", point.fallback_polling ? "Ja" : "Nein"],
      ["Schreibbar", point.writable ? "Ja" : "Nein"], ["Aktiv", point.enabled ? "Ja" : "Nein"], ["Letztes Update", point.last_update || "-"],
      ["Quelle", point.last_update_source || "-"], ["Reliability", inspector.reliability || "-"], ["Status Flags", inspector.status_flags || "-"],
      ["COV Increment", inspector.cov_increment || "-"], ["Push Updates", point.push_updates ?? inspector.push_updates ?? "-"],
      ["Polling Updates", point.polling_updates ?? inspector.polling_updates ?? "-"], ["Value Changes", point.value_changes ?? inspector.value_changes ?? "-"],
    ];
    const raw = inspector.raw || inspector;
    const engineering = Object.entries(raw);
    return html`
      <div class="point-inspector-head">
        <div><h2>${point.object_key}</h2><div class="muted">${point.object_name || "-"}</div></div>
        <div class="inspector-head-actions">
          <button id="saveOverride" ?disabled=${this.model.saving}>Speichern${this.model.saving ? " …" : ""}</button>
          <button id="discardEditor" class="secondary" ?disabled=${!this.model.dirty || this.model.saving}>Änderungen verwerfen</button>
          <button id="resetOverride" class="secondary" ?disabled=${this.model.saving}>Override zurücksetzen</button>
        </div>
      </div>
      <div id="editorDirtyBanner" class="dirty-banner" ?hidden=${!this.model.dirty}><strong>Ungespeicherte Änderungen</strong> – bitte speichern oder verwerfen.</div>
      <div id="editorValidation" class="validation-errors" ?hidden=${!this.model.errors.length}>${this.model.errors.map((error) => html`<div>${error}</div>`)}</div>
      <div id="priorityWarning" class="priority-warning" ?hidden=${!(Number(point.write_priority) >= 1 && Number(point.write_priority) <= 7)}>
        <strong>Achtung:</strong> Eine BACnet-Priorität zwischen 1 und 7 übersteuert den üblichen Bedienwert auf Priorität 8.
      </div>
      ${this._section("config", "Konfiguration der Entität", this._configuration(point))}
      ${this._section("virtual-config", "Virtuelle Entität konfigurieren", this._virtualConfiguration(point))}
    `;
  }

  private _technicalInspector() {
    const point = this.model.selected;
    if (!point) return html`<div class="side-section-head"><h2>Inspector</h2><div class="muted">Wähle links ein Objekt aus.</div></div>`;
    const inspector = this.model.inspector || {};
    const values: Array<[string, unknown]> = [
      ["Objekt", point.object_key], ["Name", point.object_name || "-"], ["HA Entity ID", point.entity_id || "-"],
      ["HA Entity Name", point.entity_name || point.entity_original_name || "-"], ["Device", point.device_id],
      ["Present Value", this._value(point.present_value)], ["BACnet Unit", point.bacnet_unit || "-"], ["HA Unit", point.ha_unit || "-"],
      ["Device Class", point.device_class || "-"], ["State Class", point.state_class || "-"], ["Override", point.override_active ? "Ja" : "Nein"],
      ["Modus", point.update_mode === "subscribe" ? "Push / Subscribe" : point.update_mode === "polling" ? "Polling" : "Deaktiviert"],
      ["Subscribed", point.subscribed == null ? "-" : point.subscribed ? "Ja" : "Nein"], ["Aktives Polling", point.fallback_polling ? "Ja" : "Nein"],
      ["Schreibbar", point.writable ? "Ja" : "Nein"], ["Aktiv", point.enabled ? "Ja" : "Nein"], ["Letztes Update", point.last_update || "-"],
      ["Quelle", point.last_update_source || "-"], ["Reliability", inspector.reliability || "-"], ["Status Flags", inspector.status_flags || "-"],
      ["COV Increment", inspector.cov_increment || "-"], ["Push Updates", point.push_updates ?? inspector.push_updates ?? "-"],
      ["Polling Updates", point.polling_updates ?? inspector.polling_updates ?? "-"], ["Value Changes", point.value_changes ?? inspector.value_changes ?? "-"],
    ];
    return html`
      <div class="side-section-head"><h2>Inspector</h2><div class="muted">${point.object_key || ""}</div></div>
      ${values.map(([key, value]) => html`<div class="kv"><div class="k">${key}</div><div class="v">${this._value(value)}</div></div>`)}
    `;
  }

  private _engineeringProperties() {
    const point = this.model.selected;
    if (!point) return html`<div class="side-section-head"><h2>Engineering-Properties</h2><div class="muted">Wähle links ein Objekt aus.</div></div>`;
    const inspector = this.model.inspector || {};
    const rows = Object.entries(inspector.raw || inspector);
    return html`
      <div class="side-section-head"><h2>Engineering-Properties</h2><div class="muted">${point.object_key || ""}</div></div>
      ${rows.length
        ? rows.map(([key, value]) => html`<div class="kv"><div class="k">${key}</div><div class="v"><code>${this._value(value)}</code></div></div>`)
        : html`<div class="muted">Keine zusätzlichen Engineering-Daten vorhanden.</div>`}
    `;
  }

  protected render() {
    const content = this.model.sideTab === "virtual"
      ? this._virtualOverview()
      : this.model.sideTab === "technical"
        ? this._technicalInspector()
        : this.model.sideTab === "engineering"
          ? this._engineeringProperties()
          : this._inspector();
    return html`${this._tabs()}<div class="side-body">${content}</div>`;
  }

  protected updated(): void {
    this.dispatchEvent(new CustomEvent("bepacom-inspector-rendered", {
      bubbles: true,
      composed: true,
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bepacom-point-inspector": BepacomPointInspector;
  }
}
