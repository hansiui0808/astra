/* ASTRA — Plates
 * One printed board, four linked plates. Everything is visible at once so categories can be compared:
 *   I   Distance        every star on a log light-year axis, one row per constellation
 *   II  Brightness      a unit chart: one dot per star, stacked by apparent magnitude
 *   III Colour × light  a real Hertzsprung–Russell diagram, computed from distance and magnitude
 *   IV  Constellations  all nineteen figures at the same scale
 * Hover or tap any mark and it lights up in every plate. Tap a constellation to isolate it.
 */
(function () {
  'use strict';
  const { catalog, consById } = window.AstraSky, D = window.ASTRA_DATA, cons = D.constellations;
  const INK = '#16171b', NS = 'http://www.w3.org/2000/svg';
  const PCOL = { O: '#2833a4', B: '#4a63cf', A: '#92b0ee', F: '#efe8d0', G: '#e4b840', K: '#e07a35', M: '#c4372f', '?': '#c9c3b2' };
  const ORDER = 'OBAFGKM';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' M' : Math.round(n).toLocaleString('en-US');
  const letter = s => { const m = s.spec && /^[OBAFGKM]/.exec(s.spec.trim()); return m ? m[0] : '?'; };
  const clsIdx = s => { const L = letter(s); if (L === '?') return null; const d = /^[OBAFGKM](\d)/.exec(s.spec.trim()); return ORDER.indexOf(L) * 10 + (d ? +d[1] : 5); };
  const absM = s => s.mag - 5 * Math.log10(s.dist / 3.2616 / 10);
  const median = a => { const b = [...a].sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : Infinity; };
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const short = s => s.ko.split(' (')[0];

  function build(root, cb) {
    const stars = catalog.filter(s => s.dist != null), objs = cons.flatMap(c => (c.objects || []).map(o => ({ o, c })));
    const state = { pin: null, con: null };
    root.innerHTML = `<div class="pb">
      <header class="pb-head"><div><span class="pn">Star Plates</span><i>N° XII</i></div>
        <p>${catalog.length} stars · ${cons.length} constellations · every mark is linked. Hover or tap a mark to follow it across the plates, tap a constellation to isolate it.</p>
        <ul class="key" aria-label="Spectral class">${[...ORDER].map(L => `<li><i style="background:${PCOL[L]}"></i>${L}</li>`).join('')}</ul></header>
      <section class="pl p1"><h3><b>Pl. I</b><em>How far</em><span>Light-years, log scale. Dot size = brightness.</span></h3>${plate1()}</section>
      <section class="pl p2"><h3><b>Pl. II</b><em>How bright</em><span>One dot per star, by apparent magnitude.</span></h3>${plate2()}</section>
      <section class="pl p3"><h3><b>Pl. III</b><em>What kind</em><span>Colour against true luminosity.</span></h3>${plate3()}</section>
      <section class="pl p4"><h3><b>Pl. IV</b><em>Which figure</em><span>All of them, same scale.</span></h3>${plate4()}</section>
      <footer class="pb-led" id="pbLed"></footer></div>`;
    ledger();

    /* ───── Plate I ───── */
    function plate1() {
      const W = 640, X0 = 118, X1 = 622, T = 42, rowH = 33, lo = Math.log10(15), hi = Math.log10(8000);
      const X = d => X0 + (clamp(Math.log10(d), lo, hi) - lo) / (hi - lo) * (X1 - X0);
      const rows = cons.map(c => ({ c, st: c.stars.filter(s => s.dist != null) })).sort((a, b) => median(a.st.map(s => s.dist)) - median(b.st.map(s => s.dist)));
      const H = T + rows.length * rowH + 30; let g = '';
      [30, 100, 300, 1000, 3000].forEach(v => {
        g += `<line x1="${X(v)}" x2="${X(v)}" y1="${T - 6}" y2="${H - 24}" stroke="${INK}" stroke-opacity=".22" stroke-dasharray="1 3"/>` +
          `<text x="${X(v)}" y="${T - 12}" class="ax" text-anchor="middle">${v.toLocaleString('en-US')}</text><text x="${X(v)}" y="${H - 10}" class="ax" text-anchor="middle">${v.toLocaleString('en-US')}</text>`;
      });
      g += `<text x="${X1}" y="${H - 10}" class="ax" text-anchor="end" opacity=".6">ly →</text>`;
      let near = null, far = null;
      rows.forEach(({ c, st }, i) => {
        const y = T + i * rowH + rowH / 2;
        if (i % 2 === 0) g += `<rect x="0" y="${y - rowH / 2}" width="${W}" height="${rowH}" fill="${INK}" opacity=".035"/>`;
        g += `<g class="rowlab" data-con="${c.id}" tabindex="0" role="button" aria-label="${esc(c.ko)}"><rect x="0" y="${y - rowH / 2}" width="${X0 - 6}" height="${rowH}" fill="transparent"/><text x="8" y="${y + 3}" class="rl">${esc(c.ko)}</text></g>`;
        let last = -99, k = 0;
        [...st].sort((a, b) => a.dist - b.dist).forEach(s => {
          const x = X(s.dist); k = x - last < 7 ? k + 1 : 0; last = x; const dy = [0, -7, 7, -3.5, 3.5][k % 5];
          const r = clamp(4.3 - s.mag * 0.42, 1.7, 4.8);
          g += `<circle class="m" data-uid="${s.uid}" data-con="${c.id}" data-star="${s.uid}" cx="${x.toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="${r.toFixed(1)}" fill="${PCOL[letter(s)]}" stroke="${INK}" stroke-width=".6"/>`;
          if (!near || s.dist < near.s.dist) near = { s, x, y: y + dy }; if (!far || s.dist > far.s.dist) far = { s, x, y: y + dy };
        });
      });
      objs.forEach(({ o, c }) => {
        const i = rows.findIndex(r => r.c === c), y = T + i * rowH + rowH / 2, x = X(o.dist), off = o.dist > 8000;
        g += `<g class="ob" data-con="${c.id}"><path d="M${x} ${y - 5}L${x + 5} ${y}L${x} ${y + 5}L${x - 5} ${y}Z" fill="none" stroke="${INK}" stroke-width="1"/>` +
          `<text x="${off ? x - 9 : x + 8}" y="${y + 3}" class="ax" text-anchor="${off ? 'end' : 'start'}">${esc(o.en)}${off ? ' · ' + fmt(o.dist) + ' ly →' : ''}</text></g>`;
      });
      const call = (p, dir) => `<g class="call"><text x="${p.x + dir * 10}" y="${p.y - 9}" text-anchor="${dir > 0 ? 'start' : 'end'}">${esc(short(p.s))} · ${fmt(p.s.dist)} ly</text></g>`;
      if (near) g += call(near, 1); if (far) g += call(far, -1);
      g += `<text x="${X0}" y="12" class="ax" opacity=".6">NEAR</text><text x="${X1}" y="12" class="ax" text-anchor="end" opacity=".6">FAR · ◇ deep-sky</text>`;
      return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Distance of every star, by constellation">${g}</svg>`;
    }

    /* ───── Plate II ───── */
    function plate2() {
      const W = 420, H = 300, X0 = 24, X1 = 404, B = H - 34, lo = -2, hi = 7, bw = (X1 - X0) / (hi - lo), cols = 4, step = bw / cols;
      let g = `<line x1="${X0}" x2="${X1}" y1="${B}" y2="${B}" stroke="${INK}"/>`;
      for (let m = lo; m <= hi; m++) g += `<text x="${X0 + (m - lo) * bw}" y="${B + 14}" class="ax" text-anchor="middle">${m}</text><line x1="${X0 + (m - lo) * bw}" x2="${X0 + (m - lo) * bw}" y1="${B}" y2="${B + 4}" stroke="${INK}"/>`;
      g += `<text x="${X0}" y="${H - 4}" class="ax">← brighter</text><text x="${X1}" y="${H - 4}" class="ax" text-anchor="end">fainter →</text>`;
      const nx = X0 + (6 - lo) * bw; g += `<line x1="${nx}" x2="${nx}" y1="20" y2="${B}" stroke="${INK}" stroke-dasharray="3 3" opacity=".5"/><text x="${nx - 4}" y="16" class="ax" text-anchor="end">naked-eye limit</text>`;
      const bins = {}; catalog.forEach(s => { (bins[Math.floor(s.mag)] = bins[Math.floor(s.mag)] || []).push(s); });
      let peak = 0;
      Object.entries(bins).forEach(([b, arr]) => {
        arr.sort((a, b2) => ORDER.indexOf(letter(a)) - ORDER.indexOf(letter(b2)) || a.mag - b2.mag);
        const x0 = X0 + (+b - lo) * bw; peak = Math.max(peak, arr.length);
        arr.forEach((s, i) => {
          const cx = x0 + step * (i % cols) + step / 2, cy = B - 6 - Math.floor(i / cols) * 9;
          g += `<circle class="m" data-uid="${s.uid}" data-con="${s.con}" data-star="${s.uid}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5" fill="${PCOL[letter(s)]}" stroke="${INK}" stroke-width=".55"/>`;
        });
      });
      g += `<text x="${X0 + 2}" y="30" class="ax">1 dot = 1 star · ${catalog.length} in all</text>`;
      return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Stars stacked by apparent magnitude">${g}</svg>`;
    }

    /* ───── Plate III ───── */
    function plate3() {
      const W = 420, H = 300, X0 = 34, X1 = 404, T = 18, B = H - 36, mlo = -8, mhi = 13;
      const X = i => X0 + i / 70 * (X1 - X0), Y = m => T + (m - mlo) / (mhi - mlo) * (B - T);
      let g = '';
      [-5, 0, 5, 10].forEach(m => g += `<line x1="${X0}" x2="${X1}" y1="${Y(m)}" y2="${Y(m)}" stroke="${INK}" stroke-opacity=".16" stroke-dasharray="1 3"/><text x="${X0 - 6}" y="${Y(m) + 3}" class="ax" text-anchor="end">${m > 0 ? '+' + m : m}</text>`);
      [...ORDER].forEach((L, i) => g += `<text x="${X(i * 10 + 5)}" y="${B + 14}" class="ax" text-anchor="middle" fill="${INK}">${L}</text><line x1="${X(i * 10)}" x2="${X(i * 10)}" y1="${B}" y2="${B + 4}" stroke="${INK}"/>`);
      g += `<line x1="${X0}" x2="${X1}" y1="${B}" y2="${B}" stroke="${INK}"/><text x="${X0}" y="${H - 4}" class="ax">← hotter</text><text x="${X1}" y="${H - 4}" class="ax" text-anchor="end">cooler →</text><text x="${X0 + 2}" y="10" class="ax">↑ brighter (absolute magnitude)</text>`;
      const ms = [[5, -5.7], [10, -4], [20, .6], [30, 2.7], [42, 4.8], [50, 5.9], [60, 9], [66, 12]];
      g += `<polyline points="${ms.map(([i, m]) => X(i) + ',' + Y(m)).join(' ')}" fill="none" stroke="${INK}" stroke-opacity=".45" stroke-dasharray="4 3"/><text x="${X(52)}" y="${Y(8.2)}" class="ax" transform="rotate(-12 ${X(52)} ${Y(8.2)})">main sequence</text>`;
      g += `<text x="${X(34)}" y="${Y(-6.6)}" class="ax">supergiants</text><text x="${X(57)}" y="${Y(-4.6)}" class="ax">giants</text>`;
      g += `<circle cx="${X(42)}" cy="${Y(4.83)}" r="6" fill="none" stroke="${INK}"/><circle cx="${X(42)}" cy="${Y(4.83)}" r="1.5" fill="${INK}"/><text x="${X(42) + 9}" y="${Y(4.83) + 14}" class="ax">Sun</text>`;
      let n = 0;
      stars.forEach(s => {
        const i = clsIdx(s); if (i == null) return; n++; const m = clamp(absM(s), mlo + .5, mhi - .5);
        g += `<circle class="m" data-uid="${s.uid}" data-con="${s.con}" data-star="${s.uid}" cx="${X(i).toFixed(1)}" cy="${Y(m).toFixed(1)}" r="3.5" fill="${PCOL[letter(s)]}" stroke="${INK}" stroke-width=".6"/>`;
      });
      g += `<text x="${X1}" y="10" class="ax" text-anchor="end">${n} stars with class + distance</text>`;
      return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="Hertzsprung–Russell diagram">${g}</svg>`;
    }

    /* ───── Plate IV ───── */
    function plate4() {
      const cw = 104, ch = 128, nc = 4, list = [...cons].sort((a, b) => a.ko.localeCompare(b.ko)), W = cw * nc, rows = Math.ceil((list.length + 1) / nc), H = rows * ch + 4; let g = '';
      list.forEach((c, k) => {
        const ox = (k % nc) * cw, oy = Math.floor(k / nc) * ch, ra = c.stars.map(s => s.ra), dc = c.stars.map(s => s.dec);
        let mr = ra.reduce((a, b) => a + b, 0) / ra.length; const md = dc.reduce((a, b) => a + b, 0) / dc.length, cd = Math.cos(md * Math.PI / 180);
        const pts = c.stars.map(s => { let d = s.ra - mr; if (d > 12) d -= 24; if (d < -12) d += 24; return { s, x: -d * 15 * cd, y: -(s.dec - md) }; });
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y), w = Math.max(...xs) - Math.min(...xs) || 1, h = Math.max(...ys) - Math.min(...ys) || 1;
        const sc = Math.min((cw - 28) / w, (ch - 46) / h), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const P = p => ({ x: ox + cw / 2 + (p.x - cx) * sc, y: oy + 14 + (ch - 14) / 2 + (p.y - cy) * sc });
        g += `<g class="cell" data-con="${c.id}" tabindex="0" role="button" aria-label="${esc(c.ko)}"><rect x="${ox + 2}" y="${oy + 2}" width="${cw - 4}" height="${ch - 4}" class="cbg"/>`;
        const byU = {}; pts.forEach(p => byU[p.s.uid] = p);
        c.edges.forEach(e => { if (!byU[e[0]] || !byU[e[1]]) return; const a = P(byU[e[0]]), b = P(byU[e[1]]); g += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${INK}" stroke-width=".7" opacity=".6"/>`; });
        pts.forEach(p => { const q = P(p); g += `<circle class="m" data-uid="${p.s.uid}" data-con="${c.id}" data-star="${p.s.uid}" cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${clamp(3 - p.s.mag * .3, 1.3, 3.2).toFixed(1)}" fill="${PCOL[letter(p.s)]}" stroke="${INK}" stroke-width=".5"/>`; });
        g += `<text x="${ox + 8}" y="${oy + 13}" class="cl">${esc(c.ko)}</text><text x="${ox + cw - 8}" y="${oy + 13}" class="ax" text-anchor="end">${c.stars.length}★</text></g>`;
      });
      const k = list.length, ox = (k % nc) * cw, oy = Math.floor(k / nc) * ch;
      g += `<foreignObject x="${ox + 6}" y="${oy + 6}" width="${cw - 12}" height="${ch - 12}"><div xmlns="http://www.w3.org/1999/xhtml" class="p4note">Tap a figure to isolate it in every plate.</div></foreignObject>`;
      return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin meet" role="img" aria-label="All constellations at the same scale">${g}</svg>`;
    }

    /* ───── linking ───── */
    const all = () => [...root.querySelectorAll('.m')];
    function setHover(uid) {
      all().forEach(el => { const on = uid && el.dataset.uid === uid; el.classList.toggle('on', !!on); if (on) el.parentNode.appendChild(el); });
      root.classList.toggle('hl', !!uid); ledger(uid);
    }
    function applyFilter() {
      all().forEach(el => el.classList.toggle('dim', !!state.con && el.dataset.con !== state.con));
      root.querySelectorAll('[data-con]').forEach(el => { if (!el.classList.contains('m')) el.classList.toggle('sel', el.dataset.con === state.con); });
      root.classList.toggle('iso', !!state.con); ledger(state.pin);
    }
    function ledger(uid) {
      const el = root.querySelector('#pbLed'); if (!el) return; const s = uid && catalog.find(x => x.uid === uid);
      if (s) {
        const c = consById[s.con], L = letter(s), A = s.dist != null ? absM(s) : null;
        el.innerHTML = `<div class="lg-t"><b>${esc(short(s))}</b><span>${esc(c.ko)}</span></div><dl>
          <div><dt>Distance</dt><dd>${s.dist != null ? fmt(s.dist) + ' ly' : '—'}</dd></div><div><dt>Apparent</dt><dd>mag ${s.mag.toFixed(2)}</dd></div>
          <div><dt>True light</dt><dd>${A != null ? (A > 0 ? '+' : '') + A.toFixed(1) : '—'}</dd></div><div><dt>Class</dt><dd>${esc(s.spec || '—')}</dd></div></dl>
          <button class="go" data-go="${s.uid}">Show in sky →</button>`;
      } else if (state.con) {
        const c = consById[state.con], st = c.stars.filter(s => s.dist != null).sort((a, b) => a.dist - b.dist), br = [...c.stars].sort((a, b) => a.mag - b.mag)[0];
        el.innerHTML = `<div class="lg-t"><b>${esc(c.ko)}</b><span>${esc(c.latin)}</span></div><dl>
          <div><dt>Stars</dt><dd>${c.stars.length}</dd></div><div><dt>Nearest</dt><dd>${st[0] ? esc(short(st[0])) + ' · ' + fmt(st[0].dist) : '—'}</dd></div>
          <div><dt>Farthest</dt><dd>${st.length ? esc(short(st[st.length - 1])) + ' · ' + fmt(st[st.length - 1].dist) : '—'}</dd></div><div><dt>Brightest</dt><dd>${esc(short(br))} · ${br.mag.toFixed(2)}</dd></div></dl>
          <button class="go" data-gocon="${c.id}">Open constellation →</button>`;
      } else {
        const near = [...stars].sort((a, b) => a.dist - b.dist)[0], bright = [...catalog].sort((a, b) => a.mag - b.mag)[0];
        el.innerHTML = `<div class="lg-t"><b>Specimen</b><span>Hover any mark</span></div><dl>
          <div><dt>Nearest</dt><dd>${esc(short(near))} · ${fmt(near.dist)} ly</dd></div><div><dt>Brightest</dt><dd>${esc(short(bright))} · ${bright.mag.toFixed(2)}</dd></div>
          <div><dt>Farthest</dt><dd>${[...stars].sort((a, b) => b.dist - a.dist).slice(0, 1).map(s => esc(short(s)) + ' · ' + fmt(s.dist)).join('')}</dd></div><div><dt>Stars plotted</dt><dd>${stars.length} of ${catalog.length}</dd></div></dl><span class="hint">Tap a mark to pin it</span>`;
      }
    }
    root.addEventListener('pointerover', e => { if (e.pointerType === 'touch') return; const m = e.target.closest('.m'); if (m && m.dataset.uid && !state.pin) setHover(m.dataset.uid); });
    root.addEventListener('pointerout', e => { if (e.pointerType === 'touch') return; if (e.target.closest('.m') && !state.pin) setHover(null); });
    root.addEventListener('click', e => {
      const go = e.target.closest('[data-go]'); if (go) { cb.star(go.dataset.go); return; }
      const gc = e.target.closest('[data-gocon]'); if (gc) { cb.con(gc.dataset.gocon); return; }
      const m = e.target.closest('.m');
      if (m && m.dataset.uid) { state.pin = state.pin === m.dataset.uid ? null : m.dataset.uid; setHover(state.pin); return; }
      const k = e.target.closest('[data-con]');
      if (k) { state.con = state.con === k.dataset.con ? null : k.dataset.con; state.pin = null; setHover(null); applyFilter(); return; }
      if (state.pin) { state.pin = null; setHover(null); } else if (state.con) { state.con = null; applyFilter(); }
    });
    root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-con]')) { e.preventDefault(); e.target.closest('[data-con]').dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
    return { reset() { state.pin = null; state.con = null; setHover(null); applyFilter(); }, isolate(id) { state.con = id; applyFilter(); } };
  }
  window.AstraPlates = { build };
})();
