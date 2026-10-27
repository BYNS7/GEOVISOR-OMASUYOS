/* Estadísticas por municipio (agregado por BYNS7).
   Compara los 6 municipios de Omasuyos con las capas del geovisor: población (INE 2024), densidad,
   educación, salud, vías y comunidades lejos de un establecimiento de salud. Gráficos con información
   al pasar el cursor, tabla completa y descarga en CSV. */
document.addEventListener('DOMContentLoaded', () => {
'use strict';
const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const miles = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const dec = (n, d = 1) => (+n).toFixed(d).replace('.', ',');
const AZUL = '#1E5FA8', OCRE = '#C47A12';   // validados (contraste y daltonismo)
const D2R = Math.PI / 180, km = (a, b) => Math.hypot((b[0] - a[0]) * Math.cos(a[1] * D2R), b[1] - a[1]) * 111.195;
const kmL = l => { let s = 0; for (let i = 1; i < l.length; i++) s += km(l[i - 1], l[i]); return s; };
function dentro(pt, geom) {
  const [x, y] = pt, pols = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; let r = false;
  for (const pol of pols) for (const ring of pol) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) r = !r; }
  return r;
}
const css = h('style');
css.textContent = `
.es-fondo{position:fixed;inset:0;z-index:60;background:rgba(11,29,51,.45);display:flex;align-items:flex-start;justify-content:center;padding:28px 12px;overflow:auto}
.es-fondo[hidden]{display:none}
.es-caja{width:min(1080px,100%);background:#fcfcfb;border-radius:12px;box-shadow:0 24px 60px rgba(11,29,51,.35);overflow:hidden;font:12.5px var(--tipo-texto,system-ui);color:#0b0b0b}
.es-cab{display:flex;align-items:center;gap:12px;padding:12px 18px;background:#0B1D33;color:#fff;border-bottom:3px solid #B79A5B}
.es-cab b{flex:1;font:600 15px var(--tipo-titulo,system-ui);letter-spacing:.08em}
.es-cab button{border:1px solid #ffffff55;background:transparent;color:#fff;border-radius:6px;padding:6px 10px;font:600 11px var(--tipo-titulo,system-ui);cursor:pointer}
.es-cab button:hover{background:#B79A5B;border-color:#B79A5B}
.es-cab .es-x{width:30px;height:30px;padding:0;border-radius:50%;font-size:18px}
.es-kpi{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:#e3e8ef;border-bottom:1px solid #e3e8ef}
.es-kpi div{background:#fff;padding:10px 14px}.es-kpi b{display:block;font:700 20px var(--tipo-titulo,system-ui);color:#12294A}
.es-kpi span{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#52514e}
.es-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;padding:14px 18px}
.es-g{background:#fff;border:1px solid #e3e8ef;border-radius:9px;padding:10px 12px 6px}
.es-g h4{margin:0 0 2px;font:700 12px var(--tipo-titulo,system-ui);color:#12294A;letter-spacing:.04em}
.es-g p{margin:0 0 6px;font-size:10.5px;color:#52514e}
.es-g svg{display:block;width:100%;height:auto;overflow:visible}
.es-ley{display:flex;gap:14px;font-size:11px;color:#52514e;margin:0 0 4px}.es-ley i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.es-tab{padding:0 18px 16px}.es-tab table{width:100%;border-collapse:collapse;font-size:11.5px;background:#fff}
.es-tab th{background:#0B1D33;color:#fff;padding:6px 7px;text-align:right;font:600 10.5px var(--tipo-titulo,system-ui);letter-spacing:.04em}
.es-tab th:first-child,.es-tab td:first-child{text-align:left}
.es-tab td{padding:5px 7px;border-bottom:1px solid #eef0f5;text-align:right;font-variant-numeric:tabular-nums}
.es-tab tr.tot td{font-weight:700;background:#F1F4F9}
.es-nota{padding:0 18px 16px;font-size:10.5px;color:#52514e;line-height:1.5}
.es-tip{position:fixed;z-index:70;pointer-events:none;background:#0B1D33;color:#fff;padding:6px 9px;border-radius:6px;font:11.5px var(--tipo-texto,system-ui);box-shadow:0 6px 16px #0004;white-space:nowrap}
.es-tip[hidden]{display:none}
@media(max-width:800px){.es-grid{grid-template-columns:1fr}.es-kpi{grid-template-columns:repeat(2,1fr)}}`;
document.head.append(css);

const fondo = h('div', 'es-fondo'); fondo.hidden = true;
const tip = h('div', 'es-tip'); tip.hidden = true; document.body.append(fondo, tip);
fondo.addEventListener('click', e => { if (e.target === fondo) cerrar(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !fondo.hidden) cerrar(); });
function cerrar() { fondo.hidden = true; tip.hidden = true; }

let COM = null, CACHE = null;
async function calcular() {
  if (CACHE) return CACHE;
  if (!COM) { try { COM = (await (await fetch('data/planeamiento_apoyo.json')).json()).comunidades; } catch (e) { COM = []; } }
  const M = window.EMTE_MUNICIPIOS.features;
  const de = pt => M.findIndex(f => dentro(pt, f.geometry));
  const filas = M.map(f => { const p = f.properties; const sup = p.sup_oficial ? parseFloat(p.sup_oficial.replace('.', '').replace(',', '.')) : p.sup_legal ? parseFloat(p.sup_legal.replace(',', '.')) : p.area_km2;
    return { nombre: p.nombre, ine: p.ine, pob: p.pob, h: p.pob_h || 0, m: p.pob_m || 0, sup, edu: 0, est: 0, sal: 0, salTodos: 0, vias: 0, viasPri: 0, com: 0, lejos: 0, pobLejos: 0 }; });
  const EST = healthFeatures.filter(f => /HOSPITAL|CENTRO DE SALUD|PUESTO/i.test(f.properties.categoria || ''));
  educationFeatures.forEach(f => { const i = de(f.geometry.coordinates); if (i < 0) return; filas[i].edu++; filas[i].est += +f.properties.est_2025 || 0; });
  healthFeatures.forEach(f => { const i = de(f.geometry.coordinates); if (i < 0) return; filas[i].salTodos++; if (EST.includes(f)) filas[i].sal++; });
  roadFeatures.forEach(f => { for (const l of f.geometry.coordinates) { const i = de(l[Math.floor(l.length / 2)]); if (i < 0) continue; const L = kmL(l); filas[i].vias += L; if (/Carretera|secundario|terciario/i.test(f.properties.tipo_via)) filas[i].viasPri += L; } });
  COM.forEach(c => { const pt = [c[2], c[1]], i = de(pt); if (i < 0) return; filas[i].com++; let dm = Infinity; for (const e of EST) { const d = km(pt, e.geometry.coordinates); if (d < dm) dm = d; } if (dm > 5) { filas[i].lejos++; filas[i].pobLejos += +c[4] || 0; } });
  filas.forEach(r => { r.den = r.pob / r.sup; r.habSal = r.sal ? r.pob / r.sal : null; r.estEdu = r.edu ? r.est / r.edu : 0; });
  filas.sort((a, b) => a.ine.localeCompare(b.ine));
  return (CACHE = filas);
}
/* gráfico de barras horizontales: series = [{clave, nombre, color}] (apiladas si hay varias) */
function barras(filas, series, fmt, extra) {
  const W = 480, fila = 30, izq = 118, der = 64, H = filas.length * fila + 8;
  const total = r => series.reduce((s, x) => s + (r[x.clave] || 0), 0), max = Math.max(...filas.map(total)) || 1;
  const esc = v => v / max * (W - izq - der);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
  for (let k = 0; k <= 4; k++) { const x = izq + (W - izq - der) * k / 4; s += `<line x1="${x}" x2="${x}" y1="0" y2="${H - 4}" stroke="#eef0f3" stroke-width="1"/>`; }
  filas.forEach((r, i) => {
    const y = i * fila + 6, hb = fila - 12; let x = izq;
    s += `<text x="${izq - 8}" y="${y + hb / 2 + 4}" text-anchor="end" font-size="11.5" fill="#0b0b0b">${r.nombre}</text>`;
    series.forEach((se, j) => {
      const v = r[se.clave] || 0, w = Math.max(0, esc(v) - (j < series.length - 1 && series.length > 1 ? 2 : 0)), ult = j === series.length - 1;
      const rx = ult ? 4 : 0;
      s += ult && w > 4 ? `<path d="M${x} ${y}h${w - 4}a4 4 0 0 1 4 4v${hb - 8}a4 4 0 0 1-4 4h${-(w - 4)}z" fill="${se.color}" data-t="${r.nombre} · ${se.nombre}: ${fmt(v)}"/>` : `<rect x="${x}" y="${y}" width="${w}" height="${hb}" rx="${rx}" fill="${se.color}" data-t="${r.nombre} · ${se.nombre}: ${fmt(v)}"/>`;
      x += esc(v);
    });
    s += `<rect x="0" y="${y - 5}" width="${W}" height="${fila}" fill="transparent" data-t="${r.nombre} · ${series.map(se => se.nombre + ': ' + fmt(r[se.clave] || 0)).join(' · ')}${extra ? ' · ' + extra(r) : ''}"/>`;
    s += `<text x="${izq + esc(total(r)) + 6}" y="${y + hb / 2 + 4}" font-size="11" font-weight="700" fill="#52514e">${fmt(total(r))}</text>`;
  });
  return s + '</svg>';
}
function grafico(titulo, sub, svg, leyenda) {
  const g = h('div', 'es-g'); g.innerHTML = `<h4>${titulo}</h4><p>${sub}</p>${leyenda ? `<div class="es-ley">${leyenda.map(l => `<span><i style="background:${l[1]}"></i>${l[0]}</span>`).join('')}</div>` : ''}${svg}`;
  g.querySelectorAll('[data-t]').forEach(e => { e.addEventListener('mousemove', ev => { tip.hidden = false; tip.textContent = e.dataset.t; tip.style.left = ev.clientX + 14 + 'px'; tip.style.top = ev.clientY + 12 + 'px'; }); e.addEventListener('mouseleave', () => { tip.hidden = true; }); });
  return g;
}
function csv(filas) {
  const cab = ['Municipio', 'Código INE', 'Población 2024', 'Hombres', 'Mujeres', 'Superficie km²', 'Densidad hab/km²', 'Centros educativos', 'Estudiantes 2025', 'Establecimientos de salud (hosp., centros y puestos)', 'Habitantes por establecimiento', 'Vías total km', 'Carreteras y caminos principales km', 'Comunidades', 'Comunidades a más de 5 km de salud', 'Población de esas comunidades'];
  const n = v => v == null ? '' : String(Math.round(v * 100) / 100).replace('.', ',');
  const L = [cab, ...filas.map(r => [r.nombre, r.ine, r.pob, r.h, r.m, n(r.sup), n(r.den), r.edu, r.est, r.sal, n(r.habSal), n(r.vias), n(r.viasPri), r.com, r.lejos, r.pobLejos])];
  window.EMTE_EXPORTAR ? window.EMTE_EXPORTAR.descargar('﻿' + L.map(f => f.join(';')).join('\r\n'), 'estadisticas_municipios_omasuyos.csv', 'text/csv;charset=utf-8') : null;
}
async function abrir() {
  fondo.hidden = false; fondo.innerHTML = '<div class="es-caja"><div class="es-cab"><b>ESTADÍSTICAS POR MUNICIPIO · PROVINCIA OMASUYOS</b></div><p style="padding:20px">Calculando…</p></div>';
  const listo = () => window.EMTE_MUNICIPIOS && typeof healthFeatures !== 'undefined' && healthFeatures.length && educationFeatures.length && roadFeatures.length;
  for (let i = 0; i < 40 && !listo(); i++) await new Promise(r => setTimeout(r, 250));
  if (!listo()) { fondo.querySelector('p').textContent = 'Las capas aún se están cargando. Intenta de nuevo en unos segundos.'; return; }
  const F = await calcular(), T = k => F.reduce((s, r) => s + (r[k] || 0), 0);
  const caja = h('div', 'es-caja');
  caja.innerHTML = `<div class="es-cab"><b>ESTADÍSTICAS POR MUNICIPIO · PROVINCIA OMASUYOS</b><button type="button" class="es-csv">⤓ CSV / EXCEL</button><button type="button" class="es-x" aria-label="Cerrar">×</button></div>
<div class="es-kpi"><div><b>${miles(T('pob'))}</b><span>Habitantes 2024</span></div><div><b>${miles(T('sup'))} km²</b><span>Superficie</span></div><div><b>${T('edu')}</b><span>Centros educativos</span></div><div><b>${T('sal')}</b><span>Establecimientos de salud</span></div><div><b>${miles(T('vias'))} km</b><span>Red vial</span></div></div>`;
  const grid = h('div', 'es-grid');
  grid.append(
    grafico('Población 2024 por sexo', 'Habitantes · INE, Censo 2024', barras(F, [{ clave: 'h', nombre: 'Hombres', color: AZUL }, { clave: 'm', nombre: 'Mujeres', color: OCRE }], miles), [['Hombres', AZUL], ['Mujeres', OCRE]]),
    grafico('Densidad de población', 'Habitantes por km²', barras(F, [{ clave: 'den', nombre: 'Densidad', color: AZUL }], v => dec(v) + ' hab/km²')),
    grafico('Centros educativos', 'Unidades educativas, CEA, institutos y universidades', barras(F, [{ clave: 'edu', nombre: 'Centros', color: AZUL }], v => miles(v), r => miles(r.est) + ' estudiantes')),
    grafico('Estudiantes 2025', 'Matrícula según el SIE (Ministerio de Educación)', barras(F, [{ clave: 'est', nombre: 'Estudiantes', color: AZUL }], miles, r => dec(r.estEdu, 0) + ' por centro')),
    grafico('Establecimientos de salud', 'Hospital, centros y puestos (sin farmacias ni consultorios)', barras(F, [{ clave: 'sal', nombre: 'Establecimientos', color: AZUL }], miles, r => r.salTodos + ' contando farmacias y consultorios')),
    grafico('Habitantes por establecimiento de salud', 'Menos es mejor', barras(F, [{ clave: 'habSal', nombre: 'Habitantes por establecimiento', color: AZUL }], v => miles(v))),
    grafico('Red vial', 'km de vías · carreteras y caminos principales / resto', barras(F.map(r => Object.assign({}, r, { resto: r.vias - r.viasPri })), [{ clave: 'viasPri', nombre: 'Carreteras y caminos principales', color: AZUL }, { clave: 'resto', nombre: 'Vecinales, calles y sendas', color: OCRE }], v => miles(v) + ' km'), [['Carreteras y caminos principales', AZUL], ['Vecinales, calles y sendas', OCRE]]),
    grafico('Comunidades a más de 5 km de salud', 'Distancia en línea recta al establecimiento más cercano', barras(F, [{ clave: 'lejos', nombre: 'Comunidades', color: AZUL }], v => miles(v), r => miles(r.pobLejos) + ' hab. de ' + r.com + ' comunidades'))
  );
  caja.append(grid);
  const tab = h('div', 'es-tab');
  tab.innerHTML = `<table><thead><tr><th>Municipio</th><th>Población</th><th>Hombres</th><th>Mujeres</th><th>km²</th><th>hab/km²</th><th>Centros educ.</th><th>Estudiantes</th><th>Salud</th><th>hab/estab.</th><th>Vías km</th><th>Comunidades</th><th>A &gt;5 km de salud</th></tr></thead><tbody>${F.map(r => `<tr><td>${r.nombre}</td><td>${miles(r.pob)}</td><td>${miles(r.h)}</td><td>${miles(r.m)}</td><td>${dec(r.sup)}</td><td>${dec(r.den)}</td><td>${r.edu}</td><td>${miles(r.est)}</td><td>${r.sal}</td><td>${r.habSal ? miles(r.habSal) : '—'}</td><td>${miles(r.vias)}</td><td>${r.com}</td><td>${r.lejos}</td></tr>`).join('')}<tr class="tot"><td>Omasuyos</td><td>${miles(T('pob'))}</td><td>${miles(T('h'))}</td><td>${miles(T('m'))}</td><td>${dec(T('sup'))}</td><td>${dec(T('pob') / T('sup'))}</td><td>${T('edu')}</td><td>${miles(T('est'))}</td><td>${T('sal')}</td><td>${miles(T('pob') / T('sal'))}</td><td>${miles(T('vias'))}</td><td>${T('com')}</td><td>${T('lejos')}</td></tr></tbody></table>`;
  caja.append(tab, Object.assign(h('p', 'es-nota'), { textContent: 'Fuentes: población INE Censo 2024 (resultados finales); educación Ministerio de Educación – SIE; salud Ministerio de Salud – SNIS y OpenStreetMap; vías ABC y OpenStreetMap; comunidades OpenStreetMap. Cada elemento se asigna al municipio según el límite del mapa (Huatajata y Chua Cocani: límite legal; el resto: trazo referencial). Superficie oficial cuando existe.' }));
  fondo.replaceChildren(caja);
  caja.querySelector('.es-x').onclick = cerrar; caja.querySelector('.es-csv').onclick = () => csv(F);
}
window.EMTE_ESTADISTICAS = abrir;
// acceso: pestaña en el encabezado y tarjeta en Herramientas
const tabs = document.querySelector('.institution-tabs');
if (tabs) { const b = h('button', null, 'Estadísticas'); b.type = 'button'; b.onclick = abrir; tabs.append(b); }
const menuHerr = [...document.querySelectorAll('main>aside details')].find(d => (d.querySelector('summary')?.textContent || '').trim().startsWith('Herramientas'));
const grilla = menuHerr && menuHerr.querySelector('.visual-tools-grid');
const t = h('button', 'visual-card'); t.type = 'button';
t.innerHTML = '<span class="tool-picture"><svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#eef1f8"/><rect x="12" y="34" width="9" height="18" rx="2" fill="#1E5FA8"/><rect x="27" y="22" width="9" height="30" rx="2" fill="#1E5FA8"/><rect x="42" y="12" width="9" height="40" rx="2" fill="#C47A12"/><path d="M8 54H56" stroke="#12294A" stroke-width="2"/></svg></span><span>▤ Estadísticas</span>';
t.onclick = abrir; (grilla || document.querySelector('main>aside'))?.append(t);
});
