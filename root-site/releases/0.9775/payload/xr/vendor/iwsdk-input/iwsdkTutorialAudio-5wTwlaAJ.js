import { G as N, P as C, A as te, c as ae, T as c, a as se, b as ne, d as oe, E as ie, W as de, L as re, M as le, S as ce } from "./iwsdkInputAdapter-D2CQ6O0_.js";
import { A as q, a as ue } from "./asset-manager-kTbfCuyA.js";
class Q {
  /**
   * Create a pool.
   * @param listener AudioListener to attach to each instance.
   * @param size Number of instances to pre‑allocate.
   * @param positional When true, creates `PositionalAudio`; otherwise ambient `Audio`.
   * @param parent Group/Object3D to attach internal container to.
   */
  constructor(e, t, a, s) {
    this.available = [], this.allInstances = [], this.container = new N(), s.add(this.container);
    for (let o = 0; o < t; o++) {
      const i = a ? new C(e) : new te(e);
      this.container.add(i), this.available.push(i), this.allInstances.push(i);
    }
  }
  /** Acquire an available audio node or `null` if exhausted. */
  acquire() {
    return this.available.length === 0 ? null : this.available.pop();
  }
  /** Stop, reset volume, and return an audio node to the pool. */
  release(e) {
    e.isPlaying && e.stop(), e.setVolume(1), this.available.includes(e) || this.available.push(e);
  }
  /** Stop and return all nodes to the available pool. */
  releaseAll() {
    for (const e of this.allInstances)
      e.isPlaying && e.stop(), e.setVolume(1);
    this.available = [...this.allInstances];
  }
  /** Disconnect and dispose all nodes and the container. */
  dispose() {
    for (const e of this.allInstances)
      e.isPlaying && e.stop(), e.disconnect();
    this.container.removeFromParent(), this.container.clear(), this.available = [], this.allInstances = [];
  }
  /** Number of nodes currently checked out. */
  getActiveCount() {
    return this.allInstances.length - this.available.length;
  }
  /** Total nodes in the pool. */
  getTotalCount() {
    return this.allInstances.length;
  }
  /** Return all nodes (checked out and available). */
  getAllInstances() {
    return this.allInstances;
  }
}
const A = {
  Restart: "restart",
  Overlap: "overlap",
  Ignore: "ignore",
  FadeRestart: "fade-restart"
}, E = {
  Oldest: "oldest",
  Quietest: "quietest",
  Furthest: "furthest"
}, K = {
  Linear: "linear",
  Inverse: "inverse",
  Exponential: "exponential"
}, n = ae("AudioSource", {
  // Core properties  PathByFilePickerAttribute
  src: {
    type: c.FilePath,
    default: "",
    fileTypes: ".mp3,.wav,.ogg,.m4a,.aac",
    subfolder: "audio"
  },
  // URL or cache key for an audio buffer
  volume: { type: c.Float32, default: 1 },
  // Linear gain [0..1]
  loop: { type: c.Boolean, default: !1 },
  // When true, newly created instances loop
  autoplay: { type: c.Boolean, default: !1 },
  // Trigger a single play on first update after load
  // Spatial properties
  positional: { type: c.Boolean, default: !0 },
  // true: PositionalAudio; false: ambient Audio
  refDistance: { type: c.Float32, default: 1 },
  // Distance at which volume is 1.0
  rolloffFactor: { type: c.Float32, default: 1 },
  // Rolloff curve steepness
  maxDistance: { type: c.Float32, default: 1e4 },
  // Distance after which volume is 0
  distanceModel: {
    type: c.Enum,
    enum: K,
    default: K.Inverse
  },
  coneInnerAngle: { type: c.Float32, default: 360 },
  // Degrees of full-volume cone
  coneOuterAngle: { type: c.Float32, default: 360 },
  // Degrees until falloff reaches outer gain
  coneOuterGain: { type: c.Float32, default: 0 },
  // Gain at the edge/outside of the cone
  // Playback behavior control
  playbackMode: {
    type: c.Enum,
    enum: A,
    default: A.Restart
  },
  // Behavior when play is triggered while another instance is active
  maxInstances: { type: c.Int8, default: 1 },
  // Max simultaneous instances in pool
  crossfadeDuration: { type: c.Float32, default: 0.1 },
  // Seconds used for FadeRestart
  instanceStealPolicy: {
    type: c.Enum,
    enum: E,
    default: E.Oldest
  },
  // Which instance to replace when pool is full
  // Playback control flags (internal)
  _playRequested: { type: c.Boolean, default: !1 },
  // Set true to request play on next update
  _pauseRequested: { type: c.Boolean, default: !1 },
  // Set true to request pause (optional fade)
  _stopRequested: { type: c.Boolean, default: !1 },
  // Set true to stop and clear instances
  _fadeIn: { type: c.Float32, default: 0 },
  // Seconds to fade in on next play
  _fadeOut: { type: c.Float32, default: 0 },
  // Seconds to fade out on pause
  // Runtime state (managed by AudioSystem)
  _pool: { type: c.Object, default: void 0 },
  // Assigned AudioPool for this entity
  _instances: { type: c.Object, default: void 0 },
  // Active instance list (internal)
  _isPlaying: { type: c.Boolean, default: !1 },
  // True if any instance is currently playing
  _buffer: { type: c.Object, default: void 0 },
  // Loaded AudioBuffer
  _loaded: { type: c.Boolean, default: !1 },
  // True once buffer is loaded
  _loading: { type: c.Boolean, default: !1 }
  // True while buffer is loading
}, "AudioSource playback component for positional and non-positional sounds");
class fe extends se({
  audioEntities: { required: [n] }
}, {
  /** Enable distance-based culling for positional audio instances. */
  enableDistanceCulling: { type: c.Boolean, default: !0 },
  /** Multiplier applied to `maxDistance` for culling threshold. */
  cullingDistanceMultiplier: { type: c.Float32, default: 1.5 }
}) {
  constructor() {
    super(...arguments), this.activeInstances = /* @__PURE__ */ new Map(), this.onXRSessionStart = () => {
      const e = this.listener.context;
      e.state === "suspended" && e.resume();
      for (const [, t] of this.activeInstances)
        t.forEach((a) => {
          a.pausedBySessionEnd && (a.audio.play(), a.pausedBySessionEnd = !1);
        });
    }, this.onXRSessionEnd = () => {
      for (const [, t] of this.activeInstances)
        t.forEach((a) => {
          a.audio.isPlaying && (a.audio.pause(), a.pausedBySessionEnd = !0);
        });
      const e = this.listener.context;
      e.state === "running" && e.suspend();
    };
  }
  init() {
    this.listener = new ne(), this.player.head.add(this.listener), this.renderer.xr.addEventListener("sessionstart", this.onXRSessionStart), this.renderer.xr.addEventListener("sessionend", this.onXRSessionEnd), this.queries.audioEntities.subscribe("disqualify", (e) => {
      this.cleanupEntity(e);
    });
  }
  update(e, t) {
    const a = t, s = this.queries.audioEntities.entities;
    s.size !== 0 && s.forEach((o) => {
      const i = o.index;
      if (!n.data._loaded[i] && !n.data._loading[i]) {
        const l = n.data.src[i];
        l && this.loadAudio(o, l);
        return;
      }
      n.data._loaded[i] && (n.data._pool[i] || this.createPool(o), this.handlePlaybackRequests(o, a), this.updateActiveInstances(o, a), n.data.autoplay[i] && !n.data._isPlaying[i] && n.data._playRequested[i] === 0 && (n.data._playRequested[i] = 1, n.data.autoplay[i] = 0));
    });
  }
  async loadAudio(e, t) {
    const a = e.index;
    n.data._loading[a] = 1;
    try {
      let s = q.getAudio(t);
      s || (s = await q.loadAudio(t)), n.data._buffer[a] = s, n.data._loaded[a] = 1;
    } catch (s) {
      console.error(`Failed to load audio: ${t}`, s);
    } finally {
      n.data._loading[a] = 0;
    }
  }
  createPool(e) {
    const t = e.index, a = n.data.maxInstances[t], s = n.data.positional[t], o = e.object3D || this.scene, i = a, l = s === 1 ? new Q(this.listener, i, !0, o) : new Q(this.listener, i, !1, o);
    n.data._pool[t] = l, s && l.getAllInstances().forEach((f) => {
      f.setRefDistance(n.data.refDistance[t]), f.setRolloffFactor(n.data.rolloffFactor[t]), f.setMaxDistance(n.data.maxDistance[t]), f.setDistanceModel(n.data.distanceModel[t]), f.setDirectionalCone(n.data.coneInnerAngle[t], n.data.coneOuterAngle[t], n.data.coneOuterGain[t]);
    });
  }
  handlePlaybackRequests(e, t) {
    const a = e.index;
    if (n.data._stopRequested[a]) {
      this.stopAllInstances(e), n.data._stopRequested[a] = 0, n.data._playRequested[a] = 0, n.data._pauseRequested[a] = 0;
      return;
    }
    if (n.data._pauseRequested[a]) {
      const s = n.data._fadeOut[a];
      this.pauseAllInstances(e, s, t), n.data._pauseRequested[a] = 0;
      return;
    }
    if (n.data._playRequested[a] && n.data._loaded[a]) {
      const s = n.data.playbackMode[a], o = n.data._fadeIn[a];
      switch (s) {
        case A.Restart:
          this.playRestart(e, o, t);
          break;
        case A.Overlap:
          this.playOverlap(e, o, t);
          break;
        case A.Ignore:
          this.playIgnore(e, o, t);
          break;
        case A.FadeRestart:
          this.playFadeRestart(e, t);
          break;
      }
      n.data._playRequested[a] = 0;
    }
  }
  playRestart(e, t, a) {
    this.stopAllInstances(e), this.createAndPlayInstance(e, t, a);
  }
  playOverlap(e, t, a) {
    const s = e.index, o = this.activeInstances.get(e) || [], i = n.data.maxInstances[s];
    if (o.length < i)
      this.createAndPlayInstance(e, t, a);
    else {
      const l = n.data.instanceStealPolicy[s];
      this.stealInstance(e, o, l, a), this.createAndPlayInstance(e, t, a);
    }
  }
  playIgnore(e, t, a) {
    (this.activeInstances.get(e) || []).length === 0 && this.createAndPlayInstance(e, t, a);
  }
  playFadeRestart(e, t) {
    const a = e.index, s = n.data.crossfadeDuration[a];
    (this.activeInstances.get(e) || []).forEach((i) => {
      i.isFadingOut = !0, i.fadeStartTime = t, i.fadeStartVolume = i.audio.getVolume(), i.fadeDuration = s;
    }), this.createAndPlayInstance(e, s, t);
  }
  createAndPlayInstance(e, t, a) {
    const s = e.index, o = n.data._pool[s], i = n.data._buffer[s];
    if (!o || !i)
      return;
    const l = o.acquire();
    if (!l)
      return;
    l.setBuffer(i);
    const d = n.data.loop[s] === 1;
    l.setLoop(d), l.setVolume(t > 0 ? 0 : n.data.volume[s]);
    const r = {
      audio: l,
      startTime: a
    };
    t > 0 && (r.isFadingIn = !0, r.fadeStartTime = r.startTime, r.fadeStartVolume = 0, r.fadeDuration = t);
    const f = this.activeInstances.get(e) || [];
    f.push(r), this.activeInstances.set(e, f), l.play(), n.data._isPlaying[s] = 1, l.source ? l.source.onended = () => {
      this.onInstanceEnded(e, r);
    } : r.onendedTimeout = setTimeout(() => {
      r.onendedTimeout = void 0, l.source && (l.source.onended = () => {
        this.onInstanceEnded(e, r);
      });
    }, 10);
  }
  clearInstanceTimeout(e) {
    e.onendedTimeout !== void 0 && (clearTimeout(e.onendedTimeout), e.onendedTimeout = void 0);
  }
  updateActiveInstances(e, t) {
    const a = this.activeInstances.get(e);
    if (!a || a.length === 0)
      return;
    const s = e.index, o = t, i = n.data.volume[s];
    for (let l = a.length - 1; l >= 0; l--) {
      const d = a[l];
      if (d.isFadingIn && d.fadeStartTime && d.fadeDuration) {
        const r = (o - d.fadeStartTime) / d.fadeDuration;
        if (r >= 1)
          d.audio.setVolume(i), d.isFadingIn = !1;
        else {
          const f = i * r;
          d.audio.setVolume(f);
        }
      }
      if (d.isFadingOut && d.fadeStartTime && d.fadeDuration) {
        const r = (o - d.fadeStartTime) / d.fadeDuration;
        if (r >= 1)
          this.releaseInstance(e, d, l);
        else {
          const m = (d.fadeStartVolume || i) * (1 - r);
          d.audio.setVolume(m);
        }
      }
      if (!d.isFadingIn && !d.isFadingOut) {
        const r = d.audio.getVolume();
        Math.abs(r - i) > 0.01 && d.audio.setVolume(i);
      }
      n.data.positional[s] && d.audio instanceof C && (d.audio.getRefDistance() !== n.data.refDistance[s] && d.audio.setRefDistance(n.data.refDistance[s]), d.audio.setRolloffFactor(n.data.rolloffFactor[s]), d.audio.setMaxDistance(n.data.maxDistance[s]));
    }
    n.data._isPlaying[s] = a.length > 0 ? 1 : 0;
  }
  onInstanceEnded(e, t) {
    const a = this.activeInstances.get(e);
    if (!a)
      return;
    const s = a.indexOf(t);
    s !== -1 && this.releaseInstance(e, t, s);
  }
  releaseInstance(e, t, a) {
    const s = e.index, o = n.data._pool[s], i = this.activeInstances.get(e);
    this.clearInstanceTimeout(t), o.release(t.audio), i.splice(a, 1), i.length === 0 && (this.activeInstances.delete(e), n.data._isPlaying[s] = 0);
  }
  stopAllInstances(e) {
    const t = this.activeInstances.get(e);
    if (!t)
      return;
    const a = e.index, s = n.data._pool[a];
    t.forEach((o) => {
      this.clearInstanceTimeout(o), s.release(o.audio);
    }), this.activeInstances.delete(e), n.data._isPlaying[a] = 0;
  }
  pauseAllInstances(e, t, a) {
    const s = this.activeInstances.get(e);
    s && (t > 0 ? s.forEach((o) => {
      o.isFadingOut = !0, o.fadeStartTime = a, o.fadeStartVolume = o.audio.getVolume(), o.fadeDuration = t;
    }) : s.forEach((o) => {
      o.audio.pause();
    }));
  }
  stealInstance(e, t, a, s) {
    if (t.length === 0)
      return;
    let o;
    switch (a) {
      case E.Oldest:
        o = t[0];
        break;
      case E.Quietest:
        o = t.reduce((d, r) => r.audio.getVolume() < d.audio.getVolume() ? r : d);
        break;
      case E.Furthest:
        const l = this.player.head.position;
        o = t.reduce((d, r) => {
          const f = d.audio.position ? l.distanceTo(d.audio.position) : 0;
          return (r.audio.position ? l.distanceTo(r.audio.position) : 0) > f ? r : d;
        });
        break;
      default:
        o = t[0];
    }
    const i = t.indexOf(o);
    this.releaseInstance(e, o, i);
  }
  cleanupEntity(e) {
    const t = this.activeInstances.get(e);
    if (!t)
      return;
    const a = e.index, s = n.data._pool[a];
    s && (t.forEach((o) => {
      this.clearInstanceTimeout(o), s.release(o.audio);
    }), s.dispose()), this.activeInstances.delete(e);
  }
  destroy() {
    for (const [e] of this.activeInstances)
      this.cleanupEntity(e);
    this.renderer.xr.removeEventListener("sessionstart", this.onXRSessionStart), this.renderer.xr.removeEventListener("sessionend", this.onXRSessionEnd);
  }
}
class pe {
  /**
   * Play audio on an entity
   * @param entity - Entity with Audio component
   * @param fadeIn - Fade in duration in seconds
   */
  static play(e, t = 0) {
    const a = e.index;
    if (n.data.src[a] === void 0) {
      console.warn("Entity does not have Audio component");
      return;
    }
    n.data._playRequested[a] = 1, n.data._fadeIn[a] = t;
  }
  /**
   * Pause audio on an entity
   * @param entity - Entity with Audio component
   * @param fadeOut - Fade out duration in seconds
   */
  static pause(e, t = 0) {
    const a = e.index;
    if (n.data.src[a] === void 0) {
      console.warn("Entity does not have Audio component");
      return;
    }
    n.data._pauseRequested[a] = 1, n.data._fadeOut[a] = t;
  }
  /**
   * Stop audio on an entity
   * @param entity - Entity with Audio component
   */
  static stop(e) {
    const t = e.index;
    if (n.data.src[t] === void 0) {
      console.warn("Entity does not have Audio component");
      return;
    }
    n.data._stopRequested[t] = 1;
  }
  /**
   * Check if audio is playing on an entity
   * @param entity - Entity with Audio component
   * @returns True if audio is playing
   */
  static isPlaying(e) {
    const t = e.index;
    return n.data.src[t] === void 0 ? !1 : n.data._isPlaying[t] === 1;
  }
  /**
   * Set volume on an entity's audio
   * @param entity - Entity with Audio component
   * @param volume - Volume level (0.0 to 1.0)
   */
  static setVolume(e, t) {
    const a = e.index;
    if (n.data.src[a] === void 0) {
      console.warn("Entity does not have Audio component");
      return;
    }
    n.data.volume[a] = Math.max(0, Math.min(1, t));
  }
  /**
   * Get volume from an entity's audio
   * @param entity - Entity with Audio component
   * @returns Current volume level
   */
  static getVolume(e) {
    const t = e.index;
    return n.data.src[t] === void 0 ? 0 : n.data.volume[t];
  }
  /**
   * Preload audio for an entity
   * @param entity - Entity with Audio component
   * @returns Promise that resolves when audio is loaded
   */
  static async preload(e) {
    const t = e.index;
    if (n.data.src[t] === void 0)
      throw new Error("Entity does not have Audio component");
    return new Promise((a) => {
      const s = () => {
        n.data._loaded[t] ? a() : (!n.data._loading[t] && n.data._loaded[t], setTimeout(s, 16));
      };
      s();
    });
  }
  /**
   * Create a one-shot audio entity that auto-removes after playing
   * @param world - World instance
   * @param src - Audio source path
   * @param options - Additional audio options
   * @returns Created entity
   */
  static createOneShot(e, t, a = {}) {
    var s, o;
    const i = e.createEntity();
    return i.addComponent(n, {
      src: t,
      volume: (s = a.volume) !== null && s !== void 0 ? s : 1,
      positional: (o = a.positional) !== null && o !== void 0 ? o : !1,
      autoplay: !0,
      loop: !1
    }), a.positional && a.position, i;
  }
}
const he = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AssetManager: q,
  AudioAssetLoader: ue,
  AudioContext: oe,
  AudioSource: n,
  AudioSystem: fe,
  AudioUtils: pe,
  EventDispatcher: ie,
  Group: N,
  InteractionWorld: de,
  LoadingManager: re,
  Matrix4: le,
  PositionalAudio: C,
  Scene: ce
}, Symbol.toStringTag, { value: "Module" }));
function D(g) {
  const a = new Uint8Array(32044), s = new DataView(a.buffer), o = (r, f) => {
    for (let m = 0; m < f.length; m++) a[r + m] = f.charCodeAt(m);
  };
  o(0, "RIFF"), s.setUint32(4, a.length - 8, !0), o(8, "WAVE"), o(12, "fmt "), s.setUint32(16, 16, !0), s.setUint16(20, 1, !0), s.setUint16(22, 1, !0), s.setUint32(24, 16e3, !0), s.setUint32(28, 16e3 * 2, !0), s.setUint16(32, 2, !0), s.setUint16(34, 16, !0), o(36, "data"), s.setUint32(40, 16e3 * 2, !0);
  let i = 771, l = 0;
  for (let r = 0; r < 16e3; r++) {
    i = Math.imul(i, 1664525) + 1013904223 >>> 0, l = 0.9 * l + 0.1 * (i / 4294967296 * 2 - 1);
    const f = r / 16e3, m = Math.min(1, r / 160, (16e3 - r) / 160), F = g === "sparkle" ? [660, 880, 1100, 1320].reduce((w, M, T) => {
      const b = f - T * 0.12;
      return w + (b > 0 ? Math.sin(b * Math.PI * 2 * M) * Math.exp(-b * 7) * 0.1 : 0);
    }, 0) : g === "water" ? l * 0.7 : Math.sin(f * Math.PI * 2 * 165) * 0.12 + Math.sin(f * Math.PI * 2 * 330) * 0.035;
    s.setInt16(44 + r * 2, Math.round(F * m * 32767), !0);
  }
  let d = "";
  for (const r of a) d += String.fromCharCode(r);
  return "data:audio/wav;base64," + btoa(d);
}
async function ge(g, e, t = he, { scope: a = "tutorial" } = {}) {
  const s = e?.context;
  if (!s || !g) return null;
  const { InteractionWorld: o, AudioSystem: i, AudioSource: l, AudioUtils: d, AssetManager: r, AudioAssetLoader: f, LoadingManager: m, Scene: F, Group: w, EventDispatcher: M, AudioContext: T, PositionalAudio: b, Matrix4: $ } = t;
  T.setContext(s), f.init(new m());
  const B = a === "demo" ? { bee: D("insect") } : { water: D("water"), insect: D("insect"), sparkle: D("sparkle") };
  await Promise.all(Object.values(B).map((u) => r.loadAudio(u)));
  const p = new o({ entityCapacity: 8 });
  p.scene = new F();
  const S = new w();
  p.scene.add(S), p.player = { head: S }, p.renderer = { xr: new M() }, p.registerComponent(l), p.registerSystem(i);
  const O = p.getSystem(i), y = new b(O.listener);
  y.setRefDistance(1), y.setRolloffFactor(0.35), y.setMaxDistance(20), p.scene.add(y);
  const I = /* @__PURE__ */ new Map(), H = new $();
  let P = !1, L = !1, R = !1;
  for (const [u, v] of Object.entries(B)) {
    const h = new w();
    p.scene.add(h);
    const _ = p.createEntity();
    _.object3D = h, _.addComponent(l, { src: v, positional: !0, loop: u !== "sparkle", autoplay: !1, volume: u === "water" ? 0.1 : u === "sparkle" ? 0.14 : 0.035, refDistance: 0.5, rolloffFactor: 1.2, maxDistance: 8 }), I.set(u, { mesh: h, entity: _, playing: !1 });
  }
  const U = e.setSpatialOutput?.({ connect(u) {
    P || (y.setNodeSource(u), L = !0);
  } }), j = () => {
    R = !1;
    for (const u of I.values())
      d.stop(u.entity), u.playing = !1;
    p.update(0, 0);
  };
  return {
    backend: "iwsdk-spatial-audio",
    world: p,
    system: O,
    sparkle(u, { volume: v = 1 } = {}) {
      const h = I.get("sparkle");
      return P || !R || !h || !u || v <= 0 ? !1 : (h.entity.setValue(l, "volume", 0.14 * Math.max(0, Math.min(1, v))), h.mesh.position.copy(u), d.stop(h.entity), p.update(0, 0), d.play(h.entity), h.playing = !0, p.scene.updateMatrixWorld(!0), p.update(0, 0), !0);
    },
    update(u, v, { viewer: h, zinnia: _, water: J, insect: Y, watering: Z = !1, flying: ee = !1, paused: W = !1, muted: X = !1, visible: G = !0 } = {}) {
      if (!P) {
        R = G && !W && !X, h && H.fromArray(h).decompose(S.position, S.quaternion, S.scale), _ && y.position.copy(_);
        for (const [V, x] of I) {
          if (V === "sparkle") {
            R || (d.stop(x.entity), x.playing = !1);
            continue;
          }
          const z = V === "water" ? J : Y;
          z && x.mesh.position.copy(z);
          const k = G && !W && !X && (V === "water" ? Z : ee);
          k !== x.playing && (k ? d.play(x.entity) : d.stop(x.entity), x.playing = k);
        }
        p.scene.updateMatrixWorld(!0), p.update(u, v);
      }
    },
    suspend: j,
    snapshot: () => ({ backend: "iwsdk-spatial-audio", connected: L, playing: [...I].filter(([, u]) => u.playing).map(([u]) => u) }),
    dispose() {
      if (!P) {
        j(), P = !0, U ? U() : e.setSpatialOutput?.(null), y.disconnect(), y.removeFromParent();
        for (const u of I.values())
          d.stop(u.entity), u.entity.getValue(l, "_pool")?.dispose(), u.entity.destroy();
        I.clear(), p.unregisterSystem(i), O.listener?.removeFromParent(), p.scene.clear();
      }
    }
  };
}
export {
  ge as createTutorialAudioOwner,
  D as tutorialSoundUrl
};
