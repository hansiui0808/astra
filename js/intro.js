/* ASTRA — intro: the cobalt cover opens, a folded chart unfolds and zooms to fill the screen.
 * The chart is drawn from real star data (RA/Dec). The Milky Way is a decorative stipple along the galactic plane.
 */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const D = window.ASTRA_DATA, AS = window.AstraSky;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.65,.05,.25,1)', EASE_OUT = 'cubic-bezier(.2,.7,.2,1)';
  let done = false, started = false, onDone = null;

  // 난수(고정 시드): 점의 위치가 매번 같게
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 0.58;

  // 은하 좌표 → 적도 좌표 (J2000)
  const D2R = Math.PI / 180, NGP_RA = 192.85948 * D2R, NGP_DEC = 27.12825 * D2R, LNCP = 122.93192 * D2R;
  function galToEq(l, b) {
    const sd = Math.sin(b) * Math.sin(NGP_DEC) + Math.cos(b) * Math.cos(NGP_DEC) * Math.cos(LNCP - l);
    const dec = Math.asin(sd);
    const y = Math.cos(b) * Math.sin(LNCP - l), x = Math.sin(b) * Math.cos(NGP_DEC) - Math.cos(b) * Math.sin(NGP_DEC) * Math.cos(LNCP - l);
    let ra = NGP_RA + Math.atan2(y, x); ra = ((ra % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return { ra: ra / D2R / 15, dec: dec / D2R };
  }

  function mapDefs(W, H) {
    const m = H * 0.07, X = ra => m + (24 - ra) / 24 * (W - 2 * m), Y = dec => m + 14 + (90 - dec) / 155 * (H - 2 * m - 28);
    let g = `<rect width="${W}" height="${H}" fill="#e7e2d3"/><rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" fill="url(#mg)" stroke="#16171b" stroke-width="1.6"/>`;
    g += `<rect x="${m + 7}" y="${m + 7}" width="${W - 2 * m - 14}" height="${H - 2 * m - 14}" fill="none" stroke="rgba(246,238,214,.55)" stroke-width="1"/>`;
    // 격자
    for (let h = 0; h <= 24; h += 2) g += `<line x1="${X(h)}" y1="${m}" x2="${X(h)}" y2="${H - m}" stroke="rgba(241,234,214,.13)" stroke-width="1"/>`;
    for (let d = -60; d <= 80; d += 20) g += `<line x1="${m}" y1="${Y(d)}" x2="${W - m}" y2="${Y(d)}" stroke="rgba(241,234,214,.13)" stroke-width="1"/>`;
    // 황도(대략): dec = atan(tan(23.44°)·sin(ra))
    let ec = ''; for (let h = 0; h <= 24; h += 0.25) ec += `${h ? 'L' : 'M'}${X(h).toFixed(1)} ${Y(Math.atan(Math.tan(23.44 * D2R) * Math.sin(h * 15 * D2R)) / D2R).toFixed(1)}`;
    g += `<path d="${ec}" fill="none" stroke="rgba(169,194,238,.85)" stroke-width="1.2" stroke-dasharray="7 6"/>`;
    // 은하수 점묘
    let dots = ''; seed = 11;
    for (let i = 0; i < 2600; i++) {
      const l = rnd() * 2 * Math.PI, core = Math.exp(-Math.pow(((l + Math.PI) % (2 * Math.PI)) - Math.PI, 2) / 1.3), b = gauss() * (0.09 + 0.07 * core) * (0.7 + rnd() * 0.6);
      const p = galToEq(l, b); if (p.dec < -62 || p.dec > 90) continue;
      if (rnd() > 0.35 + 0.65 * core) continue;
      dots += `<circle cx="${X(p.ra).toFixed(1)}" cy="${Y(p.dec).toFixed(1)}" r="${(0.5 + rnd() * 1.2).toFixed(2)}"/>`;
    }
    g += `<g fill="rgba(246,238,214,.78)">${dots}</g>`;
    // constellations (clipped to the chart frame)
    g += `<clipPath id="mclip"><rect x="${m + 8}" y="${m + 8}" width="${W - 2 * m - 16}" height="${H - 2 * m - 16}"/></clipPath><g clip-path="url(#mclip)">`;
    let ln = '', st = '', tx = '';
    for (const c of D.constellations) {
      const C = AS.consById[c.id]; if (!C) continue;
      for (const e of C.edges) { const a = AS.starByUid[e[0]], b = AS.starByUid[e[1]]; if (!a || !b) continue; const xa = X(a.ra), xb = X(b.ra); if (Math.abs(xa - xb) > W / 3) continue; ln += `M${xa.toFixed(1)} ${Y(a.dec).toFixed(1)}L${xb.toFixed(1)} ${Y(b.dec).toFixed(1)}`; }
      let sx = 0, sy = 0, cs = 0, sn = 0; for (const s of C.stars) { cs += Math.cos(s.ra / 12 * Math.PI); sn += Math.sin(s.ra / 12 * Math.PI); sy += Y(s.dec); const x = X(s.ra), y = Y(s.dec);
        if (s.mag < 2.3) { const L = s.mag < 1.2 ? 12 : 8; let d = ''; for (let k = 0; k < 12; k++) { const a = -Math.PI / 2 + k * Math.PI / 6, r = k % 2 ? L * 0.27 : L; d += `${k ? 'L' : 'M'}${(x + Math.cos(a) * r).toFixed(1)} ${(y + Math.sin(a) * r).toFixed(1)}`; } st += `<path d="${d}Z"/>`; }
        else st += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(1.4, 3.2 - s.mag * 0.4).toFixed(1)}"/>`; }
      const mra = ((Math.atan2(sn, cs) / Math.PI * 12) + 24) % 24, ly = sy / C.stars.length - 16; if (ly > m + 40) tx += `<text x="${(() => { const hw = c.ko.length * H * 0.04 * 0.27 + 8; return Math.min(W - m - hw, Math.max(m + hw, X(mra))).toFixed(1); })()}" y="${ly.toFixed(1)}">${c.ko}</text>`;
    }
    g += `<path d="${ln}" fill="none" stroke="rgba(169,194,238,.92)" stroke-width="1.2" stroke-linecap="round"/><g fill="#f4ecd8">${st}</g>`;
    g += `<g fill="#f1ead6" font-family="Instrument Serif, Georgia, serif" font-style="italic" font-size="${Math.round(H * 0.04)}" text-anchor="middle" opacity=".95">${tx}</g>`;
    g += '</g>';
    // 시각 눈금 (RA)
    let lab = ''; for (let h = 2; h < 24; h += 4) lab += `<text x="${X(h)}" y="${m + 17}">${h}h</text>`;
    for (let d = -20; d <= 60; d += 40) lab += `<text x="${m + 12}" y="${Y(d) - 6}" text-anchor="start">${d < 0 ? '−' : '+'}${Math.abs(d)}°</text>`;
    g += `<g fill="rgba(241,234,214,.8)" font-family="DM Mono, ui-monospace, monospace" font-size="${Math.round(H * 0.018)}" letter-spacing="1.2" text-anchor="middle">${lab}</g>`;
    // margin typography
    const ink = '#16171b', fz = Math.round(m * 0.62);
    g += `<text x="${W / 2}" y="${m * 0.7}" text-anchor="middle" font-family="Instrument Serif, Georgia, serif" font-size="${fz}" fill="${ink}" letter-spacing="-.5">Star Chart <tspan font-style="italic">N° XII</tspan></text>`;
    g += `<text x="${m}" y="${H - m * 0.36}" font-family="DM Mono, ui-monospace, monospace" font-size="${Math.round(m * 0.2)}" letter-spacing="2" fill="${ink}">NORTHERN SKY · EPOCH J2000</text>`;
    g += `<text x="${W - m}" y="${H - m * 0.36}" text-anchor="end" font-family="DM Mono, ui-monospace, monospace" font-size="${Math.round(m * 0.2)}" letter-spacing="2" fill="${ink}">ASTRA — VOL. I</text>`;
    // spot-colour marks (pale blue square with a triangle, black dot)
    const qs = m * 0.44; g += `<rect x="${m}" y="${m * 0.2}" width="${qs}" height="${qs}" fill="#a9c2ee"/><path d="M${m + qs / 2} ${m * 0.2 + qs * 0.26}L${m + qs * 0.64} ${m * 0.2 + qs * 0.62}L${m + qs * 0.36} ${m * 0.2 + qs * 0.62}Z" fill="${ink}"/><circle cx="${W - m - qs / 2}" cy="${m * 0.2 + qs / 2}" r="${qs / 2}" fill="${ink}"/>`;
    // 나침반 장미
    const cx = W - m - H * 0.15, cy = H - m - H * 0.15, R = H * 0.095; let rose = '';
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, r = k % 4 === 0 ? R : k % 2 === 0 ? R * 0.62 : R * 0.4; rose += `${k ? 'L' : 'M'}${(cx + Math.sin(a) * r).toFixed(1)} ${(cy - Math.cos(a) * r).toFixed(1)}L${(cx + Math.sin(a + Math.PI / 16) * R * 0.22).toFixed(1)} ${(cy - Math.cos(a + Math.PI / 16) * R * 0.22).toFixed(1)}`; }
    g += `<g><circle cx="${cx}" cy="${cy}" r="${R * 1.12}" fill="none" stroke="rgba(246,238,214,.75)"/><circle cx="${cx}" cy="${cy}" r="${R * 0.95}" fill="none" stroke="rgba(246,238,214,.4)" stroke-dasharray="2 4"/><path d="${rose}Z" fill="rgba(246,238,214,.9)"/><text x="${cx}" y="${cy - R * 1.22}" text-anchor="middle" font-size="${R * 0.4}" font-family="Instrument Serif, serif" font-style="italic" fill="#f1ead6">N</text></g>`;
    return g;
  }

  function build(W, H, Pw) {
    const wrap = $('#mapwrap');
    const defs = `<svg width="0" height="0" style="position:absolute"><defs><radialGradient id="mg" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#202228"/><stop offset=".6" stop-color="#16171c"/><stop offset="1" stop-color="#0e0f12"/></radialGradient><g id="mapG">${mapDefs(W, H)}</g></defs></svg>`;
    const face = i => `<div class="f"><svg viewBox="${i * Pw} 0 ${Pw} ${H}" preserveAspectRatio="none"><use href="#mapG"/></svg></div>`;
    const back = [
      `<div class="b">N° XII<br>──────────<br>Orion · Taurus · Gemini<br>Ursa Major · Cassiopeia<br>Cygnus · Lyra · Leo<br>Scorpius · Sagittarius<br><em>Star chart</em></div>`,
      `<div class="b">· · · · · · · · · ·<br>Right ascension ↔ Declination<br>✦ Mag 1 &nbsp; ✧ Mag 2 &nbsp; · Mag 3<br>- - - Ecliptic<br><em>Find the stars</em></div>`,
      `<div class="b">Drawn from the J2000<br>catalogue of bright stars.<br>Milky Way: decorative stipple.<br><em>Fin.</em></div>`,
    ];
    wrap.innerHTML = defs + '<div class="mshadow"></div>' +
      `<div class="mp" id="mp1">${face(0)}${back[0]}<div class="mp" id="mp2">${face(1)}${back[1]}<div class="mp" id="mp3">${face(2)}${back[2]}</div></div></div>`;
    $('#mp2').style.transform = 'translateZ(-1px) rotateY(180deg)'; $('#mp3').style.transform = 'translateZ(1px) rotateY(-180deg)';
  }

  function size() {
    const vw = innerWidth, vh = innerHeight, narrow = vw < 760;
    const bw = narrow ? Math.min(vw * 0.8, vh * 0.52) : Math.min(vw * 0.32, vh * 0.45), bh = bw * 1.3;
    const mw = bw * 0.84, mh = bh * 0.84;
    const sc = $('#scene'); sc.style.setProperty('--bw', bw + 'px'); sc.style.setProperty('--bh', bh + 'px'); sc.style.setProperty('--mw', mw + 'px'); sc.style.setProperty('--mh', mh + 'px');
    return { vw, vh, bw, bh, mw, mh, narrow };
  }

  const A = (el, kf, o) => el.animate(kf, Object.assign({ fill: 'forwards', easing: EASE }, o)).finished;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  async function play() {
    if (started) return; started = true;
    const z = size(), book = $('#book'), cover = $('#cover'), wrap = $('#mapwrap'), ui = $('#introUi');
    ui.classList.add('off');
    if (reduce) { finish(); return; }
    book.classList.add('open'); const shift = z.narrow ? 0 : z.bw / 2;
    // 1) 책이 바로 서고 표지가 열린다
    A(book, [{ transform: 'rotateX(16deg) rotateZ(-3deg)' }, { transform: `translateX(${shift}px) rotateX(0deg) rotateZ(0deg)` }], { duration: 1500, easing: EASE_OUT });
    await wait(150);
    A(cover, [{ transform: 'translateZ(3px) rotateY(0deg)' }, { transform: 'translateZ(3px) rotateY(-179deg)' }], { duration: 1800 });
    await wait(1750);
    if (done) return;
    // 2) 접힌 지도가 책갈피처럼 떠오른다
    const fit = Math.min(1, z.vw * 0.92 / (3 * z.mw)), tx0 = shift + (z.narrow ? 0 : 0);
    wrap.style.transform = `translateX(${tx0}px) translateY(30px) rotateZ(2deg) scale(.96)`;
    await A(wrap, [{ opacity: 0, transform: `translateX(${tx0}px) translateY(34px) rotateZ(2deg) scale(.96)` }, { opacity: 1, transform: `translateX(${tx0}px) translateY(0) rotateZ(0deg) scale(1)` }], { duration: 800, easing: EASE_OUT });
    if (done) return;
    // 3) 지도를 펼친다 (가운데로 이동하며 두 번 접힘이 풀린다)
    const unfoldX = -z.mw * fit;      // 펼친 지도의 중심이 화면 중앙에 오도록
    wrap.style.transformOrigin = `${z.mw}px 50%`;
    A(wrap, [{ transform: `translateX(${tx0}px) scale(1)` }, { transform: `translateX(${unfoldX}px) scale(${fit})` }], { duration: 2800 });
    A($('.mshadow'), [{ transform: 'translateZ(-60px) scaleX(.34)' }, { transform: 'translateZ(-60px) scaleX(1)' }], { duration: 2800 });
    A(book, [{ opacity: 1 }, { opacity: 0.25 }], { duration: 2400, delay: 600 });
    await wait(500);
    A($('#mp2'), [{ transform: 'translateZ(-1px) rotateY(180deg)' }, { transform: 'translateZ(-1px) rotateY(0deg)' }], { duration: 1500, easing: EASE });
    await wait(1100);
    A($('#mp3'), [{ transform: 'translateZ(1px) rotateY(-180deg)' }, { transform: 'translateZ(1px) rotateY(0deg)' }], { duration: 1500, easing: EASE });
    await wait(2000);
    if (done) return;
    // 4) 화면 가득 확대 → 본 화면으로
    const S = Math.max(z.vw / (3 * z.mw), z.vh / z.mh) * 1.04;
    document.body.classList.add('map-zoom');
    await A(wrap, [{ transform: `translateX(${unfoldX}px) scale(${fit})` }, { transform: `translateX(${unfoldX}px) scale(${S})` }], { duration: 1500, easing: EASE });
    finish();
  }

  function finish() {
    if (done) return; done = true; started = true;
    const intro = $('#intro'); intro.classList.add('gone');
    document.body.classList.remove('intro-on');
    setTimeout(() => { intro.style.display = 'none'; }, 1500);
    onDone && onDone();
  }

  let inited = false;
  function init() {
    if (inited) return; inited = true;
    const z = size(); build(z.mw * 3, z.mh, z.mw);
    $('#coverLogo').innerHTML = window.astraLogo({ cls: 'wm-big' });
    $('#brand').innerHTML = window.astraLogo({ cls: 'wm-nav' });
    $('#enter').addEventListener('click', play);
    $('#book').addEventListener('click', () => { if (!started) play(); });
    $('#skip').addEventListener('click', () => finish());
    addEventListener('resize', () => { if (!started) size(); });
  }
  window.AstraIntro = { play, skip: finish, set onDone(f) { onDone = f; }, get done() { return done; }, init };
  window.addEventListener('DOMContentLoaded', init); if (document.readyState !== 'loading') init();
})();
