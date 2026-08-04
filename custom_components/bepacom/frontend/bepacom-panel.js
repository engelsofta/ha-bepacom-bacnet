/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$2 = globalThis, e$4 = t$2.ShadowRoot && (void 0 === t$2.ShadyCSS || t$2.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, s$2 = Symbol(), o$4 = /* @__PURE__ */ new WeakMap();
let n$3 = class n {
  constructor(t2, e2, o2) {
    if (this._$cssResult$ = true, o2 !== s$2) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t2, this.t = e2;
  }
  get styleSheet() {
    let t2 = this.o;
    const s2 = this.t;
    if (e$4 && void 0 === t2) {
      const e2 = void 0 !== s2 && 1 === s2.length;
      e2 && (t2 = o$4.get(s2)), void 0 === t2 && ((this.o = t2 = new CSSStyleSheet()).replaceSync(this.cssText), e2 && o$4.set(s2, t2));
    }
    return t2;
  }
  toString() {
    return this.cssText;
  }
};
const r$3 = (t2) => new n$3("string" == typeof t2 ? t2 : t2 + "", void 0, s$2), i$3 = (t2, ...e2) => {
  const o2 = 1 === t2.length ? t2[0] : e2.reduce((e3, s2, o3) => e3 + ((t3) => {
    if (true === t3._$cssResult$) return t3.cssText;
    if ("number" == typeof t3) return t3;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t3 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s2) + t2[o3 + 1], t2[0]);
  return new n$3(o2, t2, s$2);
}, S$1 = (s2, o2) => {
  if (e$4) s2.adoptedStyleSheets = o2.map((t2) => t2 instanceof CSSStyleSheet ? t2 : t2.styleSheet);
  else for (const e2 of o2) {
    const o3 = document.createElement("style"), n3 = t$2.litNonce;
    void 0 !== n3 && o3.setAttribute("nonce", n3), o3.textContent = e2.cssText, s2.appendChild(o3);
  }
}, c$2 = e$4 ? (t2) => t2 : (t2) => t2 instanceof CSSStyleSheet ? ((t3) => {
  let e2 = "";
  for (const s2 of t3.cssRules) e2 += s2.cssText;
  return r$3(e2);
})(t2) : t2;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: i$2, defineProperty: e$3, getOwnPropertyDescriptor: h$1, getOwnPropertyNames: r$2, getOwnPropertySymbols: o$3, getPrototypeOf: n$2 } = Object, a$1 = globalThis, c$1 = a$1.trustedTypes, l$1 = c$1 ? c$1.emptyScript : "", p$1 = a$1.reactiveElementPolyfillSupport, d$1 = (t2, s2) => t2, u$1 = { toAttribute(t2, s2) {
  switch (s2) {
    case Boolean:
      t2 = t2 ? l$1 : null;
      break;
    case Object:
    case Array:
      t2 = null == t2 ? t2 : JSON.stringify(t2);
  }
  return t2;
}, fromAttribute(t2, s2) {
  let i2 = t2;
  switch (s2) {
    case Boolean:
      i2 = null !== t2;
      break;
    case Number:
      i2 = null === t2 ? null : Number(t2);
      break;
    case Object:
    case Array:
      try {
        i2 = JSON.parse(t2);
      } catch (t3) {
        i2 = null;
      }
  }
  return i2;
} }, f$1 = (t2, s2) => !i$2(t2, s2), b$1 = { attribute: true, type: String, converter: u$1, reflect: false, useDefault: false, hasChanged: f$1 };
Symbol.metadata ??= Symbol("metadata"), a$1.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let y$1 = class y extends HTMLElement {
  static addInitializer(t2) {
    this._$Ei(), (this.l ??= []).push(t2);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t2, s2 = b$1) {
    if (s2.state && (s2.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t2) && ((s2 = Object.create(s2)).wrapped = true), this.elementProperties.set(t2, s2), !s2.noAccessor) {
      const i2 = Symbol(), h2 = this.getPropertyDescriptor(t2, i2, s2);
      void 0 !== h2 && e$3(this.prototype, t2, h2);
    }
  }
  static getPropertyDescriptor(t2, s2, i2) {
    const { get: e2, set: r2 } = h$1(this.prototype, t2) ?? { get() {
      return this[s2];
    }, set(t3) {
      this[s2] = t3;
    } };
    return { get: e2, set(s3) {
      const h2 = e2?.call(this);
      r2?.call(this, s3), this.requestUpdate(t2, h2, i2);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t2) {
    return this.elementProperties.get(t2) ?? b$1;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d$1("elementProperties"))) return;
    const t2 = n$2(this);
    t2.finalize(), void 0 !== t2.l && (this.l = [...t2.l]), this.elementProperties = new Map(t2.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d$1("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d$1("properties"))) {
      const t3 = this.properties, s2 = [...r$2(t3), ...o$3(t3)];
      for (const i2 of s2) this.createProperty(i2, t3[i2]);
    }
    const t2 = this[Symbol.metadata];
    if (null !== t2) {
      const s2 = litPropertyMetadata.get(t2);
      if (void 0 !== s2) for (const [t3, i2] of s2) this.elementProperties.set(t3, i2);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t3, s2] of this.elementProperties) {
      const i2 = this._$Eu(t3, s2);
      void 0 !== i2 && this._$Eh.set(i2, t3);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s2) {
    const i2 = [];
    if (Array.isArray(s2)) {
      const e2 = new Set(s2.flat(1 / 0).reverse());
      for (const s3 of e2) i2.unshift(c$2(s3));
    } else void 0 !== s2 && i2.push(c$2(s2));
    return i2;
  }
  static _$Eu(t2, s2) {
    const i2 = s2.attribute;
    return false === i2 ? void 0 : "string" == typeof i2 ? i2 : "string" == typeof t2 ? t2.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t2) => this.enableUpdating = t2), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t2) => t2(this));
  }
  addController(t2) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t2), void 0 !== this.renderRoot && this.isConnected && t2.hostConnected?.();
  }
  removeController(t2) {
    this._$EO?.delete(t2);
  }
  _$E_() {
    const t2 = /* @__PURE__ */ new Map(), s2 = this.constructor.elementProperties;
    for (const i2 of s2.keys()) this.hasOwnProperty(i2) && (t2.set(i2, this[i2]), delete this[i2]);
    t2.size > 0 && (this._$Ep = t2);
  }
  createRenderRoot() {
    const t2 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S$1(t2, this.constructor.elementStyles), t2;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t2) => t2.hostConnected?.());
  }
  enableUpdating(t2) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t2) => t2.hostDisconnected?.());
  }
  attributeChangedCallback(t2, s2, i2) {
    this._$AK(t2, i2);
  }
  _$ET(t2, s2) {
    const i2 = this.constructor.elementProperties.get(t2), e2 = this.constructor._$Eu(t2, i2);
    if (void 0 !== e2 && true === i2.reflect) {
      const h2 = (void 0 !== i2.converter?.toAttribute ? i2.converter : u$1).toAttribute(s2, i2.type);
      this._$Em = t2, null == h2 ? this.removeAttribute(e2) : this.setAttribute(e2, h2), this._$Em = null;
    }
  }
  _$AK(t2, s2) {
    const i2 = this.constructor, e2 = i2._$Eh.get(t2);
    if (void 0 !== e2 && this._$Em !== e2) {
      const t3 = i2.getPropertyOptions(e2), h2 = "function" == typeof t3.converter ? { fromAttribute: t3.converter } : void 0 !== t3.converter?.fromAttribute ? t3.converter : u$1;
      this._$Em = e2;
      const r2 = h2.fromAttribute(s2, t3.type);
      this[e2] = r2 ?? this._$Ej?.get(e2) ?? r2, this._$Em = null;
    }
  }
  requestUpdate(t2, s2, i2, e2 = false, h2) {
    if (void 0 !== t2) {
      const r2 = this.constructor;
      if (false === e2 && (h2 = this[t2]), i2 ??= r2.getPropertyOptions(t2), !((i2.hasChanged ?? f$1)(h2, s2) || i2.useDefault && i2.reflect && h2 === this._$Ej?.get(t2) && !this.hasAttribute(r2._$Eu(t2, i2)))) return;
      this.C(t2, s2, i2);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t2, s2, { useDefault: i2, reflect: e2, wrapped: h2 }, r2) {
    i2 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t2) && (this._$Ej.set(t2, r2 ?? s2 ?? this[t2]), true !== h2 || void 0 !== r2) || (this._$AL.has(t2) || (this.hasUpdated || i2 || (s2 = void 0), this._$AL.set(t2, s2)), true === e2 && this._$Em !== t2 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t2));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t3) {
      Promise.reject(t3);
    }
    const t2 = this.scheduleUpdate();
    return null != t2 && await t2, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t4, s3] of this._$Ep) this[t4] = s3;
        this._$Ep = void 0;
      }
      const t3 = this.constructor.elementProperties;
      if (t3.size > 0) for (const [s3, i2] of t3) {
        const { wrapped: t4 } = i2, e2 = this[s3];
        true !== t4 || this._$AL.has(s3) || void 0 === e2 || this.C(s3, void 0, i2, e2);
      }
    }
    let t2 = false;
    const s2 = this._$AL;
    try {
      t2 = this.shouldUpdate(s2), t2 ? (this.willUpdate(s2), this._$EO?.forEach((t3) => t3.hostUpdate?.()), this.update(s2)) : this._$EM();
    } catch (s3) {
      throw t2 = false, this._$EM(), s3;
    }
    t2 && this._$AE(s2);
  }
  willUpdate(t2) {
  }
  _$AE(t2) {
    this._$EO?.forEach((t3) => t3.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t2)), this.updated(t2);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t2) {
    return true;
  }
  update(t2) {
    this._$Eq &&= this._$Eq.forEach((t3) => this._$ET(t3, this[t3])), this._$EM();
  }
  updated(t2) {
  }
  firstUpdated(t2) {
  }
};
y$1.elementStyles = [], y$1.shadowRootOptions = { mode: "open" }, y$1[d$1("elementProperties")] = /* @__PURE__ */ new Map(), y$1[d$1("finalized")] = /* @__PURE__ */ new Map(), p$1?.({ ReactiveElement: y$1 }), (a$1.reactiveElementVersions ??= []).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$1 = globalThis, i$1 = (t2) => t2, s$1 = t$1.trustedTypes, e$2 = s$1 ? s$1.createPolicy("lit-html", { createHTML: (t2) => t2 }) : void 0, h = "$lit$", o$2 = `lit$${Math.random().toFixed(9).slice(2)}$`, n$1 = "?" + o$2, r$1 = `<${n$1}>`, l = document, c = () => l.createComment(""), a = (t2) => null === t2 || "object" != typeof t2 && "function" != typeof t2, u = Array.isArray, d = (t2) => u(t2) || "function" == typeof t2?.[Symbol.iterator], f = "[ 	\n\f\r]", v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, _ = /-->/g, m = />/g, p = RegExp(`>|${f}(?:([^\\s"'>=/]+)(${f}*=${f}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), g = /'/g, $ = /"/g, y2 = /^(?:script|style|textarea|title)$/i, x = (t2) => (i2, ...s2) => ({ _$litType$: t2, strings: i2, values: s2 }), b = x(1), E = Symbol.for("lit-noChange"), A = Symbol.for("lit-nothing"), C = /* @__PURE__ */ new WeakMap(), P = l.createTreeWalker(l, 129);
function V(t2, i2) {
  if (!u(t2) || !t2.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e$2 ? e$2.createHTML(i2) : i2;
}
const N = (t2, i2) => {
  const s2 = t2.length - 1, e2 = [];
  let n3, l2 = 2 === i2 ? "<svg>" : 3 === i2 ? "<math>" : "", c2 = v;
  for (let i3 = 0; i3 < s2; i3++) {
    const s3 = t2[i3];
    let a2, u2, d2 = -1, f2 = 0;
    for (; f2 < s3.length && (c2.lastIndex = f2, u2 = c2.exec(s3), null !== u2); ) f2 = c2.lastIndex, c2 === v ? "!--" === u2[1] ? c2 = _ : void 0 !== u2[1] ? c2 = m : void 0 !== u2[2] ? (y2.test(u2[2]) && (n3 = RegExp("</" + u2[2], "g")), c2 = p) : void 0 !== u2[3] && (c2 = p) : c2 === p ? ">" === u2[0] ? (c2 = n3 ?? v, d2 = -1) : void 0 === u2[1] ? d2 = -2 : (d2 = c2.lastIndex - u2[2].length, a2 = u2[1], c2 = void 0 === u2[3] ? p : '"' === u2[3] ? $ : g) : c2 === $ || c2 === g ? c2 = p : c2 === _ || c2 === m ? c2 = v : (c2 = p, n3 = void 0);
    const x2 = c2 === p && t2[i3 + 1].startsWith("/>") ? " " : "";
    l2 += c2 === v ? s3 + r$1 : d2 >= 0 ? (e2.push(a2), s3.slice(0, d2) + h + s3.slice(d2) + o$2 + x2) : s3 + o$2 + (-2 === d2 ? i3 : x2);
  }
  return [V(t2, l2 + (t2[s2] || "<?>") + (2 === i2 ? "</svg>" : 3 === i2 ? "</math>" : "")), e2];
};
class S {
  constructor({ strings: t2, _$litType$: i2 }, e2) {
    let r2;
    this.parts = [];
    let l2 = 0, a2 = 0;
    const u2 = t2.length - 1, d2 = this.parts, [f2, v2] = N(t2, i2);
    if (this.el = S.createElement(f2, e2), P.currentNode = this.el.content, 2 === i2 || 3 === i2) {
      const t3 = this.el.content.firstChild;
      t3.replaceWith(...t3.childNodes);
    }
    for (; null !== (r2 = P.nextNode()) && d2.length < u2; ) {
      if (1 === r2.nodeType) {
        if (r2.hasAttributes()) for (const t3 of r2.getAttributeNames()) if (t3.endsWith(h)) {
          const i3 = v2[a2++], s2 = r2.getAttribute(t3).split(o$2), e3 = /([.?@])?(.*)/.exec(i3);
          d2.push({ type: 1, index: l2, name: e3[2], strings: s2, ctor: "." === e3[1] ? I : "?" === e3[1] ? L : "@" === e3[1] ? z : H }), r2.removeAttribute(t3);
        } else t3.startsWith(o$2) && (d2.push({ type: 6, index: l2 }), r2.removeAttribute(t3));
        if (y2.test(r2.tagName)) {
          const t3 = r2.textContent.split(o$2), i3 = t3.length - 1;
          if (i3 > 0) {
            r2.textContent = s$1 ? s$1.emptyScript : "";
            for (let s2 = 0; s2 < i3; s2++) r2.append(t3[s2], c()), P.nextNode(), d2.push({ type: 2, index: ++l2 });
            r2.append(t3[i3], c());
          }
        }
      } else if (8 === r2.nodeType) if (r2.data === n$1) d2.push({ type: 2, index: l2 });
      else {
        let t3 = -1;
        for (; -1 !== (t3 = r2.data.indexOf(o$2, t3 + 1)); ) d2.push({ type: 7, index: l2 }), t3 += o$2.length - 1;
      }
      l2++;
    }
  }
  static createElement(t2, i2) {
    const s2 = l.createElement("template");
    return s2.innerHTML = t2, s2;
  }
}
function M(t2, i2, s2 = t2, e2) {
  if (i2 === E) return i2;
  let h2 = void 0 !== e2 ? s2._$Co?.[e2] : s2._$Cl;
  const o2 = a(i2) ? void 0 : i2._$litDirective$;
  return h2?.constructor !== o2 && (h2?._$AO?.(false), void 0 === o2 ? h2 = void 0 : (h2 = new o2(t2), h2._$AT(t2, s2, e2)), void 0 !== e2 ? (s2._$Co ??= [])[e2] = h2 : s2._$Cl = h2), void 0 !== h2 && (i2 = M(t2, h2._$AS(t2, i2.values), h2, e2)), i2;
}
class R {
  constructor(t2, i2) {
    this._$AV = [], this._$AN = void 0, this._$AD = t2, this._$AM = i2;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t2) {
    const { el: { content: i2 }, parts: s2 } = this._$AD, e2 = (t2?.creationScope ?? l).importNode(i2, true);
    P.currentNode = e2;
    let h2 = P.nextNode(), o2 = 0, n3 = 0, r2 = s2[0];
    for (; void 0 !== r2; ) {
      if (o2 === r2.index) {
        let i3;
        2 === r2.type ? i3 = new k(h2, h2.nextSibling, this, t2) : 1 === r2.type ? i3 = new r2.ctor(h2, r2.name, r2.strings, this, t2) : 6 === r2.type && (i3 = new Z(h2, this, t2)), this._$AV.push(i3), r2 = s2[++n3];
      }
      o2 !== r2?.index && (h2 = P.nextNode(), o2++);
    }
    return P.currentNode = l, e2;
  }
  p(t2) {
    let i2 = 0;
    for (const s2 of this._$AV) void 0 !== s2 && (void 0 !== s2.strings ? (s2._$AI(t2, s2, i2), i2 += s2.strings.length - 2) : s2._$AI(t2[i2])), i2++;
  }
}
class k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t2, i2, s2, e2) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t2, this._$AB = i2, this._$AM = s2, this.options = e2, this._$Cv = e2?.isConnected ?? true;
  }
  get parentNode() {
    let t2 = this._$AA.parentNode;
    const i2 = this._$AM;
    return void 0 !== i2 && 11 === t2?.nodeType && (t2 = i2.parentNode), t2;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t2, i2 = this) {
    t2 = M(this, t2, i2), a(t2) ? t2 === A || null == t2 || "" === t2 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t2 !== this._$AH && t2 !== E && this._(t2) : void 0 !== t2._$litType$ ? this.$(t2) : void 0 !== t2.nodeType ? this.T(t2) : d(t2) ? this.k(t2) : this._(t2);
  }
  O(t2) {
    return this._$AA.parentNode.insertBefore(t2, this._$AB);
  }
  T(t2) {
    this._$AH !== t2 && (this._$AR(), this._$AH = this.O(t2));
  }
  _(t2) {
    this._$AH !== A && a(this._$AH) ? this._$AA.nextSibling.data = t2 : this.T(l.createTextNode(t2)), this._$AH = t2;
  }
  $(t2) {
    const { values: i2, _$litType$: s2 } = t2, e2 = "number" == typeof s2 ? this._$AC(t2) : (void 0 === s2.el && (s2.el = S.createElement(V(s2.h, s2.h[0]), this.options)), s2);
    if (this._$AH?._$AD === e2) this._$AH.p(i2);
    else {
      const t3 = new R(e2, this), s3 = t3.u(this.options);
      t3.p(i2), this.T(s3), this._$AH = t3;
    }
  }
  _$AC(t2) {
    let i2 = C.get(t2.strings);
    return void 0 === i2 && C.set(t2.strings, i2 = new S(t2)), i2;
  }
  k(t2) {
    u(this._$AH) || (this._$AH = [], this._$AR());
    const i2 = this._$AH;
    let s2, e2 = 0;
    for (const h2 of t2) e2 === i2.length ? i2.push(s2 = new k(this.O(c()), this.O(c()), this, this.options)) : s2 = i2[e2], s2._$AI(h2), e2++;
    e2 < i2.length && (this._$AR(s2 && s2._$AB.nextSibling, e2), i2.length = e2);
  }
  _$AR(t2 = this._$AA.nextSibling, s2) {
    for (this._$AP?.(false, true, s2); t2 !== this._$AB; ) {
      const s3 = i$1(t2).nextSibling;
      i$1(t2).remove(), t2 = s3;
    }
  }
  setConnected(t2) {
    void 0 === this._$AM && (this._$Cv = t2, this._$AP?.(t2));
  }
}
class H {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t2, i2, s2, e2, h2) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t2, this.name = i2, this._$AM = e2, this.options = h2, s2.length > 2 || "" !== s2[0] || "" !== s2[1] ? (this._$AH = Array(s2.length - 1).fill(new String()), this.strings = s2) : this._$AH = A;
  }
  _$AI(t2, i2 = this, s2, e2) {
    const h2 = this.strings;
    let o2 = false;
    if (void 0 === h2) t2 = M(this, t2, i2, 0), o2 = !a(t2) || t2 !== this._$AH && t2 !== E, o2 && (this._$AH = t2);
    else {
      const e3 = t2;
      let n3, r2;
      for (t2 = h2[0], n3 = 0; n3 < h2.length - 1; n3++) r2 = M(this, e3[s2 + n3], i2, n3), r2 === E && (r2 = this._$AH[n3]), o2 ||= !a(r2) || r2 !== this._$AH[n3], r2 === A ? t2 = A : t2 !== A && (t2 += (r2 ?? "") + h2[n3 + 1]), this._$AH[n3] = r2;
    }
    o2 && !e2 && this.j(t2);
  }
  j(t2) {
    t2 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t2 ?? "");
  }
}
class I extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t2) {
    this.element[this.name] = t2 === A ? void 0 : t2;
  }
}
class L extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t2) {
    this.element.toggleAttribute(this.name, !!t2 && t2 !== A);
  }
}
class z extends H {
  constructor(t2, i2, s2, e2, h2) {
    super(t2, i2, s2, e2, h2), this.type = 5;
  }
  _$AI(t2, i2 = this) {
    if ((t2 = M(this, t2, i2, 0) ?? A) === E) return;
    const s2 = this._$AH, e2 = t2 === A && s2 !== A || t2.capture !== s2.capture || t2.once !== s2.once || t2.passive !== s2.passive, h2 = t2 !== A && (s2 === A || e2);
    e2 && this.element.removeEventListener(this.name, this, s2), h2 && this.element.addEventListener(this.name, this, t2), this._$AH = t2;
  }
  handleEvent(t2) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t2) : this._$AH.handleEvent(t2);
  }
}
class Z {
  constructor(t2, i2, s2) {
    this.element = t2, this.type = 6, this._$AN = void 0, this._$AM = i2, this.options = s2;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t2) {
    M(this, t2);
  }
}
const B = t$1.litHtmlPolyfillSupport;
B?.(S, k), (t$1.litHtmlVersions ??= []).push("3.3.3");
const D = (t2, i2, s2) => {
  const e2 = s2?.renderBefore ?? i2;
  let h2 = e2._$litPart$;
  if (void 0 === h2) {
    const t3 = s2?.renderBefore ?? null;
    e2._$litPart$ = h2 = new k(i2.insertBefore(c(), t3), t3, void 0, s2 ?? {});
  }
  return h2._$AI(t2), h2;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const s = globalThis;
class i extends y$1 {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t2 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t2.firstChild, t2;
  }
  update(t2) {
    const r2 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t2), this._$Do = D(r2, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
}
i._$litElement$ = true, i["finalized"] = true, s.litElementHydrateSupport?.({ LitElement: i });
const o$1 = s.litElementPolyfillSupport;
o$1?.({ LitElement: i });
(s.litElementVersions ??= []).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t = (t2) => (e2, o2) => {
  void 0 !== o2 ? o2.addInitializer(() => {
    customElements.define(t2, e2);
  }) : customElements.define(t2, e2);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const o = { attribute: true, type: String, converter: u$1, reflect: false, hasChanged: f$1 }, r = (t2 = o, e2, r2) => {
  const { kind: n3, metadata: i2 } = r2;
  let s2 = globalThis.litPropertyMetadata.get(i2);
  if (void 0 === s2 && globalThis.litPropertyMetadata.set(i2, s2 = /* @__PURE__ */ new Map()), "setter" === n3 && ((t2 = Object.create(t2)).wrapped = true), s2.set(r2.name, t2), "accessor" === n3) {
    const { name: o2 } = r2;
    return { set(r3) {
      const n4 = e2.get.call(this);
      e2.set.call(this, r3), this.requestUpdate(o2, n4, t2, true, r3);
    }, init(e3) {
      return void 0 !== e3 && this.C(o2, void 0, t2, e3), e3;
    } };
  }
  if ("setter" === n3) {
    const { name: o2 } = r2;
    return function(r3) {
      const n4 = this[o2];
      e2.call(this, r3), this.requestUpdate(o2, n4, t2, true, r3);
    };
  }
  throw Error("Unsupported decorator location: " + n3);
};
function n2(t2) {
  return (e2, o2) => "object" == typeof o2 ? r(t2, e2, o2) : ((t3, e3, o3) => {
    const r2 = e3.hasOwnProperty(o3);
    return e3.constructor.createProperty(o3, t3), r2 ? Object.getOwnPropertyDescriptor(e3, o3) : void 0;
  })(t2, e2, o2);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e$1 = (e2, t2, c2) => (c2.configurable = true, c2.enumerable = true, Reflect.decorate && "object" != typeof t2 && Object.defineProperty(e2, t2, c2), c2);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function e(e2, r2) {
  return (n3, s2, i2) => {
    const o2 = (t2) => t2.renderRoot?.querySelector(e2) ?? null;
    return e$1(n3, s2, { get() {
      return o2(this);
    } });
  };
}
class ExplorerApi {
  constructor(hass) {
    this.hass = hass;
  }
  call(message) {
    return this.hass.callWS(message);
  }
  async callWithTimeout(message, timeoutMs = 15e3) {
    let timeoutId;
    try {
      return await Promise.race([
        this.call(message),
        new Promise((_2, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error(`Zeitüberschreitung nach ${Math.round(timeoutMs / 1e3)} Sekunden`)),
            timeoutMs
          );
        })
      ]);
    } finally {
      if (timeoutId !== void 0) window.clearTimeout(timeoutId);
    }
  }
}
class ExplorerPreferences {
  get(key, fallback) {
    try {
      return window.localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  }
  set(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
    }
  }
  getBoolean(key, fallback = false) {
    const value = this.get(key, fallback ? "1" : "0");
    return value === "1" || value === "true";
  }
}
class BepacomExplorerView extends HTMLElement {
  constructor() {
    super();
    this._preferences = new ExplorerPreferences();
    this.attachShadow({ mode: "open" });
    this._entryId = null;
    this._points = [];
    this._entries = [];
    this._selected = null;
    this._inspector = {};
    this._loading = false;
    this._saving = false;
    this._error = null;
    this._message = null;
    this._filters = {
      search: "",
      object_type: "all",
      only_overrides: false,
      only_subscribe: false,
      device_id: "all",
      runtime: "all"
    };
    this._virtualSearch = this._loadSetting("bepacom_virtual_search", "");
    this._refreshTimer = null;
    this._debounce = null;
    this._diagnostics = {};
    this._historyByUid = /* @__PURE__ */ new Map();
    this._clientHistory = /* @__PURE__ */ new Map();
    this._clientValueChangeCount = /* @__PURE__ */ new Map();
    this._lastSeenValues = /* @__PURE__ */ new Map();
    this._writing = false;
    this._statusOpen = this._loadStatusOpen();
    this._groupBy = this._loadSetting("bepacom_group_by", "type");
    this._sortKey = this._loadSetting("bepacom_sort_key", "object_key");
    this._sortDir = this._loadSetting("bepacom_sort_dir", "asc");
    this._detailsVisible = this._loadSetting("bepacom_details_visible", "0") === "1";
    this._selectedIds = /* @__PURE__ */ new Set();
    this._visibleStart = 0;
    this._rowHeight = 74;
    this._overscan = 8;
    this._lastTableScrollTop = 0;
    this._recentValueChanges = /* @__PURE__ */ new Map();
    this._recentValueDirections = /* @__PURE__ */ new Map();
    this._recentChangeTimer = null;
    this._keyboardHandler = (ev) => this._handleKeyboard(ev);
    this._rootClickHandler = (ev) => this._handleRootClick(ev);
    this._editorDirty = false;
    this._editorErrors = [];
    this._pendingReloadIds = /* @__PURE__ */ new Set();
    this._manualReloadRunning = false;
    this._manualReloadUntil = 0;
    this._refreshInFlight = false;
    this._sideScrollPositions = /* @__PURE__ */ new Map();
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
  }
  _versionLabel() {
    const cfg = this.panel?.config || {};
    const version = cfg.version || "1.2.3";
    const build = cfg.frontend_build || "0652";
    return `Version ${version} · Frontend-Build ${build}`;
  }
  connectedCallback() {
    if (this._connected) return;
    this._connected = true;
    this._entryId = this.panel?.config?.entry_id || null;
    window.addEventListener("keydown", this._keyboardHandler);
    document.addEventListener("visibilitychange", this._visibilityHandler);
    window.addEventListener("beforeunload", this._beforeUnloadHandler);
    this.shadowRoot.addEventListener("click", this._rootClickHandler);
    this._startInitialLoad();
    this._startRefreshTimer();
    this._startLiveTimer();
    this._render();
  }
  disconnectedCallback() {
    this._connected = false;
    this._stopRefreshTimer();
    this._stopLiveTimer();
    this._refreshGeneration += 1;
    this._refreshInFlight = false;
    if (this._debounce) window.clearTimeout(this._debounce);
    if (this._recentChangeTimer) {
      window.clearTimeout(this._recentChangeTimer);
      this._recentChangeTimer = null;
    }
    window.removeEventListener("keydown", this._keyboardHandler);
    document.removeEventListener("visibilitychange", this._visibilityHandler);
    window.removeEventListener("beforeunload", this._beforeUnloadHandler);
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
  _hasUnsavedChanges() {
    return this._editorDirty;
  }
  _discardEditorChanges() {
    if (!this._selected) return;
    this._editorDirty = false;
    this._editorErrors = [];
    this._message = "Ungespeicherte Änderungen wurden verworfen.";
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
        (point) => point.unique_id !== this._selected?.unique_id && point.entity_id === entityId
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
  }
  get hass() {
    return this._hass;
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
    this._refreshTimer = window.setInterval(() => this._refreshPointsInPlace(), 5e3);
  }
  _stopRefreshTimer() {
    if (!this._refreshTimer) return;
    window.clearInterval(this._refreshTimer);
    this._refreshTimer = null;
  }
  _startLiveTimer() {
    if (!this._connected || document.hidden || this._liveTimer) return;
    this._refreshLiveChanges();
    this._liveTimer = window.setInterval(() => this._refreshLiveChanges(), 1e3);
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
        limit: 1e4
      });
      const latestSequence = Number(result.latest_sequence) || 0;
      if (generation !== this._liveGeneration) return;
      if (latestSequence < this._liveCursor) {
        this._liveCursor = 0;
        this._liveChanges = [];
        return;
      }
      const incoming = Array.isArray(result.changes) ? result.changes : [];
      if (incoming.length) {
        this._liveChanges.push(...incoming);
        if (this._liveChanges.length > 1e4) {
          this._liveChanges.splice(0, this._liveChanges.length - 1e4);
        }
        this._liveCursor = Number(incoming[incoming.length - 1].sequence) || this._liveCursor;
        this._updateLiveMonitorDom();
      } else if (!this._liveCursor) {
        this._liveCursor = latestSequence;
      }
    } catch (_2) {
    } finally {
      this._liveRefreshInFlight = false;
    }
  }
  async _callWSWithTimeout(message, timeoutMs = 15e3) {
    if (!this._api) throw new Error("Home Assistant ist nicht verbunden");
    let timeoutId;
    try {
      return await Promise.race([
        this._api.call(message),
        new Promise((_2, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error("Zeitüberschreitung bei der Verbindung zu Home Assistant")),
            timeoutMs
          );
        })
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
    if (showLoading) this._loading = true;
    this._error = null;
    if (showLoading) this._render();
    try {
      const result = await this._callWSWithTimeout({
        type: "bepacom/explorer/points",
        entry_id: this._entryId || void 0,
        search: this._filters.search,
        object_type: this._filters.object_type,
        only_overrides: this._filters.only_overrides,
        only_subscribe: this._filters.only_subscribe,
        include_disabled: true,
        limit: 2e3
      });
      this._entryId = result.entry_id || this._entryId;
      this._points = result.points || [];
      this._diagnostics = result.diagnostics || {};
      this._trackClientHistory(this._points);
      this._total = result.total || this._points.length;
      this._limited = !!result.limited;
      if (this._selected) {
        const updated = this._points.find((p2) => p2.unique_id === this._selected.unique_id);
        if (updated) this._selected = updated;
      }
    } catch (err) {
      this._error = this._formatError(err);
    } finally {
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
      if (["select", "input", "textarea", "button"].includes(tag)) return true;
    }
    return tableWrap.matches(":hover");
  }
  async _refreshPointsInPlace() {
    if (!this.hass || !this._entryId) return;
    if (document.hidden) return;
    if (this._refreshInFlight) return;
    const generation = ++this._refreshGeneration;
    this._refreshInFlight = true;
    try {
      const result = await this._callWSWithTimeout({
        type: "bepacom/explorer/points_runtime",
        entry_id: this._entryId || void 0,
        unique_ids: this._points.map((point) => point.unique_id)
      });
      if (generation !== this._refreshGeneration || document.hidden || !this._connected) return;
      this._entryId = result.entry_id || this._entryId;
      const runtimeByUid = new Map((result.points || []).map((point) => [point.unique_id, point]));
      this._points = this._points.map((point) => ({
        ...point,
        ...runtimeByUid.get(point.unique_id) || {}
      }));
      this._diagnostics = result.diagnostics || {};
      this._trackClientHistory(this._points);
      if (this._selected) {
        const updated = this._points.find((p2) => p2.unique_id === this._selected.unique_id);
        if (updated) {
          this._selected = { ...this._selected, ...updated };
        }
      }
      if (!this._isUserInteractingWithTable()) {
        this._updateListDom();
      }
      this._updateHeaderDom();
    } catch (err) {
      if (generation !== this._refreshGeneration || document.hidden || !this._connected) return;
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
      if (!(active && liveMonitor?.contains(active))) {
        this._configureRuntimeDashboard();
      }
    }
  }
  _updateListDom() {
    const wrap = this.shadowRoot?.getElementById("tableWrap");
    if (!wrap) return;
    const scrollTop = wrap.scrollTop;
    this._lastTableScrollTop = scrollTop;
    this._configurePointTable();
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
    this._filters[key] = value;
    if (this._debounce) window.clearTimeout(this._debounce);
    this._debounce = window.setTimeout(() => this._loadPoints(false), 250);
  }
  _selectPoint(point) {
    if (this._editorDirty && this._selected?.unique_id !== point?.unique_id && !window.confirm("Ungespeicherte Änderungen verwerfen und einen anderen Punkt öffnen?")) {
      return;
    }
    this._editorDirty = false;
    this._editorErrors = [];
    this._manualReloadRunning = false;
    this._manualReloadUntil = 0;
    this._selected = point;
    this._clientHistory.clear();
    this._historyByUid.clear();
    this._message = null;
    this._loadInspector(point.unique_id);
    this._configurePointTable();
    this._configurePointInspector();
  }
  async _loadInspector(uniqueId) {
    if (!this.hass) return;
    try {
      const result = await this.hass.callWS({
        type: "bepacom/explorer/point",
        entry_id: this._entryId || void 0,
        unique_id: uniqueId
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
        entry_id: this._entryId || void 0,
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
        virtual_binary_else_state: virtualBinaryElseState
      });
      this._selected = result.point;
      this._editorDirty = false;
      this._editorErrors = [];
      this._pendingReloadIds.add(this._selected.unique_id);
      this._inspector = result.inspector || {};
      this._setHistoryForSelected(result.history || [], this._selected?.unique_id);
      this._message = "Gespeichert. Die Integration wird nicht automatisch neu geladen. Wenn du mit allen Änderungen fertig bist, nutze oben 'Integration neu laden'.";
      await this._loadPoints(false);
    } catch (err) {
      this._error = this._formatError(err);
    } finally {
      this._saving = false;
      this._render();
    }
  }
  _findVirtualEntity(sourceUid, virtualUid) {
    const source = (this._points || []).find((p2) => p2.unique_id === sourceUid);
    const ent = source ? this._linkedEntities(source).find((e2) => String(e2.unique_id || "") === String(virtualUid || "")) : null;
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
    setTimeout(() => this._fillVirtualForm(ent, duplicate), 0);
    setTimeout(() => this._fillVirtualForm(ent, duplicate), 300);
  }
  async _deleteVirtualEntity(sourceUid, virtualUid, virtualName = "") {
    if (!this.hass || !sourceUid || !virtualUid) return;
    const label = virtualName || virtualUid;
    const ok = window.confirm(`Virtuelle Entität löschen?

${label}

Diese Aktion entfernt die virtuelle Entität aus der Engelsoft-Beacon-Konfiguration und aus der Home-Assistant-Entity-Registry. Danach bitte die Integration neu laden.`);
    if (!ok) return;
    this._saving = true;
    this._message = null;
    this._error = null;
    try {
      const result = await this.hass.callWS({
        type: "bepacom/explorer/delete_virtual_entity",
        entry_id: this._entryId || void 0,
        source_unique_id: sourceUid,
        virtual_unique_id: virtualUid
      });
      if (this._selected?.unique_id === sourceUid) {
        this._selected = result.point;
        this._inspector = result.inspector || {};
        this._setHistoryForSelected(result.history || [], sourceUid);
      }
      this._pendingReloadIds.add(sourceUid);
      this._message = result.removed_entity_id ? `Virtuelle Entität gelöscht: ${result.removed_entity_id}. Bitte Integration neu laden.` : "Virtuelle Entität gelöscht. Bitte Integration neu laden.";
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
    this._editorDirty = false;
    this._manualReloadRunning = false;
    this._manualReloadUntil = 0;
    this._saving = true;
    this._message = null;
    this._error = null;
    try {
      const result = await this.hass.callWS({
        type: "bepacom/explorer/reset_override",
        entry_id: this._entryId || void 0,
        unique_id: this._selected.unique_id
      });
      this._selected = result.point;
      this._pendingReloadIds.add(this._selected.unique_id);
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
    if (preview.changed > 0 && !window.confirm(
      `Integration neu laden?

${preview.changed} geänderte Punkte werden angewendet.
${preview.enabled} aktiv · ${preview.disabled} deaktiviert.

Während des Reloads können Entitäten kurz nicht verfügbar sein.`
    )) return;
    this._manualReloadRunning = true;
    this._manualReloadUntil = now + 15e3;
    this._saving = true;
    this._message = "Integration wird neu geladen …";
    this._error = null;
    this._stopRefreshTimer();
    this._render();
    try {
      const result = await this.hass.callWS({
        type: "bepacom/explorer/reload_entry",
        entry_id: this._entryId || void 0
      });
      if (result && result.scheduled === false) {
        this._message = "Integration wird bereits neu geladen. Bitte kurz warten.";
      } else {
        this._message = "Neuladen wurde gestartet. Die Ansicht wird gleich aktualisiert.";
        this._pendingReloadIds.clear();
      }
      window.setTimeout(async () => {
        this._manualReloadRunning = false;
        this._saving = false;
        try {
          await this._loadEntries();
          await this._loadPoints(false);
          this._message = "Integration wurde neu geladen.";
        } catch (err) {
          this._error = this._formatError(err);
        } finally {
          this._startRefreshTimer();
          this._render();
        }
      }, 8e3);
    } catch (err) {
      this._manualReloadRunning = false;
      this._saving = false;
      this._error = this._formatError(err);
      this._startRefreshTimer();
      this._render();
    }
  }
  _comparableValue(value) {
    if (value === null || value === void 0) return null;
    if (typeof value === "boolean") return value;
    const text = String(value).trim();
    if (text === "") return "";
    const num = Number(text);
    if (Number.isFinite(num)) return Number(num.toFixed(10));
    return text;
  }
  _sameValue(a2, b2) {
    return this._comparableValue(a2) === this._comparableValue(b2);
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
    const now = (/* @__PURE__ */ new Date()).toISOString();
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
        if (now - ts < 4e3) continue;
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
    if (Date.now() - ts > 4e3) {
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
    let idx = points.findIndex((p2) => p2.unique_id === currentUid);
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
    if (value === void 0 || value === null || String(value).trim() === "") {
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
        entry_id: this._entryId || void 0,
        unique_id: this._selected.unique_id,
        value,
        priority
      });
      this._selected = result.point;
      this._inspector = result.inspector || {};
      this._setHistoryForSelected(result.history || [], this._selected?.unique_id);
      this._message = "BACnet-Wert wurde geschrieben.";
      await this._refreshPointsInPlace();
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
    const a2 = document.createElement("a");
    a2.href = url;
    a2.download = filename;
    this.shadowRoot.appendChild(a2);
    a2.click();
    a2.remove();
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
      write_priority: point.write_priority ?? 8,
      write_profile: point.write_profile || "direct",
      glt_delay_ms: point.glt_delay_ms,
      as_delay_ms: point.as_delay_ms,
      release_delay_ms: point.release_delay_ms,
      release_priority: point.release_priority !== false,
      virtual_entities: Array.isArray(point.virtual_binaries) ? point.virtual_binaries : []
    };
  }
  _exportOverrides() {
    const overrides = this._points.filter(
      (point) => point.override_active || Array.isArray(point.virtual_binaries) && point.virtual_binaries.length
    ).map((point) => this._overridePayload(point));
    this._download(
      "bepacom_overrides.json",
      JSON.stringify({ format: "bepacom-overrides", version: 1, overrides }, null, 2),
      "application/json;charset=utf-8"
    );
  }
  _openOverrideImport() {
    this.shadowRoot?.getElementById("importOverridesFile")?.click();
  }
  async _importOverrides(file) {
    if (!file || !this.hass) return;
    try {
      const document2 = JSON.parse(await file.text());
      if (document2?.format !== "bepacom-overrides" || !Array.isArray(document2.overrides)) {
        throw new Error("Die Datei ist kein Bepacom-Override-Export.");
      }
      if (document2.overrides.length > 2e3) throw new Error("Die Importdatei enthält mehr als 2000 Overrides.");
      const known = new Set(this._points.map((point) => point.unique_id));
      const items = document2.overrides.filter((item) => item && known.has(item.unique_id));
      const skipped = document2.overrides.length - items.length;
      if (!items.length) throw new Error("Keiner der importierten Punkte ist in diesem Gateway vorhanden.");
      if (!window.confirm(`${items.length} Overrides importieren${skipped ? ` (${skipped} unbekannte überspringen)` : ""}?`)) return;
      this._saving = true;
      this._error = null;
      this._render();
      for (const item of items) {
        const { virtual_entities: virtualEntities = [], ...override } = item;
        await this.hass.callWS({
          ...override,
          type: "bepacom/explorer/save_override",
          entry_id: this._entryId || void 0,
          unique_id: item.unique_id
        });
        for (const virtual of Array.isArray(virtualEntities) ? virtualEntities : []) {
          await this.hass.callWS({
            ...override,
            type: "bepacom/explorer/save_override",
            entry_id: this._entryId || void 0,
            unique_id: item.unique_id,
            virtual_binary_enabled: true,
            virtual_binary_name: virtual.name || "",
            virtual_binary_unique_id: virtual.unique_id || "",
            virtual_binary_device_class: virtual.device_class || "",
            virtual_binary_on_value: String(virtual.on_value ?? ""),
            virtual_binary_off_value: String(virtual.off_value ?? ""),
            virtual_binary_else_state: virtual.else_state || "unavailable"
          });
        }
        this._pendingReloadIds.add(item.unique_id);
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
      disabled: changedPoints.filter((point) => point.update_mode === "disabled").length
    };
  }
  _exportCsv() {
    const headers = ["object_key", "object_name", "description", "entity_id", "present_value", "bacnet_unit", "ha_unit", "device_class", "state_class", "override_active", "update_mode", "subscribed", "enabled", "writable", "last_update"];
    const esc = (v2) => `"${String(v2 ?? "").replaceAll('"', '""')}"`;
    const rows = [headers.join(";")].concat(this._points.map((p2) => headers.map((h2) => esc(p2[h2])).join(";")));
    this._download("bepacom_bacnet_objects.csv", rows.join("\n"), "text/csv;charset=utf-8");
  }
  _exportExcel() {
    const headers = ["Objekt", "Name", "Beschreibung", "HA Entität", "Wert", "BACnet Unit", "HA Unit", "Device Class", "State Class", "Override", "Subscribe", "Subscribed", "Aktiv", "Schreibbar", "Letztes Update"];
    const keys = ["object_key", "object_name", "description", "entity_id", "present_value", "bacnet_unit", "ha_unit", "device_class", "state_class", "override_active", "update_mode", "subscribed", "enabled", "writable", "last_update"];
    const rows = this._points.map((p2) => `<tr>${keys.map((k2) => `<td>${this._escape(p2[k2])}</td>`).join("")}</tr>`).join("");
    const html = `<html><head><meta charset="utf-8"></head><body><table><thead><tr>${headers.map((h2) => `<th>${this._escape(h2)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
    this._download("bepacom_bacnet_objects.xls", html, "application/vnd.ms-excel;charset=utf-8");
  }
  _loadStatusOpen() {
    try {
      const stored = window.localStorage.getItem("bepacom_status_open");
      return stored === "1" || stored === "true";
    } catch (_2) {
      return false;
    }
  }
  _setStatusOpen(open) {
    this._statusOpen = !!open;
    try {
      window.localStorage.setItem("bepacom_status_open", this._statusOpen ? "1" : "0");
    } catch (_2) {
    }
    this._updateHeaderDom();
    if (this._statusOpen && this._dashboardTab === "live") this._refreshLiveChanges();
  }
  _clientValueChangeTotal() {
    let total = 0;
    for (const value of this._clientValueChangeCount.values()) total += Number(value) || 0;
    return total;
  }
  _dashboardValueChanges(d2 = {}) {
    const backend = Number(d2.value_changes ?? 0) || 0;
    const client = this._clientValueChangeTotal();
    return Math.max(backend, client);
  }
  _normalizeBacnetObjectType(value) {
    return String(value ?? "").toLowerCase().replace(/[^a-z]/g, "");
  }
  _bacnetObjectInstance(value) {
    if (value === null || value === void 0 || value === "") return "";
    const text = String(value).trim();
    const trailing = text.match(/(?:[:),]|\])\s*(\d+)\s*\)?$/);
    if (trailing) return trailing[1];
    return /^\d+$/.test(text) ? text : "";
  }
  _pointForLiveChange(item) {
    const exact = this._points.find((point) => point.unique_id === item?.unique_id);
    if (exact) return exact;
    const eventType = this._normalizeBacnetObjectType(item?.object_type || item?.object_key || item?.unique_id);
    const eventInstance = this._bacnetObjectInstance(item?.object_id) || this._bacnetObjectInstance(item?.object_key) || this._bacnetObjectInstance(item?.unique_id);
    const eventDevice = String(item?.device_id ?? "").trim();
    if (!eventType || !eventInstance) return void 0;
    return this._points.find((point) => {
      const pointType = this._normalizeBacnetObjectType(point.object_type || point.object_key || point.unique_id);
      const pointInstance = this._bacnetObjectInstance(point.instance) || this._bacnetObjectInstance(point.object_id) || this._bacnetObjectInstance(point.object_key) || this._bacnetObjectInstance(point.unique_id);
      const pointDevice = String(point.device_id ?? "").trim();
      return pointType === eventType && pointInstance === eventInstance && (!eventDevice || !pointDevice || eventDevice === pointDevice);
    });
  }
  _livePointLabels(item) {
    const point = this._pointForLiveChange(item);
    const entityId = point?.entity_id || item?.entity_id || "";
    const state = entityId ? this.hass?.states?.[entityId] : void 0;
    const friendlyName = state?.attributes?.friendly_name || point?.entity_name || point?.entity_original_name || point?.object_name || point?.description || item?.friendly_name || item?.object_name || entityId || item?.object_key || item?.unique_id;
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
      const haystack = [
        item.device_id,
        item.object_type,
        item.object_id,
        item.object_key,
        item.object_name,
        item.unique_id,
        point?.entity_id,
        item.previous_value,
        item.value,
        item.source
      ].filter((value) => value !== null && value !== void 0).join(" ");
      return this._matchesSearchQuery(haystack, search);
    });
  }
  _liveMonitorHtml() {
    const filtered = this._filteredLiveChanges();
    const now = Date.now();
    const bins = Array.from({ length: 60 }, () => 0);
    for (const item of this._liveChanges) {
      const age = Math.floor((now - Date.parse(item.ts || 0)) / 1e3);
      if (age >= 0 && age < 60) bins[59 - age] += 1;
    }
    const peak = Math.max(0, ...bins);
    const lastMinute = bins.reduce((sum, count) => sum + count, 0);
    const average = (lastMinute / 60).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const bars = bins.map((count) => {
      const height = peak ? Math.max(3, Math.round(count / peak * 50)) : 3;
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
      <div class="live-summary">
        <span><b>${this._liveChanges.length.toLocaleString("de-DE")}</b> gespeichert</span>
        <span><b>${filtered.length.toLocaleString("de-DE")}</b> im Filter</span>
        <span><b>${average}/s</b> letzte Minute</span>
        <span><b>${peak}/s</b> Spitze</span>
        <button id="livePause" class="secondary live-small-btn">${this._livePaused ? "Fortsetzen" : "Pausieren"}</button>
      </div>
      <div class="live-chart" aria-label="Änderungen der letzten 60 Sekunden">${bars}</div>
      <div class="live-filters">
        <input id="liveSearch" value="${this._escape(this._liveFilters.search)}" placeholder="Filter / Wildcards …">
        <select id="liveSource"><option value="all">Alle Quellen</option>${options(sources, this._liveFilters.source)}</select>
        <select id="liveObjectType"><option value="all">Alle Typen</option>${options(types, this._liveFilters.object_type)}</select>
        <button id="liveClear" class="secondary live-small-btn" title="Monitorverlauf leeren">Leeren</button>
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
    const d2 = this._diagnostics || {};
    const configured = [
      ["Push konfiguriert", d2.configured_push ?? "-"],
      ["Polling konfiguriert", d2.configured_polling ?? "-"],
      ["Overrides", d2.overrides ?? "-"]
    ];
    if (Array.isArray(d2.firmware_versions) && d2.firmware_versions.length) {
      configured.push(["Firmware", d2.firmware_versions.join(", ")]);
    }
    if (Array.isArray(d2.device_models) && d2.device_models.length) {
      configured.push(["Gerätemodelle", d2.device_models.join(", ")]);
    }
    const valueChanges = this._dashboardValueChanges(d2);
    const pushNotificationsRaw = d2.bacnet_push_notifications ?? d2.websocket_updates ?? d2.push_count;
    const pushNotifications = Number(pushNotificationsRaw);
    const averageChangesPerPush = Number.isFinite(pushNotifications) && pushNotifications > 0 ? (Number(valueChanges) / pushNotifications).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) : "-";
    const pushChangeValue = `${pushNotificationsRaw ?? "-"} / ${averageChangesPerPush}`;
    const runtime = [
      ["Aktive Subscriptions", d2.subscribed ?? d2.subscriptions ?? "-"],
      ["Aktives Polling", d2.fallback_polling ?? d2.fallback_objects ?? "-"],
      ["Reconnects", d2.reconnect_count ?? "-"]
    ];
    const developer = [
      ["Direkt-Pushs", d2.websocket_direct_messages ?? "-"],
      ["Snapshot-Pushs", d2.websocket_snapshot_messages ?? "-"],
      ["Fallback-Pushs", d2.websocket_fallback_messages ?? "-"],
      ["Payload geprüft", d2.websocket_payload_objects ?? "-"],
      ["Payload verarbeitet", d2.websocket_processed_objects ?? "-"],
      ["Payload ignoriert", d2.websocket_ignored_objects ?? "-"],
      ["Vor Callback gefiltert", d2.websocket_prefiltered_no_change_objects ?? "-"],
      ["Callback-Aufrufe", d2.websocket_callback_invocations ?? "-"],
      ["Callbacks mit Änderung", d2.websocket_callback_value_changes ?? "-"],
      ["Callbacks ohne Änderung", d2.websocket_callback_no_changes ?? "-"],
      ["Push-Punktupdates", d2.processed_push_updates ?? d2.push_updates ?? "-"],
      ["Polling-Punktupdates", d2.processed_polling_updates ?? d2.polling_updates ?? "-"],
      ["Unterdrückte gleiche Werte", d2.suppressed_updates ?? "-"],
      ["Max Push-Verarbeitung ms", d2.dispatch_time_max_ms === void 0 ? "-" : Number(d2.dispatch_time_max_ms).toFixed(2)]
    ];
    const renderCards = (cards) => cards.map(([label, value]) => {
      const icon = this._statusIcon(label, value);
      const cls = this._statusClass(label, value);
      return `<bepacom-status-metric label="${this._escape(label)}" value="${this._escape(value)}" icon="${this._escape(icon)}" tone="${this._escape(cls)}"></bepacom-status-metric>`;
    }).join("");
    const open = !!this._statusOpen;
    const dashboardTab = this._dashboardTab === "developer" ? "developer" : "live";
    const summary = [
      `Punkte: ${d2.objects ?? this._total ?? "-"}`,
      `aktiv: ${d2.enabled ?? "-"}`,
      `Push: ${d2.configured_push ?? "-"}/${d2.subscribed ?? "-"}`,
      `Polling: ${d2.configured_polling ?? "-"}/${d2.fallback_polling ?? "-"}`,
      `Pushs / Ø Änderungen: ${pushChangeValue}`
    ].join(" · ");
    return `
      <section class="dashboard-shell ${open ? "open" : "closed"}">
        <button id="toggleDashboard" class="dashboard-toggle" type="button" title="Status ein-/ausklappen">
          <span class="chevron">${open ? "▾" : "▸"}</span>
          <span class="dashboard-toggle-title">Status / Laufzeit</span>
          <span class="dashboard-summary">${this._escape(summary)}</span>
        </button>
        ${open ? `<div class="dashboard-content">
          <section class="dashboard-group">
            <div class="dashboard-title">Konfiguration</div>
            <div class="dashboard-cards">${renderCards(configured)}</div>
          </section>
          <section class="dashboard-group">
            <div class="dashboard-title">System / Laufzeit</div>
            <div class="dashboard-cards">${renderCards(runtime)}</div>
          </section>
          <section class="dashboard-group dashboard-group-wide dashboard-monitor-group">
            <div class="dashboard-monitor-tabs">
              <button class="dashboard-monitor-tab ${dashboardTab === "developer" ? "active" : ""}" data-dashboard-tab="developer">Entwickler / Push-Diagnose</button>
              <button class="dashboard-monitor-tab ${dashboardTab === "live" ? "active" : ""}" data-dashboard-tab="live">Live-Monitor <span class="live-dot ${this._livePaused ? "paused" : ""}"></span></button>
            </div>
            ${dashboardTab === "developer" ? `<div class="dashboard-cards">${renderCards(developer)}</div>` : `<div id="liveMonitorHost">${this._liveMonitorHtml()}</div>`}
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
    const seen = /* @__PURE__ */ new Set();
    for (const item of [...existing, ...incoming]) {
      if (!item) continue;
      const key = `${item.ts || ""}|${String(item.value)}|${item.source || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
    merged.sort((a2, b2) => String(a2.ts || "").localeCompare(String(b2.ts || "")));
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
    const backendHistory = uid ? this._historyByUid.get(uid) || [] : [];
    const clientHistory = uid ? this._clientHistory.get(uid) || [] : [];
    const merged = [];
    const seen = /* @__PURE__ */ new Set();
    for (const item of [...backendHistory, ...clientHistory]) {
      if (!item) continue;
      const key = `${item.ts || ""}|${String(item.value)}|${item.source || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
    merged.sort((a2, b2) => String(a2.ts || "").localeCompare(String(b2.ts || "")));
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
    return rows.map(([k2, v2]) => `<div class="kv"><div class="k">${this._escape(k2)}</div><div class="v"><code>${this._escape(this._value(v2))}</code></div></div>`).join("");
  }
  _writeHtml(p2) {
    if (!p2.writable) return `<div class="muted">Dieser BACnet-Punkt ist laut Discovery nicht schreibbar.</div>`;
    return `<div class="edit-grid"><div><label>Neuer Wert</label><input id="writeValue" value="${this._escape(this._value(p2.present_value))}"></div><div><label>BACnet Priority</label><select id="writePriority">${Array.from({ length: 16 }, (_2, i2) => i2 + 1).map((v2) => `<option value="${v2}" ${v2 === 8 ? "selected" : ""}>${v2}</option>`).join("")}</select></div></div><div class="actions"><button id="writeValueBtn" ${this._writing ? "disabled" : ""}>Wert schreiben${this._writing ? " …" : ""}</button></div>`;
  }
  _formatTime(ts) {
    if (!ts) return "-";
    try {
      return new Date(ts).toLocaleTimeString();
    } catch (_2) {
      return String(ts);
    }
  }
  _render() {
    if (!this.shadowRoot) return;
    const sideScrollTop = this._rememberSideScroll();
    const active = this.shadowRoot.activeElement;
    const focusId = active?.id || null;
    const tableScrollTop = this.shadowRoot.getElementById("tableWrap")?.scrollTop ?? 0;
    const selectionStart = typeof active?.selectionStart === "number" ? active.selectionStart : null;
    const selectionEnd = typeof active?.selectionEnd === "number" ? active.selectionEnd : null;
    this._selected;
    const styles = `
      :host { display:block; color: var(--primary-text-color); background: var(--primary-background-color); height:100vh; overflow:hidden; }
      .wrap { height:100vh; box-sizing:border-box; padding: 12px 20px 16px; max-width: 1900px; margin: 0 auto; display:flex; flex-direction:column; overflow:hidden; }
      .header { flex:0 0 auto; display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:12px; }
      .header-actions-menu { position:relative; margin:0; }
      .mobile-actions-toggle { display:none; }
      .header-action-buttons { display:flex; gap:8px; align-items:center; }
      h1 { margin:0; font-size:28px; font-weight:500; }
      h2 { margin:0 0 4px 0; font-size:20px; font-weight:500; }
      h3 { margin:18px 0 8px 0; font-size:15px; font-weight:600; }
      .subtitle { color: var(--secondary-text-color); margin-top:4px; }
      .frontend-version { display:inline-flex; margin-top:6px; padding:2px 8px; border-radius:999px; border:1px solid var(--divider-color); color:var(--secondary-text-color); font-size:11px; background:var(--secondary-background-color); }
      .toolbar { flex:0 0 auto; display:flex; flex-wrap:wrap; gap:8px; align-items:flex-end; margin-bottom:8px; padding:8px; background:linear-gradient(135deg, color-mix(in srgb, var(--card-background-color) 96%, var(--primary-color)), var(--card-background-color)); }
      .toolbar > div { padding:4px 6px; }
      .toolbar .toolbar-nav { align-self:stretch; display:flex; align-items:center; padding:4px 12px 4px 4px; margin-right:2px; border-right:1px solid var(--divider-color); }
      .toolbar .search-field { flex:1 1 280px; min-width:220px; }
      .toolbar .filter-field { flex:0 1 145px; min-width:112px; }
      .toolbar .check-field { flex:0 1 132px; min-width:112px; }
      .toolbar .reset-field { flex:0 0 auto; }
      .toolbar .search-field input { max-width:none; border-color:color-mix(in srgb, var(--primary-color) 32%, var(--divider-color)); background:color-mix(in srgb, var(--secondary-background-color) 96%, var(--primary-color)); }
      .toolbar .search-field input:focus { outline:2px solid color-mix(in srgb, var(--primary-color) 42%, transparent); outline-offset:1px; border-color:var(--primary-color); }
      .toolbar label { margin-bottom:4px; font-size:10px; text-transform:uppercase; letter-spacing:.02em; }
      .toolbar input, .toolbar select { padding:7px 9px; font-size:12px; min-height:32px; }
      .toolbar .check { height:32px; font-size:12px; }
      .dashboard { flex:0 0 auto; margin-bottom:10px; }
      .dashboard-shell { border-radius:12px; background: var(--card-background-color); border:1px solid var(--divider-color); box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.18)); overflow:hidden; }
      .dashboard-toggle { width:100%; display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:0; background: var(--card-background-color); color: var(--primary-text-color); text-align:left; border:0; }
      .dashboard-toggle-title { font-weight:700; white-space:nowrap; }
      .dashboard-summary { color: var(--secondary-text-color); font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .chevron { font-size:16px; width:18px; }
      .dashboard-content { display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:0 10px 10px; }
      .dashboard-group { border-radius:11px; background:var(--secondary-background-color); border:1px solid var(--divider-color); padding:10px; min-width:0; }
      .dashboard-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--secondary-text-color); margin:0 2px 8px; }
      .dashboard-group-wide { grid-column:1 / -1; }
      .dashboard-monitor-group { padding:7px 8px 8px; min-width:0; }
      .dashboard-monitor-tabs { display:flex; align-items:center; gap:4px; margin-bottom:5px; overflow-x:auto; }
      .dashboard-monitor-tab { flex:0 0 auto; padding:4px 9px; border-radius:12px; background:transparent; color:var(--secondary-text-color); border:1px solid transparent; font-size:10px; }
      .dashboard-monitor-tab.active { color:var(--primary-text-color); border-color:var(--divider-color); background:color-mix(in srgb, var(--primary-color) 14%, var(--secondary-background-color)); }
      .live-dot { display:inline-block; width:7px; height:7px; margin-left:4px; border-radius:50%; background:var(--success-color, #43a047); box-shadow:0 0 0 2px color-mix(in srgb, var(--success-color, #43a047) 20%, transparent); }
      .live-dot.paused { background:var(--warning-color, #ffa600); }
      .live-monitor { min-width:0; }
      .live-summary { display:flex; align-items:center; flex-wrap:wrap; gap:6px 12px; color:var(--secondary-text-color); font-size:11px; margin-bottom:5px; }
      .live-summary b { color:var(--primary-text-color); }
      .live-small-btn { padding:4px 9px; min-height:26px; font-size:10px; margin-left:auto; }
      .live-chart { height:58px; display:flex; align-items:flex-end; gap:3px; padding:4px 6px; border:1px solid var(--divider-color); border-radius:8px; background:color-mix(in srgb, var(--secondary-background-color) 88%, transparent); overflow:hidden; }
      .live-chart i { flex:1 1 0; min-width:1px; border-radius:3px 3px 0 0; background:linear-gradient(180deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 55%, transparent)); }
      .live-filters { display:grid; grid-template-columns:minmax(150px,2fr) minmax(100px,.7fr) minmax(110px,.8fr) auto; gap:6px; margin:7px 0; }
      .live-filters input, .live-filters select { height:30px; padding:4px 8px; border-radius:7px; font-size:11px; }
      .live-table-wrap { max-height:155px; overflow:auto; border:1px solid var(--divider-color); border-radius:8px; }
      .live-table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:11px; }
      .live-table th { position:sticky; top:0; z-index:1; background:var(--secondary-background-color); color:var(--secondary-text-color); text-align:left; padding:5px 7px; }
      .live-table td { padding:5px 7px; border-top:1px solid color-mix(in srgb, var(--divider-color) 65%, transparent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .live-table tbody tr { cursor:pointer; }
      .live-table tbody tr:hover { background:color-mix(in srgb, var(--primary-color) 9%, transparent); }
      .live-table th:nth-child(1), .live-table td:nth-child(1) { width:72px; }
      .live-table th:nth-child(3), .live-table td:nth-child(3) { width:150px; }
      .live-table th:nth-child(4), .live-table td:nth-child(4) { width:70px; }
      .live-table td small { display:block; color:var(--secondary-text-color); overflow:hidden; text-overflow:ellipsis; }
      .live-value span { color:var(--primary-color); padding:0 5px; }
      .live-source { display:inline-flex; border:1px solid var(--divider-color); border-radius:10px; padding:1px 5px; font-size:10px; }
      .live-foot { color:var(--secondary-text-color); font-size:9px; margin-top:4px; text-align:right; }
      .dashboard-cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(132px,1fr)); gap:7px; }
      .stat { padding:8px 10px; min-height:38px; border-radius:9px; background:var(--secondary-background-color); border:1px solid var(--divider-color); min-width:0; display:flex; align-items:center; }
      .stat-ok { border-color: color-mix(in srgb, var(--success-color, #43a047) 45%, var(--divider-color)); background: color-mix(in srgb, var(--success-color, #43a047) 10%, var(--secondary-background-color)); }
      .stat-warn { border-color: color-mix(in srgb, var(--warning-color, #ffa600) 55%, var(--divider-color)); background: color-mix(in srgb, var(--warning-color, #ffa600) 12%, var(--secondary-background-color)); }
      .legacy-addon-warning { display:flex; gap:10px; align-items:flex-start; margin:0 0 12px; padding:10px 12px; border-radius:10px; border:1px solid color-mix(in srgb, var(--warning-color, #ffa600) 55%, var(--divider-color)); background:color-mix(in srgb, var(--warning-color, #ffa600) 12%, var(--card-background-color)); color:var(--primary-text-color); }
      .legacy-addon-warning strong { display:block; margin-bottom:2px; }
      .legacy-addon-warning small { display:block; line-height:1.4; color:var(--secondary-text-color); }
      .legacy-addon-warning .warning-icon { color:var(--warning-color, #ffa600); font-size:20px; line-height:1; }
      .stat-bad { border-color: color-mix(in srgb, var(--error-color, #db4437) 55%, var(--divider-color)); background: color-mix(in srgb, var(--error-color, #db4437) 12%, var(--secondary-background-color)); }
      .stat-muted { opacity:.78; }
      .stat-line { display:flex; align-items:center; gap:8px; min-width:0; width:100%; }
      .stat-icon { font-size:17px; width:21px; flex:0 0 21px; text-align:center; }
      .stat-value { font-size:16px; line-height:1.15; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .stat-label { color:var(--secondary-text-color); font-size:10px; line-height:1.2; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .card { background: var(--card-background-color); border-radius: 12px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.2)); border: 1px solid var(--divider-color); }
      input, select { width:100%; box-sizing:border-box; border:1px solid var(--divider-color); background: var(--secondary-background-color); color: var(--primary-text-color); border-radius:8px; padding:12px; font-size:15px; }
      label { display:block; font-size:12px; color: var(--secondary-text-color); margin-bottom:6px; }
      button { border:0; border-radius:20px; background: var(--primary-color); color: var(--text-primary-color); padding:10px 16px; cursor:pointer; font-weight:500; }
      button.secondary { background: var(--secondary-background-color); color: var(--primary-text-color); border:1px solid var(--divider-color); }
      button.danger { color: var(--error-color, #db4437); }
      button:disabled { opacity:.55; cursor:default; }
      .view-tabs { flex:0 0 auto; display:flex; flex-wrap:wrap; gap:6px; margin:0; }
      .view-tab { background:var(--secondary-background-color); color:var(--primary-text-color); border:1px solid var(--divider-color); border-radius:999px; padding:8px 14px; }
      .view-tab.active { background: color-mix(in srgb, var(--primary-color) 18%, var(--secondary-background-color)); border-color: color-mix(in srgb, var(--primary-color) 45%, var(--divider-color)); color:var(--primary-text-color); }
      .view-panel { flex:1 1 auto; min-height:0; margin-top:0; overflow:auto; }
      .virtual-actions { display:flex; flex-wrap:wrap; gap:6px; }
      .virtual-actions button { padding:6px 10px; font-size:12px; border-radius:14px; }
      .virtual-icon-actions { display:flex; align-items:center; gap:6px; flex-wrap:nowrap; }
      .icon-action { width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; padding:0; border-radius:50%; border:1px solid var(--divider-color); background:var(--secondary-background-color); color:var(--primary-text-color); cursor:pointer; font-size:14px; line-height:1; }
      .icon-action:hover { border-color:var(--primary-color); background:rgba(33,150,243,.12); }
      .icon-action.danger:hover { border-color:var(--error-color, #db4437); background:rgba(219,68,55,.14); color:var(--error-color, #db4437); }
      .icon-action:disabled { opacity:.45; cursor:default; }
      .compact-source { appearance:none; border:0; background:transparent; color:var(--primary-color); padding:0; font:inherit; font-weight:600; cursor:pointer; text-align:left; }
      .compact-source:hover { text-decoration:underline; }
      .virtual-type-badge { display:inline-flex; align-items:center; gap:4px; border:1px solid var(--divider-color); background:rgba(255,255,255,.04); border-radius:999px; padding:3px 8px; white-space:nowrap; font-weight:600; }
      .virtual-state-badge { display:inline-flex; align-items:center; justify-content:center; min-width:44px; border-radius:999px; padding:3px 8px; font-size:11px; font-weight:700; border:1px solid var(--divider-color); }
      .virtual-state-badge.on { color:#7ee787; background:rgba(46,160,67,.18); border-color:rgba(46,160,67,.45); }
      .virtual-state-badge.off { color:var(--secondary-text-color); background:rgba(128,128,128,.16); border-color:rgba(128,128,128,.35); }
      .virtual-state-badge.unavailable, .virtual-state-badge.unknown { color:#ffb86c; background:rgba(255,184,108,.15); border-color:rgba(255,184,108,.4); }
      .virtual-badge { display:inline-flex; align-items:center; gap:4px; width:max-content; border-radius:999px; border:1px solid var(--divider-color); background:var(--secondary-background-color); color:var(--secondary-text-color); padding:1px 7px; font-size:11px; margin-top:3px; }
      .check { display:flex; gap:8px; align-items:center; height:44px; color: var(--primary-text-color); }
      .check input { width:auto; }
      #explorerView { flex:1 1 auto; min-height:0; display:flex; flex-direction:column; overflow:hidden; }
      .content { flex:1 1 auto; height:100%; min-height:0; display:grid; grid-template-columns: minmax(0, 3fr) minmax(560px, 2fr); gap:12px; overflow:hidden; }
      .content.details-hidden { grid-template-columns: minmax(0, 1fr); }
      .content.details-hidden .side { display:none; }
      .side { padding:0; height:100%; min-height:0; overflow:hidden; display:flex; flex-direction:column; }
      .side-tabs { flex:0 0 auto; display:flex; gap:6px; padding:10px 12px 0 12px; border-bottom:1px solid var(--divider-color); background:var(--card-background-color); position:relative; z-index:30; box-shadow:0 1px 0 var(--divider-color); overflow-x:auto; overflow-y:hidden; scrollbar-width:thin; }
      .side-tab { border:1px solid var(--divider-color); border-bottom:0; border-radius:10px 10px 0 0; background:var(--secondary-background-color); color:var(--primary-text-color); padding:8px 10px; font-size:12px; }
      .side-tab.active { background:color-mix(in srgb, var(--primary-color) 18%, var(--card-background-color)); border-color:color-mix(in srgb, var(--primary-color) 45%, var(--divider-color)); }
      .side-body { flex:1 1 auto; min-height:0; overflow-y:auto; overflow-x:hidden; padding:14px 16px 16px 16px; position:relative; }
      .side-section-head { background:var(--card-background-color); margin:-14px -16px 12px -16px; padding:14px 16px 10px 16px; border-bottom:1px solid var(--divider-color); }
      .point-inspector-head { position:sticky; top:-14px; z-index:25; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin:-14px -16px 12px -16px; padding:14px 16px 10px 16px; border-bottom:1px solid var(--divider-color); background:color-mix(in srgb, var(--card-background-color) 96%, transparent); box-shadow:0 2px 8px rgba(0,0,0,.16); backdrop-filter:blur(10px); }
      .point-inspector-head h2 { font-weight:700; overflow-wrap:anywhere; }
      .inspector-head-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:6px; flex:0 0 auto; }
      .inspector-head-actions button { padding:7px 11px; font-size:12px; white-space:nowrap; }
      .save-hint { margin:8px 0 12px; }
      .dirty-banner { margin:8px 0; padding:8px 10px; border-radius:8px; border:1px solid color-mix(in srgb, var(--warning-color, #ffa600) 55%, var(--divider-color)); background:color-mix(in srgb, var(--warning-color, #ffa600) 12%, var(--card-background-color)); }
      .validation-errors { margin:8px 0; padding:8px 10px; border-radius:8px; color:var(--error-color, #db4437); border:1px solid color-mix(in srgb, var(--error-color, #db4437) 55%, var(--divider-color)); }
      .priority-warning { margin:8px 0; padding:8px 10px; border-radius:8px; border:1px solid color-mix(in srgb, var(--warning-color, #ffa600) 55%, var(--divider-color)); }
      .pending-reload { display:inline-flex; align-items:center; border-radius:999px; padding:4px 9px; font-size:11px; background:color-mix(in srgb, var(--warning-color, #ffa600) 16%, var(--secondary-background-color)); border:1px solid color-mix(in srgb, var(--warning-color, #ffa600) 48%, var(--divider-color)); }
      .point-summary { display:grid; grid-template-columns:1fr auto; gap:10px; align-items:start; border:1px solid var(--divider-color); border-radius:10px; background:var(--secondary-background-color); padding:10px; margin:0 0 12px 0; }
      .point-summary-title { font-size:16px; font-weight:700; line-height:1.2; overflow-wrap:anywhere; }
      .point-summary-sub { color:var(--secondary-text-color); font-size:12px; margin-top:3px; overflow-wrap:anywhere; }
      .point-summary-value { justify-self:end; display:flex; flex-direction:column; align-items:flex-end; gap:4px; min-width:74px; }
      .point-summary-value strong { font-size:18px; line-height:1; }
      .point-summary-unit { color:var(--secondary-text-color); font-size:12px; }
      .point-summary-meta { grid-column:1 / -1; display:flex; flex-wrap:wrap; gap:6px; }
      .side .virtual-overview { margin:0; border:0; box-shadow:none; background:transparent; padding:0; }
      .side .virtual-table { min-width:0; table-layout:auto; }
      .side .virtual-table th, .side .virtual-table td { font-size:11px; padding:6px; }
      .side-virtual-cards { display:flex; flex-direction:column; gap:10px; }
      .side-virtual-card { border:1px solid var(--divider-color); border-radius:12px; padding:10px; background:rgba(255,255,255,.03); }
      .side-virtual-card-title { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
      .side-virtual-card-name { font-weight:700; overflow:hidden; text-overflow:ellipsis; }
      .side-virtual-card-meta { display:flex; align-items:center; gap:8px; color:var(--secondary-text-color); font-size:12px; margin:4px 0; overflow:hidden; overflow-wrap:anywhere; }
      .side-virtual-card-rules { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; margin:8px 0; }
      .side-virtual-card-rules div { min-width:0; border:1px solid var(--divider-color); border-radius:8px; padding:5px; background:rgba(0,0,0,.12); }
      .side-virtual-card-rules span { display:block; color:var(--secondary-text-color); font-size:10px; }
      .side-virtual-card-rules code { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .side-virtual-card { border:1px solid color-mix(in srgb, var(--divider-color) 84%, var(--primary-color)); border-radius:10px; background:linear-gradient(180deg, color-mix(in srgb, var(--secondary-background-color) 92%, var(--primary-color)), var(--secondary-background-color)); padding:10px; overflow:hidden; }
      .side-virtual-card-title { display:flex; align-items:center; justify-content:space-between; gap:8px; font-weight:700; }
      .side-virtual-card-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .side-virtual-card-meta { color:var(--secondary-text-color); font-size:12px; overflow-wrap:anywhere; margin-top:3px; }
      .side-virtual-card-rules { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-top:8px; font-size:11px; }
      .side-virtual-card-rules div { border:1px solid var(--divider-color); border-radius:8px; padding:5px 6px; background:var(--card-background-color); min-width:0; }
      .side-virtual-card-rules span { display:block; color:var(--secondary-text-color); margin-bottom:2px; }
      .side-virtual-card-rules code { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; }
      .virtual-rule-flow { display:grid; grid-template-columns:1fr auto 1fr; gap:6px; align-items:center; margin:9px 0; }
      .virtual-rule-box { min-width:0; border:1px solid var(--divider-color); border-radius:8px; background:var(--card-background-color); padding:6px 8px; }
      .virtual-rule-box span { display:block; color:var(--secondary-text-color); font-size:10px; text-transform:uppercase; letter-spacing:.03em; margin-bottom:2px; }
      .virtual-rule-box code { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .virtual-rule-arrow { color:var(--secondary-text-color); font-size:13px; }
      .selected-source-box { border:1px solid var(--divider-color); border-radius:10px; padding:10px; margin:0 0 12px 0; background:var(--secondary-background-color); }
      table { width:100%; min-width:980px; border-collapse:collapse; table-layout:fixed; }
      col.select-col-col { width:42px; }
      col.object-col-col { width:210px; }
      col.entity-col-col { width:auto; min-width:330px; }
      col.value-col-col { width:108px; }
      col.unit-col-col { width:130px; }
      col.override-col-col { width:90px; }
      col.runtime-col-col { width:42px; }
      th, td { text-align:left; padding:9px 12px; border-bottom:1px solid color-mix(in srgb, var(--divider-color) 72%, transparent); font-size:13px; vertical-align:middle; overflow:hidden; text-overflow:ellipsis; }
      th[data-sort='present_value'], td[data-col='value'], th[data-sort='override'], td[data-col='override'], th[data-sort='runtime'], td[data-col='status'] { text-align:center; }
      td[data-col='entity'] { white-space:normal; }
      td[data-col='value'] { padding-left:6px; padding-right:6px; }
      td[data-col='override'] { padding-left:6px; padding-right:6px; }
      td[data-col='status'] { padding-left:6px; padding-right:6px; }
      th { color: var(--secondary-text-color); font-weight:600; font-size:12px; position:sticky; top:0; background: color-mix(in srgb, var(--card-background-color) 94%, var(--primary-background-color)); z-index:20; overflow:hidden; box-shadow: 0 1px 0 var(--divider-color); }
      th.sortable { cursor:pointer; user-select:none; }
      .sort-btn { border:0; border-radius:0; background:transparent; color:inherit; padding:0; font:inherit; cursor:pointer; }
      td.select-col { position:sticky; left:0; z-index:2; background:var(--card-background-color); }
      th.select-col { position:sticky; left:0; z-index:30; background:var(--card-background-color); }
      td[data-col='object'] { position:sticky; left:42px; z-index:2; background:var(--card-background-color); box-shadow: 1px 0 0 var(--divider-color); }
      th.object-col { position:sticky; left:42px; z-index:29; background:var(--card-background-color); box-shadow: 1px 0 0 var(--divider-color), 0 1px 0 var(--divider-color); }

      .rule-help { margin-top:8px; padding:8px 10px; border-radius:8px; background:var(--secondary-background-color); font-size:12px; line-height:1.45; }
      .rule-help code { font-family:var(--code-font-family, monospace); background:rgba(127,127,127,.12); border-radius:4px; padding:1px 4px; }
      .virtual-overview { margin:0 0 12px 0; padding:12px; }
      .virtual-filterbar { grid-template-columns: minmax(260px, 520px) auto 1fr; }
      tr.source-jump-highlight { outline:2px solid var(--primary-color); background: color-mix(in srgb, var(--primary-color) 18%, transparent) !important; }
      .virtual-overview-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
      .virtual-overview-title { font-weight:700; }
      .virtual-table-wrap { overflow:auto; }
      .virtual-table { width:100%; min-width:860px; table-layout:fixed; }
      .virtual-table th, .virtual-table td { position:static; padding:10px 8px; font-size:12px; white-space:normal; overflow-wrap:anywhere; vertical-align:middle; }
      .virtual-table th:nth-child(1) { width:110px; }
      .virtual-table th:nth-child(2) { width:300px; }
      .virtual-table th:nth-child(3) { width:120px; }
      .virtual-table th:nth-child(4) { width:80px; }
      .virtual-table th:nth-child(5), .virtual-table th:nth-child(6), .virtual-table th:nth-child(7) { width:90px; }
      .virtual-table th:nth-child(8) { width:170px; }
      .virtual-table tr { cursor:default; }
      .virtual-table .link-cell { font-size:13px; }
      .virtual-name-link { color:var(--primary-text-color); font-weight:600; }
      .entity-id-line { margin-top:3px; font-size:11px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
      .virtual-source-btn { appearance:none; border:0; background:transparent; color:var(--primary-color); padding:0; font:inherit; cursor:pointer; text-align:left; }
      .virtual-source-btn:hover { text-decoration:underline; }
      .assistant-card { margin:10px 0 12px; padding:10px 12px; border:1px solid color-mix(in srgb, var(--primary-color) 35%, var(--divider-color)); border-radius:10px; background:color-mix(in srgb, var(--primary-color) 8%, var(--card-background-color)); }
      .assistant-card .assistant-title { font-weight:700; margin-bottom:4px; }
      .assistant-card .assistant-grid { display:grid; grid-template-columns:82px minmax(0,1fr); gap:3px 8px; margin-top:8px; font-size:12px; }
      .assistant-card .assistant-grid span:nth-child(odd) { color:var(--secondary-text-color); }
      .assistant-card button { margin-top:10px; }
      .rule-preview { margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .rule-preview > div { border:1px solid var(--divider-color); border-radius:8px; padding:8px 10px; background:var(--card-background-color); }
      .rule-preview span, .rule-preview strong { display:block; }
      .rule-result.on { color:var(--success-color, #0b8); }
      .rule-result.off { color:var(--secondary-text-color); }
      .rule-result.unav { color:var(--error-color, #d33); }

      .virtual-spacer td { padding:0 !important; border-bottom:0 !important; }
      .virtual-spacer:hover { background:transparent; }
      tr:hover td[data-col='object'], tr:hover td.select-col { background:var(--secondary-background-color); }
      tr.selected td[data-col='object'], tr.selected td.select-col { background: color-mix(in srgb, var(--primary-color) 16%, var(--card-background-color)); }
      .inline-select { min-width:100px; max-width:140px; padding:6px 8px; font-size:13px; border-radius:7px; }
      .unit-stack { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      .unit-display { font-weight:600; }
      tr { cursor:pointer; }
      tr:hover { background: color-mix(in srgb, var(--secondary-background-color) 88%, var(--primary-color)); }
      tr.selected { background: color-mix(in srgb, var(--primary-color) 16%, transparent); outline: 1px solid color-mix(in srgb, var(--primary-color) 28%, transparent); }
      tr.value-up { --bepacom-change-color: var(--success-color, #43a047); }
      tr.value-down { --bepacom-change-color: var(--error-color, #e53935); }
      tr.value-changed { --bepacom-change-color: var(--warning-color, #fb8c00); }
      tr.value-flash td[data-col='value'] .value-link { animation: bepacom-value-pill 3.2s ease-out; }
      tr.value-flash td[data-col='value'] .value-link::after { animation: bepacom-value-ring 1.6s ease-out; }
      @keyframes bepacom-value-pill {
        0% {
          color: var(--primary-text-color);
          background: color-mix(in srgb, var(--bepacom-change-color, #43a047) 34%, var(--card-background-color));
          box-shadow:
            0 0 0 1px color-mix(in srgb, var(--bepacom-change-color, #43a047) 60%, transparent),
            0 0 18px color-mix(in srgb, var(--bepacom-change-color, #43a047) 34%, transparent);
          transform: translateY(-1px) scale(1.035);
        }
        22% {
          background: color-mix(in srgb, var(--bepacom-change-color, #43a047) 22%, var(--card-background-color));
          box-shadow:
            0 0 0 1px color-mix(in srgb, var(--bepacom-change-color, #43a047) 42%, transparent),
            0 0 12px color-mix(in srgb, var(--bepacom-change-color, #43a047) 24%, transparent);
          transform: translateY(0) scale(1);
        }
        100% {
          color: var(--primary-text-color);
          background: transparent;
          box-shadow: 0 0 0 1px transparent, 0 0 0 transparent;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes bepacom-value-ring {
        0% { opacity:.95; transform:scale(.88); }
        70% { opacity:0; transform:scale(1.32); }
        100% { opacity:0; transform:scale(1.32); }
      }
      .table-wrap { display:block; align-self:stretch; width:100%; height:100%; max-height:100%; min-height:0; overflow-x:auto; overflow-y:scroll; overscroll-behavior:contain; touch-action:pan-y; scrollbar-color: color-mix(in srgb, var(--secondary-text-color) 42%, transparent) transparent; scrollbar-width:thin; }
      .table-wrap::-webkit-scrollbar, .side-body::-webkit-scrollbar, .view-panel::-webkit-scrollbar, .virtual-table-wrap::-webkit-scrollbar { width:8px; height:8px; }
      .table-wrap::-webkit-scrollbar-thumb, .side-body::-webkit-scrollbar-thumb, .view-panel::-webkit-scrollbar-thumb, .virtual-table-wrap::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--secondary-text-color) 36%, transparent); border-radius:999px; }
      .table-wrap::-webkit-scrollbar-track, .side-body::-webkit-scrollbar-track, .view-panel::-webkit-scrollbar-track, .virtual-table-wrap::-webkit-scrollbar-track { background:transparent; }
      .select-col { width:36px; text-align:center; }
      .object-main { display:flex; align-items:center; gap:10px; }
      .type-icon { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:10px; font-size:11px; font-weight:800; letter-spacing:.2px; color:white; flex:0 0 auto; }
      .type-ai { background:#1e88e5; } .type-ao { background:#8e24aa; } .type-av { background:#00897b; }
      .type-bi { background:#43a047; } .type-bo { background:#ef6c00; } .type-bv { background:#6d4c41; }
      .type-ms { background:#546e7a; } .type-other { background:#757575; }
      .group-row td { background: color-mix(in srgb, var(--primary-color) 10%, var(--card-background-color)); position:sticky; top:0; z-index:1; }
      .group-toggle { appearance:none; border:0; background:transparent; color:var(--primary-text-color); font-weight:700; cursor:pointer; padding:6px 0; }
      .virtual-spacer td { padding:0; border:0; }
      .bulkbar { flex:0 0 auto; display:flex; flex-wrap:wrap; gap:10px; align-items:end; padding:10px 12px; margin-bottom:10px; }
      .bulkbar-empty { color: var(--secondary-text-color); font-size:12px; margin-bottom:8px; }
      .bulkbar label { display:flex; flex-direction:column; gap:3px; font-size:11px; color:var(--secondary-text-color); }
      .bulkbar select { min-width:130px; }
      .name { font-weight:700; }
      .muted { color: var(--secondary-text-color); font-size:12px; }

      .link-cell { appearance:none; border:0; background:transparent; color:var(--primary-text-color); padding:0; margin:0; font:inherit; text-align:left; cursor:pointer; }
      .link-cell:hover { color:var(--primary-color); text-decoration:underline; }
      .value-link { position:relative; display:inline-flex; align-items:center; justify-content:center; min-width:44px; max-width:100%; padding:4px 9px; border-radius:999px; font-weight:700; font-size:14px; line-height:1.25; transition:background .18s ease, box-shadow .18s ease, color .18s ease; }
      .value-link::after { content:""; position:absolute; inset:-4px; border-radius:inherit; border:1px solid var(--bepacom-change-color, #43a047); opacity:0; pointer-events:none; }
      .entity-stack { display:flex; flex-direction:column; gap:4px; min-width:0; }
      .linked-entities { display:flex; flex-direction:column; gap:3px; min-width:0; }
      .linked-entity-link { appearance:none; border:0; background:transparent; color:var(--secondary-text-color); padding:0; margin:0; font:inherit; font-size:12px; line-height:1.25; text-align:left; cursor:pointer; max-width:100%; display:flex; align-items:center; gap:4px; white-space:normal; overflow-wrap:anywhere; }
      .linked-entity-link:hover { color:var(--primary-color); text-decoration:underline; }
      .linked-entity-link:disabled { opacity:.65; cursor:default; text-decoration:none; }
      .linked-icon { flex:0 0 auto; opacity:.9; }
      .linked-name { min-width:0; overflow-wrap:anywhere; }
      .linked-state { display:inline-flex; align-items:center; border-radius:999px; padding:1px 6px; margin-left:4px; font-size:11px; background:var(--secondary-background-color); border:1px solid var(--divider-color); color:var(--primary-text-color); white-space:nowrap; }
      .runtime-filter { gap:6px; }
      .runtime-head { text-align:center; }
      .write-profile-head, .write-profile-cell { width:72px; text-align:center; }
      .write-profile-dot { display:inline-block; width:11px; height:11px; border-radius:50%; vertical-align:middle; border:1px solid color-mix(in srgb, var(--divider-color) 55%, transparent); }
      .write-profile-dot.direct { background:#1e88e5; box-shadow:0 0 0 3px color-mix(in srgb, #1e88e5 18%, transparent); }
      .write-profile-dot.glt { background:#8e24aa; box-shadow:0 0 0 3px color-mix(in srgb, #8e24aa 18%, transparent); }
      .runtime-dot { display:inline-flex; width:12px; height:12px; border-radius:50%; border:1px solid color-mix(in srgb, var(--divider-color) 70%, transparent); box-shadow:0 0 0 3px color-mix(in srgb, var(--divider-color) 20%, transparent); vertical-align:middle; }
      .runtime-off { background:#7a7a7a; }
      .runtime-poll { background:#f57c00; box-shadow:0 0 0 3px color-mix(in srgb, #f57c00 18%, transparent); }
      .runtime-push { background:#43a047; box-shadow:0 0 0 3px color-mix(in srgb, #43a047 18%, transparent); }
      .runtime-snapshot { background:#1e88e5; box-shadow:0 0 0 3px color-mix(in srgb, #1e88e5 18%, transparent); }
      .runtime-wait { background:#ffa600; box-shadow:0 0 0 3px color-mix(in srgb, #ffa600 18%, transparent); }
      .mode-chip { display:inline-flex; align-items:center; gap:6px; width:max-content; border-radius:999px; border:1px solid var(--divider-color); background:var(--secondary-background-color); color:var(--primary-text-color); padding:3px 8px; font-size:12px; font-weight:600; }
      .mode-chip::before { content:""; width:8px; height:8px; border-radius:50%; background:#7a7a7a; box-shadow:0 0 0 3px color-mix(in srgb, #7a7a7a 18%, transparent); }
      .mode-chip.push { border-color:color-mix(in srgb, #1e88e5 48%, var(--divider-color)); background:color-mix(in srgb, #1e88e5 12%, var(--secondary-background-color)); }
      .mode-chip.push::before { background:#1e88e5; box-shadow:0 0 0 3px color-mix(in srgb, #1e88e5 18%, transparent); }
      .mode-chip.polling { border-color:color-mix(in srgb, #43a047 48%, var(--divider-color)); background:color-mix(in srgb, #43a047 12%, var(--secondary-background-color)); }
      .mode-chip.polling::before { background:#43a047; box-shadow:0 0 0 3px color-mix(in srgb, #43a047 18%, transparent); }
      .mode-chip.wait { border-color:color-mix(in srgb, #ffa600 48%, var(--divider-color)); background:color-mix(in srgb, #ffa600 12%, var(--secondary-background-color)); }
      .mode-chip.wait::before { background:#ffa600; box-shadow:0 0 0 3px color-mix(in srgb, #ffa600 18%, transparent); }
      .mode-chip.off { color:var(--secondary-text-color); }
      .pill { display:inline-flex; align-items:center; border-radius:999px; padding:3px 8px; font-size:12px; background: var(--secondary-background-color); border:1px solid var(--divider-color); margin-right:4px; white-space:nowrap; }
      .ok { color: var(--success-color, #43a047); }
      .warn { color: var(--warning-color, #ffa600); }
      .bad { color: var(--error-color, #db4437); }
      .details-toggle-active { background: color-mix(in srgb, var(--primary-color) 16%, var(--secondary-background-color)) !important; border-color: color-mix(in srgb, var(--primary-color) 38%, var(--divider-color)) !important; }
      .kv { display:grid; grid-template-columns: 145px minmax(0, 1fr); gap:8px; padding:7px 0; border-bottom:1px solid var(--divider-color); }
      .kv .k { color: var(--secondary-text-color); }
      .kv .v { overflow-wrap:anywhere; }
      .edit-grid { display:grid; grid-template-columns: 1fr; gap:10px; }
      .actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
      .history-list { border:1px solid var(--divider-color); border-radius:8px; overflow:hidden; }
      .history-row { display:grid; grid-template-columns: 90px 1fr 80px; gap:8px; padding:6px 8px; border-bottom:1px solid var(--divider-color); font-size:13px; }
      .history-row:last-child { border-bottom:0; }
      code { font-family: var(--code-font-family, monospace); font-size:12px; }
      details summary { cursor:pointer; margin: 8px 0; color: var(--primary-text-color); }
      details.detail-section { border:1px solid var(--divider-color); border-radius:10px; padding:8px 10px; margin-top:12px; background: var(--secondary-background-color); }
      details.detail-section > summary { font-weight:700; margin:0; }
      .detail-section-body { margin-top:12px; }
      .notice { background: color-mix(in srgb, var(--primary-color) 12%, transparent); border:1px solid color-mix(in srgb, var(--primary-color) 35%, transparent); border-radius:8px; padding:10px; margin:10px 0; }
      .error { background: color-mix(in srgb, var(--error-color, #db4437) 16%, transparent); color: var(--error-color, #db4437); border: 1px solid color-mix(in srgb, var(--error-color, #db4437) 35%, transparent); border-radius:8px; padding:12px; margin-bottom:12px; }
      .empty { padding:32px; text-align:center; color: var(--secondary-text-color); }

      /* Warm dashboard design inspired by the supplied visual reference. */
      :host {
        --primary-color:#e7902f;
        --accent-color:#e7902f;
        --primary-text-color:#f6f3ed;
        --text-primary-color:#17130e;
        --secondary-text-color:#bbb4a9;
        --card-background-color:rgba(55,52,48,.82);
        --secondary-background-color:rgba(81,76,69,.48);
        --divider-color:rgba(255,255,255,.105);
        --bp-surface:rgba(55,52,48,.82);
        --bp-surface-strong:rgba(62,58,53,.94);
        --bp-surface-soft:rgba(255,255,255,.055);
        --bp-shadow:0 18px 45px rgba(0,0,0,.22);
        --bp-radius:17px;
        color-scheme:dark;
        font-family:Inter,"SF Pro Display","Segoe UI Variable","Segoe UI",Roboto,sans-serif;
        background:
          radial-gradient(85% 60% at 48% 108%, rgba(201,135,55,.44) 0%, rgba(129,91,48,.16) 42%, transparent 72%),
          radial-gradient(55% 48% at 7% 18%, rgba(255,255,255,.075), transparent 70%),
          linear-gradient(145deg,#252422 0%,#1b1a19 54%,#24201b 100%);
      }
      .wrap { padding:18px 22px 20px; }
      .header { margin-bottom:16px; }
      h1 { font-size:27px; line-height:1.08; font-weight:760; letter-spacing:-.045em; color:#fffdf8; }
      h2 { font-weight:700; letter-spacing:-.025em; }
      h3 { font-weight:680; letter-spacing:-.01em; }
      .subtitle { margin-top:7px; color:#aaa398; font-size:12px; }
      .frontend-version {
        margin-top:8px; padding:4px 9px; border-color:rgba(255,255,255,.09);
        background:rgba(255,255,255,.045); color:#aaa398; font-size:10px;
      }
      .card,.dashboard-shell,.toolbar,.side {
        border-color:rgba(255,255,255,.105);
        border-radius:var(--bp-radius);
        background:linear-gradient(145deg,rgba(71,67,61,.82),rgba(47,45,42,.88));
        box-shadow:var(--bp-shadow),inset 0 1px 0 rgba(255,255,255,.04);
        backdrop-filter:blur(18px) saturate(112%);
      }
      .dashboard-shell { overflow:hidden; }
      .dashboard-toggle {
        min-height:48px; padding:12px 16px;
        background:linear-gradient(90deg,rgba(255,255,255,.035),transparent);
      }
      .dashboard-toggle-title { font-size:13px; letter-spacing:-.01em; }
      .dashboard-summary { color:#aaa398; font-size:11px; }
      .dashboard-content { gap:11px; padding:0 12px 12px; }
      .dashboard-group {
        padding:12px; border-color:rgba(255,255,255,.075); border-radius:14px;
        background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.025));
      }
      .dashboard-title { color:#d0c9be; font-size:10px; letter-spacing:.09em; }
      .dashboard-monitor-tab { padding:6px 11px; border-radius:999px; }
      .dashboard-monitor-tab.active {
        color:#fff9ef; border-color:rgba(231,144,47,.45);
        background:rgba(231,144,47,.16);
      }
      button {
        min-height:34px; border-radius:999px; padding:8px 14px;
        background:linear-gradient(135deg,#efa044,#d87d20);
        color:#18130d; font-family:inherit; font-size:12px; font-weight:650;
        box-shadow:0 5px 15px rgba(195,112,28,.16);
        transition:transform .16s ease,filter .16s ease,border-color .16s ease,background .16s ease;
      }
      button:hover:not(:disabled) { filter:brightness(1.07); transform:translateY(-1px); }
      button:active:not(:disabled) { transform:translateY(0); }
      button.secondary,.view-tab,.icon-action {
        color:#eee9e1; border-color:rgba(255,255,255,.105);
        background:rgba(255,255,255,.055); box-shadow:none;
      }
      button.secondary:hover:not(:disabled),.view-tab:hover,.icon-action:hover {
        border-color:rgba(231,144,47,.42); background:rgba(231,144,47,.11);
      }
      .view-tab.active,.details-toggle-active {
        color:#fff8ed!important; border-color:rgba(231,144,47,.48)!important;
        background:linear-gradient(135deg,rgba(231,144,47,.23),rgba(231,144,47,.1))!important;
      }
      input,select {
        min-height:38px; padding:9px 11px;
        border-color:rgba(255,255,255,.1); border-radius:11px;
        background:rgba(20,19,18,.35); color:#f5f1e9;
        font-family:inherit; font-size:13px;
      }
      input:focus,select:focus {
        outline:2px solid rgba(231,144,47,.3); outline-offset:1px;
        border-color:rgba(231,144,47,.62);
      }
      label { color:#aaa398; font-size:10px; letter-spacing:.045em; text-transform:uppercase; }
      .bulkbar { border-radius:14px; background:rgba(59,56,52,.7); }
      .table-wrap {
        border:1px solid rgba(255,255,255,.1); border-radius:var(--bp-radius);
        background:linear-gradient(150deg,rgba(59,56,52,.88),rgba(41,39,37,.92));
        box-shadow:var(--bp-shadow),inset 0 1px 0 rgba(255,255,255,.035);
      }
      table { border-collapse:separate; border-spacing:0; }
      th {
        background:rgba(39,37,35,.94)!important; color:#aaa398;
        font-size:10px; font-weight:650; letter-spacing:.055em; text-transform:uppercase;
      }
      td { border-color:rgba(255,255,255,.065)!important; }
      tbody tr { transition:background .15s ease,box-shadow .15s ease; }
      tbody tr:hover:not(.group-row) { background:rgba(255,255,255,.035); }
      tbody tr.selected {
        background:linear-gradient(90deg,rgba(231,144,47,.18),rgba(231,144,47,.055));
        box-shadow:inset 3px 0 0 #e7902f;
      }
      .group-row td { background:rgba(231,144,47,.09); }
      .name { color:#faf7f0; font-weight:650; letter-spacing:-.01em; }
      .muted { color:#aaa398; }
      .value-link {
        color:#f6d39f; background:rgba(231,144,47,.085);
        border:1px solid rgba(231,144,47,.16);
      }
      .pill,.virtual-badge,.linked-state,.mode-chip {
        border-color:rgba(255,255,255,.1); background:rgba(255,255,255,.05);
      }
      .side-tabs {
        padding:11px 12px 0; gap:5px; border-color:rgba(255,255,255,.08);
        background:rgba(39,37,35,.6); box-shadow:none;
      }
      .side-tab {
        min-height:32px; padding:7px 11px; border-radius:10px 10px 0 0;
        color:#aaa398; border-color:transparent; background:transparent; box-shadow:none;
      }
      .side-tab.active {
        color:#fff7eb; border-color:rgba(231,144,47,.3);
        background:linear-gradient(180deg,rgba(231,144,47,.2),rgba(231,144,47,.07));
      }
      .side-body { padding:17px 18px 18px; }
      .side-section-head,.point-inspector-head {
        margin-left:-18px; margin-right:-18px; padding-left:18px; padding-right:18px;
        border-color:rgba(255,255,255,.075);
        background:linear-gradient(180deg,rgba(58,55,51,.96),rgba(49,47,44,.9));
      }
      details.detail-section {
        padding:10px 12px; border-color:rgba(255,255,255,.085); border-radius:13px;
        background:rgba(255,255,255,.035);
      }
      details.detail-section > summary { font-size:12px; color:#e8e2d9; }
      .kv { border-color:rgba(255,255,255,.065); }
      .kv .k { color:#aaa398; font-size:11px; }
      .live-chart,.live-table-wrap,.history-list {
        border-color:rgba(255,255,255,.085); background:rgba(15,14,13,.18);
      }
      .live-chart i { background:linear-gradient(180deg,#f5ad56,#c96f1d); }
      ::-webkit-scrollbar { width:8px; height:8px; }
      ::-webkit-scrollbar-thumb { background:rgba(217,166,104,.25); border-radius:999px; }
      ::-webkit-scrollbar-thumb:hover { background:rgba(231,144,47,.42); }

      /* Reference pass: neutral smoked glass with one restrained warm glow. */
      :host {
        --primary-color:#d88c39;
        --accent-color:#d88c39;
        --primary-text-color:#f4f2ed;
        --text-primary-color:#f4f2ed;
        --secondary-text-color:#c0bbb2;
        --card-background-color:rgba(70,69,66,.78);
        --secondary-background-color:rgba(255,255,255,.065);
        --divider-color:rgba(255,255,255,.09);
        --bp-shadow:0 12px 34px rgba(0,0,0,.16);
        --bp-radius:13px;
        background:
          radial-gradient(70% 44% at 38% 42%,rgba(191,139,67,.28) 0%,rgba(157,113,56,.13) 38%,transparent 70%),
          linear-gradient(135deg,#343433 0%,#2c2b2a 48%,#39342f 100%);
      }
      .wrap { padding:16px 20px 18px; }
      h1 { font-size:25px; font-weight:720; letter-spacing:-.035em; }
      .subtitle { color:#bdb8af; }
      .card,.dashboard-shell,.toolbar,.side,.table-wrap {
        border:1px solid rgba(255,255,255,.1);
        border-radius:13px;
        background:rgba(72,70,67,.7);
        box-shadow:var(--bp-shadow),inset 0 1px 0 rgba(255,255,255,.035);
        backdrop-filter:blur(22px) saturate(108%);
      }
      .dashboard-toggle {
        background:rgba(255,255,255,.018);
        color:#f4f2ed;
      }
      .dashboard-content { gap:9px; }
      .dashboard-group {
        border:0;
        border-radius:11px;
        background:rgba(255,255,255,.055);
      }
      .dashboard-monitor-tab.active {
        color:#fff;
        border-color:rgba(255,255,255,.32);
        background:rgba(255,255,255,.09);
      }
      button {
        color:#f4f2ed;
        border:1px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.065);
        box-shadow:none;
        font-weight:580;
      }
      button:hover:not(:disabled) {
        border-color:rgba(255,255,255,.28);
        background:rgba(255,255,255,.11);
        filter:none;
      }
      button.secondary,.view-tab,.icon-action {
        color:#f4f2ed;
        border-color:rgba(255,255,255,.1);
        background:rgba(255,255,255,.045);
      }
      #saveOverride {
        color:#21170c;
        border-color:rgba(224,146,57,.75);
        background:#dc913d;
      }
      .view-tab.active,.details-toggle-active {
        color:#fff!important;
        border-color:rgba(255,255,255,.3)!important;
        background:rgba(255,255,255,.095)!important;
      }
      input,select {
        border-color:rgba(255,255,255,.085);
        border-radius:9px;
        background:rgba(30,29,28,.28);
      }
      select {
        color-scheme:dark;
        accent-color:#d88c39;
      }
      select option,select optgroup {
        color:#f3f0ea;
        background:#45433f;
      }
      select option:checked {
        color:#fff7ec;
        background:#7a5732;
      }
      input:focus,select:focus {
        outline:1px solid rgba(216,140,57,.46);
        border-color:rgba(216,140,57,.52);
      }
      .table-wrap {
        background:rgba(65,64,61,.72);
      }
      th {
        color:#bdb8af;
        background:rgba(50,49,47,.94)!important;
      }
      tbody tr:hover:not(.group-row) { background:rgba(255,255,255,.035); }
      tbody tr.selected {
        background:rgba(216,140,57,.1);
        box-shadow:inset 2px 0 0 #d88c39;
      }
      .group-row td { background:rgba(255,255,255,.04); }
      .value-link {
        color:#f2d2a8;
        background:transparent;
        border-color:transparent;
      }
      .side-tabs {
        background:rgba(55,54,52,.72);
      }
      .side-tab.active {
        color:#fff;
        border-color:rgba(255,255,255,.13);
        background:rgba(255,255,255,.075);
      }
      .side-section-head,.point-inspector-head {
        background:rgba(61,60,57,.94);
      }
      details.detail-section {
        border-color:rgba(255,255,255,.07);
        background:rgba(255,255,255,.035);
      }
      .live-chart i { background:linear-gradient(180deg,#dc974a,#bc7427); }
      ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.16); }
      ::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,.25); }

      /* Table hierarchy and interaction polish. */
      col.object-col-col { width:240px; }
      col.value-col-col { width:112px; }
      col.unit-col-col { width:82px; }
      col.override-col-col { width:104px; }
      col.write-profile-col-col { width:86px; }
      col.runtime-col-col { width:48px; }
      thead th {
        height:48px;
        padding:0 14px;
        color:#c7c2ba;
        font-size:11px;
        font-weight:700;
        letter-spacing:.025em;
        text-transform:none;
      }
      tbody td { height:58px; padding:8px 14px; }
      th.object-col,td[data-col="object"] {
        box-shadow:1px 0 0 rgba(255,255,255,.065);
      }
      .sort-btn,.sort-btn:hover:not(:disabled) {
        min-height:0;
        padding:0;
        border:0;
        border-radius:0;
        background:transparent;
        color:inherit;
        box-shadow:none;
        filter:none;
        transform:none;
      }
      .group-row td {
        height:auto;
        padding:11px 14px;
        background:rgba(255,255,255,.035);
        box-shadow:inset 3px 0 0 rgba(216,140,57,.7);
      }
      .group-toggle,.group-toggle:hover:not(:disabled) {
        min-height:0;
        padding:0;
        border:0;
        border-radius:0;
        background:transparent;
        color:#f7f4ee;
        box-shadow:none;
        filter:none;
        transform:none;
        font-size:15px;
        font-weight:720;
        letter-spacing:-.018em;
      }
      .group-toggle .muted {
        margin-left:4px;
        color:#aaa59d;
        font-size:12px;
        font-weight:550;
      }
      .link-cell,.link-cell:hover:not(:disabled),
      .entity-link,.entity-link:hover:not(:disabled),
      .value-link:hover:not(:disabled) {
        min-height:0;
        border:0;
        background:transparent;
        box-shadow:none;
        filter:none;
        transform:none;
      }
      .entity-link:hover:not(:disabled) {
        color:#e2a45e;
        text-decoration:underline;
        text-underline-offset:3px;
      }
      .entity-stack { gap:5px; }
      td[data-col="entity"] { padding-left:16px; }
      td[data-col="value"] { color:#f0d5ae; font-weight:700; }

      /* Readable top controls and a useful live-log viewport. */
      .header-action-buttons { gap:9px; }
      .header-action-buttons button {
        min-height:40px;
        padding:10px 15px;
        font-size:13px;
        font-weight:620;
        white-space:nowrap;
      }
      .dashboard-monitor-tabs { gap:7px; margin-bottom:9px; }
      .dashboard-monitor-tab {
        min-height:34px;
        padding:7px 13px;
        font-size:12px;
        font-weight:650;
      }
      .live-small-btn {
        min-height:34px;
        padding:7px 12px;
        font-size:11px;
      }
      .dashboard-cards {
        grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
        gap:8px;
      }
      .live-summary { font-size:12px; margin-bottom:8px; }
      .live-chart { height:32px; }
      .live-filters { margin:9px 0; }
      .live-filters input,.live-filters select {
        height:36px;
        padding:7px 10px;
        font-size:12px;
      }
      .live-table-wrap {
        height:280px;
        max-height:34vh;
        min-height:220px;
      }
      .live-table th {
        height:auto;
        padding:8px 9px;
        font-size:11px;
      }
      .live-table td,.live-table tbody td {
        height:auto;
        padding:9px;
        font-size:12px;
      }
      .live-table td b { font-size:13px; }
      .live-table td small { margin-top:2px; font-size:10px; }

      .dashboard-headline {
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:9px;
        padding:0 12px 12px;
      }
      .dashboard-headline-card {
        min-width:0;
        min-height:72px;
        display:flex;
        align-items:center;
        gap:12px;
        padding:11px 14px;
        border:1px solid rgba(255,255,255,.075);
        border-radius:11px;
        background:rgba(255,255,255,.055);
      }
      .dashboard-headline-card.stat-ok { background:rgba(97,128,91,.3); }
      .dashboard-headline-card.stat-warn { background:rgba(163,114,55,.2); }
      .dashboard-headline-card.stat-bad { background:rgba(153,68,62,.22); }
      .dashboard-headline-icon {
        width:36px;
        height:36px;
        flex:0 0 36px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:50%;
        background:rgba(255,255,255,.075);
        font-size:17px;
      }
      .dashboard-headline-card span:last-child { min-width:0; }
      .dashboard-headline-card small {
        display:block;
        margin-bottom:3px;
        color:#bdb8af;
        font-size:10px;
        font-weight:650;
        letter-spacing:.055em;
        text-transform:uppercase;
      }
      .dashboard-headline-card strong {
        display:block;
        color:#faf7f1;
        font-size:23px;
        line-height:1;
        letter-spacing:-.035em;
      }
      .dashboard-nav {
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:7px;
        margin:0 12px 10px;
        padding:6px;
        border:1px solid rgba(255,255,255,.075);
        border-radius:12px;
        background:rgba(32,31,29,.34);
      }
      .dashboard-nav-item,.dashboard-nav-item:hover:not(:disabled) {
        min-height:42px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:9px;
        border:0;
        border-radius:9px;
        background:transparent;
        color:#bdb8af;
        box-shadow:none;
        transform:none;
        filter:none;
        font-size:13px;
        font-weight:650;
      }
      .dashboard-nav-item:hover:not(:disabled) {
        color:#f5f2ec;
        background:rgba(255,255,255,.045);
      }
      .dashboard-nav-item.active {
        color:#fff8ed;
        background:linear-gradient(135deg,#c88a3d,#a96b28);
        box-shadow:0 5px 14px rgba(100,60,20,.16);
      }
      .dashboard-nav-icon { font-size:17px; }
      .dashboard-content {
        display:block;
        padding:0 12px 12px;
      }
      .dashboard-config-grid {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:9px;
      }
      .dashboard-content-live .dashboard-monitor-group {
        padding:12px;
      }
      .dashboard-content-developer .dashboard-cards {
        grid-template-columns:repeat(auto-fit,minmax(165px,1fr));
      }
      .main-nav {
        flex:0 0 auto;
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:7px;
        margin:0 0 12px;
        padding:6px;
        border:1px solid rgba(255,255,255,.09);
        border-radius:13px;
        background:rgba(55,54,51,.68);
        box-shadow:0 10px 28px rgba(0,0,0,.13),inset 0 1px 0 rgba(255,255,255,.035);
        backdrop-filter:blur(18px);
      }
      .main-nav-item,.main-nav-item:hover:not(:disabled) {
        min-width:0;
        min-height:54px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:11px;
        padding:8px 14px;
        border:0;
        border-radius:9px;
        background:transparent;
        color:#bdb8af;
        box-shadow:none;
        filter:none;
        transform:none;
        text-align:left;
      }
      .main-nav-item.active,
      .main-nav-item.active:hover:not(:disabled) {
        color:#fff9ef;
        background:linear-gradient(135deg,#c88a3d,#a96b28);
        box-shadow:0 6px 16px rgba(82,49,17,.2);
      }
      .main-nav-icon {
        flex:0 0 auto;
        font-size:20px;
      }
      .main-nav-item > span:last-child { min-width:0; }
      .main-nav-item strong {
        display:block;
        font-size:14px;
        line-height:1.15;
      }
      .main-nav-item small {
        display:block;
        margin-top:3px;
        color:currentColor;
        opacity:.72;
        font-size:10px;
        font-weight:500;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .main-dashboard {
        flex:1 1 auto;
        min-height:0;
        margin-bottom:0;
        overflow:hidden;
      }
      .main-dashboard .dashboard-shell {
        height:100%;
        min-height:0;
        display:flex;
        flex-direction:column;
      }
      .dashboard-page-heading {
        flex:0 0 auto;
        min-height:48px;
        display:flex;
        align-items:center;
        gap:10px;
        padding:12px 16px;
        color:#f4f2ed;
        border-bottom:1px solid rgba(255,255,255,.065);
        background:rgba(255,255,255,.018);
      }
      .main-dashboard .dashboard-content {
        flex:1 1 auto;
        min-height:0;
      }
      .main-dashboard .dashboard-content-developer {
        overflow:auto;
      }
      .main-dashboard .dashboard-content-live,
      .main-dashboard .dashboard-content-live .dashboard-monitor-group,
      .main-dashboard .dashboard-content-live .live-monitor {
        min-height:0;
        display:flex;
        flex:1 1 auto;
        flex-direction:column;
      }
      .main-dashboard .dashboard-content-live .live-table-wrap {
        flex:1 1 auto;
        height:auto;
        min-height:240px;
        max-height:none;
      }
      .main-status-strip {
        flex:0 0 auto;
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:9px;
        margin-bottom:10px;
      }
      .dashboard-diagnostics-grid {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:9px;
      }
      .content {
        grid-template-columns:minmax(0,3fr) 30px minmax(560px,2fr);
        gap:5px;
      }
      .content.details-hidden {
        grid-template-columns:minmax(0,1fr) 30px;
      }
      .detail-rail-toggle,.detail-rail-toggle:hover:not(:disabled) {
        align-self:center;
        justify-self:center;
        width:28px;
        min-width:28px;
        height:58px;
        min-height:58px;
        padding:0;
        border:1px solid rgba(255,255,255,.1);
        border-radius:999px;
        background:rgba(65,63,60,.9);
        color:#d8d2c9;
        box-shadow:0 8px 20px rgba(0,0,0,.16);
        filter:none;
        transform:none;
        font-size:23px;
        font-weight:400;
        line-height:1;
      }
      .detail-rail-toggle:hover:not(:disabled) {
        color:#fff;
        border-color:rgba(216,140,57,.42);
        background:rgba(216,140,57,.16);
      }
      .wrap {
        width:100%;
        max-width:none;
        padding:12px clamp(10px,1vw,18px) 16px;
      }
      /* NetMan-aligned visual language: quiet surfaces, clear hierarchy. */
      :host {
        --bepacom-gold:#d19a42;
        --bepacom-gold-deep:#a86c27;
        --bepacom-border:rgba(255,255,255,.085);
        font-family:Inter,"SF Pro Display","Segoe UI Variable","Segoe UI",sans-serif;
      }
      .wrap {
        padding:0 clamp(12px,1.1vw,22px) 18px;
        background:radial-gradient(circle at 32% -20%,rgba(209,154,66,.07),transparent 31%),#1b1a19;
      }
      .header {
        min-height:108px;
        margin:0 calc(clamp(12px,1.1vw,22px) * -1) 20px;
        padding:18px clamp(16px,1.5vw,30px);
        box-sizing:border-box;
        align-items:center;
        border-bottom:1px solid rgba(255,255,255,.055);
        background:rgba(24,23,22,.94);
      }
      .brand-lockup { display:flex; align-items:center; gap:15px; min-width:0; }
      .brand-mark {
        width:48px; height:48px; flex:0 0 48px; display:grid; place-items:center;
        border:1px solid rgba(255,226,169,.34); border-radius:14px; color:#241c10;
        background:linear-gradient(145deg,#e1b55c,#bd7e2c);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 8px 22px rgba(75,44,10,.22);
        font-size:19px; font-weight:850;
      }
      .brand-copy { min-width:0; }
      .brand-eyebrow {
        margin-bottom:5px; color:#d9bd83; font-size:10px; font-weight:800;
        letter-spacing:.22em; text-transform:uppercase;
      }
      h1 { margin:0; font-size:31px; line-height:1; letter-spacing:-.045em; }
      .subtitle { margin-top:7px; color:#8f8b84; font-size:10px; }
      .frontend-version {
        margin:7px 0 0; padding:0; border:0; border-radius:0;
        color:#696660; background:transparent; font-size:9px;
      }
      .header-action-buttons button {
        min-height:42px; border-color:rgba(255,255,255,.1); border-radius:999px;
        color:#e6e2db; background:rgba(255,255,255,.045); box-shadow:none;
      }
      .header-action-buttons button:hover:not(:disabled) {
        border-color:rgba(209,154,66,.38); background:rgba(209,154,66,.1);
      }
      .main-status-strip {
        grid-template-columns:minmax(360px,1.4fr) repeat(4,minmax(0,1fr));
        gap:9px; margin-bottom:16px; padding:9px;
        border:1px solid var(--bepacom-border); border-radius:14px;
        background:rgba(52,51,48,.78); box-shadow:0 12px 30px rgba(0,0,0,.14);
      }
      .dashboard-headline-card {
        min-height:82px; align-items:flex-start; padding:14px 16px;
        border-color:rgba(255,255,255,.075); border-radius:11px;
        background:rgba(255,255,255,.045);
      }
      .dashboard-headline-icon { display:none; }
      .dashboard-headline-card small {
        margin-bottom:8px; color:#aaa59c; font-size:9px; letter-spacing:.075em;
      }
      .dashboard-headline-card strong {
        color:#f2d598; font-size:25px; letter-spacing:-.04em;
      }
      .dashboard-headline-card.stat-ok strong { color:#dcd49a; }
      .dashboard-headline-card.stat-warn strong,.dashboard-headline-card.stat-bad strong { color:#df766a; }
      .dashboard-headline-card.status-overview { padding:11px 16px; }
      .status-overview-grid {
        width:100%; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px;
      }
      .status-overview-value {
        min-width:0; padding-right:12px; border-right:1px solid rgba(255,255,255,.075);
      }
      .status-overview-value:last-child { padding-right:0; border-right:0; }
      .status-overview-value strong {
        display:block; padding:0; font-size:23px; line-height:1;
      }
      .status-overview-value small {
        display:block; margin-top:7px; color:#aaa59c; font-size:8px;
        font-weight:750; letter-spacing:.07em; text-transform:uppercase;
      }
      .status-overview-value.total strong { color:#f2d598; }
      .status-overview-value.active strong { color:#a9c89e; }
      .status-overview-value.disabled strong { color:#df766a; }
      .main-nav {
        min-height:44px; margin-bottom:14px; padding:4px; border-radius:11px;
        background:rgba(45,44,41,.82); box-shadow:none; backdrop-filter:none;
      }
      .main-nav-item,.main-nav-item:hover:not(:disabled) {
        min-height:34px; padding:5px 12px; gap:8px; border-radius:8px;
      }
      .main-nav-item.active,
      .main-nav-item.active:hover:not(:disabled) {
        background:linear-gradient(135deg,var(--bepacom-gold),var(--bepacom-gold-deep));
        box-shadow:0 6px 18px rgba(86,51,14,.22);
      }
      .main-nav-item small { display:none; }
      .main-nav-icon { font-size:14px; }
      .main-nav-item strong { font-size:13px; }
      .main-dashboard .dashboard-shell {
        border-color:var(--bepacom-border); border-radius:14px;
        background:rgba(48,47,44,.84); box-shadow:none;
      }
      .dashboard-page-heading { min-height:62px; padding:16px 20px; background:transparent; }
      .dashboard-toggle-title { font-size:19px; font-weight:760; letter-spacing:-.025em; }
      .dashboard-summary { color:#8f8a82; font-size:11px; }
      .dashboard-group { border-color:rgba(255,255,255,.065); background:rgba(255,255,255,.025); }
      .main-dashboard .dashboard-content { padding:0 20px 18px; }
      .live-summary { color:#98938b; }
      .live-chart {
        height:58px; border-color:rgba(255,255,255,.065); background:rgba(20,19,18,.24);
      }
      .live-filters input,.live-filters select {
        border-color:rgba(255,255,255,.075); background:#302f2c;
      }
      .live-table-wrap {
        border-color:rgba(255,255,255,.075); border-radius:10px; background:rgba(38,37,35,.42);
      }
      .live-table th {
        padding:11px 12px; color:#aaa59d; background:#2d2c2a;
        font-size:9px; letter-spacing:.07em; text-transform:uppercase;
      }
      .live-table td,.live-table tbody td { padding:12px; border-top-color:rgba(255,255,255,.06); }
      .live-table tbody tr:hover { background:rgba(209,154,66,.055); }
      .live-source {
        border-color:rgba(209,154,66,.22); color:#d7b36f; background:rgba(209,154,66,.07);
      }
      .dashboard-content-developer { padding-top:2px!important; }
      .dashboard-diagnostics-grid {
        grid-template-columns:minmax(0,1fr) minmax(0,1fr);
        gap:12px;
      }
      .dashboard-diagnostics-grid > .dashboard-group {
        padding:16px;
        border-color:rgba(255,255,255,.075);
        border-radius:12px;
        background:rgba(255,255,255,.024);
      }
      .dashboard-diagnostics-grid > .dashboard-group:nth-child(3) {
        grid-column:1 / -1;
      }
      .dashboard-title {
        margin:0 0 14px;
        padding-bottom:11px;
        border-bottom:1px solid rgba(255,255,255,.06);
        color:#d9d4cc;
        font-size:10px;
        font-weight:800;
        letter-spacing:.085em;
        text-transform:uppercase;
      }
      .dashboard-diagnostics-grid .dashboard-cards {
        gap:9px;
      }
      .dashboard-diagnostics-grid > .dashboard-group:nth-child(1) .dashboard-cards {
        grid-template-columns:repeat(3,minmax(0,1fr));
      }
      .dashboard-diagnostics-grid > .dashboard-group:nth-child(2) .dashboard-cards {
        grid-template-columns:repeat(3,minmax(0,1fr));
      }
      .dashboard-diagnostics-grid > .dashboard-group:nth-child(3) .dashboard-cards {
        grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
      }
      /* Automatic light appearance, driven by Home Assistant's active theme. */
      .wrap.theme-light {
        --primary-color:#b87926;
        --accent-color:#b87926;
        --primary-text-color:#29251f;
        --text-primary-color:#29251f;
        --secondary-text-color:#746e65;
        --card-background-color:#fffdfa;
        --secondary-background-color:#f1ede6;
        --divider-color:rgba(62,52,39,.13);
        --bepacom-border:rgba(62,52,39,.13);
        --bp-shadow:0 10px 28px rgba(78,61,39,.08);
        color-scheme:light;
        color:#29251f;
        background:
          radial-gradient(circle at 30% -15%,rgba(202,146,65,.12),transparent 32%),
          #f3f0ea;
      }
      .theme-light .header {
        border-bottom-color:rgba(62,52,39,.1);
        background:rgba(250,248,244,.96);
      }
      .theme-light h1 { color:#211f1b; }
      .theme-light .brand-eyebrow { color:#9a6b2c; }
      .theme-light .frontend-version { color:#918a80; }
      .theme-light .header-action-buttons button,
      .theme-light button.secondary,
      .theme-light .view-tab,
      .theme-light .icon-action,
      .theme-light .mobile-actions-toggle {
        color:#3b3731;
        border-color:rgba(62,52,39,.22);
        background:#fffdfa;
      }
      .theme-light .header-action-buttons button:hover:not(:disabled),
      .theme-light button.secondary:hover:not(:disabled),
      .theme-light .view-tab:hover,
      .theme-light .icon-action:hover,
      .theme-light .mobile-actions-toggle:hover {
        color:#6d491d;
        border-color:rgba(184,121,38,.48);
        background:#f5ead8;
      }
      .theme-light .view-tab.active,
      .theme-light .view-tab.active:hover {
        color:#563817!important;
        border-color:rgba(160,102,31,.48)!important;
        background:linear-gradient(135deg,#f2e2c8,#ead3ae)!important;
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.45);
      }
      .theme-light .virtual-type-badge,
      .theme-light .virtual-badge {
        color:#4f4941;
        border-color:rgba(62,52,39,.2);
        background:#f2eee7;
      }
      .theme-light .virtual-state-badge.on {
        color:#316b38;
        border-color:#9bc99c;
        background:#e4f3e2;
      }
      .theme-light .virtual-state-badge.off {
        color:#514c45;
        border-color:#c7c1b8;
        background:#ece9e3;
      }
      .theme-light .virtual-state-badge.unavailable,
      .theme-light .virtual-state-badge.unknown {
        color:#87571c;
        border-color:#d7b681;
        background:#f7ead5;
      }
      .theme-light .icon-action {
        color:#403a33;
        box-shadow:0 1px 3px rgba(62,52,39,.1);
      }
      .theme-light .main-status-strip,
      .theme-light .main-nav,
      .theme-light .card,
      .theme-light .toolbar,
      .theme-light .side,
      .theme-light .table-wrap,
      .theme-light .main-dashboard .dashboard-shell {
        border-color:rgba(62,52,39,.13);
        background:rgba(255,253,250,.88);
        box-shadow:0 10px 28px rgba(78,61,39,.07);
      }
      .theme-light .dashboard-headline-card {
        border-color:rgba(62,52,39,.1);
        background:#f6f2eb;
      }
      .theme-light .dashboard-headline-card small,
      .theme-light .status-overview-value small,
      .theme-light .dashboard-summary,
      .theme-light .live-summary,
      .theme-light .muted,
      .theme-light label { color:#797268; }
      .theme-light .dashboard-headline-card strong { color:#9b671f; }
      .theme-light .dashboard-headline-card.stat-ok strong,
      .theme-light .status-overview-value.active strong { color:#64815c; }
      .theme-light .dashboard-headline-card.stat-warn strong,
      .theme-light .dashboard-headline-card.stat-bad strong,
      .theme-light .status-overview-value.disabled strong { color:#b9564d; }
      .theme-light .status-overview-value.total strong { color:#a06b20; }
      .theme-light .status-overview-value { border-right-color:rgba(62,52,39,.11); }
      .theme-light .main-nav-item { color:#6f685f; }
      .theme-light .main-nav-item:hover:not(:disabled) {
        color:#302b25; background:rgba(62,52,39,.05);
      }
      .theme-light .main-nav-item.active {
        color:#fffaf2;
        background:linear-gradient(135deg,#c99543,#a86c27);
      }
      .theme-light .dashboard-page-heading { color:#29251f; border-bottom-color:rgba(62,52,39,.09); }
      .theme-light .dashboard-group,
      .theme-light .dashboard-diagnostics-grid > .dashboard-group {
        border-color:rgba(62,52,39,.11);
        background:rgba(246,242,235,.72);
      }
      .theme-light .dashboard-title {
        color:#5e574e; border-bottom-color:rgba(62,52,39,.1);
      }
      .theme-light input,
      .theme-light select {
        color:#29251f;
        border-color:rgba(62,52,39,.15);
        background:#fffdfa;
        color-scheme:light;
      }
      .theme-light select option,
      .theme-light select optgroup { color:#29251f; background:#fffdfa; }
      .theme-light select option:checked { color:#2b2114; background:#ead5b3; }
      .theme-light th,
      .theme-light .live-table th {
        color:#70695f;
        background:#ebe6de!important;
      }
      .theme-light td { border-color:rgba(62,52,39,.09)!important; }
      .theme-light tbody tr:hover:not(.group-row),
      .theme-light .live-table tbody tr:hover { background:rgba(184,121,38,.055); }
      .theme-light tbody tr.selected {
        background:rgba(184,121,38,.09);
        box-shadow:inset 2px 0 0 #b87926;
      }
      .theme-light .group-row td {
        color:#39332c!important;
        background:#eee5d7!important;
        box-shadow:inset 3px 0 0 rgba(184,121,38,.72);
      }
      .theme-light .group-toggle,
      .theme-light .group-toggle:hover:not(:disabled) { color:#39332c!important; }
      .theme-light .group-row .muted { color:#756a5d!important; }
      .theme-light .name { color:#29251f; }
      .theme-light .value-link { color:#8a591c; }
      .theme-light .side-tabs,
      .theme-light .side-section-head,
      .theme-light .point-inspector-head { background:#f0ece5; }
      .theme-light .side-tab { color:#777066; }
      .theme-light .side-tab.active {
        color:#6d491d;
        border-color:rgba(184,121,38,.24);
        background:rgba(184,121,38,.09);
      }
      .theme-light details.detail-section,
      .theme-light .side-virtual-card {
        border-color:rgba(62,52,39,.11);
        background:rgba(255,255,255,.64);
      }
      .theme-light details.detail-section > summary { color:#3e3932; }
      .theme-light .live-chart,
      .theme-light .live-table-wrap,
      .theme-light .history-list {
        border-color:rgba(62,52,39,.12);
        background:rgba(255,253,250,.72);
      }
      .theme-light .live-filters input,
      .theme-light .live-filters select { background:#fffdfa; }
      .theme-light .live-source {
        color:#85571d; border-color:rgba(184,121,38,.24); background:rgba(184,121,38,.08);
      }
      .theme-light .detail-rail-toggle,
      .theme-light .detail-rail-toggle:hover:not(:disabled) {
        color:#655e55; border-color:rgba(62,52,39,.15); background:#f8f5ef;
      }
      .dashboard-content-developer .dashboard-summary { display:none; }
      @media (max-width:1500px) {
        .dashboard-diagnostics-grid > .dashboard-group:nth-child(2) .dashboard-cards {
          grid-template-columns:repeat(3,minmax(0,1fr));
        }
        .dashboard-diagnostics-grid > .dashboard-group:nth-child(3) .dashboard-cards {
          grid-template-columns:repeat(5,minmax(0,1fr));
        }
      }
      @media (max-width:1000px) {
        .dashboard-diagnostics-grid { grid-template-columns:1fr; }
        .dashboard-diagnostics-grid > .dashboard-group:nth-child(3) { grid-column:auto; }
        .dashboard-diagnostics-grid > .dashboard-group:nth-child(1) .dashboard-cards,
        .dashboard-diagnostics-grid > .dashboard-group:nth-child(2) .dashboard-cards,
        .dashboard-diagnostics-grid > .dashboard-group:nth-child(3) .dashboard-cards {
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
      }
      @media (max-width: 1100px) { :host { height:auto; overflow:visible; } .wrap { height:auto; min-height:100vh; overflow:visible; } .toolbar { align-items:stretch; } .toolbar .toolbar-nav { flex:1 0 100%; border-right:0; border-bottom:1px solid var(--divider-color); padding:2px 2px 8px; } .dashboard-content { grid-template-columns: 1fr; } .dashboard-cards { grid-template-columns: repeat(2, 1fr); } #explorerView { overflow:visible; } .content { grid-template-columns: 1fr; overflow:visible; } .table-wrap { height:70vh; } .side { height:70vh; } }
      @media (max-width: 700px) {
        .main-nav { grid-template-columns:1fr; }
        .main-nav-item { justify-content:flex-start; }
        .main-status-strip { grid-template-columns:1fr 1fr; }
        .dashboard-diagnostics-grid { grid-template-columns:1fr; }
        .dashboard-headline { grid-template-columns:1fr 1fr; }
        .dashboard-headline-card { min-height:62px; padding:9px 10px; }
        .dashboard-headline-card strong { font-size:19px; }
        .dashboard-nav { grid-template-columns:1fr; }
        .dashboard-nav-item { justify-content:flex-start; padding-left:14px; }
        .dashboard-config-grid { grid-template-columns:1fr; }
        .dashboard-monitor-group { padding:8px; }
        .live-summary { gap:4px 9px; }
        .live-summary span:nth-child(2) { display:none; }
        .live-filters { grid-template-columns:1fr 1fr; }
        .live-filters input { grid-column:1 / -1; }
        .live-small-btn { margin-left:0; }
        .live-table-wrap { max-height:260px; }
        .live-table th:nth-child(1), .live-table td:nth-child(1) { width:58px; }
        .live-table th:nth-child(3), .live-table td:nth-child(3) { width:104px; }
        .live-table th:nth-child(4), .live-table td:nth-child(4) { display:none; }
        .live-foot { text-align:left; }
        .wrap { padding:8px; }
        .header { align-items:flex-start; gap:8px; }
        h1 { font-size:20px; line-height:1.2; }
        .subtitle { font-size:12px; }
        .mobile-actions-toggle { display:flex; align-items:center; justify-content:center; width:42px; height:42px; padding:0; margin:0; border-radius:50%; border:1px solid var(--divider-color); background:var(--secondary-background-color); color:var(--primary-text-color); cursor:pointer; font-size:22px; }
        .header-actions-menu.open > .mobile-actions-toggle { background:color-mix(in srgb, var(--primary-color) 18%, var(--secondary-background-color)); border-color:var(--primary-color); }
        .header-actions-menu > .header-action-buttons { display:none; }
        .header-actions-menu.open > .header-action-buttons { position:absolute; z-index:100; top:48px; right:0; width:min(280px, calc(100vw - 16px)); box-sizing:border-box; display:grid; grid-template-columns:1fr 1fr; gap:7px; padding:10px; border:1px solid var(--divider-color); border-radius:12px; background:var(--card-background-color); box-shadow:0 8px 28px rgba(0,0,0,.35); }
        .header-action-buttons button { width:100%; padding:9px 8px; font-size:12px; }
        .header-action-buttons #toggleDetails, .header-action-buttons #reloadIntegration { grid-column:1 / -1; }
        .toolbar .search-field, .toolbar .filter-field, .toolbar .check-field { flex:1 1 100%; min-width:0; }
        .toolbar .reset-field { margin-left:auto; }
        .view-tab { flex:1 1 auto; padding:8px 10px; }
        .dashboard-cards { grid-template-columns:1fr 1fr; }
        .content { display:block; }
        .detail-rail-toggle {
          display:flex;
          width:100%;
          height:30px;
          min-height:30px;
          margin:6px 0;
        }
        .table-wrap { height:72vh; border:0; background:transparent; box-shadow:none; overflow-y:auto; overflow-x:hidden; }
        .table-wrap > table { display:block; min-width:0; width:100%; table-layout:auto; border-collapse:separate; }
        .table-wrap > table colgroup, .table-wrap > table > thead { display:none; }
        .table-wrap > table > tbody { display:block; }
        .table-wrap > table > tbody > tr:not(.group-row):not(.virtual-spacer) { display:block; margin:0 0 10px; border:1px solid var(--divider-color); border-radius:12px; background:var(--card-background-color); box-shadow:var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.18)); overflow:hidden; }
        .table-wrap > table > tbody > tr:not(.group-row):not(.virtual-spacer) > td { position:static !important; display:grid; grid-template-columns:86px minmax(0,1fr); gap:10px; align-items:center; width:auto; min-height:38px; padding:7px 10px; text-align:left !important; white-space:normal; overflow:visible; border-bottom:1px solid color-mix(in srgb, var(--divider-color) 65%, transparent); background:transparent !important; box-shadow:none !important; }
        .table-wrap > table > tbody > tr:not(.group-row):not(.virtual-spacer) > td:last-child { border-bottom:0; }
        .table-wrap td::before { color:var(--secondary-text-color); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        .table-wrap td.select-col { display:flex !important; justify-content:flex-end; min-height:28px !important; padding:5px 10px !important; }
        .table-wrap td.select-col::before { content:"Auswahl"; margin-right:auto; }
        .table-wrap td[data-col='object']::before { content:"Objekt"; }
        .table-wrap td[data-col='entity']::before { content:"HA Entität"; }
        .table-wrap td[data-col='value']::before { content:"Wert"; }
        .table-wrap td[data-col='unit']::before { content:"Einheit"; }
        .table-wrap td[data-col='override']::before { content:"Override"; }
        .table-wrap td[data-col='write-profile']::before { content:"Schreiben"; }
        .table-wrap td[data-col='status']::before { content:"Status"; }
        .table-wrap .group-row { display:block; margin:8px 0; }
        .table-wrap .group-row td { display:block; position:static; padding:8px; }
        .table-wrap .virtual-spacer { display:block; }
        .table-wrap .virtual-spacer td { display:block; }
        .linked-entities { margin-top:5px; }
        .inline-select { max-width:none; }
        .virtual-overview { padding:9px; }
        .virtual-overview-head { align-items:flex-start; flex-direction:column; }
        .virtual-table-wrap { overflow:visible; }
        .virtual-table { display:block; min-width:0; width:100%; }
        .virtual-table thead { display:none; }
        .virtual-table tbody { display:block; }
        .virtual-table tr { display:block; margin-bottom:10px; padding:5px 0; border:1px solid var(--divider-color); border-radius:12px; background:var(--secondary-background-color); overflow:hidden; }
        .virtual-table td { display:grid; grid-template-columns:78px minmax(0,1fr); gap:8px; align-items:center; width:auto !important; padding:7px 10px !important; border-bottom:1px solid color-mix(in srgb, var(--divider-color) 65%, transparent); overflow:visible; }
        .virtual-table td:last-child { border-bottom:0; }
        .virtual-table td::before { color:var(--secondary-text-color); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        .virtual-table td:nth-child(1)::before { content:"Quelle"; }
        .virtual-table td:nth-child(2)::before { content:"HA Entität"; }
        .virtual-table td:nth-child(3)::before { content:"Typ"; }
        .virtual-table td:nth-child(4)::before { content:"Zustand"; }
        .virtual-table td:nth-child(5)::before { content:"ON"; }
        .virtual-table td:nth-child(6)::before { content:"OFF"; }
        .virtual-table td:nth-child(7)::before { content:"ELSE"; }
        .virtual-table td:nth-child(8)::before { content:"Aktionen"; }
        .virtual-icon-actions { flex-wrap:wrap; }
        .side { height:70vh; min-height:70vh; max-height:70vh; margin-top:10px; overflow:hidden; }
        .point-inspector-head { flex-direction:column; }
        .inspector-head-actions { width:100%; justify-content:flex-start; }
      }
    `;
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="wrap ${this._isDarkTheme() ? "theme-dark" : "theme-light"}">
        <div class="header">
          <div class="brand-lockup">
            <div class="brand-mark" aria-hidden="true">B</div>
            <div class="brand-copy">
            <div class="brand-eyebrow">Engelsoft</div>
            <h1>Beacon BACnet</h1>
            <div class="frontend-version">${this._versionLabel()}</div>
            </div>
          </div>
          <div class="header-actions-menu">
            <button id="mobileActionsToggle" class="mobile-actions-toggle" type="button" title="Aktionen" aria-label="Aktionen öffnen" aria-expanded="false">☰</button>
            <div class="header-action-buttons">
              <button class="secondary" id="exportJson">JSON</button>
              <button class="secondary" id="exportCsv">CSV</button>
              <button class="secondary" id="exportExcel">Excel</button>
              <button class="secondary" id="exportOverrides">Overrides exportieren</button>
              <button class="secondary" id="importOverrides">Overrides importieren</button>
              <input id="importOverridesFile" type="file" accept="application/json,.json" hidden>
              ${this._pendingReloadIds.size ? `<span class="pending-reload">${this._pendingReloadIds.size} Änderungen warten</span>` : ""}
              <button class="secondary" id="reloadIntegration" ${this._saving || this._manualReloadRunning || Date.now() < this._manualReloadUntil ? "disabled" : ""}>Integration neu laden${this._pendingReloadIds.size ? ` (${this._pendingReloadIds.size})` : ""}</button>
              <button class="secondary" id="refresh">Aktualisieren${this._loading ? " …" : ""}</button>
            </div>
          </div>
        </div>

        ${this._error ? `<div class="error">${this._escape(this._error)}</div>` : ""}
        ${this._message ? `<div class="notice">${this._escape(this._message)}</div>` : ""}

        ${this._mainStatusHtml()}
        ${this._mainNavigationHtml()}

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
      </div>
    `;
    this._bindEvents();
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
      <button class="main-nav-item ${this._mainSection === id ? "active" : ""}" data-main-section="${id}" type="button">
        <span class="main-nav-icon">${icon}</span>
        <span><strong>${label}</strong><small>${description}</small></span>
      </button>`;
    return `<nav class="main-nav" aria-label="Hauptbereiche">
      ${item("configuration", "▦", "Konfiguration", "Explorer und virtuelle Entitäten")}
      ${item("live", "▤", "Live-Ansicht", "Diagramm und Live-Log")}
      ${item("diagnostics", "◇", "Diagnose", "Status, Laufzeit und Push-Werte")}
    </nav>`;
  }
  _mainStatusHtml() {
    const diagnostics = this._diagnostics || {};
    const legacyAddonWarning = diagnostics.legacy_addon_detected === true ? `
      <aside class="legacy-addon-warning" role="status">
        <span class="warning-icon">&#9888;</span>
        <span><strong>Veraltetes BACnet-Add-on erkannt</strong><small>Dieses Add-on unterstützt keine verwalteten COV-Ziele. Zuverlässige Push-Aktualisierungen setzen voraus, dass dort alle benötigten Objekte per COV abonniert sind (z.&nbsp;B. <code>CoV_list: all</code>). Empfohlen wird Engelsoft BACstac.</small></span>
      </aside>` : "";
    const pushTime = diagnostics.dispatch_time_avg_ms === void 0 ? "-" : `${Number(diagnostics.dispatch_time_avg_ms).toFixed(2)} ms`;
    const valueChanges = this._dashboardValueChanges(diagnostics);
    const pushNotificationsRaw = diagnostics.bacnet_push_notifications ?? diagnostics.websocket_updates ?? diagnostics.push_count;
    const pushNotifications = Number(pushNotificationsRaw);
    const averageChangesPerPush = Number.isFinite(pushNotifications) && pushNotifications > 0 ? (Number(valueChanges) / pushNotifications).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) : "-";
    const pushChangeValue = `${pushNotificationsRaw ?? "-"} / ${averageChangesPerPush}`;
    const cards = [
      ["Verbunden", diagnostics.connected === void 0 ? "-" : diagnostics.connected ? "Ja" : "Nein", diagnostics.connected ? "stat-ok" : "stat-bad"],
      ["Verbindungsfehler", diagnostics.connection_failures ?? 0, Number(diagnostics.connection_failures || 0) > 0 ? "stat-warn" : ""],
      ["Push-Verarbeitung", pushTime, ""],
      ["Pushs / Ø Änderungen", pushChangeValue, ""]
    ];
    const overview = `
      <div class="dashboard-headline-card status-overview">
        <div class="status-overview-grid">
          <span class="status-overview-value total"><strong>${this._escape(diagnostics.objects ?? this._total ?? "-")}</strong><small>Punkte insgesamt</small></span>
          <span class="status-overview-value active"><strong>${this._escape(diagnostics.enabled ?? "-")}</strong><small>Aktive Entitäten</small></span>
          <span class="status-overview-value disabled"><strong>${this._escape(diagnostics.configured_disabled ?? diagnostics.disabled ?? "-")}</strong><small>Deaktiviert</small></span>
        </div>
      </div>`;
    return `${legacyAddonWarning}<section class="main-status-strip" aria-label="Systemstatus">${overview}${cards.map(([label, value, tone]) => `
      <div class="dashboard-headline-card ${tone}">
        <span class="dashboard-headline-icon">${this._statusIcon(label, value)}</span>
        <span><small>${this._escape(label)}</small><strong>${this._escape(value)}</strong></span>
      </div>`).join("")}</section>`;
  }
  _virtualEntitiesPageHtml() {
    return `<div class="view-panel">${this._virtualEntitiesOverviewHtml(true)}</div>`;
  }
  _allVirtualEntities() {
    const rows = [];
    const q = this._normalizeSearch(this._virtualSearch || "");
    for (const p2 of this._points || []) {
      for (const ent of this._linkedEntities(p2)) {
        const haystack = [
          ent.name,
          ent.friendly_name,
          ent.entity_name,
          ent.entity_id,
          ent.unique_id,
          ent.entity_type,
          ent.device_class,
          ent.on_value,
          ent.off_value,
          ent.else_state,
          p2.object_key,
          p2.object_name,
          p2.unique_id,
          p2.device_id,
          p2.object_type,
          p2.instance
        ].map((x2) => x2 === void 0 || x2 === null ? "" : String(x2)).join(" ");
        if (!q || this._matchesSearchQuery(haystack, q)) rows.push({ source: p2, ent });
      }
    }
    return rows;
  }
  _compactSourceLabel(p2) {
    const type = String(p2?.object_type || p2?.object_key || "").toLowerCase();
    const inst = p2?.instance ?? "";
    const map = {
      analoginput: "AI",
      "analog-input": "AI",
      analogvalue: "AV",
      "analog-value": "AV",
      binaryinput: "BI",
      "binary-input": "BI",
      binaryvalue: "BV",
      "binary-value": "BV",
      multistateinput: "MSI",
      "multi-state-input": "MSI",
      multistateoutput: "MSO",
      "multi-state-output": "MSO",
      device: "DEV",
      file: "FILE"
    };
    const key = type.replace(/[^a-z]/g, "");
    const prefix = map[type] || map[key] || String(p2?.object_type || "OBJ").toUpperCase();
    return `${prefix} ${inst || ""}`.trim();
  }
  _sourceTooltip(p2) {
    return [p2?.object_key, p2?.object_name, p2?.unique_id].filter(Boolean).join(" · ");
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
      window: ["Geöffnet", "Geschlossen"]
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
    const liveAttrs = entityId ? ` data-virtual-state-entity-id="${this._escape(entityId)}" data-device-class="${this._escape(deviceClass)}"` : "";
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
    const entityId = typeof ent === "string" ? ent : ent?.entity_id || ent?.entityId || "";
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
    const rows = sourcePoint ? this._linkedEntities(sourcePoint).map((ent) => ({ source: sourcePoint, ent })) : this._allVirtualEntities();
    if (!rows.length) {
      const emptyText = sourcePoint ? "Für diesen BACnet-Punkt ist noch keine virtuelle Entität angelegt." : "Noch keine virtuellen Entitäten angelegt. Öffne im Explorer einen BACnet-Datenpunkt und erstelle dort unter „Virtuelle Entität“ einen neuen Eintrag.";
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
  _displayEntityName(p2) {
    return p2.entity_name || p2.entity_original_name || p2.object_name || p2.object_key || p2.entity_id || "-";
  }
  _linkedEntities(p2) {
    return Array.isArray(p2?.linked_virtual_entities) ? p2.linked_virtual_entities : [];
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
  _linkedEntitiesHtml(p2) {
    const links = this._linkedEntities(p2);
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
      detail: { entityId }
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
      ["runtime", "", "runtime-head"]
    ];
    return `<th class="select-col"><input id="selectVisible" type="checkbox" title="Sichtbare auswählen"></th>` + cols.map(([key, label, cls]) => {
      const marker = this._sortKey === key ? this._sortDir === "asc" ? " ▲" : " ▼" : "";
      return `<th class="sortable ${cls}" data-sort="${this._escape(key)}"><button class="sort-btn" data-sort="${this._escape(key)}">${this._escape(label)}${marker}</button></th>`;
    }).join("");
  }
  _sortPoints(points) {
    const key = this._sortKey || "object_key";
    const dir = this._sortDir === "desc" ? -1 : 1;
    const val = (p2) => {
      if (key === "entity") return this._displayEntityName(p2);
      if (key === "unit") return this._displayUnit(p2);
      if (key === "override") return p2.override_active ? 1 : 0;
      if (key === "write_profile") return p2.write_profile === "direct" ? "direct" : "glt";
      if (key === "runtime") return p2.last_update || "";
      return p2[key] ?? "";
    };
    return [...points].sort((a2, b2) => {
      const av = val(a2), bv = val(b2);
      const an = Number(av), bn = Number(bv);
      if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * dir;
      return String(av).localeCompare(String(bv), void 0, { numeric: true, sensitivity: "base" }) * dir;
    });
  }
  _setSort(key) {
    if (this._sortKey === key) this._sortDir = this._sortDir === "asc" ? "desc" : "asc";
    else {
      this._sortKey = key;
      this._sortDir = "asc";
    }
    this._setSetting("bepacom_sort_key", this._sortKey);
    this._setSetting("bepacom_sort_dir", this._sortDir);
    this._updateListDom();
  }
  _displayUnit(p2) {
    if (this._triStateCurrent(p2?.override_unit) === "__none__") return "-";
    return p2?.ha_unit || p2?.bacnet_unit || "-";
  }
  _inlineUnitOptions(p2) {
    const current = this._triStateCurrent(p2.override_unit);
    return this._options([["__auto__", "Auto"], ["__none__", "Keine"], ["%", "%"], ["°C", "°C"], ["cm", "cm"], ["W", "W"], ["kW", "kW"], ["min", "min"], ["s", "s"]], current);
  }
  _inlineModeOptions(p2) {
    return this._options([["disabled", "Aus"], ["subscribe", "Push"], ["polling", "Polling"]], p2.update_mode || "disabled");
  }
  async _saveInline(uniqueId, field, value) {
    if (!this.hass || !uniqueId) return;
    const p2 = this._points.find((point) => point.unique_id === uniqueId);
    if (!p2) return;
    const payload = {
      type: "bepacom/explorer/save_override",
      entry_id: this._entryId || void 0,
      unique_id: uniqueId,
      unit: p2.override_unit || "__auto__",
      device_class: p2.override_device_class || "__auto__",
      state_class: p2.override_state_class || "__auto__",
      update_mode: p2.update_mode || "disabled",
      entity_id: p2.entity_id || "",
      entity_name: p2.entity_name || ""
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
      this._message = "Inline-Änderung gespeichert. Wenn du fertig bist, bitte Integration neu laden.";
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
      const p2 = item.point;
      rows.push(`
        <tr class="${selected?.unique_id === p2.unique_id ? "selected" : ""} ${this._valueChangeClass(p2.unique_id)}" data-uid="${this._escape(p2.unique_id)}">
          <td class="select-col"><input class="row-select" type="checkbox" data-uid="${this._escape(p2.unique_id)}" ${this._selectedIds.has(p2.unique_id) ? "checked" : ""}></td>
          <td data-col="object"><div class="object-main"><bepacom-object-badge kind="${this._escape(this._typeClass(p2.object_type).replace("type-", ""))}" label="${this._escape(this._objectIcon(p2.object_type))}" description="${this._escape(p2.object_type || "")}"></bepacom-object-badge><div><div class="name">${this._escape(p2.object_key)}</div><div class="muted">Device ${this._escape(p2.device_id)}</div></div></div></td>
          <td data-col="entity"><div class="entity-stack"><button class="link-cell entity-link" data-entity-id="${this._escape(p2.entity_id || "")}">${this._escape(this._displayEntityName(p2))}</button>${this._linkedEntitiesHtml(p2)}</div></td>
          <td data-col="value"><button class="link-cell value-link" data-entity-id="${this._escape(p2.entity_id || "")}">${this._escape(this._value(p2.present_value))}</button></td>
          <td data-col="unit"><div class="unit-stack"><span class="unit-display">${this._escape(this._displayUnit(p2))}</span></div></td>
          <td data-col="override">${p2.override_active ? '<span class="pill ok">Override</span>' : '<span class="pill">Standard</span>'}</td>
          <td data-col="write-profile" class="write-profile-cell">${this._writeProfileDot(p2)}</td>
          <td data-col="status">${this._runtimeLabel(p2)}</td>
        </tr>
      `);
    }
    if (bottomHeight) rows.push(`<tr class="virtual-spacer"><td colspan="8" style="height:${bottomHeight}px"></td></tr>`);
    return rows.join("");
  }
  _writeProfileDot(p2) {
    const viaGlt = ["glt_set_as", "glt_set_stage"].includes(p2?.write_profile);
    return `<bepacom-write-profile-indicator ${viaGlt ? "glt" : ""}></bepacom-write-profile-indicator>`;
  }
  _displayItems() {
    let points = this._points || [];
    if (this._filters.device_id && this._filters.device_id !== "all") points = points.filter((p2) => String(p2.device_id) === String(this._filters.device_id));
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
    const groups = /* @__PURE__ */ new Map();
    for (const point of points) {
      const key = this._groupBy === "device" ? `Device ${point.device_id ?? "-"}` : this._objectTypeLabel(point.object_type || "-");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(point);
    }
    const items = [];
    for (const key of Array.from(groups.keys()).sort((a2, b2) => a2.localeCompare(b2, void 0, { numeric: true }))) {
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
  _groupStorageKey(key) {
    return `bepacom_group_open_${this._groupBy}_${key}`;
  }
  _groupOpen(key) {
    try {
      const stored = window.localStorage.getItem(this._groupStorageKey(key));
      return stored === null ? true : stored === "1";
    } catch (_2) {
      return true;
    }
  }
  _toggleGroup(key) {
    const open = !this._groupOpen(key);
    try {
      window.localStorage.setItem(this._groupStorageKey(key), open ? "1" : "0");
    } catch (_2) {
    }
    this._updateListDom();
  }
  _objectTypeLabel(type) {
    const t2 = String(type || "").toLowerCase();
    if (t2.includes("analoginput")) return "Analog Inputs";
    if (t2.includes("analogoutput")) return "Analog Outputs";
    if (t2.includes("analogvalue")) return "Analog Values";
    if (t2.includes("binaryinput")) return "Binary Inputs";
    if (t2.includes("binaryoutput")) return "Binary Outputs";
    if (t2.includes("binaryvalue")) return "Binary Values";
    if (t2.includes("multistateinput")) return "Multi State Inputs";
    if (t2.includes("multistateoutput")) return "Multi State Outputs";
    if (t2.includes("multistatevalue")) return "Multi State Values";
    return type || "Andere";
  }
  _typeClass(type) {
    const t2 = String(type || "").toLowerCase();
    if (t2.includes("analoginput")) return "type-ai";
    if (t2.includes("analogoutput")) return "type-ao";
    if (t2.includes("analogvalue")) return "type-av";
    if (t2.includes("binaryinput")) return "type-bi";
    if (t2.includes("binaryoutput")) return "type-bo";
    if (t2.includes("binaryvalue")) return "type-bv";
    if (t2.includes("multistate")) return "type-ms";
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
    if (!count) return `<div class="bulkbar bulkbar-empty"><span>Mehrfachbearbeitung: Wähle links Objekte aus.</span></div>`;
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
    const targets = this._points.filter((p2) => this._selectedIds.has(p2.unique_id));
    this._saving = true;
    this._message = null;
    this._error = null;
    this._render();
    try {
      for (const p2 of targets) {
        await this.hass.callWS({
          type: "bepacom/explorer/save_override",
          entry_id: this._entryId || void 0,
          unique_id: p2.unique_id,
          unit: unit || p2.override_unit || "__auto__",
          device_class: deviceClass || p2.override_device_class || "__auto__",
          state_class: stateClass || p2.override_state_class || "__auto__",
          update_mode: updateMode || p2.update_mode || "disabled",
          entity_id: p2.entity_id || "",
          entity_name: p2.entity_name || ""
        });
        this._pendingReloadIds.add(p2.unique_id);
      }
      this._message = `${targets.length} Objekte wurden aktualisiert. Wenn du fertig bist, bitte Integration neu laden.`;
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
    const targets = this._points.filter((p2) => this._selectedIds.has(p2.unique_id));
    this._saving = true;
    this._message = null;
    this._error = null;
    this._render();
    try {
      for (const p2 of targets) {
        await this.hass.callWS({ type: "bepacom/explorer/reset_override", entry_id: this._entryId || void 0, unique_id: p2.unique_id });
        this._pendingReloadIds.add(p2.unique_id);
      }
      this._message = `${targets.length} Overrides wurden zurückgesetzt.`;
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
    toolbar.devices = Array.from(
      new Set(
        (this._points || []).map((point) => String(point.device_id ?? "-")).filter(Boolean)
      )
    ).sort((a2, b2) => a2.localeCompare(b2, void 0, { numeric: true }));
    toolbar.objectTypes = Array.from(
      new Set((this._points || []).map((point) => String(point.object_type || "")).filter(Boolean))
    ).sort();
    toolbar.groupBy = this._groupBy || "none";
    toolbar.addEventListener("bepacom-toolbar-action", (event) => {
      const { action, key, value } = event.detail || {};
      if (action === "view") {
        if (this._editorDirty && !window.confirm("Ungespeicherte Änderungen verwerfen und Ansicht wechseln?")) return;
        this._editorDirty = false;
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
          runtime: "all"
        };
        this._loadPoints();
      }
    });
  }
  _configurePointTable() {
    const table = this.shadowRoot?.getElementById("tableWrap");
    if (!table) return;
    const items = this._displayItems();
    const rows = [];
    for (const item of items) {
      if (item.kind === "group") {
        rows.push({ ...item });
        continue;
      }
      const point = item.point;
      const linkedEntities = this._linkedEntities(point).map((link) => {
        const entityId = link.entity_id || "";
        const name = this._linkedEntityName(link);
        return {
          entityId,
          icon: this._linkedEntityIcon(link),
          name,
          state: this._binaryStateLabel(this._linkedEntityState(link), link.device_class),
          title: entityId ? `${name} · ${entityId} · HA Dialog öffnen` : "Nach dem Neuladen der Integration verfügbar"
        };
      });
      let runtimeState = "wait";
      let runtimeLabel = "Wartet";
      if (point.update_mode === "disabled") {
        runtimeState = "off";
        runtimeLabel = "Aus";
      } else if (point.update_mode === "subscribe" && this._diagnostics?.snapshot_websocket_mode === true && this._diagnostics?.subscriptions_initialized === true && this._diagnostics?.connected === true && Number(this._diagnostics?.snapshot_targets || 0) > 0) {
        runtimeState = "snapshot";
        runtimeLabel = "Snapshot aktiv – Aktualisierung über die gemeinsame Snapshot-Verbindung";
      } else if (point.subscribed === true) {
        runtimeState = "push";
        runtimeLabel = "Push aktiv";
      } else if (point.fallback_polling === true) {
        runtimeState = "poll";
        runtimeLabel = "Polling-Fallback aktiv";
      } else if (point.update_mode === "polling") {
        runtimeState = "poll";
        runtimeLabel = "Polling aktiv";
      }
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
        value: this._value(point.present_value),
        unit: this._displayUnit(point),
        overrideActive: !!point.override_active,
        writeViaGlt: ["glt_set_as", "glt_set_stage"].includes(point.write_profile),
        runtimeState,
        runtimeLabel
      });
    }
    table.rows = rows;
    table.emptyMessage = "Keine BACnet-Objekte gefunden.";
    table.sortKey = this._sortKey;
    table.sortDirection = this._sortDir;
    if (table.dataset.actionsBound === "1") return;
    table.dataset.actionsBound = "1";
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
          checked ? this._selectedIds.add(candidate.point.unique_id) : this._selectedIds.delete(candidate.point.unique_id);
        }
        this._render();
      }
    });
  }
  _configureRuntimeDashboard() {
    const dashboard = this.shadowRoot?.getElementById("dashboard");
    if (!dashboard) return;
    const d2 = this._diagnostics || {};
    const valueChanges = this._dashboardValueChanges(d2);
    const pushNotificationsRaw = d2.bacnet_push_notifications ?? d2.websocket_updates ?? d2.push_count;
    const pushNotifications = Number(pushNotificationsRaw);
    const averageChangesPerPush = Number.isFinite(pushNotifications) && pushNotifications > 0 ? (Number(valueChanges) / pushNotifications).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) : "-";
    const pushChangeValue = `${pushNotificationsRaw ?? "-"} / ${averageChangesPerPush}`;
    const configured = [
      ["Push konfiguriert", d2.configured_push ?? "-"],
      ["Polling konfiguriert", d2.configured_polling ?? "-"],
      ["Overrides", d2.overrides ?? "-"]
    ];
    if (Array.isArray(d2.firmware_versions) && d2.firmware_versions.length) configured.push(["Firmware", d2.firmware_versions.join(", ")]);
    if (Array.isArray(d2.device_models) && d2.device_models.length) configured.push(["Gerätemodelle", d2.device_models.join(", ")]);
    const runtime = [
      ["Aktive Subscriptions", d2.subscribed ?? d2.subscriptions ?? "-"],
      ["Aktives Polling", d2.fallback_polling ?? d2.fallback_objects ?? "-"],
      ["Reconnects", d2.reconnect_count ?? "-"]
    ];
    const developer = [
      ["Direkt-Pushs", d2.websocket_direct_messages ?? "-"],
      ["Snapshot-Pushs", d2.websocket_snapshot_messages ?? "-"],
      ["Fallback-Pushs", d2.websocket_fallback_messages ?? "-"],
      ["Payload geprüft", d2.websocket_payload_objects ?? "-"],
      ["Payload verarbeitet", d2.websocket_processed_objects ?? "-"],
      ["Payload ignoriert", d2.websocket_ignored_objects ?? "-"],
      ["Vor Callback gefiltert", d2.websocket_prefiltered_no_change_objects ?? "-"],
      ["Callback-Aufrufe", d2.websocket_callback_invocations ?? "-"],
      ["Callbacks mit Änderung", d2.websocket_callback_value_changes ?? "-"],
      ["Callbacks ohne Änderung", d2.websocket_callback_no_changes ?? "-"],
      ["Push-Punktupdates", d2.processed_push_updates ?? d2.push_updates ?? "-"],
      ["Polling-Punktupdates", d2.processed_polling_updates ?? d2.polling_updates ?? "-"],
      ["Unterdrückte gleiche Werte", d2.suppressed_updates ?? "-"],
      ["Max Push-Verarbeitung ms", d2.dispatch_time_max_ms === void 0 ? "-" : Number(d2.dispatch_time_max_ms).toFixed(2)]
    ];
    const cards = (items) => items.map(([label, value]) => ({
      label,
      value,
      icon: this._statusIcon(label, value),
      tone: this._statusClass(label, value)
    }));
    dashboard.model = {
      open: !!this._statusOpen,
      tab: ["configuration", "developer"].includes(this._dashboardTab) ? this._dashboardTab : "live",
      summary: [
        `Punkte: ${d2.objects ?? this._total ?? "-"}`,
        `aktiv: ${d2.enabled ?? "-"}`,
        `Push: ${d2.configured_push ?? "-"}/${d2.subscribed ?? "-"}`,
        `Polling: ${d2.configured_polling ?? "-"}/${d2.fallback_polling ?? "-"}`,
        `Pushs / Ø Änderungen: ${pushChangeValue}`
      ].join(" · "),
      configured: cards(configured),
      runtime: cards(runtime),
      developer: cards(developer),
      livePaused: this._livePaused,
      liveFilters: { ...this._liveFilters },
      liveChanges: this._liveChanges.map((item) => {
        const { point, entityId, friendlyName } = this._livePointLabels(item);
        return {
          ...item,
          entity_id: entityId,
          resolved_unique_id: point?.unique_id || item.unique_id,
          friendly_name: friendlyName
        };
      })
    };
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
      } catch (_2) {
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
      preview: this._selected ? this._virtualRulePreviewData(this._selected) : { sourceValue: "-", result: "unavailable", tone: "unav" }
    };
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
        if (section !== "configuration" && this._editorDirty && !window.confirm("Ungespeicherte Änderungen verwerfen und den Bereich wechseln?")) return;
        this._editorDirty = false;
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
    const mobileActionsToggle = this.shadowRoot.getElementById("mobileActionsToggle");
    mobileActionsToggle?.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const menu = mobileActionsToggle.closest(".header-actions-menu");
      const open = menu?.classList.toggle("open") || false;
      mobileActionsToggle.setAttribute("aria-expanded", open ? "true" : "false");
      mobileActionsToggle.setAttribute(
        "aria-label",
        open ? "Aktionen schließen" : "Aktionen öffnen"
      );
    });
    this.shadowRoot.querySelectorAll("[data-view-tab]").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        if (this._editorDirty && !window.confirm("Ungespeicherte Änderungen verwerfen und Ansicht wechseln?")) return;
        this._editorDirty = false;
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
    this.shadowRoot.getElementById("groupBy")?.addEventListener("change", (ev) => {
      this._groupBy = ev.target.value || "none";
      this._setSetting("bepacom_group_by", this._groupBy);
      this._visibleStart = 0;
      this._render();
    });
    this.shadowRoot.querySelectorAll("[data-sort]").forEach((el) => el.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this._setSort(el.getAttribute("data-sort"));
    }));
    this.shadowRoot.getElementById("onlyOverrides")?.addEventListener("change", (ev) => this._setFilter("only_overrides", ev.target.checked));
    this.shadowRoot.getElementById("onlySubscribe")?.addEventListener("change", (ev) => this._setFilter("only_subscribe", ev.target.checked));
    this.shadowRoot.getElementById("clear")?.addEventListener("click", () => {
      this._filters = { search: "", object_type: "all", only_overrides: false, only_subscribe: false, device_id: "all", runtime: "all" };
      this._loadPoints();
    });
    this.shadowRoot.getElementById("bulkApply")?.addEventListener("click", () => this._bulkApply());
    this.shadowRoot.getElementById("bulkReset")?.addEventListener("click", () => this._bulkReset());
    this.shadowRoot.getElementById("bulkClear")?.addEventListener("click", () => {
      this._selectedIds.clear();
      this._render();
    });
    this.shadowRoot.getElementById("selectVisible")?.addEventListener("change", (ev) => {
      const checked = ev.target.checked;
      for (const item of this._displayItems()) {
        if (item.kind === "point") {
          checked ? this._selectedIds.add(item.point.unique_id) : this._selectedIds.delete(item.point.unique_id);
        }
      }
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
      if (switchValues) switchValues.style.display = ev.target.value === "switch" ? "contents" : "none";
    });
    this.shadowRoot.querySelectorAll(".side input, .side select, .side textarea").forEach((el) => {
      el.addEventListener("input", () => {
        this._editorDirty = true;
        this._updateEditorState();
        if (el.id && el.id.startsWith("virtualBinary")) this._refreshVirtualRulePreview();
      });
      el.addEventListener("change", () => {
        this._editorDirty = true;
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
          button.dataset.virtualName || ""
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
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._toggleGroup(button.getAttribute("data-group"));
      });
    });
    this.shadowRoot.querySelectorAll(".virtual-source-btn").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const point = this._points.find((p2) => p2.unique_id === button.dataset.sourceUid);
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
        ev.preventDefault();
        ev.stopPropagation();
        this._editVirtualEntity(button.dataset.sourceUid, button.dataset.virtualUid, false);
      });
    });
    this.shadowRoot.querySelectorAll(".virtual-duplicate-btn").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._editVirtualEntity(button.dataset.sourceUid, button.dataset.virtualUid, true);
      });
    });
    this.shadowRoot.querySelectorAll(".virtual-delete-btn").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._deleteVirtualEntity(button.dataset.sourceUid, button.dataset.virtualUid, button.dataset.virtualName || "");
      });
    });
    this.shadowRoot.querySelectorAll(".linked-entity-link").forEach((button) => {
      button.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
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
        const point = this._points.find((p2) => p2.unique_id === uid);
        if (point) this._selectPoint(point);
      };
      row.ondblclick = (ev) => {
        if (ev.target?.closest?.("input, select, button, .entity-link, .value-link, .linked-entity-link, .linked-entity-link")) return;
        ev.preventDefault();
        ev.stopPropagation();
        const uid = row.getAttribute("data-uid");
        const point = this._points.find((p2) => p2.unique_id === uid);
        if (point) this._openDetailsFor(point);
      };
    });
  }
  _deviceOptions() {
    const devices = Array.from(new Set((this._points || []).map((p2) => String(p2.device_id ?? "-")).filter(Boolean))).sort((a2, b2) => a2.localeCompare(b2, void 0, { numeric: true }));
    const current = String(this._filters.device_id || "all");
    const all = [`<option value="all" ${current === "all" ? "selected" : ""}>Alle Devices</option>`];
    return all.concat(devices.map((d2) => `<option value="${this._escape(d2)}" ${current === d2 ? "selected" : ""}>Device ${this._escape(d2)}</option>`)).join("");
  }
  _typeOptions() {
    const types = Array.from(new Set(this._points.map((p2) => p2.object_type))).filter(Boolean).sort();
    const all = [`<option value="all" ${this._filters.object_type === "all" ? "selected" : ""}>Alle Objekttypen</option>`];
    return all.concat(types.map((t2) => `<option value="${this._escape(t2)}" ${this._filters.object_type === t2 ? "selected" : ""}>${this._escape(t2)}</option>`)).join("");
  }
  _virtualRuleNormalize(value) {
    return String(value ?? "").trim().replace(/^['\"]|['\"]$/g, "").toLowerCase();
  }
  _virtualRuleNumber(value) {
    if (value === null || value === void 0) return null;
    const raw = String(value).trim().replace(/^['\"]|['\"]$/g, "").replace(",", ".");
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }
  _virtualRuleEqual(value, expr) {
    const a2 = this._virtualRuleNumber(value);
    const b2 = this._virtualRuleNumber(expr);
    if (a2 !== null && b2 !== null) return a2 === b2;
    return this._virtualRuleNormalize(value) === this._virtualRuleNormalize(expr);
  }
  _virtualRuleAdvancedMatches(value, expression) {
    let expr = String(expression || "").trim();
    if (!expr) return null;
    expr = expr.replaceAll("&&", " && ").replaceAll("||", " || ");
    if (!/^[a-zA-Z0-9_\s()<>!=&|^+*\/%.,'"-]+$/.test(expr)) return null;
    const valueNum = this._virtualRuleNumber(value);
    const preparedValue = valueNum !== null ? String(valueNum) : JSON.stringify(this._virtualRuleNormalize(value));
    let jsExpr = expr.replace(/\bvalue\b/g, preparedValue).replace(/([^=!])=([^=])/g, "$1==$2");
    try {
      return !!Function(`"use strict"; return (${jsExpr});`)();
    } catch (_err) {
      return null;
    }
  }
  _virtualRuleMatches(value, condition) {
    const raw = String(condition ?? "").trim();
    if (!raw) return false;
    if (raw.includes("value") || raw.includes("&&") || raw.includes("||")) {
      const advanced = this._virtualRuleAdvancedMatches(value, raw);
      if (advanced !== null) return advanced;
    }
    if (raw.includes(",")) {
      return raw.split(",").some((part) => this._virtualRuleMatches(value, part.trim()));
    }
    const valueNum = this._virtualRuleNumber(value);
    const ops = [">=", "<=", "!=", "==", ">", "<"];
    for (const op of ops) {
      if (!raw.startsWith(op)) continue;
      const rhs = raw.slice(op.length).trim();
      const rhsNum = this._virtualRuleNumber(rhs);
      if (valueNum !== null && rhsNum !== null) {
        if (op === ">=") return valueNum >= rhsNum;
        if (op === "<=") return valueNum <= rhsNum;
        if (op === "!=") return valueNum !== rhsNum;
        if (op === "==") return valueNum === rhsNum;
        if (op === ">") return valueNum > rhsNum;
        if (op === "<") return valueNum < rhsNum;
      }
      if (op === "!=") return !this._virtualRuleEqual(value, rhs);
      if (op === "==") return this._virtualRuleEqual(value, rhs);
      return false;
    }
    const dashIndex = raw.slice(1).indexOf("-");
    if (dashIndex >= 0) {
      const splitAt = dashIndex + 1;
      const left = raw.slice(0, splitAt).trim();
      const right = raw.slice(splitAt + 1).trim();
      const leftNum = this._virtualRuleNumber(left);
      const rightNum = this._virtualRuleNumber(right);
      if (valueNum !== null && leftNum !== null && rightNum !== null) {
        const low = Math.min(leftNum, rightNum);
        const high = Math.max(leftNum, rightNum);
        return valueNum >= low && valueNum <= high;
      }
    }
    return this._virtualRuleEqual(value, raw);
  }
  _virtualRulePreviewHtml(p2) {
    const onEl = this.shadowRoot?.getElementById("virtualBinaryOnValue");
    const offEl = this.shadowRoot?.getElementById("virtualBinaryOffValue");
    const elseEl = this.shadowRoot?.getElementById("virtualBinaryElseState");
    const sourceValue = p2?.present_value;
    const onRule = onEl ? onEl.value : p2?.virtual_binary?.on_value ?? "2";
    const offRule = offEl ? offEl.value : p2?.virtual_binary?.off_value ?? "1";
    const elseState = elseEl ? elseEl.value : p2?.virtual_binary?.else_state || "unavailable";
    let result = "unavailable";
    let cls = "unav";
    if (this._virtualRuleMatches(sourceValue, onRule)) {
      result = "ON";
      cls = "on";
    } else if (this._virtualRuleMatches(sourceValue, offRule)) {
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
  _virtualRulePreviewData(p2) {
    const onEl = this.shadowRoot?.getElementById("virtualBinaryOnValue");
    const offEl = this.shadowRoot?.getElementById("virtualBinaryOffValue");
    const elseEl = this.shadowRoot?.getElementById("virtualBinaryElseState");
    const sourceValue = p2?.present_value;
    const onRule = onEl ? onEl.value : p2?.virtual_binary?.on_value ?? "2";
    const offRule = offEl ? offEl.value : p2?.virtual_binary?.off_value ?? "1";
    const elseState = elseEl ? elseEl.value : p2?.virtual_binary?.else_state || "unavailable";
    let result = "unavailable";
    let tone = "unav";
    if (this._virtualRuleMatches(sourceValue, onRule)) {
      result = "ON";
      tone = "on";
    } else if (this._virtualRuleMatches(sourceValue, offRule) || String(elseState).toLowerCase() === "off") {
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
    } catch (_2) {
    }
    return `<details class="detail-section" data-section="${this._escape(id)}" ${open ? "open" : ""}><summary>${this._escape(title)}</summary><div class="detail-section-body">${content}</div></details>`;
  }
  _bindDetailToggles() {
    this.shadowRoot.querySelectorAll("details.detail-section[data-section]").forEach((details) => {
      details.addEventListener("toggle", () => {
        const id = details.getAttribute("data-section");
        if (!id) return;
        try {
          window.localStorage.setItem(`bepacom_section_${id}_open`, details.open ? "1" : "0");
        } catch (_2) {
        }
      });
    });
  }
  _normalizeSearch(value) {
    return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").trim();
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
      } catch (_2) {
        return normalizedHaystack.includes(term);
      }
    });
  }
  _slugify(value) {
    return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }
  _objectAssistantHtml(p2) {
    const rec = p2?.object_assistant;
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
    const body = this._sideTab === "virtual" ? this._sideVirtualHtml(selected) : selected ? this._detailHtml(selected) : `<div class="side-section-head"><h2>Point Inspector</h2><div class="muted">Wähle links ein Objekt aus.</div></div>`;
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
  _detailHtml(p2) {
    const inspector = this._inspector || {};
    const kv = [
      ["Objekt", p2.object_key],
      ["Name", p2.object_name || "-"],
      ["HA Entity ID", p2.entity_id || "-"],
      ["HA Entity Name", p2.entity_name || p2.entity_original_name || "-"],
      ["Device", p2.device_id],
      ["Present Value", this._value(p2.present_value)],
      ["BACnet Unit", p2.bacnet_unit || "-"],
      ["HA Unit", p2.ha_unit || "-"],
      ["Device Class", p2.device_class || "-"],
      ["State Class", p2.state_class || "-"],
      ["Override", p2.override_active ? "Ja" : "Nein"],
      ["Modus", this._plainModeLabel(p2)],
      ["Subscribed", p2.subscribed === null || p2.subscribed === void 0 ? "-" : p2.subscribed ? "Ja" : "Nein"],
      ["Aktives Polling", p2.fallback_polling ? "Ja" : "Nein"],
      ["Schreibbar", p2.writable ? "Ja" : "Nein"],
      ["Aktiv", p2.enabled ? "Ja" : "Nein"],
      ["Letztes Update", p2.last_update || "-"],
      ["Quelle", p2.last_update_source || "-"],
      ["Reliability", inspector.reliability || "-"],
      ["Status Flags", inspector.status_flags || "-"],
      ["COV Increment", inspector.cov_increment || "-"],
      ["Push Updates", p2.push_updates ?? inspector.push_updates ?? "-"],
      ["Polling Updates", p2.polling_updates ?? inspector.polling_updates ?? "-"],
      ["Value Changes", p2.value_changes ?? inspector.value_changes ?? "-"]
    ];
    const vb = p2.virtual_binary || {};
    const vbEnabled = !!p2.virtual_binary;
    const vbName = vb.name || "";
    const vbUniqueId = vb.unique_id || `${p2.unique_id}_binary`;
    const vbDeviceClass = vb.device_class || "plug";
    const vbOn = vb.on_value ?? "2";
    const vbOff = vb.off_value ?? "1";
    const vbElse = vb.else_state || "unavailable";
    const normalizedObjectType = String(p2.object_type || "").toLowerCase().replace(/[^a-z]/g, "");
    const isAnalogValue = normalizedObjectType === "analogvalue";
    const isMultiStateOutput = normalizedObjectType === "multistateoutput";
    const allowedWriteProfiles = isAnalogValue ? ["direct", "glt_set_as"] : isMultiStateOutput ? ["direct", "glt_set_stage"] : ["direct"];
    const writeProfile = allowedWriteProfiles.includes(p2.write_profile) ? p2.write_profile : "direct";
    const multistateRepresentation = p2.multistate_representation === "switch" ? "switch" : "number";
    const multistateEntitySettings = isMultiStateOutput ? `
      <h3 style="margin-top:14px;">Darstellung in Home Assistant</h3>
      <div class="muted" style="margin-bottom:8px;">Als Schalter wird nur der konfigurierte AUS- bzw. EIN-Wert geschrieben. Andere aktuelle Werte werden als unbekannt angezeigt.</div>
      <div class="edit-grid">
        <div><label>Entitätstyp</label><select id="editMultistateRepresentation">
          <option value="number" ${multistateRepresentation === "number" ? "selected" : ""}>Zahlenwert</option>
          <option value="switch" ${multistateRepresentation === "switch" ? "selected" : ""}>Schalter</option>
        </select></div>
        <div id="multistateSwitchValues" class="edit-grid" style="display:${multistateRepresentation === "switch" ? "contents" : "none"}">
          <div><label>AUS-Wert</label><input id="editMultistateOffValue" type="number" step="any" value="${this._escape(p2.multistate_off_value ?? 1)}"></div>
          <div><label>EIN-Wert</label><input id="editMultistateOnValue" type="number" step="any" value="${this._escape(p2.multistate_on_value ?? 2)}"></div>
        </div>
      </div>` : "";
    const profileDescription = isMultiStateOutput ? "Beim GLT/Stufe-Profil wird zuerst das binaryValue mit derselben Objekt-ID aktiviert und danach der Multi-State Output geschrieben. Beide Schreibvorgänge erfolgen fest auf BACnet-Priorität 8." : "Beim GLT/SET/AS-Profil wird das binaryValue mit derselben Objekt-ID verwendet. Alle Schreib- und Freigabevorgänge erfolgen fest auf BACnet-Priorität 8.";
    const numberSettings = isAnalogValue || isMultiStateOutput ? `
      <h3 style="margin-top:14px;">Stellbereich</h3>
      <div class="muted" style="margin-bottom:8px;">Grenzen und Schrittweite der Home-Assistant-Number sowie die BACnet-Schreibpriorität für direktes Schreiben.</div>
      <div class="edit-grid">
        <div><label>Mindestwert</label><input id="editNumberMin" type="number" step="any" value="${this._escape(p2.number_min ?? -1e6)}"></div>
        <div><label>Höchstwert</label><input id="editNumberMax" type="number" step="any" value="${this._escape(p2.number_max ?? 1e6)}"></div>
        <div><label>Schrittweite</label><input id="editNumberStep" type="number" min="0.000001" step="any" value="${this._escape(p2.number_step ?? 0.01)}"></div>
        <div><label>BACnet-Priorität</label><input id="editWritePriority" type="number" min="1" max="16" step="1" value="${this._escape(p2.write_priority ?? 8)}"></div>
      </div>
      <h3 style="margin-top:14px;">Schreibprofil</h3>
      <div class="muted" style="margin-bottom:8px;">${profileDescription}</div>
      <div class="edit-grid">
        <div><label>Profil</label><select id="editWriteProfile">
          <option value="direct" ${writeProfile === "direct" ? "selected" : ""}>Direkt schreiben</option>
          ${isAnalogValue ? `<option value="glt_set_as" ${writeProfile === "glt_set_as" ? "selected" : ""}>GLT → Wert setzen → AS</option>` : ""}
          ${isMultiStateOutput ? `<option value="glt_set_stage" ${writeProfile === "glt_set_stage" ? "selected" : ""}>GLT → Stufe setzen</option>` : ""}
        </select></div>
        <div><label>Wartezeit nach GLT aktivieren (ms)</label><input id="editGltDelayMs" type="number" min="0" max="60000" step="1" value="${this._escape(p2.glt_delay_ms ?? (isMultiStateOutput ? 2e3 : 1200))}"></div>
        ${isAnalogValue ? `
          <div><label>Wartezeit nach Wert schreiben (ms)</label><input id="editAsDelayMs" type="number" min="0" max="60000" step="1" value="${this._escape(p2.as_delay_ms ?? 1200)}"></div>
          <div><label>Wartezeit vor Freigabe (ms)</label><input id="editReleaseDelayMs" type="number" min="0" max="60000" step="1" value="${this._escape(p2.release_delay_ms ?? 200)}"></div>
          <div><label>Priorität 8 anschließend freigeben</label><div class="check"><input id="editReleasePriority" type="checkbox" ${p2.release_priority !== false ? "checked" : ""}> analogValue und binaryValue freigeben</div></div>
        ` : ""}
      </div>` : "";
    const editContent = `
      <div class="edit-grid">
        <div><label>HA Entity ID</label><input id="editEntityId" value="${this._escape(p2.entity_id || "")}" placeholder="z.B. sensor.rollostellung_eg_speis"></div>
        <div><label>HA Entitätsname</label><input id="editEntityName" value="${this._escape(p2.entity_name || "")}" placeholder="leer = Standardname"></div>
        <div><label>Einheit</label><select id="editUnit">${this._unitOptions(p2)}</select></div>
        <div><label>Device Class</label><select id="editDeviceClass">${this._deviceClassOptions(p2)}</select></div>
        <div><label>State Class</label><select id="editStateClass">${this._stateClassOptions(p2)}</select></div>
        <div><label>Aktualisierungsmodus</label><select id="editUpdateMode">${this._updateModeOptions(p2)}</select></div>
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
      ${this._objectAssistantHtml(p2)}
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
      <div id="virtualRulePreview">${this._virtualRulePreviewHtml(p2)}</div>
    `;
    const editActions = `
      <div class="inspector-head-actions">
        <button id="saveOverride" ${this._saving ? "disabled" : ""}>Speichern${this._saving ? " …" : ""}</button>
        <button id="discardEditor" class="secondary" ${!this._editorDirty || this._saving ? "disabled" : ""}>Änderungen verwerfen</button>
        <button id="resetOverride" class="secondary" ${this._saving ? "disabled" : ""}>Override zurücksetzen</button>
      </div>
    `;
    const inspectorContent = kv.map(([k2, v2]) => `<div class="kv"><div class="k">${this._escape(k2)}</div><div class="v">${this._escape(v2)}</div></div>`).join("");
    return `
      <div class="point-inspector-head">
        <div><h2>${this._escape(p2.object_key)}</h2><div class="muted">${this._escape(p2.object_name || "-")}</div></div>
        ${editActions}
      </div>
      <div id="editorDirtyBanner" class="dirty-banner" ${this._editorDirty ? "" : "hidden"}><strong>Ungespeicherte Änderungen</strong> – bitte speichern oder verwerfen.</div>
      <div id="editorValidation" class="validation-errors" ${this._editorErrors.length ? "" : "hidden"}>${this._editorErrors.map((error) => `<div>${this._escape(error)}</div>`).join("")}</div>
      <div id="priorityWarning" class="priority-warning" ${Number(p2.write_priority) >= 1 && Number(p2.write_priority) <= 7 ? "" : "hidden"}><strong>Achtung:</strong> Eine BACnet-Priorität zwischen 1 und 7 übersteuert den üblichen Bedienwert auf Priorität 8.</div>
      ${this._detailSection("config", "Konfiguration der Entität", editContent)}
      ${this._detailSection("virtual-config", "Virtuelle Entität konfigurieren", virtualEntityContent)}
      <div class="muted save-hint">Änderungen werden gespeichert, ohne die Integration sofort neu zu laden. Wenn du fertig bist, oben „Integration neu laden“ klicken.</div>
      ${this._detailSection("inspector", "Inspector", inspectorContent)}
      ${this._detailSection("engineering", "Engineering-Properties", this._engineeringHtml())}
    `;
  }
  _triStateCurrent(value) {
    if (value === null || value === void 0 || value === "" || value === "auto") return "__auto__";
    const normalized = String(value).trim().toLowerCase();
    if (["__auto__", "automatic", "automatisch"].includes(normalized)) return "__auto__";
    if (["__none__", "none", "null", "keine", "no", "false"].includes(normalized)) return "__none__";
    return String(value);
  }
  _unitOptions(p2) {
    const current = this._triStateCurrent(p2.override_unit);
    const values = [
      ["__auto__", `Automatisch (BACnet: ${p2.bacnet_unit || "keine"})`],
      ["__none__", "Keine Einheit"],
      ["%", "%"],
      ["°C", "°C"],
      ["cm", "cm"],
      ["W", "W"],
      ["kW", "kW"],
      ["Wh", "Wh"],
      ["kWh", "kWh"],
      ["V", "V"],
      ["A", "A"],
      ["Hz", "Hz"],
      ["lx", "lx"],
      ["Pa", "Pa"],
      ["bar", "bar"],
      ["min", "min"],
      ["s", "s"],
      ["h", "h"]
    ];
    return this._options(values, current);
  }
  _binaryDeviceClassOptions(current) {
    return this._options([
      ["", "Keine"],
      ["battery", "Batterie"],
      ["battery_charging", "Batterie lädt"],
      ["carbon_monoxide", "Kohlenmonoxid"],
      ["cold", "Kälte"],
      ["connectivity", "Verbindung"],
      ["door", "Tür"],
      ["garage_door", "Garagentor"],
      ["gas", "Gas"],
      ["heat", "Hitze"],
      ["light", "Licht"],
      ["lock", "Schloss"],
      ["moisture", "Feuchtigkeit"],
      ["motion", "Bewegung"],
      ["moving", "Bewegung / Stillstand"],
      ["occupancy", "Belegung"],
      ["opening", "Öffnung"],
      ["plug", "Steckdose / Plug"],
      ["power", "Strom"],
      ["presence", "Anwesenheit"],
      ["problem", "Problem"],
      ["running", "Läuft"],
      ["safety", "Sicherheit"],
      ["smoke", "Rauch"],
      ["sound", "Geräusch"],
      ["tamper", "Manipulation"],
      ["update", "Update"],
      ["vibration", "Vibration"],
      ["window", "Fenster"]
    ], current || "");
  }
  _deviceClassOptions(p2) {
    const current = this._triStateCurrent(p2.override_device_class);
    return this._options([
      ["__auto__", `Automatisch (${p2.device_class || "keine"})`],
      ["__none__", "Keine"],
      ["temperature", "Temperatur"],
      ["humidity", "Luftfeuchtigkeit"],
      ["power", "Leistung"],
      ["energy", "Energie"],
      ["voltage", "Spannung"],
      ["current", "Strom"],
      ["frequency", "Frequenz"],
      ["pressure", "Druck"],
      ["distance", "Entfernung"],
      ["illuminance", "Beleuchtungsstärke"],
      ["duration", "Dauer"],
      ["co2", "CO₂"],
      ["pm25", "PM2.5"],
      ["pm10", "PM10"]
    ], current);
  }
  _stateClassOptions(p2) {
    const current = this._triStateCurrent(p2.override_state_class);
    return this._options([
      ["__auto__", `Automatisch (${p2.state_class || "keine"})`],
      ["__none__", "Keine"],
      ["measurement", "measurement"],
      ["total", "total"],
      ["total_increasing", "total_increasing"]
    ], current);
  }
  _updateModeOptions(p2) {
    const current = p2.update_mode || (p2.enabled === false ? "disabled" : p2.subscribe === true ? "subscribe" : "disabled");
    return this._options([
      ["disabled", "Deaktiviert / keine Aktualisierung"],
      ["subscribe", "🔵 Push / Subscribe"],
      ["polling", "🟢 Polling"]
    ], current);
  }
  _options(values, current) {
    const hasCurrent = values.some(([value]) => value === current);
    const list = hasCurrent || current === "auto" ? values : [[current, `${current} (aktuell)`], ...values];
    return list.map(([value, label]) => `<option value="${this._escape(value)}" ${value === current ? "selected" : ""}>${this._escape(label)}</option>`).join("");
  }
  _modeLabel(p2) {
    const label = this._plainModeLabel(p2);
    const cls = p2.update_mode === "subscribe" ? "ok" : p2.update_mode === "polling" ? "warn" : "bad";
    return `<span class="pill ${cls}">${this._escape(label)}</span>`;
  }
  _modeChipHtml(p2) {
    const mode = p2.update_mode === "subscribe" ? "push" : p2.update_mode === "polling" ? "polling" : "off";
    return `<span class="mode-chip ${mode}">${this._escape(this._plainModeLabel(p2))}</span>`;
  }
  _plainModeLabel(p2) {
    if (p2.update_mode === "subscribe") return "Push / Subscribe";
    if (p2.update_mode === "polling") return "Polling";
    return "Deaktiviert";
  }
  _runtimeLabel(p2) {
    const dot = (state, label) => `<bepacom-runtime-indicator state="${state}" label="${this._escape(label)}"></bepacom-runtime-indicator>`;
    if (p2.update_mode === "disabled") return dot("off", "Aus");
    if (p2.update_mode === "subscribe" && this._diagnostics?.snapshot_websocket_mode === true && this._diagnostics?.subscriptions_initialized === true && this._diagnostics?.connected === true && Number(this._diagnostics?.snapshot_targets || 0) > 0) {
      return dot(
        "snapshot",
        "Snapshot aktiv – Aktualisierung über die gemeinsame Snapshot-Verbindung"
      );
    }
    if (p2.subscribed === true) return dot("push", "Push aktiv");
    if (p2.fallback_polling === true) return dot("poll", "Polling-Fallback aktiv");
    if (p2.update_mode === "polling") return dot("poll", "Polling aktiv");
    return dot("wait", "Wartet");
  }
  _value(value) {
    if (value === null || value === void 0 || value === "") return "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }
  _cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }
  _escape(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
}
if (!customElements.get("bepacom-explorer-view")) {
  customElements.define("bepacom-explorer-view", BepacomExplorerView);
}
var __defProp$6 = Object.defineProperty;
var __getOwnPropDesc$6 = Object.getOwnPropertyDescriptor;
var __decorateClass$6 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$6(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$6(target, key, result);
  return result;
};
let BepacomStatusMetric = class extends i {
  constructor() {
    super(...arguments);
    this.label = "";
    this.value = "-";
    this.icon = "ℹ️";
    this.tone = "";
  }
  render() {
    return b`
      <span class="icon" aria-hidden="true">${this.icon}</span>
      <span class="text">
        <strong title=${this.value}>${this.value}</strong>
        <small title=${this.label}>${this.label}</small>
      </span>
    `;
  }
};
BepacomStatusMetric.styles = i$3`
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
__decorateClass$6([
  n2()
], BepacomStatusMetric.prototype, "label", 2);
__decorateClass$6([
  n2()
], BepacomStatusMetric.prototype, "value", 2);
__decorateClass$6([
  n2()
], BepacomStatusMetric.prototype, "icon", 2);
__decorateClass$6([
  n2({ reflect: true })
], BepacomStatusMetric.prototype, "tone", 2);
BepacomStatusMetric = __decorateClass$6([
  t("bepacom-status-metric")
], BepacomStatusMetric);
var __defProp$5 = Object.defineProperty;
var __getOwnPropDesc$5 = Object.getOwnPropertyDescriptor;
var __decorateClass$5 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$5(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$5(target, key, result);
  return result;
};
let BepacomRuntimeIndicator = class extends i {
  constructor() {
    super(...arguments);
    this.state = "wait";
    this.label = "Wartet";
  }
  render() {
    return b`<span class=${this.state} role="img" aria-label=${this.label} title=${this.label}></span>`;
  }
};
BepacomRuntimeIndicator.styles = i$3`
    :host { display:inline-flex; align-items:center; justify-content:center; }
    span { display:inline-block; width:11px; height:11px; border:1px solid color-mix(in srgb,currentColor 35%,transparent); border-radius:50%; background:var(--secondary-text-color); box-shadow:0 0 0 3px color-mix(in srgb,currentColor 10%,transparent); }
    .off { color:var(--secondary-text-color); opacity:.55; }
    .snapshot,.push { color:#1e88e5; background:currentColor; }
    .poll { color:#43a047; background:currentColor; }
    .wait { color:var(--info-color,#039be5); background:transparent; }
  `;
__decorateClass$5([
  n2()
], BepacomRuntimeIndicator.prototype, "state", 2);
__decorateClass$5([
  n2()
], BepacomRuntimeIndicator.prototype, "label", 2);
BepacomRuntimeIndicator = __decorateClass$5([
  t("bepacom-runtime-indicator")
], BepacomRuntimeIndicator);
let BepacomObjectBadge = class extends i {
  constructor() {
    super(...arguments);
    this.kind = "other";
    this.label = "?";
    this.description = "";
  }
  render() {
    return b`<span class=${this.kind} title=${this.description}>${this.label}</span>`;
  }
};
BepacomObjectBadge.styles = i$3`
    :host { display:inline-flex; flex:0 0 auto; }
    span { box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border:1px solid var(--divider-color); border-radius:10px; background:var(--secondary-background-color); color:var(--primary-text-color); font-size:11px; font-weight:800; letter-spacing:.2px; }
    .ai,.ao,.av { color:#64b5f6; border-color:color-mix(in srgb,#64b5f6 50%,var(--divider-color)); }
    .bi,.bo,.bv { color:#81c784; border-color:color-mix(in srgb,#81c784 50%,var(--divider-color)); }
    .ms { color:#ffb74d; border-color:color-mix(in srgb,#ffb74d 50%,var(--divider-color)); }
  `;
__decorateClass$5([
  n2()
], BepacomObjectBadge.prototype, "kind", 2);
__decorateClass$5([
  n2()
], BepacomObjectBadge.prototype, "label", 2);
__decorateClass$5([
  n2()
], BepacomObjectBadge.prototype, "description", 2);
BepacomObjectBadge = __decorateClass$5([
  t("bepacom-object-badge")
], BepacomObjectBadge);
let BepacomWriteProfileIndicator = class extends i {
  constructor() {
    super(...arguments);
    this.glt = false;
  }
  render() {
    const label = this.glt ? "Über GLT schreiben" : "Direkt schreiben";
    return b`<span class=${this.glt ? "glt" : "direct"} role="img" aria-label=${label} title=${label}></span>`;
  }
};
BepacomWriteProfileIndicator.styles = i$3`
    :host { display:inline-flex; align-items:center; justify-content:center; }
    span { display:inline-block; width:10px; height:10px; border-radius:50%; border:1px solid color-mix(in srgb,currentColor 45%,transparent); box-shadow:0 0 0 3px color-mix(in srgb,currentColor 10%,transparent); }
    .direct { color:var(--primary-color); background:currentColor; }
    .glt { color:#ab47bc; background:currentColor; }
  `;
__decorateClass$5([
  n2({ type: Boolean })
], BepacomWriteProfileIndicator.prototype, "glt", 2);
BepacomWriteProfileIndicator = __decorateClass$5([
  t("bepacom-write-profile-indicator")
], BepacomWriteProfileIndicator);
var __defProp$4 = Object.defineProperty;
var __getOwnPropDesc$4 = Object.getOwnPropertyDescriptor;
var __decorateClass$4 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$4(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$4(target, key, result);
  return result;
};
let BepacomExplorerToolbar = class extends i {
  constructor() {
    super(...arguments);
    this.activeView = "explorer";
    this.virtualCount = 0;
    this.filters = {
      search: "",
      device_id: "all",
      object_type: "all",
      runtime: "all",
      only_overrides: false,
      only_subscribe: false
    };
    this.devices = [];
    this.objectTypes = [];
    this.groupBy = "type";
  }
  _emit(action, key, value) {
    this.dispatchEvent(
      new CustomEvent("bepacom-toolbar-action", {
        bubbles: true,
        composed: true,
        detail: { action, key, value }
      })
    );
  }
  render() {
    return b`
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
          @input=${(event) => this._emit("filter", "search", event.target.value)}
        >
      </div>

      <div class="field">
        <label for="device">Device</label>
        <select
          id="device"
          .value=${this.filters.device_id || "all"}
          @change=${(event) => this._emit("filter", "device_id", event.target.value)}
        >
          <option value="all">Alle Devices</option>
          ${this.devices.map((device) => b`<option value=${device}>Device ${device}</option>`)}
        </select>
      </div>

      <div class="field">
        <label for="type">Objekttyp</label>
        <select
          id="type"
          .value=${this.filters.object_type || "all"}
          @change=${(event) => this._emit("filter", "object_type", event.target.value)}
        >
          <option value="all">Alle Objekttypen</option>
          ${this.objectTypes.map((type) => b`<option value=${type}>${type}</option>`)}
        </select>
      </div>

      <div class="field">
        <label for="runtime">Status / Transport</label>
        <select
          id="runtime"
          .value=${this.filters.runtime || "all"}
          @change=${(event) => this._emit("runtime", "runtime", event.target.value)}
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
          @change=${(event) => this._emit("group", "groupBy", event.target.value)}
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
          @change=${(event) => this._emit("filter", "only_overrides", event.target.checked)}
        >
        nur Overrides
      </label>

      <label class="check">
        <input
          type="checkbox"
          .checked=${Boolean(this.filters.only_subscribe)}
          @change=${(event) => this._emit("filter", "only_subscribe", event.target.checked)}
        >
        <bepacom-runtime-indicator state="push" label="Subscribe"></bepacom-runtime-indicator>
        Subscribe
      </label>

      <button class="reset" @click=${() => this._emit("reset")}>Reset</button>
    `;
  }
};
BepacomExplorerToolbar.styles = i$3`
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

    :host-context(.theme-light) {
      border-color: rgba(62,52,39,.13);
      background: rgba(255,253,250,.88);
      box-shadow: 0 10px 28px rgba(78,61,39,.07);
      backdrop-filter: none;
    }

    :host-context(.theme-light) button {
      color:#3b3731;
      border-color:rgba(62,52,39,.14);
      background:rgba(255,255,255,.76);
    }

    :host-context(.theme-light) .tab.active {
      color:#fffaf2;
      border-color:rgba(184,121,38,.34);
      background:linear-gradient(135deg,#c99543,#a86c27);
    }

    :host-context(.theme-light) label { color:#797268; }

    :host-context(.theme-light) input,
    :host-context(.theme-light) select {
      color:#29251f;
      border-color:rgba(62,52,39,.15);
      background:#fffdfa;
    }

    :host-context(.theme-light) select { color-scheme:light; }
    :host-context(.theme-light) select option,
    :host-context(.theme-light) select optgroup { color:#29251f; background:#fffdfa; }
    :host-context(.theme-light) select option:checked { color:#2b2114; background:#ead5b3; }

    :host-context(.theme-light) .check { color:#3b3731; }

    @media (max-width: 1100px) {
      .nav {
        flex: 1 0 100%;
        padding: 2px 2px 8px;
        border-right: 0;
        border-bottom: 1px solid var(--divider-color);
      }
    }
  `;
__decorateClass$4([
  n2()
], BepacomExplorerToolbar.prototype, "activeView", 2);
__decorateClass$4([
  n2({ type: Number })
], BepacomExplorerToolbar.prototype, "virtualCount", 2);
__decorateClass$4([
  n2({ attribute: false })
], BepacomExplorerToolbar.prototype, "filters", 2);
__decorateClass$4([
  n2({ attribute: false })
], BepacomExplorerToolbar.prototype, "devices", 2);
__decorateClass$4([
  n2({ attribute: false })
], BepacomExplorerToolbar.prototype, "objectTypes", 2);
__decorateClass$4([
  n2()
], BepacomExplorerToolbar.prototype, "groupBy", 2);
BepacomExplorerToolbar = __decorateClass$4([
  t("bepacom-explorer-toolbar")
], BepacomExplorerToolbar);
var __defProp$3 = Object.defineProperty;
var __getOwnPropDesc$3 = Object.getOwnPropertyDescriptor;
var __decorateClass$3 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$3(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$3(target, key, result);
  return result;
};
let BepacomPointTable = class extends i {
  constructor() {
    super(...arguments);
    this.rows = [];
    this.emptyMessage = "Keine BACnet-Objekte gefunden.";
    this.sortKey = "object_key";
    this.sortDirection = "asc";
  }
  createRenderRoot() {
    return this;
  }
  _action(action, detail = {}) {
    this.dispatchEvent(
      new CustomEvent("bepacom-table-action", {
        detail: { action, ...detail },
        bubbles: true,
        composed: true
      })
    );
  }
  _header(key, label, className = "") {
    const marker = this.sortKey === key ? this.sortDirection === "asc" ? " ▲" : " ▼" : "";
    return b`
      <th class=${`sortable ${className}`}>
        <button class="sort-btn" @click=${() => this._action("sort", { key })}>${label}${marker}</button>
      </th>
    `;
  }
  _pointRow(row) {
    return b`
      <tr
        class=${`${row.selected ? "selected" : ""} ${row.changeClass}`}
        data-uid=${row.uniqueId}
        @click=${() => this._action("select-point", { uniqueId: row.uniqueId })}
        @dblclick=${(event) => {
      if (event.target?.closest("input, select, button")) return;
      this._action("open-details", { uniqueId: row.uniqueId });
    }}
      >
        <td class="select-col">
          <input
            class="row-select"
            type="checkbox"
            .checked=${row.checked}
            @click=${(event) => {
      event.stopPropagation();
      this._action("select-row", {
        uniqueId: row.uniqueId,
        checked: event.currentTarget.checked
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
              @click=${(event) => {
      event.stopPropagation();
      this._action("more-info", { entityId: row.entityId });
    }}
            >${row.entityName}</button>
            ${row.linkedEntities.length ? b`
                  <div class="linked-entities">
                    <span class="virtual-badge" title=${`${row.linkedEntities.length} virtuelle Entität${row.linkedEntities.length === 1 ? "" : "en"}`}>
                      🔗 ${row.linkedEntities.length}
                    </span>
                    ${row.linkedEntities.map(
      (link) => b`
                        <button
                          class="linked-entity-link"
                          title=${link.title}
                          ?disabled=${!link.entityId}
                          @click=${(event) => {
        event.stopPropagation();
        this._action("more-info", { entityId: link.entityId });
      }}
                        >↳ <span class="linked-icon">${link.icon}</span> <span class="linked-name">${link.name}</span> <span class="linked-state">${link.state}</span></button>
                      `
    )}
                  </div>
                ` : ""}
          </div>
        </td>
        <td data-col="value">
          <button
            class="link-cell value-link"
            @click=${(event) => {
      event.stopPropagation();
      this._action("more-info", { entityId: row.entityId });
    }}
          >${row.value}</button>
        </td>
        <td data-col="unit"><div class="unit-stack"><span class="unit-display">${row.unit}</span></div></td>
        <td data-col="override">${row.overrideActive ? b`<span class="pill ok">Override</span>` : b`<span class="pill">Standard</span>`}</td>
        <td data-col="write-profile" class="write-profile-cell">
          <bepacom-write-profile-indicator .glt=${row.writeViaGlt}></bepacom-write-profile-indicator>
        </td>
        <td data-col="status">
          <bepacom-runtime-indicator .state=${row.runtimeState} .label=${row.runtimeLabel}></bepacom-runtime-indicator>
        </td>
      </tr>
    `;
  }
  render() {
    if (!this.rows.length) return b`<div class="empty">${this.emptyMessage}</div>`;
    return b`
      <table>
        <colgroup>
          <col class="select-col-col"><col class="object-col-col"><col class="entity-col-col"><col class="value-col-col">
          <col class="unit-col-col"><col class="override-col-col"><col class="write-profile-col-col"><col class="runtime-col-col">
        </colgroup>
        <thead>
          <tr>
            <th class="select-col">
              <input type="checkbox" title="Sichtbare auswählen" @change=${(event) => this._action("select-visible", { checked: event.currentTarget.checked })}>
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
      if (row.kind === "spacer") return b`<tr class="virtual-spacer"><td colspan="8" style=${`height:${row.height}px`}></td></tr>`;
      if (row.kind === "group") {
        return b`
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
};
__decorateClass$3([
  n2({ attribute: false })
], BepacomPointTable.prototype, "rows", 2);
__decorateClass$3([
  n2()
], BepacomPointTable.prototype, "emptyMessage", 2);
__decorateClass$3([
  n2()
], BepacomPointTable.prototype, "sortKey", 2);
__decorateClass$3([
  n2()
], BepacomPointTable.prototype, "sortDirection", 2);
BepacomPointTable = __decorateClass$3([
  t("bepacom-point-table")
], BepacomPointTable);
var __defProp$2 = Object.defineProperty;
var __getOwnPropDesc$2 = Object.getOwnPropertyDescriptor;
var __decorateClass$2 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$2(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$2(target, key, result);
  return result;
};
const EMPTY_MODEL$1 = {
  sideTab: "inspector",
  selected: null,
  inspector: {},
  linkedEntities: [],
  saving: false,
  dirty: false,
  errors: [],
  sectionOpen: {},
  preview: { sourceValue: "-", result: "unavailable", tone: "unknown" }
};
let BepacomPointInspector = class extends i {
  constructor() {
    super(...arguments);
    this.model = EMPTY_MODEL$1;
  }
  createRenderRoot() {
    return this;
  }
  _action(action, detail = {}) {
    this.dispatchEvent(new CustomEvent("bepacom-inspector-action", {
      detail: { action, ...detail },
      bubbles: true,
      composed: true
    }));
  }
  _value(value) {
    if (value === null || value === void 0 || value === "") return "-";
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }
  _current(value) {
    if (value === null || value === void 0 || value === "" || value === "auto") return "__auto__";
    const normalized = String(value).trim().toLowerCase();
    if (["__auto__", "automatic", "automatisch"].includes(normalized)) return "__auto__";
    if (["__none__", "none", "null", "keine", "no", "false"].includes(normalized)) return "__none__";
    return String(value);
  }
  _options(values, current) {
    const list = values.some(([value]) => value === current) ? values : [[current, `${current} (aktuell)`], ...values];
    return list.map(([value, label]) => b`<option value=${value} ?selected=${value === current}>${label}</option>`);
  }
  _section(id, title, content) {
    return b`
      <details class="detail-section" data-section=${id} ?open=${!!this.model.sectionOpen[id]}>
        <summary>${title}</summary>
        <div class="detail-section-body">${content}</div>
      </details>
    `;
  }
  _tabs() {
    const count = this.model.linkedEntities.length;
    const tab = (id, label) => b`
      <button class=${`side-tab ${this.model.sideTab === id ? "active" : ""}`} @click=${() => this._action("tab", { value: id })}>${label}</button>
    `;
    return b`
      <div class="side-tabs">
        ${tab("inspector", "Point Inspector")}
        ${tab("virtual", `Virtuelle Entitäten${count ? ` (${count})` : ""}`)}
        ${tab("technical", "Inspector")}
        ${tab("engineering", "Engineering-Properties")}
      </div>
    `;
  }
  _virtualOverview() {
    const point = this.model.selected;
    if (!point) return b`<div class="side-section-head"><h2>Virtuelle Entitäten</h2><div class="muted">Wähle links einen BACnet-Punkt aus.</div></div>`;
    return b`
      <div class="side-section-head">
        <h2>Virtuelle Entitäten</h2>
        <div class="selected-source-box">
          <div><strong>Quelle:</strong> ${point.object_key || point.unique_id || "-"}</div>
          <div class="muted">${point.object_name || ""}</div>
          <div class="muted">${this.model.linkedEntities.length} verknüpfte virtuelle Entität${this.model.linkedEntities.length === 1 ? "" : "en"}</div>
        </div>
      </div>
      <div class="side-virtual-cards">
        ${this.model.linkedEntities.length ? this.model.linkedEntities.map((entity) => b`
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
            `) : b`<div class="muted">Für diesen Punkt sind noch keine virtuellen Entitäten vorhanden.</div>`}
      </div>
      <div class="actions"><button @click=${() => this._action("create-virtual")}>+ Neue virtuelle Entität</button></div>
      <div class="muted" style="margin-top:8px;">Neue Einträge werden im Point Inspector unter „Virtuelle Entität konfigurieren“ angelegt.</div>
    `;
  }
  _configuration(point) {
    const type = String(point.object_type || "").toLowerCase().replace(/[^a-z]/g, "");
    const analog = type === "analogvalue";
    const multistate = type === "multistateoutput";
    const representation = point.multistate_representation === "switch" ? "switch" : "number";
    const unit = this._current(point.override_unit);
    const deviceClass = this._current(point.override_device_class);
    const stateClass = this._current(point.override_state_class);
    const updateMode = point.update_mode || (point.enabled === false ? "disabled" : point.subscribe ? "subscribe" : "disabled");
    const writeProfile = point.write_profile || "direct";
    return b`
      <div class="edit-grid">
        <div><label>HA Entity ID</label><input id="editEntityId" .value=${point.entity_id || ""}></div>
        <div><label>HA Entitätsname</label><input id="editEntityName" .value=${point.entity_name || ""} placeholder="leer = Standardname"></div>
        <div><label>Einheit</label><select id="editUnit">${this._options([
      ["__auto__", `Automatisch (BACnet: ${point.bacnet_unit || "keine"})`],
      ["__none__", "Keine Einheit"],
      ["%", "%"],
      ["°C", "°C"],
      ["cm", "cm"],
      ["W", "W"],
      ["kW", "kW"],
      ["Wh", "Wh"],
      ["kWh", "kWh"],
      ["V", "V"],
      ["A", "A"],
      ["Hz", "Hz"],
      ["lx", "lx"],
      ["Pa", "Pa"],
      ["bar", "bar"],
      ["min", "min"],
      ["s", "s"],
      ["h", "h"]
    ], unit)}</select></div>
        <div><label>Device Class</label><select id="editDeviceClass">${this._options([
      ["__auto__", `Automatisch (${point.device_class || "keine"})`],
      ["__none__", "Keine"],
      ["temperature", "Temperatur"],
      ["humidity", "Luftfeuchtigkeit"],
      ["power", "Leistung"],
      ["energy", "Energie"],
      ["voltage", "Spannung"],
      ["current", "Strom"],
      ["frequency", "Frequenz"],
      ["pressure", "Druck"],
      ["distance", "Entfernung"],
      ["illuminance", "Beleuchtungsstärke"],
      ["duration", "Dauer"],
      ["co2", "CO₂"],
      ["pm25", "PM2.5"],
      ["pm10", "PM10"]
    ], deviceClass)}</select></div>
        <div><label>State Class</label><select id="editStateClass">${this._options([
      ["__auto__", `Automatisch (${point.state_class || "keine"})`],
      ["__none__", "Keine"],
      ["measurement", "measurement"],
      ["total", "total"],
      ["total_increasing", "total_increasing"]
    ], stateClass)}</select></div>
        <div><label>Aktualisierungsmodus</label><select id="editUpdateMode">${this._options([
      ["disabled", "Deaktiviert / keine Aktualisierung"],
      ["subscribe", "🔵 Push / Subscribe"],
      ["polling", "🟢 Polling"]
    ], updateMode)}</select></div>
      </div>
      ${multistate ? b`
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
      ` : A}
      ${analog || multistate ? b`
        <h3 style="margin-top:14px;">Stellbereich</h3>
        <div class="edit-grid">
          <div><label>Mindestwert</label><input id="editNumberMin" type="number" step="any" .value=${String(point.number_min ?? -1e6)}></div>
          <div><label>Höchstwert</label><input id="editNumberMax" type="number" step="any" .value=${String(point.number_max ?? 1e6)}></div>
          <div><label>Schrittweite</label><input id="editNumberStep" type="number" min="0.000001" step="any" .value=${String(point.number_step ?? 0.01)}></div>
          <div><label>BACnet-Priorität</label><input id="editWritePriority" type="number" min="1" max="16" .value=${String(point.write_priority ?? 8)}></div>
        </div>
        <h3 style="margin-top:14px;">Schreibprofil</h3>
        <div class="edit-grid">
          <div><label>Profil</label><select id="editWriteProfile">
            <option value="direct" ?selected=${writeProfile === "direct"}>Direkt schreiben</option>
            ${analog ? b`<option value="glt_set_as" ?selected=${writeProfile === "glt_set_as"}>GLT → Wert setzen → AS</option>` : A}
            ${multistate ? b`<option value="glt_set_stage" ?selected=${writeProfile === "glt_set_stage"}>GLT → Stufe setzen</option>` : A}
          </select></div>
          <div><label>Wartezeit nach GLT aktivieren (ms)</label><input id="editGltDelayMs" type="number" min="0" max="60000" .value=${String(point.glt_delay_ms ?? (multistate ? 2e3 : 1200))}></div>
          ${analog ? b`
            <div><label>Wartezeit nach Wert schreiben (ms)</label><input id="editAsDelayMs" type="number" min="0" max="60000" .value=${String(point.as_delay_ms ?? 1200)}></div>
            <div><label>Wartezeit vor Freigabe (ms)</label><input id="editReleaseDelayMs" type="number" min="0" max="60000" .value=${String(point.release_delay_ms ?? 200)}></div>
            <div><label>Priorität 8 anschließend freigeben</label><div class="check"><input id="editReleasePriority" type="checkbox" .checked=${point.release_priority !== false}> analogValue und binaryValue freigeben</div></div>
          ` : A}
        </div>
      ` : A}
    `;
  }
  _virtualConfiguration(point) {
    const virtual = point.virtual_binary || {};
    const assistant = point.object_assistant?.kind === "virtual_binary" ? point.object_assistant : null;
    const deviceClasses = [
      ["", "Keine"],
      ["battery", "Batterie"],
      ["connectivity", "Verbindung"],
      ["door", "Tür"],
      ["garage_door", "Garagentor"],
      ["gas", "Gas"],
      ["heat", "Hitze"],
      ["light", "Licht"],
      ["lock", "Schloss"],
      ["moisture", "Feuchtigkeit"],
      ["motion", "Bewegung"],
      ["occupancy", "Belegung"],
      ["opening", "Öffnung"],
      ["plug", "Steckdose / Plug"],
      ["power", "Strom"],
      ["presence", "Anwesenheit"],
      ["problem", "Problem"],
      ["running", "Läuft"],
      ["safety", "Sicherheit"],
      ["smoke", "Rauch"],
      ["sound", "Geräusch"],
      ["tamper", "Manipulation"],
      ["vibration", "Vibration"],
      ["window", "Fenster"]
    ];
    return b`
      <div class="muted" style="margin-bottom:8px;">Erzeugt zusätzlich eine Binary-Sensor-Entität aus diesem Rohwert.</div>
      <div class="rule-help"><strong>Regel-Hilfe:</strong> <code>2</code>, <code>&gt;2</code>, <code>1,2,5</code>, <code>2-5</code>, <code>active</code> oder <code>value &gt; 10 &amp;&amp; value &lt; 20</code></div>
      ${assistant ? b`
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
      ` : A}
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
  _inspector() {
    const point = this.model.selected;
    if (!point) return b`<div class="side-section-head"><h2>Point Inspector</h2><div class="muted">Wähle links ein Objekt aus.</div></div>`;
    const inspector = this.model.inspector || {};
    [
      ["Objekt", point.object_key],
      ["Name", point.object_name || "-"],
      ["HA Entity ID", point.entity_id || "-"],
      ["HA Entity Name", point.entity_name || point.entity_original_name || "-"],
      ["Device", point.device_id],
      ["Present Value", this._value(point.present_value)],
      ["BACnet Unit", point.bacnet_unit || "-"],
      ["HA Unit", point.ha_unit || "-"],
      ["Device Class", point.device_class || "-"],
      ["State Class", point.state_class || "-"],
      ["Override", point.override_active ? "Ja" : "Nein"],
      ["Modus", point.update_mode === "subscribe" ? "Push / Subscribe" : point.update_mode === "polling" ? "Polling" : "Deaktiviert"],
      ["Subscribed", point.subscribed == null ? "-" : point.subscribed ? "Ja" : "Nein"],
      ["Aktives Polling", point.fallback_polling ? "Ja" : "Nein"],
      ["Schreibbar", point.writable ? "Ja" : "Nein"],
      ["Aktiv", point.enabled ? "Ja" : "Nein"],
      ["Letztes Update", point.last_update || "-"],
      ["Quelle", point.last_update_source || "-"],
      ["Reliability", inspector.reliability || "-"],
      ["Status Flags", inspector.status_flags || "-"],
      ["COV Increment", inspector.cov_increment || "-"],
      ["Push Updates", point.push_updates ?? inspector.push_updates ?? "-"],
      ["Polling Updates", point.polling_updates ?? inspector.polling_updates ?? "-"],
      ["Value Changes", point.value_changes ?? inspector.value_changes ?? "-"]
    ];
    const raw = inspector.raw || inspector;
    Object.entries(raw);
    return b`
      <div class="point-inspector-head">
        <div><h2>${point.object_key}</h2><div class="muted">${point.object_name || "-"}</div></div>
        <div class="inspector-head-actions">
          <button id="saveOverride" ?disabled=${this.model.saving}>Speichern${this.model.saving ? " …" : ""}</button>
          <button id="discardEditor" class="secondary" ?disabled=${!this.model.dirty || this.model.saving}>Änderungen verwerfen</button>
          <button id="resetOverride" class="secondary" ?disabled=${this.model.saving}>Override zurücksetzen</button>
        </div>
      </div>
      <div id="editorDirtyBanner" class="dirty-banner" ?hidden=${!this.model.dirty}><strong>Ungespeicherte Änderungen</strong> – bitte speichern oder verwerfen.</div>
      <div id="editorValidation" class="validation-errors" ?hidden=${!this.model.errors.length}>${this.model.errors.map((error) => b`<div>${error}</div>`)}</div>
      <div id="priorityWarning" class="priority-warning" ?hidden=${!(Number(point.write_priority) >= 1 && Number(point.write_priority) <= 7)}>
        <strong>Achtung:</strong> Eine BACnet-Priorität zwischen 1 und 7 übersteuert den üblichen Bedienwert auf Priorität 8.
      </div>
      ${this._section("config", "Konfiguration der Entität", this._configuration(point))}
      ${this._section("virtual-config", "Virtuelle Entität konfigurieren", this._virtualConfiguration(point))}
    `;
  }
  _technicalInspector() {
    const point = this.model.selected;
    if (!point) return b`<div class="side-section-head"><h2>Inspector</h2><div class="muted">Wähle links ein Objekt aus.</div></div>`;
    const inspector = this.model.inspector || {};
    const values = [
      ["Objekt", point.object_key],
      ["Name", point.object_name || "-"],
      ["HA Entity ID", point.entity_id || "-"],
      ["HA Entity Name", point.entity_name || point.entity_original_name || "-"],
      ["Device", point.device_id],
      ["Present Value", this._value(point.present_value)],
      ["BACnet Unit", point.bacnet_unit || "-"],
      ["HA Unit", point.ha_unit || "-"],
      ["Device Class", point.device_class || "-"],
      ["State Class", point.state_class || "-"],
      ["Override", point.override_active ? "Ja" : "Nein"],
      ["Modus", point.update_mode === "subscribe" ? "Push / Subscribe" : point.update_mode === "polling" ? "Polling" : "Deaktiviert"],
      ["Subscribed", point.subscribed == null ? "-" : point.subscribed ? "Ja" : "Nein"],
      ["Aktives Polling", point.fallback_polling ? "Ja" : "Nein"],
      ["Schreibbar", point.writable ? "Ja" : "Nein"],
      ["Aktiv", point.enabled ? "Ja" : "Nein"],
      ["Letztes Update", point.last_update || "-"],
      ["Quelle", point.last_update_source || "-"],
      ["Reliability", inspector.reliability || "-"],
      ["Status Flags", inspector.status_flags || "-"],
      ["COV Increment", inspector.cov_increment || "-"],
      ["Push Updates", point.push_updates ?? inspector.push_updates ?? "-"],
      ["Polling Updates", point.polling_updates ?? inspector.polling_updates ?? "-"],
      ["Value Changes", point.value_changes ?? inspector.value_changes ?? "-"]
    ];
    return b`
      <div class="side-section-head"><h2>Inspector</h2><div class="muted">${point.object_key || ""}</div></div>
      ${values.map(([key, value]) => b`<div class="kv"><div class="k">${key}</div><div class="v">${this._value(value)}</div></div>`)}
    `;
  }
  _engineeringProperties() {
    const point = this.model.selected;
    if (!point) return b`<div class="side-section-head"><h2>Engineering-Properties</h2><div class="muted">Wähle links ein Objekt aus.</div></div>`;
    const inspector = this.model.inspector || {};
    const rows = Object.entries(inspector.raw || inspector);
    return b`
      <div class="side-section-head"><h2>Engineering-Properties</h2><div class="muted">${point.object_key || ""}</div></div>
      ${rows.length ? rows.map(([key, value]) => b`<div class="kv"><div class="k">${key}</div><div class="v"><code>${this._value(value)}</code></div></div>`) : b`<div class="muted">Keine zusätzlichen Engineering-Daten vorhanden.</div>`}
    `;
  }
  render() {
    const content = this.model.sideTab === "virtual" ? this._virtualOverview() : this.model.sideTab === "technical" ? this._technicalInspector() : this.model.sideTab === "engineering" ? this._engineeringProperties() : this._inspector();
    return b`${this._tabs()}<div class="side-body">${content}</div>`;
  }
  updated() {
    this.dispatchEvent(new CustomEvent("bepacom-inspector-rendered", {
      bubbles: true,
      composed: true
    }));
  }
};
__decorateClass$2([
  n2({ attribute: false })
], BepacomPointInspector.prototype, "model", 2);
BepacomPointInspector = __decorateClass$2([
  t("bepacom-point-inspector")
], BepacomPointInspector);
var __defProp$1 = Object.defineProperty;
var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
var __decorateClass$1 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$1(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$1(target, key, result);
  return result;
};
const EMPTY_MODEL = {
  open: false,
  tab: "live",
  summary: "",
  configured: [],
  runtime: [],
  developer: [],
  liveChanges: [],
  livePaused: false,
  liveFilters: { search: "", source: "all", object_type: "all" }
};
let BepacomRuntimeDashboard = class extends i {
  constructor() {
    super(...arguments);
    this.model = EMPTY_MODEL;
  }
  createRenderRoot() {
    return this;
  }
  _action(action, detail = {}) {
    this.dispatchEvent(
      new CustomEvent("bepacom-dashboard-action", {
        detail: { action, ...detail },
        bubbles: true,
        composed: true
      })
    );
  }
  _cards(cards) {
    return cards.map(
      (card) => b`
        <bepacom-status-metric
          .label=${card.label}
          .value=${String(card.value ?? "-")}
          .icon=${card.icon}
          .tone=${card.tone}
        ></bepacom-status-metric>
      `
    );
  }
  _headlineCards() {
    const byLabel = (cards2, label) => cards2.find((card) => card.label === label);
    const cards = [
      byLabel(this.model.configured, "BACnet-Punkte"),
      byLabel(this.model.configured, "Aktive Entitäten"),
      byLabel(this.model.runtime, "Verbunden"),
      byLabel(this.model.runtime, "Verbindungsfehler")
    ].filter((card) => Boolean(card));
    return cards.map((card) => b`
      <div class=${`dashboard-headline-card ${card.tone || ""}`}>
        <span class="dashboard-headline-icon" aria-hidden="true">${card.icon}</span>
        <span>
          <small>${card.label}</small>
          <strong>${String(card.value ?? "-")}</strong>
        </span>
      </div>
    `);
  }
  _navigation() {
    const item = (tab, icon, label, suffix = "") => b`
      <button
        class=${`dashboard-nav-item ${this.model.tab === tab ? "active" : ""}`}
        @click=${() => this._action("tab", { value: tab })}
      >
        <span class="dashboard-nav-icon" aria-hidden="true">${icon}</span>
        <span>${label}</span>
        ${suffix}
      </button>
    `;
    return b`
      <nav class="dashboard-nav" aria-label="Statusbereiche">
        ${item("configuration", "▦", "Konfiguration")}
        ${item("live", "▤", "Live-Log", b`<span class=${`live-dot ${this.model.livePaused ? "paused" : ""}`}></span>`)}
        ${item("developer", "◇", "Push-Diagnose")}
      </nav>
    `;
  }
  _normalize(value) {
    return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").trim();
  }
  _matches(haystack, query) {
    const terms = this._normalize(query).split(/\s+/).filter(Boolean);
    const normalized = this._normalize(haystack);
    return terms.every((term) => {
      if (!term.includes("*") && !term.includes("?")) return normalized.includes(term);
      const escaped = term.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      return new RegExp(escaped.replace(/\*/g, ".*").replace(/\?/g, "."), "i").test(normalized);
    });
  }
  _filteredChanges() {
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
          item.source
        ].join(" "),
        liveFilters.search
      );
    });
  }
  _formatTime(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  _displayValue(value) {
    if (value === null || value === void 0 || value === "") return "-";
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }
  _liveMonitor() {
    const filtered = this._filteredChanges();
    const bins = Array.from({ length: 60 }, () => 0);
    const now = Date.now();
    for (const item of this.model.liveChanges) {
      const age = Math.floor((now - Date.parse(item.ts || "")) / 1e3);
      if (age >= 0 && age < 60) bins[59 - age] += 1;
    }
    const peak = Math.max(0, ...bins);
    const lastMinute = bins.reduce((sum, count) => sum + count, 0);
    const average = (lastMinute / 60).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const sources = [...new Set(this.model.liveChanges.map((item) => String(item.source || "unknown")))].sort();
    const types = [...new Set(this.model.liveChanges.map((item) => String(item.object_type || "unknown")))].sort();
    return b`
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
      const height = peak ? Math.max(3, Math.round(count / peak * 50)) : 3;
      return b`<i style=${`height:${height}px`} title=${`${count} Änderung${count === 1 ? "" : "en"}`}></i>`;
    })}
        </div>
        <div class="live-filters">
          <input
            .value=${this.model.liveFilters.search}
            placeholder="Filter / Wildcards …"
            @input=${(event) => this._action("live-filter", {
      key: "search",
      value: event.currentTarget.value
    })}
          >
          <select
            .value=${this.model.liveFilters.source}
            @change=${(event) => this._action("live-filter", {
      key: "source",
      value: event.currentTarget.value
    })}
          >
            <option value="all">Alle Quellen</option>
            ${sources.map((source) => b`<option value=${source}>${source}</option>`)}
          </select>
          <select
            .value=${this.model.liveFilters.object_type}
            @change=${(event) => this._action("live-filter", {
      key: "object_type",
      value: event.currentTarget.value
    })}
          >
            <option value="all">Alle Typen</option>
            ${types.map((type) => b`<option value=${type}>${type}</option>`)}
          </select>
          <button class="secondary live-small-btn" title="Monitorverlauf leeren" @click=${() => this._action("clear-live")}>
            Leeren
          </button>
        </div>
        <div class="live-table-wrap">
          <table class="live-table">
            <thead><tr><th>Zeit</th><th>Punkt</th><th>Alt → Neu</th><th>Quelle</th></tr></thead>
            <tbody>
              ${filtered.length ? filtered.slice(-120).reverse().map(
      (item) => b`
                      <tr
                        title=${`${item.device_id}/${item.object_type}:${item.object_id} · Im Point Inspector öffnen`}
                        @click=${() => this._action("select-point", { uniqueId: item.resolved_unique_id || item.unique_id })}
                      >
                        <td>${this._formatTime(item.ts)}</td>
                        <td><b>${item.friendly_name || item.object_name || item.object_key || item.unique_id}</b><small>${item.entity_id || item.object_key || item.unique_id}</small></td>
                        <td class="live-value">${this._displayValue(item.previous_value)}<span>→</span>${this._displayValue(item.value)}</td>
                        <td><span class="live-source">${item.source || "-"}</span></td>
                      </tr>
                    `
    ) : b`<tr><td colspan="4" class="muted">Noch keine passenden Wertänderungen.</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="live-foot">Ringpuffer: maximal 10.000 Änderungen · angezeigt werden die neuesten 120 Treffer</div>
      </div>
    `;
  }
  render() {
    const model = this.model || EMPTY_MODEL;
    return b`
      <section class="dashboard-shell">
        <div class="dashboard-page-heading">
          <span class="dashboard-toggle-title">${model.tab === "live" ? "Live-Ansicht" : "Diagnose"}</span>
          <span class="dashboard-summary">${model.summary}</span>
        </div>
        <div class=${`dashboard-content dashboard-content-${model.tab}`}>
          ${model.tab === "live" ? b`
                <section class="dashboard-group dashboard-group-wide dashboard-monitor-group">
                  ${this._liveMonitor()}
                </section>
              ` : b`
                <div class="dashboard-diagnostics-grid">
                  <section class="dashboard-group">
                    <div class="dashboard-title">Konfigurationswerte</div>
                    <div class="dashboard-cards">${this._cards(model.configured)}</div>
                  </section>
                  <section class="dashboard-group">
                    <div class="dashboard-title">System / Laufzeit</div>
                    <div class="dashboard-cards">${this._cards(model.runtime)}</div>
                  </section>
                  <section class="dashboard-group dashboard-group-wide dashboard-monitor-group">
                    <div class="dashboard-title">Push-Diagnose</div>
                    <div class="dashboard-cards">${this._cards(model.developer)}</div>
                  </section>
                </div>
              `}
        </div>
      </section>
    `;
  }
};
__decorateClass$1([
  n2({ attribute: false })
], BepacomRuntimeDashboard.prototype, "model", 2);
BepacomRuntimeDashboard = __decorateClass$1([
  t("bepacom-runtime-dashboard")
], BepacomRuntimeDashboard);
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};
let BepacomExplorerPanel = class extends i {
  constructor() {
    super(...arguments);
    this.narrow = false;
  }
  render() {
    return b`<bepacom-explorer-view></bepacom-explorer-view>`;
  }
  updated() {
    if (!this._explorer) return;
    this._explorer.panel = this.panel;
    this._explorer.hass = this.hass;
  }
};
BepacomExplorerPanel.styles = i$3`
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
__decorateClass([
  n2({ attribute: false })
], BepacomExplorerPanel.prototype, "hass", 2);
__decorateClass([
  n2({ attribute: false })
], BepacomExplorerPanel.prototype, "panel", 2);
__decorateClass([
  n2({ attribute: false })
], BepacomExplorerPanel.prototype, "narrow", 2);
__decorateClass([
  n2({ attribute: false })
], BepacomExplorerPanel.prototype, "route", 2);
__decorateClass([
  e("bepacom-explorer-view")
], BepacomExplorerPanel.prototype, "_explorer", 2);
BepacomExplorerPanel = __decorateClass([
  t("bepacom-explorer-panel")
], BepacomExplorerPanel);
export {
  BepacomExplorerPanel
};
