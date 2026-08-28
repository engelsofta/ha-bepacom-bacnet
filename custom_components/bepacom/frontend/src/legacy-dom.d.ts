// The explorer is progressively migrating from direct DOM wiring to typed
// components. These members describe the dynamic controls and custom elements
// used at that boundary so the remaining implementation is still type-checked.
interface Element {
  [key: string]: any;
}

interface HTMLElement {
  [key: string]: any;
}

interface EventTarget {
  [key: string]: any;
}

interface Event {
  [key: string]: any;
}
