import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

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
    `;
  }

  static styles = css`
    :host {
      box-sizing: border-box;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 9px;
      margin-bottom: 10px;
      padding: 10px;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 13px;
      background: rgba(72,70,67,.7);
      box-shadow: 0 12px 34px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.035);
      backdrop-filter:blur(22px);
      font-family:Inter,"SF Pro Display","Segoe UI Variable","Segoe UI",sans-serif;
    }

    .nav {
      align-self: stretch;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px 4px 4px;
      border-right: 1px solid var(--divider-color);
    }

    button {
      min-height: 32px;
      padding: 7px 12px;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 999px;
      background: rgba(255,255,255,.055);
      color: var(--primary-text-color);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 650;
    }

    .tab.active {
      color:#fff;
      border-color: rgba(255,255,255,.3);
      background: rgba(255,255,255,.095);
    }

    .field {
      flex: 0 1 145px;
      min-width: 112px;
      padding: 4px 6px;
    }

    .field.search {
      flex: 1 1 280px;
      min-width: 220px;
    }

    label {
      display: block;
      margin-bottom: 4px;
      color: #aaa398;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    input,
    select {
      box-sizing: border-box;
      width: 100%;
      min-height: 32px;
      padding: 7px 9px;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 9px;
      background: rgba(30,29,28,.28);
      color: var(--primary-text-color);
      font: inherit;
      font-size: 12px;
    }

    select {
      color-scheme: dark;
      accent-color: #d88c39;
    }

    select option,
    select optgroup {
      color: #f3f0ea;
      background: #45433f;
    }

    select option:checked {
      color: #fff7ec;
      background: #7a5732;
    }

    .search input {
      border-color: rgba(255,255,255,.1);
      background: rgba(30,29,28,.32);
    }

    .check {
      align-self: center;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 32px;
      margin: 17px 4px 0;
      color: var(--primary-text-color);
      font-size: 12px;
      text-transform: none;
    }

    .check input {
      width: auto;
      min-height: 0;
    }

    .reset {
      margin: 17px 4px 0;
    }

    @media (max-width: 1100px) {
      .nav {
        flex: 1 0 100%;
        padding: 2px 2px 8px;
        border-right: 0;
        border-bottom: 1px solid var(--divider-color);
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bepacom-explorer-toolbar": BepacomExplorerToolbar;
  }
}
