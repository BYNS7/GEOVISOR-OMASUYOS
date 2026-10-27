/* Cerros, abras y cotas (agregado por BYNS7). Datos: data/cerros_omasuyos.geojson
   (OpenStreetMap, cimas citadas en las leyes de límites y cota máxima de cada municipio con el Copernicus DEM). */
document.addEventListener('DOMContentLoaded', () => {
'use strict';
const scene = document.getElementById('scene'); if (!scene) return;
const NS = 'http://www.w3.org/2000/svg', K = 65759.1401421867, OX = 1.199706713376768, OY = 0.2830464015276702, D2R = Math.PI / 180;
const aEscena = (lon, lat) => [500 + (lon * D2R + OX) * K, 380 - (Math.log(Math.tan(Math.PI / 4 + lat * D2R / 2)) + OY) * K];
const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const miles = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const SIM = {
  cerro: '<path d="M0 -8L7.5 5.5H-7.5Z" fill="#fff"/><path d="M0 -5.6L5.4 4H-5.4Z" fill="#7A4E2D"/>',
  legal: '<path d="M0 -8L7.5 5.5H-7.5Z" fill="#fff"/><path d="M0 -5.6L5.4 4H-5.4Z" fill="#7A4E2D"/><path d="M0 -2.2L2.2 0 0 2.2-2.2 0Z" fill="#fff"/>',
  abra: '<circle r="7" fill="#fff"/><path d="M-5 -5Q-1 0-5 5M5 -5Q1 0 5 5" fill="none" stroke="#7A4E2D" stroke-width="2.2" stroke-linecap="round"/>',
  maxima: '<path d="M0 -9.5L9 6.5H-9Z" fill="#fff"/><path d="M0 -7L6.8 5H-6.8Z" fill="#0B1D33"/><circle cy="1" r="1.8" fill="#D9C08A"/>'
};
const tipoSim = p => /máxima/i.test(p.tipo) ? 'maxima' : /abra|paso/i.test(p.tipo) ? 'abra' : /legal/i.test(p.tipo) ? 'legal' : 'cerro';
let DATA = null, activa = false;
const g = document.createElementNS(NS, 'g'); g.id = 'topo-cerros';
function dibujar() {
  g.replaceChildren(); if (!DATA || !activa) return;
  const k = 1 / scale, conNombre = scale >= 2.4, conAlt = scale >= 1.4;
  for (const f of DATA.features) {
    const p = f.properties, [x, y] = aEscena(...f.geometry.coordinates), t = tipoSim(p);
    if (!p.municipio && p.altitud < 5000) continue;   // fuera de Omasuyos: solo las cumbres de la cordillera como referencia
    if (!conAlt && t !== 'maxima' && p.altitud < 4500) continue;   // a escala chica: solo cumbres altas y cotas máximas
    const m = document.createElementNS(NS, 'g'); m.dataset.x = x; m.dataset.y = y; m.setAttribute('transform', `translate(${x} ${y}) scale(${k})`); m.style.cursor = 'pointer';
    let html = SIM[t];
    const et = conNombre ? (p.nombre ? p.nombre + ' · ' : '') + miles(p.altitud) : conAlt || t === 'maxima' ? miles(p.altitud) : '';
    if (et) html += `<text x="9" y="4" font-family="Bahnschrift,system-ui,sans-serif" font-size="10.5" font-weight="${t === 'maxima' ? 700 : 600}" font-style="italic" fill="#5A3A1E" stroke="#fff" stroke-width="3" paint-order="stroke">${et.replace(/</g, '&lt;')}</text>`;
    m.innerHTML = html + `<title>${(p.nombre || p.tipo).replace(/</g, '&lt;')} · ${miles(p.altitud)} m s.n.m.</title>`;
    m.addEventListener('click', e => { e.stopPropagation(); ficha(f); }); g.append(m);
  }
  const ref = document.getElementById('topo-municipios-nombres'); ref ? ref.before(g) : scene.append(g);
}
function ficha(f) {
  const F = window.EMTE_FICHA; if (!F) return;
  const p = f.properties, [lo, la] = f.geometry.coordinates;
  const info = F.abrir('FICHA DE CERRO / COTA', p.nombre || 'Cerro sin nombre registrado', p.tipo, [lo, la]); if (!info) return;
  const z = window.EMTE_ALTITUD ? window.EMTE_ALTITUD(la, lo) : null;
  F.poner(info, F.chips([['▲ ' + miles(p.altitud) + ' M S.N.M.', 'si'], [p.municipio ? p.municipio.toUpperCase() : 'FUERA DE OMASUYOS', 'no']]),
    F.bloque('1. IDENTIFICACIÓN', [['Nombre', p.nombre], ['Tipo', p.tipo], ['Municipio', p.municipio || 'Fuera de la provincia (alrededores)']]),
    F.bloque('2. ALTITUD', [['Altitud', miles(p.altitud) + ' m s.n.m.', p.fuente_altitud], ['Según el modelo de elevación', z != null && p.fuente_altitud !== 'Copernicus DEM GLO-90' && !/celda/.test(p.fuente_altitud) ? miles(z) + ' m (celdas de ~90 m)' : null]]),
    F.bloque('3. UBICACIÓN', F.ubicacion(lo, la)),
    F.bloque('4. FUENTE', [['Fuente', p.fuente]]));
}
function poner(on) {
  activa = on; if (!on) { g.remove(); return; }
  if (DATA) dibujar(); else fetch('data/cerros_omasuyos.geojson').then(r => r.json()).then(d => { DATA = d; dibujar(); }).catch(() => {});
}
let intentos = 0;
(function casilla() {
  const capas = document.getElementById('layers'), gr = capas && [...capas.querySelectorAll(':scope > details')].find(d => /Relieve/i.test(d.querySelector('summary')?.textContent || ''));
  if (!gr) { if (++intentos < 60) setTimeout(casilla, 250); return; }
  if (gr.querySelector('.ce-cb')) return;
  const lab = h('label', 'ce-cb'), cb = h('input'), dot = h('span', 'dot sim-dot'); cb.type = 'checkbox'; dot.dataset.sim = '1';
  dot.innerHTML = `<svg class="sim-ico" viewBox="-11 -11 22 22" width="20" height="20">${SIM.cerro}</svg>`;
  lab.append(cb, dot, document.createTextNode('Cerros, abras y cotas')); gr.append(lab);
  cb.onchange = () => { poner(cb.checked); capas.dispatchEvent(new Event('change', { bubbles: true })); };
})();
const zoomAnterior = zoom;
zoom = function (f) { zoomAnterior(f); if (activa) { clearTimeout(zoom._ce); zoom._ce = setTimeout(dibujar, 120); g.querySelectorAll(':scope > g').forEach(m => m.setAttribute('transform', `translate(${m.dataset.x} ${m.dataset.y}) scale(${1 / scale})`)); } };
window.EMTE_LEYENDA_CERROS = () => activa ? [{ nombre: 'Cerro / cumbre (altitud m)', tipo: 'sim', s: SIM.cerro }, { nombre: 'Cerro citado en ley de límites', tipo: 'sim', s: SIM.legal }, { nombre: 'Abra / paso', tipo: 'sim', s: SIM.abra }, { nombre: 'Cota máxima del municipio', tipo: 'sim', s: SIM.maxima }] : [];
});
