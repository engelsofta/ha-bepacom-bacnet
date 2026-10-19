import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export interface ExplorerToolbarFilters {
  search: string;
  device_id: string;
  object_type: string;
  runtime: string;
  only_overrides: boolean;
  only_subscribe: boolean;
}

@customElement("bepacom-explorer-toolbar")
export class BepacomExplorerToolbar extends LitElement {
  @property() public activeView = "explorer";
  @property({ type: Number }) public virtualCount = 0;
  @property({ attribute: false }) public filters: ExplorerToolbarFilters = {
    search: "",
    device_id: "all",
    object_type: "all",
    runtime: "all",
    only_overrides: false,
    only_subscribe: false,
  };
  @property({ attribute: false }) public devices: string[] = [];
  @property({ attribute: false }) public objectTypes: string[] = [];
  @property() public groupBy = "type";
  @property() public language = "en";
  @state() private _filtersExpanded = false;

  private _emit(action: string, key?: string, value?: unknown): void {
    this.dispatchEvent(
      new CustomEvent("bepacom-toolbar-action", {
        bubbles: true,
        composed: true,
        detail: { action, key, value },
      }),
    );
  }

  protected render() {
    const activeFilters = Number(this.filters.device_id !== "all")
      + Number(this.filters.object_type !== "all") + Number(this.filters.runtime !== "all")
      + Number(this.filters.only_overrides) + Number(this.filters.only_subscribe);
    return html`
      <div class="nav">
        <button
          class=${this.activeView === "explorer" ? "tab active" : "tab"}
          @click=${() => this._emit("view", "activeView", "explorer")}
        >Explorer</button>
        <button
          class=${this.activeView === "virtual" ? "tab active" : "tab"}
          @click=${() => this._emit("view", "activeView", "virtual")}
        >Virtuelle Entitäten${this.virtualCount ? ` (${this.virtualCount})` : ""}</button>
      </div>

      <div class="field search">
        <label for="search">Suche BACnet-Objekte</label>
        <input
          id="search"
          .value=${this.filters.search || ""}
          placeholder="820*, Rollo, multiStateInput 82*"
          @input=${(event: Event) =>
            this._emit("filter", "search", (event.target as HTMLInputElement).value)}
        >
      </div>

      <button class="filters-toggle" aria-controls="filterOptions" aria-expanded=${String(this._filtersExpanded)}
        @click=${() => { this._filtersExpanded = !this._filtersExpanded; this._emit("layout"); }}>
        <span>${this.language === "de" ? "Filter" : "Filters"}${activeFilters ? ` (${activeFilters})` : ""}</span> <span aria-hidden="true">${this._filtersExpanded ? "−" : "+"}</span>
      </button>
      <div id="filterOptions" class=${`filter-options ${this._filtersExpanded ? "expanded" : ""}`}>
      <div class="field">
        <label for="device">Device</label>
        <select
          id="device"
          .value=${this.filters.device_id || "all"}
          @change=${(event: Event) =>
            this._emit("filter", "device_id", (event.target as HTMLSelectElement).value)}
        >
          <option value="all">Alle Devices</option>
          ${this.devices.map((device) => html`<option value=${device}>Device ${device}</option>`)}
        </select>
      </div>

      <div class="field">
        <label for="type">Objekttyp</label>
        <select
          id="type"
          .value=${this.filters.object_type || "all"}
          @change=${(event: Event) =>
            this._emit("filter", "object_type", (event.target as HTMLSelectElement).value)}
        >
          <option value="all">Alle Objekttypen</option>
          ${this.objectTypes.map((type) => html`<option value=${type}>${type}</option>`)}
        </select>
      </div>

      <div class="field">
        <label for="runtime">Status / Transport</label>
        <select
          id="runtime"
          .value=${this.filters.runtime || "all"}
          @change=${(event: Event) =>
            this._emit("runtime", "runtime", (event.target as HTMLSelectElement).value)}
        >
          <option value="all">Alle</option>
          <option value="enabled">Aktiv</option>
          <option value="disabled">Deaktiviert</option>
          <option value="subscribe">Push / Subscribe</option>
          <option value="polling">Polling</option>
          <option value="fallback">Polling-Fallback</option>
        </select>
      </div>

      <div class="field">
        <label for="group">Gruppierung</label>
        <select
          id="group"
          .value=${this.groupBy || "none"}
          @change=${(event: Event) =>
            this._emit("group", "groupBy", (event.target as HTMLSelectElement).value)}
        >
          <option value="none">Keine</option>
          <option value="type">Nach BACnet-Typ</option>
          <option value="device">Nach Device</option>
        </select>
      </div>

      <label class="check">
        <input
          type="checkbox"
          .checked=${Boolean(this.filters.only_overrides)}
          @change=${(event: Event) =>
            this._emit("filter", "only_overrides", (event.target as HTMLInputElement).checked)}
        >
        nur Overrides
      </label>

      <label class="check">
        <input
          type="checkbox"
          .checked=${Boolean(this.filters.only_subscribe)}
          @change=${(event: Event) =>
            this._emit("filter", "only_subscribe", (event.target as HTMLInputElement).checked)}
        >
        <bepacom-runtime-indicator state="push" label="Subscribe"></bepacom-runtime-indicator>
        Subscribe
      </label>

      <button class="reset" @click=${() => this._emit("reset")}>Reset</button>
      </div>
    `;
  }

  static styles = css`
    :host { box-sizing:border-box; display:flex; flex-wrap:wrap; align-items:flex-end; flex:0 0 auto; gap:9px; margin-bottom:12px; padding:12px; border:1px solid var(--es-card-border); border-radius:var(--es-card-radius); background:var(--es-card-background); box-shadow:var(--es-card-shadow); backdrop-filter:var(--es-card-filter); -webkit-backdrop-filter:var(--es-card-filter); color:var(--es-ink); font:inherit; }
    .nav { display:flex; flex:1 0 100%; align-items:center; gap:6px; padding:0 0 10px; border-bottom:1px solid var(--es-line); }
    .filter-options { display:contents; }
    .filters-toggle { display:none; }
    button { min-height:32px; padding:7px 12px; border:1px solid transparent; border-radius:var(--es-control-radius,10px); background:transparent; color:var(--es-muted); font:inherit; font-size:12px; font-weight:450; cursor:pointer; }
    button:hover { color:var(--es-accent); background:var(--es-hover); }
    .tab.active { color:var(--es-accent); border-color:var(--es-line); background:var(--es-active); }
    .field { flex:0 1 124px; min-width:105px; padding:0; }
    .field.search { flex:1 1 240px; min-width:200px; }
    label { display:block; margin-bottom:6px; color:var(--es-muted); font-size:9px; font-weight:450; text-transform:uppercase; letter-spacing:.055em; }
    input,select { box-sizing:border-box; width:100%; min-height:34px; padding:7px 9px; border:1px solid var(--es-line); border-radius:var(--es-control-radius,10px); background:var(--es-field); color:var(--es-ink); font:inherit; font-size:12px; color-scheme:inherit; }
    select option,select optgroup { color:var(--es-ink); background:var(--es-elevated); }
    select option:checked { color:var(--es-ink); background:var(--es-active); }
    input::placeholder { color:var(--es-muted); opacity:.75; }
    input:focus-visible,select:focus-visible,button:focus-visible { outline:2px solid var(--es-accent); outline-offset:3px; }
    .check { display:inline-flex; align-items:center; gap:6px; align-self:flex-end; min-height:34px; margin:0 2px; color:var(--es-muted); font-size:11px; text-transform:none; letter-spacing:0; white-space:nowrap; }
    .check input { width:15px; height:15px; min-height:0; margin:0; accent-color:var(--es-accent); }
    .reset { min-height:34px; margin:0; border-color:var(--es-line); background:var(--es-field); }
    @media(max-width:1100px) { .field { flex:1 1 120px; } .field.search { flex-basis:100%; } }
    @media(max-width:900px) {
      :host { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px 8px; padding:10px; }
      .nav { grid-column:1/-1; width:auto; padding-bottom:9px; }
      .nav button { flex:1; padding-inline:6px; }
      .field { min-width:0; }
      .field.search { grid-column:1/-1; min-width:0; }
      .filters-toggle { display:flex; align-items:center; justify-content:space-between; grid-column:1/-1; min-height:34px; border-color:var(--es-line); background:var(--es-field); }
      .filter-options { display:none; }
      .filter-options.expanded { display:grid; grid-column:1/-1; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px 8px; }
      .check { min-width:0; white-space:normal; font-size:11px; }
      .reset { justify-self:end; padding-inline:16px; }
      input,select { min-height:38px; font-size:12px; }
    }
    @media(prefers-reduced-motion:reduce) { * { transition:none!important; } }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bepacom-explorer-toolbar": BepacomExplorerToolbar;
  }
}
