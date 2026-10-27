/* Cobertura de salud (agregado por BYNS7).
   Distancia en línea recta al establecimiento de salud más cercano (hospital, centros y puestos de salud;
   no cuenta farmacias ni consultorios odontológicos), clasificada en hasta 5 km, 5–10 km y más de 10 km,
   dentro de los municipios de Omasuyos. Las comunidades a más de 5 km se marcan con un aviso rojo. */
document.addEventListener('DOMContentLoaded', () => {
'use strict';
const mapa = document.querySelector('.map'), scene = document.getElementById('scene');
if (!mapa || !scene) return;
const NS = 'http://www.w3.org/2000/svg', K = 65759.1401421867, OX = 1.199706713376768, OY = 0.2830464015276702, D2R = Math.PI / 180;
const aEscena = (lon, lat) => [500 + (lon * D2R + OX) * K, 380 - (Math.log(Math.tan(Math.PI / 4 + lat * D2R / 2)) + OY) * K];
const deEscena = (x, y) => [((x - 500) / K - OX) / D2R, (2 * Math.atan(Math.exp((380 - y) / K - OY)) - Math.PI / 2) / D2R];
const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const miles = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const dec = (n, d = 1) => n.toFixed(d).replace('.', ',');
const km = (a, b) => Math.hypot((b[0] - a[0]) * Math.cos(a[1] * D2R), b[1] - a[1]) * 111.195;
const CL = [[5, '#3E9B4F', 'Hasta 5 km'], [10, '#E7C744', 'De 5 a 10 km'], [Infinity, '#C0392B', 'Más de 10 km']];
const SIRVE = f => /HOSPITAL|CENTRO DE SALUD|PUESTO/i.test(f.properties.categoria || '');

let activa = false, img = null, gAv = null, COM = null, RES = null;
const ley = h('section', 'at-leyenda'); ley.hidden = true; ley.style.bottom = '118px'; ley.style.left = 'auto'; ley.style.right = '16px';
mapa.append(ley);
for (const t of ['pointerdown', 'click', 'wheel']) ley.addEventListener(t, e => e.stopPropagation());

function dentro(pt, geom) {
  const [x, y] = pt, pols = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; let r = false;
  for (const pol of pols) for (const ring of pol) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) r = !r; }
  return r;
}
function masCercano(pt, lista) { let b = null, dm = Infinity; for (const f of lista) { const d = km(pt, f.geometry.coordinates); if (d < dm) { dm = d; b = f; } } return [b, dm]; }

function construir() {
  const EST = healthFeatures.filter(SIRVE), M = window.EMTE_MUNICIPIOS.features;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  M.forEach(f => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).forEach(p => p[0].forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); })));
  const paso = .0025, W = Math.ceil((x1 - x0) / paso), H = Math.ceil((y1 - y0) / paso);
  const [ax, ay] = aEscena(x0, y1), [bx, by] = aEscena(x0 + W * paso, y1 - H * paso);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d'), im = ctx.createImageData(W, H);
  // máscara de los municipios dibujada en la misma rejilla (rápido)
  const mk = document.createElement('canvas'); mk.width = W; mk.height = H; const mc = mk.getContext('2d'); mc.fillStyle = '#000'; mc.beginPath();
  const fila = lat => (aEscena(x0, lat)[1] - ay) / (by - ay) * H;
  M.forEach(f => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).forEach(p => p.forEach(ring => ring.forEach(([x, y], i) => { const X = (x - x0) / paso, Y = fila(y); i ? mc.lineTo(X, Y) : mc.moveTo(X, Y); }))));
  mc.fill('evenodd'); const mask = mc.getImageData(0, 0, W, H).data;
  const cols = CL.map(c => [1, 3, 5].map(i => parseInt(c[1].slice(i, i + 2), 16))), area = [0, 0, 0];
  const cel = paso * 111.195 * paso * 111.195 * Math.cos((y0 + y1) / 2 * D2R);
  for (let r = 0; r < H; r++) {
    const lat = deEscena(ax, ay + (by - ay) * (r + .5) / H)[1];
    for (let c = 0; c < W; c++) {
      const lon = x0 + (c + .5) * paso, pt = [lon, lat];
      if (mask[(r * W + c) * 4 + 3] < 128) continue;
      const d = masCercano(pt, EST)[1], k = CL.findIndex(x => d <= x[0]), o = (r * W + c) * 4;
      im.data[o] = cols[k][0]; im.data[o + 1] = cols[k][1]; im.data[o + 2] = cols[k][2]; im.data[o + 3] = 255; area[k] += cel;
    }
  }
  ctx.putImageData(im, 0, 0);
  img = document.createElementNS(NS, 'image');
  img.setAttribute('id', 'topo-cobertura-salud'); img.setAttribute('x', ax); img.setAttribute('y', ay); img.setAttribute('width', bx - ax); img.setAttribute('height', by - ay);
  img.setAttribute('preserveAspectRatio', 'none'); img.setAttribute('opacity', '.42'); img.setAttribute('pointer-events', 'none'); img.setAttribute('href', cv.toDataURL('image/png'));
  // comunidades
  const lejos = [];
  COM.forEach(c => { const pt = [c[2], c[1]], [f, d] = masCercano(pt, EST); c._d = d; c._f = f; if (d > 5) lejos.push(c); });
  const pobLejos = lejos.reduce((s, c) => s + (+c[4] || 0), 0), pobTot = COM.reduce((s, c) => s + (+c[4] || 0), 0);
  RES = { area, lejos: lejos.sort((a, b) => b._d - a._d), pobLejos, pobTot, nEst: EST.length };
  gAv = document.createElementNS(NS, 'g'); gAv.id = 'topo-cobertura-avisos';
  lejos.forEach(c => {
    const [x, y] = aEscena(c[2], c[1]), g = document.createElementNS(NS, 'g');
    g.dataset.x = x; g.dataset.y = y; g.setAttribute('transform', `translate(${x} ${y}) scale(${1 / scale})`); g.style.cursor = 'pointer';
    g.innerHTML = `<path d="M0 -11L10 7H-10Z" fill="#fff"/><path d="M0 -8.5L7.8 5.5H-7.8Z" fill="#C0392B"/><path d="M0 -4V1.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cy="3.6" r="1.1" fill="#fff"/><title>${c[0]} · ${dec(c._d)} km al establecimiento de salud más cercano</title>`;
    g.addEventListener('click', e => { e.stopPropagation(); ficha(c); }); gAv.append(g);
  });
  leyenda();
}
function leyenda() {
  const R = RES, tot = R.area.reduce((a, b) => a + b, 0);
  ley.innerHTML = '<b class="t">COBERTURA DE SALUD</b>' + CL.map((c, i) => `<div><i style="background:${c[1]}"></i><span>${c[2]}</span><span style="margin-left:auto;color:#5A6B80;font-size:10.5px">${dec(R.area[i] / tot * 100)} %</span></div>`).join('')
    + `<div><svg width="22" height="14" viewBox="-11 -11 22 20" style="width:22px;height:14px;flex:none"><path d="M0 -8.5L7.8 5.5H-7.8Z" fill="#C0392B"/></svg><span><b>${R.lejos.length}</b> comunidades a más de 5 km (${miles(R.pobLejos)} hab.)</span></div>`
    + `<small>Distancia en línea recta al establecimiento más cercano (${R.nEst} hospitales, centros y puestos de salud). Clic en un aviso para ver su ficha.</small>`;
}
function ficha(c) {
  const F = window.EMTE_FICHA; if (!F) return;
  const info = F.abrir('FICHA DE COBERTURA DE SALUD', c[0], c[3] + ' · a más de 5 km de un establecimiento', [c[2], c[1]]); if (!info) return;
  const a = F.el('a', 'fs-ir', c._f.properties.nombre); a.onclick = e => { e.preventDefault(); window.selectHealth(c._f); };
  F.poner(info, F.chips([['✖ ' + dec(c._d) + ' KM AL CENTRO MÁS CERCANO', c._d > 10 ? 'no' : 'med'], [c[4] ? miles(c[4]) + ' HAB.' : null, 'no']]),
    F.bloque('1. COMUNIDAD', [['Nombre', c[0]], ['Categoría', c[3]], ['Población', c[4] ? miles(c[4]) + ' habitantes' : null, c[4] ? 'OSM (probablemente Censo 2012)' : null], ...F.ubicacion(c[2], c[1])]),
    F.bloque('2. ATENCIÓN DE SALUD', [['Establecimiento más cercano', a], ['Categoría', c._f.properties.categoria], ['Distancia en línea recta', dec(c._d) + ' km'], ['Tiempo aproximado a pie', Math.round(c._d / 4.5 * 60) + ' min (4,5 km/h)']]),
    F.cercanos(c[2], c[1], null, '3. LO MÁS CERCANO'));
}
function poner(on) {
  activa = on; ley.hidden = !on;
  if (!on) { img && img.remove(); gAv && gAv.remove(); return; }
  const listo = () => typeof healthFeatures !== 'undefined' && healthFeatures.length && window.EMTE_MUNICIPIOS && COM;
  const ir = () => {
    if (!activa) return;
    if (!listo()) { setTimeout(ir, 300); return; }
    if (!img) construir();
    const ref = document.getElementById('topo-municipios'); ref && ref.parentNode === scene ? ref.after(img) : scene.prepend(img);
    scene.append(gAv);
  };
  if (!COM) fetch('data/planeamiento_apoyo.json').then(r => r.json()).then(d => { COM = d.comunidades.map(x => x.slice()); ir(); }).catch(() => {}); else ir();
}
const zoomAnterior = zoom;
zoom = function (f) { zoomAnterior(f); if (gAv && activa) gAv.querySelectorAll(':scope > g').forEach(g => g.setAttribute('transform', `translate(${g.dataset.x} ${g.dataset.y}) scale(${1 / scale})`)); };
// casilla en Capas › Servicios e instituciones
function casilla() {
  const capas = document.getElementById('layers'); if (!capas || capas.querySelector('.cs-cb')) return;
  const g = [...capas.querySelectorAll(':scope > details')].find(d => /Servicios/i.test(d.querySelector('summary')?.textContent || '')) || capas;
  const lab = h('label', 'cs-cb'), cb = h('input'), dot = h('span', 'dot'); cb.type = 'checkbox';
  dot.style.background = 'linear-gradient(90deg,#3E9B4F 33%,#E7C744 33% 66%,#C0392B 66%)';
  lab.append(cb, dot, document.createTextNode('Cobertura de salud (5 y 10 km)')); g.append(lab);
  cb.onchange = () => poner(cb.checked);
}
if (document.getElementById('layers')?.children.length) casilla();
else { const ob = new MutationObserver(() => { if (document.getElementById('layers')?.children.length) { ob.disconnect(); casilla(); } }); ob.observe(document.body, { childList: true, subtree: true }); }
window.EMTE_LEYENDA_COBERTURA = () => activa ? [...CL.map(c => ({ nombre: 'Salud a ' + c[2].toLowerCase(), tipo: 'area', color: c[1] })), { nombre: 'Comunidad a más de 5 km de salud', tipo: 'sim', s: '<path d="M0 -8.5L7.8 5.5H-7.8Z" fill="#C0392B" transform="scale(1.2)"/>' }] : [];
});
