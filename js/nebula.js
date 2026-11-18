/* ASTRA — 성운·은하수 배경 (WebGL 프래그먼트 셰이더)
 * 화면의 모든 픽셀을 하늘의 방향 벡터로 되돌려, 그 방향의 은하 좌표(l, b)와 3D 노이즈로 색을 정한다.
 * 은하수 띠는 은하면의 실제 위치를 따르지만, 질감·색은 분위기를 위한 연출(샘플)이다.
 */
(function () {
  'use strict';
  const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const FS = `
precision highp float;
uniform vec2 uRes; uniform float uK; uniform vec2 uCenter; uniform float uScale;
uniform vec3 uC; uniform vec3 uE; uniform vec3 uN;
uniform vec3 uGC; uniform vec3 uGY; uniform vec3 uNGP;
uniform float uTime; uniform float uFade;
float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float stip(vec2 lb, float cells, float dens, float k){
  vec2 g = lb * cells; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
  float h = hash(vec3(id, 1.7));
  vec2 off = (vec2(hash(vec3(id, 2.1)), hash(vec3(id, 3.3))) - 0.5) * 0.55;
  float rad = 0.13 + 0.17 * hash(vec3(id, 4.4));
  float on = 1.0 - step(dens * 1.15, h);
  return on * (1.0 - smoothstep(rad * 0.55, rad, length(f - off)));
}
float fbm(vec3 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y * uK - gl_FragCoord.y) / uK;
  vec2 d = vec2(uCenter.x - frag.x, uCenter.y - frag.y) / uScale;
  float rho = length(d); float ang = 2.0 * atan(rho * 0.5);
  float s = rho > 1e-6 ? sin(ang) / rho : 1.0;
  vec3 v = cos(ang) * uC + s * (d.x * uE + d.y * uN);
  float b = asin(clamp(dot(v, uNGP), -1.0, 1.0));
  float l = atan(dot(v, uGY), dot(v, uGC));
  float t = uTime;
  vec3 q = v * 2.1 + vec3(t * 0.006, -t * 0.004, t * 0.003);
  float n1 = fbm(q * 1.2);
  float n2 = fbm(q * 3.0 + 5.0);
  float n3 = fbm(q * 7.5 + 11.0 + vec3(0.0, t * 0.01, 0.0));

  /* warm ink-black ground, a faint cool tint in the mid-tones (printed on dark stock) */
  vec3 deep = vec3(0.050, 0.052, 0.062), mid = vec3(0.085, 0.090, 0.112), lite = vec3(0.150, 0.162, 0.200);
  vec3 col = mix(deep, mid, smoothstep(0.25, 0.8, n1) * 0.85 + 0.15 * n2);
  col = mix(col, lite, smoothstep(0.62, 0.92, fbm(q * 0.9 + 20.0)) * 0.22);
  col += vec3(0.012, 0.016, 0.026) * (n3 - 0.5) * 0.5;

  /* 은하수: 실제 은하면을 따라 점묘(점으로 찍은 띠). 별 지도 인쇄물처럼 */
  float core = exp(-l * l / 1.15);
  float width = mix(0.15, 0.30, core);
  float band = exp(-(b * b) / (width * width));
  float structure = smoothstep(0.2, 0.85, n2 * 0.65 + n3 * 0.55);
  float dust = smoothstep(0.5, 0.74, fbm(q * 4.6 + vec3(3.0, 1.0, 7.0)));
  float dens = band * (0.22 + 0.95 * structure) * (1.0 - 0.6 * dust * band) * (0.65 + 0.7 * core);
  col += vec3(0.060, 0.075, 0.105) * band * (0.4 + structure) * 0.9;   // soft smudge under the band
  float oct = log2(max(uScale, 120.0) / 700.0); float l0 = floor(oct), w1 = oct - l0;
  float c0 = 150.0 * exp2(l0), c1 = c0 * 2.0;
  float dots = stip(vec2(l, b), c0, dens, 1.0) * (1.0 - w1) + stip(vec2(l, b), c1, dens, 1.0) * w1;
  vec3 dcol = mix(vec3(0.93, 0.91, 0.83), vec3(0.66, 0.76, 0.93), step(0.72, hash(vec3(floor(vec2(l, b) * 150.0), 8.8))));  // a few pale-blue dots
  col = mix(col, dcol, clamp(dots, 0.0, 1.0) * 0.8);

  /* 비네트 + 디더링(밴딩 방지) */
  vec2 uv = (frag - uRes * 0.5) / uRes.y;
  col *= 1.0 - 0.34 * smoothstep(0.5, 1.25, length(uv));
  col += (hash(vec3(gl_FragCoord.xy, 1.0)) - 0.5) * 0.05;   // print grain
  gl_FragColor = vec4(col * uFade, 1.0);
}`;

  class Nebula {
    constructor(canvas) {
      this.cv = canvas; this.ok = false;
      const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
      if (!gl) return; this.gl = gl;
      const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
      const vs = mk(gl.VERTEX_SHADER, VS), fs = mk(gl.FRAGMENT_SHADER, FS); if (!vs || !fs) return;
      const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(pr)); return; }
      this.pr = pr; gl.useProgram(pr);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.u = {}; ['uRes', 'uK', 'uCenter', 'uScale', 'uC', 'uE', 'uN', 'uGC', 'uGY', 'uNGP', 'uTime', 'uFade'].forEach(n => { this.u[n] = gl.getUniformLocation(pr, n); });
      this.ok = true;
    }
    resize(w, h, k) {
      if (!this.ok) return; this.k = k; this.w = w; this.h = h;
      this.cv.width = Math.max(2, Math.round(w * k)); this.cv.height = Math.max(2, Math.round(h * k));
      this.gl.viewport(0, 0, this.cv.width, this.cv.height);
    }
    draw(o) {
      if (!this.ok) return; const gl = this.gl, u = this.u;
      gl.uniform2f(u.uRes, this.w, this.h); gl.uniform1f(u.uK, this.k); gl.uniform2f(u.uCenter, o.cx, o.cy); gl.uniform1f(u.uScale, o.scale);
      gl.uniform3fv(u.uC, o.C); gl.uniform3fv(u.uE, o.E); gl.uniform3fv(u.uN, o.N);
      gl.uniform3fv(u.uGC, o.GC); gl.uniform3fv(u.uGY, o.GY); gl.uniform3fv(u.uNGP, o.NGP);
      gl.uniform1f(u.uTime, o.time); gl.uniform1f(u.uFade, o.fade);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }
  window.AstraNebula = Nebula;
})();
