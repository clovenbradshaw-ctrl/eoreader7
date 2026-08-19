// eval/dom-stub.mjs — a minimal, hand-rolled DOM for the stress-eval's
// behavioral witness. New file, mirrors the MECHANISM the sibling
// the-fold-route-fix checkout's eval/ledger-dom.mjs uses (runFold via a
// stub Document, fire/typeInto for synthetic events) — not copied across
// repos, rewritten locally and trimmed to what this eval's turns need:
// click, value, textContent, classList, style, innerHTML/createElement,
// getElementById/querySelector, addEventListener with bubbling.
//
// Pure, node-only, no dependency. Not a general DOM — enough structure that
// small-model-generated widgets (buttons, inputs, divs, tables) execute the
// way a browser would for the questions this eval asks: does clicking X
// change Y.

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const SKIP_CONTENT_TAGS = new Set(["script", "style"]);

class ClassList {
  constructor(el) { this.el = el; }
  get _set() { return new Set((this.el.attrs.class ?? "").split(/\s+/).filter(Boolean)); }
  _write(s) { this.el.attrs.class = [...s].join(" "); }
  add(...names) { const s = this._set; for (const n of names) s.add(n); this._write(s); }
  remove(...names) { const s = this._set; for (const n of names) s.delete(n); this._write(s); }
  toggle(name, force) {
    const s = this._set; const has = s.has(name); const want = force === undefined ? !has : !!force;
    if (want) s.add(name); else s.delete(name); this._write(s); return want;
  }
  contains(name) { return this._set.has(name); }
}

class FakeEvent {
  constructor(type, opts = {}) {
    this.type = type;
    this.bubbles = opts.bubbles ?? true;
    this.target = null;
    this.currentTarget = null;
    this._stopped = false;
    this._defaultPrevented = false;
    if (opts.key !== undefined) this.key = opts.key;
  }
  stopPropagation() { this._stopped = true; }
  preventDefault() { this._defaultPrevented = true; }
  get defaultPrevented() { return this._defaultPrevented; }
}

class Element {
  constructor(doc, tag) {
    this.ownerDocument = doc;
    this.tagName = String(tag ?? "").toUpperCase();
    this.attrs = {};
    this.children = [];
    this.parentNode = null;
    this._isText = false;
    this._text = null;
    this._listeners = new Map();
    this._value = undefined;
  }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === "value" && this._value === undefined) this._value = String(v); }
  removeAttribute(k) { delete this.attrs[k]; }
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); }
  get id() { return this.attrs.id ?? ""; }
  set id(v) { this.attrs.id = String(v); }
  get className() { return this.attrs.class ?? ""; }
  set className(v) { this.attrs.class = String(v); }
  get classList() { return new ClassList(this); }
  get style() {
    if (this._style) return this._style;
    const el = this;
    this._style = new Proxy({}, {
      get(_t, prop) {
        if (prop === "cssText") return el.attrs.style ?? "";
        const decls = (el.attrs.style ?? "").split(";").map((d) => d.split(":").map((x) => x.trim()));
        const hit = decls.find(([k]) => k && k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) === prop);
        return hit ? hit[1] : "";
      },
      set(_t, prop, value) {
        const kebab = String(prop).replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
        const decls = (el.attrs.style ?? "").split(";").map((d) => d.trim()).filter(Boolean);
        const idx = decls.findIndex((d) => d.split(":")[0].trim() === kebab);
        const decl = `${kebab}: ${value}`;
        if (idx >= 0) decls[idx] = decl; else decls.push(decl);
        el.attrs.style = decls.join("; ");
        return true;
      },
    });
    return this._style;
  }
  get value() { return this._value ?? ""; }
  set value(v) { this._value = String(v); }
  get checked() { return !!this._checked; }
  set checked(v) { this._checked = !!v; }
  get textContent() { return this._isText ? (this._text ?? "") : this.children.map((c) => c.textContent).join(""); }
  set textContent(v) {
    this.children = [];
    if (v !== "") {
      const t = new Element(this.ownerDocument, "#text");
      t._isText = true; t._text = String(v); t.parentNode = this;
      this.children.push(t);
    }
  }
  get innerHTML() { return this.children.map(serialize).join(""); }
  set innerHTML(html) {
    this.children = [];
    for (const n of parseFragment(this.ownerDocument, String(html ?? ""))) this.appendChild(n);
  }
  appendChild(n) { if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; this.children.push(n); return n; }
  removeChild(n) { const i = this.children.indexOf(n); if (i >= 0) this.children.splice(i, 1); n.parentNode = null; return n; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  insertBefore(n, ref) {
    if (n.parentNode) n.parentNode.removeChild(n);
    n.parentNode = this;
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i === -1) this.children.push(n); else this.children.splice(i, 0, n);
    return n;
  }
  matches(selector) { return matchesSelector(this, selector); }
  querySelector(selector) { for (const n of walk(this)) if (n !== this && n.matches && n.matches(selector)) return n; return null; }
  querySelectorAll(selector) { const out = []; for (const n of walk(this)) if (n !== this && n.matches && n.matches(selector)) out.push(n); return out; }
  addEventListener(type, handler) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(handler);
  }
  removeEventListener(type, handler) {
    const list = this._listeners.get(type); if (!list) return;
    const i = list.indexOf(handler); if (i >= 0) list.splice(i, 1);
  }
  dispatchEvent(evt) {
    if (!evt.target) evt.target = this;
    let node = this;
    while (node) {
      evt.currentTarget = node;
      const handlers = node._listeners && node._listeners.get(evt.type);
      if (handlers) for (const h of [...handlers]) h.call(node, evt);
      if (evt._stopped || !evt.bubbles) break;
      node = node.parentNode;
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

function walk(n) { return [n, ...n.children.flatMap(walk)]; }

function matchesSelector(el, selector) {
  return String(selector).split(",").map((s) => s.trim()).some((sel) => matchesSimple(el, sel));
}
function matchesSimple(el, sel) {
  const re = /(#[\w-]+)|(\.[\w-]+)|(\[[^\]]+\])|([a-zA-Z][\w-]*)/g;
  let m, ok = true, any = false;
  while ((m = re.exec(sel))) {
    any = true;
    const tok = m[0];
    if (tok[0] === "#") ok &&= el.id === tok.slice(1);
    else if (tok[0] === ".") ok &&= el.classList.contains(tok.slice(1));
    else if (tok[0] === "[") {
      const body = tok.slice(1, -1); const eq = body.indexOf("=");
      if (eq === -1) ok &&= el.hasAttribute(body.trim());
      else { const k = body.slice(0, eq).trim(); const v = body.slice(eq + 1).trim().replace(/^['"]|['"]$/g, ""); ok &&= el.getAttribute(k) === v; }
    } else ok &&= el.tagName === tok.toUpperCase();
    if (!ok) return false;
  }
  return any;
}

function parseAttrs(tagBody) {
  const attrs = {};
  const re = /([\w-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(tagBody))) {
    if (!m[1]) continue;
    attrs[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  }
  return attrs;
}

function parseFragment(doc, html) {
  const s = String(html ?? "");
  const stack = [{ children: [] }];
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf("<", i);
    if (lt === -1) { pushText(stack, s.slice(i)); break; }
    if (lt > i) pushText(stack, s.slice(i, lt));
    if (s[lt + 1] === "!") { const close = s.indexOf(">", lt); i = close === -1 ? s.length : close + 1; continue; }
    const closing = s[lt + 1] === "/";
    let j = lt + (closing ? 2 : 1), q = null;
    while (j < s.length) {
      const ch = s[j];
      if (q) { if (ch === q) q = null; }
      else if (ch === '"' || ch === "'") q = ch;
      else if (ch === ">") break;
      j++;
    }
    const inner = s.slice(lt + (closing ? 2 : 1), j);
    if (closing) {
      const name = inner.trim().split(/\s/)[0].toLowerCase();
      for (let k = stack.length - 1; k >= 1; k--) {
        if (stack[k].tagName && stack[k].tagName.toLowerCase() === name) { while (stack.length > k) stack.pop(); break; }
      }
      i = j + 1; continue;
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
      if (raw) { const t = new Element(doc, "#text"); t._isText = true; t._text = raw; t.parentNode = el; el.children.push(t); }
      i = rawEnd === 0 ? s.length : rawEnd; continue;
    }
    if (!VOID_TAGS.has(name) && !selfClose) stack.push(el);
    i = j + 1;
  }
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
  const t = { _isText: true, _text: decodeEntities(text), children: [], tagName: "#text", attrs: {}, _listeners: new Map() };
  Object.setPrototypeOf(t, Element.prototype);
  stack[stack.length - 1].children.push(t);
}
function decodeEntities(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
function serialize(n) {
  if (n._isText) return n._text ?? "";
  const attrs = Object.entries(n.attrs).map(([k, v]) => ` ${k}="${v}"`).join("");
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
  createElement(tag) { return new Element(this, tag); }
  createTextNode(text) { const t = new Element(this, "#text"); t._isText = true; t._text = String(text ?? ""); return t; }
  getElementById(id) { for (const n of walk(this)) if (n.id === id) return n; return null; }
}

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

export function fire(el, type, opts = {}) { return el.dispatchEvent(new FakeEvent(type, opts)); }
export function typeInto(el, value) { el.value = String(value); fire(el, "input"); fire(el, "change"); }

/** Run an html artifact's <script> bodies against a fresh stub document.
 * Returns {doc, error} — error is the first thrown exception, if any
 * (never re-thrown, so a broken script still yields a doc to inspect). */
export function runFold(html) {
  const doc = loadHTML(html);
  const scripts = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(String(html ?? "")))) scripts.push(m[1]);
  let error = null;
  const g = { document: doc, window: { document: doc }, console };
  for (const body of scripts) {
    try {
      const fn = new Function(...Object.keys(g), body);
      fn(...Object.values(g));
    } catch (err) {
      error = String(err && err.message ? err.message : err);
      break;
    }
  }
  return { doc, error };
}
