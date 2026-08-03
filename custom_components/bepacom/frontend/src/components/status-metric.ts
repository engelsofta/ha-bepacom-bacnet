import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("bepacom-status-metric")
export class BepacomStatusMetric extends LitElement {
  @property()
  public label = "";

  @property()
  public value = "-";

  @property()
  public icon = "ℹ️";

  @property({ reflect: true })
  public tone = "";

  protected render() {
    return html`
      <span class="icon" aria-hidden="true">${this.icon}</span>
      <span class="text">
        <strong title=${this.value}>${this.value}</strong>
        <small title=${this.label}>${this.label}</small>
      </span>
    `;
  }

  static styles = css`
    :host {
      box-sizing: border-box;
      position: relative;
      display: flex;
      align-items: center;
      min-width: 0;
      min-height: 72px;
      padding: 12px 14px;
      border: 1px solid rgba(255,255,255,.065);
      border-radius: 10px;
      background: rgba(255,255,255,.035);
      color: var(--primary-text-color);
      font-family: Inter, "SF Pro Display", "Segoe UI Variable", "Segoe UI", sans-serif;
      overflow: hidden;
    }

    :host([tone="stat-ok"]) {
      border-color: color-mix(
        in srgb,
        var(--success-color, #43a047) 45%,
        var(--divider-color)
      );
      background: color-mix(
        in srgb,
        var(--success-color, #43a047) 10%,
        var(--secondary-background-color)
      );
    }

    :host([tone="stat-warn"]) {
      border-color: color-mix(
        in srgb,
        var(--warning-color, #ffa600) 55%,
        var(--divider-color)
      );
      background: color-mix(
        in srgb,
        var(--warning-color, #ffa600) 12%,
        var(--secondary-background-color)
      );
    }

    :host([tone="stat-bad"]) {
      border-color: color-mix(
        in srgb,
        var(--error-color, #db4437) 55%,
        var(--divider-color)
      );
      background: color-mix(
        in srgb,
        var(--error-color, #db4437) 12%,
        var(--secondary-background-color)
      );
    }

    :host([tone="stat-muted"]) {
      opacity: 0.78;
    }

    .icon {
      position:absolute;
      top:10px;
      right:11px;
      display:flex;
      align-items:center;
      justify-content:center;
      width:25px;
      height:25px;
      border-radius:7px;
      background:rgba(255,255,255,.055);
      opacity:.72;
      text-align: center;
      font-size: 12px;
    }

    .text {
      display: flex;
      flex-direction: column-reverse;
      min-width: 0;
      width:100%;
    }

    strong,
    small {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      color:#f7f4ee;
      padding-right:30px;
      font-size: 22px;
      line-height: 1.05;
      letter-spacing:-.04em;
    }

    small {
      margin-bottom: 5px;
      color: #aaa398;
      font-size: 10px;
      font-weight:700;
      line-height: 1.15;
      letter-spacing:.045em;
      text-transform:uppercase;
    }

    :host-context(.theme-light) {
      border-color: rgba(62,52,39,.1);
      background: rgba(255,255,255,.72);
      color: #29251f;
    }

    :host-context(.theme-light) .icon {
      background: rgba(62,52,39,.055);
    }

    :host-context(.theme-light) strong { color:#29251f; }
    :host-context(.theme-light) small { color:#797268; }

    :host-context(.theme-light):host([tone="stat-ok"]) {
      background: color-mix(in srgb, var(--success-color, #64815c) 9%, #fffdfa);
    }

    :host-context(.theme-light):host([tone="stat-warn"]),
    :host-context(.theme-light):host([tone="stat-bad"]) {
      background: color-mix(in srgb, var(--error-color, #b9564d) 8%, #fffdfa);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bepacom-status-metric": BepacomStatusMetric;
  }
}
