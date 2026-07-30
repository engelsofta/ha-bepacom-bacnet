import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

import "./explorer-view";
import "./components/status-metric";
import "./components/indicators";
import "./components/explorer-toolbar";
import "./components/point-table";
import "./components/point-inspector";
import "./components/runtime-dashboard";
import type { BepacomPanelConfig, HomeAssistantLike } from "./types";

@customElement("bepacom-explorer-panel")
export class BepacomExplorerPanel extends LitElement {
  @property({ attribute: false })
  public hass?: HomeAssistantLike;

  @property({ attribute: false })
  public panel?: BepacomPanelConfig;

  @property({ attribute: false })
  public narrow = false;

  @property({ attribute: false })
  public route?: unknown;

  @query("bepacom-explorer-view")
  private _explorer?: HTMLElement & {
    hass?: HomeAssistantLike;
    panel?: BepacomPanelConfig;
  };

  protected render() {
    return html`<bepacom-explorer-view></bepacom-explorer-view>`;
  }

  protected updated(): void {
    if (!this._explorer) return;
    this._explorer.panel = this.panel;
    this._explorer.hass = this.hass;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100vh;
      min-height: 0;
      background: var(--primary-background-color);
      color: var(--primary-text-color);
    }

    bepacom-explorer-view {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bepacom-explorer-panel": BepacomExplorerPanel;
    "bepacom-explorer-view": HTMLElement;
  }
}
