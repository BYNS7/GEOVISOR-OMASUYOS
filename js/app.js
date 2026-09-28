/* =====================================================================
   GEOVISOR SIG · PROVINCIA OMASUYOS · PROYECTO BYNS
   Datos cifrados (AES-256-GCM, clave derivada con PBKDF2-SHA256).
   Réplica web del proyecto QGIS BYNS.qgz: mismas capas, símbolos y fichas.
   ===================================================================== */
(() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esTactil = matchMedia('(hover: none)').matches;
let KEY = null, CFG = null, D = null, map = null;
const CAPAS = {};                 // id -> {m, layer, visible, ...}
const paquetes = {};              // nombre -> Promise(objetos)
let modo = null;                  // herramienta activa

/* ------------------------------------------------------------------ cifrado */
function b64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
async function _noUsada(pw) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(CFG.salt), iterations: CFG.iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
}
async function bajar(nombre) {            // 'p_…' = archivo cifrado (datos militares)
  const r = await fetch('data/' + nombre, { cache: 'no-cache' });
  if (!r.ok) throw new Error('No se pudo descargar ' + nombre);
  const b = new Uint8Array(await r.arrayBuffer());
  if (!nombre.startsWith('p_')) return b;
  if (!KEY) throw new Error('Requiere contraseña');
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, KEY, b.slice(12)));
}
async function gunzip(u8) {
  const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
function desempaquetar(u8) {
  const n = new DataView(u8.buffer, u8.byteOffset, 4).getUint32(0, true);
  const cab = JSON.parse(new TextDecoder().decode(u8.subarray(4, 4 + n)));
  const out = {};
  for (const k in cab) { const [o, l, mime] = cab[k]; out[k] = { bytes: u8.subarray(4 + n + o, 4 + n + o + l), mime }; }
  return out;
}
function paquete(nombre) {
  if (!paquetes[nombre]) paquetes[nombre] = bajar(nombre).then(desempaquetar);
  return paquetes[nombre];
}
const urlObj = {};
async function urlDe(nombreBin, clave) {
  const k = nombreBin + '/' + clave;
  if (!urlObj[k]) { const p = await paquete(nombreBin); const o = p[clave]; urlObj[k] = URL.createObjectURL(new Blob([o.bytes], { type: o.mime })); }
  return urlObj[k];
}

/* ------------------------------------------------------------------ inicio (sin contraseña) */
async function iniciar() {
  const msg = $('#login-msg');
  if (!window.crypto || !crypto.subtle || !window.DecompressionStream) {
    msg.textContent = 'Este navegador es muy antiguo. Use Chrome, Edge, Firefox o Safari actualizados.'; return;
  }
  try {
    CFG = await (await fetch('data/cfg.json', { cache: 'no-cache' })).json();
    D = JSON.parse(new TextDecoder().decode(await gunzip(await bajar('datos.bin'))));
  } catch (e) { msg.style.color = '#b3261e'; msg.textContent = 'No se pudo cargar el geovisor. Recargue la página.'; return; }
  $('#login').hidden = true; $('#app').hidden = false;
  arrancarMapa();
}
$('#btn-salir').onclick = () => location.reload();       // vuelve a bloquear las capas militares

/* ------------------------------------------------------------------ utilidades de estilo (QGIS -> web) */
const MM_PT = 2.8, MM_LN = 2.8;
function rgba(q) {                      // "r,g,b,a,rgb:..." -> css
  if (!q) return 'rgba(0,0,0,0)';
  const p = q.split(',').slice(0, 4).map(Number);
  return `rgba(${p[0]},${p[1]},${p[2]},${(p[3] ?? 255) / 255})`;
}
function alfa(q) { return q ? (Number(q.split(',')[3] ?? 255) / 255) : 0; }
function forma(nombre) {
  switch (nombre) {
    case 'square': return '<rect x="14" y="14" width="72" height="72"/>';
    case 'triangle': return '<polygon points="50,8 93,88 7,88"/>';
    case 'diamond': return '<polygon points="50,4 96,50 50,96 4,50"/>';
    case 'star': return '<polygon points="50,4 61,37 96,37 68,58 79,92 50,71 21,92 32,58 4,37 39,37"/>';
    default: return '<circle cx="50" cy="50" r="42"/>';
  }
}
const cacheIcono = {};
function htmlSimbolo(sym, escala = 1) {
  let max = 0; const capas = [];
  for (const sl of sym.layers) {
    const p = sl.props, tam = Math.max(6, Number(p.size || 3) * MM_PT * escala);
    max = Math.max(max, tam);
    if (sl.type === 'SvgMarker') {
      const txt = D.svgs[p.svg] || '';
      capas.push({ tam, html: `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(txt)}" width="${tam}" height="${tam}">` });
    } else if (sl.type === 'SimpleMarker') {
      const sw = Math.max(0.6, Number(p.outline_width || 0.3) * MM_PT * 100 / tam);
      capas.push({ tam, html: `<svg viewBox="0 0 100 100" width="${tam}" height="${tam}" style="overflow:visible"><g fill="${rgba(p.color)}" stroke="${rgba(p.outline_color)}" stroke-width="${sw}" stroke-linejoin="round">${forma(p.name)}</g></svg>` });
    }
  }
  max = Math.ceil(max);
  const html = capas.map(c => `<div style="position:absolute;left:${(max - c.tam) / 2}px;top:${(max - c.tam) / 2}px;line-height:0">${c.html}</div>`).join('');
  return { html: `<div style="position:relative;width:${max}px;height:${max}px">${html}</div>`, tam: max };
}
function icono(clave, sym) {
  if (!cacheIcono[clave]) {
    const s = htmlSimbolo(sym);
    cacheIcono[clave] = L.divIcon({ className: 'ico-sim', html: s.html, iconSize: [s.tam, s.tam], iconAnchor: [s.tam / 2, s.tam / 2] });
  }
  return cacheIcono[clave];
}
function estiloLinea(sl) {
  const p = sl.props;
  return { color: rgba(p.line_color), weight: Math.max(0.8, Number(p.line_width || 0.26) * MM_LN), opacity: alfa(p.line_color),
    dashArray: p.line_style === 'dash' ? '7 5' : (p.line_style === 'dot' ? '2 4' : null), lineCap: p.capstyle === 'square' ? 'square' : 'round', lineJoin: 'round', fill: false };
}
function estiloRelleno(sl) {
  const p = sl.props, a = alfa(p.color);
  return { fill: a > 0, fillColor: rgba(p.color), fillOpacity: a > 0 ? a * 0.85 : 0, color: rgba(p.outline_color),
    weight: Math.max(0.6, Number(p.outline_width || 0.26) * MM_LN), dashArray: p.outline_style === 'dash' ? '8 5' : null, opacity: alfa(p.outline_color) || 1 };
}
function simboloDe(m, props) {
  const st = m.style;
  if (st.type === 'singleSymbol') return st.symbol;
  if (st.type === 'categorizedSymbol') {
    const v = props[st.attr];
    const c = st.cats.find(c => String(c.value) === String(v)) || st.cats.find(c => c.value === '' || c.value === null);
    return c ? c.symbol : null;
  }
  if (st.type === 'RuleRenderer') {
    for (const r of st.rules) if (evalRegla(r.expr, props)) return r.symbol;
  }
  return null;
}
function evalRegla(expr, p) {          // reglas simples tipo "ELEV" % 250 = 0
  const m = /"([^"]+)"\s*%\s*(\d+)\s*(=|<>)\s*(\d+)/.exec(expr || '');
  if (!m) return true;
  const v = Number(p[m[1]]) % Number(m[2]);
  return m[3] === '=' ? v === Number(m[4]) : v !== Number(m[4]);
}
function etiquetaDe(m, p) {
  const l = m.label; if (!l) return null;
  if (!l.isExpr) return l.field ? p[l.field] : null;
  if (/SIGLA/.test(l.field)) return ['FARM.', 'ODONT.'].includes(p.SIGLA) ? null : p.NOMBRE;
  const campos = [...l.field.matchAll(/"([^"]+)"/g)].map(x => p[x[1]]).filter(Boolean);
  return campos.join('<br>') || null;
}
function zoomDeEscala(esc) {            // escala máxima de QGIS -> zoom de Leaflet
  if (!esc) return 0;
  for (let z = 0; z < 22; z++) if (591657550 * 0.96 / Math.pow(2, z) <= esc) return z;
  return 0;
}

/* ------------------------------------------------------------------ coordenadas UTM (WGS84) */
const WGS = { a: 6378137, f: 1 / 298.257223563 };
function aUTM(lat, lon, zonaFija) {
  const zona = zonaFija || Math.floor((lon + 180) / 6) + 1, k0 = 0.9996, a = WGS.a, e2 = WGS.f * (2 - WGS.f), ep2 = e2 / (1 - e2);
  const lon0 = ((zona - 1) * 6 - 180 + 3) * Math.PI / 180, φ = lat * Math.PI / 180, λ = lon * Math.PI / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(φ) ** 2), T = Math.tan(φ) ** 2, C = ep2 * Math.cos(φ) ** 2, A = Math.cos(φ) * (λ - lon0);
  const M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * φ - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * φ)
    + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * φ) - (35 * e2 ** 3 / 3072) * Math.sin(6 * φ));
  const x = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000;
  let y = k0 * (M + N * Math.tan(φ) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720));
  if (lat < 0) y += 10000000;
  return { x, y, zona };
}
function deUTM(x, y, zona = 19, sur = true) {
  const k0 = 0.9996, a = WGS.a, e2 = WGS.f * (2 - WGS.f), ep2 = e2 / (1 - e2), e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  x -= 500000; if (sur) y -= 10000000;
  const M = y / k0, mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256));
  const φ1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu);
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(φ1) ** 2), T1 = Math.tan(φ1) ** 2, C1 = ep2 * Math.cos(φ1) ** 2;
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(φ1) ** 2, 1.5), Dd = x / (N1 * k0);
  const lat = φ1 - (N1 * Math.tan(φ1) / R1) * (Dd * Dd / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * Dd ** 4 / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * Dd ** 6 / 720);
  const lon = (Dd - (1 + 2 * T1 + C1) * Dd ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * Dd ** 5 / 120) / Math.cos(φ1);
  return [lat * 180 / Math.PI, ((zona - 1) * 6 - 180 + 3) + lon * 180 / Math.PI];
}
function gms(v, pos, neg) {
  const h = v >= 0 ? pos : neg; v = Math.abs(v);
  const g = Math.floor(v), m = Math.floor((v - g) * 60), s = ((v - g) * 60 - m) * 60;
  return `${g}°${String(m).padStart(2, '0')}'${s.toFixed(1).padStart(4, '0')}" ${h}`;
}
const fmt = (n, d = 0) => Number(n).toLocaleString('es-BO', { minimumFractionDigits: d, maximumFractionDigits: d });
function distM(a, b) {
  const R = 6371008.8, r = Math.PI / 180, dφ = (b.lat - a.lat) * r, dλ = (b.lng - a.lng) * r;
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function areaM2(ll) {                   // área de un polígono (UTM de la zona del primer vértice)
  const z = aUTM(ll[0].lat, ll[0].lng).zona, p = ll.map(q => aUTM(q.lat, q.lng, z));
  let s = 0; for (let i = 0; i < p.length; i++) { const j = (i + 1) % p.length; s += p[i].x * p[j].y - p[j].x * p[i].y; }
  return Math.abs(s / 2);
}

/* ------------------------------------------------------------------ elevación (DEM 90 m) */
let DEM = null;
async function cargarDEM() {
  if (DEM) return DEM;
  const p = await paquete('relieve.bin'), r = D.relieve.dem90;
  const b = p.dem90.bytes, buf = new ArrayBuffer(b.length); new Uint8Array(buf).set(b);
  DEM = Object.assign({ z: new Int16Array(buf) }, r);
  return DEM;
}
function altitud(lat, lon) {
  if (!DEM) return null;
  const u = aUTM(lat, lon, 19), c = Math.floor((u.x - DEM.x0) / DEM.dx), f = Math.floor((u.y - DEM.y0) / DEM.dy);
  if (c < 0 || f < 0 || c >= DEM.nx || f >= DEM.ny) return null;
  const z = DEM.z[f * DEM.nx + c]; return z === DEM.nodata ? null : z;
}

/* ================================================================== MAPA */
function arrancarMapa() {
  map = L.map('map', { zoomControl: true, minZoom: 5, maxZoom: 19, doubleClickZoom: true }).setView([-16.03, -68.72], 11);
  map.attributionControl.setPrefix('Geovisor BYNS · Leaflet');
  for (const [n, z] of [['rast', 350], ['pol', 410], ['lin', 420], ['ruta', 460]]) { map.createPane(n).style.zIndex = z; }
  map.getPane('rast').style.pointerEvents = 'none';
  const RENDER = { pol: L.canvas({ pane: 'pol', tolerance: 3 }), lin: L.canvas({ pane: 'lin', tolerance: 6 }), ruta: L.svg({ pane: 'ruta' }) };
  window.__R = RENDER; window.__map = map;

  // ---- mapas base
  const BASES = {
    'Satelital (Esri World Imagery)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics' }),
    'OpenStreetMap': L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© colaboradores de OpenStreetMap' }),
    'Topográfico (OpenTopoMap)': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '© OpenStreetMap, SRTM · estilo © OpenTopoMap' }),
    'Sin mapa base': L.layerGroup()
  };
  let baseActual = BASES['Satelital (Esri World Imagery)'].addTo(map);
  $('#bases').innerHTML = Object.keys(BASES).map((k, i) => `<label class="c-fila"><input type="radio" name="base" value="${k}" ${i === 0 ? 'checked' : ''}> ${k}</label>`).join('');
  $$('#bases input').forEach(r => r.onchange = () => { map.removeLayer(baseActual); baseActual = BASES[r.value].addTo(map); baseActual.bringToBack && baseActual.bringToBack(); });

  L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
  try { new L.Control.MiniMap(L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png'), { toggleDisplay: true, position: 'bottomright', width: 140, height: 120, zoomLevelOffset: -5 }).addTo(map); } catch (e) {}
  const Casa = L.Control.extend({ options: { position: 'topleft' }, onAdd() {
    const d = L.DomUtil.create('div', 'leaflet-bar'); d.innerHTML = '<a href="#" title="Vista de toda la provincia" style="font-size:16px">⌂</a>';
    L.DomEvent.on(d, 'click', e => { L.DomEvent.stop(e); vistaInicial(); }); return d; } });
  new Casa().addTo(map);

  construirCapas(RENDER);
  construirArbol();
  vistaInicial();
  prepararBusqueda(); prepararTabla(); prepararHerramientas(); prepararInvitar();
  cargarDEM().catch(() => {});

  // coordenadas del cursor
  map.on('mousemove', e => mostrarCoords(e.latlng));
  map.on('click', e => { mostrarCoords(e.latlng); clicMapa(e); });
  map.on('zoomend', actualizarEtiquetas);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { cancelarHerramienta(); ocultarTip(); } });
  $('#btn-panel').onclick = () => { $('#app').classList.toggle('sin-panel'); setTimeout(() => map.invalidateSize(), 250); };
  if (innerWidth < 760) $('#app').classList.add('sin-panel');
  $$('.tabs button').forEach(b => b.onclick = () => {
    $$('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    $$('.tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + b.dataset.tab));
  });
  setTimeout(() => map.invalidateSize(), 100);
}
function vistaInicial() {
  const lim = CAPAS.limite && CAPAS.limite.layer;
  if (lim && lim.getBounds) map.fitBounds(lim.getBounds(), { padding: [20, 20] }); else map.setView([-16.03, -68.72], 11);
}
function mostrarCoords(ll) {
  const u = aUTM(ll.lat, ll.lng), z = altitud(ll.lat, ll.lng);
  $('#coords').innerHTML = `${gms(ll.lat, 'N', 'S')} &nbsp; ${gms(ll.lng, 'E', 'O')} &nbsp;|&nbsp; UTM ${u.zona}S E ${fmt(u.x)} N ${fmt(u.y)}` + (z !== null ? ` &nbsp;|&nbsp; ${fmt(z)} m s.n.m.` : '');
}

/* ------------------------------------------------------------------ capas vectoriales */
function construirCapas(R) {
  for (const m of D.meta) {
    const data = D.capas[m.id], c = { m, data, visible: !!m.visible, opac: 1, etiquetas: [] };
    CAPAS[m.id] = c;
    if (!data) { c.protegida = true; c.visible = false; continue; }   // capa militar: requiere contraseña otra vez
    crearVector(c, R);
    if (c.visible) mostrarCapa(c, true);
  }
  // capas raster (cifradas, se descargan al activarlas)
  CAPAS.sombreado = { m: { id: 'sombreado', name: 'Sombreado del relieve (DEM 30 m)', group: '07 RELIEVE', geom: 9 }, visible: false, opac: 0.5, raster: 'sombreado' };
  for (const k of Object.keys(D.cartas)) CAPAS['carta_' + k] = { m: { id: 'carta_' + k, name: 'Carta ' + k.replace(/_/g, ' '), group: '08 CARTAS GEO 1:50.000 (IGM)', geom: 9 }, visible: false, opac: 1, raster: k };
  actualizarEtiquetas();
}
function crearVector(c, R) {
    const m = c.m, data = c.data;
    if (m.geom === 0) {                          // puntos
      const g = L.featureGroup();
      data.features.forEach((f, i) => {
        if (!f.geometry) return;
        const coords = f.geometry.type === 'MultiPoint' ? f.geometry.coordinates : [f.geometry.coordinates];
        const sym = simboloDe(m, f.properties); if (!sym) return;
        const clave = m.id + '|' + (m.style.attr ? f.properties[m.style.attr] : '');
        for (const xy of coords) {
          const mk = L.marker([xy[1], xy[0]], { icon: icono(clave, sym), riseOnHover: true, keyboard: false });
          mk._f = f; mk._c = c; eventos(mk, c, f); g.addLayer(mk);
          const t = etiquetaDe(m, f.properties);
          if (t) { mk.bindTooltip(String(t), { permanent: true, direction: 'right', offset: [8, 0], className: 'etq' }); c.etiquetas.push(mk); mk._colorEt = m.label.color; }
        }
      });
      c.layer = g; c.minZoomEt = zoomDeEscala(m.label && m.label.maxScale);
    } else {                                     // líneas y polígonos
      const esPol = m.geom === 2, rend = esPol ? R.pol : R.lin;
      let pasos = 1;
      data.features.forEach(f => { const s = simboloDe(m, f.properties); if (s) pasos = Math.max(pasos, s.layers.filter(l => /SimpleLine|SimpleFill/.test(l.type)).length); });
      const grupo = L.featureGroup(); c.pasos = [];
      for (let k = 0; k < pasos; k++) {
        const gj = L.geoJSON(null, {
          renderer: rend, interactive: k === pasos - 1 || true,
          filter: f => { const s = simboloDe(m, f.properties); return !!s && s.layers.filter(l => /SimpleLine|SimpleFill/.test(l.type)).length > k; },
          style: f => { const s = simboloDe(m, f.properties), sl = s.layers.filter(l => /SimpleLine|SimpleFill/.test(l.type))[k];
            return sl.type === 'SimpleFill' ? estiloRelleno(sl) : estiloLinea(sl); },
          onEachFeature: (f, lyr) => { lyr._f = f; lyr._c = c; lyr._base = Object.assign({}, lyr.options); eventos(lyr, c, f); }
        });
        gj.addData(data.features);
        grupo.addLayer(gj); c.pasos.push(gj);
      }
      c.layer = grupo;
      if (m.label && m.id === 'cartas_idx') {    // rótulo de hoja al centro de cada carta
        c.rotulos = L.layerGroup(data.features.map(f => {
          const b = L.geoJSON(f).getBounds();
          return L.marker(b.getCenter(), { icon: L.divIcon({ className: '', html: '' }), interactive: false })
            .bindTooltip(etiquetaDe(m, f.properties), { permanent: true, direction: 'center', className: 'etq' });
        }));
      }
    }
}

/* ---- capas militares: segundo control de contraseña y archivo cifrado aparte ---- */
let promDefensa = null;
function pedirClave() {
  return new Promise(res => {
    const md = $('#clave'), inp = $('#clave-pw'), msg = $('#clave-msg');
    md.hidden = false; inp.value = ''; msg.textContent = ''; setTimeout(() => inp.focus(), 50);
    const fin = v => { md.hidden = true; $('#clave-form').onsubmit = null; $('#clave-cancelar').onclick = null; res(v); };
    $('#clave-cancelar').onclick = () => fin(null);
    $('#clave-form').onsubmit = async ev => {
      ev.preventDefault(); msg.style.color = '#1f3b1f'; msg.textContent = 'Verificando…';
      try {
        const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(inp.value.trim()), 'PBKDF2', false, ['deriveKey']);
        KEY = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(CFG.salt2), iterations: CFG.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        const u8 = await bajar('p_defensa.bin');
        fin(JSON.parse(new TextDecoder().decode(await gunzip(u8))));
      } catch (e) { KEY = null; msg.style.color = '#b3261e'; msg.textContent = 'Contraseña incorrecta.'; inp.select(); }
    };
  });
}
function desbloquearDefensa() {
  if (!promDefensa) promDefensa = pedirClave().then(dat => {
    if (!dat) { promDefensa = null; return false; }
    for (const id in dat.capas) { const c = CAPAS[id]; if (!c) continue; c.data = dat.capas[id]; c.protegida = false; crearVector(c, window.__R); }
    $$('.capa .candado').forEach(e => e.remove());
    indexar(Object.keys(dat.capas).map(id => CAPAS[id])); prepararTabla();
    aviso('Capas militares desbloqueadas', 2500);
    return true;
  });
  return promDefensa;
}
async function crearRaster(c) {
  if (c.layer) return c.layer;
  if (c.raster === 'sombreado') {
    const url = await urlDe('relieve.bin', 'sombreado');
    c.layer = L.imageOverlay(url, D.relieve.sombreado.bounds, { pane: 'rast', opacity: c.opac, className: 'sombra' });
  } else {
    const url = await urlDe('cartas.bin', c.raster);
    c.layer = L.imageOverlay(url, D.cartas[c.raster].bounds, { pane: 'rast', opacity: c.opac });
  }
  return c.layer;
}
async function mostrarCapa(c, on) {
  if (c.protegida && on) {
    const ok = await desbloquearDefensa();
    if (!ok) { c.visible = false; const chk = document.querySelector(`[data-id="${c.m.id}"] .c-chk`); if (chk) chk.checked = false; return; }
  }
  c.visible = on;
  if (c.raster && on && !c.layer) {
    const et = document.querySelector(`[data-id="${c.m.id}"] .cargando`); if (et) et.textContent = ' descifrando…';
    try { await crearRaster(c); } catch (e) { aviso('No se pudo cargar ' + c.m.name); return; }
    if (et) et.textContent = '';
    if (!c.visible) return;
  }
  if (!c.layer) return;
  if (on) { c.layer.addTo(map); if (c.rotulos) c.rotulos.addTo(map); } else { map.removeLayer(c.layer); if (c.rotulos) map.removeLayer(c.rotulos); }
  actualizarEtiquetas();
}
function actualizarEtiquetas() {
  const z = map.getZoom();
  for (const c of Object.values(CAPAS)) {
    if (!c.etiquetas || !c.etiquetas.length) continue;
    const ver = c.visible && z >= (c.minZoomEt || 0);
    c.etiquetas.forEach(mk => { const t = mk.getTooltip(); if (!t) return;
      if (ver && map.hasLayer(mk)) { mk.openTooltip(); const el = t.getElement(); if (el) el.style.color = mk._colorEt || '#8b0000'; } else mk.closeTooltip(); });
  }
}
function fijarOpacidad(c, o) {
  c.opac = o;
  if (!c.layer) return;
  if (c.layer.setOpacity) { c.layer.setOpacity(o); return; }
  c.layer.eachLayer(g => {
    if (g.setOpacity) g.setOpacity(o);
    else if (g.eachLayer) g.eachLayer(l => { if (l._base) l.setStyle({ opacity: (l._base.opacity ?? 1) * o, fillOpacity: (l._base.fillOpacity ?? 0) * o }); });
  });
}
function limites(c) {
  try { const b = c.layer.getBounds(); return b.isValid() ? b : null; } catch (e) { return null; }
}

/* ------------------------------------------------------------------ fichas (map tips) */
function htmlFicha(c, f) {
  if (f.h !== null && f.h !== undefined && c.data.html[f.h]) return c.data.html[f.h];
  const al = c.m.aliases || {};
  const filas = Object.entries(f.properties).filter(([k, v]) => v !== null && v !== '' && !/^(fid|popup)$/i.test(k))
    .map(([k, v]) => `<tr><th>${(al[k] || k).toUpperCase()}</th><td>${v}</td></tr>`).join('');
  return `<div class="gen"><b style="color:#1f3b1f">${c.m.name}</b><table>${filas}</table></div>`;
}
async function hidratar(el) {
  for (const img of el.querySelectorAll('img[data-foto]')) {
    const fid = img.dataset.foto, n = D.fotos[fid];
    if (n === undefined) continue;
    img.style.opacity = .35;
    urlDe(n, fid).then(u => { img.src = u; img.style.opacity = 1; }).catch(() => {});
  }
}
const tip = $('#tip');
function mostrarTip(c, f, ev) {
  if (esTactil || modo) return;
  tip.innerHTML = htmlFicha(c, f); tip.hidden = false; hidratar(tip); moverTip(ev);
}
function moverTip(ev) {
  if (tip.hidden) return;
  const e = ev.originalEvent || ev, w = tip.offsetWidth * 1.12, h = tip.offsetHeight * 1.12;
  let x = e.clientX + 18, y = e.clientY + 14;
  if (x + w > innerWidth - 8) x = e.clientX - w - 18;
  if (y + h > innerHeight - 8) y = Math.max(60, innerHeight - h - 8);
  tip.style.left = (x / 1.12) + 'px'; tip.style.top = (y / 1.12) + 'px';
}
function ocultarTip() { tip.hidden = true; }
function abrirFicha(c, f, latlng) {
  ocultarTip();
  const div = document.createElement('div'); div.className = 'ficha'; div.innerHTML = htmlFicha(c, f); hidratar(div);
  L.popup({ maxWidth: 620, minWidth: 240, autoPanPaddingTopLeft: [20, 70] }).setLatLng(latlng).setContent(div).openOn(map);
}
function eventos(lyr, c, f) {
  lyr.on('mouseover', e => { if (c.m.hover) mostrarTip(c, f, e); });
  lyr.on('mousemove', moverTip);
  lyr.on('mouseout', ocultarTip);
  lyr.on('click', e => {
    L.DomEvent.stop(e);
    if (modo && modo !== 'identificar') { clicMapa(e); return; }
    if (modo === 'identificar') { identificar(e.latlng); return; }
    abrirFicha(c, f, e.latlng);
  });
}

/* ------------------------------------------------------------------ árbol de capas + leyenda */
function leyendaSimbolo(sym, geom) {
  if (!sym) return '';
  if (geom === 0) return htmlSimbolo(sym, Math.min(1, 16 / Math.max(...sym.layers.map(l => Number(l.props.size || 3) * MM_PT)))).html;
  const capas = sym.layers.filter(l => /SimpleLine|SimpleFill/.test(l.type));
  if (geom === 1) return `<svg width="26" height="12">${capas.map(l => { const s = estiloLinea(l); return `<line x1="1" y1="6" x2="25" y2="6" stroke="${s.color}" stroke-width="${Math.min(s.weight, 6)}" stroke-dasharray="${s.dashArray || ''}" stroke-linecap="round"/>`; }).join('')}</svg>`;
  const s = estiloRelleno(capas[0]);
  return `<svg width="26" height="14"><rect x="1" y="1" width="24" height="12" fill="${s.fill ? s.fillColor : 'none'}" stroke="${s.color}" stroke-width="1.5" stroke-dasharray="${s.dashArray || ''}"/></svg>`;
}
function leyendaCapa(m) {
  const st = m.style; if (!st) return '';
  if (st.type === 'singleSymbol') return '';
  const items = st.type === 'categorizedSymbol' ? st.cats.map(x => [x.label, x.symbol]) : st.rules.map(x => [x.label, x.symbol]);
  return '<div class="leyenda">' + items.map(([lb, s]) => `<div>${leyendaSimbolo(s, m.geom)}<span>${lb}</span></div>`).join('') + '</div>';
}
function construirArbol() {
  const grupos = {};
  for (const c of Object.values(CAPAS)) (grupos[c.m.group] = grupos[c.m.group] || []).push(c);
  const orden = Object.keys(grupos).sort();
  $('#arbol').innerHTML = orden.map(g => `
    <div class="grupo ${/^0[78]/.test(g) ? 'cerrado' : ''}" data-g="${g}">
      <div class="g-cab"><span class="flecha">▾</span><input type="checkbox" class="g-chk" ${grupos[g].some(c => c.visible) ? 'checked' : ''} title="Activar / desactivar grupo"><span>${g}</span></div>
      <div class="g-cuerpo">${grupos[g].map(c => {
        const sym = c.m.style && c.m.style.type === 'singleSymbol' ? leyendaSimbolo(c.m.style.symbol, c.m.geom) : '';
        const conTabla = !c.raster;
        return `<div class="capa" data-id="${c.m.id}">
          <div class="c-fila"><label><input type="checkbox" class="c-chk" ${c.visible ? 'checked' : ''}>${sym}<span>${c.m.name}</span>${c.protegida ? '<span class="candado" title="Requiere contraseña">🔒</span>' : ''}<span class="cargando"></span></label>
          <button class="acc zoom" title="Zoom a la capa">⤢</button>${conTabla ? '<button class="acc tbl" title="Abrir tabla de atributos">▦</button>' : ''}<button class="acc mas" title="Leyenda y opacidad">⋯</button></div>
          <div class="c-extra">${c.m.style ? leyendaCapa(c.m) : ''}
            <div class="opac">Opacidad <input type="range" min="0" max="100" value="${Math.round(c.opac * 100)}"></div>
            ${c.m.hover === false ? '<div class="ayuda">Datos con clic sobre la línea.</div>' : ''}</div>
        </div>`; }).join('')}</div>
    </div>`).join('');
  $$('.g-cab').forEach(h => h.addEventListener('click', e => { if (e.target.classList.contains('g-chk')) return; h.parentElement.classList.toggle('cerrado'); }));
  $$('.g-chk').forEach(ch => ch.onchange = () => {
    ch.closest('.grupo').querySelectorAll('.c-chk').forEach(x => { if (x.checked !== ch.checked) { x.checked = ch.checked; x.onchange(); } });
  });
  $$('.capa').forEach(el => {
    const c = CAPAS[el.dataset.id];
    el.querySelector('.c-chk').onchange = function () { mostrarCapa(c, this.checked); const g = el.closest('.grupo'); g.querySelector('.g-chk').checked = [...g.querySelectorAll('.c-chk')].some(x => x.checked); };
    el.querySelector('.mas').onclick = () => el.classList.toggle('abierta');
    el.querySelector('.zoom').onclick = async () => {
      if (c.protegida) { el.querySelector('.c-chk').checked = true; await mostrarCapa(c, true); if (c.protegida) return; }
      if (c.raster) { if (!c.visible) { el.querySelector('.c-chk').checked = true; await mostrarCapa(c, true); } map.fitBounds(c.layer.getBounds()); return; }
      if (!c.visible) { el.querySelector('.c-chk').checked = true; mostrarCapa(c, true); }
      const b = limites(c); if (b) map.fitBounds(b, { padding: [20, 20], maxZoom: 16 });
    };
    const t = el.querySelector('.tbl'); if (t) t.onclick = async () => { if (c.protegida && !(await desbloquearDefensa())) return; $('.tabs [data-tab=tabla]').click(); $('#t-capa').value = c.m.id; $('#t-capa').onchange(); };
    el.querySelector('.opac input').oninput = function () { fijarOpacidad(c, this.value / 100); };
  });
}

/* ------------------------------------------------------------------ búsqueda */
const CAMPOS_NOMBRE = ['NOMBRE', 'nombre', 'municipio', 'hito', 'NOM.HITO.', 'Name', 'hoja', 'LOCALIDAD', 'localidad', 'ref', 'PMA.'];
let INDICE = [];
const VISTOS = new Set();
function indexar(lista) {
  const vistos = VISTOS;
  for (const c of lista) {
    if (!c || !c.data) continue;
    c.data.features.forEach(f => {
      for (const k of CAMPOS_NOMBRE) {
        const v = f.properties[k]; if (!v || typeof v !== 'string') continue;
        const clave = c.m.id + '|' + v; if (c.m.id === 'carreteras' || c.m.id === 'rios' || c.m.id === 'curvas') { if (vistos.has(clave)) break; vistos.add(clave); }
        INDICE.push({ t: v, n: norm(v), c, f }); break;
      }
    });
  }
}
function prepararBusqueda() {
  indexar(Object.values(CAPAS));
  $('#q').oninput = () => {
    const q = norm($('#q').value); const r = $('#q-res');
    if (q.length < 2) { r.innerHTML = ''; return; }
    const res = INDICE.filter(x => x.n.includes(q)).slice(0, 60);
    r.innerHTML = res.length ? res.map((x, i) => `<div data-i="${i}">${x.t}<br><small>${x.c.m.name}</small></div>`).join('') : '<p class="ayuda">Sin resultados.</p>';
    r.querySelectorAll('div').forEach(d => d.onclick = () => irAElemento(res[d.dataset.i].c, res[d.dataset.i].f));
  };
  $('#btn-ir').onclick = irACoordenada;
  $('#qc').onkeydown = e => { if (e.key === 'Enter') irACoordenada(); };
}
function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function irAElemento(c, f) {
  if (!c.visible) { const chk = document.querySelector(`[data-id="${c.m.id}"] .c-chk`); if (chk) chk.checked = true; mostrarCapa(c, true); }
  const gj = L.geoJSON(f.geometry), b = gj.getBounds(), centro = b.getCenter();
  if (f.geometry.type.includes('Point')) map.setView(centro, Math.max(map.getZoom(), 15)); else map.fitBounds(b, { padding: [40, 40], maxZoom: 16 });
  let p = centro;
  if (!f.geometry.type.includes('Point')) { const ll = gj.getLayers()[0]; if (ll.getLatLngs) { const a = ll.getLatLngs().flat(3); p = a[Math.floor(a.length / 2)] || centro; } }
  setTimeout(() => abrirFicha(c, f, p), 350);
  if (innerWidth < 760) $('#app').classList.add('sin-panel');
}
let pinBusqueda = null;
function irACoordenada() {
  const t = $('#qc').value.trim().replace(/;/g, ','), n = t.match(/-?\d+(\.\d+)?/g); if (!n || n.length < 2) { aviso('Escriba dos números.'); return; }
  let a = Number(n[0]), b = Number(n[1]), ll;
  if (Math.abs(a) <= 90 && Math.abs(b) <= 180) ll = [a, b];
  else if (a > 100000 && a < 900000 && b > 1000000) ll = deUTM(a, b, 19, true);
  else if (b > 100000 && b < 900000 && a > 1000000) ll = deUTM(b, a, 19, true);
  else { aviso('Formato no reconocido.'); return; }
  if (pinBusqueda) map.removeLayer(pinBusqueda);
  pinBusqueda = L.marker(ll, { icon: L.divIcon({ className: '', html: '<div class="pin" style="background:#d50000"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }) }).addTo(map);
  const u = aUTM(ll[0], ll[1]);
  pinBusqueda.bindPopup(`<b>Coordenada buscada</b><br>${gms(ll[0], 'N', 'S')} ${gms(ll[1], 'E', 'O')}<br>UTM ${u.zona}S E ${fmt(u.x)} N ${fmt(u.y)}`).openPopup();
  map.setView(ll, 15);
}

/* ------------------------------------------------------------------ tabla de atributos */
let T_FILAS = [];
function prepararTabla() {
  const sel = $('#t-capa');
  const prev = sel.value;
  sel.innerHTML = D.meta.filter(m => CAPAS[m.id] && CAPAS[m.id].data).map(m => `<option value="${m.id}">${m.name}</option>`).join('');
  if (prev && CAPAS[prev] && CAPAS[prev].data) sel.value = prev;
  sel.onchange = pintarTabla; $('#t-filtro').oninput = pintarTabla;
  $('#t-csv').onclick = exportarCSV; pintarTabla();
}
function pintarTabla() {
  const c = CAPAS[$('#t-capa').value], q = norm($('#t-filtro').value);
  const campos = Object.keys((c.data.features[0] || {}).properties || {}).filter(k => !/^(fid|popup)$/i.test(k));
  T_FILAS = c.data.features.filter(f => !q || norm(Object.values(f.properties).join(' ')).includes(q));
  const lim = 400, al = c.m.aliases || {};
  $('#t-cuenta').textContent = `${T_FILAS.length} de ${c.data.features.length} registros` + (T_FILAS.length > lim ? ` (se muestran ${lim})` : '');
  $('#t-wrap').innerHTML = `<table><tr>${campos.map(k => `<th>${al[k] || k}</th>`).join('')}</tr>` +
    T_FILAS.slice(0, lim).map((f, i) => `<tr data-i="${i}">${campos.map(k => `<td title="${String(f.properties[k] ?? '').replace(/"/g, '&quot;')}">${f.properties[k] ?? ''}</td>`).join('')}</tr>`).join('') + '</table>';
  $('#t-wrap').querySelectorAll('tr[data-i]').forEach(tr => tr.onclick = () => irAElemento(c, T_FILAS[tr.dataset.i]));
}
function exportarCSV() {
  const c = CAPAS[$('#t-capa').value], campos = Object.keys((c.data.features[0] || {}).properties || {});
  const esc = v => { v = v ?? ''; v = String(v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const txt = '﻿' + [campos.join(';')].concat(T_FILAS.map(f => campos.map(k => esc(f.properties[k])).join(';'))).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
  a.download = c.m.id + '.csv'; a.click();
}

/* ------------------------------------------------------------------ herramientas */
const capaHerr = L.layerGroup(), capaRutas = L.layerGroup();
let puntos = [], dibujo = null;
function prepararHerramientas() {
  capaHerr.addTo(map); capaRutas.addTo(map);
  $$('.herr').forEach(b => b.onclick = () => activar(modo === b.dataset.tool ? null : b.dataset.tool));
  $('#btn-borrar-rutas').onclick = () => { capaRutas.clearLayers(); $('#resultado').hidden = true; };
  $('#btn-gps').onclick = () => { aviso('Buscando su ubicación…'); map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true }); };
  map.on('locationfound', e => { capaHerr.addLayer(L.circle(e.latlng, { radius: e.accuracy, color: '#1565C0', weight: 1, fillOpacity: .1 }));
    capaHerr.addLayer(L.marker(e.latlng, { icon: L.divIcon({ className: '', html: '<div class="pin" style="background:#1565C0"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }) }).bindPopup('Usted está aquí (±' + fmt(e.accuracy) + ' m)').openPopup()); });
  map.on('locationerror', () => aviso('No se pudo obtener la ubicación.'));
  $('#btn-imprimir').onclick = () => window.print();
  map.on('dblclick', e => { if (modo === 'dist' || modo === 'area') { L.DomEvent.stop(e); terminarMedicion(); } });
  map.on('mousemove', e => { if ((modo === 'dist' || modo === 'area') && puntos.length) previsualizar(e.latlng); });
}
function activar(t) {
  cancelarHerramienta(); modo = t;
  $$('.herr').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  map.getContainer().style.cursor = t ? 'crosshair' : '';
  if (t === 'dist' || t === 'area') map.doubleClickZoom.disable(); else map.doubleClickZoom.enable();
  const txt = { ruta: 'RUTA ÓPTIMA: haga clic en el punto de ORIGEN', pie: 'RUTA A PIE: haga clic en el punto de ORIGEN', dist: 'Clic para medir; doble clic para terminar', area: 'Clic para dibujar el área; doble clic para terminar', identificar: 'Haga clic sobre el mapa para identificar' };
  if (t) aviso(txt[t], 4000);
  if (t && innerWidth < 760) $('#app').classList.add('sin-panel');
}
function cancelarHerramienta() { puntos = []; capaHerr.clearLayers(); dibujo = null; }
function clicMapa(e) {
  if (!modo) return;
  const ll = e.latlng;
  if (modo === 'identificar') { identificar(ll); return; }
  if (modo === 'dist' || modo === 'area') { puntos.push(ll); capaHerr.addLayer(L.circleMarker(ll, { radius: 3, color: '#1f3b1f', fillOpacity: 1, pane: 'ruta' })); previsualizar(ll); return; }
  if (modo === 'ruta' || modo === 'pie') {
    if (puntos.length >= 2) { puntos = []; }
    puntos.push(ll);
    capaRutas.addLayer(L.marker(ll, { icon: L.divIcon({ className: '', html: `<div class="pin" style="background:${puntos.length === 1 ? '#2E7D32' : '#C62828'}"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] }) }));
    if (puntos.length === 1) aviso('Ahora haga clic en el DESTINO', 3000);
    else { const [a, b] = puntos; aviso('Calculando…', 1500); setTimeout(() => (modo === 'ruta' ? rutaVial(a, b) : rutaPie(a, b)).catch(err => aviso(err.message, 5000)), 30); }
  }
}
function previsualizar(cursor) {
  if (dibujo) capaHerr.removeLayer(dibujo);
  const pts = puntos.concat(cursor ? [cursor] : []);
  if (modo === 'dist') {
    let d = 0; for (let i = 1; i < pts.length; i++) d += distM(pts[i - 1], pts[i]);
    dibujo = L.polyline(pts, { color: '#FFD600', weight: 3, dashArray: '6 4', pane: 'ruta' }).bindTooltip(d > 1000 ? fmt(d / 1000, 3) + ' km' : fmt(d, 1) + ' m', { permanent: true, className: 'medida', direction: 'right' });
  } else {
    const a = pts.length > 2 ? areaM2(pts) : 0; let per = 0; for (let i = 0; i < pts.length; i++) per += distM(pts[i], pts[(i + 1) % pts.length]);
    dibujo = L.polygon(pts, { color: '#FFD600', weight: 3, fillOpacity: .15, dashArray: '6 4', pane: 'ruta' })
      .bindTooltip(`${a > 1e6 ? fmt(a / 1e6, 3) + ' km²' : fmt(a / 1e4, 3) + ' ha'} · perímetro ${fmt(per / 1000, 3)} km`, { permanent: true, className: 'medida', direction: 'right' });
  }
  capaHerr.addLayer(dibujo);
}
function terminarMedicion() { if (dibujo) { const d = dibujo; dibujo = null; puntos = []; capaHerr.addLayer(d); } }

/* ---- identificar: lista todo lo que hay bajo el clic en capas visibles ---- */
function identificar(ll) {
  const p = map.latLngToContainerPoint(ll), hall = [];
  for (const c of Object.values(CAPAS)) {
    if (!c.visible || !c.data) continue;
    c.layer.eachLayer(g => {
      const lyrs = g.eachLayer ? g.getLayers() : [g];
      lyrs.forEach(l => {
        if (!l._f || hall.some(h => h.f === l._f)) return;
        let ok = false;
        if (l.getLatLng) ok = map.latLngToContainerPoint(l.getLatLng()).distanceTo(p) < 14;
        else if (l instanceof L.Polygon) ok = dentro(ll, l);
        else if (l instanceof L.Polyline) ok = cercaLinea(p, l, 7);
        if (ok) hall.push({ c, f: l._f });
      });
    });
  }
  if (!hall.length) { L.popup().setLatLng(ll).setContent('Sin elementos en este punto.').openOn(map); return; }
  if (hall.length === 1) { abrirFicha(hall[0].c, hall[0].f, ll); return; }
  const div = document.createElement('div'); div.className = 'lista';
  div.innerHTML = '<b>Elementos encontrados (' + hall.length + ')</b>' + hall.map((h, i) => `<div data-i="${i}">${nombreDe(h.f) || '(sin nombre)'}<br><small>${h.c.m.name}</small></div>`).join('');
  div.querySelectorAll('div[data-i]').forEach(d => d.onclick = () => abrirFicha(hall[d.dataset.i].c, hall[d.dataset.i].f, ll));
  L.popup({ maxWidth: 320 }).setLatLng(ll).setContent(div).openOn(map);
}
function nombreDe(f) { for (const k of CAMPOS_NOMBRE) if (f.properties[k]) return f.properties[k]; return f.properties.tipo || f.properties.TIPO || (f.properties.ELEV ? f.properties.ELEV + ' m' : ''); }
function dentro(ll, pol) {
  const anillos = pol.getLatLngs().flat(pol.getLatLngs()[0] && Array.isArray(pol.getLatLngs()[0][0]) ? 1 : 0);
  let n = 0;
  for (const r of anillos) { const a = Array.isArray(r) ? r : [r];
    for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
      const xi = a[i].lng, yi = a[i].lat, xj = a[j].lng, yj = a[j].lat;
      if ((yi > ll.lat) !== (yj > ll.lat) && ll.lng < (xj - xi) * (ll.lat - yi) / (yj - yi) + xi) n++;
    } }
  return n % 2 === 1;
}
function cercaLinea(p, l, tol) {
  const partes = l.getLatLngs(), lineas = Array.isArray(partes[0]) ? partes : [partes];
  for (const a of lineas) for (let i = 1; i < a.length; i++) {
    const p1 = map.latLngToContainerPoint(a[i - 1]), p2 = map.latLngToContainerPoint(a[i]);
    if (L.LineUtil.pointToSegmentDistance(p, p1, p2) < tol) return true;
  }
  return false;
}

/* ---- ruta vial: grafo de carreteras con velocidad por tipo de vía (Dijkstra) ---- */
const NOMBRES_VIA = { trunk: 'Red Fundamental (troncal)', trunk_link: 'Enlace troncal', secondary: 'Red Departamental', secondary_link: 'Enlace departamental',
  tertiary: 'Terciaria', tertiary_link: 'Enlace terciaria', unclassified: 'Camino vecinal', residential: 'Calle urbana', living_street: 'Calle peatonal',
  service: 'Vía de servicio', track: 'Camino de tierra/herradura', road: 'Sin clasificar' };
let GRAFO = null;
function construirGrafo() {
  if (GRAFO) return GRAFO;
  const idx = new Map(), lat = [], lon = [], ady = [];
  const nodo = (x, y) => { const k = x.toFixed(6) + ',' + y.toFixed(6); let i = idx.get(k); if (i === undefined) { i = lat.length; idx.set(k, i); lat.push(y); lon.push(x); ady.push([]); } return i; };
  CAPAS.carreteras.data.features.forEach((f, fi) => {
    if (!f.geometry) return;
    const partes = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates];
    const v = Number(f.properties.vel_kmh) || 25;
    for (const ln of partes) for (let i = 1; i < ln.length; i++) {
      const a = nodo(ln[i - 1][0], ln[i - 1][1]), b = nodo(ln[i][0], ln[i][1]); if (a === b) continue;
      const d = distM({ lat: lat[a], lng: lon[a] }, { lat: lat[b], lng: lon[b] }), t = d / (v / 3.6);
      ady[a].push([b, d, t, fi]); ady[b].push([a, d, t, fi]);
    }
  });
  GRAFO = { lat, lon, ady }; return GRAFO;
}
function masCercano(G, ll) {
  let mejor = -1, dm = Infinity; const c = Math.cos(ll.lat * Math.PI / 180);
  for (let i = 0; i < G.lat.length; i++) { const dx = (G.lon[i] - ll.lng) * c, dy = G.lat[i] - ll.lat, d = dx * dx + dy * dy; if (d < dm && G.ady[i].length) { dm = d; mejor = i; } }
  return mejor;
}
class Monticulo {                       // cola de prioridad
  constructor() { this.k = []; this.v = []; }
  push(k, v) { const K = this.k, V = this.v; let i = K.length; K.push(k); V.push(v);
    while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= k) break; K[i] = K[p]; V[i] = V[p]; i = p; } K[i] = k; V[i] = v; }
  pop() { const K = this.k, V = this.v, top = V[0], k = K.pop(), v = V.pop(), n = K.length;
    if (n) { let i = 0; while (true) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && K[c + 1] < K[c]) c++; if (K[c] >= k) break; K[i] = K[c]; V[i] = V[c]; i = c; } K[i] = k; V[i] = v; }
    return top; }
  get size() { return this.k.length; }
}
function dijkstra(G, s, t, peso) {       // peso: 1 = distancia, 2 = tiempo
  const n = G.lat.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), via = new Int32Array(n).fill(-1);
  const h = new Monticulo(); dist[s] = 0; h.push(0, s);
  while (h.size) { const u = h.pop(); if (u === t) break; const du = dist[u];
    for (const e of G.ady[u]) { const nd = du + e[peso]; if (nd < dist[e[0]]) { dist[e[0]] = nd; prev[e[0]] = u; via[e[0]] = e[3]; h.push(nd, e[0]); } } }
  if (!isFinite(dist[t])) return null;
  const camino = []; let km = 0, seg = 0; const por = {};
  for (let v = t; v !== -1; v = prev[v]) { camino.push([G.lat[v], G.lon[v]]);
    if (prev[v] !== -1) { const e = G.ady[prev[v]].find(x => x[0] === v && x[3] === via[v]) || G.ady[prev[v]].find(x => x[0] === v);
      km += e[1]; seg += e[2]; const tp = CAPAS.carreteras.data.features[e[3]].properties.tipo_osm; por[tp] = (por[tp] || 0) + e[1]; } }
  return { camino: camino.reverse(), km: km / 1000, min: seg / 60, por };
}
function hm(m) { return m >= 60 ? `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')} min` : `${Math.round(m)} min`; }
function detalle(por) { return Object.entries(por).sort((a, b) => b[1] - a[1]).filter(x => x[1] >= 100).map(([k, v]) => `${NOMBRES_VIA[k] || k}: ${fmt(v / 1000, 1)} km`).join('<br>'); }
async function rutaVial(a, b) {
  const G = construirGrafo(), s = masCercano(G, a), t = masCercano(G, b);
  const rap = dijkstra(G, s, t, 2), cor = dijkstra(G, s, t, 1);
  if (!rap) throw new Error('No hay conexión por carretera entre esos puntos.');
  capaRutas.addLayer(L.polyline(cor.camino, { color: '#8E24AA', weight: 5, dashArray: '10 7', pane: 'ruta', renderer: window.__R.ruta }).bindTooltip('Ruta más corta'));
  capaRutas.addLayer(L.polyline(rap.camino, { color: '#00C853', weight: 7, opacity: .9, pane: 'ruta', renderer: window.__R.ruta }).bindTooltip('Ruta óptima (más rápida)'));
  map.fitBounds(L.latLngBounds(rap.camino.concat(cor.camino)), { padding: [40, 40] });
  const igual = Math.abs(rap.km - cor.km) < 0.05;
  mostrarResultado(`<h3 style="color:#00a844">RUTA ÓPTIMA (más rápida, verde)</h3>
    <table><tr><td>Distancia</td><td><b>${fmt(rap.km, 2)} km</b></td></tr><tr><td>Tiempo estimado</td><td><b>${hm(rap.min)}</b></td></tr><tr><td>Vías</td><td>${detalle(rap.por)}</td></tr></table>
    <h3 style="color:#8E24AA;margin-top:10px">RUTA MÁS CORTA (morada discontinua)</h3>
    <table><tr><td>Distancia</td><td><b>${fmt(cor.km, 2)} km</b></td></tr><tr><td>Tiempo estimado</td><td><b>${hm(cor.min)}</b></td></tr><tr><td>Vías</td><td>${detalle(cor.por)}</td></tr></table>
    <div class="rec">${igual ? 'La RUTA ÓPTIMA (verde) coincide con la más corta.' : `Se recomienda la RUTA ÓPTIMA (verde): ${fmt(rap.km - cor.km, 1)} km más larga pero ahorra ${hm(Math.max(cor.min - rap.min, 0))}.`}</div>
    <p class="ayuda">Tiempos según tipo y superficie de la vía; no incluyen tráfico ni clima.</p>`);
}

/* ---- ruta a pie: A* sobre el DEM de 90 m con la función de Tobler, evitando el lago ---- */
async function rutaPie(a, b) {
  const M = await cargarDEM(), nx = M.nx, ny = M.ny, Z = M.z;
  const celda = ll => { const u = aUTM(ll.lat, ll.lng, 19); const c = Math.floor((u.x - M.x0) / M.dx), f = Math.floor((u.y - M.y0) / M.dy); return (c < 0 || f < 0 || c >= nx || f >= ny) ? -1 : f * nx + c; };
  const s = celda(a), t = celda(b);
  if (s < 0 || t < 0) throw new Error('El punto está fuera del área del modelo de elevación.');
  if (Z[s] === M.nodata || Z[t] === M.nodata) throw new Error('El origen o el destino está sobre el lago o una laguna.');
  const n = nx * ny, g = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), cerrado = new Uint8Array(n);
  const tx = t % nx, ty = Math.floor(t / nx), vmax = 6 / 3.6, dx = Math.abs(M.dx);
  const heur = i => Math.hypot((i % nx - tx), (Math.floor(i / nx) - ty)) * dx / vmax;
  const h = new Monticulo(); g[s] = 0; h.push(heur(s), s);
  const V = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (h.size) {
    const u = h.pop(); if (cerrado[u]) continue; cerrado[u] = 1; if (u === t) break;
    const ux = u % nx, uy = (u - ux) / nx, zu = Z[u];
    for (const [ddx, ddy] of V) {
      const x = ux + ddx, y = uy + ddy; if (x < 0 || y < 0 || x >= nx || y >= ny) continue;
      const v = y * nx + x; if (cerrado[v] || Z[v] === M.nodata) continue;
      const d = (ddx && ddy) ? dx * Math.SQRT2 : dx, dz = Z[v] - zu, pend = dz / d;
      const vel = 6 * Math.exp(-3.5 * Math.abs(pend + 0.05)) / 3.6;          // Tobler (m/s)
      const nd = g[u] + Math.hypot(d, dz) / vel;
      if (nd < g[v]) { g[v] = nd; prev[v] = u; h.push(nd + heur(v), v); }
    }
  }
  if (!isFinite(g[t])) throw new Error('El destino no es alcanzable a pie.');
  const celdas = []; for (let v = t; v !== -1; v = prev[v]) celdas.push(v); celdas.reverse();
  const ll = celdas.map(i => deUTM(M.x0 + (i % nx + 0.5) * M.dx, M.y0 + (Math.floor(i / nx) + 0.5) * M.dy, 19, true));
  let plano = 0, real = 0, sube = 0, baja = 0, pmax = 0; const zs = celdas.map(i => Z[i]), perfil = [[0, zs[0]]];
  for (let i = 1; i < celdas.length; i++) {
    const d = (celdas[i] % nx !== celdas[i - 1] % nx && Math.floor(celdas[i] / nx) !== Math.floor(celdas[i - 1] / nx)) ? dx * Math.SQRT2 : dx, dz = zs[i] - zs[i - 1];
    plano += d; real += Math.hypot(d, dz); if (dz > 0) sube += dz; else baja -= dz; perfil.push([plano, zs[i]]);
    if (i >= 3) pmax = Math.max(pmax, Math.abs(zs[i] - zs[i - 3]) / (plano - perfil[i - 3][0]) * 100);
  }
  capaRutas.addLayer(L.polyline(ll, { color: '#FF6F00', weight: 5, dashArray: '12 6 2 6', pane: 'ruta', renderer: window.__R.ruta }).bindTooltip('Ruta a pie (terreno)'));
  map.fitBounds(L.latLngBounds(ll), { padding: [40, 40] });
  const seg = g[t];
  mostrarResultado(`<h3 style="color:#e65100">RUTA A PIE POR EL TERRENO (naranja)</h3>
    <table><tr><td>Distancia en planta</td><td><b>${fmt(plano / 1000, 2)} km</b></td></tr>
    <tr><td>Distancia real (con pendiente)</td><td>${fmt(real / 1000, 2)} km</td></tr>
    <tr><td>Tiempo estimado</td><td><b>${Math.floor(seg / 3600)} h ${String(Math.round(seg % 3600 / 60)).padStart(2, '0')} min</b></td></tr>
    <tr><td>Desnivel de subida</td><td>+${fmt(sube)} m</td></tr><tr><td>Desnivel de bajada</td><td>-${fmt(baja)} m</td></tr>
    <tr><td>Altitud mín. / máx.</td><td>${fmt(Math.min(...zs))} / ${fmt(Math.max(...zs))} m s.n.m.</td></tr>
    <tr><td>Pendiente máx. aprox.</td><td>${fmt(pmax)} %</td></tr></table>
    ${svgPerfil(perfil)}
    <p class="ayuda">Camino de menor esfuerzo sobre el modelo de elevación (90 m), con la función de Tobler; evita el lago y las lagunas y no usa carreteras. Tiempo para una persona a paso normal, sin descansos.</p>`);
}
function svgPerfil(p) {
  const W = 300, H = 120, zmin = Math.min(...p.map(x => x[1])), zmax = Math.max(...p.map(x => x[1])), dmax = p[p.length - 1][0] || 1, rz = Math.max(zmax - zmin, 10);
  const X = d => 34 + d / dmax * (W - 40), Y = z => H - 18 - (z - zmin) / rz * (H - 30);
  const pts = p.map(q => X(q[0]).toFixed(1) + ',' + Y(q[1]).toFixed(1)).join(' ');
  return `<svg id="perfil" viewBox="0 0 ${W} ${H}" role="img" aria-label="Perfil de elevación">
    <polygon points="${X(0)},${H - 18} ${pts} ${X(dmax)},${H - 18}" fill="#ffcc80" opacity=".6"/><polyline points="${pts}" fill="none" stroke="#e65100" stroke-width="1.6"/>
    <text x="2" y="${Y(zmax) + 4}" font-size="9" fill="#555">${fmt(zmax)}</text><text x="2" y="${Y(zmin)}" font-size="9" fill="#555">${fmt(zmin)}</text>
    <text x="${W - 6}" y="${H - 4}" font-size="9" fill="#555" text-anchor="end">${fmt(dmax / 1000, 1)} km</text><text x="34" y="${H - 4}" font-size="9" fill="#555">0</text></svg>`;
}
function mostrarResultado(html) {
  const r = $('#resultado'); r.innerHTML = html; r.hidden = false;
  $('.tabs [data-tab=herr]').click();
  if (innerWidth < 760) $('#app').classList.remove('sin-panel');
  setTimeout(() => { map.invalidateSize(); r.scrollIntoView({ behavior: 'smooth' }); }, 250);
}

/* ------------------------------------------------------------------ invitar */
function prepararInvitar() {
  const url = location.href.split('#')[0].split('?')[0];
  $('#m-url').textContent = url;
  $('#m-wa').href = 'https://wa.me/?text=' + encodeURIComponent('Geovisor SIG · Provincia Omasuyos (BYNS): ' + url);
  $('#btn-invitar').onclick = () => { $('#modal').hidden = false; };
  $('#m-cerrar').onclick = () => { $('#modal').hidden = true; };
  $('#modal').onclick = e => { if (e.target.id === 'modal') $('#modal').hidden = true; };
  $('#m-copiar').onclick = async () => { try { await navigator.clipboard.writeText(url); aviso('Enlace copiado'); } catch (e) { aviso(url, 6000); } };
}

let tAviso = null;
function aviso(t, ms = 2500) { const a = $('#aviso'); a.textContent = t; a.hidden = false; clearTimeout(tAviso); tAviso = setTimeout(() => a.hidden = true, ms); }

iniciar();
})();
