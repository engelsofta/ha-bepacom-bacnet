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
      display: flex;
      align-items: center;
      min-width: 0;
      min-height: 48px;
      gap: 10px;
      padding: 9px 11px;
      border: 0;
      border-radius: 11px;
      background: rgba(255,255,255,.055);
      color: var(--primary-text-color);
      font-family: Inter, "SF Pro Display", "Segoe UI Variable", "Segoe UI", sans-serif;
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
      display:flex;
      align-items:center;
      justify-content:center;
      flex: 0 0 28px;
      width: 28px;
      height:28px;
      border-radius:50%;
      background:rgba(255,255,255,.075);
      text-align: center;
      font-size: 14px;
    }

    .text {
      display: block;
      min-width: 0;
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
      font-size: 15px;
      line-height: 1.15;
      letter-spacing:-.02em;
    }

    small {
      margin-top: 2px;
      color: #aaa398;
      font-size: 11px;
      line-height: 1.2;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bepacom-status-metric": BepacomStatusMetric;
  }
}
