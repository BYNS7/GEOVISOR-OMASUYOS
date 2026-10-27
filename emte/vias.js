/* Simbología clasificada de la red vial (agregado por BYNS7).
   · Ocho clases jerarquizadas con estilo cartográfico formal: las vías principales llevan borde (casing)
     y se dibujan por encima de los caminos menores; caminos de herradura y sendas con trazo discontinuo.
   · Escudos de ruta (Red Vial Fundamental, ABC) sobre el mapa.
   · Filtro por clase en Capas → Red vial, sección «Red vial» en la Simbología y en la leyenda del PDF.
   · Ficha de vía ordenada con los atributos oficiales que trae la capa (ABC / IGM / OSM). */
(function () {
'use strict';
const NS = 'http://www.w3.org/2000/svg';
// [clave en datos, nombre de leyenda, color, ancho, borde, ancho borde, discontinuo]
const CLASES = [
  ['Carretera RVF', 'Carretera de la Red Vial Fundamental (ABC)', '#C62828', 3.4, '#4A0E0E', 5.6, ''],
  ['Carretera principal (no RVF)', 'Carretera principal', '#E67E22', 2.9, '#6B3608', 4.7, ''],
  ['Camino secundario', 'Camino secundario (red departamental)', '#F2C230', 2.3, '#7A5C00', 3.8, ''],
  ['Camino terciario', 'Camino terciario', '#FFFFFF', 1.8, '#6E6255', 3.1, ''],
  ['Camino vecinal', 'Camino vecinal / comunal', '#8D6E4A', 1.3, null, 0, ''],
  ['Calle', 'Calle urbana', '#5F6670', 1.0, null, 0, ''],
  ['Camino de herradura / brecha', 'Camino de herradura / brecha', '#7B4F2A', 1.0, null, 0, '5 2.5'],
  ['Sendero / peatonal', 'Sendero / peatonal', '#4E4E4E', 0.9, null, 0, '1.2 2.4']
];
const POR = Object.fromEntries(CLASES.map((c, i) => [c[0], { i, n: c[1], color: c[2], w: c[3], borde: c[4], wb: c[5], dash: c[6] }]));
let ocultas = new Set();

/* Ícono de línea (unidades -11…11, igual que los demás símbolos) */
function linea(k) {
  const c = POR[k]; if (!c) return '';
  const f = 1.25, cap = c.dash ? 'butt' : 'round';
  return (c.borde ? `<path d="M-10 0H10" stroke="${c.borde}" stroke-width="${c.wb * f}" stroke-linecap="round"/>` : '')
    + `<path d="M-10 0H10" stroke="${c.color}" stroke-width="${c.w * f}" stroke-linecap="${cap}"${c.dash ? ` stroke-dasharray="${c.dash.split(' ').map(x => x * 1.6).join(' ')}"` : ''}/>`;
}
const iconoSvg = (k, t = 20) => `<svg class="sim-ico" viewBox="-11 -11 22 22" width="${t}" height="${t}" aria-hidden="true">${linea(k)}</svg>`;

/* ---------- atributos ---------- */
function obs(p) {
  const o = {};
  String(p.observacion || '').split('|').forEach(s => { const i = s.indexOf(':'); if (i > 0) { const k = s.slice(0, i).trim(), v = s.slice(i + 1).trim(); if (v) o[k] = v; } });
  return o;
}
const vacio = v => v == null || /^(\s*|sin dato|s\/n|null|none)$/i.test(String(v).trim());
function ruta(p) { const r = obs(p).Ruta; return vacio(r) ? null : r; }
function etiquetaRuta(p) { const r = ruta(p); if (!r) return null; return p.tipo_via === 'Carretera RVF' ? 'RN ' + r.replace(/^F-?/i, '') : r; }
function longitudKm(f) {
  const R = 6371.0088, rad = Math.PI / 180; let s = 0;
  for (const l of (f.geometry && f.geometry.coordinates) || []) for (let i = 1; i < l.length; i++) {
    const [a, b] = [l[i - 1], l[i]], dl = (b[1] - a[1]) * rad, dn = (b[0] - a[0]) * rad;
    const h = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dn / 2) ** 2; s += 2 * R * Math.asin(Math.sqrt(h));
  }
  return s;
}
/* Completa, sin inventar, lo que la propia capa oficial permite deducir. */
function completar(f) {
  const p = f.properties, o = obs(p);
  if (vacio(p.nombre) && o.Ruta) { p.nombre = (p.tipo_via === 'Carretera RVF' ? 'Ruta Nacional ' : 'Ruta ') + o.Ruta.replace(/^F-?/i, ''); p._deducido = 'nombre'; }
  if (vacio(p.superficie) && o['Rodadura ABC']) { p.superficie = /pavim/i.test(o['Rodadura ABC']) ? 'Asfalto' : /ripio/i.test(o['Rodadura ABC']) ? 'Ripio' : /tierra/i.test(o['Rodadura ABC']) ? 'Tierra' : o['Rodadura ABC']; }
}

/* ---------- estilo en el mapa ---------- */
let G, CAS, TOP, RUT, estilo;
function css() {
  const sel = [...ocultas].map(k => `[data-road-type="${k.replace(/"/g, '\\"')}"]`).join(',');
  estilo.textContent = `#roads-casing,#roads-top,#vias-rutas{pointer-events:none}
#roads path{stroke-linecap:round;stroke-linejoin:round}
#roads path[data-road-type="Camino de herradura / brecha"],#roads path[data-road-type="Sendero / peatonal"]{stroke-linecap:butt}
.map svg.lod-100 #vias-rutas .ruta-menor{display:none}` + (sel ? `\n:is(#roads,#roads-casing,#roads-top) path:is(${sel}){display:none}` : '');
}
function nuevoGrupo(id) { const g = document.createElementNS(NS, 'g'); g.id = id; return g; }
function clon(p, color, w, dash) {
  const c = document.createElementNS(NS, 'path');
  c.setAttribute('d', p.getAttribute('d')); c.setAttribute('fill', 'none'); c.setAttribute('stroke', color); c.setAttribute('stroke-width', w);
  c.setAttribute('vector-effect', 'non-scaling-stroke'); c.setAttribute('stroke-linecap', 'round'); c.setAttribute('stroke-linejoin', 'round');
  if (dash) c.setAttribute('stroke-dasharray', dash); c.dataset.roadType = p.dataset.roadType; return c;
}
function espejo() { const d = G.style.display; for (const g of [CAS, TOP, RUT]) if (g) g.style.display = d; if (window.EMTE_SIMB_REFRESCAR) window.EMTE_SIMB_REFRESCAR(); }
function escudos() {
  RUT.replaceChildren();
  const k = 1 / scale, mejores = new Map();
  roadFeatures.forEach(f => { const t = etiquetaRuta(f.properties); if (!t) return; const L = longitudKm(f), a = mejores.get(t) || []; a.push([L, f]); mejores.set(t, a); });
  for (const [t, a] of mejores) {
    a.sort((x, y) => y[0] - x[0]);
    a.slice(0, 3).forEach(([, f], j) => {
      const l = f.geometry.coordinates.reduce((m, x) => x.length > m.length ? x : m, []), c = l[Math.floor(l.length / 2)]; if (!c) return;
      const [x, y] = roadPoint(c), rvf = f.properties.tipo_via === 'Carretera RVF', w = 7 + t.length * 5.6;
      const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'ruta' + (j ? ' ruta-menor' : '')); g.dataset.x = x; g.dataset.y = y;
      g.setAttribute('transform', `translate(${x} ${y}) scale(${k})`);
      g.innerHTML = `<path d="M${-w / 2 + 3} -8.5h${w - 6}q3 0 3 3v11q0 3-3 3h${-(w - 6)}q-3 0-3-3v-11q0-3 3-3z" fill="${rvf ? '#C62828' : '#E67E22'}" stroke="#fff" stroke-width="1.6"/><text y="4" text-anchor="middle" font-family="Bahnschrift,Segoe UI,system-ui" font-size="10.5" font-weight="700" fill="#fff">${t}</text>`;
      g.querySelector('path').setAttribute('paint-order', 'stroke');
      RUT.append(g);
    });
  }
}
function reescalar() { if (!RUT) return; const k = 1 / scale; for (const g of RUT.children) g.setAttribute('transform', `translate(${g.dataset.x} ${g.dataset.y}) scale(${k})`); }

function aplicar() {
  const paths = [...G.children];
  CAS = nuevoGrupo('roads-casing'); TOP = nuevoGrupo('roads-top'); RUT = nuevoGrupo('vias-rutas');
  paths.forEach((p, i) => {
    const f = roadFeatures[i]; if (!f) return; completar(f);
    const k = f.properties.tipo_via, c = POR[k]; p.dataset.roadType = k || 'Sin clase';
    if (!c) return;
    p.setAttribute('stroke', c.color); p.setAttribute('stroke-width', c.w); p.setAttribute('stroke-dasharray', c.dash);
    if (c.borde) { CAS.append(clon(p, '#FFFFFF', c.wb + 1.6)); CAS.append(clon(p, c.borde, c.wb)); TOP.append(clon(p, c.color, c.w)); }
  });
  // borde: debajo de todas las vías; relleno de vías mayores: encima de los caminos menores
  const orden = [...TOP.children].sort((a, b) => POR[b.dataset.roadType].i - POR[a.dataset.roadType].i); TOP.replaceChildren(...orden);
  G.before(CAS); G.after(TOP);
  document.getElementById('scene').append(RUT); escudos();
  new MutationObserver(espejo).observe(G, { attributes: true, attributeFilter: ['style'] }); espejo();
  let tt = 0; new MutationObserver(() => { clearTimeout(tt); tt = setTimeout(sincronizar, 40); }).observe(G, { attributes: true, subtree: true, attributeFilter: ['style'] }); sincronizar();
  capas(); const L = document.getElementById('layers');
  if (L) { let tc = 0; new MutationObserver(() => { clearTimeout(tc); tc = setTimeout(capas, 40); }).observe(L, { childList: true, subtree: true }); }
}

/* ---------- Capas → Red vial (filtros de local.js: solo se cambian las muestras por la simbología) ---------- */
function capas() {
  const master = document.querySelector('#layers input[onchange*="roads"]') || document.querySelector('#layers .vias-master');
  const lab = master ? master.closest('label') : [...document.querySelectorAll('#layers label')].find(l => /Todas las vías|Vías y caminos/.test(l.textContent));
  if (!lab) return;
  lab.classList.add('vias-master');
  const dot = lab.querySelector('.dot');
  if (dot && !dot.dataset.sim) { dot.classList.add('sim-dot'); dot.innerHTML = iconoSvg('Carretera RVF'); dot.dataset.sim = '1'; }
  const menu = lab.closest('details'); if (!menu) return;
  menu.querySelectorAll('details label').forEach(row => {
    const k = row.children[2] && row.children[2].textContent, sw = row.children[1];
    if (!POR[k] || !sw || sw.dataset.sim) return;
    sw.removeAttribute('style'); sw.style.cssText = 'width:24px;flex:none;display:inline-flex;justify-content:center';
    sw.innerHTML = iconoSvg(k, 22); sw.dataset.sim = '1'; row.title = POR[k].n;
  });
}
/* Lo que oculta local.js (por tramo) se refleja en el borde, el relleno superior y la leyenda. */
function sincronizar() {
  const vis = new Map();
  for (const p of G.children) { const k = p.dataset.roadType; if (!vis.has(k)) vis.set(k, p.style.display !== 'none'); }
  const nuevas = new Set([...vis].filter(([, v]) => !v).map(([k]) => k));
  if ([...nuevas].join() !== [...ocultas].join()) { ocultas = nuevas; css(); if (window.EMTE_SIMB_REFRESCAR) window.EMTE_SIMB_REFRESCAR(); }
}
/* ---------- leyenda (tarjeta Simbología y PDF) ---------- */
function leyenda() {
  if (!G || G.style.display === 'none' || !roadFeatures.length) return [];
  const cnt = new Map(); roadFeatures.forEach(f => cnt.set(f.properties.tipo_via, (cnt.get(f.properties.tipo_via) || 0) + 1));
  const out = CLASES.filter(([k]) => cnt.get(k) && !ocultas.has(k)).map(([k]) => ({ nombre: POR[k].n, tipo: 'sim', s: linea(k), n: cnt.get(k) }));
  if (RUT && RUT.childElementCount) out.push({ nombre: 'Número de ruta nacional (ABC)', tipo: 'sim', s: '<path d="M-7 -6h14q2 0 2 2v8q0 2-2 2h-14q-2 0-2-2v-8q0-2 2-2z" fill="#C62828" stroke="#fff" stroke-width="1.2"/><text y="3.2" text-anchor="middle" font-size="7.5" font-weight="700" fill="#fff" font-family="Bahnschrift,Segoe UI,system-ui">2</text>' });
  return out;
}

/* ---------- ficha de la vía (modelo único: ficha-modelo.js) ---------- */
function ficha(f) {
  const F = window.EMTE_FICHA; if (!F) return;
  const p = f.properties, o = obs(p), c = POR[p.tipo_via];
  const L = longitudKm(f), l = f.geometry.coordinates.reduce((m, x) => x.length > m.length ? x : m, []), m = l[Math.floor(l.length / 2)] || [];
  const info = F.abrir('FICHA DE VÍA', vacio(p.nombre) ? (c ? c.n : 'Vía') + ' sin nombre registrado' : p.nombre, c ? c.n : p.tipo_via, m); if (!info) return;
  const ic = F.el('div', 'fs-ico'); ic.innerHTML = iconoSvg(p.tipo_via, 30).replace('<svg ', '<svg style="width:60px;height:30px" '); info.append(ic);
  const pav = /asfalt|pavim|concreto|adoquin/i.test(p.superficie || '');
  F.poner(info,
    F.chips([[o.Red, /Fundamental/i.test(o.Red || '') ? 'si' : 'no'], [etiquetaRuta(p) ? 'Ruta ' + etiquetaRuta(p) : null, 'si'], [vacio(p.superficie) ? null : (pav ? '✔ ' : '◐ ') + p.superficie, pav ? 'si' : 'med']]),
    F.bloque('1. IDENTIFICACIÓN', [['Nombre', vacio(p.nombre) ? null : p.nombre, p._deducido ? 'número de ruta ABC' : p.nombre_tipo ? 'nombre descriptivo por las comunidades que une (no oficial)' : null], ['Clase de vía', c ? c.n : p.tipo_via], ['Red vial', o.Red], ['Ruta', etiquetaRuta(p)], ['Código de tramo', p.id_via]]),
    F.bloque('2. CARACTERÍSTICAS', [['Superficie de rodadura', vacio(p.superficie) ? null : p.superficie, /Superficie: deducida de tracktype/.test(p.observacion || '') ? 'OpenStreetMap (tipo de pista)' : null], ['Estado', vacio(p.estado) ? null : p.estado, o.Fuente && /estado/i.test(o.Fuente) ? 'Mapa oficial RVF 2026 (ABC)' : /Estado: según smoothness/.test(p.observacion || '') ? 'OpenStreetMap (calidad de rodadura)' : null], ['Longitud del tramo', L ? (L < 1 ? Math.round(L * 1000) + ' m' : L.toFixed(2).replace('.', ',') + ' km') : null], ['Clase IGM', o['Clase IGM']], ['Clase OSM', o['Clase OSM']]]),
    F.bloque('3. UBICACIÓN (PUNTO MEDIO)', [['Municipio', o.Municipio], ...F.ubicacion(m[0], m[1])]),
    F.cercanos(m[0], m[1], f, '4. LO MÁS CERCANO (DESDE EL PUNTO MEDIO)'),
    F.bloque('5. FUENTE Y VERIFICACIÓN', [['Fuente', o.Fuente || 'OpenStreetMap (© contribuyentes OSM, ODbL)'], ['Verificación', o['Verificación declarada']]]));
  const faltan = [(vacio(p.nombre) || p.nombre_tipo) && 'nombre oficial', vacio(p.superficie) && 'superficie', vacio(p.estado) && 'estado'].filter(Boolean);
  if (faltan.length) info.append(F.pie(`SIN DATO OFICIAL PUBLICADO DE ${faltan.join(', ').toUpperCase()} (LA ABC SOLO PUBLICA ESTADO Y RODADURA DE LA RED VIAL FUNDAMENTAL)`));
}

document.addEventListener('DOMContentLoaded', () => {
  G = document.getElementById('roads'); if (!G) return;
  estilo = document.createElement('style'); document.head.append(estilo); css();
  window.selectRoad = ficha;
  let n = 0; const t = setInterval(() => {
    if (++n > 600) return clearInterval(t);
    if (typeof roadFeatures !== 'undefined' && roadFeatures.length && G.childElementCount >= roadFeatures.length) { clearInterval(t); aplicar(); }
  }, 100);
  const zoomAnterior = zoom; zoom = function (k) { zoomAnterior(k); reescalar(); };
});
window.EMTE_VIAS = { CLASES, linea, leyenda };
})();
