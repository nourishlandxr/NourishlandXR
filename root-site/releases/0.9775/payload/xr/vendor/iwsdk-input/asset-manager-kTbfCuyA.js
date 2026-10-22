import { a9 as Xo, J as lt, K as te, H as oe, aa as MA, Z as Vo, B as $e, ab as Zo, C as zo, ac as ht, ad as jo, ae as $o, af as Ai, ag as ut, ah as KA, ai as wt, aj as At, ak as et, al as ke, am as _e, an as ei, ao as ti, ap as oi, aq as ii, ar as tt, as as ot, at as Me, au as de, av as ce, aw as dt, ax as yt, ay as Ne, az as vA, aA as NA, aB as RA, aC as oA, aD as yA, aE as ft, aF as Dt, aG as TA, a3 as si, aH as ni, aI as ri, aJ as it, aK as Ii, aL as gi, aM as ai, aN as Bi, aO as Ci, aP as Ei, aQ as pt, aR as VA, aS as Qi, v as ci, L as li, aT as hi, aU as ui, aV as wi, aW as di, n as yi, aX as fi } from "./iwsdkInputAdapter-D2CQ6O0_.js";
function st(r) {
  const e = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Map(), s = r.clone();
  return St(r, s, function(n, B) {
    e.set(B, n), o.set(n, B);
  }), s.traverse(function(n) {
    if (!n.isSkinnedMesh) return;
    const B = n, g = e.get(n), E = g.skeleton.bones;
    B.skeleton = g.skeleton.clone(), B.bindMatrix.copy(g.bindMatrix), B.skeleton.bones = E.map(function(f) {
      return o.get(f);
    }), B.bind(B.skeleton, B.bindMatrix);
  }), s;
}
function St(r, e, o) {
  o(r, e);
  for (let s = 0; s < r.children.length; s++)
    St(r.children[s], e.children[s], o);
}
class K {
  /** Record a logical key → URL mapping. */
  static setKeyToUrl(e, o) {
    this.keyToUrl.set(e, o);
  }
  /** Resolve a key or pass-through a URL. */
  static resolveUrl(e) {
    var o;
    return (o = this.keyToUrl.get(e)) !== null && o !== void 0 ? o : e;
  }
  /** True if an in-flight promise exists for URL. */
  static hasPromise(e) {
    return this.promiseCache.has(e);
  }
  /** Get the in-flight promise for URL (if any). */
  static getPromise(e) {
    return this.promiseCache.get(e);
  }
  /** Store an in-flight promise for URL. */
  static setPromise(e, o) {
    this.promiseCache.set(e, o);
  }
  /** Remove an in-flight promise, optionally only when it is still current. */
  static deletePromise(e, o) {
    return o != null && this.promiseCache.get(e) !== o ? !1 : this.promiseCache.delete(e);
  }
  /** True if an asset has been cached for URL. */
  static hasAsset(e) {
    return this.cache.has(e);
  }
  /** Retrieve a cached asset by URL. */
  static getAsset(e) {
    return this.cache.get(e);
  }
  /** Store an asset by URL. */
  static setAsset(e, o) {
    this.cache.set(e, o);
  }
  /** Remove one cached asset by logical key or URL. */
  static deleteAsset(e) {
    return this.cache.delete(this.resolveUrl(e));
  }
  /** Lookup asset by logical key or direct URL. */
  static getAssetByKey(e) {
    if (this.cache.has(e))
      return this.cache.get(e);
    const o = this.keyToUrl.get(e);
    if (o)
      return this.cache.get(o);
  }
  /** Clear caches (useful during tests). */
  static clear() {
    this.cache.clear(), this.promiseCache.clear(), this.keyToUrl.clear();
  }
}
K.cache = /* @__PURE__ */ new Map();
K.promiseCache = /* @__PURE__ */ new Map();
K.keyToUrl = /* @__PURE__ */ new Map();
const PA = 3e4;
class Di extends Error {
  constructor(e, o) {
    super(`Asset load timed out after ${o} ms: ${e}`), this.url = e, this.timeoutMs = o, this.name = "AssetLoadTimeoutError";
  }
}
function ne({ discard: r, load: e, replacePending: o = !1, timeoutMs: s = PA, url: n }) {
  if (xe(s), !o) {
    const d = K.getPromise(n);
    if (d != null)
      return d;
    const T = K.getAsset(n);
    if (T != null)
      return Promise.resolve(T);
  }
  let B = !0, g, E, f;
  const R = new Promise((d, T) => {
    E = d, f = T;
  });
  K.setPromise(n, R);
  const m = setTimeout(() => {
    if (B) {
      B = !1;
      try {
        g?.();
      } catch {
      }
      K.deletePromise(n, R), f(new Di(n, s));
    }
  }, s), l = (d) => {
    if (!B) {
      r?.(d);
      return;
    }
    B = !1, clearTimeout(m), K.getPromise(n) === R && (K.setAsset(n, d), K.deletePromise(n, R)), E(d);
  }, p = (d) => {
    B && (B = !1, clearTimeout(m), K.deletePromise(n, R), f(d));
  };
  try {
    g = e(l, p);
  } catch (d) {
    p(d);
  }
  return R;
}
function xe(r) {
  if (!Number.isFinite(r) || r <= 0)
    throw new Error("Asset load timeout must be a positive finite number");
}
class ye {
  static init(e) {
    this.audioLoader = new Xo(e);
  }
  /** Load an AudioBuffer (URL or logical key), returning a cached instance when possible. */
  static loadAudio(e, o = PA) {
    const s = K.resolveUrl(e);
    return ne({
      load: (n, B) => {
        this.audioLoader.load(s, n, void 0, B);
      },
      timeoutMs: o,
      url: s
    });
  }
  /** Get a cached AudioBuffer by logical key. */
  static getAudio(e) {
    return K.getAssetByKey(e) || null;
  }
}
const pi = 64 * 1024 * 1024, Si = 256 * 1024 * 1024, fe = /* @__PURE__ */ new WeakMap();
class Fi extends lt {
  /**
   * Constructs a new Draco loader.
   *
   * @param {LoadingManager} [manager] - The loading manager.
   */
  constructor(e) {
    super(e), this.decoderPath = "", this.decoderConfig = {}, this.decoderBinary = null, this.decoderPending = null, this.workerLimit = 4, this.workerPool = [], this.workerNextTaskID = 1, this.workerSourceURL = "", this.defaultAttributeIDs = {
      position: "POSITION",
      normal: "NORMAL",
      color: "COLOR",
      uv: "TEX_COORD"
    }, this.defaultAttributeTypes = {
      position: "Float32Array",
      normal: "Float32Array",
      color: "Float32Array",
      uv: "Float32Array"
    };
  }
  /**
   * Provides configuration for the decoder libraries. Configuration cannot be changed after decoding begins.
   *
   * @param {string} path - The decoder path.
   * @return {DRACOLoader} A reference to this loader.
   */
  setDecoderPath(e) {
    return this.decoderPath = e, this;
  }
  /**
   * Provides configuration for the decoder libraries. Configuration cannot be changed after decoding begins.
   *
   * @param {{type:('js'|'wasm')}} config - The decoder config.
   * @return {DRACOLoader} A reference to this loader.
   */
  setDecoderConfig(e) {
    return this.decoderConfig = e, this;
  }
  /**
   * Sets the maximum number of Web Workers to be used during decoding.
   * A lower limit may be preferable if workers are also for other tasks in the application.
   *
   * @param {number} workerLimit - The worker limit.
   * @return {DRACOLoader} A reference to this loader.
   */
  setWorkerLimit(e) {
    return this.workerLimit = e, this;
  }
  /**
   * Starts loading from the given URL and passes the loaded Draco asset
   * to the `onLoad()` callback.
   *
   * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(BufferGeometry)} onLoad - Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
   * @param {onErrorCallback} onError - Executed when errors occur.
   */
  load(e, o, s, n) {
    const B = new te(this.manager);
    B.setPath(this.path), B.setResponseType("arraybuffer"), B.setRequestHeader(this.requestHeader), B.setWithCredentials(this.withCredentials), B.load(e, (g) => {
      this.parse(g, o, n);
    }, s, n);
  }
  /**
   * Parses the given Draco data.
   *
   * @param {ArrayBuffer} buffer - The raw Draco data as an array buffer.
   * @param {function(BufferGeometry)} onLoad - Executed when the loading/parsing process has been finished.
   * @param {onErrorCallback} onError - Executed when errors occur.
   */
  parse(e, o, s = () => {
  }) {
    this.decodeDracoFile(e, o, null, null, oe, s).catch(s);
  }
  //
  decodeDracoFile(e, o, s, n, B = MA, g = () => {
  }) {
    const E = {
      attributeIDs: s || this.defaultAttributeIDs,
      attributeTypes: n || this.defaultAttributeTypes,
      useUniqueIDs: !!s,
      vertexColorSpace: B
    };
    return this.decodeGeometry(e, E).then(o).catch(g);
  }
  decodeGeometry(e, o) {
    const s = JSON.stringify(o);
    if (fe.has(e)) {
      const f = fe.get(e);
      if (f.key === s)
        return f.promise;
      if (e.byteLength === 0)
        throw new Error(
          "THREE.DRACOLoader: Unable to re-decode a buffer with different settings. Buffer has already been transferred."
        );
    }
    let n;
    const B = this.workerNextTaskID++, g = e.byteLength, E = this._getWorker(B, g).then((f) => (n = f, new Promise((R, m) => {
      n._callbacks[B] = { resolve: R, reject: m }, n.postMessage({ type: "decode", id: B, taskConfig: o, buffer: e }, [e]);
    }))).then((f) => this._createGeometry(f.geometry));
    return E.catch(() => !0).then(() => {
      n && B && this._releaseTask(n, B);
    }), fe.set(e, {
      key: s,
      promise: E
    }), E;
  }
  _createGeometry(e) {
    const o = new Vo();
    e.index && o.setIndex(new $e(e.index.array, 1));
    for (let s = 0; s < e.attributes.length; s++) {
      const { name: n, array: B, itemSize: g, stride: E, vertexColorSpace: f } = e.attributes[s];
      let R;
      if (g === E)
        R = new $e(B, g);
      else {
        const m = new Zo(B, E);
        R = new jo(m, g, 0);
      }
      n === "color" && (this._assignVertexColorSpace(R, f), R.normalized = !(B instanceof Float32Array)), o.setAttribute(n, R);
    }
    return o;
  }
  _assignVertexColorSpace(e, o) {
    if (o !== oe) return;
    const s = new zo();
    for (let n = 0, B = e.count; n < B; n++)
      s.fromBufferAttribute(e, n), ht.colorSpaceToWorking(s, oe), e.setXYZ(n, s.r, s.g, s.b);
  }
  _loadLibrary(e, o) {
    const s = new te(this.manager);
    return s.setPath(this.decoderPath), s.setResponseType(o), s.setWithCredentials(this.withCredentials), new Promise((n, B) => {
      s.load(e, n, void 0, B);
    });
  }
  preload() {
    return this._initDecoder(), this;
  }
  _initDecoder() {
    if (this.decoderPending) return this.decoderPending;
    const e = typeof WebAssembly != "object" || this.decoderConfig.type === "js", o = [];
    return e ? o.push(this._loadLibrary("draco_decoder.js", "text")) : (o.push(this._loadLibrary("draco_wasm_wrapper.js", "text")), o.push(this._loadLibrary("draco_decoder.wasm", "arraybuffer"))), this.decoderPending = Promise.all(o).then((s) => {
      const n = s[0];
      e || (this.decoderConfig.wasmBinary = s[1]);
      const B = Ri.toString(), g = [
        "/* draco decoder */",
        n,
        "",
        "/* worker */",
        B.substring(B.indexOf("{") + 1, B.lastIndexOf("}"))
      ].join(`
`);
      this.workerSourceURL = URL.createObjectURL(new Blob([g]));
    }), this.decoderPending;
  }
  _getWorker(e, o) {
    return this._initDecoder().then(() => {
      if (this.workerPool.length < this.workerLimit) {
        const n = new Worker(this.workerSourceURL);
        n._callbacks = {}, n._taskCosts = {}, n._taskLoad = 0, n.postMessage({ type: "init", decoderConfig: this.decoderConfig }), n.onmessage = function(B) {
          const g = B.data;
          switch (g.type) {
            case "decode":
              n._callbacks[g.id].resolve(g);
              break;
            case "error":
              n._callbacks[g.id].reject(g);
              break;
            default:
              console.error('THREE.DRACOLoader: Unexpected message, "' + g.type + '"');
          }
        }, this.workerPool.push(n);
      } else
        this.workerPool.sort(function(n, B) {
          return n._taskLoad > B._taskLoad ? -1 : 1;
        });
      const s = this.workerPool[this.workerPool.length - 1];
      return s._taskCosts[e] = o, s._taskLoad += o, s;
    });
  }
  _releaseTask(e, o) {
    e._taskLoad -= e._taskCosts[o], delete e._callbacks[o], delete e._taskCosts[o];
  }
  debug() {
    console.log("Task load: ", this.workerPool.map((e) => e._taskLoad));
  }
  dispose() {
    for (let e = 0; e < this.workerPool.length; ++e)
      this.workerPool[e].terminate();
    return this.workerPool.length = 0, this.workerSourceURL !== "" && URL.revokeObjectURL(this.workerSourceURL), this;
  }
}
function Ri() {
  let r, e;
  onmessage = function(g) {
    const E = g.data;
    switch (E.type) {
      case "init":
        r = E.decoderConfig, e = new Promise(function(m) {
          r.onModuleLoaded = function(l) {
            m({ draco: l });
          }, DracoDecoderModule(r);
        });
        break;
      case "decode":
        const f = E.buffer, R = E.taskConfig;
        e.then((m) => {
          const l = m.draco, p = new l.Decoder();
          try {
            const d = o(l, p, new Int8Array(f), R), T = d.attributes.map((L) => L.array.buffer);
            d.index && T.push(d.index.array.buffer), self.postMessage({ type: "decode", id: E.id, geometry: d }, T);
          } catch (d) {
            console.error(d), self.postMessage({ type: "error", id: E.id, error: d.message });
          } finally {
            l.destroy(p);
          }
        });
        break;
    }
  };
  function o(g, E, f, R) {
    const m = R.attributeIDs, l = R.attributeTypes;
    let p, d;
    const T = E.GetEncodedGeometryType(f);
    if (T === g.TRIANGULAR_MESH)
      p = new g.Mesh(), d = E.DecodeArrayToMesh(f, f.byteLength, p);
    else if (T === g.POINT_CLOUD)
      p = new g.PointCloud(), d = E.DecodeArrayToPointCloud(f, f.byteLength, p);
    else
      throw new Error("THREE.DRACOLoader: Unexpected geometry type.");
    if (!d.ok() || p.ptr === 0)
      throw new Error("THREE.DRACOLoader: Decoding failed: " + d.error_msg());
    const L = { index: null, attributes: [] };
    for (const O in m) {
      const X = self[l[O]];
      let P, x;
      if (R.useUniqueIDs)
        x = m[O], P = E.GetAttributeByUniqueId(p, x);
      else {
        if (x = E.GetAttributeId(p, g[m[O]]), x === -1) continue;
        P = E.GetAttribute(p, x);
      }
      const V = n(g, E, p, O, X, P);
      O === "color" && (V.vertexColorSpace = R.vertexColorSpace), L.attributes.push(V);
    }
    return T === g.TRIANGULAR_MESH && (L.index = s(g, E, p)), g.destroy(p), L;
  }
  function s(g, E, f) {
    const m = f.num_faces() * 3, l = m * 4, p = g._malloc(l);
    E.GetTrianglesUInt32Array(f, l, p);
    const d = new Uint32Array(g.HEAPF32.buffer, p, m).slice();
    return g._free(p), { array: d, itemSize: 1 };
  }
  function n(g, E, f, R, m, l) {
    const p = f.num_points(), d = l.num_components(), T = B(g, m), L = d * m.BYTES_PER_ELEMENT, O = Math.ceil(L / 4) * 4, X = O / m.BYTES_PER_ELEMENT, P = p * L, x = p * O, V = g._malloc(P);
    E.GetAttributeDataArrayForAllPoints(f, l, T, P, V);
    const z = new m(g.HEAPF32.buffer, V, P / m.BYTES_PER_ELEMENT);
    let QA;
    if (L === O)
      QA = z.slice();
    else {
      QA = new m(x / m.BYTES_PER_ELEMENT);
      let CA = 0;
      for (let _ = 0, b = z.length; _ < b; _++) {
        for (let Y = 0; Y < d; Y++)
          QA[CA + Y] = z[_ * d + Y];
        CA += X;
      }
    }
    return g._free(V), {
      name: R,
      count: p,
      itemSize: d,
      array: QA,
      stride: X
    };
  }
  function B(g, E) {
    switch (E) {
      case Float32Array:
        return g.DT_FLOAT32;
      case Int8Array:
        return g.DT_INT8;
      case Int16Array:
        return g.DT_INT16;
      case Int32Array:
        return g.DT_INT32;
      case Uint8Array:
        return g.DT_UINT8;
      case Uint16Array:
        return g.DT_UINT16;
      case Uint32Array:
        return g.DT_UINT32;
    }
  }
}
class Ui {
  /**
   * Constructs a new Worker pool.
   *
   * @param {number} [pool=4] - The size of the pool.
   */
  constructor(e = 4) {
    this.pool = e, this.queue = [], this.workers = [], this.workersResolve = [], this.workerStatus = 0, this.workerCreator = null;
  }
  _initWorker(e) {
    if (!this.workers[e]) {
      const o = this.workerCreator();
      o.addEventListener("message", this._onMessage.bind(this, e)), this.workers[e] = o;
    }
  }
  _getIdleWorker() {
    for (let e = 0; e < this.pool; e++)
      if (!(this.workerStatus & 1 << e)) return e;
    return -1;
  }
  _onMessage(e, o) {
    const s = this.workersResolve[e];
    if (s && s(o), this.queue.length) {
      const { resolve: n, msg: B, transfer: g } = this.queue.shift();
      this.workersResolve[e] = n, this.workers[e].postMessage(B, g);
    } else
      this.workerStatus ^= 1 << e;
  }
  /**
   * Sets a function that is responsible for creating Workers.
   *
   * @param {Function} workerCreator - The worker creator function.
   */
  setWorkerCreator(e) {
    this.workerCreator = e;
  }
  /**
   * Sets the Worker limit
   *
   * @param {number} pool - The size of the pool.
   */
  setWorkerLimit(e) {
    this.pool = e;
  }
  /**
   * Post a message to an idle Worker. If no Worker is available,
   * the message is pushed into a message queue for later processing.
   *
   * @param {Object} msg - The message.
   * @param {Array<ArrayBuffer>} transfer - An array with array buffers for data transfer.
   * @return {Promise} A Promise that resolves when the message has been processed.
   */
  postMessage(e, o) {
    return new Promise((s) => {
      const n = this._getIdleWorker();
      n !== -1 ? (this._initWorker(n), this.workerStatus |= 1 << n, this.workersResolve[n] = s, this.workers[n].postMessage(e, o)) : this.queue.push({ resolve: s, msg: e, transfer: o });
    });
  }
  /**
   * Terminates all Workers of this pool. Call this  method whenever this
   * Worker pool is no longer used in your app.
   */
  dispose() {
    this.workers.forEach((e) => e.terminate()), this.workersResolve.length = 0, this.workers.length = 0, this.queue.length = 0, this.workerStatus = 0;
  }
}
const Gi = 0, nt = 2, Li = 1, rt = 2, mi = 0, Ti = 1, ki = 10, _i = 0, Ft = 9, Rt = 15, Ut = 16, Gt = 22, Lt = 37, mt = 43, Tt = 76, kt = 83, _t = 97, Mt = 100, Nt = 103, xt = 109, Ht = 122, bt = 123, vt = 131, Jt = 132, qt = 133, Yt = 134, Ot = 137, Kt = 138, Pt = 139, Wt = 140, Xt = 141, Vt = 142, Zt = 145, zt = 146, jt = 148, $t = 152, Ao = 157, eo = 158, to = 165, oo = 166, io = 1000054e3, so = 1000054001, no = 1000054004, ro = 1000054005, Je = 1000066e3, Io = 1000066004;
class ee {
  constructor(e, o, s, n) {
    this._dataView = void 0, this._littleEndian = void 0, this._offset = void 0, this._dataView = new DataView(e.buffer, e.byteOffset + o, s), this._littleEndian = n, this._offset = 0;
  }
  _nextUint8() {
    const e = this._dataView.getUint8(this._offset);
    return this._offset += 1, e;
  }
  _nextUint16() {
    const e = this._dataView.getUint16(this._offset, this._littleEndian);
    return this._offset += 2, e;
  }
  _nextUint32() {
    const e = this._dataView.getUint32(this._offset, this._littleEndian);
    return this._offset += 4, e;
  }
  _nextUint64() {
    const e = this._dataView.getUint32(this._offset, this._littleEndian) + 4294967296 * this._dataView.getUint32(this._offset + 4, this._littleEndian);
    return this._offset += 8, e;
  }
  _nextInt32() {
    const e = this._dataView.getInt32(this._offset, this._littleEndian);
    return this._offset += 4, e;
  }
  _nextUint8Array(e) {
    const o = new Uint8Array(this._dataView.buffer, this._dataView.byteOffset + this._offset, e);
    return this._offset += e, o;
  }
  _skip(e) {
    return this._offset += e, this;
  }
  _scan(e, o = 0) {
    const s = this._offset;
    let n = 0;
    for (; this._dataView.getUint8(this._offset) !== o && n < e; ) n++, this._offset++;
    return n < e && this._offset++, new Uint8Array(this._dataView.buffer, this._dataView.byteOffset + s, n);
  }
}
const dA = [171, 75, 84, 88, 32, 50, 48, 187, 13, 10, 26, 10];
function It(r) {
  return new TextDecoder().decode(r);
}
function Mi(r) {
  const e = new Uint8Array(r.buffer, r.byteOffset, dA.length);
  if (e[0] !== dA[0] || e[1] !== dA[1] || e[2] !== dA[2] || e[3] !== dA[3] || e[4] !== dA[4] || e[5] !== dA[5] || e[6] !== dA[6] || e[7] !== dA[7] || e[8] !== dA[8] || e[9] !== dA[9] || e[10] !== dA[10] || e[11] !== dA[11]) throw new Error("Missing KTX 2.0 identifier.");
  const o = { vkFormat: 0, typeSize: 1, pixelWidth: 0, pixelHeight: 0, pixelDepth: 0, layerCount: 0, faceCount: 1, levelCount: 0, supercompressionScheme: 0, levels: [], dataFormatDescriptor: [{ vendorId: 0, descriptorType: 0, versionNumber: 2, colorModel: 0, colorPrimaries: 1, transferFunction: 2, flags: 0, texelBlockDimension: [0, 0, 0, 0], bytesPlane: [0, 0, 0, 0, 0, 0, 0, 0], samples: [] }], keyValue: {}, globalData: null }, s = 17 * Uint32Array.BYTES_PER_ELEMENT, n = new ee(r, dA.length, s, !0);
  o.vkFormat = n._nextUint32(), o.typeSize = n._nextUint32(), o.pixelWidth = n._nextUint32(), o.pixelHeight = n._nextUint32(), o.pixelDepth = n._nextUint32(), o.layerCount = n._nextUint32(), o.faceCount = n._nextUint32(), o.levelCount = n._nextUint32(), o.supercompressionScheme = n._nextUint32();
  const B = n._nextUint32(), g = n._nextUint32(), E = n._nextUint32(), f = n._nextUint32(), R = n._nextUint64(), m = n._nextUint64(), l = 3 * Math.max(o.levelCount, 1) * 8, p = new ee(r, dA.length + s, l, !0);
  for (let tA = 0, J = Math.max(o.levelCount, 1); tA < J; tA++) o.levels.push({ levelData: new Uint8Array(r.buffer, r.byteOffset + p._nextUint64(), p._nextUint64()), uncompressedByteLength: p._nextUint64() });
  const d = new ee(r, B, g, !0);
  d._skip(4);
  const T = d._nextUint16(), L = d._nextUint16(), O = d._nextUint16(), X = d._nextUint16(), P = { vendorId: T, descriptorType: L, versionNumber: O, colorModel: d._nextUint8(), colorPrimaries: d._nextUint8(), transferFunction: d._nextUint8(), flags: d._nextUint8(), texelBlockDimension: [d._nextUint8(), d._nextUint8(), d._nextUint8(), d._nextUint8()], bytesPlane: [d._nextUint8(), d._nextUint8(), d._nextUint8(), d._nextUint8(), d._nextUint8(), d._nextUint8(), d._nextUint8(), d._nextUint8()], samples: [] }, x = (X / 4 - 6) / 4;
  for (let tA = 0; tA < x; tA++) {
    const J = { bitOffset: d._nextUint16(), bitLength: d._nextUint8(), channelType: d._nextUint8(), samplePosition: [d._nextUint8(), d._nextUint8(), d._nextUint8(), d._nextUint8()], sampleLower: Number.NEGATIVE_INFINITY, sampleUpper: Number.POSITIVE_INFINITY };
    64 & J.channelType ? (J.sampleLower = d._nextInt32(), J.sampleUpper = d._nextInt32()) : (J.sampleLower = d._nextUint32(), J.sampleUpper = d._nextUint32()), P.samples[tA] = J;
  }
  o.dataFormatDescriptor.length = 0, o.dataFormatDescriptor.push(P);
  const V = new ee(r, E, f, !0);
  for (; V._offset < f; ) {
    const tA = V._nextUint32(), J = V._scan(tA), $ = It(J);
    if (o.keyValue[$] = V._nextUint8Array(tA - J.byteLength - 1), $.match(/^ktx/i)) {
      const DA = It(o.keyValue[$]);
      o.keyValue[$] = DA.substring(0, DA.lastIndexOf("\0"));
    }
    V._skip(tA % 4 ? 4 - tA % 4 : 0);
  }
  if (m <= 0) return o;
  const z = new ee(r, R, m, !0), QA = z._nextUint16(), CA = z._nextUint16(), _ = z._nextUint32(), b = z._nextUint32(), Y = z._nextUint32(), v = z._nextUint32(), W = [];
  for (let tA = 0, J = Math.max(o.levelCount, 1); tA < J; tA++) W.push({ imageFlags: z._nextUint32(), rgbSliceByteOffset: z._nextUint32(), rgbSliceByteLength: z._nextUint32(), alphaSliceByteOffset: z._nextUint32(), alphaSliceByteLength: z._nextUint32() });
  const AA = R + z._offset, M = AA + _, eA = M + b, H = eA + Y, cA = new Uint8Array(r.buffer, r.byteOffset + AA, _), fA = new Uint8Array(r.buffer, r.byteOffset + M, b), EA = new Uint8Array(r.buffer, r.byteOffset + eA, Y), IA = new Uint8Array(r.buffer, r.byteOffset + H, v);
  return o.globalData = { endpointCount: QA, selectorCount: CA, imageDescs: W, endpointsData: cA, selectorsData: fA, tablesData: EA, extendedData: IA }, o;
}
let De, bA, He;
const pe = { env: { emscripten_notify_memory_growth: function(r) {
  He = new Uint8Array(bA.exports.memory.buffer);
} } };
class Ni {
  init() {
    return De || (De = typeof fetch < "u" ? fetch("data:application/wasm;base64," + gt).then((e) => e.arrayBuffer()).then((e) => WebAssembly.instantiate(e, pe)).then(this._init) : WebAssembly.instantiate(Buffer.from(gt, "base64"), pe).then(this._init), De);
  }
  _init(e) {
    bA = e.instance, pe.env.emscripten_notify_memory_growth(0);
  }
  decode(e, o = 0) {
    if (!bA) throw new Error("ZSTDDecoder: Await .init() before decoding.");
    const s = e.byteLength, n = bA.exports.malloc(s);
    He.set(e, n), o = o || Number(bA.exports.ZSTD_findDecompressedSize(n, s));
    const B = bA.exports.malloc(o), g = bA.exports.ZSTD_decompress(B, o, n, s), E = He.slice(B, B + g);
    return bA.exports.free(n), bA.exports.free(B), E;
  }
}
const gt = "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IAMNACAEQQNxBEADQCACRQ0FIAAgAkF/aiICaiIDIAEgAmotAAA6AAAgA0EDcQ0ACwsgAkEDTQ0AA0AgACACQXxqIgJqIAEgAmooAgA2AgAgAkEDSw0ACwsgAkUNAgNAIAAgAkF/aiICaiABIAJqLQAAOgAAIAINAAsMAgsgAkEDTQ0AIAIhBANAIAMgASgCADYCACABQQRqIQEgA0EEaiEDIARBfGoiBEEDSw0ACyACQQNxIQILIAJFDQADQCADIAEtAAA6AAAgA0EBaiEDIAFBAWohASACQX9qIgINAAsLIAAL8wICAn8BfgJAIAJFDQAgACACaiIDQX9qIAE6AAAgACABOgAAIAJBA0kNACADQX5qIAE6AAAgACABOgABIANBfWogAToAACAAIAE6AAIgAkEHSQ0AIANBfGogAToAACAAIAE6AAMgAkEJSQ0AIABBACAAa0EDcSIEaiIDIAFB/wFxQYGChAhsIgE2AgAgAyACIARrQXxxIgRqIgJBfGogATYCACAEQQlJDQAgAyABNgIIIAMgATYCBCACQXhqIAE2AgAgAkF0aiABNgIAIARBGUkNACADIAE2AhggAyABNgIUIAMgATYCECADIAE2AgwgAkFwaiABNgIAIAJBbGogATYCACACQWhqIAE2AgAgAkFkaiABNgIAIAQgA0EEcUEYciIEayICQSBJDQAgAa0iBUIghiAFhCEFIAMgBGohAQNAIAEgBTcDGCABIAU3AxAgASAFNwMIIAEgBTcDACABQSBqIQEgAkFgaiICQR9LDQALCyAACy8BAn8gACgCBCAAKAIAQQJ0aiICLQACIQMgACACLwEAIAEgAi0AAxAIajYCACADCy8BAn8gACgCBCAAKAIAQQJ0aiICLQACIQMgACACLwEAIAEgAi0AAxAFajYCACADCx8AIAAgASACKAIEEAg2AgAgARAEGiAAIAJBCGo2AgQLCAAgAGdBH3MLugUBDX8jAEEQayIKJAACfyAEQQNNBEAgCkEANgIMIApBDGogAyAEEAsaIAAgASACIApBDGpBBBAVIgBBbCAAEAMbIAAgACAESxsMAQsgAEEAIAEoAgBBAXRBAmoQECENQVQgAygAACIGQQ9xIgBBCksNABogAiAAQQVqNgIAIAMgBGoiAkF8aiEMIAJBeWohDiACQXtqIRAgAEEGaiELQQQh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ASIDNgLE4AEgACgCvOABIQQgACABNgK84AEgACABIAJqNgK44AEgACABIAQgA2tqNgLA4AELpgEBAX8gACAAKALs4QEQFjYCyOABIABCADcD+OABIABCADcDuOABIABBwOABakIANwMAIABBqNAAaiIBQYyAgOAANgIAIABBADYCmOIBIABCADcDiOEBIABCAzcDgOEBIABBrNABakHgEikCADcCACAAQbTQAWpB6BIoAgA2AgAgACABNgIMIAAgAEGYIGo2AgggACAAQaAwajYCBCAAIABBEGo2AgALYQEBf0G4fyEDAkAgAUEDSQ0AIAIgABAhIgFBA3YiADYCCCACIAFBAXE2AgQgAiABQQF2QQNxIgM2AgACQCADQX9qIgFBAksNAAJAIAFBAWsOAgEAAgtBbA8LIAAhAwsgAwsMACAAIAEgAkEAEC4LiAQCA38CfiADEBYhBCAAQQBBKBAQIQAgBCACSwRAIAQPCyABRQRAQX8PCwJAAkAgA0EBRg0AIAEoAAAiBkGo6r5pRg0AQXYhAyAGQXBxQdDUtMIBRw0BQQghAyACQQhJDQEgAEEAQSgQECEAIAEoAAQhASAAQQE2AhQgACABrTcDAEEADwsgASACIAMQLyIDIAJLDQAgACADNgIYQXIhAyABIARqIgVBf2otAAAiAkEIcQ0AIAJBIHEiBkUEQEFwIQMgBS0AACIFQacBSw0BIAVBB3GtQgEgBUEDdkEKaq2GIgdCA4h+IAd8IQggBEEBaiEECyACQQZ2IQMgAkECdiEFAkAgAkEDcUF/aiICQQJLBEBBACECDAELAkACQAJAIAJBAWsOAgECAAsgASAEai0AACECIARBAWohBAwCCyABIARqLwAAIQIgBEECaiEEDAELIAEgBGooAAAhAiAEQQRqIQQLIAVBAXEhBQJ+AkACQAJAIANBf2oiA0ECTQRAIANBAWsOAgIDAQtCfyAGRQ0DGiABIARqMQAADAMLIAEgBGovAACtQoACfAwCCyABIARqKAAArQwBCyABIARqKQAACyEHIAAgBTYCICAAIAI2AhwgACAHNwMAQQAhAyAAQQA2AhQgACAHIAggBhsiBzcDCCAAIAdCgIAIIAdCgIAIVBs+AhALIAMLWwEBf0G4fyEDIAIQFiICIAFNBH8gACACakF/ai0AACIAQQNxQQJ0QaAeaigC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C0Egak8NAQsgByAHKQNoNwMQIAcgBykDYDcDCCAEIA0gB0EIaiAHQdwAaiAPIA4gESAQEB4hCwwBCyACIARqIQggBCAKEAcgAkERTwRAIARBEGohAgNAIAIgCkEQaiIKEAcgAkEQaiICIAhJDQALCyAIIAlrIQIgByATNgJcIAkgCCAOa0sEQCAJIAggEWtLBEBBbCELDAILIBAgAiAOayICaiIKIANqIBBNBEAgCCAKIAMQDxoMAgsgCCAKQQAgAmsQDyEIIAcgAiADaiIDNgJkIAggAmshCCAOIQILIAlBEE8EQCADIAhqIQMDQCAIIAIQByACQRBqIQIgCEEQaiIIIANJDQALDAELAkAgCUEHTQRAIAggAi0AADoAACAIIAItAAE6AAEgCCACLQACOgACIAggAi0AAzoAAyAIQQRqIAIgCUECdCIDQcAeaigCAGoiAhAXIAIgA0HgHmooAgBrIQIgBygCZCEDDAELIAggAhAMCyADQQlJDQAgAyAIaiEDIAhBCGoiCCACQQhqIgJrQQ9MBEADQCAIIAIQDCACQQhqIQIgCEEIaiIIIANJDQAMAgALAAsDQCAIIAIQByACQRBqIQIgCEEQaiIIIANJDQALCyAHQRhqEAQaIAsgDCALEAMiAhshDCAEIAQgC2ogAhshBCAFQX9qIgUNAAsgDBADDQFBbCEMIAdBGGoQBEECSQ0BQQAhCANAIAhBA0cEQCAAIAhBAnQiAmpBrNABaiACIAdqKAJENgIAIAhBAWohCAwBCwsgBygCXCEIC0G6fyEMIA8gCGsiACANIARrSw0AIAQEfyAEIAggABALIABqBUEACyABayEMCyAHQfAAaiQAIAwLkRcCFn8FfiMAQdABayIHJAAgByAAKALw4QEiCDYCvAEgASACaiESIAggACgCgOIBaiETAkACQCAFRQRAIAEhAwwBCyAAKALE4AEhESAAKALA4AEhFSAAKAK84AEhDyAAQQE2AozhAUEAIQgDQCAIQQNHBEAgByAIQQJ0IgJqIAAgAmpBrNABaigCADYCVCAIQQFqIQgMAQsLIAcgETYCZCAHIA82AmAgByABIA9rNgJoQWwhECAHQShqIAMgBBAGEAMNASAFQQQgBUEESBshFyAHQTxqIAdBKGogACgCABATIAdBxABqIAdBKGogACgCCBATIAdBzABqIAdB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IAdB0AFqJAAgEAslACAAQgA3AgAgAEEAOwEIIABBADoACyAAIAE2AgwgACACOgAKC7QFAQN/IwBBMGsiBCQAIABB/wFqIgVBfWohBgJAIAMvAQIEQCAEQRhqIAEgAhAGIgIQAw0BIARBEGogBEEYaiADEBwgBEEIaiAEQRhqIAMQHCAAIQMDQAJAIARBGGoQBCADIAZPckUEQCADIARBEGogBEEYahASOgAAIAMgBEEIaiAEQRhqEBI6AAEgBEEYahAERQ0BIANBAmohAwsgBUF+aiEFAn8DQEG6fyECIAMiASAFSw0FIAEgBEEQaiAEQRhqEBI6AAAgAUEBaiEDIARBGGoQBEEDRgRAQQIhAiAEQQhqDAILIAMgBUsNBSABIARBCGogBEEYahASOgABIAFBAmohA0EDIQIgBEEYahAEQQNHDQALIARBEGoLIQUgAyAFIARBGGoQEjoAACABIAJqIABrIQIMAwsgAyAEQRBqIARBGGoQEjoAAiADIARBCGogBEEYahASOgADIANBBGohAwwAAAsACyAEQRhqIAEgAhAGIgIQAw0AIARBEGogBEEYaiADEBwgBEEIaiAEQRhqIAMQHCAAIQMDQAJAIARBGGoQBCADIAZPckUEQCADIARBEGogBEEYahAROgAAIAMgBEEIaiAEQRhqEBE6AAEgBEEYahAERQ0BIANBAmohAwsgBUF+aiEFAn8DQEG6fyECIAMiASAFSw0EIAEgBEEQaiAEQRhqEBE6AAAgAUEBaiEDIARBGGoQBEEDRgRAQQIhAiAEQQhqDAILIAMgBUsNBCABIARBCGogBEEYahAROgABIAFBAmohA0EDIQIgBEEYahAEQQNHDQALIARBEGoLIQUgAyAFIARBGGoQEToAACABIAJqIABrIQIMAgsgAyAEQRBqIARBGGoQEToAAiADIARBCGogBEEYahAROgADIANBBGohAwwAAAsACyAEQTBqJAAgAgtpAQF/An8CQAJAIAJBB00NACABKAAAQbfIwuF+Rw0AIAAgASgABDYCmOIBQWIgAEEQaiABIAIQPiIDEAMNAhogAEKBgICAEDcDiOEBIAAgASADaiACIANrECoMAQsgACABIAIQKgtBAAsLrQMBBn8jAEGAAWsiAyQAQWIhCAJAIAJBCUkNACAAQZjQAGogAUEIaiIEIAJBeGogAEGY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wOABCwutAgIEfwF+IwBBQGoiBCQAAkACQCACQQhJDQAgASgAAEFwcUHQ1LTCAUcNACABIAIQIiEBIABCADcDCCAAQQA2AgQgACABNgIADAELIARBGGogASACEC0iAxADBEAgACADEBoMAQsgAwRAIABBuH8QGgwBCyACIAQoAjAiA2shAiABIANqIQMDQAJAIAAgAyACIARBCGoQLCIFEAMEfyAFBSACIAVBA2oiBU8NAUG4fwsQGgwCCyAGQQFqIQYgAiAFayECIAMgBWohAyAEKAIMRQ0ACyAEKAI4BEAgAkEDTQRAIABBuH8QGgwCCyADQQRqIQMLIAQoAighAiAEKQMYIQcgAEEANgIEIAAgAyABazYCACAAIAIgBmytIAcgB0J/URs3AwgLIARBQGskAAslAQF/IwBBEGsiAiQAIAIgACABEFEgAigCACEAIAJBEGokACAAC30BBH8jAEGQBGsiBCQAIARB/wE2AggCQCAEQRBqIARBCGogBEEMaiABIAIQFSIGEAMEQCAGIQUMAQtBVCEFIAQoAgwiB0EGSw0AIAMgBEEQaiAEKAIIIAcQQSIFEAMNACAAIAEgBmogAiAGayADEDwhBQsgBEGQBGokACAFC4cBAgJ/An5BABAWIQMCQANAIAEgA08EQAJAIAAoAABBcHFB0NS0wgFGBEAgACABECIiAhADRQ0BQn4PCyAAIAEQVSIEQn1WDQMgBCAFfCIFIARUIQJCfiEEIAINAyAAIAEQUiICEAMNAwsgASACayEBIAAgAmohAAwBCwtCfiAFIAEbIQQLIAQLPwIBfwF+IwBBMGsiAiQAAn5CfiACQQhqIAAgARAtDQAaQgAgAigCHEEBRg0AGiACKQMICyEDIAJBMGokACADC40BAQJ/IwBBMGsiASQAAkAgAEUNACAAKAKI4gENACABIABB/OEBaigCADYCKCABIAApAvThATcDICAAEDAgACgCqOIBIQIgASABKAIoNgIYIAEgASkDIDcDECACIAFBEGoQGyAAQQA2AqjiASABIAEoAig2AgggASABKQMgNwMAIAAgARAbCyABQTBqJAALKgECfyMAQRBrIgAkACAAQQA2AgggAEIANwMAIAAQWCEBIABBEGokACABC4cBAQN/IwBBEGsiAiQAAkAgACgCAEUgACgCBEVzDQAgAiAAKAIINgIIIAIgACkCADcDAAJ/IAIoAgAiAQRAIAIoAghBqOMJIAERBQAMAQtBqOMJECgLIgFFDQAgASAAKQIANwL04QEgAUH84QFqIAAoAgg2AgAgARBZIAEhAwsgAkEQaiQAIAMLywEBAn8jAEEgayIBJAAgAEGBgIDAADYCtOIBIABBADYCiOIBIABBADYC7OEBIABCADcDkOIBIABBADYCpOMJIABBADYC3OIBIABCADcCzOIBIABBADYCvOIBIABBADYCxOABIABCADcCnOIBIABBpOIBakIANwIAIABBrOIBakEANgIAIAFCADcCECABQgA3AhggASABKQMYNwMIIAEgASkDEDcDACABKAIIQQh2QQFxIQIgAEEANgLg4gEgACACNgKM4gEgAUEgaiQAC3YBA38jAEEwayIBJAAgAARAIAEgAEHE0AFqIgIoAgA2AiggASAAKQK80AE3AyAgACgCACEDIAEgAigCADYCGCABIAApArzQATcDECADIAFBEGoQGyABIAEoAig2AgggASABKQMgNwMAIAAgARAbCyABQTBqJAALzAEBAX8gACABKAK00AE2ApjiASAAIAEoAgQiAjYCwOABIAAgAjYCvOABIAAgAiABKAIIaiICNgK44AEgACACNgLE4AEgASgCuNABBEAgAEKBgICAEDcDiOEBIAAgAUGk0ABqNgIMIAAgAUGUIGo2AgggACABQZwwajYCBCAAIAFBDGo2AgAgAEGs0AFqIAFBqNABaigCADYCACAAQbDQAWogAUGs0AFqKAIANgIAIABBtNABaiABQbDQAWooAgA2AgAPCyAAQgA3A4jhAQs7ACACRQRAQbp/DwsgBEUEQEFsDwsgAiAEEGAEQCAAIAEgAiADIAQgBRBhDwsgACABIAIgAyAEIAUQZQtGAQF/IwBBEGsiBSQAIAVBCGogBBAOAn8gBS0ACQRAIAAgASACIAMgBBAyDAELIAAgASACIAMgBBA0CyEAIAVBEGokACAACzQAIAAgAyAEIAUQNiIFEAMEQCAFDwsgBSAESQR/IAEgAiADIAVqIAQgBWsgABA1BUG4fwsLRgEBfyMAQRBrIgUkACAFQQhqIAQQDgJ/IAUtAAkEQCAAIAEgAiADIAQQYgwBCyAAIAEgAiADIAQQNQshACAFQRBqJAAgAAtZAQF/QQ8hAiABIABJBEAgAUEE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", xi = "display-p3", Hi = "display-p3-linear";
({
  ...ht.spaces[oe]
});
const Se = /* @__PURE__ */ new WeakMap();
let Fe = 0, Re;
class UA extends lt {
  /**
   * Constructs a new KTX2 loader.
   *
   * @param {LoadingManager} [manager] - The loading manager.
   */
  constructor(e) {
    super(e), this.transcoderPath = "", this.transcoderBinary = null, this.transcoderPending = null, this.workerPool = new Ui(), this.workerSourceURL = "", this.workerConfig = null, typeof MSC_TRANSCODER < "u" && console.warn(
      'THREE.KTX2Loader: Please update to latest "basis_transcoder". "msc_basis_transcoder" is no longer supported in three.js r125+.'
    );
  }
  /**
   * Sets the transcoder path.
   *
   * The WASM transcoder and JS wrapper are available from the `examples/jsm/libs/basis` directory.
   *
   * @param {string} path - The transcoder path to set.
   * @return {KTX2Loader} A reference to this loader.
   */
  setTranscoderPath(e) {
    return this.transcoderPath = e, this;
  }
  /**
   * Sets the maximum number of Web Workers to be allocated by this instance.
   *
   * @param {number} workerLimit - The worker limit.
   * @return {KTX2Loader} A reference to this loader.
   */
  setWorkerLimit(e) {
    return this.workerPool.setWorkerLimit(e), this;
  }
  /**
   * Async version of {@link KTX2Loader#detectSupport}.
   *
   * @async
   * @deprecated
   * @param {WebGPURenderer} renderer - The renderer.
   * @return {Promise} A Promise that resolves when the support has been detected.
   */
  async detectSupportAsync(e) {
    return console.warn('KTX2Loader: "detectSupportAsync()" has been deprecated. Use "detectSupport()" and "await renderer.init();" when creating the renderer.'), await e.init(), this.detectSupport(e);
  }
  /**
   * Detects hardware support for available compressed texture formats, to determine
   * the output format for the transcoder. Must be called before loading a texture.
   *
   * @param {WebGPURenderer|WebGLRenderer} renderer - The renderer.
   * @return {KTX2Loader} A reference to this loader.
   */
  detectSupport(e) {
    return e.isWebGPURenderer === !0 ? this.workerConfig = {
      astcSupported: e.hasFeature("texture-compression-astc"),
      astcHDRSupported: !1,
      // https://github.com/gpuweb/gpuweb/issues/3856
      etc1Supported: e.hasFeature("texture-compression-etc1"),
      etc2Supported: e.hasFeature("texture-compression-etc2"),
      dxtSupported: e.hasFeature("texture-compression-s3tc"),
      bptcSupported: e.hasFeature("texture-compression-bc"),
      pvrtcSupported: e.hasFeature("texture-compression-pvrtc")
    } : (this.workerConfig = {
      astcSupported: e.extensions.has("WEBGL_compressed_texture_astc"),
      astcHDRSupported: e.extensions.has("WEBGL_compressed_texture_astc") && e.extensions.get("WEBGL_compressed_texture_astc").getSupportedProfiles().includes("hdr"),
      etc1Supported: e.extensions.has("WEBGL_compressed_texture_etc1"),
      etc2Supported: e.extensions.has("WEBGL_compressed_texture_etc"),
      dxtSupported: e.extensions.has("WEBGL_compressed_texture_s3tc"),
      bptcSupported: e.extensions.has("EXT_texture_compression_bptc"),
      pvrtcSupported: e.extensions.has("WEBGL_compressed_texture_pvrtc") || e.extensions.has("WEBKIT_WEBGL_compressed_texture_pvrtc")
    }, typeof navigator < "u" && navigator.platform.indexOf("Linux") >= 0 && navigator.userAgent.indexOf("Firefox") >= 0 && this.workerConfig.astcSupported && this.workerConfig.etc2Supported && this.workerConfig.bptcSupported && this.workerConfig.dxtSupported && (this.workerConfig.astcSupported = !1, this.workerConfig.etc2Supported = !1)), this;
  }
  // TODO: Make this method private
  init() {
    if (!this.transcoderPending) {
      const e = new te(this.manager);
      e.setPath(this.transcoderPath), e.setWithCredentials(this.withCredentials);
      const o = e.loadAsync("basis_transcoder.js"), s = new te(this.manager);
      s.setPath(this.transcoderPath), s.setResponseType("arraybuffer"), s.setWithCredentials(this.withCredentials);
      const n = s.loadAsync("basis_transcoder.wasm");
      this.transcoderPending = Promise.all([o, n]).then(([B, g]) => {
        const E = UA.BasisWorker.toString(), f = [
          "/* constants */",
          "let _EngineFormat = " + JSON.stringify(UA.EngineFormat),
          "let _EngineType = " + JSON.stringify(UA.EngineType),
          "let _TranscoderFormat = " + JSON.stringify(UA.TranscoderFormat),
          "let _BasisFormat = " + JSON.stringify(UA.BasisFormat),
          "/* basis_transcoder.js */",
          B,
          "/* worker */",
          E.substring(E.indexOf("{") + 1, E.lastIndexOf("}"))
        ].join(`
`);
        this.workerSourceURL = URL.createObjectURL(new Blob([f])), this.transcoderBinary = g, this.workerPool.setWorkerCreator(() => {
          const R = new Worker(this.workerSourceURL), m = this.transcoderBinary.slice(0);
          return R.postMessage({ type: "init", config: this.workerConfig, transcoderBinary: m }, [m]), R;
        });
      }), Fe > 0 && console.warn(
        "THREE.KTX2Loader: Multiple active KTX2 loaders may cause performance issues. Use a single KTX2Loader instance, or call .dispose() on old instances."
      ), Fe++;
    }
    return this.transcoderPending;
  }
  /**
   * Starts loading from the given URL and passes the loaded KTX2 texture
   * to the `onLoad()` callback.
   *
   * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(CompressedTexture)} onLoad - Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
   * @param {onErrorCallback} onError - Executed when errors occur.
   */
  load(e, o, s, n) {
    if (this.workerConfig === null)
      throw new Error("THREE.KTX2Loader: Missing initialization with `.detectSupport( renderer )`.");
    const B = new te(this.manager);
    B.setPath(this.path), B.setCrossOrigin(this.crossOrigin), B.setWithCredentials(this.withCredentials), B.setRequestHeader(this.requestHeader), B.setResponseType("arraybuffer"), B.load(e, (g) => {
      this.parse(g, o, n);
    }, s, n);
  }
  /**
   * Parses the given KTX2 data.
   *
   * @param {ArrayBuffer} buffer - The raw KTX2 data as an array buffer.
   * @param {function(CompressedTexture)} onLoad - Executed when the loading/parsing process has been finished.
   * @param {onErrorCallback} onError - Executed when errors occur.
   * @returns {Promise} A Promise that resolves when the parsing has been finished.
   */
  parse(e, o, s) {
    if (this.workerConfig === null)
      throw new Error("THREE.KTX2Loader: Missing initialization with `.detectSupport( renderer )`.");
    if (Se.has(e))
      return Se.get(e).promise.then(o).catch(s);
    this._createTexture(e).then((n) => o ? o(n) : null).catch(s);
  }
  _createTextureFrom(e, o) {
    const { type: s, error: n, data: { faces: B, width: g, height: E, format: f, type: R, dfdFlags: m } } = e;
    if (s === "error") return Promise.reject(n);
    let l;
    if (o.faceCount === 6)
      l = new $o(B, f, R);
    else {
      const p = B[0].mipmaps;
      l = o.layerCount > 1 ? new Ai(p, g, E, o.layerCount, f, R) : new ut(p, g, E, f, R);
    }
    return l.minFilter = B[0].mipmaps.length === 1 ? KA : wt, l.magFilter = KA, l.generateMipmaps = !1, l.needsUpdate = !0, l.colorSpace = go(o), l.premultiplyAlpha = !!(m & Li), l;
  }
  /**
   * @private
   * @param {ArrayBuffer} buffer
   * @param {?Object} config
   * @return {Promise<CompressedTexture|CompressedArrayTexture|DataTexture|Data3DTexture>}
   */
  async _createTexture(e, o = {}) {
    const s = Mi(new Uint8Array(e)), n = s.vkFormat === Je && s.dataFormatDescriptor[0].colorModel === 167;
    if (!(s.vkFormat === _i || n && !this.workerConfig.astcHDRSupported))
      return vi(s);
    const g = o, E = this.init().then(() => this.workerPool.postMessage({ type: "transcode", buffer: e, taskConfig: g }, [e])).then((f) => this._createTextureFrom(f.data, s));
    return Se.set(e, { promise: E }), E;
  }
  /**
   * Frees internal resources. This method should be called
   * when the loader is no longer required.
   */
  dispose() {
    this.workerPool.dispose(), this.workerSourceURL && URL.revokeObjectURL(this.workerSourceURL), Fe--;
  }
}
UA.BasisFormat = {
  ETC1S: 0,
  UASTC: 1,
  UASTC_HDR: 2
};
UA.TranscoderFormat = {
  ETC1: 0,
  ETC2: 1,
  BC1: 2,
  BC3: 3,
  BC4: 4,
  BC5: 5,
  BC7_M6_OPAQUE_ONLY: 6,
  BC7_M5: 7,
  PVRTC1_4_RGB: 8,
  PVRTC1_4_RGBA: 9,
  ASTC_4x4: 10,
  ATC_RGB: 11,
  ATC_RGBA_INTERPOLATED_ALPHA: 12,
  RGBA32: 13,
  RGB565: 14,
  BGR565: 15,
  RGBA4444: 16,
  BC6H: 22,
  RGB_HALF: 24,
  RGBA_HALF: 25
};
UA.EngineFormat = {
  RGBAFormat: RA,
  RGBA_ASTC_4x4_Format: ce,
  RGB_BPTC_UNSIGNED_Format: Bi,
  RGBA_BPTC_Format: _e,
  RGBA_ETC2_EAC_Format: yt,
  RGBA_PVRTC_4BPPV1_Format: ke,
  RGBA_S3TC_DXT5_Format: ai,
  RGB_ETC1_Format: gi,
  RGB_ETC2_Format: dt,
  RGB_PVRTC_4BPPV1_Format: Ii,
  RGBA_S3TC_DXT1_Format: Me
};
UA.EngineType = {
  UnsignedByteType: oA,
  HalfFloatType: yA,
  FloatType: TA
};
UA.BasisWorker = function() {
  let r, e, o;
  const s = _EngineFormat, n = _EngineType, B = _TranscoderFormat, g = _BasisFormat;
  self.addEventListener("message", function(T) {
    const L = T.data;
    switch (L.type) {
      case "init":
        r = L.config, E(L.transcoderBinary);
        break;
      case "transcode":
        e.then(() => {
          try {
            const { faces: O, buffers: X, width: P, height: x, hasAlpha: V, format: z, type: QA, dfdFlags: CA } = f(L.buffer);
            self.postMessage({ type: "transcode", id: L.id, data: { faces: O, width: P, height: x, hasAlpha: V, format: z, type: QA, dfdFlags: CA } }, X);
          } catch (O) {
            console.error(O), self.postMessage({ type: "error", id: L.id, error: O.message });
          }
        });
        break;
    }
  });
  function E(T) {
    e = new Promise((L) => {
      o = { wasmBinary: T, onRuntimeInitialized: L }, BASIS(o);
    }).then(() => {
      o.initializeBasis(), o.KTX2File === void 0 && console.warn("THREE.KTX2Loader: Please update Basis Universal transcoder.");
    });
  }
  function f(T) {
    const L = new o.KTX2File(new Uint8Array(T));
    function O() {
      L.close(), L.delete();
    }
    if (!L.isValid())
      throw O(), new Error("THREE.KTX2Loader:	Invalid or unsupported .ktx2 file");
    let X;
    if (L.isUASTC())
      X = g.UASTC;
    else if (L.isETC1S())
      X = g.ETC1S;
    else if (L.isHDR())
      X = g.UASTC_HDR;
    else
      throw new Error("THREE.KTX2Loader: Unknown Basis encoding");
    const P = L.getWidth(), x = L.getHeight(), V = L.getLayers() || 1, z = L.getLevels(), QA = L.getFaces(), CA = L.getHasAlpha(), _ = L.getDFDFlags(), { transcoderFormat: b, engineFormat: Y, engineType: v } = l(X, P, x, CA);
    if (!P || !x || !z)
      throw O(), new Error("THREE.KTX2Loader:	Invalid texture");
    if (!L.startTranscoding())
      throw O(), new Error("THREE.KTX2Loader: .startTranscoding failed");
    const W = [], AA = [];
    for (let M = 0; M < QA; M++) {
      const eA = [];
      for (let H = 0; H < z; H++) {
        const cA = [];
        let fA, EA;
        for (let tA = 0; tA < V; tA++) {
          const J = L.getImageLevelInfo(H, tA, M);
          M === 0 && H === 0 && tA === 0 && (J.origWidth % 4 !== 0 || J.origHeight % 4 !== 0) && console.warn("THREE.KTX2Loader: ETC1S and UASTC textures should use multiple-of-four dimensions."), z > 1 ? (fA = J.origWidth, EA = J.origHeight) : (fA = J.width, EA = J.height);
          let $ = new Uint8Array(L.getImageTranscodedSizeInBytes(H, tA, 0, b));
          const DA = L.transcodeImage($, H, tA, M, b, 0, -1, -1);
          if (v === n.HalfFloatType && ($ = new Uint16Array($.buffer, $.byteOffset, $.byteLength / Uint16Array.BYTES_PER_ELEMENT)), !DA)
            throw O(), new Error("THREE.KTX2Loader: .transcodeImage failed.");
          cA.push($);
        }
        const IA = d(cA);
        eA.push({ data: IA, width: fA, height: EA }), AA.push(IA.buffer);
      }
      W.push({ mipmaps: eA, width: P, height: x, format: Y, type: v });
    }
    return O(), { faces: W, buffers: AA, width: P, height: x, hasAlpha: CA, dfdFlags: _, format: Y, type: v };
  }
  const R = [
    {
      if: "astcSupported",
      basisFormat: [g.UASTC],
      transcoderFormat: [B.ASTC_4x4, B.ASTC_4x4],
      engineFormat: [s.RGBA_ASTC_4x4_Format, s.RGBA_ASTC_4x4_Format],
      engineType: [n.UnsignedByteType],
      priorityETC1S: 1 / 0,
      priorityUASTC: 1,
      needsPowerOfTwo: !1
    },
    {
      if: "bptcSupported",
      basisFormat: [g.ETC1S, g.UASTC],
      transcoderFormat: [B.BC7_M5, B.BC7_M5],
      engineFormat: [s.RGBA_BPTC_Format, s.RGBA_BPTC_Format],
      engineType: [n.UnsignedByteType],
      priorityETC1S: 3,
      priorityUASTC: 2,
      needsPowerOfTwo: !1
    },
    {
      if: "dxtSupported",
      basisFormat: [g.ETC1S, g.UASTC],
      transcoderFormat: [B.BC1, B.BC3],
      engineFormat: [s.RGBA_S3TC_DXT1_Format, s.RGBA_S3TC_DXT5_Format],
      engineType: [n.UnsignedByteType],
      priorityETC1S: 4,
      priorityUASTC: 5,
      needsPowerOfTwo: !1
    },
    {
      if: "etc2Supported",
      basisFormat: [g.ETC1S, g.UASTC],
      transcoderFormat: [B.ETC1, B.ETC2],
      engineFormat: [s.RGB_ETC2_Format, s.RGBA_ETC2_EAC_Format],
      engineType: [n.UnsignedByteType],
      priorityETC1S: 1,
      priorityUASTC: 3,
      needsPowerOfTwo: !1
    },
    {
      if: "etc1Supported",
      basisFormat: [g.ETC1S, g.UASTC],
      transcoderFormat: [B.ETC1],
      engineFormat: [s.RGB_ETC1_Format],
      engineType: [n.UnsignedByteType],
      priorityETC1S: 2,
      priorityUASTC: 4,
      needsPowerOfTwo: !1
    },
    {
      if: "pvrtcSupported",
      basisFormat: [g.ETC1S, g.UASTC],
      transcoderFormat: [B.PVRTC1_4_RGB, B.PVRTC1_4_RGBA],
      engineFormat: [s.RGB_PVRTC_4BPPV1_Format, s.RGBA_PVRTC_4BPPV1_Format],
      engineType: [n.UnsignedByteType],
      priorityETC1S: 5,
      priorityUASTC: 6,
      needsPowerOfTwo: !0
    },
    {
      if: "bptcSupported",
      basisFormat: [g.UASTC_HDR],
      transcoderFormat: [B.BC6H],
      engineFormat: [s.RGB_BPTC_UNSIGNED_Format],
      engineType: [n.HalfFloatType],
      priorityHDR: 1,
      needsPowerOfTwo: !1
    },
    // Uncompressed fallbacks.
    {
      basisFormat: [g.ETC1S, g.UASTC],
      transcoderFormat: [B.RGBA32, B.RGBA32],
      engineFormat: [s.RGBAFormat, s.RGBAFormat],
      engineType: [n.UnsignedByteType, n.UnsignedByteType],
      priorityETC1S: 100,
      priorityUASTC: 100,
      needsPowerOfTwo: !1
    },
    {
      basisFormat: [g.UASTC_HDR],
      transcoderFormat: [B.RGBA_HALF],
      engineFormat: [s.RGBAFormat],
      engineType: [n.HalfFloatType],
      priorityHDR: 100,
      needsPowerOfTwo: !1
    }
  ], m = {
    [g.ETC1S]: R.filter((T) => T.basisFormat.includes(g.ETC1S)).sort((T, L) => T.priorityETC1S - L.priorityETC1S),
    [g.UASTC]: R.filter((T) => T.basisFormat.includes(g.UASTC)).sort((T, L) => T.priorityUASTC - L.priorityUASTC),
    [g.UASTC_HDR]: R.filter((T) => T.basisFormat.includes(g.UASTC_HDR)).sort((T, L) => T.priorityHDR - L.priorityHDR)
  };
  function l(T, L, O, X) {
    const P = m[T];
    for (let x = 0; x < P.length; x++) {
      const V = P[x];
      if (V.if && !r[V.if] || !V.basisFormat.includes(T) || X && V.transcoderFormat.length < 2 || V.needsPowerOfTwo && !(p(L) && p(O))) continue;
      const z = V.transcoderFormat[X ? 1 : 0], QA = V.engineFormat[X ? 1 : 0], CA = V.engineType[0];
      return { transcoderFormat: z, engineFormat: QA, engineType: CA };
    }
    throw new Error("THREE.KTX2Loader: Failed to identify transcoding target.");
  }
  function p(T) {
    return T <= 2 ? !0 : (T & T - 1) === 0 && T !== 0;
  }
  function d(T) {
    if (T.length === 1) return T[0];
    let L = 0;
    for (let P = 0; P < T.length; P++) {
      const x = T[P];
      L += x.byteLength;
    }
    const O = new Uint8Array(L);
    let X = 0;
    for (let P = 0; P < T.length; P++) {
      const x = T[P];
      O.set(x, X), X += x.byteLength;
    }
    return O;
  }
};
const bi = /* @__PURE__ */ new Set([RA, Ne, NA, vA]), Ue = {
  [xt]: RA,
  [Nt]: NA,
  [Mt]: vA,
  [_t]: RA,
  [kt]: NA,
  [Tt]: vA,
  [mt]: RA,
  [Lt]: RA,
  [Gt]: NA,
  [Ut]: NA,
  [Rt]: vA,
  [Ft]: vA,
  [bt]: Ne,
  [Ht]: Ne,
  [$t]: yt,
  [jt]: dt,
  [Je]: ce,
  [eo]: ce,
  [Ao]: ce,
  [Io]: de,
  [oo]: de,
  [to]: de,
  [Yt]: Me,
  [qt]: Me,
  [Jt]: ot,
  [vt]: ot,
  [Kt]: tt,
  [Ot]: tt,
  [Wt]: ii,
  [Pt]: oi,
  [Vt]: ti,
  [Xt]: ei,
  [zt]: _e,
  [Zt]: _e,
  [ro]: ke,
  [so]: ke,
  [no]: et,
  [io]: et
}, XA = {
  [xt]: TA,
  [Nt]: TA,
  [Mt]: TA,
  [_t]: yA,
  [kt]: yA,
  [Tt]: yA,
  [mt]: oA,
  [Lt]: oA,
  [Gt]: oA,
  [Ut]: oA,
  [Rt]: oA,
  [Ft]: oA,
  [bt]: Dt,
  [Ht]: ft,
  [$t]: oA,
  [jt]: oA,
  [Je]: yA,
  [eo]: oA,
  [Ao]: oA,
  [Io]: yA,
  [oo]: oA,
  [to]: oA,
  [Yt]: oA,
  [qt]: oA,
  [Jt]: oA,
  [vt]: oA,
  [Kt]: oA,
  [Ot]: oA,
  [Wt]: oA,
  [Pt]: oA,
  [Vt]: oA,
  [Xt]: oA,
  [zt]: oA,
  [Zt]: oA,
  [ro]: oA,
  [so]: oA,
  [no]: oA,
  [io]: oA
};
async function vi(r) {
  const { vkFormat: e } = r;
  if (Ue[e] === void 0)
    throw new Error("THREE.KTX2Loader: Unsupported vkFormat: " + e);
  XA[e] === void 0 && console.warn('THREE.KTX2Loader: Missing ".type" for vkFormat: ' + e);
  let o;
  r.supercompressionScheme === nt && (Re || (Re = new Promise(async (g) => {
    const E = new Ni();
    await E.init(), g(E);
  })), o = await Re);
  const s = [];
  for (let g = 0; g < r.levels.length; g++) {
    const E = Math.max(1, r.pixelWidth >> g), f = Math.max(1, r.pixelHeight >> g), R = r.pixelDepth ? Math.max(1, r.pixelDepth >> g) : 0, m = r.levels[g];
    let l;
    if (r.supercompressionScheme === Gi)
      l = m.levelData;
    else if (r.supercompressionScheme === nt)
      l = o.decode(m.levelData, m.uncompressedByteLength);
    else
      throw new Error("THREE.KTX2Loader: Unsupported supercompressionScheme.");
    let p;
    XA[e] === TA ? p = new Float32Array(
      l.buffer,
      l.byteOffset,
      l.byteLength / Float32Array.BYTES_PER_ELEMENT
    ) : XA[e] === yA ? p = new Uint16Array(
      l.buffer,
      l.byteOffset,
      l.byteLength / Uint16Array.BYTES_PER_ELEMENT
    ) : XA[e] === Dt || XA[e] === ft ? p = new Uint32Array(
      l.buffer,
      l.byteOffset,
      l.byteLength / Uint32Array.BYTES_PER_ELEMENT
    ) : p = l, s.push({
      data: p,
      width: E,
      height: f,
      depth: R
    });
  }
  const n = r.levelCount === 0 || s.length > 1;
  let B;
  if (bi.has(Ue[e]))
    B = r.pixelDepth === 0 ? new si(s[0].data, r.pixelWidth, r.pixelHeight) : new ni(s[0].data, r.pixelWidth, r.pixelHeight, r.pixelDepth), B.minFilter = n ? ri : it, B.magFilter = it, B.generateMipmaps = r.levelCount === 0;
  else {
    if (r.pixelDepth > 0) throw new Error("THREE.KTX2Loader: Unsupported pixelDepth.");
    B = new ut(s, r.pixelWidth, r.pixelHeight), B.minFilter = n ? wt : KA, B.magFilter = KA;
  }
  return B.mipmaps = s, B.type = XA[e], B.format = Ue[e], B.colorSpace = go(r), B.needsUpdate = !0, Promise.resolve(B);
}
function go(r) {
  const e = r.dataFormatDescriptor[0];
  return e.colorPrimaries === Ti ? e.transferFunction === rt ? oe : MA : e.colorPrimaries === ki ? e.transferFunction === rt ? xi : Hi : e.colorPrimaries === mi ? At : (console.warn(`THREE.KTX2Loader: Unsupported color primaries, "${e.colorPrimaries}"`), At);
}
const ao = pi, Ji = Si;
class le extends Error {
  constructor(e, o, s) {
    super(`Model payload "${e}" is ${o} bytes; the configured limit is ${s} bytes`), this.url = e, this.actualBytes = o, this.limitBytes = s, this.name = "GLTFPayloadLimitError";
  }
}
const at = `https://unpkg.com/three@0.${Ci}.0`;
class ie {
  /**
   * Initialize loader instances and configure decoders/transcoders.
   * @param loadingManager Shared Three.js `LoadingManager`.
   * @param renderer Renderer used to detect KTX2 support.
   * @param options Optional decoder/transcoder paths (fall back to CDN paths matching Three r{REVISION}).
   */
  static init(e, o, s = {}) {
    var n, B;
    this.dracoLoader = new Fi(e).setDecoderPath((n = s.dracoDecoderPath) !== null && n !== void 0 ? n : `${at}/examples/jsm/libs/draco/gltf/`), this.ktx2Loader = new UA(e).setTranscoderPath((B = s.ktx2TranscoderPath) !== null && B !== void 0 ? B : `${at}/examples/jsm/libs/basis/`).detectSupport(o), this.gltfLoader = new Ei(e).setDRACOLoader(this.dracoLoader).setKTX2Loader(this.ktx2Loader);
  }
  /**
   * Load a GLTF by URL, caching the result; optionally register a logical key.
   *
   * @remarks
   * Resolves with the cached `GLTF` instance directly. To retrieve a clone
   * suitable for placing into multiple entities, call {@link GLTFAssetLoader.getGLTF}
   * (or `AssetManager.getGLTF`) by key after the load resolves.
   */
  static loadGLTF(e, o, s = PA) {
    const n = K.resolveUrl(e);
    return o && K.setKeyToUrl(o, n), ne({
      discard: be,
      load: (B, g) => {
        this.gltfLoader.load(
          n,
          B,
          () => {
          },
          // progress callback
          g
        );
      },
      timeoutMs: s,
      url: n
    });
  }
  /**
   * Fetch and parse a glTF without touching the shared URL, promise, or key
   * caches. The glTF/GLB response plus external glTF buffers and images are
   * measured from their actual decoded bytes; `Content-Length` is used only as
   * an early rejection signal.
   */
  static async loadGLTFDetached(e, o = ao) {
    var s;
    const n = await Bt(e, o);
    let B = n.bytes.byteLength, g = n.bytes;
    const E = [];
    try {
      if (!Yi(n.bytes)) {
        const l = Oi(n.bytes);
        if (l != null) {
          const p = Ki(l), d = /* @__PURE__ */ new Map();
          for (const T of p) {
            let L = d.get(T.uri);
            if (L == null) {
              const O = Wi(T.uri, e);
              let X;
              try {
                X = await Bt(O, o - B);
              } catch (x) {
                throw x instanceof le ? new le(e, B + x.actualBytes, o) : x;
              }
              B += X.bytes.byteLength;
              const P = new ArrayBuffer(X.bytes.byteLength);
              new Uint8Array(P).set(X.bytes), L = URL.createObjectURL(new Blob([P], {
                type: (s = X.contentType) !== null && s !== void 0 ? s : "application/octet-stream"
              })), E.push(L), d.set(T.uri, L);
            }
            T.owner.uri = L;
          }
          g = new TextEncoder().encode(JSON.stringify(l));
        }
      }
      const f = e.slice(0, Math.max(0, e.lastIndexOf("/") + 1)), R = new ArrayBuffer(g.byteLength);
      return new Uint8Array(R).set(g), { gltf: await this.gltfLoader.parseAsync(R, f), payloadBytes: B };
    } finally {
      E.forEach((f) => URL.revokeObjectURL(f));
    }
  }
  /** Clone a glTF object tree while retaining its renderer resources by reference. */
  static cloneGLTF(e) {
    return {
      ...e,
      scene: st(e.scene),
      scenes: e.scenes.map((o) => st(o))
    };
  }
  /**
   * Get a cached GLTF by logical key.
   *
   * @remarks
   * By default, returns a fresh clone: `scene` and `scenes` are new
   * `Object3D` trees (correctly handling `SkinnedMesh`/`Bone` hierarchies),
   * while geometries, materials, `animations`, `cameras`, `asset`,
   * `parser`, and `userData` remain shared by reference. This makes it
   * safe to call `getGLTF(key)` once per entity — adding the result's
   * `scene` to multiple parents will not silently re-parent a single
   * shared object.
   *
   * Pass `{ shared: true }` to return the cached `GLTF` directly (the
   * pre-0.4.x behavior), e.g. for framework code that intentionally
   * mutates the canonical instance.
   */
  static getGLTF(e, o = {}) {
    const s = K.getAssetByKey(e);
    return s ? o.shared ? s : this.cloneGLTF(s) : null;
  }
}
function be(r) {
  const e = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set(), B = (E) => {
    if (!(E == null || typeof E != "object" || n.has(E))) {
      if (n.add(E), E.isTexture === !0) {
        s.add(E);
        return;
      }
      if (Array.isArray(E)) {
        E.forEach(B);
        return;
      }
      for (const f of Object.values(E))
        B(f);
    }
  }, g = /* @__PURE__ */ new Set([r.scene, ...r.scenes]);
  for (const E of g)
    E.traverse((f) => {
      var R, m;
      const l = f;
      ((R = l.geometry) === null || R === void 0 ? void 0 : R.dispose) != null && e.add(l.geometry);
      const p = Array.isArray(l.material) ? l.material : l.material != null ? [l.material] : [];
      for (const d of p)
        o.add(d), B(d);
      B((m = l.skeleton) === null || m === void 0 ? void 0 : m.boneTexture);
    });
  s.forEach((E) => E.dispose()), o.forEach((E) => E.dispose()), e.forEach((E) => E.dispose());
}
function qi(r) {
  if (r == null || !/^\d+$/.test(r))
    return null;
  const e = Number(r);
  return Number.isSafeInteger(e) ? e : null;
}
async function Bt(r, e) {
  var o;
  const s = await fetch(r);
  if (!s.ok)
    throw new Error(`Failed to load model resource "${r}": ${s.status} ${s.statusText}`);
  const n = qi(s.headers.get("content-length"));
  if (n != null && n > e)
    throw await ((o = s.body) === null || o === void 0 ? void 0 : o.cancel().catch(() => {
    })), new le(r, n, e);
  return {
    bytes: await Xi(s, r, e),
    contentType: s.headers.get("content-type")
  };
}
function Yi(r) {
  return r.byteLength >= 4 && r[0] === 103 && r[1] === 108 && r[2] === 84 && r[3] === 70;
}
function Oi(r) {
  try {
    const e = JSON.parse(new TextDecoder().decode(r));
    return e != null && typeof e == "object" ? e : null;
  } catch {
    return null;
  }
}
function Ki(r) {
  const e = [];
  for (const o of ["buffers", "images"]) {
    const s = r[o];
    if (Array.isArray(s))
      for (const n of s)
        n != null && typeof n == "object" && typeof n.uri == "string" && !Pi(n.uri) && e.push({
          owner: n,
          uri: n.uri
        });
  }
  return e;
}
function Pi(r) {
  return r.startsWith("data:") || r.startsWith("blob:");
}
function Wi(r, e) {
  const o = globalThis.location == null ? new URL(e, "https://iwsdk.local/") : new URL(e, globalThis.location.href);
  return new URL(r, o).href;
}
async function Xi(r, e, o) {
  if (r.body == null) {
    const f = new Uint8Array(await r.arrayBuffer());
    return Ct(e, f.byteLength, o), f;
  }
  const s = r.body.getReader(), n = [];
  let B = 0;
  try {
    for (; ; ) {
      const { done: f, value: R } = await s.read();
      if (f)
        break;
      R != null && (B += R.byteLength, Ct(e, B, o), n.push(R));
    }
  } catch (f) {
    throw await s.cancel().catch(() => {
    }), f;
  } finally {
    s.releaseLock();
  }
  const g = new Uint8Array(B);
  let E = 0;
  for (const f of n)
    g.set(f, E), E += f.byteLength;
  return g;
}
function Ct(r, e, o) {
  if (e > o)
    throw new le(r, e, o);
}
var GA = Uint8Array, ZA = Uint16Array, Vi = Int32Array, Bo = new GA([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]), Co = new GA([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]), Zi = new GA([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]), Eo = function(r, e) {
  for (var o = new ZA(31), s = 0; s < 31; ++s)
    o[s] = e += 1 << r[s - 1];
  for (var n = new Vi(o[30]), s = 1; s < 30; ++s)
    for (var B = o[s]; B < o[s + 1]; ++B)
      n[B] = B - o[s] << 5 | s;
  return { b: o, r: n };
}, Qo = Eo(Bo, 2), co = Qo.b, zi = Qo.r;
co[28] = 258, zi[258] = 28;
var ji = Eo(Co, 0), $i = ji.b, ve = new ZA(32768);
for (var aA = 0; aA < 32768; ++aA) {
  var OA = (aA & 43690) >> 1 | (aA & 21845) << 1;
  OA = (OA & 52428) >> 2 | (OA & 13107) << 2, OA = (OA & 61680) >> 4 | (OA & 3855) << 4, ve[aA] = ((OA & 65280) >> 8 | (OA & 255) << 8) >> 1;
}
var se = (function(r, e, o) {
  for (var s = r.length, n = 0, B = new ZA(e); n < s; ++n)
    r[n] && ++B[r[n] - 1];
  var g = new ZA(e);
  for (n = 1; n < e; ++n)
    g[n] = g[n - 1] + B[n - 1] << 1;
  var E;
  if (o) {
    E = new ZA(1 << e);
    var f = 15 - e;
    for (n = 0; n < s; ++n)
      if (r[n])
        for (var R = n << 4 | r[n], m = e - r[n], l = g[r[n] - 1]++ << m, p = l | (1 << m) - 1; l <= p; ++l)
          E[ve[l] >> f] = R;
  } else
    for (E = new ZA(s), n = 0; n < s; ++n)
      r[n] && (E[n] = ve[g[r[n] - 1]++] >> 15 - r[n]);
  return E;
}), re = new GA(288);
for (var aA = 0; aA < 144; ++aA)
  re[aA] = 8;
for (var aA = 144; aA < 256; ++aA)
  re[aA] = 9;
for (var aA = 256; aA < 280; ++aA)
  re[aA] = 7;
for (var aA = 280; aA < 288; ++aA)
  re[aA] = 8;
var lo = new GA(32);
for (var aA = 0; aA < 32; ++aA)
  lo[aA] = 5;
var As = /* @__PURE__ */ se(re, 9, 1), es = /* @__PURE__ */ se(lo, 5, 1), Ge = function(r) {
  for (var e = r[0], o = 1; o < r.length; ++o)
    r[o] > e && (e = r[o]);
  return e;
}, LA = function(r, e, o) {
  var s = e / 8 | 0;
  return (r[s] | r[s + 1] << 8) >> (e & 7) & o;
}, Le = function(r, e) {
  var o = e / 8 | 0;
  return (r[o] | r[o + 1] << 8 | r[o + 2] << 16) >> (e & 7);
}, ts = function(r) {
  return (r + 7) / 8 | 0;
}, os = function(r, e, o) {
  return (o == null || o > r.length) && (o = r.length), new GA(r.subarray(e, o));
}, is = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
], mA = function(r, e, o) {
  var s = new Error(e || is[r]);
  if (s.code = r, Error.captureStackTrace && Error.captureStackTrace(s, mA), !o)
    throw s;
  return s;
}, ss = function(r, e, o, s) {
  var n = r.length, B = 0;
  if (!n || e.f && !e.l)
    return o || new GA(0);
  var g = !o, E = g || e.i != 2, f = e.i;
  g && (o = new GA(n * 3));
  var R = function(zA) {
    var ge = o.length;
    if (zA > ge) {
      var jA = new GA(Math.max(ge * 2, zA));
      jA.set(o), o = jA;
    }
  }, m = e.f || 0, l = e.p || 0, p = e.b || 0, d = e.l, T = e.d, L = e.m, O = e.n, X = n * 8;
  do {
    if (!d) {
      m = LA(r, l, 1);
      var P = LA(r, l + 1, 3);
      if (l += 3, P)
        if (P == 1)
          d = As, T = es, L = 9, O = 5;
        else if (P == 2) {
          var QA = LA(r, l, 31) + 257, CA = LA(r, l + 10, 15) + 4, _ = QA + LA(r, l + 5, 31) + 1;
          l += 14;
          for (var b = new GA(_), Y = new GA(19), v = 0; v < CA; ++v)
            Y[Zi[v]] = LA(r, l + v * 3, 7);
          l += CA * 3;
          for (var W = Ge(Y), AA = (1 << W) - 1, M = se(Y, W, 1), v = 0; v < _; ) {
            var eA = M[LA(r, l, AA)];
            l += eA & 15;
            var x = eA >> 4;
            if (x < 16)
              b[v++] = x;
            else {
              var H = 0, cA = 0;
              for (x == 16 ? (cA = 3 + LA(r, l, 3), l += 2, H = b[v - 1]) : x == 17 ? (cA = 3 + LA(r, l, 7), l += 3) : x == 18 && (cA = 11 + LA(r, l, 127), l += 7); cA--; )
                b[v++] = H;
            }
          }
          var fA = b.subarray(0, QA), EA = b.subarray(QA);
          L = Ge(fA), O = Ge(EA), d = se(fA, L, 1), T = se(EA, O, 1);
        } else
          mA(1);
      else {
        var x = ts(l) + 4, V = r[x - 4] | r[x - 3] << 8, z = x + V;
        if (z > n) {
          f && mA(0);
          break;
        }
        E && R(p + V), o.set(r.subarray(x, z), p), e.b = p += V, e.p = l = z * 8, e.f = m;
        continue;
      }
      if (l > X) {
        f && mA(0);
        break;
      }
    }
    E && R(p + 131072);
    for (var IA = (1 << L) - 1, tA = (1 << O) - 1, J = l; ; J = l) {
      var H = d[Le(r, l) & IA], $ = H >> 4;
      if (l += H & 15, l > X) {
        f && mA(0);
        break;
      }
      if (H || mA(2), $ < 256)
        o[p++] = $;
      else if ($ == 256) {
        J = l, d = null;
        break;
      } else {
        var DA = $ - 254;
        if ($ > 264) {
          var v = $ - 257, JA = Bo[v];
          DA = LA(r, l, (1 << JA) - 1) + co[v], l += JA;
        }
        var iA = T[Le(r, l) & tA], kA = iA >> 4;
        iA || mA(3), l += iA & 15;
        var EA = $i[kA];
        if (kA > 3) {
          var JA = Co[kA];
          EA += Le(r, l) & (1 << JA) - 1, l += JA;
        }
        if (l > X) {
          f && mA(0);
          break;
        }
        E && R(p + 131072);
        var xA = p + DA;
        if (p < EA) {
          var Ie = B - EA, he = Math.min(EA, xA);
          for (Ie + p < 0 && mA(3); p < he; ++p)
            o[p] = s[Ie + p];
        }
        for (; p < xA; ++p)
          o[p] = o[p - EA];
      }
    }
    e.l = d, e.p = J, e.b = p, e.f = m, d && (m = 1, e.m = L, e.d = T, e.n = O);
  } while (!m);
  return p != o.length && g ? os(o, 0, p) : o.subarray(0, p);
}, ns = /* @__PURE__ */ new GA(0), rs = function(r, e) {
  return ((r[0] & 15) != 8 || r[0] >> 4 > 7 || (r[0] << 8 | r[1]) % 31) && mA(6, "invalid zlib data"), (r[1] >> 5 & 1) == 1 && mA(6, "invalid zlib data: " + (r[1] & 32 ? "need" : "unexpected") + " dictionary"), (r[1] >> 3 & 4) + 2;
};
function Ce(r, e) {
  return ss(r.subarray(rs(r), -4), { i: 2 }, e, e);
}
var Is = typeof TextDecoder < "u" && /* @__PURE__ */ new TextDecoder(), gs = 0;
try {
  Is.decode(ns, { stream: !0 }), gs = 1;
} catch {
}
class as extends pt {
  /**
   * Constructs a new EXR loader.
   *
   * @param {LoadingManager} [manager] - The loading manager.
   */
  constructor(e) {
    super(e), this.type = yA, this.outputFormat = RA;
  }
  /**
   * Parses the given EXR texture data.
   *
   * @param {ArrayBuffer} buffer - The raw texture data.
   * @return {DataTextureLoader~TexData} An object representing the parsed texture data.
   */
  parse(e) {
    const b = Math.pow(2.7182818, 2.2);
    function Y(A, t) {
      let i = 0;
      for (let C = 0; C < 65536; ++C)
        (C == 0 || A[C >> 3] & 1 << (C & 7)) && (t[i++] = C);
      const a = i - 1;
      for (; i < 65536; ) t[i++] = 0;
      return a;
    }
    function v(A) {
      for (let t = 0; t < 16384; t++)
        A[t] = {}, A[t].len = 0, A[t].lit = 0, A[t].p = null;
    }
    const W = { l: 0, c: 0, lc: 0 };
    function AA(A, t, i, a, C) {
      for (; i < A; )
        t = t << 8 | Ve(a, C), i += 8;
      i -= A, W.l = t >> i & (1 << A) - 1, W.c = t, W.lc = i;
    }
    const M = new Array(59);
    function eA(A) {
      for (let i = 0; i <= 58; ++i) M[i] = 0;
      for (let i = 0; i < 65537; ++i) M[A[i]] += 1;
      let t = 0;
      for (let i = 58; i > 0; --i) {
        const a = t + M[i] >> 1;
        M[i] = t, t = a;
      }
      for (let i = 0; i < 65537; ++i) {
        const a = A[i];
        a > 0 && (A[i] = a | M[a]++ << 6);
      }
    }
    function H(A, t, i, a, C, u) {
      const I = t;
      let w = 0, c = 0;
      for (; a <= C; a++) {
        if (I.value - t.value > i) return !1;
        AA(6, w, c, A, I);
        const Q = W.l;
        if (w = W.c, c = W.lc, u[a] = Q, Q == 63) {
          if (I.value - t.value > i)
            throw new Error("Something wrong with hufUnpackEncTable");
          AA(8, w, c, A, I);
          let h = W.l + 6;
          if (w = W.c, c = W.lc, a + h > C + 1)
            throw new Error("Something wrong with hufUnpackEncTable");
          for (; h--; ) u[a++] = 0;
          a--;
        } else if (Q >= 59) {
          let h = Q - 59 + 2;
          if (a + h > C + 1)
            throw new Error("Something wrong with hufUnpackEncTable");
          for (; h--; ) u[a++] = 0;
          a--;
        }
      }
      eA(u);
    }
    function cA(A) {
      return A & 63;
    }
    function fA(A) {
      return A >> 6;
    }
    function EA(A, t, i, a) {
      for (; t <= i; t++) {
        const C = fA(A[t]), u = cA(A[t]);
        if (C >> u)
          throw new Error("Invalid table entry");
        if (u > 14) {
          const I = a[C >> u - 14];
          if (I.len)
            throw new Error("Invalid table entry");
          if (I.lit++, I.p) {
            const w = I.p;
            I.p = new Array(I.lit);
            for (let c = 0; c < I.lit - 1; ++c)
              I.p[c] = w[c];
          } else
            I.p = new Array(1);
          I.p[I.lit - 1] = t;
        } else if (u) {
          let I = 0;
          for (let w = 1 << 14 - u; w > 0; w--) {
            const c = a[(C << 14 - u) + I];
            if (c.len || c.p)
              throw new Error("Invalid table entry");
            c.len = u, c.lit = t, I++;
          }
        }
      }
      return !0;
    }
    const IA = { c: 0, lc: 0 };
    function tA(A, t, i, a) {
      A = A << 8 | Ve(i, a), t += 8, IA.c = A, IA.lc = t;
    }
    const J = { c: 0, lc: 0 };
    function $(A, t, i, a, C, u, I, w, c) {
      if (A == t) {
        a < 8 && (tA(i, a, C, u), i = IA.c, a = IA.lc), a -= 8;
        let Q = i >> a;
        if (Q = new Uint8Array([Q])[0], w.value + Q > c)
          return !1;
        const h = I[w.value - 1];
        for (; Q-- > 0; )
          I[w.value++] = h;
      } else if (w.value < c)
        I[w.value++] = A;
      else
        return !1;
      J.c = i, J.lc = a;
    }
    function DA(A) {
      return A & 65535;
    }
    function JA(A) {
      const t = DA(A);
      return t > 32767 ? t - 65536 : t;
    }
    const iA = { a: 0, b: 0 };
    function kA(A, t) {
      const i = JA(A), C = JA(t), u = i + (C & 1) + (C >> 1), I = u, w = u - C;
      iA.a = I, iA.b = w;
    }
    function xA(A, t) {
      const i = DA(A), a = DA(t), C = i - (a >> 1) & 65535, u = a + C - 32768 & 65535;
      iA.a = u, iA.b = C;
    }
    function Ie(A, t, i, a, C, u, I) {
      const w = I < 16384, c = i > C ? C : i;
      let Q = 1, h, D;
      for (; Q <= c; ) Q <<= 1;
      for (Q >>= 1, h = Q, Q >>= 1; Q >= 1; ) {
        D = 0;
        const y = D + u * (C - h), F = u * Q, k = u * h, S = a * Q, G = a * h;
        let N, j, nA, lA;
        for (; D <= y; D += k) {
          let sA = D;
          const q = D + a * (i - h);
          for (; sA <= q; sA += G) {
            const BA = sA + S, hA = sA + F, gA = hA + S;
            w ? (kA(A[sA + t], A[hA + t]), N = iA.a, nA = iA.b, kA(A[BA + t], A[gA + t]), j = iA.a, lA = iA.b, kA(N, j), A[sA + t] = iA.a, A[BA + t] = iA.b, kA(nA, lA), A[hA + t] = iA.a, A[gA + t] = iA.b) : (xA(A[sA + t], A[hA + t]), N = iA.a, nA = iA.b, xA(A[BA + t], A[gA + t]), j = iA.a, lA = iA.b, xA(N, j), A[sA + t] = iA.a, A[BA + t] = iA.b, xA(nA, lA), A[hA + t] = iA.a, A[gA + t] = iA.b);
          }
          if (i & Q) {
            const BA = sA + F;
            w ? kA(A[sA + t], A[BA + t]) : xA(A[sA + t], A[BA + t]), N = iA.a, A[BA + t] = iA.b, A[sA + t] = N;
          }
        }
        if (C & Q) {
          let sA = D;
          const q = D + a * (i - h);
          for (; sA <= q; sA += G) {
            const BA = sA + S;
            w ? kA(A[sA + t], A[BA + t]) : xA(A[sA + t], A[BA + t]), N = iA.a, A[BA + t] = iA.b, A[sA + t] = N;
          }
        }
        h = Q, Q >>= 1;
      }
      return D;
    }
    function he(A, t, i, a, C, u, I, w, c) {
      let Q = 0, h = 0;
      const D = I, y = Math.trunc(a.value + (C + 7) / 8);
      for (; a.value < y; )
        for (tA(Q, h, i, a), Q = IA.c, h = IA.lc; h >= 14; ) {
          const k = Q >> h - 14 & 16383, S = t[k];
          if (S.len)
            h -= S.len, $(S.lit, u, Q, h, i, a, w, c, D), Q = J.c, h = J.lc;
          else {
            if (!S.p)
              throw new Error("hufDecode issues");
            let G;
            for (G = 0; G < S.lit; G++) {
              const N = cA(A[S.p[G]]);
              for (; h < N && a.value < y; )
                tA(Q, h, i, a), Q = IA.c, h = IA.lc;
              if (h >= N && fA(A[S.p[G]]) == (Q >> h - N & (1 << N) - 1)) {
                h -= N, $(S.p[G], u, Q, h, i, a, w, c, D), Q = J.c, h = J.lc;
                break;
              }
            }
            if (G == S.lit)
              throw new Error("hufDecode issues");
          }
        }
      const F = 8 - C & 7;
      for (Q >>= F, h -= F; h > 0; ) {
        const k = t[Q << 14 - h & 16383];
        if (k.len)
          h -= k.len, $(k.lit, u, Q, h, i, a, w, c, D), Q = J.c, h = J.lc;
        else
          throw new Error("hufDecode issues");
      }
      return !0;
    }
    function zA(A, t, i, a, C, u) {
      const I = { value: 0 }, w = i.value, c = FA(t, i), Q = FA(t, i);
      i.value += 4;
      const h = FA(t, i);
      if (i.value += 4, c < 0 || c >= 65537 || Q < 0 || Q >= 65537)
        throw new Error("Something wrong with HUF_ENCSIZE");
      const D = new Array(65537), y = new Array(16384);
      v(y);
      const F = a - (i.value - w);
      if (H(A, i, F, c, Q, D), h > 8 * (a - (i.value - w)))
        throw new Error("Something wrong with hufUncompress");
      EA(D, c, Q, y), he(D, y, A, i, h, Q, u, C, I);
    }
    function ge(A, t, i) {
      for (let a = 0; a < i; ++a)
        t[a] = A[t[a]];
    }
    function jA(A) {
      for (let t = 1; t < A.length; t++) {
        const i = A[t - 1] + A[t] - 128;
        A[t] = i;
      }
    }
    function qe(A, t) {
      let i = 0, a = Math.floor((A.length + 1) / 2), C = 0;
      const u = A.length - 1;
      for (; !(C > u || (t[C++] = A[i++], C > u)); )
        t[C++] = A[a++];
    }
    function Ye(A) {
      let t = A.byteLength;
      const i = new Array();
      let a = 0;
      const C = new DataView(A);
      for (; t > 0; ) {
        const u = C.getInt8(a++);
        if (u < 0) {
          const I = -u;
          t -= I + 1;
          for (let w = 0; w < I; w++)
            i.push(C.getUint8(a++));
        } else {
          const I = u;
          t -= 2;
          const w = C.getUint8(a++);
          for (let c = 0; c < I + 1; c++)
            i.push(w);
        }
      }
      return i;
    }
    function uo(A, t, i, a, C, u) {
      let I = new DataView(u.buffer);
      const w = i[A.idx[0]].width, c = i[A.idx[0]].height, Q = 3, h = Math.floor(w / 8), D = Math.ceil(w / 8), y = Math.ceil(c / 8), F = w - (D - 1) * 8, k = c - (y - 1) * 8, S = { value: 0 }, G = new Array(Q), N = new Array(Q), j = new Array(Q), nA = new Array(Q), lA = new Array(Q);
      for (let q = 0; q < Q; ++q)
        lA[q] = t[A.idx[q]], G[q] = q < 1 ? 0 : G[q - 1] + D * y, N[q] = new Float32Array(64), j[q] = new Uint16Array(64), nA[q] = new Uint16Array(D * 64);
      for (let q = 0; q < y; ++q) {
        let BA = 8;
        q == y - 1 && (BA = k);
        let hA = 8;
        for (let Z = 0; Z < D; ++Z) {
          Z == D - 1 && (hA = F);
          for (let rA = 0; rA < Q; ++rA)
            j[rA].fill(0), j[rA][0] = C[G[rA]++], Oe(S, a, j[rA]), Ke(j[rA], N[rA]), Pe(N[rA]);
          yo(N);
          for (let rA = 0; rA < Q; ++rA)
            We(N[rA], nA[rA], Z * 64);
        }
        let gA = 0;
        for (let Z = 0; Z < Q; ++Z) {
          const rA = i[A.idx[Z]].type;
          for (let HA = 8 * q; HA < 8 * q + BA; ++HA) {
            gA = lA[Z][HA];
            for (let Ae = 0; Ae < h; ++Ae) {
              const _A = Ae * 64 + (HA & 7) * 8;
              I.setUint16(gA + 0 * rA, nA[Z][_A + 0], !0), I.setUint16(gA + 2 * rA, nA[Z][_A + 1], !0), I.setUint16(gA + 4 * rA, nA[Z][_A + 2], !0), I.setUint16(gA + 6 * rA, nA[Z][_A + 3], !0), I.setUint16(gA + 8 * rA, nA[Z][_A + 4], !0), I.setUint16(gA + 10 * rA, nA[Z][_A + 5], !0), I.setUint16(gA + 12 * rA, nA[Z][_A + 6], !0), I.setUint16(gA + 14 * rA, nA[Z][_A + 7], !0), gA += 16 * rA;
            }
          }
          if (h != D)
            for (let HA = 8 * q; HA < 8 * q + BA; ++HA) {
              const Ae = lA[Z][HA] + 8 * h * 2 * rA, _A = h * 64 + (HA & 7) * 8;
              for (let Be = 0; Be < hA; ++Be)
                I.setUint16(Ae + Be * 2 * rA, nA[Z][_A + Be], !0);
            }
        }
      }
      const sA = new Uint16Array(w);
      I = new DataView(u.buffer);
      for (let q = 0; q < Q; ++q) {
        i[A.idx[q]].decoded = !0;
        const BA = i[A.idx[q]].type;
        if (i[q].type == 2)
          for (let hA = 0; hA < c; ++hA) {
            const gA = lA[q][hA];
            for (let Z = 0; Z < w; ++Z)
              sA[Z] = I.getUint16(gA + Z * 2 * BA, !0);
            for (let Z = 0; Z < w; ++Z)
              I.setFloat32(gA + Z * 2 * BA, U(sA[Z]), !0);
          }
      }
    }
    function wo(A, t, i, a, C, u) {
      const I = new DataView(u.buffer), w = i[A], c = w.width, Q = w.height, h = Math.ceil(c / 8), D = Math.ceil(Q / 8), y = Math.floor(c / 8), F = c - (h - 1) * 8, k = Q - (D - 1) * 8, S = { value: 0 };
      let G = 0;
      const N = new Float32Array(64), j = new Uint16Array(64), nA = new Uint16Array(h * 64);
      for (let lA = 0; lA < D; ++lA) {
        let sA = 8;
        lA == D - 1 && (sA = k);
        for (let q = 0; q < h; ++q)
          j.fill(0), j[0] = C[G++], Oe(S, a, j), Ke(j, N), Pe(N), We(N, nA, q * 64);
        for (let q = 8 * lA; q < 8 * lA + sA; ++q) {
          let BA = t[A][q];
          for (let hA = 0; hA < y; ++hA) {
            const gA = hA * 64 + (q & 7) * 8;
            for (let Z = 0; Z < 8; ++Z)
              I.setUint16(BA + Z * 2 * w.type, nA[gA + Z], !0);
            BA += 16 * w.type;
          }
          if (h != y) {
            const hA = y * 64 + (q & 7) * 8;
            for (let gA = 0; gA < F; ++gA)
              I.setUint16(BA + gA * 2 * w.type, nA[hA + gA], !0);
          }
        }
      }
      w.decoded = !0;
    }
    function Oe(A, t, i) {
      let a, C = 1;
      for (; C < 64; )
        a = t[A.value], a == 65280 ? C = 64 : a >> 8 == 255 ? C += a & 255 : (i[C] = a, C++), A.value++;
    }
    function Ke(A, t) {
      t[0] = U(A[0]), t[1] = U(A[1]), t[2] = U(A[5]), t[3] = U(A[6]), t[4] = U(A[14]), t[5] = U(A[15]), t[6] = U(A[27]), t[7] = U(A[28]), t[8] = U(A[2]), t[9] = U(A[4]), t[10] = U(A[7]), t[11] = U(A[13]), t[12] = U(A[16]), t[13] = U(A[26]), t[14] = U(A[29]), t[15] = U(A[42]), t[16] = U(A[3]), t[17] = U(A[8]), t[18] = U(A[12]), t[19] = U(A[17]), t[20] = U(A[25]), t[21] = U(A[30]), t[22] = U(A[41]), t[23] = U(A[43]), t[24] = U(A[9]), t[25] = U(A[11]), t[26] = U(A[18]), t[27] = U(A[24]), t[28] = U(A[31]), t[29] = U(A[40]), t[30] = U(A[44]), t[31] = U(A[53]), t[32] = U(A[10]), t[33] = U(A[19]), t[34] = U(A[23]), t[35] = U(A[32]), t[36] = U(A[39]), t[37] = U(A[45]), t[38] = U(A[52]), t[39] = U(A[54]), t[40] = U(A[20]), t[41] = U(A[22]), t[42] = U(A[33]), t[43] = U(A[38]), t[44] = U(A[46]), t[45] = U(A[51]), t[46] = U(A[55]), t[47] = U(A[60]), t[48] = U(A[21]), t[49] = U(A[34]), t[50] = U(A[37]), t[51] = U(A[47]), t[52] = U(A[50]), t[53] = U(A[56]), t[54] = U(A[59]), t[55] = U(A[61]), t[56] = U(A[35]), t[57] = U(A[36]), t[58] = U(A[48]), t[59] = U(A[49]), t[60] = U(A[57]), t[61] = U(A[58]), t[62] = U(A[62]), t[63] = U(A[63]);
    }
    function Pe(A) {
      const t = 0.5 * Math.cos(0.7853975), i = 0.5 * Math.cos(3.14159 / 16), a = 0.5 * Math.cos(3.14159 / 8), C = 0.5 * Math.cos(3 * 3.14159 / 16), u = 0.5 * Math.cos(5 * 3.14159 / 16), I = 0.5 * Math.cos(3 * 3.14159 / 8), w = 0.5 * Math.cos(7 * 3.14159 / 16), c = new Array(4), Q = new Array(4), h = new Array(4), D = new Array(4);
      for (let y = 0; y < 8; ++y) {
        const F = y * 8;
        c[0] = a * A[F + 2], c[1] = I * A[F + 2], c[2] = a * A[F + 6], c[3] = I * A[F + 6], Q[0] = i * A[F + 1] + C * A[F + 3] + u * A[F + 5] + w * A[F + 7], Q[1] = C * A[F + 1] - w * A[F + 3] - i * A[F + 5] - u * A[F + 7], Q[2] = u * A[F + 1] - i * A[F + 3] + w * A[F + 5] + C * A[F + 7], Q[3] = w * A[F + 1] - u * A[F + 3] + C * A[F + 5] - i * A[F + 7], h[0] = t * (A[F + 0] + A[F + 4]), h[3] = t * (A[F + 0] - A[F + 4]), h[1] = c[0] + c[3], h[2] = c[1] - c[2], D[0] = h[0] + h[1], D[1] = h[3] + h[2], D[2] = h[3] - h[2], D[3] = h[0] - h[1], A[F + 0] = D[0] + Q[0], A[F + 1] = D[1] + Q[1], A[F + 2] = D[2] + Q[2], A[F + 3] = D[3] + Q[3], A[F + 4] = D[3] - Q[3], A[F + 5] = D[2] - Q[2], A[F + 6] = D[1] - Q[1], A[F + 7] = D[0] - Q[0];
      }
      for (let y = 0; y < 8; ++y)
        c[0] = a * A[16 + y], c[1] = I * A[16 + y], c[2] = a * A[48 + y], c[3] = I * A[48 + y], Q[0] = i * A[8 + y] + C * A[24 + y] + u * A[40 + y] + w * A[56 + y], Q[1] = C * A[8 + y] - w * A[24 + y] - i * A[40 + y] - u * A[56 + y], Q[2] = u * A[8 + y] - i * A[24 + y] + w * A[40 + y] + C * A[56 + y], Q[3] = w * A[8 + y] - u * A[24 + y] + C * A[40 + y] - i * A[56 + y], h[0] = t * (A[y] + A[32 + y]), h[3] = t * (A[y] - A[32 + y]), h[1] = c[0] + c[3], h[2] = c[1] - c[2], D[0] = h[0] + h[1], D[1] = h[3] + h[2], D[2] = h[3] - h[2], D[3] = h[0] - h[1], A[0 + y] = D[0] + Q[0], A[8 + y] = D[1] + Q[1], A[16 + y] = D[2] + Q[2], A[24 + y] = D[3] + Q[3], A[32 + y] = D[3] - Q[3], A[40 + y] = D[2] - Q[2], A[48 + y] = D[1] - Q[1], A[56 + y] = D[0] - Q[0];
    }
    function yo(A) {
      for (let t = 0; t < 64; ++t) {
        const i = A[0][t], a = A[1][t], C = A[2][t];
        A[0][t] = i + 1.5747 * C, A[1][t] = i - 0.1873 * a - 0.4682 * C, A[2][t] = i + 1.8556 * a;
      }
    }
    function We(A, t, i) {
      for (let a = 0; a < 64; ++a)
        t[i + a] = VA.toHalfFloat(fo(A[a]));
    }
    function fo(A) {
      return A <= 1 ? Math.sign(A) * Math.pow(Math.abs(A), 2.2) : Math.sign(A) * Math.pow(b, Math.abs(A) - 1);
    }
    function ue(A) {
      return new DataView(A.array.buffer, A.offset.value, A.size);
    }
    function Do(A) {
      const t = A.viewer.buffer.slice(A.offset.value, A.offset.value + A.size), i = new Uint8Array(Ye(t)), a = new Uint8Array(i.length);
      return jA(i), qe(i, a), new DataView(a.buffer);
    }
    function we(A) {
      const t = A.array.slice(A.offset.value, A.offset.value + A.size), i = Ce(t), a = new Uint8Array(i.length);
      return jA(i), qe(i, a), new DataView(a.buffer);
    }
    function po(A) {
      const t = A.viewer, i = { value: A.offset.value }, a = new Uint16Array(A.columns * A.lines * (A.inputChannels.length * A.type)), C = new Uint8Array(8192);
      let u = 0;
      const I = new Array(A.inputChannels.length);
      for (let k = 0, S = A.inputChannels.length; k < S; k++)
        I[k] = {}, I[k].start = u, I[k].end = I[k].start, I[k].nx = A.columns, I[k].ny = A.lines, I[k].size = A.type, u += I[k].nx * I[k].ny * I[k].size;
      const w = $A(t, i), c = $A(t, i);
      if (c >= 8192)
        throw new Error("Something is wrong with PIZ_COMPRESSION BITMAP_SIZE");
      if (w <= c)
        for (let k = 0; k < c - w + 1; k++)
          C[k + w] = qA(t, i);
      const Q = new Uint16Array(65536), h = Y(C, Q), D = FA(t, i);
      zA(A.array, t, i, D, a, u);
      for (let k = 0; k < A.inputChannels.length; ++k) {
        const S = I[k];
        for (let G = 0; G < I[k].size; ++G)
          Ie(
            a,
            S.start + G,
            S.nx,
            S.size,
            S.ny,
            S.nx * S.size,
            h
          );
      }
      ge(Q, a, u);
      let y = 0;
      const F = new Uint8Array(a.buffer.byteLength);
      for (let k = 0; k < A.lines; k++)
        for (let S = 0; S < A.inputChannels.length; S++) {
          const G = I[S], N = G.nx * G.size, j = new Uint8Array(a.buffer, G.end * 2, N * 2);
          F.set(j, y), y += N * 2, G.end += N;
        }
      return new DataView(F.buffer);
    }
    function So(A) {
      const t = A.array.slice(A.offset.value, A.offset.value + A.size), i = Ce(t), a = A.inputChannels.length * A.lines * A.columns * A.totalBytes, C = new ArrayBuffer(a), u = new DataView(C);
      let I = 0, w = 0;
      const c = new Array(4);
      for (let Q = 0; Q < A.lines; Q++)
        for (let h = 0; h < A.inputChannels.length; h++) {
          let D = 0;
          switch (A.inputChannels[h].pixelType) {
            case 1:
              c[0] = I, c[1] = c[0] + A.columns, I = c[1] + A.columns;
              for (let F = 0; F < A.columns; ++F) {
                const k = i[c[0]++] << 8 | i[c[1]++];
                D += k, u.setUint16(w, D, !0), w += 2;
              }
              break;
            case 2:
              c[0] = I, c[1] = c[0] + A.columns, c[2] = c[1] + A.columns, I = c[2] + A.columns;
              for (let F = 0; F < A.columns; ++F) {
                const k = i[c[0]++] << 24 | i[c[1]++] << 16 | i[c[2]++] << 8;
                D += k, u.setUint32(w, D, !0), w += 4;
              }
              break;
          }
        }
      return u;
    }
    function Xe(A) {
      const t = A.viewer, i = { value: A.offset.value }, a = new Uint8Array(A.columns * A.lines * (A.inputChannels.length * A.type * 2)), C = {
        version: pA(t, i),
        unknownUncompressedSize: pA(t, i),
        unknownCompressedSize: pA(t, i),
        acCompressedSize: pA(t, i),
        dcCompressedSize: pA(t, i),
        rleCompressedSize: pA(t, i),
        rleUncompressedSize: pA(t, i),
        rleRawSize: pA(t, i),
        totalAcUncompressedCount: pA(t, i),
        totalDcUncompressedCount: pA(t, i),
        acCompression: pA(t, i)
      };
      if (C.version < 2)
        throw new Error("EXRLoader.parse: " + WA.compression + " version " + C.version + " is unsupported");
      const u = new Array();
      let I = $A(t, i) - 2;
      for (; I > 0; ) {
        const S = ae(t.buffer, i), G = qA(t, i), N = G >> 2 & 3, j = (G >> 4) - 1, nA = new Int8Array([j])[0], lA = qA(t, i);
        u.push({
          name: S,
          index: nA,
          type: lA,
          compression: N
        }), I -= S.length + 3;
      }
      const w = WA.channels, c = new Array(A.inputChannels.length);
      for (let S = 0; S < A.inputChannels.length; ++S) {
        const G = c[S] = {}, N = w[S];
        G.name = N.name, G.compression = 0, G.decoded = !1, G.type = N.pixelType, G.pLinear = N.pLinear, G.width = A.columns, G.height = A.lines;
      }
      const Q = {
        idx: new Array(3)
      };
      for (let S = 0; S < A.inputChannels.length; ++S) {
        const G = c[S];
        for (let N = 0; N < u.length; ++N) {
          const j = u[N];
          G.name == j.name && (G.compression = j.compression, j.index >= 0 && (Q.idx[j.index] = S), G.offset = S);
        }
      }
      let h, D, y;
      if (C.acCompressedSize > 0)
        switch (C.acCompression) {
          case 0:
            h = new Uint16Array(C.totalAcUncompressedCount), zA(A.array, t, i, C.acCompressedSize, h, C.totalAcUncompressedCount);
            break;
          case 1:
            const S = A.array.slice(i.value, i.value + C.totalAcUncompressedCount), G = Ce(S);
            h = new Uint16Array(G.buffer), i.value += C.totalAcUncompressedCount;
            break;
        }
      if (C.dcCompressedSize > 0) {
        const S = {
          array: A.array,
          offset: i,
          size: C.dcCompressedSize
        };
        D = new Uint16Array(we(S).buffer), i.value += C.dcCompressedSize;
      }
      if (C.rleRawSize > 0) {
        const S = A.array.slice(i.value, i.value + C.rleCompressedSize), G = Ce(S);
        y = Ye(G.buffer), i.value += C.rleCompressedSize;
      }
      let F = 0;
      const k = new Array(c.length);
      for (let S = 0; S < k.length; ++S)
        k[S] = new Array();
      for (let S = 0; S < A.lines; ++S)
        for (let G = 0; G < c.length; ++G)
          k[G].push(F), F += c[G].width * A.type * 2;
      Q.idx[0] !== void 0 && c[Q.idx[0]] && uo(Q, k, c, h, D, a);
      for (let S = 0; S < c.length; ++S) {
        const G = c[S];
        if (!G.decoded)
          switch (G.compression) {
            case 2:
              let N = 0, j = 0;
              for (let nA = 0; nA < A.lines; ++nA) {
                let lA = k[S][N];
                for (let sA = 0; sA < G.width; ++sA) {
                  for (let q = 0; q < 2 * G.type; ++q)
                    a[lA++] = y[j + q * G.width * G.height];
                  j++;
                }
                N++;
              }
              break;
            case 1:
              wo(S, k, c, h, D, a);
              break;
            default:
              throw new Error("EXRLoader.parse: unsupported channel compression");
          }
      }
      return new DataView(a.buffer);
    }
    function ae(A, t) {
      const i = new Uint8Array(A);
      let a = 0;
      for (; i[t.value + a] != 0; )
        a += 1;
      const C = new TextDecoder().decode(
        i.slice(t.value, t.value + a)
      );
      return t.value = t.value + a + 1, C;
    }
    function Fo(A, t, i) {
      const a = new TextDecoder().decode(
        new Uint8Array(A).slice(t.value, t.value + i)
      );
      return t.value = t.value + i, a;
    }
    function Ro(A, t) {
      const i = SA(A, t), a = FA(A, t);
      return [i, a];
    }
    function Uo(A, t) {
      const i = FA(A, t), a = FA(A, t);
      return [i, a];
    }
    function SA(A, t) {
      const i = A.getInt32(t.value, !0);
      return t.value = t.value + 4, i;
    }
    function FA(A, t) {
      const i = A.getUint32(t.value, !0);
      return t.value = t.value + 4, i;
    }
    function Ve(A, t) {
      const i = A[t.value];
      return t.value = t.value + 1, i;
    }
    function qA(A, t) {
      const i = A.getUint8(t.value);
      return t.value = t.value + 1, i;
    }
    const pA = function(A, t) {
      let i;
      return "getBigInt64" in DataView.prototype ? i = Number(A.getBigInt64(t.value, !0)) : i = A.getUint32(t.value + 4, !0) + Number(A.getUint32(t.value, !0) << 32), t.value += 8, i;
    };
    function wA(A, t) {
      const i = A.getFloat32(t.value, !0);
      return t.value += 4, i;
    }
    function Go(A, t) {
      return VA.toHalfFloat(wA(A, t));
    }
    function U(A) {
      const t = (A & 31744) >> 10, i = A & 1023;
      return (A >> 15 ? -1 : 1) * (t ? t === 31 ? i ? NaN : 1 / 0 : Math.pow(2, t - 15) * (1 + i / 1024) : 6103515625e-14 * (i / 1024));
    }
    function $A(A, t) {
      const i = A.getUint16(t.value, !0);
      return t.value += 2, i;
    }
    function Lo(A, t) {
      return U($A(A, t));
    }
    function mo(A, t, i, a) {
      const C = i.value, u = [];
      for (; i.value < C + a - 1; ) {
        const I = ae(t, i), w = SA(A, i), c = qA(A, i);
        i.value += 3;
        const Q = SA(A, i), h = SA(A, i);
        u.push({
          name: I,
          pixelType: w,
          pLinear: c,
          xSampling: Q,
          ySampling: h
        });
      }
      return i.value += 1, u;
    }
    function To(A, t) {
      const i = wA(A, t), a = wA(A, t), C = wA(A, t), u = wA(A, t), I = wA(A, t), w = wA(A, t), c = wA(A, t), Q = wA(A, t);
      return { redX: i, redY: a, greenX: C, greenY: u, blueX: I, blueY: w, whiteX: c, whiteY: Q };
    }
    function ko(A, t) {
      const i = [
        "NO_COMPRESSION",
        "RLE_COMPRESSION",
        "ZIPS_COMPRESSION",
        "ZIP_COMPRESSION",
        "PIZ_COMPRESSION",
        "PXR24_COMPRESSION",
        "B44_COMPRESSION",
        "B44A_COMPRESSION",
        "DWAA_COMPRESSION",
        "DWAB_COMPRESSION"
      ], a = qA(A, t);
      return i[a];
    }
    function _o(A, t) {
      const i = SA(A, t), a = SA(A, t), C = SA(A, t), u = SA(A, t);
      return { xMin: i, yMin: a, xMax: C, yMax: u };
    }
    function Mo(A, t) {
      const i = [
        "INCREASING_Y",
        "DECREASING_Y",
        "RANDOM_Y"
      ], a = qA(A, t);
      return i[a];
    }
    function No(A, t) {
      const i = [
        "ENVMAP_LATLONG",
        "ENVMAP_CUBE"
      ], a = qA(A, t);
      return i[a];
    }
    function xo(A, t) {
      const i = [
        "ONE_LEVEL",
        "MIPMAP_LEVELS",
        "RIPMAP_LEVELS"
      ], a = [
        "ROUND_DOWN",
        "ROUND_UP"
      ], C = FA(A, t), u = FA(A, t), I = qA(A, t);
      return {
        xSize: C,
        ySize: u,
        levelMode: i[I & 15],
        roundingMode: a[I >> 4]
      };
    }
    function Ho(A, t) {
      const i = wA(A, t), a = wA(A, t);
      return [i, a];
    }
    function bo(A, t) {
      const i = wA(A, t), a = wA(A, t), C = wA(A, t);
      return [i, a, C];
    }
    function vo(A, t, i, a, C) {
      if (a === "string" || a === "stringvector" || a === "iccProfile")
        return Fo(t, i, C);
      if (a === "chlist")
        return mo(A, t, i, C);
      if (a === "chromaticities")
        return To(A, i);
      if (a === "compression")
        return ko(A, i);
      if (a === "box2i")
        return _o(A, i);
      if (a === "envmap")
        return No(A, i);
      if (a === "tiledesc")
        return xo(A, i);
      if (a === "lineOrder")
        return Mo(A, i);
      if (a === "float")
        return wA(A, i);
      if (a === "v2f")
        return Ho(A, i);
      if (a === "v3f")
        return bo(A, i);
      if (a === "int")
        return SA(A, i);
      if (a === "rational")
        return Ro(A, i);
      if (a === "timecode")
        return Uo(A, i);
      if (a === "preview")
        return i.value += C, "skipped";
      i.value += C;
    }
    function Jo(A, t) {
      const i = Math.log2(A);
      return t == "ROUND_DOWN" ? Math.floor(i) : Math.ceil(i);
    }
    function qo(A, t, i) {
      let a = 0;
      switch (A.levelMode) {
        case "ONE_LEVEL":
          a = 1;
          break;
        case "MIPMAP_LEVELS":
          a = Jo(Math.max(t, i), A.roundingMode) + 1;
          break;
        case "RIPMAP_LEVELS":
          throw new Error("THREE.EXRLoader: RIPMAP_LEVELS tiles currently unsupported.");
      }
      return a;
    }
    function Ze(A, t, i, a) {
      const C = new Array(A);
      for (let u = 0; u < A; u++) {
        const I = 1 << u;
        let w = t / I | 0;
        a == "ROUND_UP" && w * I < t && (w += 1);
        const c = Math.max(w, 1);
        C[u] = (c + i - 1) / i | 0;
      }
      return C;
    }
    function Yo() {
      const A = this, t = A.offset, i = { value: 0 };
      for (let a = 0; a < A.tileCount; a++) {
        const C = SA(A.viewer, t), u = SA(A.viewer, t);
        t.value += 8, A.size = FA(A.viewer, t);
        const I = C * A.blockWidth, w = u * A.blockHeight;
        A.columns = I + A.blockWidth > A.width ? A.width - I : A.blockWidth, A.lines = w + A.blockHeight > A.height ? A.height - w : A.blockHeight;
        const c = A.columns * A.totalBytes, h = A.size < A.lines * c ? A.uncompress(A) : ue(A);
        t.value += A.size;
        for (let D = 0; D < A.lines; D++) {
          const y = D * A.columns * A.totalBytes;
          for (let F = 0; F < A.inputChannels.length; F++) {
            const k = WA.channels[F].name, S = A.channelByteOffsets[k] * A.columns, G = A.decodeChannels[k];
            if (G === void 0) continue;
            i.value = y + S;
            const N = (A.height - (1 + w + D)) * A.outLineWidth;
            for (let j = 0; j < A.columns; j++) {
              const nA = N + (j + I) * A.outputChannels + G;
              A.byteArray[nA] = A.getter(h, i);
            }
          }
        }
      }
    }
    function Oo() {
      const A = this, t = A.offset, i = { value: 0 };
      for (let a = 0; a < A.height / A.blockHeight; a++) {
        const C = SA(A.viewer, t) - WA.dataWindow.yMin;
        A.size = FA(A.viewer, t), A.lines = C + A.blockHeight > A.height ? A.height - C : A.blockHeight;
        const u = A.columns * A.totalBytes, w = A.size < A.lines * u ? A.uncompress(A) : ue(A);
        t.value += A.size;
        for (let c = 0; c < A.blockHeight; c++) {
          const Q = a * A.blockHeight, h = c + A.scanOrder(Q);
          if (h >= A.height) continue;
          const D = c * u, y = (A.height - 1 - h) * A.outLineWidth;
          for (let F = 0; F < A.inputChannels.length; F++) {
            const k = WA.channels[F].name, S = A.channelByteOffsets[k] * A.columns, G = A.decodeChannels[k];
            if (G !== void 0) {
              i.value = D + S;
              for (let N = 0; N < A.columns; N++) {
                const j = y + N * A.outputChannels + G;
                A.byteArray[j] = A.getter(w, i);
              }
            }
          }
        }
      }
    }
    function Ko(A, t, i) {
      const a = {};
      if (A.getUint32(0, !0) != 20000630)
        throw new Error("THREE.EXRLoader: Provided file doesn't appear to be in OpenEXR format.");
      a.version = A.getUint8(4);
      const C = A.getUint8(5);
      a.spec = {
        singleTile: !!(C & 2),
        longName: !!(C & 4),
        deepFormat: !!(C & 8),
        multiPart: !!(C & 16)
      }, i.value = 8;
      let u = !0;
      for (; u; ) {
        const I = ae(t, i);
        if (I === "")
          u = !1;
        else {
          const w = ae(t, i), c = FA(A, i), Q = vo(A, t, i, w, c);
          Q === void 0 ? console.warn(`THREE.EXRLoader: Skipped unknown header attribute type '${w}'.`) : a[I] = Q;
        }
      }
      if ((C & -7) != 0)
        throw console.error("THREE.EXRHeader:", a), new Error("THREE.EXRLoader: Provided file is currently unsupported.");
      return a;
    }
    function Po(A, t, i, a, C, u) {
      const I = {
        size: 0,
        viewer: t,
        array: i,
        offset: a,
        width: A.dataWindow.xMax - A.dataWindow.xMin + 1,
        height: A.dataWindow.yMax - A.dataWindow.yMin + 1,
        inputChannels: A.channels,
        channelByteOffsets: {},
        shouldExpand: !1,
        scanOrder: null,
        totalBytes: null,
        columns: null,
        lines: null,
        type: null,
        uncompress: null,
        getter: null,
        format: null,
        colorSpace: MA
      };
      switch (A.compression) {
        case "NO_COMPRESSION":
          I.blockHeight = 1, I.uncompress = ue;
          break;
        case "RLE_COMPRESSION":
          I.blockHeight = 1, I.uncompress = Do;
          break;
        case "ZIPS_COMPRESSION":
          I.blockHeight = 1, I.uncompress = we;
          break;
        case "ZIP_COMPRESSION":
          I.blockHeight = 16, I.uncompress = we;
          break;
        case "PIZ_COMPRESSION":
          I.blockHeight = 32, I.uncompress = po;
          break;
        case "PXR24_COMPRESSION":
          I.blockHeight = 16, I.uncompress = So;
          break;
        case "DWAA_COMPRESSION":
          I.blockHeight = 32, I.uncompress = Xe;
          break;
        case "DWAB_COMPRESSION":
          I.blockHeight = 256, I.uncompress = Xe;
          break;
        default:
          throw new Error("EXRLoader.parse: " + A.compression + " is unsupported");
      }
      const w = {};
      for (const y of A.channels)
        switch (y.name) {
          case "Y":
          case "R":
          case "G":
          case "B":
          case "A":
            w[y.name] = !0, I.type = y.pixelType;
        }
      let c = !1, Q = !1;
      if (w.R && w.G && w.B)
        I.outputChannels = 4;
      else if (w.Y)
        I.outputChannels = 1;
      else
        throw new Error("EXRLoader.parse: file contains unsupported data channels.");
      switch (I.outputChannels) {
        case 4:
          u == RA ? (c = !w.A, I.format = RA, I.colorSpace = MA, I.outputChannels = 4, I.decodeChannels = { R: 0, G: 1, B: 2, A: 3 }) : u == NA ? (I.format = NA, I.colorSpace = MA, I.outputChannels = 2, I.decodeChannels = { R: 0, G: 1 }) : u == vA ? (I.format = vA, I.colorSpace = MA, I.outputChannels = 1, I.decodeChannels = { R: 0 }) : Q = !0;
          break;
        case 1:
          u == RA ? (c = !0, I.format = RA, I.colorSpace = MA, I.outputChannels = 4, I.shouldExpand = !0, I.decodeChannels = { Y: 0 }) : u == NA ? (I.format = NA, I.colorSpace = MA, I.outputChannels = 2, I.shouldExpand = !0, I.decodeChannels = { Y: 0 }) : u == vA ? (I.format = vA, I.colorSpace = MA, I.outputChannels = 1, I.decodeChannels = { Y: 0 }) : Q = !0;
          break;
        default:
          Q = !0;
      }
      if (Q) throw new Error("EXRLoader.parse: invalid output format for specified file.");
      if (I.type == 1)
        switch (C) {
          case TA:
            I.getter = Lo;
            break;
          case yA:
            I.getter = $A;
            break;
        }
      else if (I.type == 2)
        switch (C) {
          case TA:
            I.getter = wA;
            break;
          case yA:
            I.getter = Go;
        }
      else
        throw new Error("EXRLoader.parse: unsupported pixelType " + I.type + " for " + A.compression + ".");
      I.columns = I.width;
      const h = I.width * I.height * I.outputChannels;
      switch (C) {
        case TA:
          I.byteArray = new Float32Array(h), c && I.byteArray.fill(1, 0, h);
          break;
        case yA:
          I.byteArray = new Uint16Array(h), c && I.byteArray.fill(15360, 0, h);
          break;
        default:
          console.error("THREE.EXRLoader: unsupported type: ", C);
          break;
      }
      let D = 0;
      for (const y of A.channels)
        I.decodeChannels[y.name] !== void 0 && (I.channelByteOffsets[y.name] = D), D += y.pixelType * 2;
      if (I.totalBytes = D, I.outLineWidth = I.width * I.outputChannels, A.lineOrder === "INCREASING_Y" ? I.scanOrder = (y) => y : I.scanOrder = (y) => I.height - 1 - y, A.spec.singleTile) {
        I.blockHeight = A.tiles.ySize, I.blockWidth = A.tiles.xSize;
        const y = qo(A.tiles, I.width, I.height), F = Ze(y, I.width, A.tiles.xSize, A.tiles.roundingMode), k = Ze(y, I.height, A.tiles.ySize, A.tiles.roundingMode);
        I.tileCount = F[0] * k[0];
        for (let S = 0; S < y; S++)
          for (let G = 0; G < k[S]; G++)
            for (let N = 0; N < F[S]; N++)
              pA(t, a);
        I.decode = Yo.bind(I);
      } else {
        I.blockWidth = I.width;
        const y = Math.ceil(I.height / I.blockHeight);
        for (let F = 0; F < y; F++)
          pA(t, a);
        I.decode = Oo.bind(I);
      }
      return I;
    }
    const ze = { value: 0 }, je = new DataView(e), Wo = new Uint8Array(e), WA = Ko(je, e, ze), YA = Po(WA, je, Wo, ze, this.type, this.outputFormat);
    if (YA.decode(), YA.shouldExpand) {
      const A = YA.byteArray;
      if (this.outputFormat == RA)
        for (let t = 0; t < A.length; t += 4)
          A[t + 2] = A[t + 1] = A[t];
      else if (this.outputFormat == NA)
        for (let t = 0; t < A.length; t += 2)
          A[t + 1] = A[t];
    }
    return {
      header: WA,
      width: YA.width,
      height: YA.height,
      data: YA.byteArray,
      format: YA.format,
      colorSpace: YA.colorSpace,
      type: this.type
    };
  }
  /**
   * Sets the texture type.
   *
   * @param {(HalfFloatType|FloatType)} value - The texture type to set.
   * @return {EXRLoader} A reference to this loader.
   */
  setDataType(e) {
    return this.type = e, this;
  }
  /**
   * Sets texture output format. Defaults to `RGBAFormat`.
   *
   * @param {(RGBAFormat|RGFormat|RedFormat)} value - Texture output format.
   * @return {EXRLoader} A reference to this loader.
   */
  setOutputFormat(e) {
    return this.outputFormat = e, this;
  }
  load(e, o, s, n) {
    function B(g, E) {
      g.colorSpace = E.colorSpace, g.minFilter = KA, g.magFilter = KA, g.generateMipmaps = !1, g.flipY = !1, o && o(g, E);
    }
    return super.load(e, B, s, n);
  }
}
class Bs extends pt {
  /**
      * Constructs a new RGBE/HDR loader.
      *
      * @param {LoadingManager} [manager] - The loading manager.
      */
  constructor(e) {
    super(e), this.type = yA;
  }
  /**
      * Parses the given RGBE texture data.
      *
      * @param {ArrayBuffer} buffer - The raw texture data.
      * @return {DataTextureLoader~TexData} An object representing the parsed texture data.
      */
  parse(e) {
    const g = function(_, b) {
      switch (_) {
        case 1:
          throw new Error("THREE.HDRLoader: Read Error: " + (b || ""));
        case 2:
          throw new Error("THREE.HDRLoader: Write Error: " + (b || ""));
        case 3:
          throw new Error("THREE.HDRLoader: Bad File Format: " + (b || ""));
        default:
        case 4:
          throw new Error("THREE.HDRLoader: Memory Error: " + (b || ""));
      }
    }, l = function(_, b, Y) {
      b = b || 1024;
      let W = _.pos, AA = -1, M = 0, eA = "", H = String.fromCharCode.apply(null, new Uint16Array(_.subarray(W, W + 128)));
      for (; 0 > (AA = H.indexOf(`
`)) && M < b && W < _.byteLength; )
        eA += H, M += H.length, W += 128, H += String.fromCharCode.apply(null, new Uint16Array(_.subarray(W, W + 128)));
      return -1 < AA ? (_.pos += M + AA + 1, eA + H.slice(0, AA)) : !1;
    }, p = function(_) {
      const b = /^#\?(\S+)/, Y = /^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/, v = /^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/, W = /^\s*FORMAT=(\S+)\s*$/, AA = /^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/, M = {
        valid: 0,
        /* indicate which fields are valid */
        string: "",
        /* the actual header string */
        comments: "",
        /* comments found in header */
        programtype: "RGBE",
        /* listed at beginning of file to identify it after "#?". defaults to "RGBE" */
        format: "",
        /* RGBE format, default 32-bit_rle_rgbe */
        gamma: 1,
        /* image has already been gamma corrected with given gamma. defaults to 1.0 (no correction) */
        exposure: 1,
        /* a value of 1.0 in an image corresponds to <exposure> watts/steradian/m^2. defaults to 1.0 */
        width: 0,
        height: 0
        /* image dimensions, width/height */
      };
      let eA, H;
      for ((_.pos >= _.byteLength || !(eA = l(_))) && g(1, "no header found"), (H = eA.match(b)) || g(3, "bad initial token"), M.valid |= 1, M.programtype = H[1], M.string += eA + `
`; eA = l(_), eA !== !1; ) {
        if (M.string += eA + `
`, eA.charAt(0) === "#") {
          M.comments += eA + `
`;
          continue;
        }
        if ((H = eA.match(Y)) && (M.gamma = parseFloat(H[1])), (H = eA.match(v)) && (M.exposure = parseFloat(H[1])), (H = eA.match(W)) && (M.valid |= 2, M.format = H[1]), (H = eA.match(AA)) && (M.valid |= 4, M.height = parseInt(H[1], 10), M.width = parseInt(H[2], 10)), M.valid & 2 && M.valid & 4) break;
      }
      return M.valid & 2 || g(3, "missing format specifier"), M.valid & 4 || g(3, "missing image size specifier"), M;
    }, d = function(_, b, Y) {
      const v = b;
      if (
        // run length encoding is not allowed so read flat
        v < 8 || v > 32767 || // this file is not run length encoded
        _[0] !== 2 || _[1] !== 2 || _[2] & 128
      )
        return new Uint8Array(_);
      v !== (_[2] << 8 | _[3]) && g(3, "wrong scanline width");
      const W = new Uint8Array(4 * b * Y);
      W.length || g(4, "unable to allocate buffer space");
      let AA = 0, M = 0;
      const eA = 4 * v, H = new Uint8Array(4), cA = new Uint8Array(eA);
      let fA = Y;
      for (; fA > 0 && M < _.byteLength; ) {
        M + 4 > _.byteLength && g(1), H[0] = _[M++], H[1] = _[M++], H[2] = _[M++], H[3] = _[M++], (H[0] != 2 || H[1] != 2 || (H[2] << 8 | H[3]) != v) && g(3, "bad rgbe scanline format");
        let EA = 0, IA;
        for (; EA < eA && M < _.byteLength; ) {
          IA = _[M++];
          const J = IA > 128;
          if (J && (IA -= 128), (IA === 0 || EA + IA > eA) && g(3, "bad scanline data"), J) {
            const $ = _[M++];
            for (let DA = 0; DA < IA; DA++)
              cA[EA++] = $;
          } else
            cA.set(_.subarray(M, M + IA), EA), EA += IA, M += IA;
        }
        const tA = v;
        for (let J = 0; J < tA; J++) {
          let $ = 0;
          W[AA] = cA[J + $], $ += v, W[AA + 1] = cA[J + $], $ += v, W[AA + 2] = cA[J + $], $ += v, W[AA + 3] = cA[J + $], AA += 4;
        }
        fA--;
      }
      return W;
    }, T = function(_, b, Y, v) {
      const W = _[b + 3], AA = Math.pow(2, W - 128) / 255;
      Y[v + 0] = _[b + 0] * AA, Y[v + 1] = _[b + 1] * AA, Y[v + 2] = _[b + 2] * AA, Y[v + 3] = 1;
    }, L = function(_, b, Y, v) {
      const W = _[b + 3], AA = Math.pow(2, W - 128) / 255;
      Y[v + 0] = VA.toHalfFloat(Math.min(_[b + 0] * AA, 65504)), Y[v + 1] = VA.toHalfFloat(Math.min(_[b + 1] * AA, 65504)), Y[v + 2] = VA.toHalfFloat(Math.min(_[b + 2] * AA, 65504)), Y[v + 3] = VA.toHalfFloat(1);
    }, O = new Uint8Array(e);
    O.pos = 0;
    const X = p(O), P = X.width, x = X.height, V = d(O.subarray(O.pos), P, x);
    let z, QA, CA;
    switch (this.type) {
      case TA:
        CA = V.length / 4;
        const _ = new Float32Array(CA * 4);
        for (let Y = 0; Y < CA; Y++)
          T(V, Y * 4, _, Y * 4);
        z = _, QA = TA;
        break;
      case yA:
        CA = V.length / 4;
        const b = new Uint16Array(CA * 4);
        for (let Y = 0; Y < CA; Y++)
          L(V, Y * 4, b, Y * 4);
        z = b, QA = yA;
        break;
      default:
        throw new Error("THREE.HDRLoader: Unsupported type: " + this.type);
    }
    return {
      width: P,
      height: x,
      data: z,
      header: X.string,
      gamma: X.gamma,
      exposure: X.exposure,
      type: QA
    };
  }
  /**
      * Sets the texture type.
      *
      * @param {(HalfFloatType|FloatType)} value - The texture type to set.
      * @return {HDRLoader} A reference to this loader.
      */
  setDataType(e) {
    return this.type = e, this;
  }
  load(e, o, s, n) {
    function B(g, E) {
      switch (g.type) {
        case TA:
        case yA:
          g.colorSpace = MA, g.minFilter = KA, g.magFilter = KA, g.generateMipmaps = !1, g.flipY = !0;
          break;
      }
      o && o(g, E);
    }
    return super.load(e, B, s, n);
  }
}
class Et {
  static init(e) {
    this.hdrLoader = new Bs(e), this.exrLoader = new as(e);
  }
  /** Load an HDR `.hdr`/`.exr` texture by URL, returning a cached instance when possible. */
  static loadHDRTexture(e, o = PA) {
    const s = K.resolveUrl(e), n = s.toLowerCase(), B = n.endsWith(".exr"), g = n.endsWith(".hdr");
    return !B && !g ? Promise.reject(new Error(`Unsupported HDR texture extension in url: ${s}`)) : ne({
      discard: (E) => E.dispose(),
      load: (E, f) => {
        const R = (m) => {
          m.mapping = Qi, E(m);
        };
        B ? this.exrLoader.load(s, R, void 0, f) : this.hdrLoader.load(s, R, void 0, f);
      },
      timeoutMs: o,
      url: s
    });
  }
}
class me {
  static init(e) {
    this.textureLoader = new ci(e);
  }
  /** Load a texture (URL or logical key), returning a cached instance when possible. */
  static loadTexture(e, o = PA) {
    const s = K.resolveUrl(e);
    return ne({
      discard: (n) => n.dispose(),
      load: (n, B) => {
        this.textureLoader.load(s, n, void 0, B);
      },
      timeoutMs: o,
      url: s
    });
  }
  /** Get a cached texture by logical key. */
  static getTexture(e) {
    return K.getAssetByKey(e) || null;
  }
}
class Te {
  static async loadUIKitML(e, o, s = !1, n = PA) {
    o && K.setKeyToUrl(o, e);
    const B = K.resolveUrl(e);
    return s && K.deleteAsset(B), ne({
      load: (g, E) => {
        (s ? fetch(B, { cache: "no-store" }) : fetch(B)).then(async (f) => {
          var R;
          if (!f.ok)
            throw new Error(`Failed to load UIKitML: ${B} (${f.status} ${f.statusText})`);
          const m = (R = f.headers.get("content-type")) !== null && R !== void 0 ? R : "", l = await f.text();
          if (/^(text\/html|application\/xhtml\+xml)(?:;|$)/i.test(m.trim()) || /^\s*(?:<!doctype\s+html\b|<html(?:\s|>))/i.test(l))
            throw new Error(`Failed to load UIKitML: ${B} returned HTML (content-type: ${m || "unknown"}). Check that the asset path exists and is served as UIKitML rather than the app fallback page.`);
          g(l);
        }).catch(E);
      },
      replacePending: s,
      timeoutMs: n,
      url: B
    });
  }
  static getUIKitML(e) {
    var o;
    const s = K.resolveUrl(e);
    return (o = K.getAsset(s)) !== null && o !== void 0 ? o : null;
  }
}
var uA;
(function(r) {
  r.GLTF = "gltf", r.Audio = "audio", r.Texture = "texture", r.HDRTexture = "hdr-texture", r.UIKitML = "uikitml";
})(uA || (uA = {}));
class Ee extends Error {
  constructor(e, o, s) {
    super(`Failed to load asset "${e}" from "${o}": ${Es(s)}`), this.assetId = e, this.url = o, this.cause = s, this.name = "AssetLoadError";
  }
}
Object.freeze({
  "primitive-box": Qe("Box", new di(0.5, 0.5, 0.5)),
  "primitive-capsule": Qe("Capsule", new wi(0.2, 0.5, 4, 12)),
  "primitive-cylinder": Qe("Cylinder", new ui(0.25, 0.25, 0.6, 24)),
  "primitive-sphere": Qe("Sphere", new hi(0.3, 24, 16))
});
class ho {
  /**
   * Initialize loaders and bind to the current world/renderer.
   */
  static init(e, o, s = {}) {
    var n;
    this.world = o, this.loadingManager = new li(), this.manifestEntries.clear(), this.loadTimeoutMs = (n = s.loadTimeoutMs) !== null && n !== void 0 ? n : PA, xe(this.loadTimeoutMs), ye.init(this.loadingManager), ie.init(this.loadingManager, e, s), me.init(this.loadingManager), Et.init(this.loadingManager);
  }
  /** Configure the finite timeout used by subsequent asset loads. */
  static setLoadTimeout(e) {
    xe(e), this.loadTimeoutMs = e;
  }
  /** Register catalog identity without starting network requests. */
  static registerManifest(e) {
    this.manifestEntries.clear();
    for (const [o, s] of Object.entries(e))
      Qt(s) || (this.manifestEntries.set(o, s), K.setKeyToUrl(o, s.url));
  }
  /** Preload assets with critical/background prioritization. */
  static async preloadAssets(e) {
    this.registerManifest(e);
    const o = Object.entries(e).filter((g) => !Qt(g[1])), s = o.filter(([g, E]) => E.priority !== "background" && E.priority !== "lazy"), n = o.filter(([g, E]) => E.priority === "background"), B = s.map(([g, E]) => this.loadAssetByType(E.url, E.type, g));
    await Promise.all(B), n.forEach(([g, E]) => {
      this.loadAssetByType(E.url, E.type, g).catch((f) => console.warn(`Background asset failed: ${g}`, f));
    });
  }
  static async loadAssetByType(e, o, s = e) {
    K.setKeyToUrl(s, e);
    try {
      switch (o) {
        case uA.GLTF:
          return await ie.loadGLTF(e, s, this.loadTimeoutMs);
        case uA.Audio:
          return await ye.loadAudio(e, this.loadTimeoutMs);
        case uA.Texture:
          return await me.loadTexture(e, this.loadTimeoutMs);
        case uA.HDRTexture:
          return await Et.loadHDRTexture(e, this.loadTimeoutMs);
        case uA.UIKitML:
          return await Te.loadUIKitML(e, s, !1, this.loadTimeoutMs);
        default:
          throw new Error(`Unsupported asset type: ${o}`);
      }
    } catch (n) {
      throw n instanceof Ee ? n : new Ee(s, e, n);
    }
  }
  /** Load one registered manifest entry by asset ID. */
  static async loadAsset(e) {
    const o = this.requireManifestEntry(e);
    return this.loadAssetByType(o.url, o.type, e);
  }
  static async loadGLTFById(e) {
    return this.loadTypedManifestAsset(e, uA.GLTF);
  }
  static async loadAudioById(e) {
    return this.loadTypedManifestAsset(e, uA.Audio);
  }
  static async loadTextureById(e) {
    return this.loadTypedManifestAsset(e, uA.Texture);
  }
  static async loadHDRTextureById(e) {
    return this.loadTypedManifestAsset(e, uA.HDRTexture);
  }
  static async loadUIKitMLById(e) {
    return this.loadTypedManifestAsset(e, uA.UIKitML);
  }
  static loadTypedManifestAsset(e, o) {
    const s = this.requireManifestEntry(e);
    if (s.type !== o)
      throw new Error(`Asset "${e}" has type "${s.type}", expected "${o}"`);
    return this.loadAssetByType(s.url, s.type, e);
  }
  static requireManifestEntry(e) {
    const o = this.manifestEntries.get(e);
    if (o == null)
      throw new Error(`Unknown loadable asset "${e}"`);
    return o;
  }
  /**
   * Load a GLTF by URL; optionally register a logical key.
   *
   * @remarks
   * Resolves with the cached `GLTF` directly. Use {@link AssetManager.getGLTF}
   * after the load resolves to retrieve a clone suitable for placing into
   * multiple entities.
   */
  static loadGLTF(e, o) {
    const s = o == null ? K.resolveUrl(e) : e;
    return this.loadAssetByType(s, uA.GLTF, o ?? e);
  }
  /** Create an isolated glTF load transaction for scene resource preflight. */
  static createGLTFLoadTransaction(e = {}) {
    return new Qs(e);
  }
  // Scene documents are loaded through World.loadLevel(url).
  /** Fetch any cached asset by logical key. */
  static getAsset(e) {
    return K.getAssetByKey(e);
  }
  // Public API Methods - delegate to specialized loaders
  /** Load an AudioBuffer by URL; optionally register a logical key. */
  static async loadAudio(e, o) {
    const s = o == null ? K.resolveUrl(e) : e;
    return this.loadAssetByType(s, uA.Audio, o ?? e);
  }
  /** Get a cached AudioBuffer by logical key. */
  static getAudio(e) {
    return ye.getAudio(e);
  }
  /** Load a Texture by URL; optionally register a logical key. */
  static async loadTexture(e, o) {
    const s = o == null ? K.resolveUrl(e) : e;
    return this.loadAssetByType(s, uA.Texture, o ?? e);
  }
  /** Get a cached Texture by logical key. */
  static getTexture(e) {
    return me.getTexture(e);
  }
  /** Load and cache UIKitML source by URL or manifest key. */
  static loadUIKitML(e, o, s = !1) {
    const n = o == null ? K.resolveUrl(e) : e, B = o ?? e;
    return K.setKeyToUrl(B, n), Te.loadUIKitML(n, B, s, this.loadTimeoutMs).catch((g) => {
      throw g instanceof Ee ? g : new Ee(B, n, g);
    });
  }
  /** Get cached UIKitML source by URL or manifest key. */
  static getUIKitML(e) {
    return Te.getUIKitML(e);
  }
  /** Load an HDR equirectangular texture; optionally register a logical key. */
  static async loadHDRTexture(e, o) {
    const s = o == null ? K.resolveUrl(e) : e;
    return this.loadAssetByType(s, uA.HDRTexture, o ?? e);
  }
  /**
   * Get a cached GLTF by logical key.
   *
   * @remarks
   * Returns a fresh clone by default (`scene`/`scenes` are new `Object3D`
   * trees; geometries, materials, animations stay shared), so the same key
   * may be safely used for multiple entities. Pass `{ shared: true }` to
   * return the cached instance directly.
   */
  static getGLTF(e, o) {
    return ie.getGLTF(e, o);
  }
}
ho.loadTimeoutMs = PA;
ho.manifestEntries = /* @__PURE__ */ new Map();
function Qt(r) {
  return r?.isObject3D === !0;
}
const Cs = Object.values(uA);
new Set(Cs);
function Es(r) {
  return r instanceof Error ? r.message : String(r);
}
function Qe(r, e) {
  const o = new yi(e, new fi({
    color: 9544890,
    metalness: 0.05,
    roughness: 0.72
  }));
  return o.name = r, o.userData.iwsdkAssetKind = "primitive", o;
}
class Qs {
  constructor(e = {}) {
    var o, s;
    this.stagedByUrl = /* @__PURE__ */ new Map(), this.urlByKey = /* @__PURE__ */ new Map(), this.state = "open", this.totalPayloadBytes = 0, this.maxModelPayloadBytes = (o = e.maxModelPayloadBytes) !== null && o !== void 0 ? o : ao, this.maxTotalModelPayloadBytes = (s = e.maxTotalModelPayloadBytes) !== null && s !== void 0 ? s : Ji, ct("maxModelPayloadBytes", this.maxModelPayloadBytes), ct("maxTotalModelPayloadBytes", this.maxTotalModelPayloadBytes);
  }
  /** Stage one logical key. Repeated URLs share one detached response. */
  async stage(e, o) {
    this.assertOpen();
    const s = this.urlByKey.get(o);
    if (s != null && s !== e)
      throw new Error(`Staged model key "${o}" already refers to "${s}"`);
    let n = this.stagedByUrl.get(e);
    if (n == null) {
      const B = await cs(e);
      if (B != null)
        n = { gltf: B, payloadBytes: 0, source: "cache", url: e };
      else {
        const g = await ie.loadGLTFDetached(e, this.maxModelPayloadBytes);
        if (this.totalPayloadBytes + g.payloadBytes > this.maxTotalModelPayloadBytes)
          throw be(g.gltf), new Error(`Staged model payloads total ${this.totalPayloadBytes + g.payloadBytes} bytes; the configured scene limit is ${this.maxTotalModelPayloadBytes} bytes`);
        n = {
          gltf: g.gltf,
          payloadBytes: g.payloadBytes,
          source: "detached",
          url: e
        }, this.totalPayloadBytes += g.payloadBytes;
      }
      this.stagedByUrl.set(e, n);
    }
    return this.urlByKey.set(o, e), n;
  }
  /** Retrieve a clone for materialization without transferring ownership. */
  getGLTF(e, o = {}) {
    const s = this.urlByKey.get(e), n = s == null ? null : this.stagedByUrl.get(s);
    return n == null ? null : o.shared ? n.gltf : ie.cloneGLTF(n.gltf);
  }
  /** Exact newly fetched primary-response bytes in this transaction. */
  get payloadBytes() {
    return this.totalPayloadBytes;
  }
  /** Verify cache ownership can transfer synchronously after scene install. */
  assertCanCommit() {
    this.assertOpen();
    for (const e of this.stagedByUrl.values()) {
      const o = K.getAsset(e.url);
      if (e.source === "cache") {
        if (o !== e.gltf)
          throw new Error(`Cached model "${e.url}" changed during resource preflight`);
      } else if (o != null || K.hasPromise(e.url))
        throw new Error(`Model "${e.url}" entered the shared cache during resource preflight`);
    }
  }
  /** Atomically transfer staged resources and logical keys to the shared cache. */
  commit() {
    this.assertCanCommit();
    for (const e of this.stagedByUrl.values())
      e.source === "detached" && K.setAsset(e.url, e.gltf);
    for (const [e, o] of this.urlByKey)
      K.setKeyToUrl(e, o);
    this.state = "committed";
  }
  /** Dispose all transaction-owned model resources; cached resources are borrowed. */
  rollback() {
    if (this.state === "open") {
      for (const e of this.stagedByUrl.values())
        e.source === "detached" && be(e.gltf);
      this.state = "rolled-back", this.stagedByUrl.clear(), this.urlByKey.clear();
    }
  }
  assertOpen() {
    if (this.state !== "open")
      throw new Error(`GLTF load transaction is already ${this.state}`);
  }
}
async function cs(r) {
  var e;
  const o = K.getAsset(r);
  if (o != null)
    return o;
  const s = K.getPromise(r);
  return s == null ? null : (await s, (e = K.getAsset(r)) !== null && e !== void 0 ? e : null);
}
function ct(r, e) {
  if (!Number.isSafeInteger(e) || e <= 0)
    throw new Error(`${r} must be a positive safe integer`);
}
export {
  ho as A,
  K as C,
  ye as a,
  uA as b
};
