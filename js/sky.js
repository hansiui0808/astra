/* ASTRA — 천구 렌더러 (Canvas 2D, 입체 투영)
 * 데이터(ASTRA_DATA)와 UI(app.js)를 서로 모르게 두고, 이 파일은 "하늘을 그리고 카메라를 움직이는 일"만 맡는다.
 */
(function () {
  'use strict';
  const D = window.ASTRA_DATA;
  const TAU = Math.PI * 2, H2R = Math.PI / 12, D2R = Math.PI / 180;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const vec = (raH, decD) => { const a = raH * H2R, d = decD * D2R; return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]; };
  const mulberry = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SERIF = '"Instrument Serif","Cormorant Garamond","Times New Roman",Georgia,serif';
  const SANS = '"Inter Tight","Inter","Helvetica Neue",Arial,sans-serif';
  const MONO = '"DM Mono","IBM Plex Mono",ui-monospace,Menlo,monospace';
  const GC_V = vec(17.7611, -28.936);

  /* ── 별 색상: 분광형 첫 글자 → 팔레트에 어울리게 눌러 둔 색 ── */
  const SPEC_COL = { O: '#dbe6ff', B: '#e1eaff', A: '#eef0ff', F: '#fff8e6', G: '#fff0c8', K: '#ffdca8', M: '#ffc79c' };
  const specColor = s => (s && SPEC_COL[s.trim()[0]]) || '#e8eaf2';

  /* ── 카탈로그 구축 ── */
  const cons = D.constellations;
  const consById = {}, starByUid = {}, objByUid = {};
  const catalog = [];
  const DSO_SIZE = { m42: 1.0, m45: 2.0, m1: 0.12, m44: 1.5, m57: 0.06, m8: 1.2, m31: 3.0 };
  cons.forEach(c => {
    consById[c.id] = c;
    c.stars.forEach(s => {
      s.uid = c.id + ':' + s.k; s.con = c.id; s.v = vec(s.ra, s.dec); s.col = specColor(s.spec);
      s.phase = Math.random() * TAU; starByUid[s.uid] = s; catalog.push(s);
    });
    const seen = new Set(); c.edges = [];
    c.lines.forEach(ch => { for (let i = 0; i < ch.length - 1; i++) {
      const a = c.id + ':' + ch[i], b = c.id + ':' + ch[i + 1], key = a < b ? a + '|' + b : b + '|' + a;
      if (!seen.has(key)) { seen.add(key); c.edges.push([a, b, key]); }
    } });
    c.edgeKeys = new Set(c.edges.map(e => e[2]));
    let sum = [0, 0, 0]; c.stars.forEach(s => { sum = [sum[0] + s.v[0], sum[1] + s.v[1], sum[2] + s.v[2]]; });
    c.cv = norm(sum);
    c.radius = Math.max(...c.stars.map(s => Math.acos(clamp(dot(s.v, c.cv), -1, 1))));
    c.ra = (Math.atan2(c.cv[1], c.cv[0]) + TAU) % TAU; c.dec = Math.asin(c.cv[2]);
    (c.objects || []).forEach(o => { o.uid = c.id + ':' + o.k; o.con = c.id; o.v = vec(o.ra, o.dec); o.size = DSO_SIZE[o.k] || 0.5; objByUid[o.uid] = o; });
  });
  const edgeKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

  /* ── 은하 좌표 → 적도 좌표 (은하수 띠를 실제 위치에 놓기 위해) ── */
  const NGP = { ra: 192.85948 * D2R, dec: 27.12825 * D2R, l0: 122.93192 * D2R };
  function galToEq(l, b) {
    const sinD = Math.sin(b) * Math.sin(NGP.dec) + Math.cos(b) * Math.cos(NGP.dec) * Math.cos(NGP.l0 - l);
    const dec = Math.asin(clamp(sinD, -1, 1));
    const y = Math.cos(b) * Math.sin(NGP.l0 - l);
    const x = Math.sin(b) * Math.cos(NGP.dec) - Math.cos(b) * Math.sin(NGP.dec) * Math.cos(NGP.l0 - l);
    const ra = (NGP.ra + Math.atan2(y, x) + TAU) % TAU;
    return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  }
  const NGP_V = [Math.cos(NGP.dec) * Math.cos(NGP.ra), Math.cos(NGP.dec) * Math.sin(NGP.ra), Math.sin(NGP.dec)];
  const GY_V = cross(NGP_V, GC_V);

  /* ── 오늘의 태양 위치(저정밀 근사) ── */
  function sunPosition(date) {
    const n = (date.getTime() / 86400000) + 2440587.5 - 2451545.0;
    const L = (280.460 + 0.9856474 * n) % 360, g = ((357.528 + 0.9856003 * n) % 360) * D2R;
    const lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * D2R, eps = 23.4393 * D2R;
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)), dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    return { ra: (ra + TAU) % TAU, dec, v: [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)] };
  }
  function eclipticVec(lamDeg) {
    const lam = lamDeg * D2R, eps = 23.4393 * D2R;
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)), dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  }

  /* ── 스프라이트 ── */
  const glowCache = {};
  function glowSprite(color) {
    if (glowCache[color]) return glowCache[color];
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.1, color); g.addColorStop(0.22, hexA(color, 0.42));
    g.addColorStop(0.5, hexA(color, 0.09)); g.addColorStop(1, hexA(color, 0));
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return (glowCache[color] = c);
  }
  const softCache = {};
  function softSprite(color) {
    if (softCache[color]) return softCache[color];
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, hexA(color, 1)); g.addColorStop(0.35, hexA(color, 0.45)); g.addColorStop(0.7, hexA(color, 0.1)); g.addColorStop(1, hexA(color, 0));
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return (softCache[color] = c);
  }
  function hexA(hex, a) {
    const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  /* ───────────────────────────── Sky 클래스 ───────────────────────────── */
  class Sky {
    constructor(canvas) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.w = 0; this.h = 0; this.dpr = 1;
      this.ra0 = 4.6 * H2R; this.dec0 = 12 * D2R; this.scale = 620;
      this.inset = { l: 0, r: 0, t: 0, b: 0 }; this.cx = 0; this.cy = 0; this._insetInit = false;
      this.opts = { lines: false, labels: true, grid: false, ecliptic: false, starNames: false, drift: true, hideConLabels: false };
      this.sel = null; this.selT0 = 0; this.selStar = null; this.hoverUid = null; this.selObj = null;
      this.connect = null; this.mine = []; this.locked = false; this.listeners = {}; this.anim = null;
      this.ptr = { x: -1, y: -1, inside: false }; this.lastInput = 0; this.vel = { x: 0, y: 0 };
      this.pointers = new Map(); this.dragging = false; this.drag = null;
      this.labelRects = []; this.screenStars = []; this.screenObjs = [];
      this.shoot = []; this.nextShoot = performance.now() + 3500; this.rings = []; this.sparks = [];
      this.born = performance.now(); this.t = 0; this.paused = false; this.sun = null;
      this.par = { x: 0, y: 0 }; this.cxE = 0; this.cyE = 0; this.ripples = []; this.nebula = null;
      try { const bgc = document.getElementById('bg'); if (bgc && window.AstraNebula) { const nb = new window.AstraNebula(bgc); if (nb.ok) this.nebula = nb; } } catch (e) { /* 폴백 사용 */ }
      this.build(); this.bind(); this.resize();
      this._raf = this.frame.bind(this); requestAnimationFrame(this._raf);
    }

    on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); return this; }
    emit(ev, p) { (this.listeners[ev] || []).forEach(f => f(p)); }

    /* 장식용 별·은하수·성운(무작위 생성: 실제 별이 아님) */
    build() {
      const rnd = mulberry(20261117);
      const N = 9000; this.bgN = N;
      this.bg = new Float32Array(N * 3); this.bgB = new Float32Array(N); this.bgTw = new Uint8Array(N);
      let i = 0;
      while (i < N) {
        const z = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - z * z);
        const v = [r * Math.cos(a), r * Math.sin(a), z];
        const b = Math.asin(clamp(dot(v, NGP_V), -1, 1));
        const keep = 0.28 + 0.72 * Math.exp(-Math.pow(b / (22 * D2R), 2));
        if (rnd() > keep) continue;
        this.bg[i * 3] = v[0]; this.bg[i * 3 + 1] = v[1]; this.bg[i * 3 + 2] = v[2];
        this.bgB[i] = Math.pow(rnd(), 3.2); // 대부분은 어둡고 소수만 밝다
        this.bgTw[i] = rnd() < 0.012 ? 1 : 0; i++;
      }
      // 밝은 순으로 정렬 → 줌에 따라 앞에서부터 그린다
      const idx = Array.from({ length: N }, (_, k) => k).sort((p, q) => this.bgB[q] - this.bgB[p]);
      const bg2 = new Float32Array(N * 3), b2 = new Float32Array(N), tw2 = new Uint8Array(N);
      idx.forEach((k, j) => { bg2[j * 3] = this.bg[k * 3]; bg2[j * 3 + 1] = this.bg[k * 3 + 1]; bg2[j * 3 + 2] = this.bg[k * 3 + 2]; b2[j] = this.bgB[k]; tw2[j] = this.bgTw[k]; });
      this.bg = bg2; this.bgB = b2; this.bgTw = tw2;

      // 은하수: 은하면을 따라 부드러운 덩어리를 올려 띠를 만든다
      this.mw = [];
      for (let k = 0; k < 760; k++) {
        let l = rnd() * TAU; const dc = Math.abs(((l + Math.PI) % TAU) - Math.PI); // 은하 중심(l=0) 근처 밀도
        if (rnd() > 0.38 + 0.62 * Math.exp(-dc * dc / 0.9)) { k--; continue; }
        const spread = (3.4 + 3.6 * Math.exp(-dc * dc / 0.7)) * D2R;
        const b = (rnd() + rnd() + rnd() - 1.5) * 1.15 * spread;
        const warm = Math.exp(-dc * dc / 0.35);
        this.mw.push({ v: galToEq(l, b), ang: (2.4 + rnd() * 4.2 + warm * 2.2) * D2R, a: (0.018 + rnd() * 0.03) * (0.55 + warm * 0.9), c: rnd() < 0.5 - warm * 0.2 ? '#a9c2ee' : (rnd() < 0.5 + warm * 0.4 ? '#F5E6BE' : '#d8dceb') });
      }
      this.neb = [];
      for (let k = 0; k < 16; k++) {
        const z = rnd() * 2 - 1, a = rnd() * TAU, r = Math.sqrt(1 - z * z);
        this.neb.push({ v: [r * Math.cos(a), r * Math.sin(a), z], ang: (7 + rnd() * 12) * D2R, a: 0.02 + rnd() * 0.03, c: rnd() < 0.55 ? '#d8dceb' : '#a9c2ee' });
      }
      this.bokeh = [];
      for (let k = 0; k < 34; k++) this.bokeh.push({ x: rnd(), y: rnd(), r: 18 + rnd() * 54, a: 0.03 + rnd() * 0.07, z: 0.4 + rnd() * 1.6, dx: (rnd() - 0.5) * 2, dy: 0.4 + rnd(), ph: rnd() * TAU, sp: 0.1 + rnd() * 0.25, c: ['#d8dceb', '#a9c2ee', '#F5E6BE'][Math.floor(rnd() * 3)] });
      // 시차용 화면 공간 먼지 별 3겹
      this.dust = [];
      [[0.10, 190], [0.2, 150], [0.34, 100]].forEach(([f, n], li) => { for (let k = 0; k < n; k++) this.dust.push({ x: rnd(), y: rnd(), f, r: 0.35 + rnd() * 0.5 + li * 0.15, a: 0.15 + rnd() * 0.35 }); });
    }

    resize() {
      const r = this.cv.getBoundingClientRect(); this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
      this.cv.width = Math.round(this.w * this.dpr); this.cv.height = Math.round(this.h * this.dpr);
      const g = this.ctx.createRadialGradient(this.w * 0.5, this.h * 0.42, 0, this.w * 0.5, this.h * 0.42, Math.max(this.w, this.h) * 0.85);
      g.addColorStop(0, '#1a1b21'); g.addColorStop(0.5, '#131419'); g.addColorStop(1, '#0c0d10'); this.bgGrad = g;
      if (!this._insetInit) { this.cx = this.w / 2; this.cy = this.h / 2; this._insetInit = true; }
      if (this.nebula) this.nebula.resize(this.w, this.h, innerWidth <= 860 ? 0.5 : 0.62);
      this.scale = clamp(this.scale, this.minScale(), this.maxScale());
    }
    minScale() { return Math.max(this.w, this.h) / 5.2; }
    maxScale() { return 9000; }
    defaultScale() { return Math.max(this.w, this.h) / 2.15; }

    setInset(i) { Object.assign(this.inset, i); }
    targetCenter() { return [(this.inset.l + (this.w - this.inset.r)) / 2, (this.inset.t + (this.h - this.inset.b)) / 2]; }

    /* ── 투영 ── */
    basis() {
      const ca = Math.cos(this.ra0), sa = Math.sin(this.ra0), cd = Math.cos(this.dec0), sd = Math.sin(this.dec0);
      this.C = [cd * ca, cd * sa, sd]; this.E = [-sa, ca, 0]; this.N = [-sd * ca, -sd * sa, cd];
    }
    project(v, out) {
      const C = this.C, c = v[0] * C[0] + v[1] * C[1] + v[2] * C[2];
      if (c < -0.3) return false;
      const k = 2 / (1 + c), E = this.E, N = this.N;
      out.x = this.cxE - this.scale * k * (v[0] * E[0] + v[1] * E[1] + v[2] * E[2]);
      out.y = this.cyE - this.scale * k * (v[0] * N[0] + v[1] * N[1] + v[2] * N[2]); out.k = k; return true;
    }
    unproject(sx, sy) {
      const X = (this.cxE - sx) / this.scale, Y = (this.cyE - sy) / this.scale, rho = Math.hypot(X, Y);
      if (rho < 1e-9) return this.C.slice();
      const ang = 2 * Math.atan(rho / 2), s = Math.sin(ang) / rho, ca = Math.cos(ang), C = this.C, E = this.E, N = this.N;
      return [ca * C[0] + s * (X * E[0] + Y * N[0]), ca * C[1] + s * (X * E[1] + Y * N[1]), ca * C[2] + s * (X * E[2] + Y * N[2])];
    }
    rotateCenter(from, to) {
      const ax = cross(from, to), s = Math.hypot(ax[0], ax[1], ax[2]); if (s < 1e-10) return;
      const u = [ax[0] / s, ax[1] / s, ax[2] / s], ang = Math.atan2(s, dot(from, to)), c = Math.cos(ang), sn = Math.sin(ang);
      const v = this.C, uxv = cross(u, v), ud = dot(u, v);
      const r = [v[0] * c + uxv[0] * sn + u[0] * ud * (1 - c), v[1] * c + uxv[1] * sn + u[1] * ud * (1 - c), v[2] * c + uxv[2] * sn + u[2] * ud * (1 - c)];
      this.ra0 = (Math.atan2(r[1], r[0]) + TAU) % TAU; this.dec0 = clamp(Math.asin(clamp(r[2], -1, 1)), -1.5, 1.5); this.basis();
    }
    panBy(x0, y0, x1, y1) { this.basis(); this.rotateCenter(this.unproject(x1, y1), this.unproject(x0, y0)); }
    zoomAt(factor, mx, my) {
      this.basis(); const a = this.unproject(mx, my);
      this.scale = clamp(this.scale * factor, this.minScale(), this.maxScale()); this.basis();
      this.rotateCenter(this.unproject(mx, my), a);
    }
    zoomBy(f) { if (this.locked) return; this.cancelAnim(); const [cx, cy] = this.targetCenter(); this.zoomAt(f, cx, cy); this.lastInput = performance.now(); }

    /* ── 카메라 비행 ── */
    cancelAnim() { this.anim = null; }
    flyTo(ra, dec, scale, dur) {
      this.basis(); const from = this.C.slice(), to = vec(ra / H2R, dec / D2R);
      const dist = Math.acos(clamp(dot(from, to), -1, 1));
      this.anim = { t0: performance.now(), dur: dur || clamp(900 + dist * 1500, 1000, 2600), from, to, dist, s0: Math.log(this.scale), s1: Math.log(clamp(scale, this.minScale(), this.maxScale())) };
    }
    fitScale(c) {
      const [availW, availH] = [this.w - this.inset.l - this.inset.r, this.h - this.inset.t - this.inset.b];
      const r = Math.max(c.radius, 0.1) * 1.32, X = 2 * Math.tan(r / 2);
      return clamp(0.5 * Math.min(availW, availH) * 0.9 / X, this.minScale(), this.maxScale());
    }
    flyToConstellation(id, dur) { const c = consById[id]; if (!c) return; this.flyTo(c.ra, c.dec, this.fitScale(c), dur); }
    flyHome() { this.flyTo(4.6 * H2R, 12 * D2R, this.defaultScale(), 2200); }
    flyToStar(uid) { const s = starByUid[uid]; if (s) this.flyTo(s.ra * H2R, s.dec * D2R, Math.max(this.scale, 1500), 1500); }

    setSelected(id) { if (this.sel !== id) { this.sel = id; this.selT0 = performance.now(); } }
    setSelectedStar(uid) { this.selStar = uid; if (uid) this.rings.push({ uid, t0: performance.now(), dur: 1400 }); }
    pulse(uid, dur) { this.rings.push({ uid, t0: performance.now(), dur: dur || 1100 }); }
    burst(uid, n, col) {
      const s = starByUid[uid]; if (!s) return; this.basis(); const p = {}; if (!this.project(s.v, p)) return;
      for (let i = 0; i < (n || 14); i++) { const a = Math.random() * TAU, sp = 20 + Math.random() * 60; this.sparks.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t0: performance.now(), life: 700 + Math.random() * 700, col: col || '#F5E6BE' }); }
    }

    /* ── 입력 ── */
    bind() {
      const cv = this.cv; const P = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      cv.addEventListener('pointerdown', e => {
        try { cv.setPointerCapture(e.pointerId); } catch (_) { /* 합성 포인터 */ } this.pointers.set(e.pointerId, { x: P(e).x, y: P(e).y });
        this.cancelAnim(); this.lastInput = performance.now(); this.vel = { x: 0, y: 0 };
        if (this.pointers.size === 1) { this.drag = { x: P(e).x, y: P(e).y, sx: P(e).x, sy: P(e).y, t: performance.now(), moved: false }; if (this.connect) { const st = this.pick(P(e).x, P(e).y, e.pointerType === 'touch'); if (st) this.drag.linkFrom = st; } }
        else { this.drag && (this.drag.moved = true); const [a, b] = [...this.pointers.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; }
      });
      cv.addEventListener('pointermove', e => {
        this.ptr = { x: P(e).x, y: P(e).y, inside: true }; this.lastInput = performance.now();
        if (!this.pointers.has(e.pointerId)) return;
        const prev = this.pointers.get(e.pointerId); this.pointers.set(e.pointerId, { x: P(e).x, y: P(e).y });
        if (this.pointers.size >= 2) {
          const [a, b] = [...this.pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (this.pinch && this.pinch.d > 0 && !this.locked) this.zoomAt(d / this.pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
          this.pinch = { d }; return;
        }
        if (!this.drag) return;
        if (this.drag.linkFrom) { if (!this.drag.linking && Math.hypot(P(e).x - this.drag.sx, P(e).y - this.drag.sy) > (e.pointerType === 'touch' ? 12 : 9)) { this.drag.linking = true; this.drag.moved = true; this.emit('linkstart', { star: this.drag.linkFrom }); } return; }
        if (!this.drag.moved && Math.hypot(P(e).x - this.drag.sx, P(e).y - this.drag.sy) > (e.pointerType === 'touch' ? 10 : 6)) { this.drag.moved = true; this.dragging = true; cv.classList.add('grabbing'); }
        if (this.drag.moved && !this.locked) { this.panBy(prev.x, prev.y, P(e).x, P(e).y); this.vel = { x: P(e).x - prev.x, y: P(e).y - prev.y }; }
      });
      const up = e => {
        const was = this.pointers.has(e.pointerId); this.pointers.delete(e.pointerId); if (!was) return;
        if (this.pointers.size < 2) this.pinch = null;
        if (this.pointers.size === 0 && this.drag) {
          const d = this.drag; this.drag = null; this.dragging = false; cv.classList.remove('grabbing');
          if (d.linking) { this.emit('linkend', { from: d.linkFrom, to: e.type === 'pointercancel' ? null : this.nearStar(P(e).x, P(e).y, 34) }); return; }
          if (e.type !== 'pointercancel' && !d.moved && performance.now() - d.t < (e.pointerType === 'touch' ? 2200 : 600)) this.handleClick(P(e).x, P(e).y, e.pointerType);
          else if (d.moved && !this.locked) { this.inertia = { x: this.vel.x, y: this.vel.y, px: P(e).x, py: P(e).y }; }
        }
      };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('pointerleave', () => { this.ptr.inside = false; this.setHover(null); });
      cv.addEventListener('wheel', e => { e.preventDefault(); if (this.locked) return; this.cancelAnim(); this.lastInput = performance.now(); this.zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)), P(e).x, P(e).y); }, { passive: false });
      cv.addEventListener('dblclick', e => { if (this.locked) return; this.cancelAnim(); this.zoomAt(1.8, P(e).x, P(e).y); });
      window.addEventListener('resize', () => this.resize());
      document.addEventListener('visibilitychange', () => { this.paused = document.hidden; if (!this.paused) requestAnimationFrame(this._raf); });
    }
    pick(x, y, touch) {
      const rad = touch ? 26 : 16; let best = null, bd = 1e9;
      for (const s of this.screenStars) { const d = Math.hypot(s.x - x, s.y - y); const lim = Math.max(rad, s.r + 8); if (d < lim && d < bd) { bd = d; best = s; } }
      return best ? best.s : null;
    }
    nearStar(x, y, rad) { let best = null, bd = rad; for (const s of this.screenStars) { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } } return best ? best.s : null; }
    starXY(uid) { for (const s of this.screenStars) if (s.s.uid === uid) return { x: s.x, y: s.y }; return null; }
    pickObj(x, y) { for (const o of this.screenObjs) if (Math.hypot(o.x - x, o.y - y) < Math.max(14, o.r + 6)) return o.o; return null; }
    pickLabel(x, y) { for (const l of this.labelRects) if (x > l.x0 && x < l.x1 && y > l.y0 && y < l.y1) return l.id; return null; }
    handleClick(x, y, ptype) {
      const star = this.pick(x, y, ptype === 'touch'); const obj = star ? null : this.pickObj(x, y);
      const con = star || obj ? null : this.pickLabel(x, y);
      if (!star && !obj && !con) this.ripples.push({ x, y, t0: performance.now() });
      this.emit('click', { star, obj, con, x, y, touch: ptype === 'touch' });
    }
    setHover(uid) { if (this.hoverUid !== uid) { this.hoverUid = uid; this.cv.style.cursor = uid ? 'pointer' : ''; this.emit('hover', { uid, star: uid ? starByUid[uid] : null }); } }

    /* ── 프레임 ── */
    frame(now) {
      if (this.paused) return;
      const dt = Math.min(0.05, (now - (this._last || now)) / 1000); this._last = now; this.t = now / 1000;
      this.update(now, dt); this.draw(now, dt);
      requestAnimationFrame(this._raf);
    }
    update(now, dt) {
      const [tx, ty] = this.targetCenter(); const k = 1 - Math.pow(0.0016, dt);
      this.cx = lerp(this.cx, tx, k); this.cy = lerp(this.cy, ty, k);
      const kp = 1 - Math.pow(0.03, dt), sway = reduceMotion ? 0 : 1;
      const ptx = (this.ptr.inside ? (this.ptr.x / this.w - 0.5) * -16 : 0) + Math.sin(now / 5200) * 5 * sway, pty = (this.ptr.inside ? (this.ptr.y / this.h - 0.5) * -12 : 0) + Math.cos(now / 6300) * 4 * sway;
      this.par.x = lerp(this.par.x, ptx, kp); this.par.y = lerp(this.par.y, pty, kp);
      this.cxE = this.cx + this.par.x; this.cyE = this.cy + this.par.y;
      if (this.anim) {
        const a = this.anim, t = clamp((now - a.t0) / a.dur, 0, 1), e = ease(t);
        const ang = a.dist, s = ang < 1e-6 ? 1 : Math.sin(ang);
        const w0 = ang < 1e-6 ? 1 - e : Math.sin((1 - e) * ang) / s, w1 = ang < 1e-6 ? e : Math.sin(e * ang) / s;
        const v = norm([a.from[0] * w0 + a.to[0] * w1, a.from[1] * w0 + a.to[1] * w1, a.from[2] * w0 + a.to[2] * w1]);
        this.ra0 = (Math.atan2(v[1], v[0]) + TAU) % TAU; this.dec0 = Math.asin(clamp(v[2], -1, 1));
        const bump = Math.min(0.75, a.dist * 0.55);
        this.scale = clamp(Math.exp(lerp(a.s0, a.s1, e) - bump * Math.sin(Math.PI * e)), this.minScale(), this.maxScale());
        if (t >= 1) this.anim = null;
      } else if (this.inertia && !this.dragging) {
        const i = this.inertia; i.x *= 0.93; i.y *= 0.93;
        if (Math.hypot(i.x, i.y) < 0.15) this.inertia = null; else { this.basis(); this.panBy(i.px, i.py, i.px + i.x, i.py + i.y); }
      } else if (!reduceMotion && this.opts.drift && !this.dragging && now - this.lastInput > 3500 && !this.sel) {
        this.ra0 = (this.ra0 + dt * 0.0035) % TAU;
      }
      this.basis();
      // 호버 선택
      if (this.ptr.inside && !this.dragging && this.pointers.size === 0) { const s = this.pick(this.ptr.x, this.ptr.y, false); this.setHover(s ? s.uid : null); }
    }

    draw(now, dt) {
      const ctx = this.ctx, w = this.w, h = this.h; ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const fade = clamp((now - this.born) / 2400, 0, 1); const t = this.t;
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      const useGL = !!(this.nebula && this.nebula.ok);
      if (useGL) { this.nebula.draw({ cx: this.cx + this.par.x * 0.3, cy: this.cy + this.par.y * 0.3, scale: this.scale * 0.985, C: this.C, E: this.E, N: this.N, GC: GC_V, GY: GY_V, NGP: NGP_V, time: this.t, fade }); ctx.clearRect(0, 0, w, h); }
      else { ctx.fillStyle = this.bgGrad; ctx.fillRect(0, 0, w, h); }
      const p = { x: 0, y: 0, k: 1 }, sc = this.scale, cosDec = Math.cos(this.dec0);

      /* 떠다니는 빛 입자(보케) + 커서 주변의 은은한 빛 */
      ctx.globalCompositeOperation = 'lighter';
      for (const b of this.bokeh) {
        const al = b.a * (0.5 + 0.5 * Math.sin(this.t * b.sp * 2 + b.ph)) * fade;
        const x = ((b.x * w + this.t * b.dx * 7 + this.par.x * b.z * 2.4) % w + w) % w, y = (((b.y * h - this.t * b.dy * 6 + this.par.y * b.z * 2.4) % h) + h) % h;
        ctx.globalAlpha = al; ctx.drawImage(softSprite(b.c), x - b.r, y - b.r, b.r * 2, b.r * 2);
      }
      if (this.ptr.inside && !reduceMotion) { ctx.globalAlpha = 0.09; ctx.drawImage(softSprite('#d8dceb'), this.ptr.x - 170, this.ptr.y - 170, 340, 340); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

      /* 시차 먼지별 */
      ctx.fillStyle = '#cfd6f5';
      for (const d of this.dust) {
        const ox = this.ra0 * cosDec * sc * d.f * 0.9 + t * 1.6 * d.f * 8, oy = -this.dec0 * sc * d.f * 0.9;
        const x = (((d.x * w + ox) % w) + w) % w, y = (((d.y * h + oy) % h) + h) % h;
        ctx.globalAlpha = d.a * fade * 0.55; ctx.fillRect(x, y, d.r * 1.6, d.r * 1.6);
      }
      ctx.globalAlpha = 1;

      /* 성운 + 은하수 */
      ctx.globalCompositeOperation = 'lighter';
      const blobs = [this.neb, this.mw];
      if (!useGL) for (const list of blobs) for (const b of list) {
        if (!this.project(b.v, p)) continue; const r = b.ang * sc * p.k * 0.5 * 1.5; if (r < 4 || r > 1600) continue;
        if (p.x < -r || p.x > w + r || p.y < -r || p.y > h + r) continue;
        ctx.globalAlpha = b.a * fade * (this.opts.grid ? 0.8 : 1); ctx.drawImage(softSprite(b.c), p.x - r, p.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

      /* 격자 · 황도 */
      if (this.opts.grid) this.drawGrid(ctx);
      if (this.opts.ecliptic) this.drawEcliptic(ctx, now);

      /* 장식용 배경 별 */
      const count = Math.floor(clamp(2400 * Math.pow(sc / 650, 1.15), 1700, this.bgN));
      const buckets = [[], [], [], []];
      for (let i = 0; i < count; i++) {
        const o = i * 3; const v = [this.bg[o], this.bg[o + 1], this.bg[o + 2]];
        if (!this.project(v, p)) continue; if (p.x < -4 || p.x > w + 4 || p.y < -4 || p.y > h + 4) continue;
        const b = this.bgB[i];
        if (this.bgTw[i] && !reduceMotion) { ctx.globalAlpha = (0.35 + 0.65 * b) * (0.65 + 0.35 * Math.sin(t * 1.8 + i)) * fade; ctx.fillStyle = '#e8eaf2'; ctx.fillRect(p.x - 0.7, p.y - 0.7, 1.5, 1.5); continue; }
        if (b > 0.42) { const r = 0.7 + b * 1.1; ctx.globalAlpha = (0.45 + b * 0.5) * fade; ctx.drawImage(glowSprite('#dfe5ff'), p.x - r * 3, p.y - r * 3, r * 6, r * 6); continue; }
        buckets[b > 0.2 ? 3 : b > 0.1 ? 2 : b > 0.04 ? 1 : 0].push(p.x, p.y);
      }
      const bAlpha = [0.3, 0.42, 0.56, 0.72], bSz = [0.9, 1.0, 1.15, 1.3]; ctx.fillStyle = '#dfe4f7';
      for (let k = 0; k < 4; k++) { const arr = buckets[k]; if (!arr.length) continue; ctx.globalAlpha = bAlpha[k] * fade; ctx.beginPath(); for (let j = 0; j < arr.length; j += 2) ctx.rect(arr[j], arr[j + 1], bSz[k], bSz[k]); ctx.fill(); }
      ctx.globalAlpha = 1;

      /* 별자리 선 */
      this.drawConstellationLines(ctx, now);

      /* 심우주 천체 */
      this.drawObjects(ctx, now);

      /* 카탈로그 별 */
      this.drawStars(ctx, now, fade);

      /* 별 잇기 모드 오버레이 */
      if (this.mine && this.mine.length) this.drawMine(ctx, now);
      if (this.connect) this.drawConnect(ctx, now);

      /* 링·불꽃 */
      this.drawEffects(ctx, now, dt);

      /* 라벨 */
      this.drawLabels(ctx, now);

      /* 유성 */
      this.drawShooting(ctx, now, dt);

      /* 비네트 */
      ctx.globalAlpha = 1; const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.78);
      vg.addColorStop(0, 'rgba(6,7,10,0)'); vg.addColorStop(1, 'rgba(6,7,10,0.34)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    }

    polyline(ctx, vecFn, n, maxJump) {
      const p = {}; let pen = false, lx = 0, ly = 0; ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        if (!this.project(vecFn(i / n), p)) { pen = false; continue; }
        if (pen && Math.hypot(p.x - lx, p.y - ly) > (maxJump || 300)) pen = false;
        if (pen) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); pen = true; lx = p.x; ly = p.y;
      }
      ctx.stroke();
    }
    drawGrid(ctx) {
      ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(169,194,238,0.14)'; ctx.setLineDash([]);
      for (let hr = 0; hr < 24; hr += 2) this.polyline(ctx, u => vec(hr, -90 + 180 * u), 90);
      for (let d = -75; d <= 75; d += 15) { if (d === 0) continue; this.polyline(ctx, u => vec(24 * u, d), 120); }
      ctx.strokeStyle = 'rgba(216,220,235,0.28)'; ctx.setLineDash([2, 5]); this.polyline(ctx, u => vec(24 * u, 0), 160); ctx.setLineDash([]);
    }
    drawEcliptic(ctx, now) {
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(245,230,190,0.32)'; ctx.setLineDash([6, 7]); ctx.lineDashOffset = -now / 140;
      this.polyline(ctx, u => eclipticVec(360 * u), 240); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      const sun = this.sun || (this.sun = sunPosition(new Date())); const p = {};
      if (this.project(sun.v, p)) {
        const pulse = 1 + 0.06 * Math.sin(this.t * 1.6), r = 34 * pulse;
        ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#F5E6BE'), p.x - r * 2.2, p.y - r * 2.2, r * 4.4, r * 4.4);
        ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#fff6df'; ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, TAU); ctx.fill();
        ctx.font = `500 10px ${SANS}`; ctx.fillStyle = 'rgba(245,230,190,0.9)'; ctx.textAlign = 'center'; ctx.letterSpacing = '0.22em';
        ctx.fillText('SUN TODAY', p.x, p.y + 30); ctx.letterSpacing = '0px';
      }
    }

    starRadius(mag) { const z = clamp(Math.pow(this.scale / 650, 0.32), 0.85, 1.9); return clamp(3.7 - mag * 0.62, 0.95, 3.8) * z; }

    drawConstellationLines(ctx, now) {
      const p1 = {}, p2 = {}; ctx.lineCap = 'round';
      const edgeLine = (a, b, prog, wide, alpha, col) => {
        const A = starByUid[a], B = starByUid[b]; if (!this.project(A.v, p1) || !this.project(B.v, p2)) return;
        const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.hypot(dx, dy); if (len < 2) return;
        const g1 = Math.min(len * 0.4, this.starRadius(A.mag) + 4), g2 = Math.min(len * 0.4, this.starRadius(B.mag) + 4);
        const ux = dx / len, uy = dy / len, sx = p1.x + ux * g1, sy = p1.y + uy * g1;
        const full = Math.max(0, len - g1 - g2), ex = sx + ux * full * prog, ey = sy + uy * full * prog;
        if (wide) { ctx.strokeStyle = hexA(col, alpha * 0.16); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); }
        ctx.strokeStyle = hexA(col, alpha); ctx.lineWidth = wide ? 1.3 : 0.8; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        this._le = { sx, sy, ex, ey };
      };
      if (this.opts.lines) {
        const fadeAll = clamp(1.4 - this.scale / 4500, 0.25, 1);
        for (const c of cons) { if (c.id === this.sel) continue; if (this.opts.lineSet && !this.opts.lineSet.has(c.id)) continue; for (const e of c.edges) edgeLine(e[0], e[1], 1, false, 0.26 * fadeAll * (this.sel ? 0.55 : 1), '#d8dceb'); }
      }
      const c = this.sel && consById[this.sel];
      if (c && !(this.connect && this.connect.hideSel)) {
        const el = (now - this.selT0) / 1000;
        c.edges.forEach((e, i) => {
          const prog = ease(clamp((el - 0.25 - i * 0.11) / 0.55, 0, 1)); if (prog <= 0) return;
          edgeLine(e[0], e[1], prog, true, 0.9, '#F5E6BE');
          if (prog >= 1 && this._le && !reduceMotion) {
            const ph = ((now / 3600) + i * 0.173) % 1, L = this._le, px = lerp(L.sx, L.ex, ph), py = lerp(L.sy, L.ey, ph), fa = Math.sin(ph * Math.PI);
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fa; ctx.drawImage(glowSprite('#fff3d6'), px - 11, py - 11, 22, 22); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          }
        });
      }
    }

    drawObjects(ctx, now) {
      this.screenObjs.length = 0; const p = {};
      for (const c of cons) for (const o of (c.objects || [])) {
        if (!this.project(o.v, p)) continue; if (p.x < -80 || p.x > this.w + 80 || p.y < -80 || p.y > this.h + 80) continue;
        const rr = Math.max(o.size * D2R * this.scale * p.k * 0.5, 7), hot = this.selObj === o.uid;
        const dim = this.sel && this.sel !== c.id ? 0.5 : 1;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (o.k === 'm31' ? 0.5 : 0.42) * dim;
        const col = /nebula/i.test(o.type) ? '#d8dceb' : /galaxy/i.test(o.type) ? '#a9c2ee' : '#dbe4f4';
        if (o.k === 'm31') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-0.65); ctx.scale(1, 0.34); ctx.drawImage(softSprite(col), -rr * 1.15, -rr * 1.15, rr * 2.3, rr * 2.3); ctx.restore(); }
        else ctx.drawImage(softSprite(col), p.x - rr * 1.6, p.y - rr * 1.6, rr * 3.2, rr * 3.2);
        ctx.globalCompositeOperation = 'source-over';
        // 작은 표식
        ctx.globalAlpha = (hot ? 0.95 : 0.5) * dim; ctx.strokeStyle = '#cfd8f5'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(rr * 0.9, 9) + (hot ? 2 : 0), 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        this.screenObjs.push({ o, x: p.x, y: p.y, r: rr });
        if (this.scale > 800 || hot || this.sel === c.id) {
          ctx.font = `400 10px ${SANS}`; ctx.fillStyle = `rgba(207,216,245,${0.72 * dim})`; ctx.textAlign = 'left'; ctx.letterSpacing = '0.1em';
          ctx.fillText(`${o.en} · ${o.ko}`, p.x + Math.max(rr * 0.9, 9) + 6, p.y + 3); ctx.letterSpacing = '0px';
        }
      }
    }

    drawStars(ctx, now, fade) {
      this.screenStars.length = 0; const p = {}, t = this.t; const selC = this.sel && consById[this.sel];
      const conn = this.connect;
      for (const s of catalog) {
        if (!this.project(s.v, p)) continue; if (p.x < -40 || p.x > this.w + 40 || p.y < -40 || p.y > this.h + 40) continue;
        const r = this.starRadius(s.mag); const inSel = selC && s.con === selC.id; const hover = this.hoverUid === s.uid, isSel = this.selStar === s.uid;
        let alpha = 1; if (selC && !inSel) alpha = 0.62;
        const tw = reduceMotion ? 1 : 1 + (inSel || hover || isSel ? 0.16 : 0.035) * Math.sin(t * (1.7 + (s.phase % 1)) + s.phase) + (inSel ? 0.06 * Math.sin(t * 5.3 + s.phase * 2) : 0);
        let prox = 0; if (this.ptr.inside) { const dd = Math.hypot(p.x - this.ptr.x, p.y - this.ptr.y); if (dd < 150) prox = 1 - dd / 150; }
        const boost = (inSel ? 1.25 : 1) * (hover || isSel ? 1.35 : 1) * (1 + prox * 0.45);
        const R = r * boost * tw;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * fade * 0.6;
        const gs = R * (s.mag < 1.5 ? 6 : 5); ctx.drawImage(glowSprite(s.col), p.x - gs, p.y - gs, gs * 2, gs * 2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * fade; ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.9, R * 0.62), 0, TAU); ctx.fill();
        if (s.mag < 2.9) { // 인쇄 지도의 별 기호: 밝을수록 뾰족한 빛살이 많다
          const rays = s.mag < 1.2 ? 8 : s.mag < 2.1 ? 6 : 4, L = R * (s.mag < 1.2 ? 4.6 : s.mag < 2.1 ? 3.4 : 2.6) * (0.9 + 0.1 * tw);
          ctx.globalAlpha = alpha * fade; ctx.fillStyle = '#fffaf0'; ctx.beginPath();
          for (let k = 0; k < rays * 2; k++) { const a = -Math.PI / 2 + k * Math.PI / rays, rr = k % 2 ? L * 0.26 : L; ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); }
          ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1; this.screenStars.push({ s, x: p.x, y: p.y, r: R });
        // 선택·호버 고리
        if (isSel || hover) {
          ctx.strokeStyle = isSel ? 'rgba(245,230,190,0.95)' : 'rgba(232,234,242,0.6)'; ctx.lineWidth = 1; ctx.beginPath();
          ctx.arc(p.x, p.y, R * 2.4 + 6, 0, TAU); ctx.setLineDash(isSel ? [3, 5] : []); ctx.lineDashOffset = -now / 90; ctx.stroke(); ctx.setLineDash([]);
        }
        // 이름
        const showName = hover || isSel || (this.opts.starNames && s.mag < 3.1) || (inSel) || (this.scale > 1700 && s.mag < 2.6) || (this.scale > 3400 && s.mag < 3.7);
        if (showName && !(conn && conn.hideNames)) {
          ctx.font = `${isSel || hover ? 600 : 400} ${isSel || hover ? 12 : 11}px ${SANS}`; ctx.textAlign = 'left';
          ctx.fillStyle = isSel ? 'rgba(245,230,190,1)' : `rgba(222,228,246,${(hover ? 1 : 0.78) * alpha})`; ctx.fillText(s.ko.split(' (')[0], p.x + R * 2.4 + 8, p.y + 4);
        }
      }
    }

    /* the viewer's own constellations: pale-blue lines with an italic name */
    drawMine(ctx, now) {
      const p1 = {}, p2 = {}; ctx.lineCap = 'round';
      for (const m of this.mine) {
        let cx = 0, cy = 0, n = 0, top = 1e9; const seen = new Set();
        for (const [a, b] of m.edges) {
          const A = starByUid[a], B = starByUid[b]; if (!A || !B || !this.project(A.v, p1) || !this.project(B.v, p2)) continue;
          const hot = this.hoverMine === m.id;
          ctx.strokeStyle = hexA('#a9c2ee', hot ? 0.28 : 0.14); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
          ctx.strokeStyle = hexA('#cfe0ff', hot ? 1 : 0.8); ctx.lineWidth = 1.3; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
          for (const [u, q] of [[a, p1], [b, p2]]) if (!seen.has(u)) { seen.add(u); cx += q.x; cy += q.y; n++; top = Math.min(top, q.y); }
        }
        if (n && cx / n > 0 && cx / n < this.w && cy / n > 0 && cy / n < this.h) {
          ctx.globalAlpha = 0.95; ctx.fillStyle = '#cfe0ff'; ctx.textAlign = 'center'; ctx.font = `italic 400 22px ${SERIF}`; ctx.fillText(m.name, cx / n, top - 18);
          ctx.font = `400 8.5px ${MONO}`; ctx.fillStyle = 'rgba(207,224,255,.65)'; ctx.fillText('MY CONSTELLATION', cx / n, top - 4); ctx.globalAlpha = 1;
        }
      }
    }

    drawConnect(ctx, now) {
      const cn = this.connect, p1 = {}, p2 = {}; ctx.lineCap = 'round';
      // 힌트
      if (cn.hints) for (const uid of cn.hints) {
        const s = starByUid[uid]; if (!s || !this.project(s.v, p1)) continue; const ph = (now / 1200) % 1;
        ctx.strokeStyle = `rgba(216,220,235,${0.65 * (1 - ph)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p1.x, p1.y, 10 + ph * 18, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(216,220,235,0.55)'; ctx.beginPath(); ctx.arc(p1.x, p1.y, 12, 0, TAU); ctx.stroke();
      }
      // 사용자가 그은 선
      for (const e of cn.edges) {
        const A = starByUid[e.a], B = starByUid[e.b]; if (!A || !B || !this.project(A.v, p1) || !this.project(B.v, p2)) continue;
        const age = (now - e.t0) / 1000, prog = ease(clamp(age / 0.55, 0, 1));
        let alpha = 1; if (e.state === 'wrong') alpha = clamp(1 - (age - 0.5) / 0.9, 0, 1);
        if (alpha <= 0) continue;
        const col = e.state === 'wrong' ? '#D99A9A' : '#F5E6BE';
        const ex = lerp(p1.x, p2.x, prog), ey = lerp(p1.y, p2.y, prog);
        ctx.strokeStyle = hexA(col, 0.16 * alpha); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = hexA(col, 0.95 * alpha); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(ex, ey); ctx.stroke();
        if (prog < 1) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite(col), ex - 14, ey - 14, 28, 28); ctx.globalCompositeOperation = 'source-over'; }
      }
      // 대기 중인 별 + 고무줄
      if (cn.pending) {
        const s = starByUid[cn.pending];
        if (s && this.project(s.v, p1)) {
          const ph = (now / 900) % 1; ctx.strokeStyle = 'rgba(245,230,190,0.95)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p1.x, p1.y, 11, 0, TAU); ctx.stroke();
          ctx.strokeStyle = `rgba(245,230,190,${0.6 * (1 - ph)})`; ctx.beginPath(); ctx.arc(p1.x, p1.y, 11 + ph * 22, 0, TAU); ctx.stroke();
          if (this.ptr.inside && this.pointers.size === 0 || (this.ptr.inside && !this.dragging)) {
            let tx = this.ptr.x, ty = this.ptr.y; const hs = this.nearStar(tx, ty, 36), hxy = hs && hs.uid !== cn.pending && this.starXY(hs.uid);
            if (hxy) { tx = hxy.x; ty = hxy.y; }
            ctx.setLineDash([3, 6]); ctx.lineDashOffset = -now / 60; ctx.strokeStyle = 'rgba(255,240,200,0.9)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
          }
        }
      }
      // 완성 연출: 전체를 서서히 빛나게
      if (cn.celebrate) {
        const c = consById[cn.celebrate.con], age = (now - cn.celebrate.t0) / 1000;
        for (const e of c.edges) {
          const A = starByUid[e[0]], B = starByUid[e[1]]; if (!this.project(A.v, p1) || !this.project(B.v, p2)) continue;
          const a = clamp(age / 0.8, 0, 1) * (0.5 + 0.2 * Math.sin(age * 2.4)); ctx.strokeStyle = hexA('#F5E6BE', a * 0.35); ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }
      }
    }

    drawEffects(ctx, now, dt) {
      const p = {};
      this.rings = this.rings.filter(r => now - r.t0 < r.dur);
      for (const r of this.rings) {
        const s = starByUid[r.uid]; if (!s || !this.project(s.v, p)) continue; const k = (now - r.t0) / r.dur;
        ctx.strokeStyle = `rgba(245,230,190,${0.8 * (1 - k)})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p.x, p.y, 8 + ease(k) * 46, 0, TAU); ctx.stroke();
      }
      this.ripples = this.ripples.filter(r => now - r.t0 < 1100);
      for (const r of this.ripples) { const k = (now - r.t0) / 1100; ctx.strokeStyle = `rgba(216,220,235,${0.5 * (1 - k)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(r.x, r.y, 6 + ease(k) * 40, 0, TAU); ctx.stroke(); }
      this.sparks = this.sparks.filter(s => now - s.t0 < s.life);
      for (const s of this.sparks) {
        const k = (now - s.t0) / s.life, x = s.x + s.vx * k * 1.4, y = s.y + s.vy * k * 1.4 + 18 * k * k;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - k) * 0.9; ctx.drawImage(glowSprite(s.col), x - 5, y - 5, 10, 10);
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }

    drawLabels(ctx, now) {
      this.labelRects.length = 0; if (!this.opts.labels || this.opts.hideConLabels) return;
      const p = {}; ctx.textAlign = 'center'; const sc = this.scale;
      const zoomFade = clamp(1.7 - sc / 3600, 0, 1);
      for (const c of cons) {
        if (this.opts.labelSet && !this.opts.labelSet.has(c.id)) continue;
        if (!this.project(c.cv, p)) continue; if (p.x < -60 || p.x > this.w + 60 || p.y < -30 || p.y > this.h + 30) continue;
        const isSel = this.sel === c.id; const ta = isSel ? 1 : (this.sel ? 0.34 : 0.92) * zoomFade; c._la = lerp(c._la == null ? 0 : c._la, ta, 0.07); const a = c._la; if (a < 0.03) continue;
        const sz = isSel ? 32 : 22; let y = p.y - 6;
        if (isSel) { let top = p.y; const q = {}; for (const st of c.stars) if (this.project(st.v, q)) top = Math.min(top, q.y); y = Math.max(top - 50, 96); }
        ctx.font = `italic 400 ${sz}px ${SERIF}`; ctx.letterSpacing = '0.01em'; ctx.fillStyle = isSel ? `rgba(244,236,216,${a})` : `rgba(241,234,214,${a})`;
        ctx.fillText(c.ko, p.x, y); const tw = ctx.measureText(c.ko).width;
        ctx.font = `400 ${isSel ? 9.5 : 8.5}px ${MONO}`; ctx.letterSpacing = '0.26em'; ctx.fillStyle = `rgba(216,220,235,${a * 0.9})`; ctx.fillText(c.latin.toUpperCase(), p.x, y + (isSel ? 19 : 15)); ctx.letterSpacing = '0px';
        if (!isSel && a > 0.1) { ctx.strokeStyle = `rgba(216,220,235,${a * 0.35})`; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(p.x, y + 22); ctx.lineTo(p.x, y + 30); ctx.stroke(); }
        this.labelRects.push({ id: c.id, x0: p.x - tw / 2 - 6, x1: p.x + tw / 2 + 6, y0: y - sz, y1: y + 24 });
      }
      ctx.letterSpacing = '0px';
    }

    drawShooting(ctx, now, dt) {
      if (!reduceMotion && now > this.nextShoot && !this.dragging) {
        const w = this.w, h = this.h, ang = (0.45 + Math.random() * 0.35) * Math.PI, len = 140 + Math.random() * 180;
        this.shoot.push({ x: Math.random() * w * 0.9 + w * 0.1, y: Math.random() * h * 0.4, dx: Math.cos(ang), dy: Math.sin(ang), len, t0: now, life: 650 + Math.random() * 450 });
        this.nextShoot = now + 4500 + Math.random() * 6500;
      }
      this.shoot = this.shoot.filter(s => now - s.t0 < s.life);
      for (const s of this.shoot) {
        const k = (now - s.t0) / s.life, head = ease(k) * s.len * 2.4, tail = Math.max(0, head - s.len);
        const hx = s.x + s.dx * head, hy = s.y + s.dy * head, tx = s.x + s.dx * tail, ty = s.y + s.dy * tail;
        const g = ctx.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, 'rgba(245,230,190,0)'); g.addColorStop(1, `rgba(255,248,230,${0.9 * (1 - k * 0.6)})`);
        ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite('#F5E6BE'), hx - 8, hy - 8, 16, 16); ctx.globalCompositeOperation = 'source-over';
      }
    }

    /* 현재 화면 중심의 하늘 좌표(HUD 용) */
    centerCoords() { return { ra: this.ra0 / H2R, dec: this.dec0 / D2R }; }
    visibleCount() { return this.screenStars.length; }
  }

  window.AstraSky = { Sky, consById, starByUid, objByUid, catalog, edgeKey, sunPosition, hexA, SERIF, SANS, MONO };
})();
