// Límites municipales y provincial de Omasuyos (agregado por BYNS7).
// Cada municipio con su color, nombre en el mapa y ficha con su norma legal de creación y colindancias.
// Límite provincial: línea continua gruesa; municipal: línea de trazos.
// Datos: data/municipios_omasuyos.geojson (geometría OpenStreetMap, referencial; datos legales de las leyes de creación).
document.addEventListener('DOMContentLoaded', () => {
'use strict';
const mapa = document.querySelector('.map'), scene = document.getElementById('scene');
if (!mapa || !scene) return;
const svgMapa = scene.ownerSVGElement, NS = 'http://www.w3.org/2000/svg';
const K = 65759.1401421867, OX = 1.199706713376768, OY = 0.2830464015276702, D2R = Math.PI / 180;
const aEscena = (lon, lat) => [500 + (lon * D2R + OX) * K, 380 - (Math.log(Math.tan(Math.PI / 4 + lat * D2R / 2)) + OY) * K];
const el = (par, tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) if (at[k] != null) e.setAttribute(k, at[k]); if (par) par.append(e); return e; };
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const miles = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const dec = (n, d = 1) => n.toFixed(d).replace('.', ',');

const css = h('style');
css.textContent = `
#topo-municipios .mu-area{cursor:pointer;transition:fill-opacity .15s}
#topo-municipios .mu-area:hover{fill-opacity:.42}
#topo-municipios text{pointer-events:none}
.mu-ficha .mu-cab{display:flex;align-items:center;gap:10px;margin:2px 0 8px}
.mu-ficha .mu-sw{width:16px;height:16px;border-radius:3px;flex:none;border:1.5px solid}
.mu-ficha .mu-sec{font:600 10.5px var(--tipo-titulo,system-ui);letter-spacing:.08em;text-transform:uppercase;color:#5A6B80}
.mu-ficha table{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0;border:1px solid #E3E8EF}
.mu-ficha th{width:38%;text-align:left;padding:5px 8px;background:#F4F6F9;color:#5A6B80;font:600 10.5px var(--tipo-titulo,system-ui);letter-spacing:.06em;text-transform:uppercase;border-top:1px solid #E3E8EF;vertical-align:top}
.mu-ficha td{padding:5px 8px;border-top:1px solid #E3E8EF;color:#14233A}
.mu-ficha h4{margin:10px 0 4px;font:700 10.5px var(--tipo-titulo,system-ui);letter-spacing:.12em;color:#12294A;text-transform:uppercase}
.mu-ficha .mu-ley{padding:8px 10px;border-left:3px solid #12294A;background:#EEF2F8;font-size:12px;line-height:1.45}
.mu-ficha .mu-ley a{display:inline-block;margin-top:4px;font-weight:700;color:#12294A}
.mu-ficha .mu-nota{margin-top:8px;padding:7px 9px;border-left:3px solid #B79A5B;background:#F8F6F0;font-size:11px;color:#5A5040;line-height:1.45}
.mu-ficha table.mu-lim th{width:64px;color:#12294A;font-weight:700}
.mu-ficha table.mu-lim td{font-weight:600;color:#14233A}
.mu-ficha .mu-fuente{margin-top:8px;padding:7px 10px;border-left:3px solid #12294A;background:#EEF2F8;font-size:11.5px;line-height:1.45}
.mu-ficha .mu-fuente a{font-weight:700;color:#12294A}
.mu-ficha .mu-hero{display:flex;gap:12px;align-items:center;margin:4px 0 10px;padding:10px;border-radius:9px;background:linear-gradient(135deg,#0B1D33,#1C3A5E);color:#fff}
.mu-ficha .mu-esc{width:78px;height:88px;flex:none;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:8px;padding:4px;box-shadow:0 0 0 2px #B79A5B}
.mu-ficha .mu-esc img,.mu-ficha .mu-esc svg{max-width:100%;max-height:100%}
.mu-ficha .mu-hero h3{margin:0;color:#fff;font:700 19px var(--tipo-titulo,system-ui);letter-spacing:.04em}
.mu-ficha .mu-hero .mu-sec{color:#D9C08A}
.mu-ficha .mu-hero small{display:block;margin-top:3px;font-size:10.5px;color:#C9D3E0}
.mu-ficha .mu-kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#D7DEE8;border:1px solid #D7DEE8;border-radius:7px;overflow:hidden;margin-bottom:4px}
.mu-ficha .mu-kpi div{background:#fff;padding:7px 4px;text-align:center}
.mu-ficha .mu-kpi b{display:block;font:700 15px var(--tipo-titulo,system-ui);color:#12294A}
.mu-ficha .mu-kpi span{font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:#5A6B80}
.mu-ficha .mu-src{margin:8px 0 0;font-size:10px;color:#6b7187;text-align:center;line-height:1.5}
#topo-capitales g{cursor:pointer}
.fs-fig{gap:14px;align-items:center}.fs-fig .mu-bandera{height:56px!important;border:1px solid #cfd6e6;border-radius:3px}`;
document.head.append(css);

const g = el(null, 'g', { id: 'topo-municipios' }), gEt = el(null, 'g', { id: 'topo-municipios-nombres', class: 'mu-etq', style: 'pointer-events:none' });
let DATA = null, activa = true;
try { activa = localStorage.getItem('emte-municipios') !== '0'; } catch (e) {}
const ruta = geom => (geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates).map(pol => pol.map(r => 'M' + r.map(([lo, la]) => aEscena(lo, la).map(v => v.toFixed(2)).join(' ')).join('L') + 'Z').join('')).join('');

function construir() {
  g.replaceChildren();
  const areas = el(g, 'g', {}), lineas = el(g, 'g', {}), prov = el(g, 'g', {});
  for (const f of DATA.features) {
    const p = f.properties, d = ruta(f.geometry);
    const a = el(areas, 'path', { class: 'mu-area', d, fill: p.color, 'fill-opacity': .27, 'fill-rule': 'evenodd', stroke: 'none' });
    el(a, 'title', {}).textContent = `Municipio ${p.nombre} · límites: ${p.fuente_lim}`;
    a.addEventListener('pointerdown', e => { a._x = e.clientX; a._y = e.clientY; });
    a.addEventListener('click', e => { if (a._x != null && Math.hypot(e.clientX - a._x, e.clientY - a._y) > 5) return; ficha(f); });
    // límite municipal: halo blanco + trazos del color del municipio oscurecido
    el(lineas, 'path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 3.6, 'stroke-opacity': .85, 'vector-effect': 'non-scaling-stroke' });
    el(lineas, 'path', { d, fill: 'none', stroke: oscuro(p.color), 'stroke-width': 1.6, 'stroke-dasharray': '7 4', 'vector-effect': 'non-scaling-stroke' });
  }
  // límite provincial: trazo y punto, más grueso
  const lim = document.getElementById('bounds');
  if (lim && lim.getAttribute('d')) {
    el(prov, 'path', { d: lim.getAttribute('d'), fill: 'none', stroke: '#fff', 'stroke-width': 6, 'stroke-opacity': .9, 'vector-effect': 'non-scaling-stroke' });
    el(prov, 'path', { d: lim.getAttribute('d'), fill: 'none', stroke: '#0B1D33', 'stroke-width': 2.8, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' });
  }
  etiquetas();
}
function oscuro(hex) { const n = parseInt(hex.slice(1), 16), f = .62; return '#' + [n >> 16, n >> 8 & 255, n & 255].map(v => Math.round(v * f).toString(16).padStart(2, '0')).join(''); }
function etiquetas() {
  const e = gEt; if (!DATA) return; e.replaceChildren();
  const f = 1 / scale, grande = scale < 1.6;
  for (const ft of DATA.features) {
    const p = ft.properties, [x, y] = aEscena(...p.etiqueta);
    if (grande && p.area_km2 < 40) continue;   // a escala chica solo los municipios grandes
    const t = el(e, 'text', { x, y, 'text-anchor': 'middle', 'font-family': 'Bahnschrift,system-ui,sans-serif', 'font-size': grande ? 13 : 15, 'font-weight': 700, 'letter-spacing': '.16em', fill: oscuro(p.color), stroke: '#fff', 'stroke-width': 4, 'stroke-linejoin': 'round', 'paint-order': 'stroke', transform: `translate(${x} ${y}) scale(${f}) translate(${-x} ${-y})` });
    t.textContent = p.nombre.toUpperCase();
    if (!grande) { const s = el(e, 'text', { x, y: y + 15, 'text-anchor': 'middle', 'font-family': 'Segoe UI,system-ui,sans-serif', 'font-size': 10, 'font-weight': 600, fill: '#3A4A60', stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke', transform: `translate(${x} ${y}) scale(${f}) translate(${-x} ${-y})` }); s.textContent = `${miles(p.pob)} hab. · ${p.sup_oficial || p.sup_legal || dec(p.area_km2) + ' km²'}`; }
  }
}
function colocar() {
  if (!activa) { g.remove(); gEt.remove(); gCap.remove(); gLeg.remove(); gLegP.remove(); const b = document.getElementById('bounds'); if (b) b.style.display = ''; return; }
  const ref = document.getElementById('water') || document.getElementById('rivers');
  if (ref && ref.parentNode === scene) scene.insertBefore(g, ref); else { const b = document.getElementById('basemap'); b ? b.after(g) : scene.prepend(g); }
  const cur = document.getElementById('topo-curvas'); if (cur && cur.isConnected) cur.after(g);
  const b = document.getElementById('bounds'); if (b) b.style.display = 'none';   // el límite provincial se dibuja en esta capa
  scene.append(gEt);   // los nombres van encima de todos los símbolos
  capitales(); scene.append(gCap);
  dibujarLegal();
}
function cargar() {
  if (DATA) { construir(); colocar(); return; }
  fetch('data/municipios_omasuyos.geojson').then(r => r.json()).then(d => { DATA = d; window.EMTE_MUNICIPIOS = d; construir(); colocar(); document.getElementById('layers')?.dispatchEvent(new Event('change', { bubbles: true })); }).catch(() => {});
}

/* ---------- datos del municipio a partir de las capas del geovisor ---------- */
function dentro(pt, geom) {
  const [x, y] = pt, pols = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; let r = false;
  for (const pol of pols) for (const ring of pol) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) r = !r;
  }
  return r;
}
const kmLinea = l => { let s = 0; for (let i = 1; i < l.length; i++) { const [a, b] = [l[i - 1], l[i]], R = 6371.0088, dl = (b[1] - a[1]) * D2R, dn = (b[0] - a[0]) * D2R; const q = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.sin(dn / 2) ** 2; s += 2 * R * Math.asin(Math.sqrt(q)); } return s; };
let COM = null; fetch('data/planeamiento_apoyo.json').then(r => r.ok ? r.json() : null).then(d => { COM = d && d.comunidades; }).catch(() => {});
const RESUMEN = new Map();
function resumen(f) {
  if (RESUMEN.has(f)) return RESUMEN.get(f);
  const G = f.geometry, en = c => c && dentro(c, G), r = {};
  try {
    const edu = (typeof educationFeatures !== 'undefined' ? educationFeatures : []).filter(x => en(x.geometry && x.geometry.coordinates));
    r.edu = edu.length; r.est = edu.reduce((s, x) => s + (+x.properties.est_2025 || 0), 0);
    const sal = (typeof healthFeatures !== 'undefined' ? healthFeatures : []).filter(x => en(x.geometry && x.geometry.coordinates));
    r.sal = sal.length; const cat = new Map(); sal.forEach(x => { const k = String(x.properties.categoria || 'Otro'); cat.set(k, (cat.get(k) || 0) + 1); }); r.salCat = [...cat].sort((a, b) => b[1] - a[1]);
    let tot = 0, car = 0;
    (typeof roadFeatures !== 'undefined' ? roadFeatures : []).forEach(x => { const ls = x.geometry && x.geometry.coordinates; if (!ls) return; for (const l of ls) { const m = l[Math.floor(l.length / 2)]; if (!en(m)) continue; const k = kmLinea(l); tot += k; if (/Carretera|secundario/i.test(x.properties.tipo_via)) car += k; } });
    r.vias = tot; r.carr = car;
    if (COM) { const cm = COM.filter(c => en([c[2], c[1]])); r.com = cm.length; r.pue = cm.filter(c => c[3] === 'Pueblo').length; }
  } catch (e) {}
  if (r.edu || r.sal) RESUMEN.set(f, r);
  return r;
}
function escudoSvg(p) {
  const ini = p.nombre.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').slice(0, 3);
  return `<svg viewBox="0 0 60 70"><path d="M5 4h50v28c0 18-12 28-25 34C17 60 5 50 5 32z" fill="${p.color}" fill-opacity=".25" stroke="${oscuro(p.color)}" stroke-width="2.5"/><path d="M11 10h38v22c0 14-9 22-19 27-10-5-19-13-19-27z" fill="none" stroke="#B79A5B" stroke-width="1.2"/><text x="30" y="38" text-anchor="middle" font-family="Bahnschrift,system-ui" font-weight="700" font-size="16" fill="${oscuro(p.color)}">${ini}</text></svg>`;
}

function ficha(f) {
  const F = window.EMTE_FICHA, p = f.properties; if (!F) return;
  const info = F.abrir('FICHA DE MUNICIPIO', p.nombre, p.seccion + ' · Provincia Omasuyos', p.cap_ll); if (!info) return;
  // Escudo y bandera
  const fig = F.el('div', 'fs-fig');
  if (p.escudo) { const im = F.el('img'); im.src = p.escudo; im.alt = 'Escudo de ' + p.nombre; im.title = 'Escudo oficial · ' + (p.escudo_fuente || ''); im.onerror = () => { im.replaceWith(Object.assign(F.el('span'), { innerHTML: escudoSvg(p) })); }; fig.append(im); }
  else { const sp = F.el('span'); sp.innerHTML = escudoSvg(p); sp.title = 'Escudo oficial no publicado en línea'; fig.append(sp); }
  if (p.bandera) { const bi = F.el('img', 'mu-bandera'); bi.src = p.bandera; bi.alt = 'Bandera de ' + p.nombre; bi.title = 'Bandera del municipio (Wikimedia Commons, CC0)'; fig.append(bi); }
  info.append(fig);
  const sup = p.sup_oficial ? parseFloat(p.sup_oficial.replace('.', '').replace(',', '.')) : p.sup_legal ? parseFloat(p.sup_legal.replace(',', '.')) : p.area_km2;
  const rk = ranking(f);
  F.poner(info, F.chips([['✔ ' + miles(p.pob) + ' HABITANTES', 'si'], [dec(sup) + ' KM²', 'no'], [dec(p.pob / sup) + ' HAB./KM²', 'no'], [p.nombre === 'Achacachi' ? '★ CAPITAL DE PROVINCIA' : null, 'med'], [LEG && LEG.has(p.nombre) ? '✔ LÍMITE LEGAL DIGITALIZADO' : null, 'si']]));
  const [lo, la] = p.cap_ll || [];
  const ub = F.ubicacion(lo, la).filter(r => !/Latitud/.test(r[0]));
  if (p.cap_alt) ub.forEach(r => { if (r[0] === 'Altitud' && (r[1] == null || r[1] instanceof Node)) r[1] = miles(p.cap_alt) + ' m s.n.m.'; });
  const r = resumen(f), km = v => v ? miles(v) + ' km' : null;
  const lim = F.el('a', null, p.fuente_lim); lim.href = p.url_lim; lim.target = '_blank'; lim.rel = 'noopener';
  const pct = (a, t) => (a / t * 100).toFixed(1).replace('.', ',') + ' %';
  const lg = LEG && LEG.get(p.nombre);
  F.poner(info,
    F.bloque('1. IDENTIFICACIÓN', [['Municipio', p.nombre], ['Sección', p.seccion], ['Provincia', 'Omasuyos · La Paz'], ['Código INE', p.ine], ['Creación', p.creacion]]),
    F.bloque('2. POBLACIÓN (CENSO 2024)', [
      ['Población total', miles(p.pob) + ' habitantes', p.pob_fuente],
      ['Hombres', p.pob_h ? `${miles(p.pob_h)} (${pct(p.pob_h, p.pob)})` : null],
      ['Mujeres', p.pob_m ? `${miles(p.pob_m)} (${pct(p.pob_m, p.pob)})` : null],
      ['Área urbana', p.pob_urb ? `${miles(p.pob_urb)} (${pct(p.pob_urb, p.pob)})` : null],
      ['Área rural', p.pob_rur ? `${miles(p.pob_rur)} (${pct(p.pob_rur, p.pob)})` : null],
      ['Comunidades y pueblos', r.com ? String(r.com) : null]]),
    F.bloque('3. TERRITORIO', [
      ['Superficie', p.sup_oficial ? p.sup_oficial : p.sup_legal ? p.sup_legal : dec(p.area_km2) + ' km²', p.sup_oficial ? p.fuente_lim : p.sup_legal ? 'cálculo con los puntos de la ' + p.fuente_lim.replace(/ de \d.*$/, '') : 'cálculo sobre el límite referencial del mapa'],
      ['Densidad', dec(p.pob / sup) + ' hab./km²']]),
    F.bloque('4. COMPARACIÓN EN LA PROVINCIA (6 MUNICIPIOS)', [['Población', rk.pob + '.º lugar'], ['Superficie', rk.sup + '.º lugar'], ['Densidad', rk.den + '.º lugar'], ['Participación en la población', pct(p.pob, rk.tot)]]),
    F.bloque('5. CAPITAL', [['Capital', p.capital], ...ub]),
    F.bloque('6. LÍMITES', [['Norte', p.lim.Norte], ['Sur', p.lim.Sur], ['Este', p.lim.Este], ['Oeste', p.lim.Oeste], ['Fuente oficial', lim],
      ['Límite legal en el mapa', lg ? `Sí · ${lg.puntos} puntos de la ley (${lg.datum})` + (lg.area_ha ? ` · ${dec(lg.area_ha / 100, 2)} km², perímetro ${dec(lg.perimetro_km, 2)} km` + (lg.area_ley_ha ? ` (la ley indica ${miles(lg.area_ley_ha)} ha)` : '') : '') : 'No · la norma no publica coordenadas; se muestra el trazo referencial']]),
    F.bloque('7. SERVICIOS E INFRAESTRUCTURA', [
      ['Centros educativos', r.edu ? `${r.edu}${r.est ? ' · ' + miles(r.est) + ' estudiantes (2025)' : ''}` : null],
      ['Establecimientos de salud', r.sal ? String(r.sal) : null],
      ...(r.salCat || []).slice(0, 4).map(([kk, v]) => ['· ' + kk.toLowerCase(), String(v)]),
      ['Red vial', km(r.vias)], ['Carreteras y caminos secundarios', km(r.carr)]]));
  info.append(F.pie('FUENTES: INE CENSO 2024 · MIN. EDUCACIÓN – SIE · MIN. SALUD – SNIS · ABC / OSM' + (p.escudo_fuente ? ' · ESCUDO: GAM DE ACHACACHI' : '') + (p.bandera ? ' · BANDERA: WIKIMEDIA COMMONS' : '')));
}
function ranking(f) {
  const L = DATA.features.map(x => { const p = x.properties, s = p.sup_oficial ? parseFloat(p.sup_oficial.replace('.', '').replace(',', '.')) : p.sup_legal ? parseFloat(p.sup_legal.replace(',', '.')) : p.area_km2; return { f: x, pob: p.pob, sup: s, den: p.pob / s }; });
  const pos = k => [...L].sort((a, b) => b[k] - a[k]).findIndex(x => x.f === f) + 1;
  return { pob: pos('pob'), sup: pos('sup'), den: pos('den'), tot: L.reduce((t, x) => t + x.pob, 0) };
}

/* ---------- límites legales digitalizados (puntos de las leyes) ---------- */
const gLeg = el(null, 'g', { id: 'topo-limites-legales' }), gLegP = el(null, 'g', { id: 'topo-limites-legales-puntos' });
let LEGD = null, LEG = null, legActiva = true;
try { legActiva = localStorage.getItem('emte-limites-legales') !== '0'; } catch (e) {}
const ROJO = '#8E1B1B';
fetch('data/limites_legales_omasuyos.geojson').then(r => r.ok ? r.json() : null).then(d => {
  if (!d) return; LEGD = d; LEG = new Map();
  d.features.filter(x => x.properties.tipo === 'limite').forEach(x => { const p = x.properties, o = LEG.get(p.municipio) || { puntos: 0, datum: p.datum.split(' (')[0] }; o.puntos += p.puntos; if (p.area_ha) { o.area_ha = p.area_ha; o.perimetro_km = p.perimetro_km; o.area_ley_ha = p.area_ley_ha; } LEG.set(p.municipio, o); });
  dibujarLegal(); casillaLegal();
}).catch(() => {});
function dibujarLegal() {
  gLeg.replaceChildren(); gLegP.replaceChildren();
  if (!LEGD || !legActiva || !activa) { gLeg.remove(); gLegP.remove(); return; }
  for (const x of LEGD.features) {
    if (x.properties.tipo !== 'limite') continue;
    const d = 'M' + x.geometry.coordinates.map(([lo, la]) => aEscena(lo, la).map(v => v.toFixed(2)).join(' ')).join('L');
    el(gLeg, 'path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-opacity': .9, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' });
    el(gLeg, 'path', { d, fill: 'none', stroke: ROJO, 'stroke-width': 2.3, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' });
  }
  puntosLegal();
  g.after(gLeg); scene.append(gLegP); if (gCap.isConnected) scene.append(gCap);
}
function puntosLegal() {
  gLegP.replaceChildren(); if (!LEGD || scale < 1.6) return;
  const k = 1 / scale, conNum = scale >= 5;
  for (const x of LEGD.features) {
    if (x.properties.tipo !== 'vertice') continue;
    const [px, py] = aEscena(...x.geometry.coordinates);
    const v = el(gLegP, 'g', { transform: `translate(${px} ${py}) scale(${k})`, style: 'cursor:pointer' });
    el(v, 'path', { d: 'M0 -5L5 0 0 5-5 0z', fill: '#fff', stroke: ROJO, 'stroke-width': 1.8 });
    if (conNum) { const t = el(v, 'text', { x: 7, y: -5, 'font-family': 'Bahnschrift,system-ui', 'font-size': 10, 'font-weight': 700, fill: ROJO, stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke' }); t.textContent = x.properties.punto; }
    el(v, 'title', {}).textContent = `${x.properties.punto} · ${x.properties.municipio}${x.properties.lugar ? ' · ' + x.properties.lugar : ''}`;
    v.addEventListener('click', e => { e.stopPropagation(); fichaPunto(x); });
  }
}
function fichaPunto(x) {
  const F = window.EMTE_FICHA, p = x.properties; if (!F) return;
  const [lo, la] = x.geometry.coordinates;
  const info = F.abrir('FICHA DE PUNTO DE LÍMITE', `${p.punto} · ${p.municipio}`, 'Vértice del límite legal', [lo, la]); if (!info) return;
  F.poner(info,
    F.bloque('1. IDENTIFICACIÓN', [['Punto', p.punto], ['Lugar', p.lugar], ['Municipio', p.municipio], ['Norma', p.ley]]),
    F.bloque('2. COORDENADAS SEGÚN LA LEY', [['Este', miles(p.este) + ' m'], ['Norte', miles(p.norte) + ' m'], ['Datum de la ley', p.datum + ' · UTM zona 19 Sur']]),
    F.bloque('3. COORDENADAS EN EL GEOVISOR (WGS 84)', F.ubicacion(lo, la)),
    F.pie(p.datum === 'PSAD-56' ? 'COORDENADAS DE LA LEY EN PSAD-56, TRANSFORMADAS A WGS 84 PARA EL MAPA (DIFERENCIA ≈ 370 M).' : 'COORDENADAS DE LA LEY EN WGS 84.'));
}
function casillaLegal() {
  const capas = document.getElementById('layers'); if (!capas || capas.querySelector('.mu-leg-cb')) return;
  const ref = [...capas.querySelectorAll('label')].find(l => /Municipios \(límites/.test(l.textContent)); if (!ref) return;
  const lab = h('label', 'mu-leg-cb'), cb = h('input'), dot = h('span', 'dot sim-dot'); cb.type = 'checkbox'; cb.checked = legActiva;
  dot.innerHTML = `<svg class="sim-ico" viewBox="-11 -11 22 22" width="20" height="20"><path d="M-10 0H10" stroke="#fff" stroke-width="5"/><path d="M-10 0H10" stroke="${ROJO}" stroke-width="2.4"/><path d="M0 -4L4 0 0 4-4 0z" fill="#fff" stroke="${ROJO}" stroke-width="1.5"/></svg>`; dot.dataset.sim = '1';
  lab.append(cb, dot, document.createTextNode('Límites legales (puntos de ley)'));
  ref.after(lab);
  cb.addEventListener('change', () => { legActiva = cb.checked; try { localStorage.setItem('emte-limites-legales', legActiva ? '1' : '0'); } catch (e) {} dibujarLegal(); capas.dispatchEvent(new Event('change', { bubbles: true })); });
}

/* ---------- capitales municipales ---------- */
const gCap = el(null, 'g', { id: 'topo-capitales' });
function simCapital(prov) {
  return prov
    ? '<circle r="11" fill="#fff"/><circle r="9.2" fill="#0B1D33"/><circle r="9.2" fill="none" stroke="#B79A5B" stroke-width="1.6"/><path d="M0 -6.2L1.8 -1.9 6.3 -1.6 2.9 1.3 4 5.7 0 3.3-4 5.7-2.9 1.3-6.3-1.6-1.8-1.9z" fill="#D9C08A"/>'
    : '<circle r="8" fill="#fff"/><circle r="6.6" fill="#0B1D33"/><circle r="3.6" fill="#fff"/><circle r="2" fill="#0B1D33"/>';
}
function capitales() {
  gCap.replaceChildren(); if (!DATA) return;
  const f = 1 / scale, conNombre = scale >= 2.2;
  for (const ft of DATA.features) {
    const p = ft.properties; if (!p.cap_ll) continue;
    const [x, y] = aEscena(...p.cap_ll), prov = p.nombre === 'Achacachi';
    const g1 = el(gCap, 'g', { transform: `translate(${x} ${y}) scale(${f * (prov ? 1.15 : 1)})` });
    g1.innerHTML = simCapital(prov);
    el(g1, 'title', {}).textContent = (prov ? 'Capital de provincia: ' : 'Capital municipal: ') + p.capital;
    if (conNombre || prov) { const t = el(g1, 'text', { x: prov ? 14 : 11, y: 4, 'font-family': 'Bahnschrift,system-ui,sans-serif', 'font-size': prov ? 12 : 11, 'font-weight': 700, 'font-style': 'italic', fill: '#0B1D33', stroke: '#fff', 'stroke-width': 3.2, 'paint-order': 'stroke' }); t.textContent = p.capital; }
    g1.addEventListener('click', e => { e.stopPropagation(); ficha(ft); });
  }
}

/* ---------- casilla en «Capas del mapa» › Límites territoriales ---------- */
function casilla() {
  const capas = document.getElementById('layers'); if (!capas) return;
  const grupo = [...capas.querySelectorAll(':scope > details')].find(d => /Límites/i.test(d.querySelector('summary')?.textContent || '')) || capas;
  const lab = h('label'), cb = h('input'), dot = h('span', 'dot'); cb.type = 'checkbox'; cb.checked = activa;
  dot.style.setProperty('--c', '#4C6A92');
  lab.append(cb, dot, document.createTextNode('Municipios (límites y colores)'));
  grupo.querySelector('summary') ? grupo.querySelector('summary').after(lab) : grupo.prepend(lab);
  cb.addEventListener('change', () => { activa = cb.checked; try { localStorage.setItem('emte-municipios', activa ? '1' : '0'); } catch (e) {} if (activa) cargar(); else colocar(); setTimeout(() => document.getElementById('layers')?.dispatchEvent(new Event('change', { bubbles: true })), 0); });
  if (activa) cargar();
}
if (document.getElementById('layers')?.children.length) casilla();
else { const ob = new MutationObserver(() => { if (document.getElementById('layers')?.children.length) { ob.disconnect(); casilla(); } }); ob.observe(document.body, { childList: true, subtree: true }); }
// el límite provincial original puede cargarse después: se vuelve a copiar
const b0 = document.getElementById('bounds'); if (b0) new MutationObserver(() => { if (DATA && activa) { construir(); colocar(); } }).observe(b0, { attributes: true, attributeFilter: ['d'] });

/* ---------- leyenda (pantalla y PDF) ---------- */
window.EMTE_LEYENDA_MUNICIPIOS = () => (activa && DATA) ? [{ nombre: 'Límite provincial', tipo: 'linea', color: '#0B1D33' }, { nombre: 'Capital de provincia', tipo: 'sim', s: simCapital(true) }, { nombre: 'Capital municipal', tipo: 'sim', s: simCapital(false) }, ...(LEGD && legActiva ? [{ nombre: 'Límite legal (puntos de ley)', tipo: 'sim', s: `<path d="M-10 0H10" stroke="#fff" stroke-width="5"/><path d="M-10 0H10" stroke="${ROJO}" stroke-width="2.4"/><path d="M0 -4L4 0 0 4-4 0z" fill="#fff" stroke="${ROJO}" stroke-width="1.5"/>` }] : []), ...DATA.features.map(f => ({ nombre: 'Municipio ' + f.properties.nombre, tipo: 'area', color: f.properties.color }))] : [];

const zoomAnterior = zoom;
zoom = function (k) { zoomAnterior(k); if (activa && DATA) { clearTimeout(zoom._mu); zoom._mu = setTimeout(() => { etiquetas(); capitales(); if (legActiva && LEGD) puntosLegal(); }, 100); } };
});
