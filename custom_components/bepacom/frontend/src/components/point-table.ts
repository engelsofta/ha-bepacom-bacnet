import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

export type PointTableRow =
  | { kind: "spacer"; height: number }
  | { kind: "group"; key: string; label: string; count: number; open: boolean }
  | {
      kind: "point";
      uniqueId: string;
      selected: boolean;
      checked: boolean;
      changeClass: string;
      objectKind: string;
      objectIcon: string;
      objectType: string;
      objectKey: string;
      deviceId: string;
      entityId: string;
      entityName: string;
      linkedEntities: Array<{
        entityId: string;
        icon: string;
        name: string;
        state: string;
        title: string;
      }>;
      value: string;
      unit: string;
      overrideActive: boolean;
      writeViaGlt: boolean;
      runtimeState: "off" | "snapshot" | "push" | "poll" | "wait";
      runtimeLabel: string;
    };

@customElement("bepacom-point-table")
export class BepacomPointTable extends LitElement {
  @property({ attribute: false }) public rows: PointTableRow[] = [];
  @property() public emptyMessage = "Keine BACnet-Objekte gefunden.";
  @property() public sortKey = "object_key";
  @property() public sortDirection: "asc" | "desc" = "asc";

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private _action(action: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(
      new CustomEvent("bepacom-table-action", {
        detail: { action, ...detail },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _header(key: string, label: string, className = "") {
    const marker = this.sortKey === key ? (this.sortDirection === "asc" ? " ▲" : " ▼") : "";
    return html`
      <th class=${`sortable ${className}`}>
        <button class="sort-btn" @click=${() => this._action("sort", { key })}>${label}${marker}</button>
      </th>
    `;
  }

  private _pointRow(row: Extract<PointTableRow, { kind: "point" }>) {
    return html`
      <tr
        class=${`${row.selected ? "selected" : ""} ${row.changeClass}`}
        data-uid=${row.uniqueId}
        @click=${() => this._action("select-point", { uniqueId: row.uniqueId })}
        @dblclick=${(event: MouseEvent) => {
          if ((event.target as HTMLElement)?.closest("input, select, button")) return;
          this._action("open-details", { uniqueId: row.uniqueId });
        }}
      >
        <td class="select-col">
          <input
            class="row-select"
            type="checkbox"
            .checked=${row.checked}
            @click=${(event: MouseEvent) => {
              event.stopPropagation();
              this._action("select-row", {
                uniqueId: row.uniqueId,
                checked: (event.currentTarget as HTMLInputElement).checked,
              });
            }}
          >
        </td>
        <td data-col="object">
          <div class="object-main">
            <bepacom-object-badge
              .kind=${row.objectKind}
              .label=${row.objectIcon}
              .description=${row.objectType}
            ></bepacom-object-badge>
            <div><div class="name">${row.objectKey}</div><div class="muted">Device ${row.deviceId}</div></div>
          </div>
        </td>
        <td data-col="entity">
          <div class="entity-stack">
            <button
              class="link-cell entity-link"
              @click=${(event: MouseEvent) => {
                event.stopPropagation();
                this._action("more-info", { entityId: row.entityId });
              }}
            >${row.entityName}</button>
            ${row.linkedEntities.length
              ? html`
                  <div class="linked-entities">
                    <span class="virtual-badge" title=${`${row.linkedEntities.length} virtuelle Entität${row.linkedEntities.length === 1 ? "" : "en"}`}>
                      🔗 ${row.linkedEntities.length}
                    </span>
                    ${row.linkedEntities.map(
                      (link) => html`
                        <button
                          class="linked-entity-link"
                          title=${link.title}
                          ?disabled=${!link.entityId}
                          @click=${(event: MouseEvent) => {
                            event.stopPropagation();
                            this._action("more-info", { entityId: link.entityId });
                          }}
                        >↳ <span class="linked-icon">${link.icon}</span> <span class="linked-name">${link.name}</span> <span class="linked-state">${link.state}</span></button>
                      `,
                    )}
                  </div>
                `
              : ""}
          </div>
        </td>
        <td data-col="value">
          <button
            class="link-cell value-link"
            @click=${(event: MouseEvent) => {
              event.stopPropagation();
              this._action("more-info", { entityId: row.entityId });
            }}
          >${row.value}</button>
        </td>
        <td data-col="unit"><div class="unit-stack"><span class="unit-display">${row.unit}</span></div></td>
        <td data-col="override">${row.overrideActive ? html`<span class="pill ok">Override</span>` : html`<span class="pill">Standard</span>`}</td>
        <td data-col="write-profile" class="write-profile-cell">
          <bepacom-write-profile-indicator .glt=${row.writeViaGlt}></bepacom-write-profile-indicator>
        </td>
        <td data-col="status">
          <bepacom-runtime-indicator .state=${row.runtimeState} .label=${row.runtimeLabel}></bepacom-runtime-indicator>
        </td>
      </tr>
    `;
  }

  protected render() {
    if (!this.rows.length) return html`<div class="empty">${this.emptyMessage}</div>`;
    return html`
      <table>
        <colgroup>
          <col class="select-col-col"><col class="object-col-col"><col class="entity-col-col"><col class="value-col-col">
          <col class="unit-col-col"><col class="override-col-col"><col class="write-profile-col-col"><col class="runtime-col-col">
        </colgroup>
        <thead>
          <tr>
            <th class="select-col">
              <input type="checkbox" title="Sichtbare auswählen" @change=${(event: Event) =>
                this._action("select-visible", { checked: (event.currentTarget as HTMLInputElement).checked })}>
            </th>
            ${this._header("object_key", "Objekt", "object-col")}
            ${this._header("entity", "HA Entität")}
            ${this._header("present_value", "Wert")}
            ${this._header("unit", "Einheit")}
            ${this._header("override", "Override")}
            ${this._header("write_profile", "Schreiben", "write-profile-head")}
            ${this._header("runtime", "", "runtime-head")}
          </tr>
        </thead>
        <tbody>
          ${this.rows.map((row) => {
            if (row.kind === "spacer") return html`<tr class="virtual-spacer"><td colspan="8" style=${`height:${row.height}px`}></td></tr>`;
            if (row.kind === "group") {
              return html`
                <tr class="group-row">
                  <td colspan="8">
                    <button class="group-toggle" @click=${() => this._action("toggle-group", { key: row.key })}>
                      ${row.open ? "▾" : "▸"} ${row.label} <span class="muted">(${row.count})</span>
                    </button>
                  </td>
                </tr>
              `;
            }
            return this._pointRow(row);
          })}
        </tbody>
      </table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "bepacom-point-table": BepacomPointTable;
  }
}
