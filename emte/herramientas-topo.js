// Herramientas topográficas del Geovisor EMTE (agregado por BYNS7).
//  1) Coordenadas del cursor en UTM y geográficas (barra inferior del mapa).
//  2) Búsqueda por coordenadas en el buscador: UTM (19S 532872 8226334), decimales (-16.0425, -68.6927)
//     o grados-minutos-segundos (16°02'33"S 68°41'34"O).
//  3) Cuadrícula UTM de 10 km y zonas UTM 19S/20S/21S como capa (shapes 08_CUADRICULA_UTM y 07_ZONAS_UTM,
//     convertidos a data/cuadricula_utm.json).
//  4) Mapa formal en PDF (A4/A3) que se descarga directamente: marco, coordenadas, escala, norte, leyenda,
//     logos, fecha, datum y clasificación.
// Módulo independiente: no modifica los demás archivos; se carga después de cartas.js.
document.addEventListener('DOMContentLoaded', () => {
'use strict';
const mapa = document.querySelector('.map'), scene = document.getElementById('scene');
if (!mapa || !scene) return;
const svgMapa = scene.ownerSVGElement;
const NS = 'http://www.w3.org/2000/svg', K = 65759.1401421867, OX = 1.199706713376768, OY = 0.2830464015276702, R = 6378137;
const D2R = Math.PI / 180;
const el = (par, tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) if (at[k] != null) e.setAttribute(k, at[k]); if (par) par.append(e); return e; };
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const miles = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/* ---------- escena (Web Mercator del geovisor) ↔ geográficas ---------- */
const aEscena = (lon, lat) => [500 + (lon * D2R + OX) * K, 380 - (Math.log(Math.tan(Math.PI / 4 + lat * D2R / 2)) + OY) * K];
const deEscena = (x, y) => [((x - 500) / K - OX) / D2R, (2 * Math.atan(Math.exp((380 - y) / K - OY)) - Math.PI / 2) / D2R];
const pantallaAEscena = (cx, cy) => { const m = scene.getScreenCTM(); if (!m) return null; const p = new DOMPoint(cx, cy).matrixTransform(m.inverse()); return [p.x, p.y]; };
function rectoEscena(elemento) { // rectángulo de la escena que se ve dentro de un elemento de la pantalla
  const r = (elemento || svgMapa).getBoundingClientRect(), a = pantallaAEscena(r.left, r.top), b = pantallaAEscena(r.right, r.bottom);
  return a && b ? { x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1], r } : null;
}

/* ---------- UTM (WGS 84) ---------- */
const A = 6378137, F = 1 / 298.257223563, E2 = F * (2 - F), EP2 = E2 / (1 - E2), K0 = 0.9996;
const zonaDe = lon => Math.min(60, Math.floor((lon + 180) / 6) + 1);
function aUTM(lat, lon, zona) {
  zona = zona || zonaDe(lon);
  const l0 = ((zona - 1) * 6 - 180 + 3) * D2R, p = lat * D2R, l = lon * D2R;
  const N = A / Math.sqrt(1 - E2 * Math.sin(p) ** 2), T = Math.tan(p) ** 2, C = EP2 * Math.cos(p) ** 2, Aa = Math.cos(p) * (l - l0);
  const M = A * ((1 - E2 / 4 - 3 * E2 ** 2 / 64 - 5 * E2 ** 3 / 256) * p - (3 * E2 / 8 + 3 * E2 ** 2 / 32 + 45 * E2 ** 3 / 1024) * Math.sin(2 * p)
    + (15 * E2 ** 2 / 256 + 45 * E2 ** 3 / 1024) * Math.sin(4 * p) - (35 * E2 ** 3 / 3072) * Math.sin(6 * p));
  const E = K0 * N * (Aa + (1 - T + C) * Aa ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * EP2) * Aa ** 5 / 120) + 500000;
  let Nn = K0 * (M + N * Math.tan(p) * (Aa * Aa / 2 + (5 - T + 9 * C + 4 * C * C) * Aa ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * EP2) * Aa ** 6 / 720));
  if (lat < 0) Nn += 10000000;
  return [E, Nn, zona, lat < 0];
}
function deUTM(E, N, zona, sur) {
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2)), x = E - 500000, y = sur ? N - 10000000 : N;
  const mu = y / K0 / (A * (1 - E2 / 4 - 3 * E2 ** 2 / 64 - 5 * E2 ** 3 / 256));
  const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const s = Math.sin(p1), c = Math.cos(p1), t = Math.tan(p1), N1 = A / Math.sqrt(1 - E2 * s * s), T1 = t * t, C1 = EP2 * c * c, R1 = A * (1 - E2) / (1 - E2 * s * s) ** 1.5, Dd = x / (N1 * K0);
  const lat = p1 - (N1 * t / R1) * (Dd * Dd / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * EP2) * Dd ** 4 / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * EP2 - 3 * C1 * C1) * Dd ** 6 / 720);
  const lon = ((zona - 1) * 6 - 180 + 3) * D2R + (Dd - (1 + 2 * T1 + C1) * Dd ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * EP2 + 24 * T1 * T1) * Dd ** 5 / 120) / c;
  return [lat / D2R, lon / D2R];
}

/* ---------- formatos ---------- */
const gms = (v, pos, neg) => { const s = v < 0 ? neg : pos; const t = Math.round(Math.abs(v) * 36000) / 10; const g = Math.floor(t / 3600), mm = Math.floor((t - g * 3600) / 60), ss = t - g * 3600 - mm * 60;
  return `${g}°${String(mm).padStart(2, '0')}'${ss.toFixed(1).padStart(4, '0').replace('.', ',')}"${s}`; };
function textos(lat, lon) {
  const [E, N, z, sur] = aUTM(lat, lon);
  return { utm: `${z}${sur ? 'S' : 'N'} ${miles(E)} E · ${miles(N)} N`, geo: `${gms(lat, 'N', 'S')} ${gms(lon, 'E', 'O')}`, dec: `${lat.toFixed(6)}°, ${lon.toFixed(6)}°`, E, N, z, sur };
}

/* ---------- lectura de coordenadas escritas ---------- */
const BANDAS = 'CDEFGHJKLMNPQRSTUVWX';   // bandas de latitud UTM (C–M = hemisferio sur)
function leerCoordenada(t) {
  t = String(t || '').trim(); if (t.length < 5) return null;
  // UTM: «19S 532872 8226334», «19K 532872E 8226334N», «532872 8226334» (zona 19 Sur por defecto)
  let m = t.toUpperCase().match(/^(?:(\d{1,2})\s*([C-X])?\s+)?(\d{6}(?:[.,]\d+)?)\s*E?\s*[,;\s]\s*(\d{7}(?:[.,]\d+)?)\s*N?$/);
  if (m) {
    const z = m[1] ? +m[1] : 19, letra = m[2] || 'S', E = parseFloat(m[3].replace(',', '.')), N = parseFloat(m[4].replace(',', '.'));
    const sur = letra === 'S' || (letra !== 'N' && BANDAS.indexOf(letra) < 10);
    if (z >= 1 && z <= 60 && E > 100000 && E < 900000) { const [lat, lon] = deUTM(E, N, z, sur); return { lat, lon, E, N, zona: z, sur, desc: `UTM ${z}${sur ? 'S' : 'N'} ${miles(E)} E ${miles(N)} N` }; }
  }
  // Grados, minutos y segundos: 16°02'33"S 68°41'34"O
  const re = /(\d{1,3})\s*[°º]\s*(\d{1,2})?\s*['′]?\s*(\d{1,2}(?:[.,]\d+)?)?\s*(?:["″]|'')?\s*([NSEOW])/gi, partes = [...t.matchAll(re)];
  if (partes.length === 2) {
    const v = p => { let x = +p[1] + (+p[2] || 0) / 60 + (parseFloat((p[3] || '0').replace(',', '.')) / 3600); return /[SOW]/i.test(p[4]) ? -x : x; };
    const a = partes.find(p => /[NS]/i.test(p[4])), b = partes.find(p => /[EOW]/i.test(p[4]));
    if (a && b) { const lat = v(a), lon = v(b); if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon, desc: t }; }
  }
  // Decimales: -16.0425, -68.6927 (latitud, longitud)
  m = t.match(/^(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)$/);
  if (m) { const lat = +m[1], lon = +m[2]; if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon, desc: `${lat}, ${lon}` }; }
  return null;
}

/* ---------- estilos ---------- */
const css = h('style');
css.textContent = `
.map .bottom.topo-coord{display:flex;gap:6px 14px;flex-wrap:wrap;align-items:center;font:12px var(--tipo-texto,system-ui);max-width:calc(100% - 520px);cursor:copy}
.topo-coord b{font:600 10.5px var(--tipo-titulo,system-ui);letter-spacing:.08em;color:#12294A;margin-right:4px}
.topo-coord span{white-space:nowrap;font-variant-numeric:tabular-nums;color:#14233A}
.topo-coord .topo-pista{color:#5A6B80}
.topo-ir{display:flex!important;align-items:center;gap:8px;font-weight:600!important;color:#12294A!important;background:#F4F6F9!important;border-bottom:1px solid #D7DEE8!important}
#topo-cuadricula,#topo-pin{pointer-events:none}
.topo-ficha p{font-size:12px;margin:3px 0}.topo-ficha code{font:600 12.5px ui-monospace,Consolas,monospace;color:#12294A}
.topo-dlg{position:fixed;inset:0;z-index:1000;background:rgba(11,29,51,.55);display:grid;place-items:center;padding:16px}
.topo-dlg[hidden]{display:none}
.topo-caja{background:#fff;border-radius:10px;box-shadow:0 20px 50px rgba(11,29,51,.35);width:min(460px,100%);max-height:calc(100vh - 32px);overflow:auto;font:13px var(--tipo-texto,system-ui);color:#14233A}
.topo-caja header{all:unset;display:flex;align-items:center;gap:10px;padding:14px 18px;background:#0B1D33;color:#fff;border-bottom:2px solid #B79A5B;border-radius:10px 10px 0 0}
.topo-caja header b{flex:1;font:600 15px var(--tipo-titulo,system-ui);letter-spacing:.06em}
.topo-caja header button{all:unset;cursor:pointer;width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:#ffffff1f;font-size:19px}
.topo-form{display:grid;gap:11px;padding:16px 18px}
.topo-form label{display:grid;gap:4px;font-size:11px;font-weight:600;letter-spacing:.05em;color:#5A6B80;text-align:left;padding:0;border:0}
.topo-form input[type=text],.topo-form select{font:13px var(--tipo-texto,system-ui);padding:8px 10px;border:1px solid #D7DEE8;border-radius:6px;color:#14233A;text-transform:uppercase}
.topo-form .fila{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.topo-form .chk{display:flex;align-items:center;gap:8px;font-weight:500;letter-spacing:0;color:#14233A;font-size:12.5px}
.topo-acc{display:flex;gap:8px;justify-content:flex-end;padding:0 18px 16px}
.topo-acc button{padding:9px 14px;border-radius:6px;font:600 12px var(--tipo-titulo,system-ui);letter-spacing:.06em;cursor:pointer;border:1px solid #12294A;background:#fff;color:#12294A}
.topo-acc button.pri{background:#12294A;color:#fff}
#topo-hoja-vista{position:fixed;inset:0;z-index:1001;background:#3a4656;display:flex;flex-direction:column;align-items:center;overflow:auto;padding:14px}
#topo-hoja-vista[hidden]{display:none}
#topo-hoja-vista .barra{position:sticky;top:0;z-index:2;display:flex;gap:8px;margin-bottom:12px}
#topo-hoja-vista .barra button{padding:9px 16px;border-radius:6px;font:600 12px var(--tipo-titulo,system-ui);letter-spacing:.06em;cursor:pointer;border:1px solid #fff;background:#12294A;color:#fff}
#topo-hoja-vista .barra button.sec{background:#fff;color:#12294A}
#topo-hoja{background:#fff;box-shadow:0 10px 40px rgba(0,0,0,.45);transform-origin:top center}
#topo-hoja svg{display:block;width:100%;height:100%}
.topo-progreso{color:#fff;font:600 12px var(--tipo-titulo,system-ui);letter-spacing:.06em;align-self:center;margin-left:6px}
}`;
document.head.append(css);

/* ---------- vuelo del mapa ---------- */
let vuelo = 0;
function volar(lon0, lat0, lon1, lat1) {
  const [ax, ay] = aEscena(lon0, lat1), [bx, by] = aEscena(lon1, lat0), cx = (ax + bx) / 2, cy = (ay + by) / 2;
  const s1 = Math.max(.05, Math.min(480, Math.min(1000 / Math.max(bx - ax, 1e-6), 760 / Math.max(by - ay, 1e-6)) * .85));
  const s0 = scale, c0 = [500 - panX / s0, 380 - panY / s0], id = ++vuelo, t0 = performance.now();
  const paso = t => {
    if (id !== vuelo) return;
    const k = Math.min(1, (t - t0) / 700), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const s = Math.exp(Math.log(s0) + (Math.log(s1) - Math.log(s0)) * e), x = c0[0] + (cx - c0[0]) * e, y = c0[1] + (cy - c0[1]) * e;
    scale = s; panX = (500 - x) * s; panY = (380 - y) * s; zoom(1);
    if (k < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

/* =====================================================================
   1) COORDENADAS DEL CURSOR
   ===================================================================== */
const barra = mapa.querySelector('.bottom');
const textoOriginal = barra ? barra.innerHTML : '';
let ultima = null;
if (barra) {
  barra.classList.add('topo-coord'); barra.title = 'Clic para copiar las coordenadas UTM';
  const reposo = () => { barra.innerHTML = '<span class="topo-pista">⌖ WGS 84 · UTM zona 19 Sur · Mueve el cursor sobre el mapa para leer coordenadas</span>'; };
  reposo();
  svgMapa.addEventListener('pointermove', e => {
    const p = pantallaAEscena(e.clientX, e.clientY); if (!p) return;
    const [lon, lat] = deEscena(...p); if (!isFinite(lat)) return;
    const t = textos(lat, lon); ultima = t;
    barra.innerHTML = `<span><b>UTM</b>${t.utm}</span><span><b>GEO</b>${t.geo}</span>`;
  });
  svgMapa.addEventListener('pointerleave', () => { if (!ultima) reposo(); });
  barra.addEventListener('click', () => {
    if (!ultima || !navigator.clipboard) return;
    navigator.clipboard.writeText('UTM ' + ultima.utm).then(() => { const v = barra.title; barra.title = 'Copiado: UTM ' + ultima.utm; setTimeout(() => barra.title = v, 1500); }).catch(() => {});
  });
}

/* =====================================================================
   2) BÚSQUEDA POR COORDENADAS
   ===================================================================== */
const gPin = el(null, 'g', { id: 'topo-pin' });
function ponerPin(lat, lon) {
  gPin.replaceChildren(); const [x, y] = aEscena(lon, lat);
  const g = el(gPin, 'g', { transform: `translate(${x} ${y}) scale(${1 / scale})`, 'data-x': x, 'data-y': y });
  el(g, 'circle', { r: 16, fill: 'none', stroke: '#B79A5B', 'stroke-width': 2 });
  el(g, 'path', { d: 'M-24 0H-7M7 0H24M0-24V-7M0 7V24', stroke: '#12294A', 'stroke-width': 2.4 });
  el(g, 'circle', { r: 3, fill: '#B42330' });
  scene.append(gPin);
}
function irA(c) {
  const d = .012; volar(c.lon - d, c.lat - d, c.lon + d, c.lat + d); ponerPin(c.lat, c.lon);
  const t = textos(c.lat, c.lon), F = window.EMTE_FICHA; if (!F) return;
  const info = F.abrir('FICHA DE COORDENADA', 'UTM ' + t.utm, 'Punto ingresado', [c.lon, c.lat]); if (!info) return;
  const z = window.EMTE_ALTITUD ? window.EMTE_ALTITUD(c.lat, c.lon) : null;
  F.poner(info,
    F.bloque('1. COORDENADAS', [['UTM', t.utm], ['Geográficas', t.geo], ['Decimales', t.dec], ['Datum', 'WGS 84'], ['Altitud', z != null ? miles(z) + ' m s.n.m.' : null]]),
    F.bloque('2. INGRESO', [['Ingresada como', c.desc || '']]),
    F.cercanos(c.lon, c.lat, null, '3. LO MÁS CERCANO'),
    F.boton('QUITAR MARCA', () => { gPin.replaceChildren(); info.hidden = true; }));
}
const buscador = document.getElementById('search'), sugerencias = document.getElementById('suggestions');
if (buscador) {
  buscador.setAttribute('placeholder', 'Buscar lugares, vías, salud… o coordenadas (UTM / grados)');
  buscador.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const c = leerCoordenada(buscador.value); if (!c) return;
    e.preventDefault(); e.stopImmediatePropagation(); if (sugerencias) sugerencias.hidden = true; irA(c);
  }, true);
  buscador.addEventListener('input', () => setTimeout(() => {
    const c = leerCoordenada(buscador.value); if (!c || !sugerencias) return;
    const b = h('button', 'topo-ir'); b.type = 'button';
    b.append(h('span', null, '⌖'), h('span', null, 'Ir a la coordenada UTM ' + textos(c.lat, c.lon).utm));
    b.onclick = () => { sugerencias.hidden = true; irA(c); };
    sugerencias.prepend(b); sugerencias.hidden = false;
  }, 0));
}

/* =====================================================================
   3) CUADRÍCULA UTM
   ===================================================================== */
const gCuad = el(null, 'g', { id: 'topo-cuadricula' });
let cuadriculaActiva = false;
try { cuadriculaActiva = localStorage.getItem('emte-cuadricula-utm') === '1'; } catch (e) {}
const INTERVALOS = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
function lineasUTM(rect, objetivo = 8) {
  // Devuelve las líneas de la cuadrícula UTM (en coordenadas de la escena) para un rectángulo de la escena.
  const [lonC, latC] = deEscena(rect.x + rect.w / 2, rect.y + rect.h / 2), zona = zonaDe(lonC), sur = latC < 0;
  const esq = [[rect.x, rect.y], [rect.x + rect.w, rect.y], [rect.x, rect.y + rect.h], [rect.x + rect.w, rect.y + rect.h]].map(([x, y]) => { const [lo, la] = deEscena(x, y); return aUTM(la, lo, zona); });
  const e0 = Math.min(...esq.map(a => a[0])), e1 = Math.max(...esq.map(a => a[0])), n0 = Math.min(...esq.map(a => a[1])), n1 = Math.max(...esq.map(a => a[1]));
  const iv = INTERVALOS.find(v => (e1 - e0) / v <= objetivo) || 100000;
  const P = (E, N) => { const [la, lo] = deUTM(E, N, zona, sur); return aEscena(lo, la); };
  const ver = [], hor = [], pasos = 24;
  for (let E = Math.ceil(e0 / iv) * iv; E <= e1; E += iv) { const pts = []; for (let k = 0; k <= pasos; k++) pts.push(P(E, n0 - iv + (n1 - n0 + 2 * iv) * k / pasos)); ver.push({ v: E, pts }); }
  for (let N = Math.ceil(n0 / iv) * iv; N <= n1; N += iv) { const pts = []; for (let k = 0; k <= pasos; k++) pts.push(P(e0 - iv + (e1 - e0 + 2 * iv) * k / pasos, N)); hor.push({ v: N, pts }); }
  return { ver, hor, iv, zona, sur };
}
const etiqueta = (v, iv) => iv >= 1000 ? String(Math.round(v / 1000)) : miles(v); // en km (dígitos principales) o en metros
function cruce(pts, eje, valor) { // punto donde una polilínea cruza x=valor (eje 0) o y=valor (eje 1)
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if ((a[eje] - valor) * (b[eje] - valor) <= 0 && a[eje] !== b[eje]) { const t = (valor - a[eje]) / (b[eje] - a[eje]); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  }
  return null;
}
/* Capa de los shapes: líneas cada 10 km (las de 100 km resaltadas) y zonas UTM 19S, 20S y 21S. */
let CUAD = null, cargandoCuad = false;
function cargarCuadricula() {
  if (CUAD || cargandoCuad) return; cargandoCuad = true;
  fetch('data/cuadricula_utm.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => {
    const lineas = d.lineas.map(l => ({ z: l.z, e: l.e, v: l.v, pts: l.c.map(([lo, la]) => aEscena(lo, la)) }));
    const zonas = d.zonas.map(z => ({ z: z.z, mc: z.mc, c: aEscena(z.c[0], z.c[1]), d: z.r.map(r => 'M' + r.map(([lo, la]) => aEscena(lo, la).map(v => v.toFixed(2)).join(' ')).join('L') + 'Z').join('') }));
    CUAD = { lineas, zonas }; construirCuadricula(); dibujarCuadricula();
  }).catch(() => { estadoCuadricula.textContent = 'No se pudo cargar data/cuadricula_utm.json'; }).finally(() => { cargandoCuad = false; });
}
let gTrazos = null, gEtiq = null;
function construirCuadricula() {
  gCuad.replaceChildren();
  gTrazos = el(gCuad, 'g', { fill: 'none' }); gEtiq = el(gCuad, 'g', {});
  for (const z of CUAD.zonas) el(gTrazos, 'path', { d: z.d, stroke: '#B79A5B', 'stroke-width': 2.6, 'stroke-opacity': .95, 'vector-effect': 'non-scaling-stroke', fill: '#B79A5B', 'fill-opacity': .03 });
  const d = l => 'M' + l.pts.map(p => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('L');
  for (const l of CUAD.lineas) {
    const cien = l.v % 100 === 0;
    el(gTrazos, 'path', { d: d(l), stroke: '#12294A', 'stroke-width': cien ? 1.8 : 1, 'stroke-opacity': cien ? .8 : .5, 'vector-effect': 'non-scaling-stroke' });
  }
}
function dibujarCuadricula() {
  if (!cuadriculaActiva) { gCuad.remove(); return; }
  if (!CUAD) { cargarCuadricula(); return; }
  const rect = rectoEscena(); if (!rect) return;
  if (!gCuad.isConnected) { scene.append(gCuad); if (gPin.isConnected) scene.append(gPin); }
  gEtiq.replaceChildren();
  const f = 1 / scale, px = rect.w / rect.r.width;
  const txt = (x, y, t, at = {}) => { const e = el(gEtiq, 'text', Object.assign({ x, y, 'font-family': 'Bahnschrift,system-ui,sans-serif', 'font-size': 11, 'font-weight': 600, fill: '#12294A', stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke', transform: `translate(${x} ${y}) scale(${f}) translate(${-x} ${-y})` }, at)); e.textContent = t; };
  // Etiquetas de las líneas en el borde superior (Este) y en el borde izquierdo (Norte) de la vista
  const arriba = rect.y + 70 * px, izq = rect.x + 14 * px;
  const marcas = [];
  for (const l of CUAD.lineas) {
    if (l.e === 'E') { const p = cruce(l.pts, 1, arriba); if (p && p[0] > rect.x + 20 * px && p[0] < rect.x + rect.w - 20 * px) marcas.push([p[0] + 3 * f, p[1], l.v + ' km E']); }
    else { const p = cruce(l.pts, 0, izq); if (p && p[1] > rect.y + 60 * px && p[1] < rect.y + rect.h - 20 * px) marcas.push([p[0], p[1] - 3 * f, l.v + ' km N']); }
  }
  if (marcas.length <= 50) marcas.forEach(([x, y, t]) => txt(x, y, t, { 'text-anchor': 'start' }));
  // Nombre de cada zona UTM (en su centro y dentro de la vista)
  for (const z of CUAD.zonas) {
    const [x, y] = z.c, dentro = x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h;
    const cx = dentro ? x : Math.min(Math.max(x, rect.x + 80 * px), rect.x + rect.w - 80 * px), cy = dentro ? y : rect.y + rect.h - 90 * px;
    if (!dentro && !(z.mc - 3 <= deEscena(cx, cy)[0] && deEscena(cx, cy)[0] <= z.mc + 3)) continue;
    txt(cx, cy, 'ZONA UTM ' + z.z, { 'font-size': 15, 'font-weight': 700, fill: '#8A6D2B', 'text-anchor': 'middle', 'letter-spacing': '.08em' });
  }
  estadoCuadricula.textContent = 'Cada 10 km · zonas 19S, 20S y 21S';
}
let pendiente = 0;
const programar = () => { if (pendiente) return; pendiente = requestAnimationFrame(() => { pendiente = 0; dibujarCuadricula(); if (gPin.firstChild) { const g = gPin.firstChild; g.setAttribute('transform', `translate(${g.dataset.x} ${g.dataset.y}) scale(${1 / scale})`); } }); };
const zoomAnterior = zoom;
zoom = function (f) { zoomAnterior(f); programar(); };
addEventListener('resize', programar);

/* ---------- tarjetas en «Herramientas del mapa» ---------- */
const menuHerr = [...document.querySelectorAll('main>aside details')].find(d => (d.querySelector('summary')?.textContent || '').trim().startsWith('Herramientas'));
const grilla = menuHerr && menuHerr.querySelector('.visual-tools-grid');
const icono = cuerpo => `<span class="tool-picture"><svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#edf1e8"/>${cuerpo}</svg></span>`;
const tarjCuad = h('button', 'visual-card topo-card'); tarjCuad.type = 'button';
tarjCuad.innerHTML = icono('<path d="M8 20H56M8 36H56M8 52H56M20 8V56M36 8V56M52 8V56" stroke="#12294A" stroke-width="2"/><path d="M8 36H56M36 8V56" stroke="#B79A5B" stroke-width="3"/><text x="38" y="18" font-size="9" font-family="Arial" font-weight="700" fill="#12294A">19S</text>') + '<span>▦ Cuadrícula y zonas UTM <small class="topo-estado" style="display:block;font-weight:400;font-size:10px;color:#5A6B80"></small></span>';
const estadoCuadricula = tarjCuad.querySelector('.topo-estado');
const tarjImp = h('button', 'visual-card topo-card'); tarjImp.type = 'button';
tarjImp.innerHTML = icono('<rect x="14" y="10" width="36" height="44" rx="2" fill="#fff" stroke="#12294A" stroke-width="2.5"/><rect x="19" y="18" width="26" height="18" fill="#B79A5B55" stroke="#12294A" stroke-width="1.5"/><path d="M19 42H45M19 47H35" stroke="#12294A" stroke-width="2"/><path d="M41 44l3-8 3 8-3-2z" fill="#12294A"/>') + '<span>⬇ Descargar mapa (PDF)</span>';
function marcarCuadricula() {
  tarjCuad.classList.toggle('chosen', cuadriculaActiva); tarjCuad.setAttribute('aria-pressed', String(cuadriculaActiva));
  if (!cuadriculaActiva) estadoCuadricula.textContent = 'Apagada';
}
tarjCuad.onclick = () => { cuadriculaActiva = !cuadriculaActiva; try { localStorage.setItem('emte-cuadricula-utm', cuadriculaActiva ? '1' : '0'); } catch (e) {} marcarCuadricula(); dibujarCuadricula(); };
if (grilla) grilla.append(tarjCuad, tarjImp);
else { const caja = h('div'); caja.style.cssText = 'display:grid;gap:6px;margin:0 0 14px'; caja.append(tarjCuad, tarjImp); document.querySelector('main>aside')?.append(caja); }
marcarCuadricula(); setTimeout(dibujarCuadricula, 300);

/* =====================================================================
   4) IMPRESIÓN FORMAL (A4 / A3 → PDF)
   ===================================================================== */
const usuario = () => (document.querySelector('.session-actions span')?.textContent || '').trim();
const dlg = h('div', 'topo-dlg'); dlg.hidden = true; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-label', 'Descargar mapa en PDF');
dlg.innerHTML = `<div class="topo-caja"><header><b>DESCARGAR MAPA EN PDF</b><button type="button" data-cerrar aria-label="Cerrar">×</button></header>
<form class="topo-form" id="topo-form">
<label>TÍTULO<input type="text" id="topo-t" maxlength="70" value="PROVINCIA OMASUYOS – LA PAZ"></label>
<label>SUBTÍTULO / PROPÓSITO<input type="text" id="topo-s" maxlength="90" placeholder="EJ.: CARTA DE SITUACIÓN – EJERCICIO DE CAMPO"></label>
<div class="fila"><label>CLASIFICACIÓN<select id="topo-c"><option value="">SIN CLASIFICACIÓN</option><option>USO OFICIAL</option><option>RESERVADO</option><option>CONFIDENCIAL</option><option>SECRETO</option></select></label>
<label>TAMAÑO DE HOJA<select id="topo-p"><option value="A4">A4 HORIZONTAL</option><option value="A3">A3 HORIZONTAL</option></select></label></div>
<label>ELABORADO POR<input type="text" id="topo-e" maxlength="60"></label>
<label class="chk"><input type="checkbox" id="topo-g" checked> Coordenadas UTM en el marco (cuadrícula de lectura)</label>
</form>
<div class="topo-acc"><button type="button" data-cerrar>Cancelar</button><button type="button" class="pri" id="topo-prev">VISTA PREVIA</button></div></div>`;
document.body.append(dlg);
const vista = h('div'); vista.id = 'topo-hoja-vista'; vista.hidden = true;
vista.innerHTML = '<div class="barra"><button type="button" id="topo-descargar">⬇ DESCARGAR PDF</button><button type="button" class="sec" id="topo-volver">VOLVER AL MAPA</button><span class="topo-progreso" id="topo-progreso" role="status"></span></div><div id="topo-hoja"></div>';
document.body.append(vista);
const $ = id => document.getElementById(id);
dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-cerrar]')) dlg.hidden = true; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!vista.hidden) cerrarVista(); else dlg.hidden = true; } });
tarjImp.onclick = () => { if (!$('topo-e').value) $('topo-e').value = usuario(); dlg.hidden = false; setTimeout(() => $('topo-t').focus(), 30); };
let opciones = null;
function cerrarVista() { vista.hidden = true; $('topo-hoja').replaceChildren(); $('topo-progreso').textContent = ''; }
$('topo-volver').onclick = cerrarVista;
$('topo-descargar').onclick = () => descargarPDF();
$('topo-prev').onclick = () => {
  const op = { titulo: $('topo-t').value.trim().toUpperCase(), sub: $('topo-s').value.trim().toUpperCase(), clas: $('topo-c').value, papel: $('topo-p').value, autor: $('topo-e').value.trim().toUpperCase(), cuad: $('topo-g').checked };
  dlg.hidden = true; opciones = op; componerHoja(op);
};

function leyendaCapas() {
  const out = [];
  document.querySelectorAll('#layers > details > label, #layers > label').forEach(l => {
    const cb = l.querySelector('input[type=checkbox]'), dot = l.querySelector('.dot');
    if (!cb || (!cb.checked && !cb.indeterminate)) return;
    const color = dot ? (dot.style.getPropertyValue('--c') || '').trim() || '#12294A' : '#12294A';
    const nombre = [...l.childNodes].filter(n => n.nodeType === 3 || (n.nodeType === 1 && n.tagName === 'SPAN' && !n.classList.contains('dot'))).map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
    // Salud y educación: una fila por categoría visible, con su símbolo (simbologia.js)
    const SIM = window.EMTE_SIMBOLOS, grupo = /salud/i.test(nombre) ? 'health' : /educativ/i.test(nombre) ? 'education' : null;
    if (SIM && grupo) {
      const tabla = grupo === 'health' ? SIM.SAL : SIM.EDU, g = document.getElementById(grupo), vistos = new Set([...(g ? g.children : [])].filter(m => m.style.display !== 'none').map(m => m.dataset.sim));
      Object.entries(tabla).filter(([k]) => vistos.has(k)).forEach(([, d]) => out.push({ nombre: d.n, tipo: 'sim', s: d.s }));
      return;
    }
    if (/^(Todas las vías|Vías)/i.test(nombre) && window.EMTE_VIAS) { out.push(...window.EMTE_VIAS.leyenda()); return; }
    if (/^Cerros/i.test(nombre) && window.EMTE_LEYENDA_CERROS) { out.push(...window.EMTE_LEYENDA_CERROS()); return; }
    if (/^Pendientes \(/i.test(nombre) && window.EMTE_LEYENDA_PENDIENTES) { out.push(...window.EMTE_LEYENDA_PENDIENTES()); return; }
    if (/^Cobertura de salud/i.test(nombre) && window.EMTE_LEYENDA_COBERTURA) { out.push(...window.EMTE_LEYENDA_COBERTURA()); return; }
    if (/^Pendientes de verificar/i.test(nombre) && window.EMTE_LEYENDA_CAMPO) { out.push(...window.EMTE_LEYENDA_CAMPO()); return; }
    if (/^Municipios/i.test(nombre) && window.EMTE_LEYENDA_MUNICIPIOS) { out.push(...window.EMTE_LEYENDA_MUNICIPIOS()); return; }
    if (nombre) out.push({ nombre, color, tipo: /vía|camino|carretera/i.test(nombre) ? 'linea' : /río|rio|drenaje/i.test(nombre) ? 'linea' : /agua|lago|laguna|límite|limite/i.test(nombre) ? 'area' : 'punto' });
  });
  return out;
}

function componerHoja(op) {
  const rect = rectoEscena(); if (!rect) return;
  const W = 297, H = 210, mm = v => +v.toFixed(2);
  // Área disponible para el mapa (columna derecha para la información marginal)
  const caja = { x: 16, y: 34, w: 222, h: 156 };
  const asp = rect.w / rect.h; let fw = caja.w, fh = fw / asp; if (fh > caja.h) { fh = caja.h; fw = fh * asp; }
  const fx = caja.x + (caja.w - fw) / 2, fy = caja.y + (caja.h - fh) / 2;
  const hoja = $('topo-hoja'); hoja.replaceChildren();
  const s = el(null, 'svg', { xmlns: NS, viewBox: `0 0 ${W} ${H}`, 'font-family': 'Bahnschrift,"Segoe UI",Arial,sans-serif' });
  hoja.append(s);
  el(s, 'rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' });
  // Bordes de la hoja
  el(s, 'rect', { x: 6, y: 6, width: W - 12, height: H - 12, fill: 'none', stroke: '#0B1D33', 'stroke-width': .8 });
  el(s, 'rect', { x: 7.4, y: 7.4, width: W - 14.8, height: H - 14.8, fill: 'none', stroke: '#0B1D33', 'stroke-width': .25 });
  const T = (x, y, t, at = {}) => { const e = el(s, 'text', Object.assign({ x, y, fill: '#0B1D33', 'font-size': 3 }, at)); e.textContent = t; return e; };
  // Clasificación arriba y abajo
  if (op.clas) { T(W / 2, 5, op.clas, { 'text-anchor': 'middle', 'font-size': 3.4, 'font-weight': 700, fill: '#9B1C1C', 'letter-spacing': .6 }); T(W / 2, H - 2.2, op.clas, { 'text-anchor': 'middle', 'font-size': 3.4, 'font-weight': 700, fill: '#9B1C1C', 'letter-spacing': .6 }); }
  // Encabezado institucional
  el(s, 'image', { href: 'assets/logos/ejercito_bolivia.png', x: 11, y: 9.5, width: 20, height: 20, preserveAspectRatio: 'xMidYMid meet' });
  el(s, 'image', { href: 'assets/logos/emte.png', x: W - 31, y: 9.5, width: 20, height: 20, preserveAspectRatio: 'xMidYMid meet' });
  T(W / 2, 13.5, 'EJÉRCITO DE BOLIVIA · ESCUELA MILITAR DE TOPOGRAFÍA DEL EJÉRCITO', { 'text-anchor': 'middle', 'font-size': 3.1, 'letter-spacing': .5, fill: '#5A6B80' });
  T(W / 2, 21.5, op.titulo || 'MAPA', { 'text-anchor': 'middle', 'font-size': 6.4, 'font-weight': 700, 'letter-spacing': .5 });
  if (op.sub) T(W / 2, 27.4, op.sub, { 'text-anchor': 'middle', 'font-size': 3.4, fill: '#1C3A66', 'letter-spacing': .3 });
  el(s, 'line', { x1: 34, x2: W - 34, y1: 30.2, y2: 30.2, stroke: '#B79A5B', 'stroke-width': .6 });

  // --- Mapa: copia de la escena ajustada al marco ---
  const clipId = 'topo-clip-' + Date.now();
  const cp = el(el(s, 'defs', {}), 'clipPath', { id: clipId }); el(cp, 'rect', { x: fx, y: fy, width: fw, height: fh });
  el(s, 'rect', { x: fx, y: fy, width: fw, height: fh, fill: '#E9EDF2' });
  const gMapa = el(s, 'g', { 'clip-path': `url(#${clipId})` });
  const sub = el(gMapa, 'svg', { x: fx, y: fy, width: fw, height: fh, viewBox: `${rect.x} ${rect.y} ${rect.w} ${rect.h}`, preserveAspectRatio: 'none', overflow: 'hidden' });
  for (const hijo of scene.children) {
    if (hijo.id === 'topo-pin' || hijo.id === 'cc-indice') continue;
    const c = hijo.cloneNode(true); c.removeAttribute('id');
    if (hijo.id === 'topo-cuadricula') c.querySelectorAll('text').forEach(t => t.remove());
    sub.append(c);
  }
  // calco de planeamiento (capa en píxeles de pantalla, superpuesta al mapa)
  const calco = mapa.querySelector('svg.calco-capa');
  if (calco && calco.childElementCount) {
    const r2 = calco.getBoundingClientRect(), r1 = rect.r;
    const sx = fw / r1.width, sy = fh / r1.height;
    const sc = el(gMapa, 'svg', { x: fx + (r2.left - r1.left) * sx, y: fy + (r2.top - r1.top) * sy, width: r2.width * sx, height: r2.height * sy, viewBox: `0 0 ${r2.width} ${r2.height}`, preserveAspectRatio: 'none', overflow: 'visible' });
    for (const hijo of calco.children) sc.append(hijo.cloneNode(true));
  }
  // Cuadrícula UTM con coordenadas en el marco
  const [lonC, latC] = deEscena(rect.x + rect.w / 2, rect.y + rect.h / 2);
  const L = lineasUTM(rect, 7), aHoja = ([x, y]) => [fx + (x - rect.x) / rect.w * fw, fy + (y - rect.y) / rect.h * fh];
  if (op.cuad) {
    const gc = el(gMapa, 'g', { fill: 'none', stroke: '#0B1D33', 'stroke-width': .18, 'stroke-opacity': .75 });
    [...L.ver, ...L.hor].forEach(l => el(gc, 'path', { d: 'M' + l.pts.map(p => aHoja(p).map(mm).join(' ')).join('L') }));
    const chico = { 'font-size': 2.5, fill: '#0B1D33' };
    L.ver.forEach(l => {
      const ph = l.pts.map(aHoja), a = cruce(ph, 1, fy), b = cruce(ph, 1, fy + fh);
      if (a && a[0] > fx + 4 && a[0] < fx + fw - 4) T(a[0], fy - 1.3, etiqueta(l.v, L.iv), Object.assign({ 'text-anchor': 'middle' }, chico));
      if (b && b[0] > fx + 4 && b[0] < fx + fw - 4) T(b[0], fy + fh + 3.4, etiqueta(l.v, L.iv), Object.assign({ 'text-anchor': 'middle' }, chico));
    });
    L.hor.forEach(l => {
      const ph = l.pts.map(aHoja), a = cruce(ph, 0, fx), b = cruce(ph, 0, fx + fw);
      if (a && a[1] > fy + 4 && a[1] < fy + fh - 4) T(fx - 1.2, a[1] + .9, etiqueta(l.v, L.iv), Object.assign({ 'text-anchor': 'end' }, chico));
      if (b && b[1] > fy + 4 && b[1] < fy + fh - 4) T(fx + fw + 1.2, b[1] + .9, etiqueta(l.v, L.iv), Object.assign({ 'text-anchor': 'start' }, chico));
    });
  }
  el(s, 'rect', { x: fx, y: fy, width: fw, height: fh, fill: 'none', stroke: '#0B1D33', 'stroke-width': .7 });

  // --- Columna marginal derecha ---
  const cx0 = 247, cw = W - 10 - cx0; let y = 36;
  const titulo = t => { T(cx0, y, t, { 'font-size': 2.9, 'font-weight': 700, 'letter-spacing': .5, fill: '#12294A' }); el(s, 'line', { x1: cx0, x2: cx0 + cw, y1: y + 1.2, y2: y + 1.2, stroke: '#B79A5B', 'stroke-width': .35 }); y += 5; };
  // Escala
  const mPorUnidad = R * Math.cos(latC * D2R) / K, metrosAncho = rect.w * mPorUnidad, denom = metrosAncho / (fw / 1000);
  const redondeo = denom > 20000 ? 1000 : denom > 2000 ? 100 : 10, denomR = Math.round(denom / redondeo) * redondeo;
  titulo('ESCALA');
  T(cx0 + cw / 2, y + 1.5, '1 : ' + miles(denomR), { 'text-anchor': 'middle', 'font-size': 4.6, 'font-weight': 700 });
  y += 5;
  const mmPorM = fw / metrosAncho, maxM = (cw - 4) / mmPorM, pb = 10 ** Math.floor(Math.log10(maxM)), largo = [5, 2, 1].map(k => k * pb).find(v => v <= maxM), bw = largo * mmPorM, bx = cx0 + (cw - bw) / 2;
  for (let i = 0; i < 4; i++) el(s, 'rect', { x: bx + i * bw / 4, y, width: bw / 4, height: 1.6, fill: i % 2 ? '#fff' : '#0B1D33', stroke: '#0B1D33', 'stroke-width': .2 });
  const fmtL = v => v >= 1000 ? miles(v / 1000) + ' km' : miles(v) + ' m';
  T(bx, y + 4.4, '0', { 'text-anchor': 'middle', 'font-size': 2.3 }); T(bx + bw / 2, y + 4.4, fmtL(largo / 2).replace(/ (k?m)$/, ''), { 'text-anchor': 'middle', 'font-size': 2.3 }); T(bx + bw, y + 4.4, fmtL(largo), { 'text-anchor': 'middle', 'font-size': 2.3 });
  y += 7; T(cx0 + cw / 2, y, 'Válida al imprimir en ' + op.papel + ' al 100 %', { 'text-anchor': 'middle', 'font-size': 1.9, fill: '#5A6B80' }); y += 6;
  // Norte
  titulo('NORTE');
  const nx = cx0 + cw / 2, ny = y + 8;
  el(s, 'path', { d: `M${nx} ${ny - 8}L${nx + 3.4} ${ny + 6}L${nx} ${ny + 3.6}Z`, fill: '#0B1D33' });
  el(s, 'path', { d: `M${nx} ${ny - 8}L${nx - 3.4} ${ny + 6}L${nx} ${ny + 3.6}Z`, fill: '#fff', stroke: '#0B1D33', 'stroke-width': .35 });
  T(nx, ny - 9.4, 'N', { 'text-anchor': 'middle', 'font-size': 3.6, 'font-weight': 700 });
  const conv = (Math.atan(Math.tan((lonC - ((L.zona - 1) * 6 - 177)) * D2R) * Math.sin(latC * D2R)) / D2R);
  T(nx, ny + 10, 'Norte geográfico', { 'text-anchor': 'middle', 'font-size': 2.1, fill: '#5A6B80' });
  T(nx, ny + 13, 'Convergencia de cuadrícula ' + conv.toFixed(2).replace('.', ',') + '°', { 'text-anchor': 'middle', 'font-size': 1.9, fill: '#5A6B80' });
  y = ny + 19;
  // Leyenda
  titulo('LEYENDA');
  const items = leyendaCapas();
  if (document.querySelector('#cc-capa [data-hoja]')) items.push({ nombre: 'Carta IGM 1:50.000 ' + [...document.querySelectorAll('#cc-capa [data-hoja]')].map(g => g.dataset.hoja).join(', '), color: '#B79A5B', tipo: 'area' });
  if (calco && calco.childElementCount) items.push({ nombre: 'Calco de planeamiento', color: '#1F5AA6', tipo: 'calco' });
  if (cuadriculaActiva) { items.push({ nombre: 'Cuadrícula UTM 10 km', color: '#12294A', tipo: 'cuad' }); items.push({ nombre: 'Límite de zona UTM', color: '#B79A5B', tipo: 'linea' }); }
  if (op.cuad) items.push({ nombre: `Coordenadas del marco cada ${miles(L.iv)} m`, color: '#0B1D33', tipo: 'cuad' });
  items.slice(0, 18).forEach(it => {
    const yy = y - .9;
    if (it.tipo === 'sim') { const g = el(s, 'g', { transform: `translate(${cx0 + 2.5} ${yy}) scale(.2)` }); g.innerHTML = it.s; T(cx0 + 7, y, it.nombre.length > 34 ? it.nombre.slice(0, 33) + '…' : it.nombre, { 'font-size': 2.3 }); y += 3.6; return; }
    if (it.tipo === 'linea') el(s, 'line', { x1: cx0, x2: cx0 + 5, y1: yy, y2: yy, stroke: it.color, 'stroke-width': .8 });
    else if (it.tipo === 'area') el(s, 'rect', { x: cx0, y: yy - 1.4, width: 5, height: 2.8, fill: it.color, 'fill-opacity': .35, stroke: it.color, 'stroke-width': .3 });
    else if (it.tipo === 'cuad') el(s, 'path', { d: `M${cx0} ${yy - 1.4}h5M${cx0} ${yy + 1.4}h5M${cx0 + 1.2} ${yy - 2}v4M${cx0 + 3.8} ${yy - 2}v4`, stroke: it.color, 'stroke-width': .2, fill: 'none' });
    else if (it.tipo === 'calco') el(s, 'rect', { x: cx0 + .6, y: yy - 1.3, width: 3.8, height: 2.6, fill: 'none', stroke: it.color, 'stroke-width': .5 });
    else el(s, 'circle', { cx: cx0 + 2.5, cy: yy, r: 1.2, fill: it.color, stroke: '#fff', 'stroke-width': .25 });
    const t = it.nombre.length > 34 ? it.nombre.slice(0, 33) + '…' : it.nombre;
    T(cx0 + 7, y, t, { 'font-size': 2.3 }); y += 4;
  });
  y += 2;
  // Datos técnicos
  titulo('DATOS TÉCNICOS');
  const centro = textos(latC, lonC), ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  const credito = (document.querySelector('.basemap-credit')?.textContent || '').trim();
  const filas = [['Datum', 'WGS 84'], ['Proyección', `UTM zona ${L.zona} ${L.sur ? 'Sur' : 'Norte'}`], ['Centro (UTM)', centro.utm], ['Fecha', fecha], ['Elaborado por', op.autor || '—'], ['Mapa base', credito ? credito.replace(/^©\s*/, '© ') : 'Sin mapa base']];
  filas.forEach(([k, v]) => {
    if (y > H - 14) return;
    T(cx0, y, k, { 'font-size': 2, fill: '#5A6B80', 'letter-spacing': .2 }); y += 2.8;
    const t = v.length > 40 ? v.slice(0, 39) + '…' : v; T(cx0, y, t, { 'font-size': 2.4, 'font-weight': 600 }); y += 4;
  });
  // Pie
  T(14, H - 9.2, 'Geovisor EMTE · Provincia Omasuyos, La Paz – Bolivia', { 'font-size': 2.2, fill: '#5A6B80' });
  T(fx + fw, H - 9.2, 'Coordenadas en el marco: ' + (L.iv >= 1000 ? 'kilómetros UTM' : 'metros UTM'), { 'font-size': 2.2, fill: '#5A6B80', 'text-anchor': 'end' });

  // Tamaño de la hoja en pantalla y en impresión
  const ancho = op.papel === 'A3' ? 420 : 297, alto = op.papel === 'A3' ? 297 : 210;
  hoja.style.width = ancho + 'mm'; hoja.style.height = alto + 'mm';
  vista.hidden = false;
  const ajustar = () => { const k = Math.min(1, (vista.clientWidth - 30) / hoja.offsetWidth, (vista.clientHeight - 80) / hoja.offsetHeight); hoja.style.transform = `scale(${k})`; hoja.style.marginBottom = (hoja.offsetHeight * (k - 1)) + 'px'; };
  requestAnimationFrame(ajustar);
}
/* ---------- PDF: la hoja se dibuja en alta resolución y se guarda como archivo .pdf ---------- */
const PROPS = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'display', 'visibility', 'font-family', 'font-size', 'font-weight', 'letter-spacing', 'paint-order', 'vector-effect'];
const aDataURL = blob => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(blob); });
async function incrustar(url) {
  try { const abs = new URL(url, location.href), mismo = abs.origin === location.origin;
    const r = await fetch(abs.href, mismo ? { credentials: 'same-origin' } : { mode: 'cors', credentials: 'omit' }); if (!r.ok) return null; return await aDataURL(await r.blob()); }
  catch (e) { return null; }
}
function pdfDesdeJPEG(bytes, anchoPx, altoPx, anchoPt, altoPt, titulo) {
  const enc = new TextEncoder(), partes = [], pos = []; let largo = 0;
  const poner = x => { const b = typeof x === 'string' ? enc.encode(x) : x; partes.push(b); largo += b.length; };
  const t = titulo.replace(/[()\\]/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, ' ');
  const cont = `q ${anchoPt} 0 0 ${altoPt} 0 0 cm /Mapa Do Q`;
  poner('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'.replace(/[^\x00-\x7f]/g, '*'));
  const obj = (n, cuerpo) => { pos[n] = largo; poner(`${n} 0 obj\n`); (Array.isArray(cuerpo) ? cuerpo : [cuerpo]).forEach(poner); poner('\nendobj\n'); };
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${anchoPt} ${altoPt}] /Resources << /XObject << /Mapa 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, [`<< /Type /XObject /Subtype /Image /Width ${anchoPx} /Height ${altoPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`, bytes, '\nendstream']);
  obj(5, `<< /Length ${cont.length} >>\nstream\n${cont}\nendstream`);
  obj(6, `<< /Title (${t}) /Producer (Geovisor EMTE) /Creator (Geovisor EMTE - Escuela Militar de Topografia del Ejercito) >>`);
  const xref = largo; let x = `xref\n0 7\n0000000000 65535 f \n`; for (let n = 1; n <= 6; n++) x += String(pos[n]).padStart(10, '0') + ' 00000 n \n';
  poner(x + `trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(partes, { type: 'application/pdf' });
}
let generando = false;
async function descargarPDF() {
  const vivo = $('topo-hoja').querySelector('svg'); if (!vivo || generando || !opciones) return;
  generando = true; const msg = $('topo-progreso'), boton = $('topo-descargar'); boton.disabled = true; msg.textContent = 'Preparando el PDF…';
  try {
    // 1) copia con los estilos ya calculados (las hojas de estilo de la página no viajan dentro de una imagen SVG)
    const copia = vivo.cloneNode(true), a = [vivo, ...vivo.querySelectorAll('*')], b = [copia, ...copia.querySelectorAll('*')];
    for (let i = 0; i < a.length; i++) {
      const cs = getComputedStyle(a[i]); let st = '';
      for (const k of PROPS) { const v = cs.getPropertyValue(k); if (v) st += `${k}:${v};`; }
      b[i].setAttribute('style', st + (b[i].getAttribute('style') || ''));
      b[i].removeAttribute('class');
    }
    // 2) imágenes (logos, teselas del mapa base y cartas) incrustadas para poder dibujarlas
    const imgs = [...copia.querySelectorAll('image')], cache = new Map(); let fallas = 0, hechas = 0;
    await Promise.all(imgs.map(async im => {
      const u = im.getAttribute('href') || im.getAttributeNS('http://www.w3.org/1999/xlink', 'href'); if (!u || u.startsWith('data:')) return;
      if (!cache.has(u)) cache.set(u, incrustar(u));
      const d = await cache.get(u); hechas++; if (hechas % 10 === 0) msg.textContent = `Preparando imágenes… ${hechas}/${imgs.length}`;
      if (d) im.setAttribute('href', d); else { im.remove(); fallas++; }
    }));
    // 3) dibujo en alta resolución (A4 a 200 ppp, A3 a 150 ppp)
    msg.textContent = 'Dibujando el mapa…';
    const a3 = opciones.papel === 'A3', anchoMm = a3 ? 420 : 297, altoMm = a3 ? 297 : 210, ppp = a3 ? 150 : 200;
    const W = Math.round(anchoMm / 25.4 * ppp), H = Math.round(altoMm / 25.4 * ppp);
    copia.setAttribute('width', W); copia.setAttribute('height', H);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copia)], { type: 'image/svg+xml' }));
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.drawImage(img, 0, 0, W, H); URL.revokeObjectURL(url);
    const jpg = await new Promise(res => cv.toBlob(res, 'image/jpeg', .92));
    const bytes = new Uint8Array(await jpg.arrayBuffer());
    const pdf = pdfDesdeJPEG(bytes, W, H, +(anchoMm / 25.4 * 72).toFixed(2), +(altoMm / 25.4 * 72).toFixed(2), opciones.titulo || 'Mapa');
    const nombre = ((opciones.titulo || 'MAPA') + '_' + new Date().toISOString().slice(0, 10)).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/_+/g, '_');
    const enlace = document.createElement('a'); enlace.href = URL.createObjectURL(pdf); enlace.download = nombre + '.pdf'; document.body.append(enlace); enlace.click();
    setTimeout(() => { URL.revokeObjectURL(enlace.href); enlace.remove(); }, 4000);
    msg.textContent = 'PDF descargado: ' + nombre + '.pdf' + (fallas ? ` (sin ${fallas} tesela(s) del mapa base)` : '');
  } catch (e) { msg.textContent = 'No se pudo generar el PDF. Vuelve a intentarlo.'; }
  finally { generando = false; boton.disabled = false; }
}

// Para pruebas y para otros módulos
window.EMTE_TOPO = { aUTM, deUTM, leerCoordenada, irA, volar, textos };
});
