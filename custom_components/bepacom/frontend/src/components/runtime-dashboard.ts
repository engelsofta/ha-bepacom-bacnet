import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

interface StatusCard {
  label: string;
  value: unknown;
  icon: string;
  tone: string;
}

interface LiveChange {
  ts?: string;
  unique_id: string;
  device_id?: string | number;
  object_type?: string;
  object_id?: string | number;
  object_key?: string;
  object_name?: string;
  previous_value?: unknown;
  value?: unknown;
  source?: string;
  friendly_name?: string;
  entity_id?: string;
  resolved_unique_id?: string;
}

interface DiagnosticPipeline {
  messages: unknown;
  inspected: unknown;
  filtered: unknown;
  updates: unknown;
  changes: unknown;
  filterRate: string;
}

export interface RuntimeDashboardModel {
  open: boolean;
  tab: "configuration" | "developer" | "live";
  summary: string;
  configured: StatusCard[];
  runtime: StatusCard[];
  developer: StatusCard[];
  pipeline: DiagnosticPipeline;
  liveChanges: LiveChange[];
  livePaused: boolean;
  liveFilters: {
    search: string;
    source: string;
    object_type: string;
  };
}

const EMPTY_MODEL: RuntimeDashboardModel = {
  open: false,
  tab: "live",
  summary: "",
  configured: [],
  runtime: [],
  developer: [],
  pipeline: { messages: "-", inspected: "-", filtered: "-", updates: "-", changes: "-", filterRate: "-" },
  liveChanges: [],
  livePaused: false,
  liveFilters: { search: "", source: "all", object_type: "all" },
};

@customElement("bepacom-runtime-dashboard")
export class BepacomRuntimeDashboard extends LitElement {
  @property({ attribute: false })
  public model: RuntimeDashboardModel = EMPTY_MODEL;

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private _action(action: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(
      new CustomEvent("bepacom-dashboard-action", {
        detail: { action, ...detail },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _cards(cards: StatusCard[]) {
    return cards.map(
      (card) => html`
        <bepacom-status-metric
          .label=${card.label}
          .value=${String(card.value ?? "-")}
          .icon=${card.icon}
          .tone=${card.tone}
        ></bepacom-status-metric>
      `,
    );
  }

  private _headlineCards() {
    const byLabel = (cards: StatusCard[], label: string) =>
      cards.find((card) => card.label === label);
    const cards = [
      byLabel(this.model.configured, "BACnet-Punkte"),
      byLabel(this.model.configured, "Aktive Entitäten"),
      byLabel(this.model.runtime, "Verbunden"),
      byLabel(this.model.runtime, "Verbindungsfehler"),
    ].filter((card): card is StatusCard => Boolean(card));
    return cards.map((card) => html`
      <div class=${`dashboard-headline-card ${card.tone || ""}`}>
        <span class="dashboard-headline-icon" aria-hidden="true">${card.icon}</span>
        <span>
          <small>${card.label}</small>
          <strong>${String(card.value ?? "-")}</strong>
        </span>
      </div>
    `);
  }

  private _navigation() {
    const item = (
      tab: RuntimeDashboardModel["tab"],
      icon: string,
      label: string,
      suffix: unknown = "",
    ) => html`
      <button
        class=${`dashboard-nav-item ${this.model.tab === tab ? "active" : ""}`}
        @click=${() => this._action("tab", { value: tab })}
      >
        <span class="dashboard-nav-icon" aria-hidden="true">${icon}</span>
        <span>${label}</span>
        ${suffix}
      </button>
    `;
    return html`
      <nav class="dashboard-nav" aria-label="Statusbereiche">
        ${item("configuration", "▦", "Konfiguration")}
        ${item("live", "▤", "Live-Log", html`<span class=${`live-dot ${this.model.livePaused ? "paused" : ""}`}></span>`)}
        ${item("developer", "◇", "Push-Diagnose")}
      </nav>
    `;
  }

  private _normalize(value: unknown): string {
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .trim();
  }

  private _matches(haystack: string, query: string): boolean {
    const terms = this._normalize(query).split(/\s+/).filter(Boolean);
    const normalized = this._normalize(haystack);
    return terms.every((term) => {
      if (!term.includes("*") && !term.includes("?")) return normalized.includes(term);
      const escaped = term.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      return new RegExp(escaped.replace(/\*/g, ".*").replace(/\?/g, "."), "i").test(normalized);
    });
  }

  private _filteredChanges(): LiveChange[] {
    const { liveChanges, liveFilters } = this.model;
    return liveChanges.filter((item) => {
      if (liveFilters.source !== "all" && String(item.source) !== liveFilters.source) return false;
      if (liveFilters.object_type !== "all" && String(item.object_type) !== liveFilters.object_type) return false;
      if (!liveFilters.search.trim()) return true;
      return this._matches(
        [
          item.device_id,
          item.object_type,
          item.object_id,
          item.object_key,
          item.object_name,
          item.unique_id,
          item.entity_id,
          item.previous_value,
          item.value,
          item.source,
        ].join(" "),
        liveFilters.search,
      );
    });
  }

  private _formatTime(value?: string): string {
    if (!value) return "-";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  private _displayValue(value: unknown): string {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  private _liveMonitor() {
    const filtered = this._filteredChanges();
    const bins = Array.from({ length: 60 }, () => 0);
    const now = Date.now();
    for (const item of this.model.liveChanges) {
      const age = Math.floor((now - Date.parse(item.ts || "")) / 1000);
      if (age >= 0 && age < 60) bins[59 - age] += 1;
    }
    const peak = Math.max(0, ...bins);
    const lastMinute = bins.reduce((sum, count) => sum + count, 0);
    const average = (lastMinute / 60).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sources = [...new Set(this.model.liveChanges.map((item) => String(item.source || "unknown")))].sort();
    const types = [...new Set(this.model.liveChanges.map((item) => String(item.object_type || "unknown")))].sort();

    return html`
      <div class="live-monitor">
        <div class="live-summary">
          <span><b>${this.model.liveChanges.length.toLocaleString("de-DE")}</b> gespeichert</span>
          <span><b>${filtered.length.toLocaleString("de-DE")}</b> im Filter</span>
          <span><b>${average}/s</b> letzte Minute</span>
          <span><b>${peak}/s</b> Spitze</span>
          <button class="secondary live-small-btn" @click=${() => this._action("toggle-live")}>
            ${this.model.livePaused ? "Fortsetzen" : "Pausieren"}
          </button>
        </div>
        <div class="live-chart" aria-label="Änderungen der letzten 60 Sekunden">
          ${bins.map((count) => {
            const height = peak ? Math.max(3, Math.round((count / peak) * 50)) : 3;
            return html`<i style=${`height:${height}px`} title=${`${count} Änderung${count === 1 ? "" : "en"}`}></i>`;
          })}
        </div>
        <div class="live-filters">
          <input
            .value=${this.model.liveFilters.search}
            placeholder="Filter / Wildcards …"
            @input=${(event: InputEvent) =>
              this._action("live-filter", {
                key: "search",
                value: (event.currentTarget as HTMLInputElement).value,
              })}
          >
          <select
            .value=${this.model.liveFilters.source}
            @change=${(event: Event) =>
              this._action("live-filter", {
                key: "source",
                value: (event.currentTarget as HTMLSelectElement).value,
              })}
          >
            <option value="all">Alle Quellen</option>
            ${sources.map((source) => html`<option value=${source}>${source}</option>`)}
          </select>
          <select
            .value=${this.model.liveFilters.object_type}
            @change=${(event: Event) =>
              this._action("live-filter", {
                key: "object_type",
                value: (event.currentTarget as HTMLSelectElement).value,
              })}
          >
            <option value="all">Alle Typen</option>
            ${types.map((type) => html`<option value=${type}>${type}</option>`)}
          </select>
          <button class="secondary live-small-btn" title="Monitorverlauf leeren" @click=${() => this._action("clear-live")}>
            Leeren
          </button>
        </div>
        <div class="live-table-wrap">
          <table class="live-table">
            <thead><tr><th>Zeit</th><th>Punkt</th><th>Alt → Neu</th><th>Quelle</th></tr></thead>
            <tbody>
              ${filtered.length
                ? filtered.slice(-120).reverse().map(
                    (item) => html`
                      <tr
                        title=${`${item.device_id}/${item.object_type}:${item.object_id} · Im Point Inspector öffnen`}
                        @click=${() => this._action("select-point", { uniqueId: item.resolved_unique_id || item.unique_id })}
                      >
                        <td>${this._formatTime(item.ts)}</td>
                        <td><b>${item.friendly_name || item.object_name || item.object_key || item.unique_id}</b><small>${item.entity_id || item.object_key || item.unique_id}</small></td>
                        <td class="live-value">${this._displayValue(item.previous_value)}<span>→</span>${this._displayValue(item.value)}</td>
                        <td><span class="live-source">${item.source || "-"}</span></td>
                      </tr>
                    `,
                  )
                : html`<tr><td colspan="4" class="muted">Noch keine passenden Wertänderungen.</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="live-foot">Ringpuffer: maximal 10.000 Änderungen · angezeigt werden die neuesten 120 Treffer</div>
      </div>
    `;
  }

  private _diagnosticPipeline() {
    const pipeline = this.model.pipeline;
    const step = (label: string, value: unknown, hint: string, icon: string, tone = "") => html`
      <div class=${`diagnostic-flow-step ${tone}`}>
        <div class="diagnostic-flow-head"><small>${label}</small><b aria-hidden="true">${icon}</b></div>
        <strong>${String(value ?? "-")}</strong><span>${hint}</span>
      </div>`;
    return html`
      <div class="diagnostic-flow" aria-label="Verarbeitungskette">
        ${step("Nachrichten", pipeline.messages, "vom WebSocket", "\u21af", "incoming")}<i aria-hidden="true"></i>
        ${step("Objekte gepr\u00fcft", pipeline.inspected, "im Payload", "\u25ce", "inspected")}<i aria-hidden="true"></i>
        ${step("Gefiltert", pipeline.filtered, `${pipeline.filterRate} unver\u00e4ndert`, "\u25c7", "filtered")}<i aria-hidden="true"></i>
        ${step("Updates", pipeline.updates, "an die Integration", "\u21e2", "updates")}<i aria-hidden="true"></i>
        ${step("\u00c4nderungen", pipeline.changes, "tats\u00e4chlich ge\u00e4ndert", "\u2713", "changed")}
      </div>`;
  }

  protected render() {
    const model = this.model || EMPTY_MODEL;
    return html`
      <section class="dashboard-shell">
        <div class="dashboard-page-heading">
          <span class="dashboard-toggle-title">${model.tab === "live" ? "Live-Ansicht" : "Diagnose"}</span>
          <span class="dashboard-summary">${model.summary}</span>
        </div>
        <div class=${`dashboard-content dashboard-content-${model.tab}`}>
          ${model.tab === "live"
            ? html`
                <section class="dashboard-group dashboard-group-wide dashboard-monitor-group">
                  ${this._liveMonitor()}
                </section>
              `
            : html`
                <div class="dashboard-diagnostics-grid">
                  <section class="dashboard-group dashboard-group-wide dashboard-monitor-group diagnostic-processing-group">
                    <div class="dashboard-title">Datenverarbeitung</div>
                    ${this._diagnosticPipeline()}
                  </section>
                </div>
              `}
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bepacom-runtime-dashboard": BepacomRuntimeDashboard;
  }
}
