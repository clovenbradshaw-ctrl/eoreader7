// ledger-dom.mjs — the rehearsal witness's own stub document.
//
// Not jsdom, not a dependency: a hand-rolled minimal DOM in the same spirit
// as witness.js::scriptBodies and render.test.mjs's stubDoc — enough
// structure that a small model's generated markup (static rows, an
// innerHTML-built grid, or a createElement loop) all execute the same way,
// and enough event machinery (addEventListener + real bubbling) that
// delegated handlers on a grid container fire exactly like a browser's
// would. Pure: no browser, no network, node-only.
//
// This is deliberately narrower than a browser: no CSS cascade, no layout,
// no innerHTML serialization beyond what parseFragment can re-read. It
// exists to fire events at a projected artifact and read back what changed
// — the "does the behavior hold" question the browser's own witness chip
// cannot answer node-side.

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const SKIP_CONTENT_TAGS = new Set(["script", "style"]);

function camelCase(prop) {
  return prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
function kebabCase(prop) {
  return prop.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
}

class ClassList {
  constructor(el) {
    this.el = el;
  }
  get _set() {
    return new Set((this.el.attrs.class ?? "").split(/\s+/).filter(Boolean));
  }
  _write(set) {
    this.el.attrs.class = [...set].join(" ");
  }
  add(...names) {
    const s = this._set;
    for (const n of names) s.add(n);
    this._write(s);
  }
  remove(...names) {
    const s = this._set;
    for (const n of names) s.delete(n);
    this._write(s);
  }
  toggle(name, force) {
    const s = this._set;
    const has = s.has(name);
    const want = force === undefined ? !has : !!force;
    if (want) s.add(name);
    else s.delete(name);
    this._write(s);
    return want;
  }
  contains(name) {
    return this._set.has(name);
  }
}

class StyleProxy {
  constructor(el) {
    return new Proxy(this, {
      get(_t, prop) {
        if (prop === "cssText") return el.attrs.style ?? "";
        if (typeof prop !== "string") return undefined;
        const decls = (el.attrs.style ?? "").split(";").map((d) => d.split(":").map((x) => x.trim()));
        const hit = decls.find(([k]) => k && camelCase(k) === prop);
        return hit ? hit[1] : "";
      },
      set(_t, prop, value) {
        if (typeof prop !== "string") return true;
        const kebab = kebabCase(prop);
        const decls = (el.attrs.style ?? "").split(";").map((d) => d.trim()).filter(Boolean);
        const idx = decls.findIndex((d) => d.split(":")[0].trim() === kebab);
        const decl = `${kebab}: ${value}`;
        if (idx >= 0) decls[idx] = decl;
        else decls.push(decl);
        el.attrs.style = decls.join("; ");
        return true;
      },
    });
  }
}

class FakeEvent {
  constructor(type, opts = {}) {
    this.type = type;
    this.bubbles = opts.bubbles ?? true;
    this.cancelable = opts.cancelable ?? true;
    this.detail = opts.detail;
    this.target = null;
    this.currentTarget = null;
    this._stopped = false;
    this._defaultPrevented = false;
    if (opts.key !== undefined) this.key = opts.key;
  }
  stopPropagation() {
    this._stopped = true;
  }
  preventDefault() {
    this._defaultPrevented = true;
  }
  get defaultPrevented() {
    return this._defaultPrevented;
  }
}

class Element {
  constructor(doc, tag) {
    this.ownerDocument = doc;
    this.tagName = String(tag ?? "").toUpperCase();
    this.attrs = {};
    this.children = [];
    this.parentNode = null;
    this._text = null; // set only by createTextNode / direct textContent assignment on a text node
    this._listeners = new Map();
    this._isText = false;
    this._value = undefined;
  }

  // ── attributes ──────────────────────────────────────────────────────────
  getAttribute(k) {
    return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null;
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k === "value" && this._value === undefined) this._value = String(v);
  }
  removeAttribute(k) {
    delete this.attrs[k];
  }
  hasAttribute(k) {
    return Object.prototype.hasOwnProperty.call(this.attrs, k);
  }

  get id() {
    return this.attrs.id ?? "";
  }
  set id(v) {
    this.attrs.id = String(v);
  }
  get className() {
    return this.attrs.class ?? "";
  }
  set className(v) {
    this.attrs.class = String(v);
  }
  get classList() {
    return new ClassList(this);
  }
  get style() {
    return this._style ?? (this._style = new StyleProxy(this));
  }
  get dataset() {
    const el = this;
    return new Proxy(
      {},
      {
        get(_t, prop) {
          const k = "data-" + kebabCase(String(prop));
          return el.attrs[k];
        },
        set(_t, prop, value) {
          el.attrs["data-" + kebabCase(String(prop))] = String(value);
          return true;
        },
      },
    );
  }
  get value() {
    return this._value ?? "";
  }
  set value(v) {
    this._value = String(v);
  }
  get checked() {
    return !!this._checked;
  }
  set checked(v) {
    this._checked = !!v;
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(v) {
    if (v) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }

  // ── text / html ─────────────────────────────────────────────────────────
  get textContent() {
    if (this._isText) return this._text ?? "";
    return this.children.map((c) => c.textContent).join("");
  }
  set textContent(v) {
    this.children = [];
    if (v !== "") {
      const t = new Element(this.ownerDocument, "#text");
      t._isText = true;
      t._text = String(v);
      t.parentNode = this;
      this.children.push(t);
    }
  }
  get innerHTML() {
    return this.children.map(serialize).join("");
  }
  set innerHTML(html) {
    this.children = [];
    const frag = parseFragment(this.ownerDocument, String(html ?? ""));
    for (const n of frag) this.appendChild(n);
  }
  get outerHTML() {
    return serialize(this);
  }

  // ── tree ────────────────────────────────────────────────────────────────
  appendChild(n) {
    if (n.parentNode) n.parentNode.removeChild(n);
    n.parentNode = this;
    this.children.push(n);
    return n;
  }
  removeChild(n) {
    const i = this.children.indexOf(n);
    if (i >= 0) this.children.splice(i, 1);
    n.parentNode = null;
    return n;
  }
  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }
  insertBefore(n, ref) {
    if (n.parentNode) n.parentNode.removeChild(n);
    n.parentNode = this;
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i === -1) this.children.push(n);
    else this.children.splice(i, 0, n);
    return n;
  }
  cloneNode(deep) {
    const c = new Element(this.ownerDocument, this.tagName);
    c.attrs = { ...this.attrs };
    c._value = this._value;
    if (deep) for (const ch of this.children) c.appendChild(ch.cloneNode(true));
    return c;
  }
  get firstChild() {
    return this.children[0] ?? null;
  }
  get lastChild() {
    return this.children[this.children.length - 1] ?? null;
  }
  get nextElementSibling() {
    if (!this.parentNode) return null;
    const i = this.parentNode.children.indexOf(this);
    return this.parentNode.children[i + 1] ?? null;
  }
  get previousElementSibling() {
    if (!this.parentNode) return null;
    const i = this.parentNode.children.indexOf(this);
    return this.parentNode.children[i - 1] ?? null;
  }

  // ── query ───────────────────────────────────────────────────────────────
  matches(selector) {
    return matchesSelector(this, selector);
  }
  closest(selector) {
    let n = this;
    while (n && n.tagName !== "#document") {
      if (n.matches && n.matches(selector)) return n;
      n = n.parentNode;
    }
    return null;
  }
  querySelector(selector) {
    for (const n of walk(this)) {
      if (n !== this && n.matches && n.matches(selector)) return n;
    }
    return null;
  }
  querySelectorAll(selector) {
    const out = [];
    for (const n of walk(this)) {
      if (n !== this && n.matches && n.matches(selector)) out.push(n);
    }
    return out;
  }
  getElementsByTagName(tag) {
    const t = tag.toUpperCase();
    return [...walk(this)].filter((n) => n !== this && n.tagName === t);
  }
  getElementsByClassName(cls) {
    return [...walk(this)].filter((n) => n !== this && n.classList && n.classList.contains(cls));
  }

  // ── events ──────────────────────────────────────────────────────────────
  addEventListener(type, handler) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(handler);
  }
  removeEventListener(type, handler) {
    const list = this._listeners.get(type);
    if (!list) return;
    const i = list.indexOf(handler);
    if (i >= 0) list.splice(i, 1);
  }
  dispatchEvent(evt) {
    if (!evt.target) evt.target = this;
    let node = this;
    while (node) {
      evt.currentTarget = node;
      const handlers = node._listeners && node._listeners.get(evt.type);
      if (handlers) for (const h of [...handlers]) h.call(node, evt);
      if (evt._stopped || !evt.bubbles) break;
      node = node.parentNode && node.parentNode.tagName !== "#document" ? node.parentNode : node.parentNode;
      if (node && node.tagName === "#document") {
        evt.currentTarget = node;
        const dh = node._listeners && node._listeners.get(evt.type);
        if (dh) for (const h of [...dh]) h.call(node, evt);
        break;
      }
    }
    return !evt.defaultPrevented;
  }
}

function walk(n) {
  return [n, ...n.children.flatMap(walk)];
}

// ── tiny selector engine: #id, .class, tag, [attr], [attr=val], compounds (td.cell#x) ──
function matchesSelector(el, selector) {
  return String(selector)
    .split(",")
    .map((s) => s.trim())
    .some((sel) => matchesCompound(el, sel));
}
function matchesCompound(el, sel) {
  // supports one level: optional descendant combinator split by whitespace,
  // checked against ancestors for the leading parts.
  const parts = sel.trim().split(/\s+/);
  const leaf = parts[parts.length - 1];
  if (!matchesSimple(el, leaf)) return false;
  let anc = el.parentNode;
  for (let i = parts.length - 2; i >= 0; i--) {
    while (anc && anc.tagName !== "#document" && !matchesSimple(anc, parts[i])) anc = anc.parentNode;
    if (!anc || anc.tagName === "#document") return false;
    anc = anc.parentNode;
  }
  return true;
}
function matchesSimple(el, sel) {
  const re = /(#[\w-]+)|(\.[\w-]+)|(\[[^\]]+\])|([a-zA-Z][\w-]*)/g;
  let m;
  let ok = true;
  let matchedAny = false;
  while ((m = re.exec(sel))) {
    matchedAny = true;
    const tok = m[0];
    if (tok[0] === "#") ok &&= el.id === tok.slice(1);
    else if (tok[0] === ".") ok &&= el.classList.contains(tok.slice(1));
    else if (tok[0] === "[") {
      const body = tok.slice(1, -1);
      const eq = body.indexOf("=");
      if (eq === -1) ok &&= el.hasAttribute(body.trim());
      else {
        const k = body.slice(0, eq).trim();
        const v = body
          .slice(eq + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");
        ok &&= el.getAttribute(k) === v;
      }
    } else ok &&= el.tagName === tok.toUpperCase();
    if (!ok) return false;
  }
  return matchedAny;
}

// ── the tiny HTML parser (quote-aware tag walk, witness.js's own discipline) ──
function parseAttrs(tagBody) {
  const attrs = {};
  const re = /([\w-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(tagBody))) {
    if (m[1] === "" || !m[1]) continue;
    const val = m[3] ?? m[4] ?? m[5] ?? "";
    attrs[m[1].toLowerCase()] = val;
  }
  return attrs;
}

function parseFragment(doc, html) {
  const s = String(html ?? "");
  const stack = [{ children: [] }];
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf("<", i);
    if (lt === -1) {
      pushText(stack, s.slice(i));
      break;
    }
    if (lt > i) pushText(stack, s.slice(i, lt));
    if (s[lt + 1] === "!") {
      // comment or doctype — skip to matching close
      const close = s.indexOf(">", lt);
      i = close === -1 ? s.length : close + 1;
      continue;
    }
    const closing = s[lt + 1] === "/";
    let j = lt + (closing ? 2 : 1);
    let q = null;
    while (j < s.length) {
      const ch = s[j];
      if (q) {
        if (ch === q) q = null;
      } else if (ch === '"' || ch === "'") q = ch;
      else if (ch === ">") break;
      j++;
    }
    const inner = s.slice(lt + (closing ? 2 : 1), j);
    if (closing) {
      const name = inner.trim().split(/\s/)[0].toLowerCase();
      for (let k = stack.length - 1; k >= 1; k--) {
        if (stack[k].tagName && stack[k].tagName.toLowerCase() === name) {
          while (stack.length > k) stack.pop();
          break;
        }
      }
      i = j + 1;
      continue;
    }
    const selfClose = /\/\s*$/.test(inner);
    const body = selfClose ? inner.slice(0, inner.lastIndexOf("/")) : inner;
    const nameMatch = /^\s*([a-zA-Z][\w-]*)/.exec(body);
    const name = (nameMatch ? nameMatch[1] : "div").toLowerCase();
    const attrs = parseAttrs(body.slice(nameMatch ? nameMatch[0].length : 0));
    const el = new Element(doc, name);
    el.attrs = attrs;
    if (attrs.value !== undefined) el._value = attrs.value;
    stack[stack.length - 1].children.push(el);
    el.parentNode = stack[stack.length - 1].tagName ? stack[stack.length - 1] : null;

    if (SKIP_CONTENT_TAGS.has(name)) {
      const closeTag = `</${name}`;
      const closeIdx = s.toLowerCase().indexOf(closeTag, j + 1);
      const rawEnd = closeIdx === -1 ? s.length : s.indexOf(">", closeIdx) + 1;
      const raw = s.slice(j + 1, closeIdx === -1 ? s.length : closeIdx);
      if (raw) {
        const t = new Element(doc, "#text");
        t._isText = true;
        t._text = raw;
        t.parentNode = el;
        el.children.push(t);
      }
      i = rawEnd === 0 ? s.length : rawEnd;
      continue;
    }
    if (!VOID_TAGS.has(name) && !selfClose) {
      stack.push(el);
    }
    i = j + 1;
  }
  // fix up parentNode chain properly (the loop above used a lightweight ref)
  const root = { children: stack[0].children };
  reparent(root, null);
  return root.children;
}
function reparent(node, parent) {
  if (parent) node.parentNode = parent;
  for (const c of node.children ?? []) reparent(c, node.tagName ? node : parent);
}
function pushText(stack, text) {
  if (!text) return;
  const top = stack[stack.length - 1];
  const t = { _isText: true, _text: decodeEntities(text), children: [], tagName: "#text", attrs: {}, _listeners: new Map() };
  Object.setPrototypeOf(t, Element.prototype);
  top.children.push(t);
}
function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
function serialize(n) {
  if (n._isText) return n._text ?? "";
  const attrs = Object.entries(n.attrs)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join("");
  const tag = n.tagName.toLowerCase();
  if (VOID_TAGS.has(tag)) return `<${tag}${attrs}>`;
  return `<${tag}${attrs}>${n.children.map(serialize).join("")}</${tag}>`;
}

class Document extends Element {
  constructor() {
    super(null, "#document");
    this.ownerDocument = this;
    this.documentElement = this.createElement("html");
    this.body = this.createElement("body");
    this.head = this.createElement("head");
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.appendChild(this.documentElement);
  }
  createElement(tag) {
    return new Element(this, tag);
  }
  createTextNode(text) {
    const t = new Element(this, "#text");
    t._isText = true;
    t._text = String(text ?? "");
    return t;
  }
  getElementById(id) {
    for (const n of walk(this)) if (n.id === id) return n;
    return null;
  }
}

/**
 * Load a full (or fragment) html string into a fresh Document: whatever
 * <body>...</body> the source declares becomes doc.body's children; a bare
 * fragment (no <html>/<body>) is treated as body content directly — the
 * fold's own artifacts are sometimes full documents and sometimes bodies.
 */
export function loadHTML(html) {
  const doc = new Document();
  const s = String(html ?? "");
  const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(s);
  const headMatch = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(s);
  const bodySrc = bodyMatch ? bodyMatch[1] : s.replace(/<head[\s\S]*?<\/head>/i, "").replace(/<\/?html[^>]*>/gi, "");
  if (headMatch) for (const n of parseFragment(doc, headMatch[1])) doc.head.appendChild(n);
  for (const n of parseFragment(doc, bodySrc)) doc.body.appendChild(n);
  return doc;
}

/** Fire a synthetic event at `el` and let it bubble, the way a browser would. */
export function fire(el, type, opts = {}) {
  const evt = new FakeEvent(type, opts);
  return el.dispatchEvent(evt);
}

/** Type a value into an input/textarea-like element: sets .value then fires input+change. */
export function typeInto(el, value) {
  el.value = String(value);
  fire(el, "input");
  fire(el, "change");
}

export { Element, Document, FakeEvent, walk, serialize };
