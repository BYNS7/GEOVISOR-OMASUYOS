/* Análisis del terreno (agregado por BYNS7). Usa el modelo de elevación Copernicus DEM GLO-90 de relieve.js.
   · «Pendientes»: mapa de transitabilidad por pendiente del terreno (4 clases).
   · «Área visible»: zona que se ve desde un punto (observatorio, antena), con curvatura y refracción.
   (El perfil e intervisibilidad entre dos puntos está en la tarjeta «Perfil y visibilidad».) */
document.addEventListener('DOMContentLoaded', () => {
'use strict';
const mapa = document.querySelector('.map'), scene = document.getElementById('scene');
if (!mapa || !scene) return;
const svgMapa = scene.ownerSVGElement, NS = 'http://www.w3.org/2000/svg';
const K = 65759.1401421867, OX = 1.199706713376768, OY = 0.2830464015276702, D2R = Math.PI / 180;
const aEscena = (lon, lat) => [500 + (lon * D2R + OX) * K, 380 - (Math.log(Math.tan(Math.PI / 4 + lat * D2R / 2)) + OY) * K];
const deEscena = (x, y) => [((x - 500) / K - OX) / D2R, (2 * Math.atan(Math.exp((380 - y) / K - OY)) - Math.PI / 2) / D2R];
const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const miles = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const dec = (n, d = 1) => n.toFixed(d).replace('.', ',');
const LAGO = 3808;   // nivel del Titicaca en el modelo: se deja transparente
const dem = () => (window.EMTE_CARGAR_DEM ? window.EMTE_CARGAR_DEM() : Promise.reject()).then(() => window.EMTE_DEM());

const css = h('style');
css.textContent = `
.at-leyenda{position:absolute;left:16px;bottom:118px;z-index:8;background:#fff;border:1px solid #D7DEE8;border-radius:8px;box-shadow:0 8px 22px rgba(11,29,51,.18);font:11.5px var(--tipo-texto,system-ui);color:#14233A;min-width:230px}
.at-leyenda[hidden]{display:none}
.at-leyenda b.t{display:block;padding:6px 10px;background:#0B1D33;color:#fff;font:600 11px var(--tipo-titulo,system-ui);letter-spacing:.1em;border-radius:7px 7px 0 0;border-bottom:2px solid #B79A5B}
.at-leyenda div{display:flex;align-items:center;gap:8px;padding:3px 10px}
.at-leyenda i{width:22px;height:12px;border-radius:2px;flex:none;border:1px solid #0002}
.at-leyenda small{display:block;padding:4px 10px 7px;color:#5A6B80;font-size:10px}
.at-sel{display:flex;gap:4px}.at-sel button{padding:4px 9px;border:1px solid #cfd6e6;border-radius:6px;background:#fff;color:#12294A;font:600 11px var(--tipo-titulo,system-ui);cursor:pointer}
.at-sel button.on{background:#12294A;color:#fff;border-color:#12294A}
.map.at-activo svg{cursor:crosshair!important}`;
document.head.append(css);

/* =============== PENDIENTES =============== */
const CLASES = [
  [10, '#3E9B4F', 'Transitable', 'hasta 10 % · todo vehículo'],
  [20, '#E7C744', 'Con dificultad', '10–20 % · vehículos 4x4'],
  [45, '#E07B28', 'Muy difícil', '20–45 % · a pie u oruga'],
  [Infinity, '#B0231E', 'No transitable', 'más de 45 % · solo a pie con dificultad']
];
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
let imgPend = null, pendActiva = false, pctClases = null;
const leyenda = h('section', 'at-leyenda'); leyenda.hidden = true;
leyenda.innerHTML = '<b class="t">PENDIENTE DEL TERRENO</b>' + CLASES.map(c => `<div><i style="background:${c[1]}"></i><span><b>${c[2]}</b> · ${c[3]}</span></div>`).join('') + '<small>Copernicus DEM GLO-90 (celdas de ~90 m). Referencial: no considera suelo, vegetación ni obstáculos.</small>';
mapa.append(leyenda);
for (const t of ['pointerdown', 'click', 'wheel']) leyenda.addEventListener(t, e => e.stopPropagation());
function construirPendientes(D) {
  const { x0, y0, dx, dy, w, h: H, z } = D, lat0 = y0, lat1 = y0 - H * dy, lon0 = x0, lon1 = x0 + w * dx;
  const mx = dx * 111320 * Math.cos((lat0 + lat1) / 2 * D2R), my = dy * 110574;
  const pend = new Float32Array(w * H).fill(-1), cuenta = [0, 0, 0, 0];
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < w - 1; i++) {
    const k = j * w + i; if (z[k] <= LAGO) continue;
    const gx = ((z[k - w + 1] + 2 * z[k + 1] + z[k + w + 1]) - (z[k - w - 1] + 2 * z[k - 1] + z[k + w - 1])) / (8 * mx);
    const gy = ((z[k + w - 1] + 2 * z[k + w] + z[k + w + 1]) - (z[k - w - 1] + 2 * z[k - w] + z[k - w + 1])) / (8 * my);
    const s = Math.hypot(gx, gy) * 100; pend[k] = s; cuenta[CLASES.findIndex(c => s < c[0])]++;
  }
  const tot = cuenta.reduce((a, b) => a + b, 0); pctClases = cuenta.map(c => c / tot * 100);
  // lienzo en proyección del mapa (Mercator): cada fila de salida se toma de la fila del modelo de su latitud
  const [ax, ay] = aEscena(lon0, lat0), [bx, by] = aEscena(lon1, lat1), Hs = H;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = Hs;
  const ctx = cv.getContext('2d'), im = ctx.createImageData(w, Hs), cols = CLASES.map(c => rgb(c[1]));
  for (let r = 0; r < Hs; r++) {
    const ys = ay + (by - ay) * (r + .5) / Hs, lat = deEscena(ax, ys)[1], j = Math.min(H - 1, Math.max(0, Math.floor((lat0 - lat) / dy)));
    for (let i = 0; i < w; i++) {
      const s = pend[j * w + i]; if (s < 0) continue;
      const c = cols[CLASES.findIndex(x => s < x[0])], o = (r * w + i) * 4;
      im.data[o] = c[0]; im.data[o + 1] = c[1]; im.data[o + 2] = c[2]; im.data[o + 3] = 255;
    }
  }
  ctx.putImageData(im, 0, 0);
  const img = document.createElementNS(NS, 'image');
  img.setAttribute('id', 'topo-pendientes'); img.setAttribute('x', ax); img.setAttribute('y', ay); img.setAttribute('width', bx - ax); img.setAttribute('height', by - ay);
  img.setAttribute('preserveAspectRatio', 'none'); img.setAttribute('opacity', '.5'); img.setAttribute('pointer-events', 'none');
  img.setAttribute('href', cv.toDataURL('image/png'));
  return img;
}
function ponerPendientes(on) {
  pendActiva = on; tarjPend.classList.toggle('chosen', on); leyenda.hidden = !on;
  if (!on) { imgPend && imgPend.remove(); return; }
  dem().then(D => {
    if (!pendActiva) return;
    if (!imgPend) imgPend = construirPendientes(D);
    const ref = document.getElementById('topo-municipios') || document.getElementById('water') || document.getElementById('rivers');
    ref && ref.parentNode === scene ? ref.after(imgPend) : scene.prepend(imgPend);
    const sm = leyenda.querySelector('small');
    if (pctClases && !leyenda.querySelector('.at-pct')) { leyenda.querySelectorAll('div').forEach((d, i) => { const s = h('span', 'at-pct', dec(pctClases[i]) + ' %'); s.style.cssText = 'margin-left:auto;color:#5A6B80;font-size:10.5px'; d.append(s); }); }
  }).catch(() => { leyenda.querySelector('small').textContent = 'No se pudo cargar el modelo de elevación.'; });
}

/* =============== ÁREA VISIBLE =============== */
const panel = h('section', 'rp-panel'); panel.hidden = true; panel.setAttribute('aria-label', 'Área visible desde un punto');
panel.innerHTML = `<div class="rp-cab"><b>ÁREA VISIBLE DESDE UN PUNTO</b><button type="button" class="at-cerrar" aria-label="Cerrar">×</button></div>
<div class="rp-op"><label>Altura del observador <input type="number" class="at-ho" min="0" max="300" step="0.5" value="1.7"> m</label>
<label>Altura del objetivo <input type="number" class="at-ht" min="0" max="300" step="0.5" value="1.7"> m</label>
<span>Radio</span><span class="at-sel"><button type="button" data-r="3">3 km</button><button type="button" data-r="5" class="on">5 km</button><button type="button" data-r="10">10 km</button></span></div>
<div class="at-cuerpo"><p class="rp-paso">Haz clic en el mapa en el punto de observación.</p></div>`;
mapa.append(panel);
for (const t of ['pointerdown', 'click', 'dblclick', 'wheel']) panel.addEventListener(t, e => e.stopPropagation());
const cuerpo = panel.querySelector('.at-cuerpo');
let visActivo = false, radio = 5, ultimo = null;
const gVis = document.createElementNS(NS, 'g'); gVis.id = 'topo-area-visible'; gVis.setAttribute('pointer-events', 'none');
panel.querySelectorAll('.at-sel button').forEach(b => b.onclick = () => { radio = +b.dataset.r; panel.querySelectorAll('.at-sel button').forEach(x => x.classList.toggle('on', x === b)); if (ultimo) calcularVisible(ultimo); });
['.at-ho', '.at-ht'].forEach(s => panel.querySelector(s).addEventListener('change', () => { if (ultimo) calcularVisible(ultimo); }));
panel.querySelector('.at-cerrar').onclick = () => abrirVis(false);
function abrirVis(on) {
  visActivo = on; panel.hidden = !on; mapa.classList.toggle('at-activo', on); tarjVis.classList.toggle('chosen', on);
  if (!on) { gVis.remove(); ultimo = null; cuerpo.innerHTML = '<p class="rp-paso">Haz clic en el mapa en el punto de observación.</p>'; return; }
  dem().catch(() => { cuerpo.innerHTML = '<p class="rp-paso">No se pudo cargar el modelo de elevación.</p>'; });
}
function z(D, lon, lat) {
  const fx = (lon - D.x0) / D.dx - .5, fy = (D.y0 - lat) / D.dy - .5;
  if (fx < 0 || fy < 0 || fx > D.w - 1 || fy > D.h - 1) return null;
  const x = Math.floor(fx), y = Math.floor(fy), tx = fx - x, ty = fy - y, Z = D.z, W = D.w, x1 = Math.min(x + 1, W - 1), y1 = Math.min(y + 1, D.h - 1);
  return (Z[y * W + x] * (1 - tx) + Z[y * W + x1] * tx) * (1 - ty) + (Z[y1 * W + x] * (1 - tx) + Z[y1 * W + x1] * tx) * ty;
}
function calcularVisible([lon, lat]) {
  const D = window.EMTE_DEM && window.EMTE_DEM(); if (!D) return;
  const ho = +panel.querySelector('.at-ho').value || 0, ht = +panel.querySelector('.at-ht').value || 0;
  const z0 = z(D, lon, lat); if (z0 == null) { cuerpo.innerHTML = '<p class="rp-paso">Ese punto está fuera del modelo de elevación.</p>'; return; }
  ultimo = [lon, lat];
  const R = radio * 1000, PASO = 45, RAYOS = 1080, kR = 1 - .13, Rt = 6371000;
  const mLon = 111320 * Math.cos(lat * D2R), mLat = 110574;
  // rejilla de resultado a la resolución del modelo
  const n = Math.ceil(R / 90) * 2 + 1, c = (n - 1) / 2, vis = new Int8Array(n * n);   // 0 sin dato, 1 visible, 2 oculto
  const ojo = z0 + ho;
  for (let a = 0; a < RAYOS; a++) {
    const ang = a / RAYOS * 2 * Math.PI, sx = Math.sin(ang), sy = Math.cos(ang); let maxP = -Infinity;
    for (let d = PASO; d <= R; d += PASO) {
      const lo = lon + sx * d / mLon, la = lat + sy * d / mLat, zz = z(D, lo, la); if (zz == null) break;
      const caida = d * d / (2 * Rt) * kR, zt = (zz <= LAGO ? LAGO : zz) - caida;
      const pSuelo = (zt - ojo) / d, pObj = (zt + ht - ojo) / d, visto = pObj >= maxP;
      if (pSuelo > maxP) maxP = pSuelo;
      const gx = Math.round(c + sx * d / 90), gy = Math.round(c - sy * d / 90), k = gy * n + gx;
      if (gx < 0 || gy < 0 || gx >= n || gy >= n) continue;
      if (visto) vis[k] = 1; else if (!vis[k]) vis[k] = 2;
    }
  }
  // dibujo
  const cv = document.createElement('canvas'); cv.width = n; cv.height = n;
  const ctx = cv.getContext('2d'), im = ctx.createImageData(n, n); let nv = 0, nt = 0;
  for (let k = 0; k < n * n; k++) { if (!vis[k]) continue; nt++; const o = k * 4; if (vis[k] === 1) { nv++; im.data[o] = 46; im.data[o + 1] = 160; im.data[o + 2] = 80; im.data[o + 3] = 150; } else { im.data[o] = 120; im.data[o + 1] = 30; im.data[o + 2] = 30; im.data[o + 3] = 60; } }
  ctx.putImageData(im, 0, 0);
  const half = c * 90 + 45, [ax, ay] = aEscena(lon - half / mLon, lat + half / mLat), [bx, by] = aEscena(lon + half / mLon, lat - half / mLat);
  gVis.replaceChildren();
  const img = document.createElementNS(NS, 'image'); img.setAttribute('x', ax); img.setAttribute('y', ay); img.setAttribute('width', bx - ax); img.setAttribute('height', by - ay);
  img.setAttribute('preserveAspectRatio', 'none'); img.setAttribute('href', cv.toDataURL('image/png')); img.style.imageRendering = 'pixelated'; gVis.append(img);
  const [px, py] = aEscena(lon, lat), circ = document.createElementNS(NS, 'circle');
  circ.setAttribute('cx', px); circ.setAttribute('cy', py); circ.setAttribute('r', (bx - ax) / 2 * (R / half)); circ.setAttribute('fill', 'none'); circ.setAttribute('stroke', '#0B1D33'); circ.setAttribute('stroke-width', 1.5); circ.setAttribute('stroke-dasharray', '6 4'); circ.setAttribute('vector-effect', 'non-scaling-stroke'); gVis.append(circ);
  const m = document.createElementNS(NS, 'g'); m.setAttribute('class', 'at-obs'); m.dataset.x = px; m.dataset.y = py; m.setAttribute('transform', `translate(${px} ${py}) scale(${1 / scale})`);
  m.innerHTML = '<circle r="9" fill="#fff"/><circle r="7" fill="#0B1D33"/><path d="M-4 0Q0-5 4 0Q0 5-4 0z" fill="#fff"/><circle r="1.6" fill="#0B1D33"/>'; gVis.append(m);
  const ref = document.getElementById('topo-municipios-nombres'); ref ? ref.before(gVis) : scene.append(gVis);
  const T = window.EMTE_TOPO, u = T ? T.textos(lat, lon) : null, pct = nt ? nv / nt * 100 : 0;
  cuerpo.innerHTML = `<div class="rp-res"><div><span>Observador</span><b>${u ? u.utm : lat.toFixed(5) + ', ' + lon.toFixed(5)}</b></div><div><span>Altitud</span><b>${miles(z0)} m s.n.m.</b></div><div><span>Área visible</span><b>${dec(nv * .0081, 1)} km²</b></div><div><span>Del círculo de ${radio} km</span><b>${dec(pct)} %</b></div></div>
  <p class="rp-nota"><span style="color:#2E9E50">■</span> visible · <span style="color:#9B1C1C">■</span> oculto por el relieve. Observador a ${dec(ho)} m y objetivo a ${dec(ht)} m sobre el suelo. Considera curvatura terrestre y refracción (k = 0,13). No considera edificios ni vegetación. Clic en otro punto para recalcular.</p>`;
}
let abajo = null;
svgMapa.addEventListener('pointerdown', e => { if (visActivo) abajo = [e.clientX, e.clientY]; }, true);
svgMapa.addEventListener('click', e => {
  if (!visActivo) return;
  e.stopPropagation(); e.preventDefault();
  if (!abajo || Math.hypot(e.clientX - abajo[0], e.clientY - abajo[1]) > 5) return;
  const m = scene.getScreenCTM(); if (!m) return; const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  const ll = deEscena(p.x, p.y);
  cuerpo.innerHTML = '<p class="rp-paso">Calculando…</p>';
  dem().then(() => setTimeout(() => calcularVisible(ll), 10));
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && visActivo) abrirVis(false); });
const zoomAnterior = zoom;
zoom = function (f) { zoomAnterior(f); gVis.querySelectorAll('.at-obs').forEach(g => g.setAttribute('transform', `translate(${g.dataset.x} ${g.dataset.y}) scale(${1 / scale})`)); };
window.EMTE_AREA_VISIBLE = { abrir: () => abrirVis(true), calcular: ll => calcularVisible(ll) };

/* =============== tarjetas en «Herramientas del mapa» y casilla en Capas =============== */
const menuHerr = [...document.querySelectorAll('main>aside details')].find(d => (d.querySelector('summary')?.textContent || '').trim().startsWith('Herramientas'));
const grilla = menuHerr && menuHerr.querySelector('.visual-tools-grid');
function tarjeta(svg, texto, fn) { const b = h('button', 'visual-card'); b.type = 'button'; b.innerHTML = `<span class="tool-picture"><svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${svg}</svg></span><span>${texto}</span>`; b.onclick = fn; (grilla || document.querySelector('main>aside'))?.append(b); return b; }
const tarjPend = tarjeta('<rect width="64" height="64" rx="12" fill="#f3efe4"/><path d="M4 56L20 40 32 46 46 22 60 30V60H4Z" fill="#3E9B4F"/><path d="M20 40L32 46 40 32 28 30Z" fill="#E7C744"/><path d="M40 32L46 22 52 26 46 36Z" fill="#E07B28"/><path d="M46 22L52 26 50 18Z" fill="#B0231E"/>', '◢ Pendientes', () => ponerPendientes(!pendActiva));
const tarjVis = tarjeta('<rect width="64" height="64" rx="12" fill="#e8f0ea"/><path d="M32 32L58 18A30 30 0 0 1 58 46Z" fill="#2E9E50" opacity=".55"/><path d="M32 32L6 46A30 30 0 0 1 10 14Z" fill="#2E9E50" opacity=".55"/><circle cx="32" cy="32" r="27" fill="none" stroke="#0B1D33" stroke-width="2" stroke-dasharray="5 4"/><circle cx="32" cy="32" r="6" fill="#0B1D33"/><path d="M28 32Q32 28 36 32Q32 36 28 32z" fill="#fff"/>', '◉ Área visible', () => abrirVis(!visActivo));
let cbPend = null, intentos = 0;
(function casillaPend() {
  const capas = document.getElementById('layers'), g = capas && [...capas.querySelectorAll(':scope > details')].find(d => /Relieve/i.test(d.querySelector('summary')?.textContent || ''));
  if (!g) { if (++intentos < 60) setTimeout(casillaPend, 250); return; }
  const lab = h('label'), cb = h('input'), dot = h('span', 'dot'); cb.type = 'checkbox'; cbPend = cb;
  dot.style.background = 'linear-gradient(90deg,#3E9B4F 25%,#E7C744 25% 50%,#E07B28 50% 75%,#B0231E 75%)';
  lab.append(cb, dot, document.createTextNode('Pendientes (transitabilidad)')); g.append(lab); cb.checked = pendActiva; cb.onchange = () => ponerPendientes(cb.checked);
})();
tarjPend.addEventListener('click', () => { if (cbPend) cbPend.checked = pendActiva; });
window.EMTE_LEYENDA_PENDIENTES = () => pendActiva ? CLASES.map(c => ({ nombre: 'Pendiente: ' + c[2].toLowerCase() + ' (' + c[3].split(' · ')[0] + ')', tipo: 'area', color: c[1] })) : [];
});
