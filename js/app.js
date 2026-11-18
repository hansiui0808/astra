/* ASTRA — UI · 모드 · 인터랙션
 * UI, modes and interaction. Connects the data (data/sky-data.js) to the renderer (js/sky.js).
 */
(function () {
  'use strict';
  const { Sky, consById, starByUid, objByUid, catalog, edgeKey, sunPosition } = window.AstraSky;
  const D = window.ASTRA_DATA, cons = D.constellations;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const H2R = Math.PI / 12, D2R = Math.PI / 180;
  const ZSET = new Set(D.ZODIAC_ORDER);
  const mobile = () => innerWidth <= 860;

  ['italic 400 24px "Instrument Serif"', '400 24px "Instrument Serif"', '500 11px "Inter Tight"', '600 12px "Inter Tight"', '400 9px "DM Mono"']
    .forEach(f => document.fonts && document.fonts.load(f).catch(() => {}));

  const canvas = $('#sky'), panel = $('#panel'), rail = $('#rail'), tip = $('#tip'), toastEl = $('#toast');
  const sky = new Sky(canvas);
  sky.scale = sky.defaultScale() * 2.6;

  /* ───────── 상태 ───────── */
  const S = { mode: 'explore', con: null, star: null, obj: null, cTab: 'free', target: null, chain: true, solved: new Set(), won: false, revealed: false, zod: null, draftName: '', draftNote: '', mine: [] };
  try { S.mine = JSON.parse(localStorage.getItem('astra.mine') || '[]').filter(m => m && Array.isArray(m.edges)); } catch (_) { S.mine = []; }
  const saveMine = () => { try { localStorage.setItem('astra.mine', JSON.stringify(S.mine)); } catch (_) { /* storage blocked */ } sky.mine = S.mine; };
  sky.mine = S.mine;

  /* ───────── 유틸 ───────── */
  const pad = n => String(n).padStart(2, '0');
  const fmtRA = h => { let H = Math.floor(h), M = Math.round((h - H) * 60); if (M === 60) { H = (H + 1) % 24; M = 0; } return `${pad(H)}h ${pad(M)}m`; };
  const fmtDec = d => { const sg = d < 0 ? '−' : '+', a = Math.abs(d); let D_ = Math.floor(a), M = Math.round((a - D_) * 60); if (M === 60) { D_++; M = 0; } return `${sg}${pad(D_)}° ${pad(M)}′`; };
  const fmtMag = m => (Math.round(m * 100) / 100).toFixed(2).replace(/0$/, '');
  const magTxt = m => 'mag ' + fmtMag(m);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const specLetter = s => (s && /^[OBAFGKM]/.test(s.trim()) ? s.trim()[0] : null);
  const specInfo = l => D.SPECTRAL.find(x => x.c === l);
  const CLASS_WORD = { O: 'a very hot blue star', B: 'a hot blue-white star', A: 'a white star', F: 'a yellow-white star', G: 'a yellow star like the Sun', K: 'an orange star', M: 'a cool red star' };
  function lumWord(spec) {
    if (!spec) return null; const tok = spec.trim().split(/\s+/)[1]; if (!tok) return null;
    const table = [['Iab', 'Supergiant'], ['Ia', 'Supergiant'], ['Ib', 'Supergiant'], ['III', 'Giant'], ['II', 'Bright giant'], ['IV', 'Subgiant'], ['V', 'Main sequence']];
    const hit = table.find(([k]) => tok.startsWith(k)); return hit ? hit[1] : null;
  }
  const LUM_TEXT = { 'Supergiant': 'A supergiant is far larger and brighter than the Sun, late in its life.', 'Bright giant': 'A bright giant is a swollen, evolved star of high luminosity.', 'Giant': 'A giant has used up its core hydrogen and puffed out.', 'Subgiant': 'A subgiant has just left the main sequence and begun to swell.', 'Main sequence': 'A main-sequence star burns hydrogen steadily in its core, as the Sun does.' };
  const STAR_NOTE = {
    'ori:betelgeuse': 'A red supergiant whose brightness varies irregularly.',
    'ori:rigel': 'A multiple system. Its brightest member outshines the Sun tens of thousands of times.',
    'ori:alnilam': 'The middle star of the belt, a blue supergiant luminous enough to reach magnitude 1.7 from afar.',
    'umi:polaris': 'The current pole star. A Cepheid variable with a close companion.',
    'uma:mizar': 'Pairs with Alcor as a naked-eye double, and is itself double in a telescope.',
    'lyr:vega': 'A corner of the Summer Triangle. A fast spinner that long served as magnitude zero.',
    'cyg:deneb': 'The farthest star of the Summer Triangle, a supergiant tens of thousands of times brighter than the Sun.',
    'cyg:albireo': 'Splits into a gold star and a blue star in a small telescope.',
    'sco:antares': 'A red supergiant. Its name is usually read as rival of Mars.',
    'vir:spica': 'A close binary: two stars orbiting each other.',
    'leo:regulus': 'So close to the ecliptic that the Moon and planets sometimes pass in front of it.',
    'tau:aldebaran': 'A red giant in line with the Hyades, but not a member of the cluster.',
    'gem:pollux': 'The brightest star of Gemini, an orange giant.',
    'gem:castor': 'Really a system of six stars.',
    'and:alpheratz': 'The head of Andromeda and a corner of the Great Square of Pegasus.',
    'cas:schedar': 'The brightest star of the Cassiopeia W, an orange giant.',
  };
  const SUN_NAMES = { oph: 'Ophiuchus' };
  function sunConId(date) {
    const x = (date.getMonth() + 1) * 100 + date.getDate();
    for (const id in D.SUN_IAU) { const [[m1, d1], [m2, d2]] = D.SUN_IAU[id], a = m1 * 100 + d1, b = m2 * 100 + d2; if (a <= b ? x >= a && x <= b : x >= a || x <= b) return id; }
    return 'lib';
  }
  const conName = id => (consById[id] && consById[id].ko) || SUN_NAMES[id] || id;
  const tsize = (name, max) => Math.max(44, Math.min(max || 84, Math.floor(330 / (name.length * 0.5))));
  const NOW = new Date();
  const SUN_ID = sunConId(NOW);

  function toast(msg, kind, ms) {
    toastEl.textContent = msg; toastEl.className = 'toast show ' + (kind || ''); clearTimeout(toast._t);
    toast._t = setTimeout(() => { toastEl.classList.remove('show'); }, ms || 2800);
  }

  /* ───────── 아이콘 ───────── */
  const IC = {
    season: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
    stars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="3"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/></svg>',
    coord: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><path d="M12 6v12M6 12h12" stroke-dasharray="1.5 2.5"/></svg>',
    ring: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-20 12 12)"/><circle cx="12" cy="12" r="2"/></svg>',
  };

  /* ───────── 별자리 배치도(구조도) ───────── */
  function layout(c, W, H, padPx) {
    const E = [-Math.sin(c.ra), Math.cos(c.ra), 0], N = [-Math.sin(c.dec) * Math.cos(c.ra), -Math.sin(c.dec) * Math.sin(c.ra), Math.cos(c.dec)];
    const proj = v => { const k = 2 / (1 + dot(v, c.cv)); return { x: -k * dot(v, E), y: -k * dot(v, N) }; };
    const pts = {}; let minx = 9, maxx = -9, miny = 9, maxy = -9;
    c.stars.forEach(s => { const p = proj(s.v); pts[s.uid] = { ...p, s }; minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y); });
    const sc = Math.min((W - 2 * padPx) / Math.max(maxx - minx, 1e-4), (H - 2 * padPx) / Math.max(maxy - miny, 1e-4));
    const ox = (W - (maxx - minx) * sc) / 2 - minx * sc, oy = (H - (maxy - miny) * sc) / 2 - miny * sc;
    Object.values(pts).forEach(p => { p.x = p.x * sc + ox; p.y = p.y * sc + oy; });
    const objs = (c.objects || []).map(o => { const p = proj(o.v); return { o, x: p.x * sc + ox, y: p.y * sc + oy }; });
    return { pts, objs };
  }
  function diagramSVG(c) {
    const W = 380, H = 220, { pts, objs } = layout(c, W, H, 46);
    let g = '';
    c.edges.forEach(e => { const a = pts[e[0]], b = pts[e[1]]; g += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#f1e9d2" stroke-opacity=".55" stroke-width="1" class="dg-line"/>`; });
    objs.forEach(({ o, x, y }) => { g += `<g class="dg-star" data-obj="${o.uid}"><circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#a9c2ee" stroke-dasharray="2 3" stroke-opacity=".8"/><circle class="hit" cx="${x}" cy="${y}" r="16"/><text x="${x + 13}" y="${y + 3}">${o.en}</text></g>`; });
    Object.values(pts).forEach(p => {
      const r = clamp(3.7 - p.s.mag * 0.5, 1.5, 4.8);
      g += `<g class="dg-star" data-star="${p.s.uid}"><circle class="halo" cx="${p.x}" cy="${p.y}" r="${r * 3.2}" fill="${p.s.col}" opacity=".13"/><circle class="core" cx="${p.x}" cy="${p.y}" r="${r}" fill="#fffdf6"/><circle class="hit" cx="${p.x}" cy="${p.y}" r="14"/><text x="${p.x + r + 5}" y="${p.y + 3}">${p.s.ko.split(' (')[0]}</text></g>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${c.ko} diagram">${g}</svg>`;
  }
  function miniSVG(c) {
    const W = 62, H = 44, { pts } = layout(c, W, H, 6); let g = '';
    c.edges.forEach(e => { const a = pts[e[0]], b = pts[e[1]]; g += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#e6ecff" stroke-opacity=".85" stroke-width=".7"/>`; });
    Object.values(pts).forEach(p => { g += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${clamp(2.1 - p.s.mag * 0.2, 0.8, 2.1).toFixed(1)}" fill="#f1e9d2"/>`; });
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${g}</svg>`;
  }

  /* ───────── 하늘 속 위치(전천 지도) ───────── */
  function minimapSVG(c) {
    const W = 380, H = 190, X = ra => (24 - ra) / 24 * W, Y = d => (90 - d) / 180 * H; let g = '';
    for (let h = 0; h <= 24; h += 4) g += `<line x1="${X(h)}" y1="0" x2="${X(h)}" y2="${H}" stroke="#a9c2ee" stroke-opacity=".12"/>` + (h < 24 ? `<text x="${X(h) - 3}" y="${H - 4}" fill="#8f94b0" font-size="8" text-anchor="end">${h}h</text>` : '');
    for (let d = -60; d <= 60; d += 30) g += `<line x1="0" y1="${Y(d)}" x2="${W}" y2="${Y(d)}" stroke="#a9c2ee" stroke-opacity="${d === 0 ? .3 : .12}" ${d === 0 ? 'stroke-dasharray="2 3"' : ''}/>`;
    // 황도
    let path = '', prev = null; const eps = 23.4393 * D2R;
    for (let l = 0; l <= 360; l += 4) { const lam = l * D2R, ra = (Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) + 2 * Math.PI) % (2 * Math.PI) / H2R, dec = Math.asin(Math.sin(eps) * Math.sin(lam)) / D2R; const x = X(ra), y = Y(dec); path += (prev === null || Math.abs(x - prev) > W / 2 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '; prev = x; }
    g += `<path d="${path}" fill="none" stroke="#f1e9d2" stroke-opacity=".4" stroke-dasharray="3 3"/>`;
    cons.forEach(o => { if (o.id !== c.id) g += `<circle cx="${X(o.ra / H2R)}" cy="${Y(o.dec / D2R)}" r="1.6" fill="#a9c2ee" opacity=".5"/>`; });
    c.edges.forEach(e => { const a = starByUid[e[0]], b = starByUid[e[1]], x1 = X(a.ra), x2 = X(b.ra); if (Math.abs(x1 - x2) < W / 2) g += `<line x1="${x1}" y1="${Y(a.dec)}" x2="${x2}" y2="${Y(b.dec)}" stroke="#f1e9d2" stroke-width="1"/>`; });
    c.stars.forEach(s => { g += `<circle cx="${X(s.ra)}" cy="${Y(s.dec)}" r="${clamp(2.8 - s.mag * 0.3, 1, 3)}" fill="#f1e9d2"/>`; });
    g += `<circle cx="${X(c.ra / H2R)}" cy="${Y(c.dec / D2R)}" r="14" fill="none" stroke="#f1e9d2" stroke-opacity=".6"><animate attributeName="r" values="12;19;12" dur="3s" repeatCount="indefinite"/><animate attributeName="stroke-opacity" values=".7;.15;.7" dur="3s" repeatCount="indefinite"/></circle>`;
    g += `<g id="mmView"><circle r="10" fill="none" stroke="#a9c2ee" stroke-dasharray="2 2"/><path d="M-14 0h8M6 0h8M0 -14v8M0 6v8" stroke="#a9c2ee" stroke-width=".8"/></g>`;
    return `<svg class="minimap" viewBox="0 0 ${W} ${H}" role="img" aria-label="${c.ko} position in the sky">${g}</svg>`;
  }
  function updateMiniView() {
    const el = $('#mmView'); if (!el) return; const W = 380, H = 190, cc = sky.centerCoords();
    const fov = 2 * 2 * Math.atan((sky.w / 2 / sky.scale) / 2) / D2R; const r = clamp(fov / 2 * W / 360, 5, 80);
    el.setAttribute('transform', `translate(${(24 - cc.ra) / 24 * W} ${(90 - cc.dec) / 180 * H})`); el.firstChild.setAttribute('r', r.toFixed(1));
  }

  /* ───────── constellation panel ───────── */
  function conPanel(c) {
    const br = starByUid[c.id + ':' + c.brightest], sorted = [...c.stars].sort((a, b) => a.mag - b.mag), top = sorted.slice(0, 8);
    const rows = top.map(s => `<button class="row" data-star="${s.uid}"><span class="nm">${s.ko.split(' (')[0]}</span><span class="bar"><i style="width:${clamp((6.5 - s.mag) / 6.7, 0.03, 1) * 100}%"></i></span><span class="val">${fmtMag(s.mag)}</span></button>`).join('');
    const withD = c.stars.filter(s => s.dist != null).sort((a, b) => a.dist - b.dist).slice(0, 9), lg = d => (Math.log10(d) - 1) / (Math.log10(5000) - 1);
    const ticks = [30, 100, 300, 1000, 3000].map(v => `<span style="left:${lg(v) * 100}%">${v.toLocaleString()}</span>`).join('');
    const drows = withD.map(s => `<button class="row" data-star="${s.uid}"><span class="nm">${s.ko.split(' (')[0]}</span><span class="track"><i style="left:${clamp(lg(s.dist), 0, 1) * 100}%;background:${s.col}"></i></span><span class="val">${s.dist.toLocaleString()}</span></button>`).join('');
    const missing = c.stars.length - c.stars.filter(s => s.dist != null).length, nObj = (c.objects || []).length;
    return `<div class="panel-in">
      <button class="close" data-act="close" aria-label="Close">✕</button>
      <div class="eyebrow">Constellation — ${c.abbr}</div>
      <h2 class="title" style="font-size:${tsize(c.ko)}px">${c.ko}</h2><div class="latin">${c.latin}</div>
      <div class="chips"><span class="chip">${c.season}</span><span class="chip">${c.hemisphere.split(' (')[0]}</span>${c.zodiac ? '<span class="chip gold">Zodiac</span>' : ''}</div>
      <p class="lede">${c.intro}</p>
      <div class="diagram">${diagramSVG(c)}</div>
      <dl class="meta">
        <div>${IC.season}<span><dt>Best season</dt><dd>${c.season}</dd></span></div>
        <div>${IC.globe}<span><dt>Hemisphere</dt><dd>${c.hemisphere}</dd></span></div>
        <div>${IC.stars}<span><dt>Main stars</dt><dd>${c.stars.length}${nObj ? ` + ${nObj} deep-sky` : ''}</dd></span></div>
        <div>${IC.spark}<span><dt>Brightest</dt><dd>${br.ko.split(' (')[0]} <small>${magTxt(br.mag)}</small></dd></span></div>
        <div>${IC.coord}<span><dt>Right ascension</dt><dd>${fmtRA(c.ra / H2R)}</dd></span></div>
        <div>${IC.ring}<span><dt>Declination</dt><dd>${fmtDec(c.dec / D2R)}</dd></span></div>
      </dl>
      <div class="sec"><h3>Brightness <small>lower magnitude = brighter</small></h3>${rows}</div>
      <div class="sec"><h3>Distance <small>light-years, log scale</small></h3>
        <div class="axis"><span></span><div>${ticks}</div><span></span></div>${drows}
        ${missing ? `<p class="note" style="margin-top:8px">${missing} star${missing > 1 ? 's' : ''} with uncertain distance left out.</p>` : ''}</div>
      <div class="sec"><h3>Position <small>RA / Dec, whole sky</small></h3>${minimapSVG(c)}
        <p class="note" style="margin-top:8px">Dashed line: the ecliptic. Dashed circle: the area you are viewing.</p></div>
      <div class="sec"><h3>Myth</h3><p class="body">${c.myth}</p></div>
      <div class="sec"><h3>Good to know</h3><ul class="facts">${c.facts.map(f => `<li>${f}</li>`).join('')}</ul></div>
      <div class="sec"><div class="btnrow" style="margin-top:14px">
        <button class="cta" data-act="challenge" data-con="${c.id}">Connect its stars</button>
        ${c.zodiac ? `<button class="cta ghost" data-act="tozodiac" data-con="${c.id}">See in Zodiac</button>` : ''}
      </div></div>
    </div>`;
  }

  /* ───────── star · deep-sky panels ───────── */
  function lightYear(d) {
    const y = NOW.getFullYear();
    if (d == null) return null;
    if (d >= 1e4) return d >= 1e6 ? `about ${(Math.round(d / 1e5) / 10).toLocaleString()} million years ago` : `about ${Math.round(d / 1000).toLocaleString()} thousand years ago`;
    const v = y - d, r = d > 200 ? Math.round(v / 10) * 10 : Math.round(v); return r < 0 ? `around ${Math.abs(r)} BCE` : `${d > 200 ? 'around' : 'in'} ${r}`;
  }
  function explainStar(s) {
    const L = specLetter(s.spec), info = L && specInfo(L), lum = lumWord(s.spec), out = [];
    if (info) out.push(`Spectral class ${L}: ${CLASS_WORD[L]}, surface near ${info.t}.`);
    if (lum && LUM_TEXT[lum]) out.push(LUM_TEXT[lum]);
    if (s.mag < 6) { const f = Math.pow(10, 0.4 * (6 - s.mag)); out.push(f >= 1.5 ? `About ${f >= 10 ? Math.round(f).toLocaleString() : f.toFixed(1)} times brighter than the faintest naked-eye star (magnitude 6).` : 'Just barely visible under a dark sky.'); }
    if (s.dist != null) out.push(`The light you see tonight left about ${s.dist.toLocaleString()} years ago, ${lightYear(s.dist)}.`);
    return out;
  }
  function starPanel(s) {
    const c = consById[s.con], L = specLetter(s.spec), info = L && specInfo(L), note = STAR_NOTE[s.uid], ex = explainStar(s);
    const mk = clamp((s.mag + 1.5) / 8.5, 0, 1) * 100, tick = v => `<div class="tick" style="left:${(v + 1.5) / 8.5 * 100}%"><span>${v}</span></div>`;
    const back = S.mode === 'zodiac' ? '← Zodiac' : S.con ? `← ${consById[S.con].ko}` : `← ${c.ko}`;
    return `<div class="panel-in">
      <button class="close" data-act="close" aria-label="Close">✕</button>
      <div class="backrow"><button class="linkbtn" data-act="${S.mode === 'zodiac' || S.con ? 'back' : 'opencon'}" data-con="${s.con}">${back}</button></div>
      <div class="eyebrow">Star — ${s.bayer}</div>
      <h2 class="title" style="font-size:${tsize(s.en, 72)}px">${s.en}</h2><div class="latin">in ${c.ko}</div>
      <div class="big-spec"><div class="orb" style="background:radial-gradient(circle at 36% 32%,#fff 0,${s.col} 40%,${s.col} 100%)"></div>
        <p class="note">${info ? `${CLASS_WORD[L].charAt(0).toUpperCase() + CLASS_WORD[L].slice(1)} · surface ${info.t}` : 'Spectral type uncertain.'}</p></div>
      <dl class="sgrid">
        <div><dt>Apparent magnitude</dt><dd>${fmtMag(s.mag)}</dd></div>
        <div><dt>Distance</dt><dd>${s.dist == null ? '—' : s.dist.toLocaleString()}<small>${s.dist == null ? 'uncertain' : 'light-years'}</small></dd></div>
        <div><dt>Spectral type</dt><dd style="font-size:26px">${s.spec || '—'}</dd></div>
        <div><dt>Constellation</dt><dd style="font-size:26px">${c.ko}</dd></div>
      </dl>
      <div class="sec"><h3>Brightness scale <small>lower = brighter</small></h3>
        <div class="magscale"><div class="rail"></div>${[0, 2, 4, 6].map(tick).join('')}<div class="mk" style="left:${mk}%"></div></div>
        <div class="mk-lab"><span>Brighter</span><span>Naked-eye limit · 6</span></div></div>
      <div class="sec"><h3>In plain words</h3>
        ${note ? `<p class="lede" style="font-size:20px;margin:0 0 12px">${note}</p>` : ''}
        <p class="body">${ex.join(' ')}</p>
        <p class="note" style="margin-top:12px">Distances and magnitudes are rounded; catalogues differ slightly.</p></div>
    </div>`;
  }
  function objPanel(o) {
    const c = consById[o.con];
    return `<div class="panel-in"><button class="close" data-act="close" aria-label="Close">✕</button>
      <div class="backrow"><button class="linkbtn" data-act="${S.con ? 'back' : 'opencon'}" data-con="${o.con}">← ${c.ko}</button></div>
      <div class="eyebrow">Deep sky — ${o.en}</div><h2 class="title sm">${o.en}</h2><div class="latin">${o.ko}</div>
      <dl class="sgrid"><div><dt>Type</dt><dd style="font-size:26px">${o.type}</dd></div><div><dt>Apparent magnitude</dt><dd>${fmtMag(o.mag)}</dd></div>
      <div><dt>Distance</dt><dd>${o.dist >= 1e6 ? (Math.round(o.dist / 1e5) / 10).toLocaleString() + ' M' : o.dist.toLocaleString()}<small>light-years</small></dd></div><div><dt>Constellation</dt><dd style="font-size:26px">${c.ko}</dd></div></dl>
      <div class="sec"><h3>In plain words</h3><p class="body">${o.mag <= 6 ? 'Visible to the naked eye as a faint smudge under a dark sky.' : 'Fainter than the naked-eye limit. You need binoculars or a telescope.'} The light you see left ${lightYear(o.dist)}.</p>
      <p class="note" style="margin-top:10px">Size and brightness follow the real sky; the shape is simplified.</p></div></div>`;
  }

  /* ───────── 별자리 목록(레일) ───────── */
  function renderRail() {
    rail.innerHTML = `<div class="rail-grid">` +
      cons.map(c => `<button class="card" data-con="${c.id}" ${S.con === c.id ? 'aria-current="true"' : ''}>${miniSVG(c)}<span class="n">${c.ko}</span><span class="l">${c.latin}</span></button>`).join('') + '</div>';
  }
  function markRail() { $$('#rail .card').forEach(b => b.toggleAttribute('aria-current', b.dataset.con === S.con)); const cur = rail.querySelector('[aria-current]'); cur && cur.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }

  /* ───────── 별 잇기 ───────── */
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const NAMES = ['The Lantern', 'Moth', 'Last Bus Home', 'Paper Boat', 'Quiet Kite', 'The Teacup', 'Small Door', 'Night Fern', 'Slow Comet', 'The Key', 'Wishbone', 'Harbour Light', 'Kettle', 'The Staircase', 'Otter', 'Lost Glove'];
  function setLock(v) { sky.locked = !!v; if (v) sky.inertia = null; document.body.classList.toggle('view-locked', !!v && S.mode === 'connect'); }
  /* flat projection of a saved constellation: fit points into a box */
  function mineLayout(m, W, H, pad) {
    const us = [...new Set(m.edges.flat())].map(u => starByUid[u]).filter(Boolean); if (!us.length) return null;
    let mr = Math.atan2(us.reduce((a, x) => a + Math.sin(x.ra * H2R), 0), us.reduce((a, x) => a + Math.cos(x.ra * H2R), 0)) / H2R; if (mr < 0) mr += 24;
    const md = us.reduce((a, x) => a + x.dec, 0) / us.length, cd = Math.cos(md * D2R), P = {};
    us.forEach(x => { let d = x.ra - mr; if (d > 12) d -= 24; if (d < -12) d += 24; P[x.uid] = { s: x, x: -d * 15 * cd, y: -(x.dec - md) }; });
    const v = Object.values(P), xs = v.map(p => p.x), ys = v.map(p => p.y), w = Math.max(...xs) - Math.min(...xs) || 1, h = Math.max(...ys) - Math.min(...ys) || 1;
    const sc = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    v.forEach(p => { p.x = W / 2 + (p.x - cx) * sc; p.y = H / 2 + (p.y - cy) * sc; }); return P;
  }
  function mineSVG(m) {
    const W = 64, H = 46, P = mineLayout(m, W, H, 7); if (!P) return ''; let g = '';
    m.edges.forEach(([a, b]) => { if (P[a] && P[b]) g += `<line x1="${P[a].x.toFixed(1)}" y1="${P[a].y.toFixed(1)}" x2="${P[b].x.toFixed(1)}" y2="${P[b].y.toFixed(1)}" stroke="#16171b" stroke-width=".8"/>`; });
    Object.values(P).forEach(p => g += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${clamp(2.2 - p.s.mag * .22, 1, 2.3).toFixed(1)}" fill="#16171b"/>`);
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${g}</svg>`;
  }
  function minePoster(m) {
    const W = 1080, Hh = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const x = cv.getContext('2d');
    x.fillStyle = '#e7e2d3'; x.fillRect(0, 0, W, Hh);
    for (let i = 0; i < 5200; i++) { x.fillStyle = `rgba(22,23,27,${Math.random() * .07})`; x.fillRect(Math.random() * W, Math.random() * Hh, 1 + Math.random() * 1.6, 1 + Math.random() * 1.6); }
    x.strokeStyle = '#16171b'; x.lineWidth = 2; x.strokeRect(44, 44, W - 88, Hh - 88);
    x.fillStyle = '#16171b'; x.font = '500 22px "DM Mono", monospace'; x.textBaseline = 'alphabetic';
    x.fillText('ASTRA — MY CONSTELLATION', 84, 100); x.textAlign = 'right'; x.fillText('N° ' + pad(S.mine.indexOf(m) + 1), W - 84, 100); x.textAlign = 'left';
    x.fillRect(84, 150, W - 168, 800); const P = mineLayout(m, W - 168, 800, 110);
    x.save(); x.translate(84, 150);
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(231,226,211,${.15 + Math.random() * .4})`; x.beginPath(); x.arc(Math.random() * (W - 168), Math.random() * 800, Math.random() * 1.6 + .3, 0, 7); x.fill(); }
    if (P) {
      x.lineCap = 'round'; x.strokeStyle = '#a9c2ee'; x.lineWidth = 3; m.edges.forEach(([a, b]) => { if (P[a] && P[b]) { x.beginPath(); x.moveTo(P[a].x, P[a].y); x.lineTo(P[b].x, P[b].y); x.stroke(); } });
      Object.values(P).forEach(p => { const r = clamp(11 - p.s.mag * 1.5, 4, 14); const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3); g.addColorStop(0, 'rgba(169,194,238,.5)'); g.addColorStop(1, 'rgba(169,194,238,0)'); x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, r * 3, 0, 7); x.fill(); x.fillStyle = '#f1ead6'; x.beginPath(); x.arc(p.x, p.y, r * .62, 0, 7); x.fill(); });
    }
    x.restore();
    x.fillStyle = '#16171b'; x.font = 'italic 400 104px "Instrument Serif", Georgia, serif'; x.fillText(m.name, 84, 1088);
    x.font = '400 26px "DM Mono", monospace'; if (m.note) x.fillText(m.note, 84, 1142);
    x.font = '400 20px "DM Mono", monospace'; x.fillText(`${new Set(m.edges.flat()).size} STARS · ${m.edges.length} LINES · DRAWN ${new Date(m.t).toISOString().slice(0, 10)} · EPOCH J2000`, 84, 1250);
    const a = document.createElement('a'); a.download = 'astra-' + m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png';
    try { a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove(); toast('Poster saved', 'good', 2400); } catch (_) { toast('Could not save the poster here', 'bad', 3000); }
  }
  const cnCorrect = () => sky.connect.edges.filter(e => e.state === 'ok' && !e.revealed).length;
  function connectPanel() {
    const cn = sky.connect, c = S.target && consById[S.target], free = S.cTab === 'free';
    const seg = `<div class="seg2" role="tablist"><button role="tab" aria-selected="${free}" data-act="tab" data-tab="free">Create</button><button role="tab" aria-selected="${!free}" data-act="tab" data-tab="challenge">Challenge</button></div>`;
    const lock = `<div class="sw lock"><button aria-pressed="${!!sky.locked}" data-act="lock" aria-label="Lock view"></button>Lock view</div>`;
    let main = '', extra = '';
    if (free) {
      const okEdges = cn.edges.filter(e => e.state !== 'wrong'), starSet = new Set(); okEdges.forEach(e => { starSet.add(e.a); starSet.add(e.b); });
      const mine = S.mine.map(m => `<div class="mine" data-id="${m.id}"><span class="mv">${mineSVG(m)}</span><span class="mt"><b>${esc(m.name)}</b><small>${new Set(m.edges.flat()).size} stars</small></span>
          <span class="ma"><button data-act="minefly" data-id="${m.id}" aria-label="Show on sky">Sky</button><button data-act="minepng" data-id="${m.id}" aria-label="Save poster">Poster</button><button data-act="minedel" data-id="${m.id}" aria-label="Delete">✕</button></span></div>`).join('');
      main = `<span class="st"><b>${starSet.size}</b> stars · <b>${okEdges.length}</b> lines</span>
        <span class="namer"><input id="mineName" maxlength="22" placeholder="Name it" value="${esc(S.draftName)}" aria-label="Constellation name"><button class="dice" data-act="dice" aria-label="Suggest a name" title="Suggest a name">↻</button>
        <input id="mineNote" maxlength="48" placeholder="One line about it" value="${esc(S.draftNote)}" aria-label="Note"></span>
        <button class="cta" data-act="save" ${okEdges.length ? '' : 'disabled'}>Save</button><button class="cta ghost" data-act="undo">Undo</button><button class="cta ghost" data-act="reset">Clear</button>`;
      extra = `<div class="strip"><span class="sl">Fly to</span>${cons.map(k => `<button class="chp" data-act="fly" data-con="${k.id}">${k.abbr}</button>`).join('')}</div>
        <div class="strip"><span class="sl">My sky</span>${mine || '<span class="note">Saved constellations appear here and on the sky.</span>'}</div>`;
    } else if (!c) {
      main = `<span class="lede2">Redraw a real constellation by linking its stars. Pick one.</span>`;
      extra = `<div class="strip">${cons.map(k => { const n = k.edges.length, lv = n <= 4 ? 1 : n <= 6 ? 2 : n <= 9 ? 3 : n <= 12 ? 4 : 5; return `<button class="chp big" data-act="start" data-con="${k.id}">${k.ko}${S.solved.has(k.id) ? ' ✓' : ''}<i>${'•'.repeat(lv)}</i></button>`; }).join('')}</div>`;
    } else if (S.won) {
      main = `<b class="wt">${c.ko}</b><span class="lede2">${c.intro}</span><button class="cta" data-act="nextch">Next</button><button class="cta ghost" data-act="opencon" data-con="${c.id}">Details</button>`;
    } else {
      const got = cnCorrect(), tot = c.edges.length;
      main = `<span class="st"><b>${got}/${tot}</b> lines</span><span class="pgbar"><i style="width:${got / tot * 100}%"></i></span>
        <button class="cta ghost" data-act="hint">${cn.hints ? 'Hide hints' : 'Hints'}</button><button class="cta ghost" data-act="undo">Undo</button><button class="cta ghost" data-act="reveal">Reveal</button><button class="cta ghost" data-act="pickother">Other</button>`;
    }
    return `<div class="dock-in"><div class="dk-row">${seg}${lock}${main}</div>${extra}</div>`;
  }
  function connectClick(star) {
    const cn = sky.connect; if (!cn) return;
    if (S.won) return;
    if (!star) { cn.pending = null; renderPanel(true); return; }
    if (!cn.pending) { cn.pending = star.uid; sky.pulse(star.uid, 900); return; }
    if (cn.pending === star.uid) { cn.pending = null; return; }
    const a = cn.pending, b = star.uid, key = edgeKey(a, b);
    if (cn.edges.some(e => e.key === key && e.state !== 'wrong')) { toast('Already linked', '', 1800); cn.pending = null; return; }
    const e = { a, b, key, t0: performance.now(), state: 'ok' }; cn.edges.push(e);
    if (S.cTab === 'challenge' && S.target) {
      const c = consById[S.target];
      if (!c.edgeKeys.has(key)) {
        e.state = 'wrong'; const inA = starByUid[a].con === c.id, inB = starByUid[b].con === c.id;
        toast(inA && inB ? 'Those two stars are not joined' : `That star is not part of ${c.ko}`, 'bad', 2200);
        setTimeout(() => { const i = cn.edges.indexOf(e); if (i >= 0) { cn.edges.splice(i, 1); renderPanel(true); } }, 1600);
      } else { sky.burst(b, 12); sky.pulse(b); if (cnCorrect() === c.edges.length) win(c.id); }
    } else { sky.burst(b, 12); sky.pulse(b); }
    cn.pending = S.chain && e.state !== 'wrong' ? b : null; renderPanel(true);
  }
  function win(id) {
    const c = consById[id], cn = sky.connect; S.won = true; S.solved.add(id); cn.pending = null; cn.hints = null;
    cn.celebrate = { con: id, t0: performance.now() }; sky.opts.hideConLabels = false; sky.setSelected(id); cn.hideSel = false;
    c.stars.forEach((s, i) => setTimeout(() => sky.burst(s.uid, 16), 150 + i * 120));
    toast(`${c.ko} complete`, 'good', 3200);
  }
  function startChallenge(id) {
    const c = consById[id], cn = sky.connect; S.target = id; S.won = false; S.revealed = false; S.cTab = 'challenge';
    cn.edges = []; cn.pending = null; cn.hints = null; cn.celebrate = null; cn.hideSel = true; cn.hideNames = true; sky.setSelected(null); sky.opts.hideConLabels = true;
    renderPanel(); updateInsets(); sky.flyTo(c.ra, c.dec, sky.fitScale(c) * 0.72);
  }
  function enterConnect() {
    sky.connect = { edges: [], pending: null, hints: null, celebrate: null, hideSel: true }; sky.opts.hideConLabels = true; sky.opts.starNames = true;
  }
  function connectAct(act, el) {
    const cn = sky.connect;
    switch (act) {
      case 'tab': { const t = el.dataset.tab; if (t === S.cTab) return; S.cTab = t; S.target = null; S.won = false; cn.edges = []; cn.pending = null; cn.hints = null; cn.celebrate = null; cn.hideNames = false; sky.setSelected(null); sky.opts.hideConLabels = true; renderPanel(); break; }
      case 'tochallenge': S.cTab = 'challenge'; S.target = null; cn.edges = []; cn.pending = null; renderPanel(); break;
      case 'lock': setLock(!sky.locked); renderPanel(true); break;
      case 'dice': { const w = NAMES[Math.floor(Math.random() * NAMES.length)]; S.draftName = w; const el = $('#mineName'); if (el) el.value = w; break; }
      case 'save': {
        const ok = cn.edges.filter(e => e.state !== 'wrong'); if (!ok.length) return;
        const m = { id: 'm' + Date.now().toString(36), name: (S.draftName || '').trim() || 'Untitled ' + pad(S.mine.length + 1), note: (S.draftNote || '').trim(), edges: ok.map(e => [e.a, e.b]), t: Date.now() };
        S.mine.push(m); saveMine(); cn.edges = []; cn.pending = null; S.draftName = ''; S.draftNote = '';
        new Set(m.edges.flat()).forEach((u, i) => setTimeout(() => sky.burst(u, 14), i * 90)); toast(`“${m.name}” is in your sky`, 'good', 3200); renderPanel(true); break; }
      case 'fly': { sky.flyToConstellation(el.dataset.con); break; }
      case 'minefly': { const m = S.mine.find(x => x.id === el.dataset.id); if (m) { const us = [...new Set(m.edges.flat())].map(u => starByUid[u]).filter(Boolean); if (us.length) { const ra = Math.atan2(us.reduce((a, x) => a + Math.sin(x.ra * H2R), 0), us.reduce((a, x) => a + Math.cos(x.ra * H2R), 0)), dec = us.reduce((a, x) => a + x.dec, 0) / us.length * D2R; sky.flyTo((ra + 2 * Math.PI) % (2 * Math.PI), dec, Math.max(sky.defaultScale() * 3.2, 900), 1800); } } break; }
      case 'minedel': { const i = S.mine.findIndex(x => x.id === el.dataset.id); if (i >= 0) { S.mine.splice(i, 1); saveMine(); renderPanel(true); } break; }
      case 'minepng': { const m = S.mine.find(x => x.id === el.dataset.id); if (m) minePoster(m); break; }
      case 'chain': S.chain = !S.chain; renderPanel(true); break;
      case 'undo': { for (let i = cn.edges.length - 1; i >= 0; i--) if (cn.edges[i].state !== 'wrong') { cn.edges.splice(i, 1); break; } cn.pending = null; renderPanel(true); break; }
      case 'reset': cn.edges = []; cn.pending = null; renderPanel(true); break;
      case 'start': startChallenge(el.dataset.con); break;
      case 'hint': { const c = consById[S.target]; cn.hints = cn.hints ? null : new Set(c.stars.map(s => s.uid)); renderPanel(true); break; }
      case 'reveal': { const c = consById[S.target]; cn.edges = []; const now = performance.now(); c.edges.forEach((e, i) => cn.edges.push({ a: e[0], b: e[1], key: e[2], t0: now + i * 180, state: 'ok', revealed: true })); S.revealed = true; S.won = true; cn.hints = null; cn.celebrate = { con: c.id, t0: now }; sky.opts.hideConLabels = false; renderPanel(); break; }
      case 'pickother': cn.hideNames = false; S.target = null; S.won = false; cn.edges = []; cn.hints = null; cn.celebrate = null; sky.setSelected(null); renderPanel(); break;
      case 'nextch': { const rest = cons.filter(k => !S.solved.has(k.id) && k.id !== S.target); const pool = rest.length ? rest : cons; startChallenge(pool[Math.floor(Math.random() * pool.length)].id); break; }
    }
  }

  /* ───────── 황도 12궁 ───────── */
  function wheelSVG() {
    const C = 165, R = 118, INK = '#16171b'; let ticks = ''; for (let i = 0; i < 72; i++) { const a = i * 5 * D2R, r1 = R + 31, r2 = R + (i % 6 === 0 ? 40 : 35); ticks += `<line x1="${C + r1 * Math.cos(a)}" y1="${C + r1 * Math.sin(a)}" x2="${C + r2 * Math.cos(a)}" y2="${C + r2 * Math.sin(a)}" stroke="${INK}" stroke-opacity="${i % 6 === 0 ? .8 : .35}"/>`; }
    let g = `<g class="spin">${ticks}</g><circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="${INK}" stroke-opacity=".5" stroke-dasharray="2 5"/><circle cx="${C}" cy="${C}" r="${R - 54}" fill="none" stroke="${INK}" stroke-opacity=".25"/>`;
    const ang = i => (i * 30 - 90) * D2R, sunAng = SUN_ID === 'oph' ? ang(7.5) : ang(D.ZODIAC_ORDER.indexOf(SUN_ID));
    const sx = C + R * Math.cos(sunAng), sy = C + R * Math.sin(sunAng), ix = C + (R - 25) * Math.cos(sunAng), iy = C + (R - 25) * Math.sin(sunAng);
    g += `<circle cx="${sx}" cy="${sy}" r="34" fill="url(#sunG)" opacity=".75" pointer-events="none"/><path d="M${C + (R - 52) * Math.cos(sunAng)} ${C + (R - 52) * Math.sin(sunAng)} L${ix} ${iy}" stroke="${INK}" stroke-opacity=".7" pointer-events="none"/>`;
    D.ZODIAC_ORDER.forEach((id, i) => {
      const a = ang(i), x = C + R * Math.cos(a), y = C + R * Math.sin(a), lx = C + (R - 38) * Math.cos(a), ly = C + (R - 38) * Math.sin(a);
      g += `<g class="node ${S.zod === id ? 'on' : ''}" data-zod="${id}" tabindex="0" role="button" aria-label="${consById[id].ko}"><circle class="bg" cx="${x}" cy="${y}" r="21"/><text x="${x}" y="${y + 1}">${D.SUN_TROPICAL[id][2]}&#xFE0E;</text></g><text class="lab" x="${lx}" y="${ly + 3}">${consById[id].abbr.toUpperCase()}</text>`;
    });
    const ox = C + R * Math.cos(ang(7.5)), oy = C + R * Math.sin(ang(7.5));
    g += `<g><title>Ophiuchus: the Sun passes through it from Nov 30 to Dec 17, but it is not one of the twelve signs</title><circle cx="${ox}" cy="${oy}" r="9" fill="#e7e2d3" stroke="${INK}" stroke-dasharray="2 2"/><text x="${ox}" y="${oy + 3}" fill="${INK}" font-size="8" font-family="DM Mono, monospace" text-anchor="middle">13</text></g>`;
    const dstr = `${MONTHS[NOW.getMonth()]} ${NOW.getDate()}`;
    g += `<text x="${C}" y="${C - 22}" text-anchor="middle" fill="${INK}" font-size="8.5" font-family="DM Mono, monospace" letter-spacing="2.6">TODAY</text><text x="${C}" y="${C + 8}" text-anchor="middle" fill="${INK}" font-size="30" font-style="italic" font-family="Instrument Serif, Georgia, serif">${dstr}</text><text x="${C}" y="${C + 28}" text-anchor="middle" fill="${INK}" font-size="9" font-family="DM Mono, monospace" letter-spacing="1.4">SUN · ${conName(SUN_ID).toUpperCase()}</text>`;
    return `<svg class="wheel" viewBox="0 0 330 330" role="group" aria-label="Zodiac wheel"><defs><radialGradient id="sunG"><stop offset="0" stop-color="#a9c2ee" stop-opacity=".95"/><stop offset="1" stop-color="#a9c2ee" stop-opacity="0"/></radialGradient></defs>${g}</svg>`;
  }
  function zodiacPanel() {
    const id = S.zod, c = id && consById[id], t = id && D.SUN_TROPICAL[id];
    const iau = id && D.SUN_IAU[id], fm = ([m, d]) => `${MONTHS[m - 1]} ${d}`;
    const sunNote = SUN_ID === 'oph' ? `Today the Sun sits toward <b>Ophiuchus</b>. It is not one of the twelve signs, yet the Sun really passes through it.` : `Today the Sun lies toward <b>${conName(SUN_ID)}</b>. Astrology would call this <b>${astroNameOnDate(NOW)}</b> season.`;
    let detail = '';
    if (c) {
      detail = `<div class="sec"><div class="eyebrow" style="margin-top:10px">${t[3]} — ${c.abbr}</div><h2 class="title sm" style="margin-top:12px;font-size:${tsize(c.ko, 56)}px">${c.ko}</h2><div class="latin">${c.latin}</div>
        <p class="lede">${c.intro}</p>
        <div class="twin"><div class="astro"><h4>Astronomy · observed</h4><span class="big">${fm(iau[0])}<br>– ${fm(iau[1])}</span>When the Sun actually crosses this constellation (IAU boundaries).</div>
        <div class="astrol"><h4>Astrology · tradition</h4><span class="big">${t[2]}&#xFE0E; ${t[0]}<br>– ${t[1]}</span>A traditional 30° split from the March equinox. No scientific basis.</div></div>
        <p class="note" style="margin-top:12px">Why they differ: Earth's axis slowly wobbles (precession), so the sky has slid about one sign since this calendar was fixed, some 2,000 years ago.</p></div>
        <div class="sec"><h3>Main stars <small>tap one</small></h3>${[...c.stars].sort((a, b) => a.mag - b.mag).slice(0, 6).map(s => `<button class="row" data-star="${s.uid}"><span class="nm">${s.ko.split(' (')[0]}</span><span class="bar"><i style="width:${clamp((6.5 - s.mag) / 6.7, .03, 1) * 100}%"></i></span><span class="val">${fmtMag(s.mag)}</span></button>`).join('')}</div>
        <div class="sec"><h3>Myth</h3><p class="body">${c.myth}</p></div>
        <div class="sec"><div class="btnrow" style="margin-top:14px"><button class="cta" data-act="opencon" data-con="${c.id}">Full constellation page</button></div></div>`;
    } else detail = `<p class="body" style="margin-top:14px">Tap a symbol on the wheel to choose a sign.</p>`;
    return `<div class="panel-in"><div class="eyebrow">Zodiac explorer</div><h2 class="title sm">Zodiac</h2><div class="latin">The Sun's yearly path</div>
      <p class="lede">Twelve constellations along the ecliptic. Astronomy and astrology are two different stories.</p>
      ${wheelSVG()}<div class="today">${sunNote}</div>${detail}</div>`;
  }
  function astroNameOnDate(date) {
    const x = (date.getMonth() + 1) * 100 + date.getDate(); const table = [[321, 419, 'ari'], [420, 520, 'tau'], [521, 620, 'gem'], [621, 722, 'cnc'], [723, 822, 'leo'], [823, 922, 'vir'], [923, 1022, 'lib'], [1023, 1121, 'sco'], [1122, 1221, 'sgr'], [1222, 1231, 'cap'], [101, 119, 'cap'], [120, 218, 'aqr'], [219, 320, 'psc']];
    const hit = table.find(([a, b]) => x >= a && x <= b); return hit ? D.SUN_TROPICAL[hit[2]][3] : '';
  }
  function selectZodiac(id) {
    S.zod = id; S.con = id; S.star = null; S.obj = null; sky.setSelected(id); sky.setSelectedStar(null); renderPanel(); updateInsets(); sky.flyToConstellation(id);
  }

  /* ───────── 패널 렌더/인셋 ───────── */
  const nf = rows => `<dl class="nf">${rows.map(([t, v]) => `<div><dt>${t}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  function noteCon(c) {
    const br = starByUid[c.id + ':' + c.brightest];
    return `<div class="note-in"><button class="close" data-act="close" aria-label="Close">✕</button>
      <div class="eyebrow">Constellation — ${c.abbr}</div><h2 class="title" style="font-size:${tsize(c.ko, 50)}px">${c.ko}</h2><div class="latin">${c.latin}</div>
      ${nf([['Season', c.season], ['Brightest', `${br.ko.split(' (')[0]} <small>${fmtMag(br.mag)}</small>`], ['Stars', c.stars.length], ['RA · Dec', `${fmtRA(c.ra / H2R)} ${fmtDec(c.dec / D2R)}`]])}
      <p class="lede">${c.intro}</p>
      <div class="btnrow"><button class="cta ghost" data-act="more">Story</button><button class="cta" data-act="challenge" data-con="${c.id}">Connect</button></div>
      <div class="more"><p class="body">${c.myth}</p><ul class="facts">${c.facts.map(f => `<li>${f}</li>`).join('')}</ul></div></div>`;
  }
  function noteStar(s) {
    const c = consById[s.con], L = specLetter(s.spec), info = L && specInfo(L), note = STAR_NOTE[s.uid], ex = explainStar(s);
    return `<div class="note-in"><button class="close" data-act="close" aria-label="Close">✕</button>
      <div class="backrow"><button class="linkbtn" data-act="${S.con ? 'back' : 'opencon'}" data-con="${s.con}">← ${c.ko}</button></div>
      <div class="eyebrow">Star — ${s.bayer}</div><h2 class="title" style="font-size:${tsize(s.en, 50)}px">${s.en}</h2>
      <div class="latin"><span class="orb" style="background:radial-gradient(circle at 36% 32%,#fff 0,${s.col} 45%,${s.col} 100%)"></span>${info ? CLASS_WORD[L] : 'spectral type uncertain'}</div>
      ${nf([['Magnitude', fmtMag(s.mag)], ['Distance', s.dist == null ? '—' : s.dist.toLocaleString() + ' <small>ly</small>'], ['Class', s.spec || '—'], ['Surface', info ? info.t : '—']])}
      <p class="lede">${note || ex[ex.length - 1] || ''}</p>
      <div class="btnrow"><button class="cta ghost" data-act="more">More</button></div>
      <div class="more"><p class="body">${ex.join(' ')}</p></div></div>`;
  }
  function noteObj(o) {
    const c = consById[o.con];
    return `<div class="note-in"><button class="close" data-act="close" aria-label="Close">✕</button>
      <div class="backrow"><button class="linkbtn" data-act="${S.con ? 'back' : 'opencon'}" data-con="${o.con}">← ${c.ko}</button></div>
      <div class="eyebrow">Deep sky — ${o.en}</div><h2 class="title" style="font-size:${tsize(o.ko, 46)}px">${o.ko}</h2><div class="latin">${o.type}</div>
      ${nf([['Magnitude', fmtMag(o.mag)], ['Distance', (o.dist >= 1e6 ? (Math.round(o.dist / 1e5) / 10).toLocaleString() + ' M' : o.dist.toLocaleString()) + ' <small>ly</small>'], ['In', c.ko], ['Seen', o.mag <= 6 ? 'naked eye' : 'telescope']])}
      <p class="lede">The light you see left ${lightYear(o.dist)}.</p></div>`;
  }
  function renderPanel(noAnim) {
    let html = '';
    if (S.mode === 'plates') html = '';
    else if (S.mode === 'connect') html = connectPanel();
    else if (S.obj) html = noteObj(S.obj);
    else if (S.star) html = noteStar(S.star);
    else if (S.con) html = noteCon(consById[S.con]);
    if (!html) { panel.hidden = true; document.body.classList.remove('sheet-open'); updateInsets(); return; }
    const st = noAnim ? panel.scrollTop : 0; panel.innerHTML = html; panel.hidden = false; panel.scrollTop = st;
    panel.classList.toggle('dock', S.mode === 'connect'); if (!noAnim) panel.classList.remove('open-more');
    const pin = panel.querySelector('.note-in,.dock-in'); if (pin && noAnim) pin.style.animation = 'none';
    document.body.classList.toggle('sheet-open', mobile()); updateInsets();
  }
  function updateInsets() {
    if (!mobile()) {
      const dock = S.mode === 'connect' && !panel.hidden;
      sky.setInset({ l: panel.hidden || dock ? 96 : 96 + 372, r: 40, t: 96, b: dock ? (panel.offsetHeight || 170) + 110 : 100 });
      document.documentElement.style.setProperty('--pw', '0px');
    } else {
      const nav = 66; let b = nav + 70;
      if (!panel.hidden) b = nav + Math.min(panel.offsetHeight || innerHeight * 0.4, innerHeight * 0.5) + 6;
      sky.setInset({ l: 0, r: 0, t: 64, b });
    }
  }

  /* ───────── 선택 ───────── */
  function selectCon(id, fly = true) {
    S.con = id; S.star = null; S.obj = null; sky.selObj = null; sky.setSelected(id); sky.setSelectedStar(null);
    renderPanel(); markRail(); if (fly) sky.flyToConstellation(id);
  }
  function selectStar(s) {
    S.star = s; S.obj = null; sky.selObj = null; sky.setSelectedStar(s.uid); renderPanel();
    sky.flyTo(s.ra * H2R, s.dec * D2R, Math.max(sky.scale, 1300), 1400);
  }
  function selectObj(o) {
    S.obj = o; S.star = null; sky.setSelectedStar(null); sky.selObj = o.uid; renderPanel();
    sky.flyTo(o.ra * H2R, o.dec * D2R, Math.max(sky.scale, 1500), 1400);
  }
  function clearDetail() { S.star = null; S.obj = null; sky.selObj = null; sky.setSelectedStar(null); renderPanel(); }

  /* ───────── plates ───────── */
  const platesEl = $('#plates'); let plateCtl = null;
  function showPlates() {
    if (!plateCtl) plateCtl = window.AstraPlates.build(platesEl, { star: uid => { setMode('explore'); selectStar(starByUid[uid]); }, con: id => { setMode('explore'); selectCon(id); } });
    else plateCtl.reset();
    panel.hidden = true; rail.hidden = true; updateInsets();
  }

  /* ───────── 모드 ───────── */
  function setMode(m) {
    if (m === S.mode) { return; }
    const prev = S.mode; S.mode = m; if (m !== 'explore') setWander(false);
    $$('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.mode === m ? 'true' : 'false'));
    document.body.dataset.mode = m;
    // 공통 초기화
    Object.assign(sky.opts, { ecliptic: false, starNames: false, hideConLabels: false, labelSet: null, lineSet: null });
    sky.connect = null; S.star = null; S.obj = null; sky.selObj = null; sky.setSelectedStar(null); setLock(false);
    platesEl.hidden = m !== 'plates'; if (m === 'plates') { showPlates(); toastEl.classList.remove('show'); }
    if (prev === 'connect' || prev === 'zodiac') { S.con = null; sky.setSelected(null); }
    rail.hidden = m !== 'constellations';
    if (m === 'explore') { S.con = null; sky.setSelected(null); renderPanel(); toast('Tap a star for facts, or a constellation name for its story', '', 4200); }
    if (m === 'constellations') { if (!rail.firstChild) renderRail(); if (!mobile() || S.con) selectCon(S.con || 'ori'); else { renderPanel(); markRail(); toast('Pick a constellation below', '', 3200); } }
    if (m === 'connect') { enterConnect(); setLock(hands.active); if (hands.active) S.chain = true; S.cTab = 'free'; S.target = null; S.won = false; S.con = null; sky.setSelected(null); renderPanel(); toast(hands.active ? 'View locked. Pinch a star, let go, then pinch the next. Pinch empty sky to end the line' : 'Tap stars in turn, or drag from one star to another', '', 4800); }
    if (m === 'zodiac') {
      sky.opts.ecliptic = true; sky.opts.labelSet = ZSET; sky.opts.lineSet = ZSET; sky.opts.lines = true; syncSeg();
      const start = ZSET.has(SUN_ID) ? SUN_ID : 'sgr'; S.zod = start; S.con = start; sky.setSelected(start); renderPanel(); updateInsets(); sky.flyToConstellation(start, 2400);
    }
    if (m !== 'constellations') markRail();
    renderPanel(); updateInsets();
    if (m === 'explore') { sky.flyHome(); }
  }
  function syncSeg() { $('#vClean').setAttribute('aria-pressed', !sky.opts.lines); $('#vLines').setAttribute('aria-pressed', sky.opts.lines); }

  /* ───────── 이벤트 ───────── */
  $('#nav').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { if (b.dataset.mode === S.mode) return; if (S.mode === 'zodiac' && b.dataset.mode !== 'zodiac') { sky.opts.lines = false; syncSeg(); } setMode(b.dataset.mode); } });
  sky.on('click', ({ star, obj, con, x, y }) => {
    if (!star && !obj && !con) fx.wish(x, y); else if (star) fx.burst(x, y, 8);
    if (S.mode === 'connect') { connectClick(star); return; }
    if (S.mode === 'zodiac') { if (star) selectStar(star); else if (con && ZSET.has(con)) selectZodiac(con); else if (S.star) clearDetail(); return; }
    if (star) selectStar(star); else if (obj) selectObj(obj); else if (con) selectCon(con); else if (S.star || S.obj) clearDetail();
  });
  sky.on('linkstart', ({ star }) => { if (S.mode === 'connect' && sky.connect) { const cn = sky.connect; if (cn.pending && cn.pending !== star.uid) connectClick(star); else cn.pending = star.uid; sky.pulse(star.uid, 700); } });
  sky.on('linkend', ({ from, to }) => {
    const cn = sky.connect; if (!cn) return;
    if (to && to.uid !== from.uid) { connectClick(to); fx.burst(...Object.values(sky.starXY(to.uid) || { x: 0, y: 0 }), 10); }
    else { cn.pending = null; }
  });
  sky.on('hover', ({ star }) => {
    if (star) { const hide = S.mode === 'connect' && sky.connect && sky.connect.hideNames; tip.innerHTML = hide ? `<span>${magTxt(star.mag)}</span>` : `${star.ko.split(' (')[0]}<small>${magTxt(star.mag)}</small>`; tip.classList.add('show'); } else tip.classList.remove('show');
  });
  canvas.addEventListener('pointermove', e => { tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; });

  function panelClick(e) {
    const t = e.target.closest('[data-act],[data-star],[data-con],[data-zod],[data-obj]'); if (!t) return;
    const act = t.dataset.act;
    if (act) {
      if (['tab', 'tochallenge', 'lock', 'dice', 'save', 'fly', 'minefly', 'minedel', 'minepng', 'chain', 'undo', 'reset', 'start', 'hint', 'reveal', 'pickother', 'nextch'].includes(act)) { connectAct(act, t); return; }
      if (act === 'more') { panel.classList.toggle('open-more'); return; }
      if (act === 'close') {
        if (S.star || S.obj) clearDetail();
        else if (S.mode === 'explore' || S.mode === 'constellations') { S.con = null; sky.setSelected(null); renderPanel(); markRail(); }
        return;
      }
      if (act === 'back') { clearDetail(); return; }
      if (act === 'opencon') { const id = t.dataset.con; if (S.mode !== 'explore') setMode('explore'); S.con = id; S.star = null; S.obj = null; selectCon(id); if (rail.hidden === false) markRail(); return; }
      if (act === 'challenge') { const id = t.dataset.con; setMode('connect'); startChallenge(id); return; }
      if (act === 'tozodiac') { const id = t.dataset.con; setMode('zodiac'); selectZodiac(id); return; }
    }
    if (t.dataset.star) { selectStar(starByUid[t.dataset.star]); return; }
    if (t.dataset.obj) { selectObj(objByUid[t.dataset.obj]); return; }
    if (t.dataset.zod) { selectZodiac(t.dataset.zod); return; }
  }
  panel.addEventListener('click', panelClick);
  panel.addEventListener('input', e => { if (e.target.id === 'mineName') S.draftName = e.target.value; if (e.target.id === 'mineNote') S.draftNote = e.target.value; });
  panel.addEventListener('pointerover', e => { const m = e.target.closest('.mine'); sky.hoverMine = m ? m.dataset.id : null; });
  panel.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.zod) { e.preventDefault(); selectZodiac(e.target.dataset.zod); } });
  rail.addEventListener('click', e => { const b = e.target.closest('[data-con]'); if (b) selectCon(b.dataset.con); });

  $('#vClean').addEventListener('click', () => { sky.opts.lines = false; syncSeg(); });
  $('#vLines').addEventListener('click', () => { sky.opts.lines = true; syncSeg(); });
  $('#tNames').addEventListener('click', e => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', on); sky.opts.starNames = on; });
  $('#tGrid').addEventListener('click', e => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', on); sky.opts.grid = on; });
  $('#zIn').addEventListener('click', () => sky.zoomBy(1.5));
  $('#zOut').addEventListener('click', () => sky.zoomBy(1 / 1.5));
  $('#zHome').addEventListener('click', () => sky.flyHome());
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (S.star || S.obj) clearDetail(); else if (S.con && (S.mode === 'explore' || S.mode === 'constellations')) { S.con = null; sky.setSelected(null); renderPanel(); markRail(); } }
    if (e.target.closest && e.target.closest('input')) return;
    if (e.key === '+' || e.key === '=') sky.zoomBy(1.4); if (e.key === '-') sky.zoomBy(1 / 1.4);
  });
  window.addEventListener('resize', () => { updateInsets(); });

  /* ───────── 미디어아트 효과 ───────── */
  const fx = new window.AstraFX($('#fx'));
  addEventListener('pointermove', e => { if (e.pointerType !== 'touch' || e.buttons) fx.pointer(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener('pointerleave', () => fx.leave());
  $('#tFx').addEventListener('click', e => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', on); fx.setShower(on); if (on) toast('Meteors are falling. Tap the sky to make a wish', '', 3600); });

  /* ───────── HUD ───────── */
  const hud = $('#hud');
  setInterval(() => {
    const cc = sky.centerCoords(), fov = 4 * Math.atan(sky.w / 2 / sky.scale / 2) / D2R;
    hud.innerHTML = `RA <span>${fmtRA(cc.ra)}</span> · DEC <span>${fmtDec(cc.dec)}</span> · FOV <span>${Math.round(fov)}°</span>`;
    if (!panel.hidden) updateMiniView();
  }, 160);
  $('#night').innerHTML = `<b>${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][NOW.getDay()]} ${NOW.getDate()} ${MONTHS[NOW.getMonth()]}</b>Sun in ${conName(SUN_ID)}`;

  /* ───────── 인트로 ───────── */
  const enter = () => window.AstraIntro.skip();
  window.AstraIntro.onDone = () => {
    sky.lastInput = performance.now(); sky.flyTo(4.6 * H2R, 12 * D2R, sky.defaultScale(), 3600);
    setTimeout(() => fx.meteor({ big: true }), 700);
    const hero = $('#hero'); hero.classList.add('show'); const hide = () => hero.classList.remove('show'); setTimeout(hide, 6200); addEventListener('pointerdown', hide, { once: true });
    setTimeout(() => toast('Press Hands (top right) to explore with your hands. Or tap a star', '', 5600), 2200);
  };
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && !window.AstraIntro.done) window.AstraIntro.play(); });

  /* ───────── wander: free exploring ───────── */
  const byRA = [...cons].sort((a, b) => a.ra - b.ra);
  function stepCon(dir) {
    if (S.mode === 'plates') return;
    let i = S.con ? byRA.findIndex(c => c.id === S.con) : -1;
    if (i < 0) { const cc = sky.centerCoords(), ra = cc.ra * H2R; let best = 1e9; byRA.forEach((c, k) => { const d = Math.abs(((c.ra - ra + 3 * Math.PI) % (2 * Math.PI)) - Math.PI); if (d < best) { best = d; i = k; } }); }
    const c = byRA[(i + dir + byRA.length) % byRA.length];
    if (S.mode === 'connect') { sky.flyToConstellation(c.id); toast(c.ko, '', 1600); } else { selectCon(c.id); fx.meteor({}); }
  }
  let wander = null;
  function setWander(on) {
    if (on === !!wander) return; const b = $('#tWander');
    if (on) {
      if (S.mode !== 'explore') setMode('explore');
      const step = () => { const pool = cons.filter(c => c.id !== S.con); selectCon(pool[Math.floor(Math.random() * pool.length)].id); if (Math.random() < .6) setTimeout(() => fx.meteor({}), 1500); };
      step(); wander = setInterval(step, 9000); toast('Wandering the sky. Touch anything to take over', '', 3800);
    } else { clearInterval(wander); wander = null; }
    b.setAttribute('aria-pressed', !!wander);
  }
  $('#tWander').addEventListener('click', () => setWander(!wander));
  canvas.addEventListener('pointerdown', () => setWander(false)); canvas.addEventListener('wheel', () => setWander(false), { passive: true });
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input')) return;
    if (e.key === 'ArrowRight') stepCon(1); else if (e.key === 'ArrowLeft') stepCon(-1);
    else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); setWander(!wander); }
  });

  /* ───────── 손 동작 ───────── */
  const handHud = $('#handHud'), handText = $('#handText'), tHand = $('#tHand');
  const hands = new window.AstraHands(sky, {
    fx,
    onGesture: g => { if (g === 'next') stepCon(1); else if (g === 'prev') stepCon(-1); else if (g === 'wander') setWander(!wander); },
    onStatus: t => { handText.textContent = t; },
    onChange: on => { if (S.mode === 'connect') { setLock(on); S.chain = on || S.chain; renderPanel(true); } tHand.setAttribute('aria-pressed', on); $('#handBtn').setAttribute('aria-pressed', on); document.body.classList.toggle('hand-on', on); handHud.hidden = !on; if (on) toast(S.mode === 'connect' ? 'View locked. Pinch a star, let go, then pinch the next. Pinch empty sky to end the line' : 'The hand guide on the right shows every gesture', '', 5000); },
    onError: msg => { handHud.hidden = true; tHand.setAttribute('aria-pressed', 'false'); $('#handBtn').setAttribute('aria-pressed', 'false'); document.body.classList.remove('hand-on'); toast(msg, 'bad', 9000); },
  });
  tHand.addEventListener('click', () => {
    if (hands.active || hands.loading) { hands.stop(); handHud.hidden = true; tHand.setAttribute('aria-pressed', 'false'); return; }
    if (!window.AstraIntro.done) enter();
    handHud.hidden = false; tHand.setAttribute('aria-pressed', 'true'); hands.start();
  });
  $('#handOff').addEventListener('click', () => { hands.stop(); handHud.hidden = true; tHand.setAttribute('aria-pressed', 'false'); $('#handBtn').setAttribute('aria-pressed', 'false'); document.body.classList.remove('hand-on'); });
  $('#handBtn').addEventListener('click', () => tHand.click());

  renderRail(); updateInsets(); syncSeg();
  window.ASTRA = { sky, S, setMode, hands }; // 디버깅 / 검증용
})();
