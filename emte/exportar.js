/* Exportar a GPS (agregado por BYNS7): GPX (Garmin, OsmAnd, Locus) y KML (Google Earth).
   · Herramientas › «Exportar a GPS»: capas elegidas en un solo archivo.
   · Desde cada ficha (botón GPS), desde la ruta calculada y desde los pendientes de verificar.
   Coordenadas en WGS 84 (grados decimales). */
(function () {
'use strict';
const esc = s => String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
const f6 = n => (+n).toFixed(6);
const hoy = () => new Date().toISOString().slice(0, 10);
const limpio = s => String(s || 'geovisor').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50) || 'geovisor';
function descargar(texto, nombre, tipo) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
  a.download = nombre; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
/* puntos: [{nombre, desc, lat, lon, ele, grupo}] · lineas: [{nombre, desc, coords:[[lon,lat],…], grupo, color}] */
function gpx(titulo, puntos = [], lineas = []) {
  let s = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Geovisor Omasuyos - EMTE" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>${esc(titulo)}</name><desc>Geovisor Omasuyos · Escuela Militar de Topografía del Ejército · WGS 84</desc><time>${new Date().toISOString()}</time></metadata>\n`;
  for (const p of puntos) s += `<wpt lat="${f6(p.lat)}" lon="${f6(p.lon)}">${p.ele != null ? `<ele>${Math.round(p.ele)}</ele>` : ''}<name>${esc(p.nombre)}</name>${p.desc ? `<desc>${esc(p.desc)}</desc>` : ''}${p.grupo ? `<type>${esc(p.grupo)}</type>` : ''}</wpt>\n`;
  for (const l of lineas) s += `<trk><name>${esc(l.nombre)}</name>${l.desc ? `<desc>${esc(l.desc)}</desc>` : ''}${l.grupo ? `<type>${esc(l.grupo)}</type>` : ''}<trkseg>${l.coords.map(c => `<trkpt lat="${f6(c[1])}" lon="${f6(c[0])}"/>`).join('')}</trkseg></trk>\n`;
  return s + '</gpx>\n';
}
function kml(titulo, puntos = [], lineas = []) {
  const grupos = new Map(), add = (g, x) => { if (!grupos.has(g)) grupos.set(g, []); grupos.get(g).push(x); };
  puntos.forEach(p => add(p.grupo || 'Puntos', `<Placemark><name>${esc(p.nombre)}</name>${p.desc ? `<description>${esc(p.desc)}</description>` : ''}<Point><coordinates>${f6(p.lon)},${f6(p.lat)}${p.ele != null ? ',' + Math.round(p.ele) : ''}</coordinates></Point></Placemark>`));
  lineas.forEach(l => { const c = (l.color || '#1F51FF').replace('#', ''); add(l.grupo || 'Líneas', `<Placemark><name>${esc(l.nombre)}</name>${l.desc ? `<description>${esc(l.desc)}</description>` : ''}<Style><LineStyle><color>ff${c.slice(4, 6)}${c.slice(2, 4)}${c.slice(0, 2)}</color><width>3</width></LineStyle></Style><LineString><tessellate>1</tessellate><coordinates>${l.coords.map(q => f6(q[0]) + ',' + f6(q[1])).join(' ')}</coordinates></LineString></Placemark>`); });
  let s = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(titulo)}</name><description>Geovisor Omasuyos · EMTE · WGS 84 · ${hoy()}</description>\n`;
  for (const [g, xs] of grupos) s += `<Folder><name>${esc(g)}</name>\n${xs.join('\n')}\n</Folder>\n`;
  return s + '</Document></kml>\n';
}
function exportar(formato, titulo, puntos, lineas) {
  const nombre = limpio(titulo) + '_' + hoy();
  if (formato === 'kml') descargar(kml(titulo, puntos, lineas), nombre + '.kml', 'application/vnd.google-earth.kml+xml');
  else descargar(gpx(titulo, puntos, lineas), nombre + '.gpx', 'application/gpx+xml');
}
/* botón pequeño con elección GPX / KML */
function botonGPS(etiqueta, obtener, clase) {
  const b = document.createElement('button'); b.type = 'button'; b.className = clase || ''; b.innerHTML = etiqueta;
  b.onclick = e => {
    e.stopPropagation(); const html = b.innerHTML;
    b.innerHTML = '<span style="display:flex;gap:4px;justify-content:center"><u data-f="gpx">GPX</u><u data-f="kml">KML</u></span>';
    b.querySelectorAll('u').forEach(u => { u.style.cssText = 'cursor:pointer;padding:2px 6px;border-radius:4px;background:#0b1f6b;color:#fff;text-decoration:none'; u.onclick = ev => { ev.stopPropagation(); const d = obtener(); if (d) exportar(u.dataset.f, d.titulo, d.puntos, d.lineas); b.innerHTML = html; }; });
    setTimeout(() => { if (b.isConnected && b.querySelector('u')) b.innerHTML = html; }, 6000);
  };
  return b;
}
window.EMTE_EXPORTAR = { gpx, kml, exportar, botonGPS, descargar };

/* ---------- panel «Exportar a GPS» ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const mapa = document.querySelector('.map'); if (!mapa) return;
  const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const cache = {}; const json = u => cache[u] || (cache[u] = fetch(u).then(r => r.ok ? r.json() : null).catch(() => null));
  const titulo = t => String(t || '').toLowerCase().replace(/(^|[\s(/-])([a-záéíóúñü])/g, (m, a, b) => a + b.toUpperCase());
  const CAPAS = [
    ['salud', 'Establecimientos de salud', async () => ({ puntos: (window.healthFeatures || healthFeatures).map(f => ({ nombre: f.properties.nombre, desc: [f.properties.categoria, f.properties.municipio, f.properties.telefono].filter(Boolean).join(' · '), lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], grupo: 'Salud' })) })],
    ['educacion', 'Centros educativos', async () => ({ puntos: educationFeatures.map(f => ({ nombre: f.properties.nombre, desc: [f.properties.tipo, f.properties.rue ? 'RUE ' + f.properties.rue : '', f.properties.municipio_sie].filter(Boolean).join(' · '), lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], grupo: 'Educación' })) })],
    ['comunidades', 'Comunidades y pueblos', async () => { const d = await json('data/planeamiento_apoyo.json'); return { puntos: (d ? d.comunidades : []).map(c => ({ nombre: c[0], desc: c[3] + (c[4] ? ' · ' + c[4] + ' hab.' : ''), lat: c[1], lon: c[2], grupo: 'Comunidades' })) }; }],
    ['cerros', 'Cerros, abras y cotas', async () => { const d = await json('data/cerros_omasuyos.geojson'); return { puntos: (d ? d.features : []).map(f => ({ nombre: f.properties.nombre || 'Cota ' + f.properties.altitud, desc: f.properties.tipo + ' · ' + f.properties.altitud + ' m', ele: f.properties.altitud, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], grupo: 'Cerros y cotas' })) }; }],
    ['capitales', 'Capitales municipales', async () => ({ puntos: (window.EMTE_MUNICIPIOS ? window.EMTE_MUNICIPIOS.features : []).map(f => ({ nombre: f.properties.capital, desc: 'Capital del municipio ' + f.properties.nombre, lat: f.properties.cap_ll[1], lon: f.properties.cap_ll[0], ele: f.properties.cap_alt, grupo: 'Capitales' })) })],
    ['carreteras', 'Carreteras y caminos principales', async () => ({ lineas: roadFeatures.filter(f => /Carretera|secundario/i.test(f.properties.tipo_via)).flatMap(f => f.geometry.coordinates.map(c => ({ nombre: f.properties.nombre || f.properties.tipo_via, desc: [f.properties.tipo_via, f.properties.superficie, f.properties.estado].filter(Boolean).join(' · '), coords: c, grupo: 'Vías principales', color: /RVF/.test(f.properties.tipo_via) ? '#C62828' : '#E67E22' }))) })],
    ['limites', 'Límites municipales (referencial)', async () => ({ lineas: (window.EMTE_MUNICIPIOS ? window.EMTE_MUNICIPIOS.features : []).flatMap(f => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).map(p => ({ nombre: 'Límite ' + f.properties.nombre, desc: 'Trazo referencial', coords: p[0], grupo: 'Límites municipales', color: f.properties.color }))) })],
    ['legales', 'Límites legales (puntos de ley)', async () => { const d = await json('data/limites_legales_omasuyos.geojson'); const fs = d ? d.features : []; return { puntos: fs.filter(f => f.properties.tipo === 'vertice').map(f => ({ nombre: f.properties.punto + ' ' + f.properties.municipio, desc: (f.properties.lugar || '') + ' · ' + f.properties.ley, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], grupo: 'Vértices legales' })), lineas: fs.filter(f => f.properties.tipo === 'limite').map(f => ({ nombre: 'Límite legal ' + f.properties.municipio, desc: f.properties.ley, coords: f.geometry.coordinates, grupo: 'Límites legales', color: '#8E1B1B' })) }; }],
    ['pendientes', 'Pendientes de verificar', async () => { const d = await json('data/pendientes_campo.json'); return { puntos: (d ? d.items : []).map(o => ({ nombre: `[${o.prioridad}] ${o.nombre || o.capa + ' ' + o.codigo}`, desc: o.problema + ' · ' + o.accion, lat: o.lat, lon: o.lon, grupo: 'Pendientes ' + o.prioridad })) }; }]
  ];
  const panel = h('section', 'rp-panel'); panel.hidden = true; panel.style.width = 'min(460px,calc(100% - 24px))';
  panel.innerHTML = `<div class="rp-cab"><b>EXPORTAR A GPS (GPX / KML)</b><button type="button" class="ex-x" aria-label="Cerrar">×</button></div>
<div style="padding:8px 12px;display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;font-size:12px">${CAPAS.map(([k, n]) => `<label style="display:flex;gap:6px;align-items:center;padding:2px 0;border:0;font-size:12px"><input type="checkbox" value="${k}" ${['salud', 'educacion', 'capitales'].includes(k) ? 'checked' : ''}>${n}</label>`).join('')}</div>
<div class="rp-op"><label><input type="radio" name="ex-f" value="gpx" checked style="width:auto"> GPX (GPS Garmin, OsmAnd)</label><label><input type="radio" name="ex-f" value="kml" style="width:auto"> KML (Google Earth)</label><button type="button" class="rp-nuevo ex-ok">⤓ DESCARGAR</button></div>
<p class="rp-nota ex-msg">Coordenadas WGS 84. Los límites se exportan como líneas (tracks en GPX).</p>`;
  mapa.append(panel);
  for (const t of ['pointerdown', 'click', 'wheel', 'dblclick']) panel.addEventListener(t, e => e.stopPropagation());
  panel.querySelector('.ex-x').onclick = () => { panel.hidden = true; tarj && tarj.classList.remove('chosen'); };
  panel.querySelector('.ex-ok').onclick = async () => {
    const sel = [...panel.querySelectorAll('input[type=checkbox]:checked')].map(i => i.value), msg = panel.querySelector('.ex-msg');
    if (!sel.length) { msg.textContent = 'Elige al menos una capa.'; return; }
    msg.textContent = 'Preparando…'; const P = [], L = [];
    for (const [k, , fn] of CAPAS) if (sel.includes(k)) { try { const r = await fn(); P.push(...(r.puntos || [])); L.push(...(r.lineas || [])); } catch (e) {} }
    const f = panel.querySelector('input[name=ex-f]:checked').value;
    exportar(f, 'Geovisor Omasuyos ' + sel.join(' '), P.filter(p => p.lat != null && p.lon != null), L);
    msg.textContent = `✔ ${P.length} puntos y ${L.length} líneas exportados en ${f.toUpperCase()}.`;
  };
  const menuHerr = [...document.querySelectorAll('main>aside details')].find(d => (d.querySelector('summary')?.textContent || '').trim().startsWith('Herramientas'));
  const grilla = menuHerr && menuHerr.querySelector('.visual-tools-grid');
  const tarj = h('button', 'visual-card'); tarj.type = 'button';
  tarj.innerHTML = '<span class="tool-picture"><svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#eef1f8"/><rect x="18" y="8" width="28" height="44" rx="5" fill="#12294A"/><rect x="22" y="13" width="20" height="22" rx="2" fill="#9fd0a8"/><path d="M26 30l5-8 4 5 3-3" fill="none" stroke="#12294A" stroke-width="2"/><circle cx="32" cy="44" r="3" fill="#B79A5B"/><path d="M50 40v14M44 49l6 6 6-6" fill="none" stroke="#C0392B" stroke-width="3" stroke-linecap="round"/></svg></span><span>⤓ Exportar a GPS</span>';
  tarj.onclick = () => { panel.hidden = !panel.hidden; tarj.classList.toggle('chosen', !panel.hidden); };
  (grilla || document.querySelector('main>aside'))?.append(tarj);
});
})();
