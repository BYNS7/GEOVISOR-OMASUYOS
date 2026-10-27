// Capas de apoyo al planeamiento (agregado por BYNS7): comunidades, posibles zonas de aterrizaje,
// puentes y fuentes de agua de la provincia Omasuyos, con ficha al hacer clic.
// Datos: data/planeamiento_apoyo.json (OpenStreetMap, consultado el 19/10/2026).
document.addEventListener('DOMContentLoaded', () => {
'use strict';
const mapa = document.querySelector('.map'), scene = document.getElementById('scene');
if (!mapa || !scene) return;
const NS = 'http://www.w3.org/2000/svg', K = 65759.1401421867, OX = 1.199706713376768, OY = 0.2830464015276702, D2R = Math.PI / 180;
const aEscena = (lon, lat) => [500 + (lon * D2R + OX) * K, 380 - (Math.log(Math.tan(Math.PI / 4 + lat * D2R / 2)) + OY) * K];
const el = (par, tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) if (at[k] != null) e.setAttribute(k, at[k]); if (par) par.append(e); return e; };
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const miles = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const css = h('style');
css.textContent = `#topo-apoyo .ap-s{cursor:pointer}#topo-apoyo .ap-s:hover{filter:drop-shadow(0 0 3px #B79A5B)}#topo-apoyo text{pointer-events:none}
.ap-ficha p{font-size:12px;margin:3px 0}.ap-ficha .ap-nota{margin-top:8px;padding:7px 9px;border-left:3px solid #B79A5B;background:#F8F6F0;font-size:11px;color:#5A5040}
.ap-ficha .ap-clase{display:inline-block;margin:4px 0;padding:2px 8px;border-radius:4px;font:700 11px var(--tipo-titulo,system-ui);letter-spacing:.06em}`;
document.head.append(css);

const COL_ZONA = { 'Apta (≥ 35 m)': '#1E8B4C', 'Restringida (25–35 m)': '#C77C0E', 'No apta (< 25 m)': '#7A8594', 'Sin dimensiones': '#7A8594', 'Helipuerto': '#1F5AA6' };
const CAPAS = [
  { k: 'comunidades', nombre: 'Comunidades', color: '#5B3A1E' },
  { k: 'zonas', nombre: 'Posibles zonas de aterrizaje', color: '#1E8B4C' },
  { k: 'puentes', nombre: 'Puentes', color: '#4A4A4A' },
  { k: 'agua', nombre: 'Fuentes y obras de agua', color: '#1F78B4' }
];
let D = null; const activas = new Set();
const gA = el(null, 'g', { id: 'topo-apoyo' });

function simbolo(capa, f) {
  const [x, y] = aEscena(f[2], f[1]), g = el(gA, 'g', { class: 'ap-s', 'data-x': x, 'data-y': y, transform: `translate(${x} ${y}) scale(${1 / scale})` });
  g.innerHTML = window.EMTE_SIMBOLOS.apoyo(capa, f);
  g.addEventListener('click', e => { e.stopPropagation(); ficha(capa, f); });
  return g;
}
function etiquetas() {
  gA.querySelectorAll('text.ap-et').forEach(t => t.remove());
  if (!activas.has('comunidades') || !D || scale < 5) return;
  const f = 1 / scale;
  for (const c of D.comunidades) {
    if (scale < 9 && c[3] === 'Caserío') continue;
    const [x, y] = aEscena(c[2], c[1]);
    const t = el(gA, 'text', { class: 'ap-et', x: x + 7 * f, y: y + 3 * f, 'font-family': 'Segoe UI,system-ui', 'font-size': c[3] === 'Pueblo' ? 12 : 10.5, 'font-weight': c[3] === 'Pueblo' ? 700 : 600, fill: '#3E2A16', stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke', transform: `translate(${x} ${y}) scale(${f}) translate(${-x} ${-y})` });
    t.textContent = c[0];
  }
}
function dibujar() {
  gA.replaceChildren(); if (!D || !activas.size) { gA.remove(); return; }
  for (const c of ['agua', 'puentes', 'zonas', 'comunidades']) if (activas.has(c)) D[c].forEach(f => simbolo(c, f));
  etiquetas();
  if (!gA.isConnected) { const ref = document.getElementById('cc-capa'); scene.append(gA); }
}
function ficha(capa, f) {
  const F = window.EMTE_FICHA; if (!F) return;
  const T = { comunidades: 'FICHA DE COMUNIDAD', zonas: 'FICHA DE ZONA DE ATERRIZAJE', puentes: 'FICHA DE PUENTE', agua: 'FICHA DE FUENTE U OBRA DE AGUA' }[capa];
  const cat = { comunidades: f[3], zonas: 'Posible zona de aterrizaje · ' + (f[3] || ''), puentes: 'Puente', agua: f[3] }[capa];
  const info = F.abrir(T, f[0], cat, [f[2], f[1]]); if (!info) return;
  const ic = F.el('div', 'fs-ico'); ic.innerHTML = window.EMTE_SIMBOLOS ? window.EMTE_SIMBOLOS.icono(window.EMTE_SIMBOLOS.apoyo(capa, f), 34) : ''; if (ic.innerHTML) info.append(ic);
  let datos = [];
  if (capa === 'comunidades') { F.poner(info, F.chips([[f[3], 'no'], [f[4] ? '✔ ' + miles(f[4]) + ' HAB.' : null, 'si']])); datos = [['Categoría', f[3]], ['Población', f[4] ? miles(f[4]) + ' habitantes' : null, f[4] ? 'OSM (probablemente Censo 2012)' : null]]; }
  if (capa === 'zonas') {
    F.poner(info, F.chips([[f[7] ? String(f[7]).toUpperCase() : null, /^apta/i.test(f[7] || '') ? 'si' : /restring/i.test(f[7] || '') ? 'med' : 'no']]));
    datos = [['Aptitud', f[7]], ['Tipo de terreno', f[3]], ['Deporte', f[4]], ['Superficie', f[5]], ['Dimensiones aprox.', f[6] ? `${f[6][0]} × ${f[6][1]} m (rectángulo envolvente)` : null]];
  }
  if (capa === 'puentes') { F.poner(info, F.chips([[f[4] ? 'RUTA ' + f[4] : null, 'si'], [f[6] ? 'CARGA ' + f[6] + ' t' : null, 'med']])); datos = [['Vía', f[3]], ['Ruta', f[4]], ['Longitud aprox.', f[5] ? miles(f[5]) + ' m' : null], ['Carga máxima', f[6] ? f[6] + ' t' : null], ['Superficie', f[7]], ['Carriles', f[8]]]; }
  if (capa === 'agua') datos = [['Tipo de obra', f[3]]];
  const id = f[f.length - 1], tipo = { n: 'node', w: 'way', r: 'relation' }[id[0]];
  F.poner(info,
    F.bloque('1. IDENTIFICACIÓN', [['Nombre', f[0]], ...datos]),
    F.bloque('2. UBICACIÓN', F.ubicacion(f[2], f[1])),
    capa !== 'agua' ? F.cercanos(f[2], f[1], null, '3. LO MÁS CERCANO') : null,
    F.bloque(capa !== 'agua' ? '4. FUENTE' : '3. FUENTE', [['Fuente', `OpenStreetMap ${tipo}/${id.slice(1)} (© contribuyentes OSM, ODbL)`]]));
  if (capa === 'zonas') info.append(F.pie(String(D.nota_aterrizaje || '').toUpperCase()));
}
function casillas() {
  const capas = document.getElementById('layers'); if (!capas) return;
  const grupo = h('details', 'layer-group'); grupo.innerHTML = '<summary>Apoyo al planeamiento</summary>';
  for (const c of CAPAS) {
    const lab = h('label'), cb = h('input'), dot = h('span', 'dot'); cb.type = 'checkbox'; dot.style.setProperty('--c', c.color);
    lab.append(cb, dot, document.createTextNode(c.nombre)); grupo.append(lab);
    cb.addEventListener('change', () => {
      if (cb.checked) activas.add(c.k); else activas.delete(c.k);
      if (D) dibujar(); else fetch('data/planeamiento_apoyo.json').then(r => r.json()).then(d => { D = d; dibujar(); grupo.querySelectorAll('label').forEach((l, i) => { const n = D[CAPAS[i].k].length; if (!l.querySelector('small')) { const s = h('small', null, ' ' + n); s.style.cssText = 'margin-left:auto;color:#5A6B80;font-size:10px'; l.append(s); } }); }).catch(() => {});
    });
  }
  capas.append(grupo);
}
if (document.getElementById('layers')?.children.length) casillas();
else { const ob = new MutationObserver(() => { if (document.getElementById('layers')?.children.length) { ob.disconnect(); casillas(); } }); ob.observe(document.body, { childList: true, subtree: true }); }

const zoomAnterior = zoom;
zoom = function (f) {
  zoomAnterior(f);
  if (!activas.size) return;
  const s = 1 / scale; gA.querySelectorAll('.ap-s').forEach(g => g.setAttribute('transform', `translate(${g.dataset.x} ${g.dataset.y}) scale(${s})`));
  clearTimeout(zoom._ap); zoom._ap = setTimeout(etiquetas, 120);
};
});
