import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("bepacom-runtime-indicator")
export class BepacomRuntimeIndicator extends LitElement {
  @property()
  public state: "off" | "snapshot" | "push" | "poll" | "wait" = "wait";

  @property()
  public label = "Wartet";

  protected render() {
    return html`<span class=${this.state} role="img" aria-label=${this.label} title=${this.label}></span>`;
  }

  static styles = css`
    :host { display:inline-flex; align-items:center; justify-content:center; }
    span { display:inline-block; width:11px; height:11px; border:1px solid color-mix(in srgb,currentColor 35%,transparent); border-radius:50%; background:var(--secondary-text-color); box-shadow:0 0 0 3px color-mix(in srgb,currentColor 10%,transparent); }
    .off { color:var(--secondary-text-color); opacity:.55; }
    .snapshot,.push { color:#1e88e5; background:currentColor; }
    .poll { color:#43a047; background:currentColor; }
    .wait { color:var(--info-color,#039be5); background:transparent; }
  `;
}

@customElement("bepacom-object-badge")
export class BepacomObjectBadge extends LitElement {
  @property() public kind = "other";
  @property() public label = "?";
  @property() public description = "";

  protected render() {
    return html`<span class=${this.kind} title=${this.description}>${this.label}</span>`;
  }

  static styles = css`
    :host { display:inline-flex; flex:0 0 auto; }
    span { box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border:1px solid var(--divider-color); border-radius:10px; background:var(--secondary-background-color); color:var(--primary-text-color); font-size:11px; font-weight:800; letter-spacing:.2px; }
    .ai,.ao,.av { color:#64b5f6; border-color:color-mix(in srgb,#64b5f6 50%,var(--divider-color)); }
    .bi,.bo,.bv { color:#81c784; border-color:color-mix(in srgb,#81c784 50%,var(--divider-color)); }
    .ms { color:#ffb74d; border-color:color-mix(in srgb,#ffb74d 50%,var(--divider-color)); }
  `;
}

@customElement("bepacom-write-profile-indicator")
export class BepacomWriteProfileIndicator extends LitElement {
  @property({ type: Boolean }) public glt = false;

  protected render() {
    const label = this.glt ? "Über GLT schreiben" : "Direkt schreiben";
    return html`<span class=${this.glt ? "glt" : "direct"} role="img" aria-label=${label} title=${label}></span>`;
  }

  static styles = css`
    :host { display:inline-flex; align-items:center; justify-content:center; }
    span { display:inline-block; width:10px; height:10px; border-radius:50%; border:1px solid color-mix(in srgb,currentColor 45%,transparent); box-shadow:0 0 0 3px color-mix(in srgb,currentColor 10%,transparent); }
    .direct { color:var(--primary-color); background:currentColor; }
    .glt { color:#ab47bc; background:currentColor; }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "bepacom-runtime-indicator": BepacomRuntimeIndicator;
    "bepacom-object-badge": BepacomObjectBadge;
    "bepacom-write-profile-indicator": BepacomWriteProfileIndicator;
  }
}
