/* Modelo único de ficha (agregado por BYNS7): el mismo formato de la ficha de centros de salud
   (encabezado con logos del Ejército y la EMTE, nombre, categoría, distintivos y bloques numerados).
   Lo usan las fichas de vías, ríos, cuerpos de agua, municipios, apoyo al planeamiento, coordenadas y unidades.
   Usa los estilos fs-* de ficha-salud.js. */
(function () {
'use strict';
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const vacio = v => v == null || /^(\s*|sin dato|s\/n|null|none|undefined|no aplica)$/i.test(String(v).trim());
const miles = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const css = el('style');
css.textContent = `
.fs-fig{display:flex;justify-content:center;margin:6px 0 2px}
.fs-fig img,.fs-fig svg{height:96px;width:auto;max-width:120px;object-fit:contain}
.fs-graf svg{display:block;width:100%;height:auto}
.fs-graf .fs-var{padding:4px 8px;font-size:11px;color:#5A6B80;border-top:1px solid #eef0f5}
.fs-ico{display:flex;justify-content:center;margin:4px 0 0}
.fs-ico svg{width:30px;height:30px}
.fs-blq .fs-row a{font-weight:700;color:#0b1f6b}
.fs-btn{display:block;width:100%;margin-top:12px;padding:9px;border:0;border-radius:7px;background:#c9a227;color:#0b1f6b;font-weight:800;font-size:12px;letter-spacing:1px;cursor:pointer}
.fs-btn:hover{background:#e0b630}`;
document.head.append(css);

/* Encabezado institucional. Devuelve el contenedor #info ya limpio. */
function abrir(titulo, nombre, categoria, pos) {
  const info = document.getElementById('info'); if (!info) return null;
  info.replaceChildren(); info.classList.add('ficha-salud'); info.hidden = false; info.scrollTop = 0;
  const hd = el('div', 'fs-head');
  const l1 = el('img'); l1.src = 'assets/logos/ejercito_bolivia.png'; l1.alt = 'Ejército de Bolivia';
  const l2 = el('img'); l2.src = 'assets/logos/emte.png'; l2.alt = 'Escuela Militar de Topografía del Ejército';
  const tt = el('div', 'fs-tit'); tt.append(el('b', null, titulo), el('small', null, 'GEOVISOR OMASUYOS · EMTE'));
  const cx = el('button', 'feature-close fs-close', '×'); cx.type = 'button'; cx.title = 'Cerrar ficha'; cx.setAttribute('aria-label', 'Cerrar ficha de información');
  cx.onclick = ev => { ev.stopPropagation(); info.hidden = true; };
  hd.append(l1, tt, l2, cx); info.append(hd);
  if (nombre) info.append(el('h3', null, nombre));
  if (categoria) info.append(el('span', 'fs-cat', String(categoria).toUpperCase()));
  if (pos && pos[0] != null) info.append(acciones(pos[0], pos[1], nombre));
  return info;
}
/* Distintivos: [[texto, 'si'|'med'|'no'], …] */
function chips(lista) {
  const bd = el('div', 'fs-badges');
  for (const [t, c] of lista) if (!vacio(t)) bd.append(el('span', 'fs-b fs-' + (c || 'no'), t));
  return bd.childElementCount ? bd : null;
}
/* Bloque con título y filas [etiqueta, valor, fuente?]. Las filas sin dato no se muestran. */
function bloque(titulo, filas) {
  const ok = filas.filter(f => f && !vacio(f[1])); if (!ok.length) return null;
  const b = el('div', 'fs-blq'); b.append(el('h4', null, titulo));
  for (const [k, v, src] of ok) {
    const r = el('div', 'fs-row'); r.append(el('b', null, String(k).toUpperCase()));
    const s = el('span');
    if (v instanceof Node) s.append(v);
    else if (typeof v === 'string' && /^https?:\/\//.test(v)) { const a = el('a', null, 'Abrir enlace ↗'); a.href = v; a.target = '_blank'; a.rel = 'noopener'; s.append(a); }
    else s.textContent = String(v);
    if (src) s.append(el('small', 'fs-src', 'Fuente: ' + src));
    r.append(s); b.append(r);
  }
  return b;
}
const pie = t => el('p', 'fs-upd', t);
function boton(t, fn) { const b = el('button', 'fs-btn', t); b.type = 'button'; b.onclick = fn; return b; }
function poner(info, ...hijos) { for (const x of hijos) if (x) info.append(x); }
/* Coordenadas y altitud de un punto [lon, lat] */
function ubicacion(lon, lat) {
  if (lat == null || lon == null) return [];
  const T = window.EMTE_TOPO, z = window.EMTE_ALTITUD ? window.EMTE_ALTITUD(lat, lon) : null;
  const u = T ? T.aUTM(lat, lon, 19) : null;
  return [['Este (UTM 19S)', u ? miles(u[0]) + ' m' : null], ['Norte (UTM 19S)', u ? miles(u[1]) + ' m' : null],
    ['Latitud / longitud', `${(+lat).toFixed(5)} , ${(+lon).toFixed(5)}`], ['Altitud', z != null ? miles(z) + ' m s.n.m.' : altitudDiferida(lat, lon)]];
}

/* Altitud: si el modelo de elevación aún se está cargando, la fila se completa sola al terminar. */
function altitudDiferida(lat, lon) {
  if (!window.EMTE_CARGAR_DEM) return null;
  const sp = el('span', 'fs-vacio', 'calculando…');
  window.EMTE_CARGAR_DEM().then(() => { const z = window.EMTE_ALTITUD(lat, lon); if (z != null) { sp.textContent = miles(z) + ' m s.n.m.'; sp.className = ''; } else sp.closest('.fs-row')?.remove(); }).catch(() => sp.closest('.fs-row')?.remove());
  return sp;
}

/* ---------- 1. botones de acción: centrar, copiar UTM, imprimir ---------- */
const css2 = el('style');
css2.textContent = `
.fs-acc{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:9px 0 2px}
.fs-acc button{display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 4px;border:1px solid #cfd6e6;border-radius:7px;background:#f4f6fb;color:#0b1f6b;font:700 10px var(--tipo-titulo,system-ui);letter-spacing:.4px;cursor:pointer}
.fs-acc button span{font-size:15px;line-height:1}
.fs-acc button:hover{background:#0b1f6b;color:#fff;border-color:#0b1f6b}
.fs-acc button.ok{background:#e5f5ea;color:#17703a;border-color:#9bd3ad}
.fs-blq .fs-row a.fs-ir{cursor:pointer;text-decoration:underline;text-decoration-color:#c9a227}
.fs-dist{display:block;font-size:10px;color:#7a6b40;font-weight:700}`;
document.head.append(css2);
let pulso = null;
function marcar(lon, lat) {
  const sc = document.getElementById('scene'); if (!sc) return;
  if (pulso) pulso.remove();
  const NS = 'http://www.w3.org/2000/svg', K = 65759.1401421867, OX = 1.199706713376768, OY = 0.2830464015276702, D2R = Math.PI / 180;
  const x = 500 + (lon * D2R + OX) * K, y = 380 - (Math.log(Math.tan(Math.PI / 4 + lat * D2R / 2)) + OY) * K;
  pulso = document.createElementNS(NS, 'g'); pulso.setAttribute('pointer-events', 'none');
  pulso.innerHTML = `<circle r="9" fill="none" stroke="#c9a227" stroke-width="3"><animate attributeName="r" values="8;26;8" dur="1.4s" repeatCount="3"/><animate attributeName="opacity" values="1;.2;1" dur="1.4s" repeatCount="3"/></circle>`;
  const ajustar = () => pulso && pulso.setAttribute('transform', `translate(${x} ${y}) scale(${1 / scale})`);
  ajustar(); sc.append(pulso); const p = pulso; setTimeout(() => { if (pulso === p) { p.remove(); pulso = null; } }, 4300);
  let n = 0; const t = setInterval(() => { ajustar(); if (++n > 14) clearInterval(t); }, 60);
}
function centrar(lon, lat) {
  const T = window.EMTE_TOPO; if (T && T.volar) { const d = .01; T.volar(lon - d, lat - d, lon + d, lat + d); }
  setTimeout(() => marcar(lon, lat), 750);
}
function copiar(texto, b) {
  const listo = () => { const t = b.innerHTML; b.classList.add('ok'); b.innerHTML = '<span>✔</span>COPIADO'; setTimeout(() => { b.classList.remove('ok'); b.innerHTML = t; }, 1600); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(listo).catch(() => viejo());
  else viejo();
  function viejo() { const ta = el('textarea'); ta.value = texto; ta.style.cssText = 'position:fixed;opacity:0'; document.body.append(ta); ta.select(); try { document.execCommand('copy'); listo(); } catch (e) {} ta.remove(); }
}
function imprimir() {
  const info = document.getElementById('info'); if (!info) return;
  const w = window.open('', '_blank', 'width=520,height=760'); if (!w) return;
  const estilos = [...document.querySelectorAll('style')].map(s => s.textContent).filter(t => /\.fs-/.test(t)).join('\n');
  const copia = info.cloneNode(true); copia.querySelectorAll('.fs-acc,.fs-close,.fs-act,.fs-btn').forEach(x => x.remove());
  copia.querySelectorAll('.fs-head').forEach(x => { x.style.position = 'static'; });
  copia.querySelectorAll('details').forEach(d => d.open = true);
  const hoy = new Date().toLocaleString('es-BO');
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><base href="${location.origin}/"><title>${(copia.querySelector('h3')?.textContent || 'Ficha')} · Geovisor Omasuyos</title>
<style>${estilos}
body{margin:0;padding:14mm 12mm;font:12px "Segoe UI",system-ui,sans-serif;color:#14233A}
.hoja{max-width:180mm;margin:0 auto}.fs-head{margin:0 0 8px!important}
.fs-blq{break-inside:avoid}.pie-imp{margin-top:14px;padding-top:6px;border-top:1px solid #ccd;font-size:9px;color:#667;text-align:center}
h3{text-align:center;margin:6px 0 2px;font-size:17px;color:#0b1f6b}
@page{size:A4;margin:0}</style></head><body><div class="hoja">${copia.innerHTML}<p class="pie-imp">Impreso desde el Geovisor Omasuyos · Escuela Militar de Topografía del Ejército · ${hoy}</p></div>
<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  w.document.close();
}
function acciones(lon, lat, nombre) {
  const d = el('div', 'fs-acc');
  const b = (ico, t, fn) => { const x = el('button'); x.type = 'button'; x.innerHTML = `<span>${ico}</span>${t}`; x.onclick = e => { e.stopPropagation(); fn(x); }; d.append(x); return x; };
  b('⌖', 'CENTRAR', () => centrar(+lon, +lat));
  b('⧉', 'COPIAR UTM', x => { const T = window.EMTE_TOPO; const t = T && T.textos ? T.textos(+lat, +lon) : null; copiar((nombre ? nombre + ' · ' : '') + (t ? 'UTM ' + t.utm.replace(/·/g, '') + ' (WGS 84)' : `${(+lat).toFixed(6)}, ${(+lon).toFixed(6)}`), x); });
  b('⎙', 'IMPRIMIR', () => imprimir());
  if (window.EMTE_EXPORTAR) d.append(window.EMTE_EXPORTAR.botonGPS('<span>⤓</span>GPS', () => { const t = nombre || 'Punto'; const desc = document.querySelector('#info .fs-cat')?.textContent || ''; const z = window.EMTE_ALTITUD ? window.EMTE_ALTITUD(+lat, +lon) : null; return { titulo: t, puntos: [{ nombre: t, desc, lat: +lat, lon: +lon, ele: z }] }; }));
  return d;
}

/* ---------- 2. lo más cercano ---------- */
const D2R2 = Math.PI / 180;
function km(a, b) { const x = (b[0] - a[0]) * Math.cos((a[1] + b[1]) / 2 * D2R2), y = b[1] - a[1]; return Math.sqrt(x * x + y * y) * 111.195; }
function kmSegmento(p, a, b) {
  const c = Math.cos(p[1] * D2R2), ax = (a[0] - p[0]) * c, ay = a[1] - p[1], bx = (b[0] - p[0]) * c, by = b[1] - p[1];
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy) * 111.195;
}
const fmtKm = d => d < 1 ? Math.round(d * 1000 / 10) * 10 + ' m' : d.toFixed(1).replace('.', ',') + ' km';
function masCercano(lista, pos, excluir, filtro) {
  let mejor = null, dm = Infinity;
  for (const f of lista || []) { if (f === excluir || (filtro && !filtro(f))) continue; const c = f.geometry && f.geometry.coordinates; if (!c || typeof c[0] !== 'number') continue; const d = km(pos, c); if (d < dm) { dm = d; mejor = f; } }
  return mejor ? [mejor, dm] : null;
}
let MAYORES = null;
function viaMayor(pos) {
  if (!MAYORES) { if (typeof roadFeatures === 'undefined' || !roadFeatures.length) return null; MAYORES = roadFeatures.filter(f => /Carretera|secundario/i.test(f.properties.tipo_via || '')); }
  let mejor = null, dm = Infinity;
  for (const f of MAYORES) for (const l of f.geometry.coordinates) for (let i = 1; i < l.length; i++) { const d = kmSegmento(pos, l[i - 1], l[i]); if (d < dm) { dm = d; mejor = f; } }
  return mejor ? [mejor, dm] : null;
}
function enlace(texto, d, fn) {
  const s = el('span'); const a = el('a', 'fs-ir', texto); a.onclick = e => { e.preventDefault(); e.stopPropagation(); fn(); }; s.append(a, el('small', 'fs-dist', fmtKm(d) + ' en línea recta')); return s;
}
function cercanos(lon, lat, excluir, titulo) {
  if (lon == null || lat == null) return null;
  const pos = [+lon, +lat], filas = [];
  const H = typeof healthFeatures !== 'undefined' ? healthFeatures : [], E = typeof educationFeatures !== 'undefined' ? educationFeatures : [];
  const s1 = masCercano(H, pos, excluir); if (s1) filas.push(['Establecimiento de salud', enlace(s1[0].properties.nombre || 'Sin nombre', s1[1], () => window.selectHealth(s1[0]))]);
  const s2 = masCercano(H, pos, excluir, f => /^HOSPITAL/i.test(f.properties.categoria || ''));
  if (s2 && (!s1 || s2[0] !== s1[0])) filas.push(['Hospital', enlace(s2[0].properties.nombre || 'Hospital', s2[1], () => window.selectHealth(s2[0]))]);
  const e1 = masCercano(E, pos, excluir); if (e1) filas.push(['Centro educativo', enlace(e1[0].properties.nombre || 'Sin nombre', e1[1], () => window.selectEducation(e1[0]))]);
  const v = viaMayor(pos); if (v && v[0] !== excluir) filas.push(['Carretera o camino principal', enlace(v[0].properties.nombre || v[0].properties.tipo_via, v[1], () => window.selectRoad(v[0]))]);
  const M = window.EMTE_MUNICIPIOS; if (M) { let c = null, dm = Infinity; for (const f of M.features) { const d = km(pos, f.properties.cap_ll); if (d < dm) { dm = d; c = f; } } if (c) { const s = el('span'); s.append(document.createTextNode(c.properties.capital), el('small', 'fs-dist', fmtKm(dm) + ' en línea recta')); filas.push(['Capital municipal', s]); } }
  return bloque(titulo || 'LO MÁS CERCANO', filas);
}

/* ---------- 4. ficha de salud: sin filas vacías + acciones + lo más cercano ---------- */
function mejorarSalud() {
  const orig = window.selectHealth; if (!orig || orig._emte) return;
  const nueva = function (f) {
    orig.apply(this, arguments);
    const info = document.getElementById('info'); if (!info) return;
    const vacias = [...info.querySelectorAll('.fs-row .fs-vacio')].map(s => s.closest('.fs-row'));
    vacias.forEach(r => r.remove());
    info.querySelectorAll('.fs-blq').forEach(b => { if (!b.querySelector('.fs-row')) b.remove(); });
    let n = 1; info.querySelectorAll('.fs-blq > h4').forEach(h => { h.textContent = h.textContent.replace(/^\d+\.\s*/, (n++) + '. '); });
    const bd = info.querySelector('.fs-badges');
    if (vacias.length && bd) { const c = el('span', 'fs-b fs-med', `◐ ${vacias.length} datos por completar`); c.title = 'Usa «ACTUALIZAR DATOS» para completarlos'; bd.append(c); }
    const c = f && f.geometry && f.geometry.coordinates;
    if (c) {
      const cat = info.querySelector('.fs-cat'); const acc = acciones(c[0], c[1], f.properties && f.properties.nombre);
      (cat || info.querySelector('h3')).after(acc);
      const cer = cercanos(c[0], c[1], f, (n) + '. LO MÁS CERCANO');
      const act = info.querySelector('.fs-act'), upd = info.querySelector('.fs-upd');
      if (cer) (upd || act) ? (upd || act).before(cer) : info.append(cer);
    }
    historialSalud(info, f, n + 1);
  };
  nueva._emte = true; window.selectHealth = nueva;
}

/* ---------- 10. historial de cambios de la ficha de salud ---------- */
const NOMBRES = { nombre: 'Nombre', categoria: 'Categoría', tipo: 'Tipo', nivel: 'Nivel', subsector: 'Subsector', dependencia: 'Dependencia', area_red: 'Red de salud', codigo_snis: 'Código SNIS', emergencia: 'Emergencia', internacion: 'Internación', horario: 'Horario', laboratorio: 'Laboratorio', especialidades: 'Especialidades', servicios: 'Servicios', atencion: 'Atención', camas: 'Camas', quirofano: 'Quirófano', sala_partos: 'Sala de partos', personal: 'Personal', municipio: 'Municipio', comunidad: 'Comunidad', direccion: 'Dirección', altitud: 'Altitud', acceso: 'Acceso', telefono: 'Teléfono', responsable: 'Responsable', web: 'Página / Facebook', correo: 'Correo', ambulancias_municipio: 'Ambulancias (municipio)', ambulancias_propias: 'Ambulancias propias', hospital_referencia: 'Hospital de referencia' };
const css3 = el('style');
css3.textContent = `details.fs-hist{margin-top:10px;border:1px solid #e1e4ee;border-radius:7px;overflow:hidden}
details.fs-hist>summary{list-style:none;cursor:pointer;padding:5px 8px;font-size:11px;letter-spacing:.5px;background:#0b1f6b;color:#fff;text-transform:uppercase;font-weight:700}
details.fs-hist>summary::-webkit-details-marker{display:none}
.fs-hi{padding:6px 8px;border-top:1px solid #eef0f5;font-size:11px}.fs-hi:first-of-type{border-top:0}
.fs-hi .cab{display:flex;gap:6px;align-items:baseline;color:#0b1f6b;font-weight:700}.fs-hi .cab small{margin-left:auto;color:#7a6b40;font-weight:600}
.fs-hi ul{margin:3px 0 0 14px;padding:0}.fs-hi li{margin:1px 0;color:#14233A}.fs-hi del{color:#9b1c1c}.fs-hi ins{color:#17703a;text-decoration:none;font-weight:600}
.fs-hi.deshecho{opacity:.55}.fs-hi .tag-d{font-size:9.5px;padding:1px 5px;border-radius:8px;background:#f1f2f6;color:#8a90a5;border:1px solid #d8dbe5}
.fs-des{margin-top:5px;display:grid;gap:5px}.fs-des input{padding:5px 7px;border:1px solid #cfd6e6;border-radius:5px;font-size:11.5px}
.fs-des button,.fs-hi .btn-des{padding:5px 8px;border:1px solid #9b1c1c;border-radius:5px;background:#fff;color:#9b1c1c;font-weight:700;font-size:10.5px;cursor:pointer}
.fs-des button.ok{background:#9b1c1c;color:#fff}.fs-des .msg{font-size:10.5px;color:#9b1c1c}`;
document.head.append(css3);
async function historialSalud(info, f, num) {
  const id = f && f.properties && f.properties.id_salud; if (id == null) return;
  let lista = [];
  try { const r = await fetch('/api/salud/historial/' + id, { cache: 'no-store' }); if (!r.ok) return; lista = await r.json(); } catch (e) { return; }
  if (!info.isConnected || !lista.length) return;
  const d = el('details', 'fs-hist'); d.append(el('summary', null, `${num}. Historial de cambios (${lista.length})`));
  const invitado = document.documentElement.dataset.rol === 'invitado';
  const vigente = lista.find(x => x.tipo !== 'DESHACER' && !x.deshecho);
  for (const x of lista) {
    const b = el('div', 'fs-hi' + (x.deshecho ? ' deshecho' : ''));
    const cab = el('div', 'cab'); cab.append(el('span', null, x.tipo === 'DESHACER' ? '↶ Cambio deshecho' : '✎ Actualización'), el('small', null, `${x.fecha || ''} · ${x.por || ''}`));
    if (x.deshecho) cab.append(el('span', 'tag-d', 'DESHECHO'));
    b.append(cab);
    const ul = el('ul');
    for (const [k, v] of Object.entries(x.campos || {})) {
      const li = el('li'); li.append(el('b', null, (NOMBRES[k] || k) + ': '));
      if (x.antes && k in x.antes) { li.append(el('del', null, x.antes[k] == null || x.antes[k] === '' ? '(dato original)' : x.antes[k]), document.createTextNode(' → ')); }
      li.append(el('ins', null, v === '' ? '(dato original)' : v)); ul.append(li);
    }
    if (x.foto) ul.append(el('li', null, '📷 Foto nueva')); if (x.quitar_foto) ul.append(el('li', null, '📷 Foto quitada'));
    if (x.observacion) ul.append(el('li', null, 'Observación: ' + x.observacion));
    b.append(ul);
    if (!invitado && vigente && x.n === vigente.n && x.antes) {
      const bt = el('button', 'btn-des', '↶ DESHACER ESTE CAMBIO'); bt.type = 'button'; b.append(bt);
      bt.onclick = () => {
        bt.remove(); const fm = el('div', 'fs-des');
        let por = ''; try { por = localStorage.getItem('fa_por') || ''; } catch (e) {}
        const iP = el('input'); iP.placeholder = 'Grado y nombre de quien deshace'; iP.value = por;
        const iC = el('input'); iC.type = 'password'; iC.placeholder = 'Contraseña de edición'; iC.autocomplete = 'off';
        const ok = el('button', 'ok', 'CONFIRMAR: DESHACER'); ok.type = 'button'; const msg = el('div', 'msg');
        fm.append(iP, iC, ok, msg); b.append(fm);
        ok.onclick = async () => {
          ok.disabled = true; msg.textContent = 'Guardando…';
          try {
            const t = await fetch('/api/sesion', { cache: 'no-store' }); if (!t.ok) throw new Error('TU SESIÓN TERMINÓ. VUELVE A INICIAR SESIÓN.');
            const csrf = (await t.json()).csrf;
            const r = await fetch('/api/salud/deshacer', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ id_salud: id, n: x.n, clave: iC.value, actualizado_por: iP.value }) });
            const dd = await r.json().catch(() => ({})); if (!r.ok) throw new Error(dd.error || 'ERROR ' + r.status);
            iC.value = ''; msg.textContent = '✔ Cambio deshecho.';
            if (window.EMTE_SALUD_RECARGAR) await window.EMTE_SALUD_RECARGAR();
            setTimeout(() => window.selectHealth(f), 700);
          } catch (e) { msg.textContent = e.message; ok.disabled = false; }
        };
      };
    }
    d.append(b);
  }
  const ref = info.querySelector('.fs-upd') || info.querySelector('.fs-act');
  ref ? ref.before(d) : info.append(d);
}
mejorarSalud(); document.addEventListener('DOMContentLoaded', mejorarSalud);

window.EMTE_FICHA = { abrir, chips, bloque, pie, boton, poner, ubicacion, vacio, miles, el, acciones, cercanos, centrar, km };

/* ---------- ríos y quebradas ---------- */
const titulo = t => vacio(t) ? null : String(t).toLowerCase().replace(/(^|[\s(/-])([a-záéíóúñü])/g, (m, a, b) => a + b.toUpperCase());
function medio(coords) {
  const ls = typeof coords[0][0] === 'number' ? [coords] : coords;
  const l = ls.reduce((m, x) => x.length > m.length ? x : m, []); return l[Math.floor(l.length / 2)] || [];
}
function selectRiver(f) {
  const p = f.properties || {};
  const [lo, la] = f.geometry ? medio(f.geometry.coordinates) : [];
  const info = abrir('FICHA DE CURSO DE AGUA', titulo(p.nombre) || (p.jerarquia || p.tipo || 'Curso de agua') + ' sin nombre registrado', p.jerarquia || p.tipo, [lo, la]); if (!info) return;
  poner(info,
    chips([[p.tipo, 'no'], [/modelad/i.test(p.verificacion_declarada || '') ? '◐ Modelado (verificar)' : '✔ Verificado', /modelad/i.test(p.verificacion_declarada || '') ? 'med' : 'si']]),
    bloque('1. IDENTIFICACIÓN', [['Nombre', titulo(p.nombre), p.fuente_nombre], ['Jerarquía', p.jerarquia, p.jerarquia_nota || (p.orden_str ? 'orden de Strahler ' + p.orden_str : null)], ['Tipo', p.tipo, p.tipo_osm ? 'según el nombre oficial (OSM decía ' + p.tipo_osm + ')' : null], ['Código', p.id_rio]]),
    bloque('2. CARACTERÍSTICAS', [['Longitud', p.longitud_km_origen != null ? String(p.longitud_km_origen).replace('.', ',') + ' km' : null], ['Orden de Strahler', p.orden_str], ['Área de drenaje', p.area_dren_origen != null ? String(p.area_dren_origen).replace('.', ',') + ' km²' : null], ['Unidad hidrográfica (nivel 4)', p.uh_nivel4]]),
    bloque('3. UBICACIÓN (PUNTO MEDIO)', [['Municipio', titulo(p.municipio)], ['Código INE', p.codigo_ine], ...ubicacion(lo, la)]),
    bloque('4. FUENTE Y VERIFICACIÓN', [['Geometría', p.fuente_geometria], ['Verificación', p.verificacion_declarada], ['Observaciones', p.observacion]]));
}
/* ---------- cuerpos de agua ---------- */
function centro(g) {
  const pol = g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? g.coordinates.reduce((m, x) => x[0].length > m[0].length ? x : m) : null;
  if (!pol) return []; const r = pol[0]; let x = 0, y = 0; r.forEach(c => { x += c[0]; y += c[1]; }); return [x / r.length, y / r.length];
}
function selectWater(f) {
  const p = f.properties || {};
  const ha = +p.area_ha_origen, [lo, la] = f.geometry ? centro(f.geometry) : [];
  const info = abrir('FICHA DE CUERPO DE AGUA', titulo(p.nombre) || (p.tipo || 'Cuerpo de agua') + ' sin nombre registrado', p.tipo, ha > 5000 ? null : [lo, la]); if (!info) return;
  poner(info,
    chips([[p.tipo, 'no'], [/^s[ií]/i.test(p.ramsar_declarado || '') ? '✔ Sitio Ramsar' : null, 'si']]),
    bloque('1. IDENTIFICACIÓN', [['Nombre', titulo(p.nombre)], ['Tipo', p.tipo], ['Código', p.id_cuerpo_agua]]),
    bloque('2. CARACTERÍSTICAS', [['Superficie', ha ? miles(ha) + ' ha (' + (ha / 100).toFixed(2).replace('.', ',') + ' km²)' : null], ['Protección (Ramsar)', p.ramsar_declarado], ['Unidad hidrográfica (nivel 4)', p.uh_nivel4]]),
    bloque('3. UBICACIÓN (CENTRO)', [['Municipio', titulo(p.municipio)], ['Código INE', p.codigo_ine], ...(ha > 5000 ? [] : ubicacion(lo, la))]),
    bloque('4. FUENTE', [['Fuente', p.fuente], ['Observaciones', p.nota]]));
}
window.selectRiver = selectRiver; window.selectWater = selectWater;
})();
