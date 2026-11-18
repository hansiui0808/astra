/* ASTRA — 손 동작 컨트롤 (MediaPipe Hand Landmarker)
 *
 * 엄지와 검지 끝을 모으면(핀치) 마우스를 누른 것과 같고, 손을 움직이면 하늘이 따라온다.
 *   · 검지 끝 근처가 커서  · 짧게 핀치 = 클릭(별 선택)  · 핀치한 채로 이동 = 드래그(하늘 이동)
 *   · 두 손을 모두 핀치하고 벌리거나 모으면 확대/축소
 * 카메라와 모델 파일이 필요하다. 모델은 처음 켤 때 CDN에서 내려받는다.
 * (claude.ai 미리보기처럼 카메라·외부 연결이 막힌 곳에서는 시작할 수 없고, 그때는 안내 문구만 보여 준다.)
 */
(function () {
  'use strict';
  const VER = '0.10.14';
  const BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}`;
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  const PINCH_ON = 0.28, PINCH_OFF = 0.5; // thumb–index distance relative to hand size (hysteresis)
  const HOLD = { pinch: 70, fist: 240, open: 80, peace: 220, thumb: 450 }; // ms a pose must hold before it counts
  class OneEuro { // adaptive low-pass: heavy smoothing when slow, quick when the hand really moves
    constructor(mc, beta) { this.mc = mc; this.beta = beta; this.reset(); }
    reset() { this.x = null; this.dx = 0; this.t = 0; }
    al(cut, dt) { const tau = 1 / (2 * Math.PI * cut); return 1 / (1 + tau / dt); }
    f(v, t, mc) {
      if (this.x == null) { this.x = v; this.dx = 0; this.t = t; return v; }
      const dt = Math.max((t - this.t) / 1000, 1 / 120); this.t = t;
      this.dx += ((v - this.x) / dt - this.dx) * this.al(1, dt);
      this.x += (v - this.x) * this.al((mc || this.mc) + this.beta * Math.abs(this.dx), dt); return this.x;
    }
  }
  const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];

  class HandControl {
    constructor(sky, ui) {
      this.sky = sky; this.ui = ui || {}; this.active = false; this.loading = false;
      this.hands = [{ pinched: false, zpinch: false, x: 0, y: 0, has: false }, { pinched: false, zpinch: false, x: 0, y: 0, has: false }]; this.uiTarget = null; this.zy = null; this.hov = null;
      this.pE = { x: new OneEuro(0.9, 0.02), y: new OneEuro(0.9, 0.02) }; this.fE = new OneEuro(0.7, 0.01); this.zv = 0; this.snapUid = null; this.mode = null; this.lostAt = null;
      this.pid = 4242; this.down = false; this.zoom = null; this.lastT = -1; this.sx = 0; this.sy = 0; this.sinit = false;
      this.cursor = document.getElementById('handCursor');
    }

    async start() {
      if (this.active || this.loading) return; this.loading = true; this.status('Starting camera…');
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('camera-unsupported');
        this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
      } catch (e) { this.loading = false; this.fail('camera', e); return; }
      try {
        this.status('Loading hand model…');
        const mod = await import(`${BASE}/vision_bundle.mjs`);
        const files = await mod.FilesetResolver.forVisionTasks(`${BASE}/wasm`);
        const opts = d => ({ baseOptions: { modelAssetPath: MODEL, delegate: d }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.55, minTrackingConfidence: 0.5 });
        try { this.lm = await mod.HandLandmarker.createFromOptions(files, opts('GPU')); } catch (_) { this.lm = await mod.HandLandmarker.createFromOptions(files, opts('CPU')); }
      } catch (e) { this.stopStream(); this.loading = false; this.fail('model', e); return; }
      const v = this.video = document.getElementById('handVideo'); v.srcObject = this.stream; v.muted = true; v.playsInline = true;
      try { await v.play(); } catch (_) { /* 자동 재생 제한 */ }
      this.overlay = document.getElementById('handOverlay'); this.octx = this.overlay.getContext('2d');
      this.active = true; this.loading = false; this.status('Show either hand to the camera'); this.ui.onChange && this.ui.onChange(true);
      this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
    }

    stop() {
      this.active = false; this.loading = false; cancelAnimationFrame(this.raf); this.releasePointer(true); this.stopStream();
      if (this.lm && this.lm.close) { try { this.lm.close(); } catch (_) { /* noop */ } } this.lm = null;
      if (this.cursor) this.cursor.classList.remove('on', 'pinch'); this.ui.onChange && this.ui.onChange(false); this.status('');
    }
    stopStream() { if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; } }
    status(t) { this.ui.onStatus && this.ui.onStatus(t); }
    fail(kind, e) {
      const name = e && e.name || '';
      let msg = kind === 'camera'
        ? (name === 'NotAllowedError' || name === 'SecurityError' ? 'Camera access was blocked. Check the permission in the address bar, or open the page directly instead of this preview.' : 'The camera could not start. It may be blocked in this environment.')
        : 'The hand model could not load. It needs an internet connection and does not work where external requests are blocked.';
      this.ui.onError && this.ui.onError(msg, kind);
    }

    loop() {
      if (!this.active) return; this.raf = requestAnimationFrame(this.loop);
      const v = this.video; if (!v || v.readyState < 2 || v.currentTime === this.lastT) return; this.lastT = v.currentTime;
      let res; try { res = this.lm.detectForVideo(v, performance.now()); } catch (_) { return; }
      this.process(res && res.landmarks || [], v.videoWidth || 640, v.videoHeight || 480);
      this.drawOverlay(res && res.landmarks || []);
    }

    /* 랜드마크 → 포인터. 합성 포인터 이벤트로 기존 마우스·터치 코드를 그대로 쓴다.
     *   · peace sign + sideways sweep = next / previous constellation · thumbs up (hold) = wander tour
     *   · open hand = point · pinch (thumb + index) = grab · fist, then up/down = zoom · both hands pinching = spread to zoom
     *   · every pose has to hold for a moment before it counts, and the pointer runs through a One-Euro filter
     *   · 패널·버튼 위에서 핀치하면 그 버튼을 누르고, 패널 위에서 끌면 스크롤된다.
     *   · 별 가까이에서는 커서가 별에 달라붙는다(자석) — 별을 정확히 짚기 어려워서. */
    process(landmarks, vw, vh) {
      const now = performance.now(), W = innerWidth, H = innerHeight, pts = [], sky = this.sky;
      landmarks.slice(0, 2).forEach((lm, i) => {
        const dist = (a, b) => Math.hypot((lm[a].x - lm[b].x) * vw, (lm[a].y - lm[b].y) * vh);
        const size = Math.max(dist(0, 9), 1e-3), h = this.hands[i];
        const rI = dist(4, 8) / size, curl = (dist(8, 0) + dist(12, 0) + dist(16, 0) + dist(20, 0)) / 4 / size;
        // raw pose with hysteresis, then a short hold time before it counts: this is what stops flicker
        const ext = k => dist(k, 0) > dist(k - 2, 0) * 1.1, eI = ext(8), eM = ext(12), eR = ext(16), eP = ext(20);
        const thumbUp = (lm[5].y - lm[4].y) * vh > size * 0.5 && dist(4, 5) / size > 0.8;
        let raw = 'open';
        if (h.pose === 'pinch' ? rI < PINCH_OFF : rI < PINCH_ON) raw = 'pinch';
        else if (eI && eM && !eR && !eP && dist(8, 12) / size > 0.28) raw = 'peace';
        else if (!eI && !eM && !eR && !eP && thumbUp) raw = 'thumb';
        else if (h.pose === 'fist' ? curl < 1.5 : curl < 1.22) raw = 'fist';
        if (!h.has) { h.pose = raw; h.raw = raw; h.since = now; }
        if (raw !== h.raw) { h.raw = raw; h.since = now; }
        if (h.pose !== raw && now - h.since >= HOLD[raw]) h.pose = raw;
        h.has = true; h.pinched = h.pose === 'pinch'; h.fist = h.pose === 'fist'; h.near = rI < 0.62;
        const map = (px, py) => ({ x: clamp(((1 - px) - 0.14) / 0.72, 0, 1) * W, y: clamp((py - 0.14) / 0.64, 0, 1) * H });
        const m = map(lm[8].x, lm[8].y), z = map(lm[9].x, lm[9].y); h.x = m.x; h.y = m.y; h.zx = z.x; h.zy = z.y; pts.push(h);
      });
      for (let i = landmarks.length; i < 2; i++) { const h = this.hands[i]; h.has = false; h.pinched = false; h.fist = false; h.pose = 'open'; }
      if (landmarks.length === 0) {
        if (this.lostAt == null) this.lostAt = now;
        if (now - this.lostAt > 260) { // a brief tracking drop should not let go of a drag
          this.releasePointer(true); this.endUI(); this.zoom = null; this.zy = null; this.sinit = false; this.snapUid = null; this.setMode(null);
          if (this.cursor) this.cursor.classList.remove('on', 'pinch', 'snap', 'zoom'); this.clearHover();
        }
        return;
      }
      this.lostAt = null;
      const locked = !!sky.locked;

      // ① both hands pinching: spread to zoom in, close to zoom out (smoothed, with a dead zone)
      if (pts.length >= 2 && pts[0].pinched && pts[1].pinched) {
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
        if (this.down) this.releasePointer(true); this.endUI(); this.setMode('zoom2');
        this.zd = this.zd == null ? d : this.zd + (d - this.zd) * 0.35;
        if (this.zoom && this.zoom > 40 && !locked) { const r = this.zd / this.zoom; if (Math.abs(r - 1) > 0.004) sky.zoomAt(clamp(r, 0.95, 1.05), W / 2, H / 2); }
        this.zoom = this.zd; this.moveCursor(mx, my, true); this.cursorClass('zoom', true); sky.lastInput = now; this.fxPoint(mx, my); return;
      }
      this.zoom = null; this.zd = null;

      // thumbs up (hold): start or stop the wander tour, once per pose
      const th = pts.find(q => q.pose === 'thumb');
      if (th) {
        if (this.down) this.releasePointer(true); this.endUI(); this.setMode('thumb'); this.moveCursor(th.zx, th.zy, false); this.cursorClass('zoom', false);
        if (!this.thumbDone) { this.thumbDone = true; this.ui.onGesture && this.ui.onGesture('wander'); }
        return;
      }
      this.thumbDone = false;
      // peace sign: sweep sideways for the next or previous constellation
      const pe = pts.find(q => q.pose === 'peace');
      if (pe) {
        if (this.down) this.releasePointer(true); this.endUI(); this.setMode('swipe'); this.moveCursor(pe.zx, pe.zy, false);
        if (!this.pz) this.pz = { hist: [], done: false };
        const hs = this.pz.hist; hs.push([now, pe.zx]); while (hs.length && now - hs[0][0] > 1300) hs.shift();
        if (!this.pz.done && hs.length > 3) {
          const first = hs[0][1], last = hs[hs.length - 1][1], xs = hs.map(q => q[1]);
          if (Math.max(...xs) - Math.min(...xs) > W * 0.15 && Math.abs(last - first) > W * 0.12) { this.ui.onGesture && this.ui.onGesture(last > first ? 'next' : 'prev'); this.pz.done = true; }
        }
        this.cursorClass('swipe', true); return;
      }
      this.pz = null; this.cursorClass('swipe', false);

      // ② one-hand zoom: a fist. Raise it to zoom in, lower it to zoom out.
      const fh = pts.find(q => q.fist);
      if (fh) {
        if (this.down) this.releasePointer(true); this.endUI(); this.setMode('zoom');
        const y = this.fE.f(fh.zy, now, 0.7);
        if (this.zy != null && !locked) {
          let dy = y - this.zy; if (Math.abs(dy) < 1.4) dy = 0;
          this.zv += (clamp(dy, -30, 30) - this.zv) * 0.22;
          if (Math.abs(this.zv) > 0.05) sky.zoomAt(Math.exp(-this.zv * 0.0042), W / 2, H / 2);
        }
        this.zy = y; sky.lastInput = now; this.moveCursor(fh.zx, fh.zy, true); this.cursorClass('zoom', true); this.fxPoint(fh.zx, fh.zy); return;
      }
      this.zy = null; this.zv = 0; this.fE.reset(); this.cursorClass('zoom', false);

      // ③ pointer: either hand. The pinching hand wins; otherwise keep the hand we already follow.
      let ai = pts.findIndex(q => q.pinched); if (ai < 0) ai = this.act != null && this.act < pts.length ? this.act : 0;
      if (ai !== this.act) { this.act = ai; this.sinit = false; this.pE.x.reset(); this.pE.y.reset(); if (this.down) this.releasePointer(true); this.endUI(); }
      const h = pts[ai]; this.setMode(h.pinched ? 'grab' : 'point');
      // sticky filter: the closer the fingers get to a pinch, the heavier the smoothing, so closing the pinch does not shove the cursor
      const mc = h.pinched ? 0.5 : h.near ? 0.3 : 0.9;
      let cx = this.pE.x.f(h.x, now, mc), cy = this.pE.y.f(h.y, now, mc); this.sx = cx; this.sy = cy; this.sinit = true;
      let snapped = false; const linking = sky.drag && sky.drag.linking, linkMode = !!sky.connect;
      if (!this.uiTarget && (!this.down || linking || (linkMode && sky.drag && sky.drag.linkFrom))) {
        const R = linkMode ? (locked ? 78 : 56) : 46;
        let st = this.snapUid && sky.starXY(this.snapUid) ? this.snapUid : null, xy = st && sky.starXY(st);
        if (xy && Math.hypot(xy.x - cx, xy.y - cy) > R * 1.35) { st = null; xy = null; }  // sticky: hold the star until clearly away
        if (!xy) { const n = sky.nearStar && sky.nearStar(cx, cy, linking ? R + 14 : R); st = n && n.uid; xy = n && sky.starXY(n.uid); }
        this.snapUid = st || null;
        if (xy) { cx += (xy.x - cx) * 0.8; cy += (xy.y - cy) * 0.8; snapped = true; }
      } else if (!this.down) this.snapUid = null;
      // while a pinch is opening, keep the cursor where the pinch was, so letting go lands on the star
      if (h.pinched && h.raw !== 'pinch' && this.frz) { cx = this.frz.x; cy = this.frz.y; } else if (h.pinched) this.frz = { x: cx, y: cy }; else this.frz = null;
      sky.ptr = { x: cx, y: cy, inside: true }; if (linkMode && !this.down) sky.setHover(snapped && this.snapUid ? this.snapUid : null);
      this.moveCursor(cx, cy, h.pinched); this.cursorClass('snap', snapped); this.cursorClass('lock', locked); this.fxPoint(cx, cy);

      if (h.pinched && !this.down && !this.uiTarget) {
        const hit = this.uiAt(cx, cy);
        if (hit) { this.uiTarget = hit; this.uiStart = { x: cx, y: cy }; this.uiLast = { y: cy }; this.uiMoved = 0; this.uiScroll = hit.scroll || null; }
        else { this.fire('pointerdown', cx, cy); this.down = true; }
      } else if (this.uiTarget) {
        if (h.pinched) {
          this.uiMoved = Math.max(this.uiMoved, Math.hypot(cx - this.uiStart.x, cy - this.uiStart.y));
          if (this.uiScroll && this.uiMoved > 12) { this.uiScroll.scrollTop -= (cy - this.uiLast.y) * 1.2; }
          this.uiLast = { y: cy };
        } else { // released: a click if the hand barely moved
          const t = this.uiTarget.el; if (this.uiMoved < 26 && t && document.contains(t)) this.clickEl(t);
          this.endUI();
        }
      } else if (!h.pinched && this.down) { this.fire('pointerup', cx, cy); this.down = false; }
      else if (this.down || !this.uiTarget) { this.fire('pointermove', cx, cy); }
      if (!h.pinched && !this.down) this.hoverUI(cx, cy);
    }
    setMode(m) {
      if (m === this.mode) return; this.mode = m;
      document.querySelectorAll('#handHud .hl li').forEach(el => el.classList.toggle('on', el.dataset.m === m));
    }
    cursorClass(c, on) { if (this.cursor) this.cursor.classList.toggle(c, !!on); }
    fxPoint(x, y) { this.ui.fx && this.ui.fx.pointer(x, y); }
    /* 커서 아래에 캔버스가 아닌 화면 요소가 있으면 그 요소를 돌려준다 */
    uiAt(x, y) {
      const el = document.elementFromPoint(x, y); if (!el || el === this.sky.cv || el.id === 'bg' || el === document.body || el === document.documentElement) return null;
      const ui = el.closest('#panel,#rail,#plates,.top,.vtools,.bottom,#intro,#handHud,.toast'); if (!ui) return null;
      const t = el.closest('button,[data-act],[data-star],[data-con],[data-zod],[data-obj],a,[role="tab"],.node,.dg-star');
      const scroll = el.closest('.panel-in') || (el.closest('#rail') ? el.closest('#rail') : null);
      return { el: t, scroll: t ? null : scroll };
    }
    hoverUI(x, y) {
      const hit = this.uiAt(x, y), el = hit && hit.el; if (el === this.hov) return; this.clearHover(); if (el) { el.classList.add('hand-hover'); this.hov = el; }
    }
    clearHover() { if (this.hov) { this.hov.classList.remove('hand-hover'); this.hov = null; } }
    endUI() { this.uiTarget = null; this.uiScroll = null; }
    clickEl(el) {
      this.clearHover();
      try { if (typeof el.click === 'function' && !(el instanceof SVGElement)) el.click(); else el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch (_) { /* noop */ }
    }
    releasePointer(cancel) { if (this.down) { this.fire(cancel ? 'pointercancel' : 'pointerup', this.sx, this.sy); this.down = false; } }
    fire(type, x, y) {
      const cv = this.sky.cv;
      cv.dispatchEvent(new PointerEvent(type, { pointerId: this.pid, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true, buttons: type === 'pointerup' ? 0 : 1 }));
    }
    moveCursor(x, y, pinch) {
      if (!this.cursor) return; this.cursor.classList.add('on'); this.cursor.classList.toggle('pinch', !!pinch);
      this.cursor.style.transform = `translate(${x}px, ${y}px)`;
    }
    drawOverlay(landmarks) {
      const c = this.overlay, x = this.octx; if (!c) return; const w = c.width = c.clientWidth, h = c.height = c.clientHeight; x.clearRect(0, 0, w, h);
      x.lineWidth = 1.2; landmarks.forEach((lm, i) => {
        const pin = this.hands[i] && this.hands[i].pinched; x.strokeStyle = pin ? 'rgba(255,231,166,.98)' : 'rgba(205,216,255,.8)'; x.fillStyle = x.strokeStyle;
        BONES.forEach(([a, b]) => { x.beginPath(); x.moveTo((1 - lm[a].x) * w, lm[a].y * h); x.lineTo((1 - lm[b].x) * w, lm[b].y * h); x.stroke(); });
        lm.forEach(p => { x.beginPath(); x.arc((1 - p.x) * w, p.y * h, 2, 0, Math.PI * 2); x.fill(); });
      });
    }
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  window.AstraHands = HandControl;
})();
