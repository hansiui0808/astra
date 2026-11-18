/* ASTRA — 미디어아트 효과 레이어
 * 하늘 위에 겹쳐 그리는 별똥별·별가루·커서 반짝임. 지도 데이터와는 무관한 연출이다.
 *   · 별똥별: 가끔 하늘을 가로지른다. '별똥별 비' 모드에서는 쏟아진다.
 *   · 별가루: 천천히 떨어지며 포인터(마우스·손)가 지나가면 바람에 흩날린다.
 *   · 커서 반짝임: 포인터가 빠르게 움직이면 반짝이는 가루가 떨어진다.
 *   · 소원별: 빈 하늘을 누르면 그 자리에서 작은 별이 떨어진다.
 */
(function () {
  'use strict';
  const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CREAM = '255,244,214';

  function spark(ctx, x, y, r, rot) { // 네 꼭짓점 반짝이
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const a = rot + k * Math.PI / 4, rr = k % 2 ? r * 0.2 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }

  class FX {
    constructor(cv) {
      this.cv = cv; this.ctx = cv.getContext('2d'); this.k = 1; this.w = 0; this.h = 0;
      this.meteors = []; this.dust = []; this.glit = []; this.rings = [];
      this.shower = false; this.next = 2500; this.px = -999; this.py = -999; this.pvx = 0; this.pvy = 0; this.last = 0; this.on = true;
      this.resize(); addEventListener('resize', () => this.resize());
      for (let i = 0; i < (reduce ? 0 : 70); i++) this.dust.push(this.mkDust(true));
      this._f = this.frame.bind(this); requestAnimationFrame(this._f);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) { this.last = 0; requestAnimationFrame(this._f); } });
    }
    resize() {
      const k = Math.min(devicePixelRatio || 1, 2); this.k = k; this.w = innerWidth; this.h = innerHeight;
      this.cv.width = Math.round(this.w * k); this.cv.height = Math.round(this.h * k);
    }
    mkDust(anywhere) {
      return { x: rnd(0, this.w), y: anywhere ? rnd(0, this.h) : -10, z: rnd(0.35, 1), ph: rnd(0, TAU), vx: 0, big: Math.random() < 0.28, tw: rnd(0.6, 2.2) };
    }
    /* 포인터 위치 알림(마우스·손). dt 없이 이전 위치와의 차이로 속도를 구한다. */
    pointer(x, y) {
      if (this.px > -900) {
        const dx = x - this.px, dy = y - this.py, sp = Math.hypot(dx, dy);
        this.pvx = this.pvx * 0.6 + dx * 0.4; this.pvy = this.pvy * 0.6 + dy * 0.4;
        if (sp > 7 && !reduce) { const n = Math.min(3, 1 + (sp / 24 | 0)); for (let i = 0; i < n; i++) this.glit.push({ x: x - dx * Math.random(), y: y - dy * Math.random(), vx: rnd(-14, 14) + dx * 0.05, vy: rnd(-10, 14), r: rnd(1.6, 4.2), t0: performance.now(), life: rnd(700, 1500), rot: rnd(0, 1.5) }); }
      }
      this.px = x; this.py = y;
    }
    leave() { this.px = -999; this.py = -999; }
    meteor(o) {
      o = o || {}; const w = this.w, h = this.h, th = rnd(0.5, 0.95); // 오른쪽 위 → 왼쪽 아래로 떨어진다
      this.meteors.push({ x: o.x != null ? o.x : rnd(w * 0.25, w * 1.05), y: o.y != null ? o.y : rnd(-30, h * 0.35), dx: -Math.cos(th), dy: Math.sin(th), sp: rnd(520, 900), len: rnd(150, 320), t0: performance.now(), life: rnd(900, 1500), big: !!o.big });
    }
    wish(x, y) { // 소원별: 클릭한 자리에서 별이 떨어진다
      if (reduce) return; this.rings.push({ x, y, t0: performance.now() });
      this.meteor({ x: x + 60, y: y - 70, big: true });
      for (let i = 0; i < 10; i++) this.glit.push({ x, y, vx: rnd(-60, 60), vy: rnd(-70, 20), r: rnd(1.5, 3.6), t0: performance.now(), life: rnd(800, 1600), rot: rnd(0, 1.5) });
    }
    burst(x, y, n) { for (let i = 0; i < (n || 18); i++) this.glit.push({ x, y, vx: rnd(-90, 90), vy: rnd(-110, 10), r: rnd(1.6, 4.4), t0: performance.now(), life: rnd(900, 1800), rot: rnd(0, 1.5) }); }
    setShower(on) { this.shower = !!on; this.next = 0; }

    frame(now) {
      if (document.hidden) return; requestAnimationFrame(this._f);
      const dt = Math.min(0.05, (now - (this.last || now)) / 1000); this.last = now;
      const c = this.ctx, k = this.k, w = this.w, h = this.h; c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, w, h);
      if (!this.on) return;
      // 별가루
      c.fillStyle = `rgba(${CREAM},1)`;
      for (const d of this.dust) {
        const dxp = d.x - this.px, dyp = d.y - this.py, dd = Math.hypot(dxp, dyp);
        if (dd < 160 && this.px > -900) { const f = (1 - dd / 160); d.vx += (this.pvx * 0.06 + dxp / (dd + 1) * 2) * f; d.y += this.pvy * 0.05 * f; }
        d.vx *= 0.96; d.x += (d.vx + Math.sin(now / 1800 + d.ph) * 6 * d.z) * dt; d.y += (11 + d.z * 22) * dt;
        if (d.y > h + 12 || d.x < -20 || d.x > w + 20) { Object.assign(d, this.mkDust(false)); continue; }
        const tw = 0.55 + 0.45 * Math.sin(now / 1000 * d.tw + d.ph);
        c.globalAlpha = (0.18 + 0.5 * d.z) * tw;
        if (d.big) spark(c, d.x, d.y, 2.6 * d.z + 0.8, now / 3000 + d.ph); else { c.beginPath(); c.arc(d.x, d.y, 0.8 * d.z + 0.3, 0, TAU); c.fill(); }
      }
      // 별똥별
      if (!reduce) {
        const t = performance.now();
        if (t > this.next) { this.meteor({ big: Math.random() < 0.18 }); this.next = t + (this.shower ? rnd(160, 520) : rnd(2600, 6200)); }
      }
      this.meteors = this.meteors.filter(m => performance.now() - m.t0 < m.life);
      for (const m of this.meteors) {
        const age = (performance.now() - m.t0) / 1000, k2 = age / (m.life / 1000), head = age * m.sp, tail = Math.max(0, head - m.len * (m.big ? 1.5 : 1));
        const hx = m.x + m.dx * head, hy = m.y + m.dy * head, tx = m.x + m.dx * tail, ty = m.y + m.dy * tail, fade = Math.min(1, k2 * 8) * (1 - Math.pow(k2, 3));
        const g = c.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, `rgba(${CREAM},0)`); g.addColorStop(1, `rgba(${CREAM},${0.95 * fade})`);
        c.globalAlpha = 1; c.strokeStyle = g; c.lineCap = 'round'; c.lineWidth = m.big ? 2.4 : 1.5; c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke();
        c.globalAlpha = fade; c.fillStyle = '#fffaf0'; spark(c, hx, hy, m.big ? 11 : 7, 0);
        c.globalAlpha = fade * 0.25; c.beginPath(); c.arc(hx, hy, m.big ? 14 : 9, 0, TAU); c.fill();
        if (Math.random() < (m.big ? 0.8 : 0.35)) this.glit.push({ x: hx, y: hy, vx: rnd(-18, 18), vy: rnd(6, 34), r: rnd(1, m.big ? 3 : 2), t0: performance.now(), life: rnd(500, 1100), rot: rnd(0, 1.5) });
      }
      // 반짝이 가루
      const nowp = performance.now(); this.glit = this.glit.filter(g => nowp - g.t0 < g.life);
      for (const g of this.glit) {
        const a = (nowp - g.t0) / g.life; g.vy += 70 * dt; g.vx *= 0.99; g.x += g.vx * dt; g.y += g.vy * dt;
        c.globalAlpha = (1 - a) * 0.9; c.fillStyle = `rgba(${CREAM},1)`; spark(c, g.x, g.y, g.r * (1 - a * 0.5), g.rot + a * 3);
      }
      // 소원 고리
      this.rings = this.rings.filter(r => nowp - r.t0 < 1200);
      for (const r of this.rings) { const a = (nowp - r.t0) / 1200; c.globalAlpha = (1 - a) * 0.7; c.strokeStyle = `rgba(${CREAM},1)`; c.lineWidth = 1; c.beginPath(); c.arc(r.x, r.y, 6 + a * 44, 0, TAU); c.stroke(); c.beginPath(); c.arc(r.x, r.y, 3 + a * 22, 0, TAU); c.stroke(); }
      c.globalAlpha = 1;
    }
  }
  window.AstraFX = FX;
})();
