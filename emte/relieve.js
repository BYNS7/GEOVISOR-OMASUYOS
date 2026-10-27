// Relieve del Geovisor EMTE (agregado por BYNS7).
//  · Capa «Curvas de nivel» cada 50 m (maestras cada 250 m con cota), generadas del Copernicus DEM GLO-90.
//  · Herramienta «Perfil topográfico y visibilidad»: dos clics en el mapa (A observador, B objetivo) →
//    perfil del terreno, línea de visión con curvatura y refracción, tramos visibles/ocultos sobre el mapa.
//  · Altitud del cursor en la barra de coordenadas.
// Datos: data/dem_omasuyos.bin (+ .json) y data/curvas_nivel_omasuyos.json.
document.addEventListener('DOMContentLoaded', () => {
'use strict';
const mapa = document.querySelector('.map'), scene = document.getElementById('scene');
if (!mapa || !scene) return;
const svgMapa = scene.ownerSVGElement, NS = 'http://www.w3.org/2000/svg';
const K = 65759.1401421867, OX = 1.199706713376768, OY = 0.2830464015276702, D2R = Math.PI / 180;
const aEscena = (lon, lat) => [500 + (lon * D2R + OX) * K, 380 - (Math.log(Math.tan(Math.PI / 4 + lat * D2R / 2)) + OY) * K];
const deEscena = (x, y) => [((x - 500) / K - OX) / D2R, (2 * Math.atan(Math.exp((380 - y) / K - OY)) - Math.PI / 2) / D2R];
const pantallaAEscena = (cx, cy) => { const m = scene.getScreenCTM(); if (!m) return null; const p = new DOMPoint(cx, cy).matrixTransform(m.inverse()); return [p.x, p.y]; };
const el = (par, tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) if (at[k] != null) e.setAttribute(k, at[k]); if (par) par.append(e); return e; };
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const miles = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const dec = (n, d = 1) => n.toFixed(d).replace('.', ',');

/* ---------- modelo de elevación ---------- */
let DEM = null, cargandoDEM = null;
function cargarDEM() {
  if (DEM) return Promise.resolve(DEM);
  if (!cargandoDEM) cargandoDEM = Promise.all([fetch('data/dem_omasuyos.json').then(r => r.json()), fetch('data/dem_omasuyos.bin').then(r => r.arrayBuffer())])
    .then(([m, b]) => (DEM = Object.assign(m, { z: new Int16Array(b) }))).catch(e => { cargandoDEM = null; throw e; });
  return cargandoDEM;
}
function altitud(lat, lon) { // interpolación bilineal; null fuera del modelo
  if (!DEM) return null;
  const fx = (lon - DEM.x0) / DEM.dx - .5, fy = (DEM.y0 - lat) / DEM.dy - .5;
  if (fx < 0 || fy < 0 || fx > DEM.w - 1 || fy > DEM.h - 1) return null;
  const x = Math.floor(fx), y = Math.floor(fy), tx = fx - x, ty = fy - y, x1 = Math.min(x + 1, DEM.w - 1), y1 = Math.min(y + 1, DEM.h - 1), Z = DEM.z, W = DEM.w;
  return (Z[y * W + x] * (1 - tx) + Z[y * W + x1] * tx) * (1 - ty) + (Z[y1 * W + x] * (1 - tx) + Z[y1 * W + x1] * tx) * ty;
}
window.EMTE_ALTITUD = (lat, lon) => altitud(lat, lon);
// La altitud se usa en todas las fichas: el modelo de elevación se carga siempre en segundo plano.
window.EMTE_CARGAR_DEM = () => cargarDEM();
window.EMTE_DEM = () => DEM;   // rejilla del modelo (análisis del terreno)
setTimeout(() => cargarDEM().catch(() => {}), 1200);
const R = 6371008.8;
const distancia = (a, b) => 2 * R * Math.asin(Math.sqrt(Math.sin((b[1] - a[1]) * D2R / 2) ** 2 + Math.cos(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.sin((b[0] - a[0]) * D2R / 2) ** 2));
const azimut = (a, b) => { const y = Math.sin((b[0] - a[0]) * D2R) * Math.cos(b[1] * D2R), x = Math.cos(a[1] * D2R) * Math.sin(b[1] * D2R) - Math.sin(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.cos((b[0] - a[0]) * D2R); return (Math.atan2(y, x) / D2R + 360) % 360; };

/* ---------- estilos ---------- */
const css = h('style');
css.textContent = `
#topo-curvas,#topo-perfil{pointer-events:none}
.rp-panel{position:absolute;left:50%;bottom:62px;transform:translateX(-50%);z-index:9;width:min(760px,calc(100% - 24px));background:#fff;border:1px solid #D7DEE8;border-radius:10px;box-shadow:0 14px 40px rgba(11,29,51,.28);font:12.5px var(--tipo-texto,system-ui);color:#14233A;overflow:hidden}
.rp-panel[hidden]{display:none}
.rp-cab{display:flex;align-items:center;gap:10px;padding:9px 12px;background:#0B1D33;color:#fff;border-bottom:2px solid #B79A5B}
.rp-cab b{flex:1;font:600 13px var(--tipo-titulo,system-ui);letter-spacing:.08em}
.rp-cab button{all:unset;cursor:pointer;width:26px;height:26px;display:grid;place-items:center;border-radius:50%;background:#ffffff1f;font-size:18px}
.rp-cab button:hover{background:#B79A5B}
.rp-op{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;padding:8px 12px;border-bottom:1px solid #E3E8EF;background:#F6F8FB;font-size:12px}
.rp-op label{display:flex;align-items:center;gap:6px;padding:0;border:0;font-size:12px;color:#3A4A60}
.rp-op input{width:62px;padding:4px 6px;border:1px solid #D7DEE8;border-radius:5px;font:12px var(--tipo-texto,system-ui)}
.rp-op .rp-nuevo{margin-left:auto;padding:5px 11px;border:1px solid #12294A;border-radius:6px;background:#12294A;color:#fff;font:600 11px var(--tipo-titulo,system-ui);letter-spacing:.06em;cursor:pointer}
.rp-paso{padding:10px 12px;color:#12294A;font-weight:600}
.rp-graf{display:block;width:100%;height:auto;background:#fff}
.rp-res{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#E3E8EF;border-top:1px solid #E3E8EF}
.rp-res div{background:#fff;padding:7px 10px}
.rp-res span{display:block;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#5A6B80}
.rp-res b{font:700 13.5px var(--tipo-titulo,system-ui);color:#12294A}
.rp-vis{padding:9px 12px;font:700 12.5px var(--tipo-titulo,system-ui);letter-spacing:.06em;text-align:center}
.rp-vis.si{background:#E8F3EC;color:#17663A}.rp-vis.no{background:#FBEAEA;color:#9B1C1C}
.rp-nota{padding:6px 12px 9px;font-size:10.5px;color:#5A6B80}
.map.rp-activo svg{cursor:crosshair!important}
.topo-coord .rp-alt b{color:#8A6D2B}
@media(max-width:750px){.rp-res{grid-template-columns:repeat(2,1fr)}.rp-panel{bottom:120px}}`;
document.head.append(css);

/* =====================================================================
   CURVAS DE NIVEL (capa)
   ===================================================================== */
const gCurvas = el(null, 'g', { id: 'topo-curvas' });
let CURVAS = null, curvasActivas = false;
function colocarCurvas() { const b = document.getElementById('basemap'); if (b && b.parentNode === scene) b.after(gCurvas); else scene.prepend(gCurvas); }
function construirCurvas() {
  gCurvas.replaceChildren();
  const fina = el(gCurvas, 'path', { fill: 'none', stroke: '#9C6B3C', 'stroke-opacity': .55, 'stroke-width': .8, 'vector-effect': 'non-scaling-stroke' });
  const maes = el(gCurvas, 'path', { fill: 'none', stroke: '#8A5A2B', 'stroke-opacity': .85, 'stroke-width': 1.6, 'vector-effect': 'non-scaling-stroke' });
  let df = '', dm = '';
  for (const c of CURVAS.curvas) {
    const d = 'M' + c[1].map(([lo, la]) => aEscena(lo, la).map(v => v.toFixed(2)).join(' ')).join('L');
    if (c[0] % CURVAS.maestra === 0) dm += d; else df += d;
  }
  fina.setAttribute('d', df); maes.setAttribute('d', dm);
  el(gCurvas, 'g', { class: 'rp-cotas' });
}
function cotas() {
  const g = gCurvas.querySelector('.rp-cotas'); if (!g) return; g.replaceChildren();
  if (!curvasActivas || scale < 2.2) return;
  const f = 1 / scale, r = svgMapa.getBoundingClientRect(), a = pantallaAEscena(r.left, r.top), b = pantallaAEscena(r.right, r.bottom); if (!a || !b) return;
  let n = 0;
  for (const c of CURVAS.curvas) {
    if (c[0] % CURVAS.maestra !== 0 || c[1].length < 12) continue;
    const p = c[1][Math.floor(c[1].length / 2)], [x, y] = aEscena(p[0], p[1]);
    if (x < a[0] || x > b[0] || y < a[1] || y > b[1]) continue;
    const t = el(g, 'text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'Bahnschrift,system-ui,sans-serif', 'font-size': 10, 'font-weight': 600, fill: '#7A4A1E', stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke', transform: `translate(${x} ${y}) scale(${f}) translate(${-x} ${-y})` });
    t.textContent = c[0]; if (++n > 90) break;
  }
}
function activarCurvas(si) {
  curvasActivas = si;
  if (!si) { gCurvas.remove(); return; }
  colocarCurvas();
  if (CURVAS) { cotas(); return; }
  fetch('data/curvas_nivel_omasuyos.json').then(r => r.json()).then(d => { CURVAS = d; if (curvasActivas) { construirCurvas(); colocarCurvas(); cotas(); } }).catch(() => {});
}
// Casilla en «Capas del mapa», grupo «Relieve»
function casillaCurvas() {
  const capas = document.getElementById('layers'); if (!capas) return;
  const grupo = h('details', 'layer-group'); grupo.innerHTML = '<summary>Relieve</summary>';
  const lab = h('label'); const cb = h('input'); cb.type = 'checkbox';
  const dot = h('span', 'dot'); dot.style.setProperty('--c', '#9C6B3C');
  lab.append(cb, dot, document.createTextNode('Curvas de nivel (cada 50 m)'));
  grupo.append(lab); capas.append(grupo);
  cb.addEventListener('change', () => activarCurvas(cb.checked));
}
if (document.getElementById('layers')?.children.length) casillaCurvas();
else { const ob = new MutationObserver(() => { if (document.getElementById('layers')?.children.length) { ob.disconnect(); casillaCurvas(); } }); ob.observe(document.body, { childList: true, subtree: true }); }

/* =====================================================================
   PERFIL TOPOGRÁFICO Y VISIBILIDAD
   ===================================================================== */
const gPerfil = el(null, 'g', { id: 'topo-perfil' });
const panel = h('section', 'rp-panel'); panel.hidden = true; panel.setAttribute('aria-label', 'Perfil topográfico y visibilidad');
panel.innerHTML = `<div class="rp-cab"><b>PERFIL TOPOGRÁFICO Y VISIBILIDAD</b><button type="button" id="rp-cerrar" aria-label="Cerrar perfil">×</button></div>
<div class="rp-op"><label>Altura del observador <input type="number" id="rp-ha" min="0" max="200" step="0.1" value="1.7"> m</label>
<label>Altura del objetivo <input type="number" id="rp-hb" min="0" max="200" step="0.1" value="2"> m</label>
<button type="button" class="rp-nuevo" id="rp-nuevo">NUEVO PERFIL</button></div>
<div id="rp-cuerpo"><p class="rp-paso">Haz clic en el mapa en el punto de observación (A).</p></div>`;
mapa.append(panel);
for (const t of ['pointerdown', 'click', 'dblclick', 'wheel']) panel.addEventListener(t, e => e.stopPropagation());
const $ = id => document.getElementById(id);
let activo = false, puntos = [], ultimo = null;
function estado(texto) { $('rp-cuerpo').innerHTML = `<p class="rp-paso">${texto}</p>`; }
function abrir() {
  activo = true; puntos = []; gPerfil.replaceChildren(); panel.hidden = false; mapa.classList.add('rp-activo'); tarjeta.classList.add('chosen');
  estado('Cargando el modelo de relieve…');
  cargarDEM().then(() => estado('Haz clic en el mapa en el punto de observación (A).')).catch(() => estado('No se pudo cargar el modelo de relieve (data/dem_omasuyos.bin).'));
}
function cerrar() { activo = false; panel.hidden = true; mapa.classList.remove('rp-activo'); gPerfil.remove(); tarjeta.classList.remove('chosen'); }
$('rp-cerrar').onclick = cerrar;
$('rp-nuevo').onclick = () => { puntos = []; gPerfil.replaceChildren(); estado('Haz clic en el mapa en el punto de observación (A).'); };
['rp-ha', 'rp-hb'].forEach(id => $(id).addEventListener('input', () => { if (puntos.length === 2) calcular(); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && activo) cerrar(); });

// Clic en el mapa (sin arrastre) mientras la herramienta está activa
let abajo = null;
svgMapa.addEventListener('pointerdown', e => { if (activo) abajo = [e.clientX, e.clientY]; }, true);
svgMapa.addEventListener('click', e => {
  if (!activo) return;
  e.stopPropagation(); e.preventDefault();
  if (!abajo || Math.hypot(e.clientX - abajo[0], e.clientY - abajo[1]) > 5 || !DEM) return;
  const p = pantallaAEscena(e.clientX, e.clientY); if (!p) return;
  const [lon, lat] = deEscena(...p);
  if (altitud(lat, lon) == null) { estado('Ese punto está fuera del modelo de relieve (provincia Omasuyos y alrededores).'); return; }
  if (puntos.length === 2) { puntos = []; gPerfil.replaceChildren(); }
  puntos.push([lon, lat]); marcar();
  if (puntos.length === 1) estado('Ahora haz clic en el objetivo (B).'); else calcular();
}, true);

function marcar() {
  if (!gPerfil.isConnected) scene.append(gPerfil);
  gPerfil.querySelectorAll('.rp-m').forEach(n => n.remove());
  puntos.forEach((p, i) => {
    const [x, y] = aEscena(...p), g = el(gPerfil, 'g', { class: 'rp-m', 'data-x': x, 'data-y': y, transform: `translate(${x} ${y}) scale(${1 / scale})` });
    el(g, 'circle', { r: 9, fill: i ? '#9B1C1C' : '#12294A', stroke: '#fff', 'stroke-width': 2 });
    const t = el(g, 'text', { y: 4, 'text-anchor': 'middle', 'font-family': 'Bahnschrift,system-ui', 'font-size': 11, 'font-weight': 700, fill: '#fff' }); t.textContent = i ? 'B' : 'A';
  });
}

function calcular() {
  const [A, B] = puntos, D = distancia(A, B), N = Math.max(60, Math.min(600, Math.round(D / 30)));
  const ha = Math.max(0, +$('rp-ha').value || 0), hb = Math.max(0, +$('rp-hb').value || 0), k = 0.13;
  const M = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, lon = A[0] + (B[0] - A[0]) * t, lat = A[1] + (B[1] - A[1]) * t, d = D * t, z = altitud(lat, lon);
    M.push({ lon, lat, d, z: z == null ? NaN : z, caida: d * d / (2 * R) * (1 - k) });
  }
  if (M.some(m => isNaN(m.z))) { estado('Parte de la línea sale del modelo de relieve. Elige puntos dentro de la provincia.'); return; }
  const ojo = M[0].z + ha;
  let maxP = -Infinity;
  for (let i = 1; i <= N; i++) {            // un punto es visible si su ángulo de elevación supera a todos los anteriores
    const m = M[i], p = (m.z - m.caida - ojo) / m.d;
    m.vis = p >= maxP;
    if (i < N) maxP = Math.max(maxP, p);
  }
  M[0].vis = true;
  const pB = (M[N].z + hb - M[N].caida - ojo) / D, visible = pB >= maxP - 1e-9;
  // obstáculo que más tapa la visual hacia B
  let peor = null;
  if (!visible) { let mx = -Infinity; for (let i = 1; i < N; i++) { const m = M[i], p = (m.z - m.caida - ojo) / m.d; if (p > mx) { mx = p; peor = m; } } }
  dibujarMapa(M); grafico(M, ha, hb, visible, peor);
  ultimo = { M, visible };
}

function dibujarMapa(M) {
  gPerfil.querySelectorAll('.rp-l').forEach(n => n.remove());
  let tramo = [], vis = M[0].vis;
  const g = el(null, 'g', { class: 'rp-l' }); gPerfil.prepend(g);
  const cerrarTramo = () => { if (tramo.length > 1) el(g, 'path', { d: 'M' + tramo.map(p => p.join(' ')).join('L'), fill: 'none', stroke: vis ? '#1E8B4C' : '#C0392B', 'stroke-width': 4.5, 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke', 'stroke-opacity': .9 }); };
  for (const m of M) {
    const p = aEscena(m.lon, m.lat).map(v => +v.toFixed(3));
    if (m.vis !== vis) { tramo.push(p); cerrarTramo(); tramo = [p]; vis = m.vis; } else tramo.push(p);
  }
  cerrarTramo();
  el(g, 'path', { d: 'M' + M.map(m => aEscena(m.lon, m.lat).map(v => v.toFixed(3)).join(' ')).join('L'), fill: 'none', stroke: '#fff', 'stroke-width': 7, 'vector-effect': 'non-scaling-stroke', 'stroke-opacity': .7 }).parentNode.prepend(g.lastChild);
  marcar();
}

function grafico(M, ha, hb, visible, peor) {
  const W = 740, H = 210, ml = 52, mr = 14, mt = 14, mb = 30, D = M[M.length - 1].d;
  const zs = M.map(m => m.z), zmin = Math.min(...zs), zmax = Math.max(...zs, M[0].z + ha, M[M.length - 1].z + hb);
  const pad = Math.max(10, (zmax - zmin) * .12), z0 = Math.floor((zmin - pad) / 10) * 10, z1 = Math.ceil((zmax + pad) / 10) * 10;
  const X = d => ml + d / D * (W - ml - mr), Y = z => mt + (z1 - z) / (z1 - z0) * (H - mt - mb);
  let s = `<svg class="rp-graf" viewBox="0 0 ${W} ${H}" xmlns="${NS}" font-family="Bahnschrift,Segoe UI,system-ui" font-size="10">`;
  // cuadrícula y ejes
  const pasoZ = [5, 10, 20, 25, 50, 100, 200, 250, 500].find(v => (z1 - z0) / v <= 6) || 1000;
  for (let z = Math.ceil(z0 / pasoZ) * pasoZ; z <= z1; z += pasoZ) s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(z)}" y2="${Y(z)}" stroke="#E3E8EF"/><text x="${ml - 6}" y="${Y(z) + 3}" text-anchor="end" fill="#5A6B80">${miles(z)}</text>`;
  const pasoD = [100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000].find(v => D / v <= 8) || 20000;
  for (let d = 0; d <= D + 1; d += pasoD) s += `<line x1="${X(d)}" x2="${X(d)}" y1="${mt}" y2="${H - mb}" stroke="#EEF1F5"/><text x="${X(d)}" y="${H - mb + 14}" text-anchor="middle" fill="#5A6B80">${d >= 1000 || pasoD >= 1000 ? dec(d / 1000, pasoD >= 1000 ? 0 : 1) + ' km' : miles(d) + ' m'}</text>`;
  s += `<text x="12" y="${mt + (H - mt - mb) / 2}" transform="rotate(-90 12 ${mt + (H - mt - mb) / 2})" text-anchor="middle" fill="#5A6B80">m s.n.m.</text>`;
  // terreno
  const pts = M.map(m => `${X(m.d).toFixed(1)},${Y(m.z).toFixed(1)}`).join(' ');
  s += `<polygon points="${X(0)},${H - mb} ${pts} ${X(D)},${H - mb}" fill="#D9C7A6" fill-opacity=".55"/>`;
  // tramos visibles/ocultos sobre el perfil
  let seg = [], v = M[0].vis;
  const cierra = () => { if (seg.length > 1) s += `<polyline points="${seg.join(' ')}" fill="none" stroke="${v ? '#1E8B4C' : '#C0392B'}" stroke-width="2.6" stroke-linejoin="round"/>`; };
  for (const m of M) { const p = `${X(m.d).toFixed(1)},${Y(m.z).toFixed(1)}`; if (m.vis !== v) { seg.push(p); cierra(); seg = [p]; v = m.vis; } else seg.push(p); }
  cierra();
  // línea de visión A → B
  const yA = Y(M[0].z + ha), yB = Y(M[M.length - 1].z + hb);
  s += `<line x1="${X(0)}" y1="${yA}" x2="${X(D)}" y2="${yB}" stroke="${visible ? '#1E8B4C' : '#C0392B'}" stroke-width="1.6" stroke-dasharray="6 4"/>`;
  s += `<circle cx="${X(0)}" cy="${yA}" r="5" fill="#12294A"/><text x="${X(0) + 8}" y="${yA - 6}" font-weight="700" fill="#12294A">A</text>`;
  s += `<circle cx="${X(D)}" cy="${yB}" r="5" fill="#9B1C1C"/><text x="${X(D) - 8}" y="${yB - 6}" text-anchor="end" font-weight="700" fill="#9B1C1C">B</text>`;
  if (peor) s += `<path d="M${X(peor.d)} ${Y(peor.z) - 14}l-5 -8h10z" fill="#C0392B"/><text x="${X(peor.d)}" y="${Y(peor.z) - 25}" text-anchor="middle" font-weight="700" fill="#9B1C1C">obstáculo</text>`;
  s += `<line id="rp-cursor" x1="0" x2="0" y1="${mt}" y2="${H - mb}" stroke="#12294A" stroke-dasharray="3 3" visibility="hidden"/><text id="rp-cursor-t" x="0" y="${mt + 10}" fill="#12294A" font-weight="700" visibility="hidden"></text>`;
  s += `<rect x="${ml}" y="${mt}" width="${W - ml - mr}" height="${H - mt - mb}" fill="none" stroke="#B9C4D2"/></svg>`;
  const A = M[0], Bm = M[M.length - 1], az = azimut([A.lon, A.lat], [Bm.lon, Bm.lat]);
  let sube = 0, baja = 0; for (let i = 1; i < M.length; i++) { const dz = M[i].z - M[i - 1].z; if (dz > 0) sube += dz; else baja -= dz; }
  const vistos = M.filter(m => m.vis).length / M.length * 100;
  $('rp-cuerpo').innerHTML = s + `<div class="rp-res">
    <div><span>Distancia</span><b>${D >= 1000 ? dec(D / 1000, 2) + ' km' : miles(D) + ' m'}</b></div>
    <div><span>Azimut A → B</span><b>${dec(az, 1)}° · ${miles(az / 360 * 6400)} mils</b></div>
    <div><span>Altitud A / B</span><b>${miles(A.z)} / ${miles(Bm.z)} m</b></div>
    <div><span>Desnivel</span><b>${Bm.z - A.z >= 0 ? '+' : '−'}${miles(Math.abs(Bm.z - A.z))} m · ${dec(Math.abs(Bm.z - A.z) / D * 100, 1)} %</b></div>
    <div><span>Máx. / mín.</span><b>${miles(Math.max(...zs))} / ${miles(Math.min(...zs))} m</b></div>
    <div><span>Subida / bajada</span><b>+${miles(sube)} / −${miles(baja)} m</b></div>
    <div><span>Terreno visible</span><b>${dec(vistos, 0)} % del perfil</b></div>
    <div><span>Alturas A / B</span><b>${dec(ha)} / ${dec(hb)} m</b></div></div>
    <div class="rp-vis ${visible ? 'si' : 'no'}">${visible ? '✔ B ES VISIBLE DESDE A' : `✖ B NO ES VISIBLE DESDE A · obstáculo a ${peor.d >= 1000 ? dec(peor.d / 1000, 2) + ' km' : miles(peor.d) + ' m'} de A (${miles(peor.z)} m s.n.m.)`}</div>
    <p class="rp-nota">Modelo Copernicus DEM GLO-90 (~90 m): no incluye edificios ni vegetación. Considera curvatura terrestre y refracción (k = 0,13). Verde: terreno visible desde A · rojo: oculto.</p>`;
  // cursor sobre el gráfico → posición en el mapa
  const g = $('rp-cuerpo').querySelector('svg'), cur = $('rp-cursor'), ct = $('rp-cursor-t');
  const sigue = el(null, 'circle', { r: 6, fill: '#B79A5B', stroke: '#fff', 'stroke-width': 2, visibility: 'hidden', class: 'rp-sigue' });
  gPerfil.append(sigue);
  g.addEventListener('pointermove', e => {
    const r = g.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W; if (x < ml || x > W - mr) return;
    const d = (x - ml) / (W - ml - mr) * D, m = M[Math.round(d / D * (M.length - 1))];
    cur.setAttribute('x1', x); cur.setAttribute('x2', x); cur.setAttribute('visibility', 'visible');
    ct.setAttribute('x', Math.min(x + 6, W - 120)); ct.setAttribute('visibility', 'visible'); ct.textContent = `${d >= 1000 ? dec(d / 1000, 2) + ' km' : miles(d) + ' m'} · ${miles(m.z)} m`;
    const [sx, sy] = aEscena(m.lon, m.lat); sigue.setAttribute('cx', sx); sigue.setAttribute('cy', sy); sigue.setAttribute('r', 6 / scale); sigue.setAttribute('stroke-width', 2 / scale); sigue.setAttribute('visibility', 'visible');
  });
  g.addEventListener('pointerleave', () => { cur.setAttribute('visibility', 'hidden'); ct.setAttribute('visibility', 'hidden'); sigue.setAttribute('visibility', 'hidden'); });
}

/* ---------- tarjeta en «Herramientas del mapa» ---------- */
const menuHerr = [...document.querySelectorAll('main>aside details')].find(d => (d.querySelector('summary')?.textContent || '').trim().startsWith('Herramientas'));
const grilla = menuHerr && menuHerr.querySelector('.visual-tools-grid');
const tarjeta = h('button', 'visual-card rp-card'); tarjeta.type = 'button';
tarjeta.innerHTML = '<span class="tool-picture"><svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#edf1e8"/><path d="M6 50L18 30 26 38 38 16 48 30 58 24V56H6Z" fill="#D9C7A6" stroke="#8A5A2B" stroke-width="2"/><path d="M10 22L54 30" stroke="#1E8B4C" stroke-width="2.5" stroke-dasharray="4 3"/><circle cx="10" cy="22" r="4" fill="#12294A"/><circle cx="54" cy="30" r="4" fill="#9B1C1C"/></svg></span><span>⛰ Perfil y visibilidad</span>';
tarjeta.onclick = () => activo ? cerrar() : abrir();
if (grilla) grilla.append(tarjeta); else document.querySelector('main>aside')?.append(tarjeta);

/* ---------- altitud del cursor en la barra de coordenadas ---------- */
const barra = mapa.querySelector('.bottom');
let pidio = false;
svgMapa.addEventListener('pointermove', e => {
  if (!barra) return;
  if (!DEM) { if (!pidio) { pidio = true; cargarDEM().catch(() => {}); } return; }
  const p = pantallaAEscena(e.clientX, e.clientY); if (!p) return;
  const [lon, lat] = deEscena(...p), z = altitud(lat, lon); if (z == null) return;
  requestAnimationFrame(() => { if (!barra.querySelector('.rp-alt')) { const s = h('span', 'rp-alt'); s.innerHTML = `<b>ALT</b>${miles(z)} m`; barra.append(s); } });
});

/* ---------- zoom: tamaño de marcas y cotas ---------- */
const zoomAnterior = zoom;
zoom = function (f) {
  zoomAnterior(f);
  gPerfil.querySelectorAll('.rp-m').forEach(g => g.setAttribute('transform', `translate(${g.dataset.x} ${g.dataset.y}) scale(${1 / scale})`));
  if (curvasActivas && CURVAS) { clearTimeout(zoom._t); zoom._t = setTimeout(cotas, 120); }
};
});
