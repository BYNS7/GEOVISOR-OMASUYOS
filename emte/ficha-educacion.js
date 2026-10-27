/* Ficha del centro educativo (agregado por BYNS7), con el mismo diseño que la ficha de salud.
   Orden: lo más importante arriba (resumen y datos principales); el detalle queda en secciones plegables.
   Solo se muestran los campos con dato. Datos: capa de centros educativos (Ministerio de Educación – SIE).
   Usa los estilos fs-* de ficha-salud.js. */
(function () {
'use strict';
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const vacio = v => v == null || /^(\s*|s\/n|sin dato|null|none|no aplica)$/i.test(String(v).trim());
const miles = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const titulo = t => String(t).toLowerCase().replace(/(^|[\s(/-])([a-záéíóúñü])/g, (m, a, b) => a + b.toUpperCase());

/* ---------- limpieza de textos ---------- */
function niveles(t) {
  if (vacio(t)) return null;
  const s = String(t), out = [];
  if (/Inicial/i.test(s)) out.push('Inicial');
  if (/Primaria Comunitaria/i.test(s)) out.push('Primaria');
  if (/Secundaria Comunitaria/i.test(s)) out.push('Secundaria');
  if (/EPA|Primaria de Personas/i.test(s)) out.push('Primaria de jóvenes y adultos');
  if (/ESA|Secundaria \(ESA\)/i.test(s)) out.push('Secundaria de jóvenes y adultos');
  if (/T[eé]cnica|Técnico/i.test(s) && !out.length) out.push('Formación técnica');
  return out.length ? out.join(' · ') : s.replace(/^[^:]*:\s*/, '');
}
const telefono = t => { if (vacio(t)) return null; const n = String(t).replace(/S\s*\/\s*N/gi, '').split('/').map(x => x.trim()).filter(x => !vacio(x)); return n.length ? n.join(' · ') : null; };
const num = v => vacio(v) ? null : +v;

/* ---------- estilos ---------- */
const css = document.createElement('style');
css.textContent = `
.fe-kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin:10px 0 2px;background:#D7DEE8;border:1px solid #D7DEE8;border-radius:7px;overflow:hidden}
.fe-kpi div{background:#fff;padding:7px 6px;text-align:center}
.fe-kpi b{display:block;font:700 16px var(--tipo-titulo,system-ui);color:#12294A}
.fe-kpi span{font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:#5A6B80}
.fe-princ .fs-row b{width:auto}
.fe-princ .fs-row span{font-weight:600;color:#14233A}
details.fe-mas{margin-top:8px;border:1px solid #e1e4ee;border-radius:7px;overflow:hidden;background:#fff}
details.fe-mas>summary{list-style:none;cursor:pointer;padding:6px 9px;font-size:11px;font-weight:700;letter-spacing:.5px;color:#12294A;background:#F1F4F9;text-transform:uppercase;display:flex;align-items:center;gap:6px}
details.fe-mas>summary::-webkit-details-marker{display:none}
details.fe-mas>summary:before{content:'▸';color:#B79A5B}
details.fe-mas[open]>summary:before{content:'▾'}
details.fe-mas .fs-blq{margin:0;border:0;border-radius:0}
details.fe-mas svg{display:block;width:100%;height:auto}
.fe-var{padding:5px 8px;font-size:11px;color:#5A6B80;border-top:1px solid #eef0f5}
.fe-link{display:block;margin-top:10px;text-align:center;font-size:11.5px;font-weight:700;color:#12294A}
.fe-src{margin:8px 0 0;font-size:10px;color:#6b7187;text-align:center;line-height:1.5}`;
document.head.append(css);

function tabla(titulo, filas, cls) {
  const f = filas.filter(([, v]) => !vacio(v)); if (!f.length) return null;
  const b = el('div', 'fs-blq' + (cls ? ' ' + cls : '')); if (titulo) b.append(el('h4', null, titulo));
  for (const [k, v] of f) { const r = el('div', 'fs-row'); r.append(el('b', null, k), el('span', null, String(v))); b.append(r); }
  return b;
}
function plegable(titulo, contenido, abierto) {
  if (!contenido) return null;
  const d = el('details', 'fe-mas'); d.open = !!abierto; d.append(el('summary', null, titulo), contenido); return d;
}
function grafico(p) {
  const A = [2021, 2022, 2023, 2024, 2025], V = A.map(a => +p['est_' + a] || 0);
  if (!V.some(Boolean)) return null;
  const W = 340, H = 118, ml = 30, mb = 20, mt = 16, max = Math.max(...V) * 1.15 || 1, bw = (W - ml - 10) / A.length;
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Bahnschrift,Segoe UI,system-ui" font-size="10">`;
  for (let i = 0; i <= 2; i++) { const y = mt + (H - mt - mb) * i / 2, v = max * (1 - i / 2); s += `<line x1="${ml}" x2="${W - 6}" y1="${y}" y2="${y}" stroke="#EEF1F5"/><text x="${ml - 4}" y="${y + 3}" text-anchor="end" fill="#8A93A5">${Math.round(v)}</text>`; }
  A.forEach((a, i) => {
    const x = ml + 6 + i * bw, hgt = V[i] / max * (H - mt - mb), y = H - mb - hgt;
    s += `<rect x="${x}" y="${y}" width="${bw - 12}" height="${hgt}" rx="2" fill="${i === A.length - 1 ? '#12294A' : '#7F95B5'}"/><text x="${x + (bw - 12) / 2}" y="${y - 4}" text-anchor="middle" font-weight="700" fill="#12294A">${V[i]}</text><text x="${x + (bw - 12) / 2}" y="${H - 6}" text-anchor="middle" fill="#5A6B80">${a}</text>`;
  });
  const g = el('div'); g.innerHTML = s + '</svg>';
  const i0 = V.findIndex(Boolean), v0 = V[i0], v1 = V[V.length - 1];
  if (v0 && i0 < V.length - 1) { const pc = (v1 - v0) / v0 * 100; g.append(el('div', 'fe-var', `Variación ${A[i0]}–2025: ${pc >= 0 ? '+' : ''}${pc.toFixed(0)} % (${v0} → ${v1} estudiantes)`)); }
  return g;
}

function seleccionar(f) {
  const F = window.EMTE_FICHA, p = f.properties || {}; if (!F) return;
  const [lon, lat] = (f.geometry && f.geometry.coordinates) || [];
  const info = F.abrir('FICHA DE CENTRO EDUCATIVO', p.nombre || 'Centro educativo sin nombre', p.tipo, [lon, lat]); if (!info) return;
  const fiscal = /fiscal|p[uú]blic/i.test(p.dependencia || ''), bth = /^si/i.test(p.bth || '') || (/BTH|Técnico Humanístico: SI/i.test(p.especialidad || '') && !/sin dato/i.test(p.especialidad || ''));
  const est = num(p.est_2025) ?? num(p.est_2024), nv = niveles(p.niveles);
  F.poner(info, F.chips([
    [vacio(p.dependencia) ? null : String(p.dependencia).split('(')[0].trim().toUpperCase(), fiscal ? 'si' : 'med'],
    [vacio(p.area) ? null : String(p.area).toUpperCase(), 'no'],
    [est != null ? '✔ ' + miles(est) + ' ESTUDIANTES' : null, 'si'],
    [bth ? '✔ BACHILLERATO TÉCNICO' : null, 'si']]));
  const municipio = p.municipio_ine && !/FUERA/i.test(p.municipio_ine) ? p.municipio_ine : p.municipio_sie;
  const g = grafico(p); let gb = null;
  if (g) { gb = F.el('div', 'fs-blq fs-graf'); gb.append(F.el('h4', null, '6. MATRÍCULA 2021 – 2025')); g.querySelectorAll('.fe-var').forEach(x => x.className = 'fs-var'); gb.append(g); }
  F.poner(info,
    F.bloque('1. IDENTIFICACIÓN', [['Nombre', p.nombre], ['Código RUE', p.rue], ['Tipo', p.tipo], ['Categoría', p.categoria ? titulo(p.categoria) : null], ['Dependencia', p.dependencia], ['Subsistema', p.subsistema]]),
    F.bloque('2. OFERTA EDUCATIVA', [['Niveles', nv], ['Turno', vacio(p.turnos) ? null : titulo(p.turnos)], ['Estudiantes', est != null ? miles(est) + (p.est_2025 != null ? ' (2025)' : ' (2024)') : null], ['Especialidad', /sin dato/i.test(p.especialidad || '') ? null : p.especialidad]]),
    F.bloque('3. INFRAESTRUCTURA', [['Aulas', p.aulas], ['Laboratorios', +p.laboratorios ? p.laboratorios : null], ['Bibliotecas', +p.bibliotecas ? p.bibliotecas : null], ['Salas de computación', +p.salas_computacion ? p.salas_computacion : null], ['Talleres', +p.talleres ? p.talleres : null]]),
    F.bloque('4. UBICACIÓN Y CONTACTO', [['Director(a)', vacio(p.director) ? null : titulo(p.director)], ['Teléfono', telefono(p.telefono)], ['Dirección', vacio(p.direccion) ? null : titulo(p.direccion)],
      ['Municipio', vacio(municipio) ? null : titulo(municipio)], ['Distrito educativo', vacio(p.distrito) || p.distrito === municipio ? null : titulo(p.distrito)], ...F.ubicacion(lon, lat), ['Precisión', p.precision_dato]]),
    F.cercanos(lon, lat, f, '5. LO MÁS CERCANO'),
    gb);
  if (p.enlace && /^https:\/\//.test(p.enlace)) info.append(F.boton('VER FICHA OFICIAL EN EL SIE ↗', () => window.open(p.enlace, '_blank', 'noopener')));
  const fuente = p.fuente || 'Ministerio de Educación – SIE';
  info.append(F.pie(`FUENTE: ${fuente}${p.gestion && !/gesti[oó]n/i.test(fuente) ? ' · GESTIÓN ' + p.gestion : ''}`.toUpperCase()));
}
window.selectEducation = seleccionar;
})();
