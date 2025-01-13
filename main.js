"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // src/etoile/native/matrix.ts
  var DEG_TO_RAD = Math.PI / 180;
  var PI_2 = Math.PI * 2;
  var Matrix2D = class {
    constructor(loc = {}) {
      __publicField(this, "a");
      __publicField(this, "b");
      __publicField(this, "c");
      __publicField(this, "d");
      __publicField(this, "e");
      __publicField(this, "f");
      this.a = loc.a || 1;
      this.b = loc.b || 0;
      this.c = loc.c || 0;
      this.d = loc.d || 1;
      this.e = loc.e || 0;
      this.f = loc.f || 0;
    }
    create(loc) {
      Object.assign(this, loc);
      return this;
    }
    transform(x, y, scaleX, scaleY, rotation, skewX, skewY) {
      this.scale(scaleX, scaleY).translation(x, y);
      if (skewX || skewY) {
        this.skew(skewX, skewY);
      } else {
        this.roate(rotation);
      }
      return this;
    }
    translation(x, y) {
      this.e += x;
      this.f += y;
      return this;
    }
    scale(a, d) {
      this.a *= a;
      this.d *= d;
      return this;
    }
    skew(x, y) {
      const tanX = Math.tan(x * DEG_TO_RAD);
      const tanY = Math.tan(y * DEG_TO_RAD);
      const a = this.a + this.b * tanX;
      const b = this.b + this.a * tanY;
      const c = this.c + this.d * tanX;
      const d = this.d + this.c * tanY;
      this.a = a;
      this.b = b;
      this.c = c;
      this.d = d;
      return this;
    }
    roate(rotation) {
      if (rotation > 0) {
        const rad = rotation * DEG_TO_RAD;
        const cosTheta = Math.cos(rad);
        const sinTheta = Math.sin(rad);
        const a = this.a * cosTheta - this.b * sinTheta;
        const b = this.a * sinTheta + this.b * cosTheta;
        const c = this.c * cosTheta - this.d * sinTheta;
        const d = this.c * sinTheta + this.d * cosTheta;
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
      }
      return this;
    }
  };

  // src/etoile/graph/display.ts
  var SELF_ID = {
    id: 0,
    get() {
      return this.id++;
    }
  };
  var Display = class {
    constructor() {
      __publicField(this, "parent");
      __publicField(this, "id");
      __publicField(this, "matrix");
      this.parent = null;
      this.id = SELF_ID.get();
      this.matrix = new Matrix2D();
    }
    destory() {
    }
  };
  var ASSIGN_MAPPINGS = {
    fillStyle: 1,
    strokeStyle: 2,
    font: 4,
    lineWidth: 8,
    textAlign: 16,
    textBaseline: 32
  };
  var ASSIGN_MAPPINGS_MODE = ASSIGN_MAPPINGS.fillStyle | ASSIGN_MAPPINGS.strokeStyle | ASSIGN_MAPPINGS.font | ASSIGN_MAPPINGS.lineWidth | ASSIGN_MAPPINGS.textAlign | ASSIGN_MAPPINGS.textBaseline;
  var CALL_MAPPINGS_MODE = 0;
  function createInstruction() {
    return {
      mods: [],
      fillStyle(...args) {
        this.mods.push({ mod: ["fillStyle", args], type: ASSIGN_MAPPINGS.fillStyle });
      },
      fillRect(...args) {
        this.mods.push({ mod: ["fillRect", args], type: CALL_MAPPINGS_MODE });
      },
      strokeStyle(...args) {
        this.mods.push({ mod: ["strokeStyle", args], type: ASSIGN_MAPPINGS.strokeStyle });
      },
      lineWidth(...args) {
        this.mods.push({ mod: ["lineWidth", args], type: ASSIGN_MAPPINGS.lineWidth });
      },
      strokeRect(...args) {
        this.mods.push({ mod: ["strokeRect", args], type: CALL_MAPPINGS_MODE });
      },
      fillText(...args) {
        this.mods.push({ mod: ["fillText", args], type: CALL_MAPPINGS_MODE });
      },
      font(...args) {
        this.mods.push({ mod: ["font", args], type: ASSIGN_MAPPINGS.font });
      },
      textBaseline(...args) {
        this.mods.push({ mod: ["textBaseline", args], type: ASSIGN_MAPPINGS.textBaseline });
      },
      textAlign(...args) {
        this.mods.push({ mod: ["textAlign", args], type: ASSIGN_MAPPINGS.textAlign });
      },
      beginPath() {
        this.mods.push({ mod: ["beginPath", []], type: CALL_MAPPINGS_MODE });
      },
      moveTo(...args) {
        this.mods.push({ mod: ["moveTo", args], type: CALL_MAPPINGS_MODE });
      },
      arcTo(...args) {
        this.mods.push({ mod: ["arcTo", args], type: CALL_MAPPINGS_MODE });
      },
      closePath() {
        this.mods.push({ mod: ["closePath", []], type: CALL_MAPPINGS_MODE });
      },
      fill() {
        this.mods.push({ mod: ["fill", []], type: CALL_MAPPINGS_MODE });
      },
      stroke() {
        this.mods.push({ mod: ["stroke", []], type: CALL_MAPPINGS_MODE });
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      drawImage(...args) {
        this.mods.push({ mod: ["drawImage", args], type: CALL_MAPPINGS_MODE });
      }
    };
  }
  var S = class extends Display {
    constructor(options = {}) {
      super();
      __publicField(this, "width");
      __publicField(this, "height");
      __publicField(this, "x");
      __publicField(this, "y");
      __publicField(this, "scaleX");
      __publicField(this, "scaleY");
      __publicField(this, "rotation");
      __publicField(this, "skewX");
      __publicField(this, "skewY");
      this.width = options.width || 0;
      this.height = options.height || 0;
      this.x = options.x || 0;
      this.y = options.y || 0;
      this.scaleX = options.scaleX || 1;
      this.scaleY = options.scaleY || 1;
      this.rotation = options.rotation || 0;
      this.skewX = options.skewX || 0;
      this.skewY = options.skewY || 0;
    }
  };
  var Graph = class extends S {
    constructor(options = {}) {
      super(options);
      __publicField(this, "instruction");
      __publicField(this, "__options__");
      this.instruction = createInstruction();
      this.__options__ = options;
    }
    render(ctx) {
      this.create();
      const cap = this.instruction.mods.length;
      for (let i = 0; i < cap; i++) {
        const { mod, type } = this.instruction.mods[i];
        const [direct, ...args] = mod;
        if (type & ASSIGN_MAPPINGS_MODE) {
          ctx[direct] = args[0];
          continue;
        }
        ctx[direct].apply(ctx, ...args);
      }
    }
    get __instanceOf__() {
      return "Graph" /* Graph */;
    }
  };

  // src/etoile/graph/types.ts
  function isGraph(display) {
    return display.__instanceOf__ === "Graph" /* Graph */;
  }
  function isBox(display) {
    return display.__instanceOf__ === "Box" /* Box */;
  }
  function isRoundRect(display) {
    return isGraph(display) && display.__shape__ === "RoundRect" /* RoundRect */;
  }
  function isText(display) {
    return isGraph(display) && display.__shape__ === "Text" /* Text */;
  }
  function isBitmap(display) {
    return isGraph(display) && display.__shape__ === "Bitmap" /* Bitmap */;
  }
  var asserts = {
    isGraph,
    isBox,
    isText,
    isRoundRect,
    isBitmap
  };

  // src/etoile/graph/box.ts
  var C = class extends Display {
    constructor() {
      super();
      __publicField(this, "elements");
      this.elements = [];
    }
    add(...elements) {
      const cap = elements.length;
      for (let i = 0; i < cap; i++) {
        const element = elements[i];
        if (element.parent) {
        }
        this.elements.push(element);
        element.parent = this;
      }
    }
    remove(...elements) {
      const cap = elements.length;
      for (let i = 0; i < cap; i++) {
        for (let j = this.elements.length - 1; j >= 0; j--) {
          const element = this.elements[j];
          if (element.id === elements[i].id) {
            this.elements.splice(j, 1);
            element.parent = null;
          }
        }
      }
    }
    destory() {
      this.elements.forEach((element) => element.parent = null);
      this.elements.length = 0;
    }
  };
  var Box = class _Box extends C {
    constructor() {
      super();
      __publicField(this, "elements");
      this.elements = [];
    }
    add(...elements) {
      const cap = elements.length;
      for (let i = 0; i < cap; i++) {
        const element = elements[i];
        if (element.parent) {
        }
        this.elements.push(element);
        element.parent = this;
      }
    }
    remove(...elements) {
      const cap = elements.length;
      for (let i = 0; i < cap; i++) {
        for (let j = this.elements.length - 1; j >= 0; j--) {
          const element = this.elements[j];
          if (element.id === elements[i].id) {
            this.elements.splice(j, 1);
            element.parent = null;
          }
        }
      }
    }
    destory() {
      this.elements.forEach((element) => element.parent = null);
      this.elements.length = 0;
    }
    get __instanceOf__() {
      return "Box" /* Box */;
    }
    clone() {
      const box = new _Box();
      if (this.elements.length) {
        const stack = [{ elements: this.elements, parent: box }];
        while (stack.length > 0) {
          const { elements, parent } = stack.pop();
          const cap = elements.length;
          for (let i = 0; i < cap; i++) {
            const element = elements[i];
            if (asserts.isBox(element)) {
              const newBox = new _Box();
              newBox.parent = parent;
              parent.add(newBox);
              stack.push({ elements: element.elements, parent: newBox });
            } else if (asserts.isGraph(element)) {
              const el = element.clone();
              el.parent = parent;
              parent.add(el);
            }
          }
        }
      }
      return box;
    }
  };

  // src/etoile/graph/image.ts
  var Bitmap = class _Bitmap extends Graph {
    constructor(options = {}) {
      super(options);
      __publicField(this, "bitmap");
      __publicField(this, "style");
      this.bitmap = options.bitmap || null;
      this.style = options.style || /* @__PURE__ */ Object.create(null);
    }
    create() {
      if (this.bitmap) {
        this.instruction.drawImage(this.bitmap, 0, 0);
      }
    }
    clone() {
      return new _Bitmap(__spreadValues(__spreadValues({}, this.style), this.__options__));
    }
    get __shape__() {
      return "Bitmap" /* Bitmap */;
    }
  };

  // src/etoile/native/runtime.ts
  function decodeHLS(meta) {
    const { h, l, s, a } = meta;
    if ("a" in meta) {
      return `hsla(${h}deg, ${s}%, ${l}%, ${a})`;
    }
    return `hsl(${h}deg, ${s}%, ${l}%)`;
  }
  function decodeRGB(meta) {
    const { r, g, b, a } = meta;
    if ("a" in meta) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }
  function decodeColor(meta) {
    return meta.mode === "rgb" ? decodeRGB(meta.desc) : decodeHLS(meta.desc);
  }
  function evaluateFillStyle(primitive, opacity = 1) {
    const descibe = { mode: primitive.mode, desc: __spreadProps(__spreadValues({}, primitive.desc), { a: opacity }) };
    return decodeColor(descibe);
  }
  var runtime = {
    evaluateFillStyle
  };

  // src/etoile/graph/rect.ts
  var RoundRect = class _RoundRect extends Graph {
    constructor(options = {}) {
      super(options);
      __publicField(this, "style");
      this.style = options.style || /* @__PURE__ */ Object.create(null);
    }
    get __shape__() {
      return "RoundRect" /* RoundRect */;
    }
    create() {
      const padding = this.style.padding;
      const x = 0;
      const y = 0;
      const width = this.width - padding * 2;
      const height = this.height - padding * 2;
      const radius = this.style.radius || 0;
      this.instruction.beginPath();
      this.instruction.moveTo(x + radius, y);
      this.instruction.arcTo(x + width, y, x + width, y + height, radius);
      this.instruction.arcTo(x + width, y + height, x, y + height, radius);
      this.instruction.arcTo(x, y + height, x, y, radius);
      this.instruction.arcTo(x, y, x + width, y, radius);
      this.instruction.closePath();
      if (this.style.fill) {
        this.instruction.closePath();
        this.instruction.fillStyle(runtime.evaluateFillStyle(this.style.fill, this.style.opacity));
        this.instruction.fill();
      }
      if (this.style.stroke) {
        if (typeof this.style.lineWidth === "number") {
          this.instruction.lineWidth(this.style.lineWidth);
        }
        this.instruction.strokeStyle(this.style.stroke);
        this.instruction.stroke();
      }
    }
    clone() {
      return new _RoundRect(__spreadValues(__spreadValues({}, this.style), this.__options__));
    }
  };

  // src/etoile/graph/text.ts
  var Text = class _Text extends Graph {
    constructor(options = {}) {
      super(options);
      __publicField(this, "text");
      __publicField(this, "style");
      this.text = options.text || "";
      this.style = options.style || /* @__PURE__ */ Object.create(null);
    }
    create() {
      if (this.style.fill) {
        this.instruction.font(this.style.font);
        this.instruction.lineWidth(this.style.lineWidth);
        this.instruction.textBaseline(this.style.baseline);
        this.instruction.fillStyle(this.style.fill);
        this.instruction.fillText(this.text, 0, 0);
      }
    }
    clone() {
      return new _Text(__spreadValues(__spreadValues({}, this.style), this.__options__));
    }
    get __shape__() {
      return "Text" /* Text */;
    }
  };

  // src/etoile/etoile.ts
  function traverse(graphs, handler) {
    const len = graphs.length;
    for (let i = 0; i < len; i++) {
      const graph = graphs[i];
      if (asserts.isGraph(graph)) {
        handler(graph);
      } else if (asserts.isBox(graph)) {
        traverse(graph.elements, handler);
      }
    }
  }

  // src/etoile/native/easing.ts
  var easing = {
    linear: (k) => k,
    quadraticIn: (k) => k * k,
    quadraticOut: (k) => k * (2 - k),
    quadraticInOut: (k) => {
      if ((k *= 2) < 1) {
        return 0.5 * k * k;
      }
      return -0.5 * (--k * (k - 2) - 1);
    },
    cubicIn: (k) => k * k * k,
    cubicOut: (k) => {
      if ((k *= 2) < 1) {
        return 0.5 * k * k * k;
      }
      return 0.5 * ((k -= 2) * k * k + 2);
    },
    cubicInOut: (k) => {
      if ((k *= 2) < 1) {
        return 0.5 * k * k * k;
      }
      return 0.5 * ((k -= 2) * k * k + 2);
    }
  };

  // src/etoile/native/event.ts
  var Event = class {
    constructor() {
      __publicField(this, "eventCollections");
      this.eventCollections = /* @__PURE__ */ Object.create(null);
    }
    on(evt, handler, c) {
      if (!(evt in this.eventCollections)) {
        this.eventCollections[evt] = [];
      }
      const data = {
        name: evt,
        handler,
        ctx: c || this,
        silent: false
      };
      this.eventCollections[evt].push(data);
    }
    off(evt, handler) {
      if (evt in this.eventCollections) {
        if (!handler) {
          this.eventCollections[evt] = [];
          return;
        }
        this.eventCollections[evt] = this.eventCollections[evt].filter((d) => d.handler !== handler);
      }
    }
    silent(evt, handler) {
      if (!(evt in this.eventCollections)) {
        return;
      }
      this.eventCollections[evt].forEach((d) => {
        if (!handler || d.handler === handler) {
          d.silent = true;
        }
      });
    }
    active(evt, handler) {
      if (!(evt in this.eventCollections)) {
        return;
      }
      this.eventCollections[evt].forEach((d) => {
        if (!handler || d.handler === handler) {
          d.silent = false;
        }
      });
    }
    emit(evt, ...args) {
      if (!this.eventCollections[evt]) {
        return;
      }
      const handlers = this.eventCollections[evt];
      if (handlers.length) {
        handlers.forEach((d) => {
          if (d.silent) {
            return;
          }
          d.handler.call(d.ctx, ...args);
        });
      }
    }
    bindWithContext(c) {
      return (evt, handler) => this.on(evt, handler, c);
    }
  };

  // src/shared/index.ts
  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      hash = (hash << 5) - hash + code;
      hash = hash & hash;
    }
    return hash;
  }
  function perferNumeric(s) {
    if (typeof s === "number") {
      return true;
    }
    return s.charCodeAt(0) >= 48 && s.charCodeAt(0) <= 57;
  }
  function createRoundBlock(x, y, width, height, style) {
    return new RoundRect({ width, height, x, y, style: __spreadValues({}, style) });
  }
  function createTitleText(text, x, y, font, color) {
    return new Text({
      text,
      x,
      y,
      style: { fill: color, textAlign: "center", baseline: "middle", font, lineWidth: 1 }
    });
  }
  var raf = window.requestAnimationFrame;
  function createCanvasElement() {
    return document.createElement("canvas");
  }
  function applyCanvasTransform(ctx, matrix, dpr) {
    ctx.setTransform(matrix.a * dpr, matrix.b * dpr, matrix.c * dpr, matrix.d * dpr, matrix.e * dpr, matrix.f * dpr);
  }
  function mixin(app, methods) {
    methods.forEach(({ name, fn }) => {
      Object.defineProperty(app, name, {
        value: fn(app),
        writable: false
      });
    });
  }
  function prettyStrJoin(...s) {
    return s.join("");
  }
  function isMacOS() {
    return /Mac OS X/.test(navigator.userAgent);
  }

  // src/etoile/native/log.ts
  var NAME_SPACE = "etoile";
  var log = {
    error: (message) => {
      return `[${NAME_SPACE}] ${message}`;
    }
  };

  // src/etoile/schedule/render.ts
  function writeBoundingRectForCanvas(c, w, h, dpr) {
    c.width = w * dpr;
    c.height = h * dpr;
    c.style.cssText = `width: ${w}px; height: ${h}px`;
  }
  var Canvas = class {
    constructor(options) {
      __publicField(this, "canvas");
      __publicField(this, "ctx");
      this.canvas = createCanvasElement();
      this.setOptions(options);
      this.ctx = this.canvas.getContext("2d");
    }
    setOptions(options) {
      writeBoundingRectForCanvas(this.canvas, options.width, options.height, options.devicePixelRatio);
    }
  };
  var Render = class {
    constructor(to, options) {
      __publicField(this, "options");
      __publicField(this, "container");
      this.container = new Canvas(options);
      this.options = options;
      this.initOptions(options);
      if (!options.shaow) {
        to.appendChild(this.container.canvas);
      }
    }
    clear(width, height) {
      this.ctx.clearRect(0, 0, width, height);
    }
    get canvas() {
      return this.container.canvas;
    }
    get ctx() {
      return this.container.ctx;
    }
    initOptions(userOptions = {}) {
      Object.assign(this.options, userOptions);
      this.container.setOptions(this.options);
    }
    destory() {
    }
  };

  // src/etoile/schedule/index.ts
  function drawGraphIntoCanvas(graph, opts) {
    const { ctx, dpr } = opts;
    ctx.save();
    if (asserts.isBox(graph)) {
      const elements = graph.elements;
      const cap = elements.length;
      for (let i = 0; i < cap; i++) {
        const element = elements[i];
        drawGraphIntoCanvas(element, opts);
      }
    }
    if (asserts.isGraph(graph)) {
      const matrix = graph.matrix.create({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      matrix.transform(graph.x, graph.y, graph.scaleX, graph.scaleY, graph.rotation, graph.skewX, graph.skewY);
      if (asserts.isRoundRect(graph)) {
        const effectiveWidth = graph.width - graph.style.padding * 2;
        const effectiveHeight = graph.height - graph.style.padding * 2;
        if (effectiveWidth <= 0 || effectiveHeight <= 0) {
          ctx.restore();
          return;
        }
        if (graph.style.radius >= effectiveHeight / 2 || graph.style.radius >= effectiveWidth / 2) {
          ctx.restore();
          return;
        }
      }
      applyCanvasTransform(ctx, matrix, dpr);
      graph.render(ctx);
    }
    ctx.restore();
  }
  var Schedule = class extends Box {
    constructor(to, renderOptions = {}) {
      super();
      __publicField(this, "render");
      __publicField(this, "to");
      __publicField(this, "event");
      this.to = typeof to === "string" ? document.querySelector(to) : to;
      if (!this.to) {
        throw new Error(log.error("The element to bind is not found."));
      }
      const { width, height } = this.to.getBoundingClientRect();
      Object.assign(renderOptions, { width, height }, { devicePixelRatio: window.devicePixelRatio || 1 });
      this.event = new Event();
      this.render = new Render(this.to, renderOptions);
    }
    update() {
      this.render.clear(this.render.options.width, this.render.options.height);
      this.execute(this.render, this);
      const matrix = this.matrix.create({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      applyCanvasTransform(this.render.ctx, matrix, this.render.options.devicePixelRatio);
    }
    // execute all graph elements
    execute(render, graph = this) {
      drawGraphIntoCanvas(graph, { c: render.canvas, ctx: render.ctx, dpr: render.options.devicePixelRatio });
    }
  };

  // src/etoile/native/dom.ts
  var DOM_EVENTS = ["click", "mousedown", "mousemove", "mouseup", "mouseover", "mouseout", "wheel"];
  function getOffset(el) {
    let e = 0;
    let f = 0;
    if (document.documentElement.getBoundingClientRect && el.getBoundingClientRect) {
      const { top, left } = el.getBoundingClientRect();
      e = top;
      f = left;
    } else {
      for (let elt = el; elt; elt = el.offsetParent) {
        e += el.offsetLeft;
        f += el.offsetTop;
      }
    }
    return [
      e + Math.max(document.documentElement.scrollLeft, document.body.scrollLeft),
      f + Math.max(document.documentElement.scrollTop, document.body.scrollTop)
    ];
  }
  function captureBoxXY(c, evt, a, d, translateX, translateY) {
    const boundingClientRect = c.getBoundingClientRect();
    if (evt instanceof MouseEvent) {
      const [e, f] = getOffset(c);
      return {
        x: (evt.clientX - boundingClientRect.left - e - translateX) / a,
        y: (evt.clientY - boundingClientRect.top - f - translateY) / d
      };
    }
    return { x: 0, y: 0 };
  }
  function createEffectRun(c) {
    return (fn) => {
      const effect = () => {
        const done = fn();
        if (!done) {
          c.animationFrameID = raf(effect);
        }
      };
      if (!c.animationFrameID) {
        c.animationFrameID = raf(effect);
      }
    };
  }
  function createEffectStop(c) {
    return () => {
      if (c.animationFrameID) {
        window.cancelAnimationFrame(c.animationFrameID);
        c.animationFrameID = null;
      }
    };
  }
  function createEffectScope() {
    const c = {
      animationFrameID: null
    };
    const run = createEffectRun(c);
    const stop = createEffectStop(c);
    return { run, stop };
  }
  function bindDOMEvent(el, evt, dom) {
    const handler = (e) => {
      const { x, y } = captureBoxXY(el, e, dom.matrix.a, dom.matrix.d, dom.matrix.e, dom.matrix.f);
      dom.emit(evt, { native: e, loc: { x, y } });
    };
    el.addEventListener(evt, handler);
    return handler;
  }
  var DOMEvent = class extends Event {
    constructor(el) {
      super();
      __publicField(this, "el");
      __publicField(this, "events");
      __publicField(this, "matrix");
      this.el = el;
      this.matrix = new Matrix2D();
      this.events = DOM_EVENTS.map((evt) => bindDOMEvent(this.el, evt, this));
    }
  };

  // src/etoile/native/magic-trackpad.ts
  function useMagicTrackPad(event) {
    if (event.cancelable !== false) {
      event.preventDefault();
    }
    const isPanGesture = !event.ctrlKey;
    createEffectScope();
  }

  // src/primitives/struct.ts
  function sortChildrenByKey(data, ...keys) {
    return data.sort((a, b) => {
      for (const key of keys) {
        const v = a[key];
        const v2 = b[key];
        if (perferNumeric(v) && perferNumeric(v2)) {
          if (v2 > v) {
            return 1;
          }
          if (v2 < v) {
            return -1;
          }
          continue;
        }
        const comparison = ("" + v).localeCompare("" + v2);
        if (comparison !== 0) {
          return comparison;
        }
      }
      return 0;
    });
  }
  function c2m(data, key, modifier) {
    if (Array.isArray(data.groups)) {
      data.groups = sortChildrenByKey(data.groups.map((d) => c2m(d, key, modifier)), "weight");
    }
    const obj = __spreadProps(__spreadValues({}, data), { weight: data[key] });
    if (modifier) {
      return modifier(obj);
    }
    return obj;
  }
  function bindParentForModule(modules, parent) {
    return modules.map((module) => {
      const next = __spreadValues({}, module);
      next.parent = parent;
      if (next.groups && Array.isArray(next.groups)) {
        next.groups = bindParentForModule(next.groups, next);
      }
      return next;
    });
  }
  function getNodeDepth(node) {
    let depth = 0;
    while (node.parent) {
      node = node.parent;
      depth++;
    }
    return depth;
  }
  function visit(data, fn) {
    if (!data) {
      return null;
    }
    for (const d of data) {
      if (d.children) {
        const result = visit(d.children, fn);
        if (result) {
          return result;
        }
      }
      const stop = fn(d);
      if (stop) {
        return d;
      }
    }
    return null;
  }
  function findRelativeNode(p, layoutNodes) {
    return visit(layoutNodes, (node) => {
      const [x, y, w, h] = node.layout;
      if (p.x >= x && p.y >= y && p.x < x + w && p.y < y + h) {
        return true;
      }
    });
  }
  function findRelativeNodeById(id, layoutNodes) {
    return visit(layoutNodes, (node) => {
      if (node.node.id === id) {
        return true;
      }
    });
  }

  // src/primitives/event.ts
  function createTreemapEventState() {
    return {
      isDragging: false,
      isWheeling: false,
      isZooming: false,
      currentNode: null,
      forceDestroy: false,
      dragX: 0,
      dragY: 0
    };
  }
  var INTERNAL_EVENT_MAPPINGS = {
    ON_ZOOM: 1,
    ON_CLEANUP: 3
  };
  var ANIMATION_DURATION = 300;
  var fill = { desc: { r: 255, g: 255, b: 255 }, mode: "rgb" };
  function runEffect(callback, opts) {
    const effect = createEffectScope();
    const startTime = Date.now();
    const condtion = (process) => {
      if (Array.isArray(opts.deps)) {
        return opts.deps.some((dep) => dep());
      }
      return process >= 1;
    };
    effect.run(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / opts.duration, 1);
      if (condtion(progress)) {
        effect.stop();
        if (opts.onStop) {
          opts.onStop();
        }
        return true;
      }
      callback(progress);
    });
  }
  function applyForOpacity(graph, lastState, nextState, easedProgress) {
    const alpha = lastState + (nextState - lastState) * easedProgress;
    if (asserts.isRoundRect(graph)) {
      graph.style.opacity = alpha;
    }
  }
  function drawHighlight(treemap2, evt) {
    const { highlight } = treemap2;
    const { currentNode } = evt.state;
    if (currentNode) {
      const [x, y, w, h] = currentNode.layout;
      runEffect((progress) => {
        const easedProgress = easing.cubicInOut(progress);
        highlight.reset();
        const mask = createRoundBlock(x, y, w, h, { fill, opacity: 0.4, radius: 2, padding: 2 });
        highlight.add(mask);
        highlight.setZIndexForHighlight("1");
        applyForOpacity(mask, 0.4, 0.4, easedProgress);
        stackMatrixTransform(mask, evt.matrix.e, evt.matrix.f, evt.matrix.a);
        highlight.update();
      }, {
        duration: ANIMATION_DURATION,
        deps: [() => evt.state.isDragging, () => evt.state.isWheeling, () => evt.state.isZooming]
      });
    } else {
      highlight.reset();
      highlight.setZIndexForHighlight();
    }
  }
  var TreemapEvent = class extends DOMEvent {
    constructor(app, treemap2) {
      super(treemap2.render.canvas);
      __publicField(this, "exposedEvent");
      __publicField(this, "state");
      __publicField(this, "zoom");
      this.exposedEvent = new Event();
      this.state = createTreemapEventState();
      const exposedMethods = [
        { name: "on", fn: () => this.exposedEvent.bindWithContext(treemap2.api) },
        { name: "off", fn: () => this.exposedEvent.off.bind(this.exposedEvent) }
      ];
      const macOS = isMacOS();
      DOM_EVENTS.forEach((evt) => {
        this.on(evt, (metadata) => {
          this.dispatch({ type: evt, treemap: treemap2 }, metadata);
        });
      });
      mixin(app, exposedMethods);
      treemap2.event.on(INTERNAL_EVENT_MAPPINGS.ON_CLEANUP, () => {
        this.matrix.create({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
        this.state = createTreemapEventState();
      });
      this.zoom = createOnZoom(treemap2, this);
      treemap2.event.on(INTERNAL_EVENT_MAPPINGS.ON_ZOOM, this.zoom);
    }
    dispatch(ctx, metadata) {
      const node = findRelativeNode(metadata.loc, ctx.treemap.layoutNodes);
      const fn = prettyStrJoin("on", ctx.type);
      if (typeof this[fn] === "function") {
        this[fn](ctx, metadata, node);
      }
      if (ctx.type === "mousemove") {
        if (this.state.isDragging) {
          this.exposedEvent.silent("click");
        } else {
          this.exposedEvent.active("click");
        }
      }
      this.exposedEvent.emit(ctx.type === "macOSWheel" ? "wheel" : ctx.type, { native: metadata.native, module: node });
    }
    onmousemove(ctx, metadata, node) {
      if (!this.state.isDragging) {
        if (this.state.currentNode !== node) {
          this.state.currentNode = node;
        }
        drawHighlight(ctx.treemap, this);
      } else {
        const { treemap: treemap2 } = ctx;
        treemap2.highlight.reset();
        treemap2.highlight.setZIndexForHighlight();
        runEffect(() => {
          const { offsetX: x, offsetY: y } = metadata.native;
          const { dragX: lastX, dragY: lastY } = this.state;
          const drawX = x - lastX;
          const drawY = y - lastY;
          treemap2.reset();
          this.matrix.translation(drawX, drawY);
          Object.assign(this.state, { isDragging: true, dragX: x, dragY: y });
          stackMatrixTransformWithGraphAndLayer(treemap2.elements, this.matrix.e, this.matrix.f, this.matrix.a);
          treemap2.update();
        }, {
          duration: ANIMATION_DURATION,
          deps: [() => this.state.forceDestroy],
          onStop: () => {
            this.state.isDragging = false;
          }
        });
      }
    }
    onmouseout(ctx) {
      this.state.currentNode = null;
      drawHighlight(ctx.treemap, this);
    }
    onmousedown(ctx, metadata) {
      if (isScrollWheelOrRightButtonOnMouseupAndDown(metadata.native)) {
        return;
      }
      this.state.isDragging = true;
      this.state.dragX = metadata.native.offsetX;
      this.state.dragY = metadata.native.offsetY;
      this.state.forceDestroy = false;
      if (!ctx.treemap.renderCache.state) {
        ctx.treemap.renderCache.flush(ctx.treemap.render, this.matrix);
      }
    }
    onmouseup(ctx) {
      if (!this.state.isDragging) {
        return;
      }
      this.state.forceDestroy = true;
      this.state.isDragging = false;
      const { treemap: treemap2 } = ctx;
      treemap2.highlight.reset();
      treemap2.highlight.setZIndexForHighlight();
    }
    onwheel(ctx, metadata) {
      if (ctx.treemap.renderCache.state) {
        ctx.treemap.renderCache.destroy();
      }
      const { native } = metadata;
      const { treemap: treemap2 } = ctx;
      const wheelDelta = native.wheelDelta;
      const absWheelDelta = Math.abs(wheelDelta);
      const offsetX = native.offsetX;
      const offsetY = native.offsetY;
      if (wheelDelta === 0) {
        return;
      }
      this.state.forceDestroy = true;
      treemap2.highlight.reset();
      treemap2.highlight.setZIndexForHighlight();
      const factor = absWheelDelta > 3 ? 1.4 : absWheelDelta > 1 ? 1.2 : 1.1;
      const delta = wheelDelta > 0 ? factor : 1 / factor;
      const targetScaleRatio = this.matrix.a * delta;
      const translateX = offsetX - (offsetX - this.matrix.e) * delta;
      const translateY = offsetY - (offsetY - this.matrix.f) * delta;
      runEffect((progress) => {
        this.state.isWheeling = true;
        treemap2.reset();
        const easedProgress = easing.quadraticOut(progress);
        const scale = (targetScaleRatio - this.matrix.a) * easedProgress;
        this.matrix.a += scale;
        this.matrix.d += scale;
        this.matrix.translation((translateX - this.matrix.e) * easedProgress, (translateY - this.matrix.f) * easedProgress);
        stackMatrixTransformWithGraphAndLayer(treemap2.elements, this.matrix.e, this.matrix.f, this.matrix.a);
        treemap2.update();
      }, {
        duration: ANIMATION_DURATION,
        onStop: () => {
          this.state.forceDestroy = false;
          this.state.isWheeling = false;
        }
      });
    }
    onmacOSWheel(ctx, metadata) {
      useMagicTrackPad(metadata.native);
    }
  };
  function stackMatrixTransform(graph, e, f, scale) {
    graph.x = graph.x * scale + e;
    graph.y = graph.y * scale + f;
    graph.scaleX = scale;
    graph.scaleY = scale;
  }
  function stackMatrixTransformWithGraphAndLayer(graphs, e, f, scale) {
    traverse(graphs, (graph) => stackMatrixTransform(graph, e, f, scale));
  }
  function isScrollWheelOrRightButtonOnMouseupAndDown(e) {
    return e.which === 2 || e.which === 3;
  }
  function estimateZoomingArea(node, root2, w, h) {
    const defaultSizes = [w, h, 1];
    if (root2 === node) {
      return defaultSizes;
    }
    const viewArea = w * h;
    let area = viewArea;
    let parent = node.node.parent;
    let totalWeight = node.node.weight;
    while (parent) {
      const siblings = parent.groups || [];
      let siblingWeightSum = 0;
      for (const sibling of siblings) {
        siblingWeightSum += sibling.weight;
      }
      area *= siblingWeightSum / totalWeight;
      totalWeight = parent.weight;
      parent = parent.parent;
    }
    const maxScaleFactor = 2.5;
    const minScaleFactor = 0.3;
    const scaleFactor = Math.max(minScaleFactor, Math.min(maxScaleFactor, Math.sqrt(area / viewArea)));
    return [w * scaleFactor, h * scaleFactor];
  }
  function createOnZoom(treemap2, evt) {
    let root2 = null;
    return (node) => {
      evt.state.isZooming = true;
      const c = treemap2.render.canvas;
      const boundingClientRect = c.getBoundingClientRect();
      const [w, h] = estimateZoomingArea(node, root2, boundingClientRect.width, boundingClientRect.height);
      delete treemap2.fontsCaches[node.node.id];
      delete treemap2.ellispsisWidthCache[node.node.id];
      resetLayout(treemap2, w, h);
      const module = findRelativeNodeById(node.node.id, treemap2.layoutNodes);
      if (module) {
        const [mx, my, mw, mh] = module.layout;
        const scale = Math.min(boundingClientRect.width / mw, boundingClientRect.height / mh);
        const translateX = boundingClientRect.width / 2 - (mx + mw / 2) * scale;
        const translateY = boundingClientRect.height / 2 - (my + mh / 2) * scale;
        const initialScale = evt.matrix.a;
        const initialTranslateX = evt.matrix.e;
        const initialTranslateY = evt.matrix.f;
        runEffect((progess) => {
          const easedProgress = easing.cubicInOut(progess);
          const scaleRatio = initialScale + (scale - initialScale) * easedProgress;
          evt.matrix.a = scaleRatio;
          evt.matrix.d = scaleRatio;
          evt.matrix.e = initialTranslateX + (translateX - initialTranslateX) * easedProgress;
          evt.matrix.f = initialTranslateY + (translateY - initialTranslateY) * easedProgress;
          treemap2.reset();
          stackMatrixTransformWithGraphAndLayer(treemap2.elements, evt.matrix.e, evt.matrix.f, evt.matrix.a);
          treemap2.update();
        }, {
          duration: ANIMATION_DURATION,
          onStop: () => evt.state.isZooming = false
        });
      }
      root2 = node;
    };
  }

  // src/primitives/registry.ts
  function register(Mod) {
    return (app, treemap2) => {
      new Mod(app, treemap2);
    };
  }

  // src/primitives/squarify.ts
  function squarify(data, rect, layoutDecorator) {
    const result = [];
    if (!data.length) {
      return result;
    }
    const worst = (start, end, shortestSide, totalWeight, aspectRatio) => {
      const max = data[start].weight * aspectRatio;
      const min = data[end].weight * aspectRatio;
      return Math.max(
        shortestSide * shortestSide * max / (totalWeight * totalWeight),
        totalWeight * totalWeight / (shortestSide * shortestSide * min)
      );
    };
    const recursion = (start, rect2) => {
      while (start < data.length) {
        let totalWeight = 0;
        for (let i = start; i < data.length; i++) {
          totalWeight += data[i].weight;
        }
        const shortestSide = Math.min(rect2.w, rect2.h);
        const aspectRatio = rect2.w * rect2.h / totalWeight;
        let end = start;
        let areaInRun = 0;
        let oldWorst = 0;
        while (end < data.length) {
          const area = data[end].weight * aspectRatio;
          const newWorst = worst(start, end, shortestSide, areaInRun + area, aspectRatio);
          if (end > start && oldWorst < newWorst) {
            break;
          }
          areaInRun += area;
          oldWorst = newWorst;
          end++;
        }
        const splited = Math.round(areaInRun / shortestSide);
        let areaInLayout = 0;
        for (let i = start; i < end; i++) {
          const children = data[i];
          const area = children.weight * aspectRatio;
          const lower = Math.round(shortestSide * areaInLayout / areaInRun);
          const upper = Math.round(shortestSide * (areaInLayout + area) / areaInRun);
          const [x, y, w, h] = rect2.w >= rect2.h ? [rect2.x, rect2.y + lower, splited, upper - lower] : [rect2.x + lower, rect2.y, upper - lower, splited];
          const depth = getNodeDepth(children) || 1;
          const { titleAreaHeight, rectGap } = layoutDecorator;
          const diff = titleAreaHeight.max / depth;
          const hh = diff < titleAreaHeight.min ? titleAreaHeight.min : diff;
          result.push({
            layout: [x, y, w, h],
            node: children,
            decorator: __spreadProps(__spreadValues({}, layoutDecorator), {
              titleHeight: hh
            }),
            children: w > rectGap * 2 && h > hh + rectGap ? squarify(children.groups || [], {
              x: x + rectGap,
              y: y + hh,
              w: w - rectGap * 2,
              h: h - hh - rectGap
            }, layoutDecorator) : []
          });
          areaInLayout += area;
        }
        start = end;
        if (rect2.w >= rect2.h) {
          rect2.x += splited;
          rect2.w -= splited;
        } else {
          rect2.y += splited;
          rect2.h -= splited;
        }
      }
    };
    recursion(0, rect);
    return result;
  }

  // src/primitives/component.ts
  function measureTextWidth(c, text) {
    return c.measureText(text).width;
  }
  function evaluateOptimalFontSize(c, text, font, desiredW, desiredH) {
    desiredW = Math.floor(desiredW);
    desiredH = Math.floor(desiredH);
    const { range, family } = font;
    let min = range.min;
    let max = range.max;
    const cache = /* @__PURE__ */ new Map();
    while (max - min >= 1) {
      const current = min + (max - min) / 2;
      if (!cache.has(current)) {
        c.font = `${current}px ${family}`;
        const metrics = c.measureText(text);
        const width2 = metrics.width;
        const height2 = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        cache.set(current, { width: width2, height: height2 });
      }
      const { width, height } = cache.get(current);
      if (width > desiredW || height > desiredH) {
        max = current;
      } else {
        min = current;
      }
    }
    return Math.floor(min);
  }
  function getSafeText(c, text, width, cache) {
    let ellipsisWidth = 0;
    if (text in cache) {
      ellipsisWidth = cache[text];
    } else {
      ellipsisWidth = measureTextWidth(c, "...");
      cache[text] = ellipsisWidth;
    }
    if (width < ellipsisWidth) {
      return false;
    }
    const textWidth = measureTextWidth(c, text);
    if (textWidth < width) {
      return { text, width: textWidth };
    }
    return { text: "...", width: ellipsisWidth };
  }
  function resetLayout(treemap2, w, h) {
    treemap2.layoutNodes = squarify(treemap2.data, { w, h, x: 0, y: 0 }, treemap2.decorator.layout);
    treemap2.reset(true);
  }
  var Highlight = class extends Schedule {
    reset() {
      this.destory();
      this.update();
    }
    get canvas() {
      return this.render.canvas;
    }
    setZIndexForHighlight(zIndex = "-1") {
      this.canvas.style.zIndex = zIndex;
    }
    init() {
      this.setZIndexForHighlight();
      this.canvas.style.position = "absolute";
      this.canvas.style.pointerEvents = "none";
    }
  };
  var TreemapLayout2 = class extends Schedule {
    constructor(...args) {
      super(...args);
      __publicField(this, "data");
      __publicField(this, "layoutNodes");
      __publicField(this, "decorator");
      __publicField(this, "bgBox");
      __publicField(this, "fgBox");
      __publicField(this, "fontsCaches");
      __publicField(this, "ellispsisWidthCache");
      __publicField(this, "highlight");
      __publicField(this, "renderCache");
      this.data = [];
      this.layoutNodes = [];
      this.bgBox = new Box();
      this.fgBox = new Box();
      this.decorator = /* @__PURE__ */ Object.create(null);
      this.fontsCaches = /* @__PURE__ */ Object.create(null);
      this.ellispsisWidthCache = /* @__PURE__ */ Object.create(null);
      this.highlight = new Highlight(this.to, { width: this.render.options.width, height: this.render.options.height });
      this.renderCache = new RenderCache(this.render.options);
    }
    drawBackgroundNode(node) {
      const [x, y, w, h] = node.layout;
      const padding = 2;
      if (w - padding * 2 <= 0 || h - padding * 2 <= 0) {
        return;
      }
      const fill2 = this.decorator.color.mappings[node.node.id];
      this.bgBox.add(createRoundBlock(x, y, w, h, { fill: fill2, padding, radius: 2 }));
      for (const child of node.children) {
        this.drawBackgroundNode(child);
      }
    }
    drawForegroundNode(node) {
      const [x, y, w, h] = node.layout;
      if (!w || !h) {
        return;
      }
      const { titleHeight, rectGap } = node.decorator;
      const { fontSize, fontFamily, color } = this.decorator.font;
      let optimalFontSize;
      if (node.node.id in this.fontsCaches) {
        optimalFontSize = this.fontsCaches[node.node.id];
      } else {
        optimalFontSize = evaluateOptimalFontSize(
          this.render.ctx,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          node.node.label,
          {
            range: fontSize,
            family: fontFamily
          },
          w - rectGap * 2,
          node.children.length ? Math.round(titleHeight / 2) + rectGap : h
        );
        this.fontsCaches[node.node.id] = optimalFontSize;
      }
      this.render.ctx.font = `${optimalFontSize}px ${fontFamily}`;
      const result = getSafeText(this.render.ctx, node.node.label, w - rectGap * 2, this.ellispsisWidthCache);
      if (!result) {
        return;
      }
      if (result.width >= w || optimalFontSize >= h) {
        return;
      }
      const { text, width } = result;
      const textX = x + Math.round((w - width) / 2);
      const textY = y + (node.children.length ? Math.round(titleHeight / 2) : Math.round(h / 2));
      this.fgBox.add(createTitleText(text, textX, textY, `${optimalFontSize}px ${fontFamily}`, color));
      for (const child of node.children) {
        this.drawForegroundNode(child);
      }
    }
    reset(refresh = false) {
      this.remove(this.bgBox, this.fgBox);
      this.bgBox.destory();
      if (this.renderCache.state) {
        this.fgBox.destory();
        this.bgBox.add(new Bitmap({ bitmap: this.renderCache.canvas }));
      } else {
        for (const node of this.layoutNodes) {
          this.drawBackgroundNode(node);
        }
        if (!this.fgBox.elements.length || refresh) {
          this.render.ctx.textBaseline = "middle";
          this.fgBox.destory();
          for (const node of this.layoutNodes) {
            this.drawForegroundNode(node);
          }
        } else {
          this.fgBox = this.fgBox.clone();
        }
      }
      this.add(this.bgBox, this.fgBox);
    }
    get api() {
      return {
        zoom: (node) => {
          if (!node) {
            return;
          }
          this.event.emit(INTERNAL_EVENT_MAPPINGS.ON_ZOOM, node);
        }
      };
    }
  };
  function createTreemap() {
    let treemap2 = null;
    let root2 = null;
    let installed = false;
    const uses = [];
    const context = {
      init,
      dispose,
      setOptions,
      resize,
      use,
      zoom
    };
    function init(el) {
      treemap2 = new TreemapLayout2(el);
      root2 = el;
      root2.style.position = "relative";
      if (!installed) {
        register(TreemapEvent)(context, treemap2);
        installed = true;
      }
    }
    function dispose() {
      if (root2 && treemap2) {
        treemap2.destory();
        root2.removeChild(root2.firstChild);
        root2 = null;
        treemap2 = null;
      }
    }
    function resize() {
      if (!treemap2 || !root2) {
        return;
      }
      const { width, height } = root2.getBoundingClientRect();
      treemap2.render.initOptions({ height, width, devicePixelRatio: window.devicePixelRatio });
      treemap2.render.canvas.style.position = "absolute";
      treemap2.fontsCaches = /* @__PURE__ */ Object.create(null);
      treemap2.event.emit(INTERNAL_EVENT_MAPPINGS.ON_CLEANUP);
      treemap2.highlight.render.initOptions({ height, width, devicePixelRatio: window.devicePixelRatio });
      treemap2.highlight.reset();
      treemap2.highlight.init();
      resetLayout(treemap2, width, height);
      treemap2.update();
    }
    function setOptions(options) {
      if (!treemap2) {
        throw new Error(log.error("Treemap not initialized"));
      }
      treemap2.data = bindParentForModule(options.data || []);
      for (const use2 of uses) {
        use2(treemap2);
      }
      resize();
    }
    function use(key, register2) {
      switch (key) {
        case "decorator":
          uses.push((treemap3) => register2(treemap3));
          break;
      }
    }
    function zoom(id) {
      if (!treemap2) {
        throw new Error(log.error("treemap don't init."));
      }
      const node = findRelativeNodeById(id, treemap2.layoutNodes);
      if (node) {
        treemap2.api.zoom(node);
      }
    }
    return context;
  }
  var RenderCache = class extends Canvas {
    constructor(opts) {
      super(opts);
      __publicField(this, "key");
      __publicField(this, "$memory");
      this.key = "render-cache";
      this.$memory = false;
    }
    get state() {
      return this.$memory;
    }
    flush(render, matrix) {
      const { devicePixelRatio, width, height } = render.options;
      const w = width / devicePixelRatio;
      const h = height / devicePixelRatio;
      this.ctx.drawImage(render.canvas, 0, 0, w, h);
      this.$memory = true;
    }
    destroy() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.$memory = false;
    }
  };

  // src/primitives/decorator.ts
  var defaultLayoutOptions = {
    titleAreaHeight: {
      max: 60,
      min: 30
    },
    rectGap: 5,
    rectBorderRadius: 0.5,
    rectBorderWidth: 1.5
  };
  var defaultFontOptions = {
    color: "#000",
    fontSize: {
      max: 38,
      min: 0
    },
    fontFamily: "sans-serif"
  };
  function presetDecorator(app) {
    Object.assign(app.decorator, {
      layout: defaultLayoutOptions,
      font: defaultFontOptions,
      color: { mappings: evaluateColorMappings(app.data) }
    });
  }
  function evaluateColorMappings(data) {
    const colorMappings = {};
    const hashToHue = (id) => {
      const hash = Math.abs(hashCode(id));
      return hash % 360;
    };
    const lightScale = (depth) => 70 - depth * 5;
    const baseSaturation = 40;
    const siblingHueShift = 20;
    const rc = 0.2126;
    const gc = 0.7152;
    const bc = 0.0722;
    const hslToRgb = (h, s, l) => {
      const a = s * Math.min(l, 1 - l);
      const f = (n) => {
        const k = (n + h / 30) % 12;
        return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      };
      return { r: f(0), g: f(8), b: f(4) };
    };
    const calculateLuminance = (r, g, b) => {
      return rc * r + gc * g + bc * b;
    };
    const calculateColor = (module, depth, parentHue, siblingIndex, totalSiblings) => {
      const nodeHue = hashToHue(module.id);
      const hue = parentHue !== null ? (parentHue + siblingHueShift * siblingIndex / totalSiblings) % 360 : nodeHue;
      const lightness = lightScale(depth);
      const hslColor = {
        h: hue,
        s: baseSaturation,
        l: lightness / 100
      };
      const { r, g, b } = hslToRgb(hslColor.h, hslColor.s / 100, hslColor.l);
      const luminance = calculateLuminance(r, g, b);
      if (luminance < 0.6) {
        hslColor.l += 0.2;
      } else if (luminance > 0.8) {
        hslColor.l -= 0.1;
      }
      hslColor.l *= 100;
      colorMappings[module.id] = {
        mode: "hsl",
        desc: hslColor
      };
      if (module.groups && Array.isArray(module.groups)) {
        const totalChildren = module.groups.length;
        for (let i = 0; i < totalChildren; i++) {
          const child = module.groups[i];
          calculateColor(child, depth + 1, hue, i, totalChildren);
        }
      }
    };
    for (let i = 0; i < data.length; i++) {
      const module = data[i];
      calculateColor(module, 0, null, i, data.length);
    }
    return colorMappings;
  }

  // dev/live-reload.ts
  if (false) {
    new EventSource("/esbuild").addEventListener("change", (e) => {
      const { added, removed, updated } = JSON.parse(e.data);
      if (!added.length && !removed.length && updated.length === 1) {
        for (const link of document.getElementsByTagName("link")) {
          const url = new URL(link.href);
          if (url.host === location.host && url.pathname === updated[0]) {
            const next = link.cloneNode();
            next.href = updated[0] + "?" + Math.random().toString(36).slice(2);
            next.onload = () => link.remove();
            link.parentNode.insertBefore(next, link.nextSibling);
            return;
          }
        }
      }
      location.reload();
    });
  }

  // dev/main.ts
  var root = document.querySelector("#app");
  var treemap = createTreemap();
  treemap.use("decorator", presetDecorator);
  function loadData() {
    return fetch("data.json").then((res) => res.json()).then((data) => data);
  }
  function main() {
    return __async(this, null, function* () {
      const data = yield loadData();
      const sortedData = sortChildrenByKey(
        data.map((item) => c2m(__spreadProps(__spreadValues({}, item), { groups: item.children }), "value", (d) => __spreadProps(__spreadValues({}, d), { id: d.path, label: d.name }))),
        "weight"
      );
      treemap.setOptions({
        data: sortedData
      });
    });
  }
  treemap.init(root);
  main().catch(console.error);
  treemap.on("click", function(metadata) {
    this.zoom(metadata.module);
  });
  new ResizeObserver(() => treemap.resize()).observe(root);
  var badge = document.createElement("div");
  badge.style.position = "fixed";
  badge.style.left = "20px";
  badge.style.bottom = "20px";
  badge.style.padding = "10px";
  badge.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  badge.style.color = "white";
  badge.style.borderRadius = "5px";
  badge.style.fontFamily = "Arial, sans-serif";
  badge.style.fontSize = "14px";
  badge.textContent = "FPS: 0";
  document.body.appendChild(badge);
  var lastFrameTime = 0;
  var frameCount = 0;
  var lastSecond = 0;
  function animate(currentTime) {
    if (lastFrameTime !== 0) {
      frameCount++;
      if (currentTime - lastSecond >= 1e3) {
        const fps = frameCount;
        badge.textContent = `FPS: ${fps}`;
        frameCount = 0;
        lastSecond = currentTime;
      }
    }
    lastFrameTime = currentTime;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
