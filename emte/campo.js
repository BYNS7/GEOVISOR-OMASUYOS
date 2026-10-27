/* Trabajo de campo (agregado por BYNS7).
   · Capa «Pendientes de verificar»: los datos pendientes de la revisión (data/pendientes_campo.json) en el mapa,
     por prioridad. En cada ficha se marca VERIFICADO, se anota la observación y se puede guardar la posición GPS.
     Lo anotado se guarda en este navegador y se exporta a Excel (CSV).
   · Botón «Mi ubicación» (GPS del dispositivo). */
document.addEventListener('DOMContentLoaded', () => {
'use strict';
const mapa = document.querySelector('.map'), scene = document.getElementById('scene');
if (!mapa || !scene) return;
const NS = 'http://www.w3.org/2000/svg', K = 65759.1401421867, OX = 1.199706713376768, OY = 0.2830464015276702, D2R = Math.PI / 180;
const aEscena = (lon, lat) => [500 + (lon * D2R + OX) * K, 380 - (Math.log(Math.tan(Math.PI / 4 + lat * D2R / 2)) + OY) * K];
const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const COL = { ALTA: '#C0392B', MEDIA: '#E07B28', BAJA: '#D4AC0D' }, VERDE = '#1E8B4C';
const CLAVE = 'emte-campo-verificacion';
let DATA = null, activa = false, filtro = new Set(['ALTA', 'MEDIA', 'BAJA']), REG = {};
try { REG = JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch (e) {}
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(REG)); } catch (e) {} };

const css = h('style');
css.textContent = `
.cp-panel{position:absolute;right:16px;top:430px;z-index:8;width:250px;background:#fff;border:1px solid #D7DEE8;border-radius:8px;box-shadow:0 10px 26px rgba(11,29,51,.2);font:12px var(--tipo-texto,system-ui);color:#14233A}
.cp-panel[hidden]{display:none}
.cp-panel b.t{display:block;padding:7px 10px;background:#0B1D33;color:#fff;font:600 11px var(--tipo-titulo,system-ui);letter-spacing:.1em;border-radius:7px 7px 0 0;border-bottom:2px solid #B79A5B}
.cp-panel .cp-bar{height:8px;margin:8px 10px 2px;background:#EEF1F5;border-radius:4px;overflow:hidden}.cp-panel .cp-bar i{display:block;height:100%;background:${VERDE}}
.cp-panel .cp-num{padding:0 10px;font-size:11px;color:#3A4A60}
.cp-panel label{display:flex;align-items:center;gap:7px;padding:3px 10px;border:0;font-size:11.5px}
.cp-panel label i{width:12px;height:12px;border-radius:3px;flex:none}
.cp-panel label small{margin-left:auto;color:#5A6B80}
.cp-panel .cp-acc{display:flex;gap:6px;padding:8px 10px 10px}
.cp-panel .cp-acc button{flex:1;padding:6px 4px;border:1px solid #12294A;border-radius:6px;background:#12294A;color:#fff;font:600 10.5px var(--tipo-titulo,system-ui);letter-spacing:.04em;cursor:pointer}
.cp-panel .cp-acc button.sec{background:#fff;color:#12294A}
.cp-form textarea{width:100%;box-sizing:border-box;min-height:62px;padding:6px;border:1px solid #cfd6e6;border-radius:6px;font:12px var(--tipo-texto,system-ui);resize:vertical}
.cp-form .cp-si{display:flex;gap:6px;margin:4px 0 8px}.cp-form .cp-si button{flex:1;padding:7px;border:1px solid #cfd6e6;border-radius:6px;background:#f4f6fb;font-weight:700;font-size:11.5px;cursor:pointer;color:#0b1f6b}
.cp-form .cp-si button.on.si{background:#e5f5ea;border-color:#9bd3ad;color:#17703a}.cp-form .cp-si button.on.no{background:#fbeaea;border-color:#e3a3a3;color:#9b1c1c}
.cp-form .cp-gps{display:block;width:100%;margin:6px 0;padding:7px;border:1px dashed #12294A;border-radius:6px;background:#fff;color:#12294A;font-weight:700;font-size:11.5px;cursor:pointer}
.cp-form .cp-gpstxt{font-size:11px;color:#3A4A60;margin:2px 0 6px}
.gps-btn.on{background:#1F51FF!important;color:#fff!important}
.gps-aviso{position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:12;max-width:min(520px,90%);padding:8px 14px;border-radius:8px;background:#0B1D33;color:#fff;font:12px var(--tipo-texto,system-ui);box-shadow:0 8px 20px #0004}
@media(max-width:750px){.cp-panel{top:auto;bottom:250px;right:10px}}`;
document.head.append(css);

/* ---------------- capa ---------------- */
const g = document.createElementNS(NS, 'g'); g.id = 'topo-campo';
const panel = h('section', 'cp-panel'); panel.hidden = true; mapa.append(panel);
for (const t of ['pointerdown', 'click', 'wheel', 'dblclick']) panel.addEventListener(t, e => e.stopPropagation());
function simbolo(o) {
  const v = REG[o.id] && REG[o.id].ok, c = v === true ? VERDE : COL[o.prioridad];
  if (v === true) return `<circle r="8.5" fill="#fff"/><circle r="7" fill="${c}"/><path d="M-3.5 0L-1 2.8 3.8-2.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<path d="M-8.5 -8.5H8.5V8.5H-8.5Z" fill="#fff" transform="rotate(45)"/><path d="M-6.6 -6.6H6.6V6.6H-6.6Z" fill="${c}" transform="rotate(45)"/><path d="M0 -4.5V1" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cy="3.6" r="1.1" fill="#fff"/>`;
}
function dibujar() {
  g.replaceChildren(); if (!DATA || !activa) return;
  const k = 1 / scale;
  for (const o of DATA.items) {
    if (!filtro.has(o.prioridad) && !(REG[o.id] && REG[o.id].ok === true && filtro.has('OK'))) continue;
    const [x, y] = aEscena(o.lon, o.lat), m = document.createElementNS(NS, 'g');
    m.dataset.x = x; m.dataset.y = y; m.setAttribute('transform', `translate(${x} ${y}) scale(${k})`); m.style.cursor = 'pointer';
    m.innerHTML = simbolo(o) + `<title>${o.capa} · ${o.nombre || o.codigo} · ${o.problema}</title>`;
    m.addEventListener('click', e => { e.stopPropagation(); ficha(o); }); g.append(m);
  }
  scene.append(g); resumen();
}
function resumen() {
  const tot = DATA.items.length, ok = DATA.items.filter(o => REG[o.id] && REG[o.id].ok === true).length;
  const cnt = p => DATA.items.filter(o => o.prioridad === p && !(REG[o.id] && REG[o.id].ok === true)).length;
  panel.innerHTML = `<b class="t">PENDIENTES DE VERIFICAR</b><div class="cp-bar"><i style="width:${(ok / tot * 100).toFixed(1)}%"></i></div><div class="cp-num"><b>${ok}</b> de ${tot} verificados en este dispositivo</div>`
    + [['ALTA', 'Prioridad alta'], ['MEDIA', 'Prioridad media'], ['BAJA', 'Prioridad baja']].map(([p, n]) => `<label><input type="checkbox" data-p="${p}" ${filtro.has(p) ? 'checked' : ''}><i style="background:${COL[p]}"></i>${n}<small>${cnt(p)}</small></label>`).join('')
    + `<label><input type="checkbox" data-p="OK" ${filtro.has('OK') ? 'checked' : ''}><i style="background:${VERDE}"></i>Ya verificados<small>${ok}</small></label>`
    + `<div class="cp-acc"><button type="button" class="cp-exp">⬇ EXCEL</button><span class="cp-gpsx" style="flex:1;display:flex"></span><button type="button" class="sec cp-imp">⬆ IMPORTAR</button></div>`;
  panel.querySelectorAll('input[data-p]').forEach(i => i.onchange = () => { i.checked ? filtro.add(i.dataset.p) : filtro.delete(i.dataset.p); dibujar(); });
  panel.querySelector('.cp-exp').onclick = exportar;
  panel.querySelector('.cp-imp').onclick = importar;
  if (window.EMTE_EXPORTAR) { const b = window.EMTE_EXPORTAR.botonGPS('⤓ GPS', () => ({ titulo: 'Pendientes de verificar', puntos: DATA.items.filter(o => !(REG[o.id] && REG[o.id].ok === true) && filtro.has(o.prioridad)).map(o => ({ nombre: `[${o.prioridad}] ${o.nombre || o.capa + ' ' + o.codigo}`, desc: o.problema + ' · ' + o.accion, lat: o.lat, lon: o.lon, grupo: 'Pendientes ' + o.prioridad })) })); b.style.cssText = 'flex:1;padding:6px 4px;border:1px solid #12294A;border-radius:6px;background:#12294A;color:#fff;font:600 10.5px var(--tipo-titulo,system-ui);cursor:pointer'; panel.querySelector('.cp-gpsx').append(b); }
}
function ficha(o) {
  const F = window.EMTE_FICHA; if (!F) return;
  const r = REG[o.id] || {};
  const info = F.abrir('FICHA DE VERIFICACIÓN DE CAMPO', o.nombre || o.clase || o.codigo, o.capa + ' · prioridad ' + o.prioridad.toLowerCase(), [o.lon, o.lat]); if (!info) return;
  F.poner(info, F.chips([[r.ok === true ? '✔ VERIFICADO' : r.ok === false ? '✖ NO SE PUDO VERIFICAR' : '◐ PENDIENTE', r.ok === true ? 'si' : r.ok === false ? 'no' : 'med'], [o.prioridad, o.prioridad === 'ALTA' ? 'no' : 'med']]),
    F.bloque('1. DATO A VERIFICAR', [['Capa', o.capa], ['Código', o.codigo], ['Nombre', o.nombre], ['Clase', o.clase], ['Municipio', o.municipio]]),
    F.bloque('2. PROBLEMA Y ACCIÓN', [['Problema', o.problema], ['Acción sugerida', o.accion]]));
  const b = F.el('div', 'fs-blq cp-form'); b.append(F.el('h4', null, '3. REGISTRO DE CAMPO'));
  const cont = F.el('div'); cont.style.padding = '8px';
  cont.innerHTML = `<div class="cp-si"><button type="button" class="si${r.ok === true ? ' on' : ''}">✔ Verificado</button><button type="button" class="no${r.ok === false ? ' on' : ''}">✖ No se pudo</button></div>
<textarea placeholder="Observación de campo (nombre correcto, superficie, teléfono, etc.)">${(r.obs || '').replace(/</g, '&lt;')}</textarea>
<button type="button" class="cp-gps">⌖ Guardar mi posición GPS actual</button><div class="cp-gpstxt">${r.gps ? `GPS: ${r.gps[0].toFixed(6)}, ${r.gps[1].toFixed(6)} (± ${Math.round(r.gps[2])} m) · ${r.gps[3] || ''}` : 'Sin posición GPS registrada.'}</div>`;
  b.append(cont); info.append(b);
  const [bs, bn] = cont.querySelectorAll('.cp-si button'), ta = cont.querySelector('textarea'), gt = cont.querySelector('.cp-gpstxt');
  const set = cambios => { REG[o.id] = Object.assign(REG[o.id] || {}, cambios, { fecha: new Date().toLocaleString('es-BO') }); guardar(); dibujar(); };
  bs.onclick = () => { set({ ok: true }); bs.classList.add('on'); bn.classList.remove('on'); };
  bn.onclick = () => { set({ ok: false }); bn.classList.add('on'); bs.classList.remove('on'); };
  ta.addEventListener('change', () => set({ obs: ta.value }));
  cont.querySelector('.cp-gps').onclick = () => { gt.textContent = 'Buscando señal GPS…'; posicion(p => { set({ gps: [p.coords.latitude, p.coords.longitude, p.coords.accuracy, new Date().toLocaleString('es-BO')] }); gt.textContent = `GPS: ${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)} (± ${Math.round(p.coords.accuracy)} m)`; }, msg => { gt.textContent = msg; }); };
  info.append(F.pie('LO ANOTADO SE GUARDA EN ESTE DISPOSITIVO. USA «EXPORTAR A EXCEL» EN EL PANEL DE PENDIENTES PARA ENTREGARLO.'));
}
function csvCampo(v) { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function exportar() {
  const cab = ['Capa', 'Código', 'Nombre', 'Clase', 'Municipio', 'Latitud', 'Longitud', 'Problema', 'Prioridad', 'Acción sugerida', 'Verificado', 'Observación de campo', 'GPS latitud', 'GPS longitud', 'GPS precisión (m)', 'Fecha', 'ID'];
  const filas = DATA.items.map(o => { const r = REG[o.id] || {}; return [o.capa, o.codigo, o.nombre, o.clase, o.municipio, o.lat, o.lon, o.problema, o.prioridad, o.accion, r.ok === true ? 'SÍ' : r.ok === false ? 'NO' : '', r.obs || '', r.gps ? r.gps[0] : '', r.gps ? r.gps[1] : '', r.gps ? Math.round(r.gps[2]) : '', r.fecha || '', o.id]; });
  const txt = '﻿' + [cab, ...filas].map(f => f.map(csvCampo).join(';')).join('\r\n');
  const a = h('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
  a.download = 'verificacion_campo_' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function importar() {
  const i = h('input'); i.type = 'file'; i.accept = '.csv,text/csv';
  i.onchange = () => { const f = i.files[0]; if (!f) return; f.text().then(t => {
    const L = t.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean), cab = L.shift().split(';'), ix = n => cab.indexOf(n); let n = 0;
    for (const l of L) { const c = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ';' && !q) { c.push(cur); cur = ''; } else cur += ch; } c.push(cur);
      const id = c[ix('ID')], v = c[ix('Verificado')]; if (!id || !DATA.items.some(o => o.id === id)) continue;
      const r = REG[id] || {}; if (v === 'SÍ') r.ok = true; else if (v === 'NO') r.ok = false; if (c[ix('Observación de campo')]) r.obs = c[ix('Observación de campo')];
      if (c[ix('GPS latitud')]) r.gps = [+c[ix('GPS latitud')], +c[ix('GPS longitud')], +c[ix('GPS precisión (m)')] || 0, c[ix('Fecha')]]; r.fecha = c[ix('Fecha')] || r.fecha; REG[id] = r; n++; }
    guardar(); dibujar(); aviso(n + ' registros importados.');
  }); };
  i.click();
}
function poner(on) {
  activa = on; panel.hidden = !on;
  if (!on) { g.remove(); return; }
  if (DATA) dibujar(); else fetch('data/pendientes_campo.json').then(r => r.json()).then(d => { DATA = d; dibujar(); }).catch(() => { panel.innerHTML = '<b class="t">PENDIENTES DE VERIFICAR</b><p style="padding:10px">No se pudo cargar data/pendientes_campo.json</p>'; });
}
function casilla() {
  const capas = document.getElementById('layers'); if (!capas || capas.querySelector('.cp-grupo')) return;
  const grupo = h('details', 'layer-group cp-grupo'); grupo.innerHTML = '<summary>Trabajo de campo</summary>';
  const lab = h('label'), cb = h('input'), dot = h('span', 'dot sim-dot'); cb.type = 'checkbox';
  dot.innerHTML = `<svg class="sim-ico" viewBox="-11 -11 22 22" width="20" height="20"><path d="M-6.6 -6.6H6.6V6.6H-6.6Z" fill="${COL.ALTA}" transform="rotate(45)"/><path d="M0 -4.5V1" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cy="3.6" r="1.1" fill="#fff"/></svg>`; dot.dataset.sim = '1';
  lab.append(cb, dot, document.createTextNode('Pendientes de verificar')); grupo.append(lab); capas.append(grupo);
  cb.onchange = () => poner(cb.checked);
}
if (document.getElementById('layers')?.children.length) casilla();
else { const ob = new MutationObserver(() => { if (document.getElementById('layers')?.children.length) { ob.disconnect(); casilla(); } }); ob.observe(document.body, { childList: true, subtree: true }); }
window.EMTE_LEYENDA_CAMPO = () => activa ? [...['ALTA', 'MEDIA', 'BAJA'].filter(p => filtro.has(p)).map(p => ({ nombre: 'Pendiente de verificar · prioridad ' + p.toLowerCase(), tipo: 'sim', s: `<path d="M-6.6 -6.6H6.6V6.6H-6.6Z" fill="${COL[p]}" transform="rotate(45)"/>` })), { nombre: 'Verificado en campo', tipo: 'sim', s: `<circle r="7" fill="${VERDE}"/>` }] : [];

/* ---------------- GPS: mi ubicación ---------------- */
function aviso(t, ms = 5000) { const a = h('div', 'gps-aviso', t); mapa.append(a); setTimeout(() => a.remove(), ms); }
function motivo(e) {
  if (!window.isSecureContext) return 'El GPS del navegador solo funciona en la misma computadora (127.0.0.1) o con conexión segura (https).';
  return e && e.code === 1 ? 'Permiso de ubicación denegado. Actívalo en el candado de la barra de direcciones.' : e && e.code === 3 ? 'No se obtuvo señal de ubicación a tiempo. Intenta de nuevo al aire libre.' : 'No se pudo obtener la ubicación de este dispositivo.';
}
function posicion(ok, mal) { if (!navigator.geolocation) return mal('Este navegador no tiene GPS / ubicación.'); navigator.geolocation.getCurrentPosition(ok, e => mal(motivo(e)), { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }); }
const gGps = document.createElementNS(NS, 'g'); gGps.id = 'topo-gps'; gGps.setAttribute('pointer-events', 'none');
let vigila = null, primera = true, ultimaPos = null;
function pintar(p) {
  const { latitude: la, longitude: lo, accuracy: ac } = p.coords; ultimaPos = p;
  const [x, y] = aEscena(lo, la), r = ac / (2 * Math.PI * 6378137 * Math.cos(la * D2R)) * 2 * Math.PI * K;   // radio en unidades de escena
  gGps.innerHTML = `<circle cx="${x}" cy="${y}" r="${r}" fill="#1F51FF" fill-opacity=".12" stroke="#1F51FF" stroke-opacity=".5" stroke-width="1" vector-effect="non-scaling-stroke"/>`
    + `<g class="gps-yo" data-x="${x}" data-y="${y}" transform="translate(${x} ${y}) scale(${1 / scale})"><circle r="10" fill="#fff"/><circle r="7" fill="#1F51FF"/><circle r="12" fill="none" stroke="#1F51FF" stroke-width="2" opacity=".5"><animate attributeName="r" values="9;20;9" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".6;0;.6" dur="2s" repeatCount="indefinite"/></circle></g>`;
  if (!gGps.isConnected) scene.append(gGps);
  if (primera) { primera = false; const T = window.EMTE_TOPO; if (T && T.volar) { const d = .008; T.volar(lo - d, la - d, lo + d, la + d); }
    const t = window.EMTE_TOPO ? window.EMTE_TOPO.textos(la, lo) : null; aviso('Tu ubicación: ' + (t ? 'UTM ' + t.utm : la.toFixed(5) + ', ' + lo.toFixed(5)) + ` · precisión ± ${Math.round(ac)} m`); }
}
const herr = mapa.querySelector('.tools');
if (herr) {
  const b = h('button', 'gps-btn', '◎'); b.type = 'button'; b.title = 'Mi ubicación (GPS)'; b.setAttribute('aria-label', 'Mi ubicación (GPS)');
  b.onclick = e => {
    e.stopPropagation();
    if (vigila != null) { navigator.geolocation.clearWatch(vigila); vigila = null; gGps.remove(); b.classList.remove('on'); return; }
    if (!navigator.geolocation || !window.isSecureContext) { aviso(motivo()); return; }
    primera = true; b.classList.add('on'); aviso('Buscando tu ubicación…', 2500);
    vigila = navigator.geolocation.watchPosition(pintar, er => { aviso(motivo(er)); navigator.geolocation.clearWatch(vigila); vigila = null; b.classList.remove('on'); }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 });
  };
  herr.append(b);
}
window.EMTE_GPS = { ultima: () => ultimaPos };
/* ---------------- Celular: QR para entrar desde la misma red Wi-Fi ---------------- */
const pest = document.querySelector('.institution-tabs');
if (pest) {
  const b = h('button', null, '📱 Celular'); b.type = 'button';
  b.onclick = () => fetch('/api/red', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject()).then(() => window.open(window.EMTE_PUBLICO ? 'qr.html' : '/qr', '_blank'))
    .catch(() => aviso('Para entrar desde el celular, abre el geovisor con INICIAR_GEOVISOR_CELULAR.bat (misma red Wi-Fi). Luego vuelve a pulsar «Celular» para ver el código QR.', 9000));
  pest.append(b);
}
const zoomAnterior = zoom;
zoom = function (f) { zoomAnterior(f); const k = 1 / scale; g.querySelectorAll(':scope > g').forEach(m => m.setAttribute('transform', `translate(${m.dataset.x} ${m.dataset.y}) scale(${k})`)); gGps.querySelectorAll('.gps-yo').forEach(m => m.setAttribute('transform', `translate(${m.dataset.x} ${m.dataset.y}) scale(${k})`)); };
});
