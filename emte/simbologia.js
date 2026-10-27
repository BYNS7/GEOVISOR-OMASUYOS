// Simbología clasificada del Geovisor EMTE (agregado por BYNS7).
// Cada categoría tiene su propio símbolo (forma + color + pictograma) y tamaño según su importancia:
//  · Educación: insignia cuadrada (escuela, educación alternativa, instituto, universidad, normal, escuela militar).
//  · Salud: círculo rojo / símbolos médicos (hospital, centro con internación, ambulatorio, puesto, farmacia, odontología, privado).
//  · Apoyo al planeamiento: comunidades por tamaño, zonas de aterrizaje por aptitud, puentes y obras de agua por tipo.
// Los mismos íconos aparecen en «Capas del mapa», en la leyenda «Simbología» del mapa y en el PDF.
(function () {
'use strict';
const B = '#fff';
// Pictogramas en un cuadro de 20 × 20 centrado en (0,0)
const P = {
  casa: `<path d="M0-5.6L6.2-.6H4.3V5H-4.3V-.6H-6.2Z" fill="${B}"/><path d="M-1.3 5V1.8H1.3V5Z" fill="currentColor"/>`,
  libro: `<path d="M0-3.4C-2-4.9-4.6-4.9-6.2-4.1V4.6C-4.6 3.8-2 3.8 0 5.1C2 3.8 4.6 3.8 6.2 4.6V-4.1C4.6-4.9 2-4.9 0-3.4Z" fill="${B}"/><path d="M0-3.2V4.8" stroke="currentColor" stroke-width="1"/>`,
  engranaje: `<circle r="4.3" fill="none" stroke="${B}" stroke-width="2.6" stroke-dasharray="1.75 1.62"/><circle r="3.1" fill="${B}"/><circle r="1.25" fill="currentColor"/>`,
  birrete: `<path d="M0-5L7.2-1.7L0 1.6L-7.2-1.7Z" fill="${B}"/><path d="M-4.2 0V3.1C-2.6 4.6 2.6 4.6 4.2 3.1V0L0 1.9Z" fill="${B}"/><path d="M6.2-1.2V3.4" stroke="${B}" stroke-width="1.1"/>`,
  lapiz: `<path d="M-5.6 5.6L-4.6 1.8L2.9-5.7L5.7-2.9L-1.8 4.6Z" fill="${B}"/><path d="M-4.6 1.8L-1.8 4.6" stroke="currentColor" stroke-width="1"/>`,
  estrella: `<path d="M0-5.8L1.7-1.9L5.8-1.8L2.6.9L3.6 5L0 2.7L-3.6 5L-2.6.9L-5.8-1.8L-1.7-1.9Z" fill="${B}"/>`,
  cruz: `<path d="M-1.7-5.2H1.7V-1.7H5.2V1.7H1.7V5.2H-1.7V1.7H-5.2V-1.7H-1.7Z" fill="${B}"/>`,
  cruzR: `<path d="M-1.4-4.2H1.4V-1.4H4.2V1.4H1.4V4.2H-1.4V1.4H-4.2V-1.4H-1.4Z" fill="#D73027"/>`,
  H: `<path d="M-4.2-5.2V5.2M4.2-5.2V5.2M-4.2 0H4.2" stroke="${B}" stroke-width="2.6" fill="none"/>`,
  diente: `<path d="M-3.8-3.4C-3.8-5.5-1.5-5.6 0-4.6C1.5-5.6 3.8-5.5 3.8-3.4C3.8-1.5 3.1-.5 2.7 1.6L2.1 4.6C1.9 5.6 1 5.4.9 4.4L.4 1.9C.3 1.2-.3 1.2-.4 1.9L-.9 4.4C-1 5.4-1.9 5.6-2.1 4.6L-2.7 1.6C-3.1-.5-3.8-1.5-3.8-3.4Z" fill="${B}"/>`
};
// Cuadrado redondeado como trazo (no <rect>: index.html reescala los <rect> de la capa educativa).
const cuadro = (t, r) => `M${-t + r} ${-t}H${t - r}Q${t} ${-t} ${t} ${-t + r}V${t - r}Q${t} ${t} ${t - r} ${t}H${-t + r}Q${-t} ${t} ${-t} ${t - r}V${-t + r}Q${-t} ${-t} ${-t + r} ${-t}Z`;
const insignia = (color, glifo, t = 8) => `<g color="${color}"><path d="${cuadro(t, t * .28)}" fill="${color}" stroke="${B}" stroke-width="1.4"/><g transform="scale(${t / 8})">${glifo}</g></g>`;
const circulo = (color, glifo, r = 7.5, anillo) => `<g color="${color}">${anillo ? `<circle r="${r + 2.2}" fill="none" stroke="${anillo}" stroke-width="1.8"/>` : ''}<circle r="${r}" fill="${color}" stroke="${B}" stroke-width="1.4"/><g transform="scale(${r / 7.5})">${glifo}</g></g>`;

const EDU = {
  'ESCUELA / UNIDAD EDUCATIVA': { n: 'Unidad educativa', s: insignia('#6A3D9A', P.casa, 7.2) },
  'EDUCACIÓN ALTERNATIVA / ESPECIAL': { n: 'Educación alternativa / especial', s: insignia('#13818A', P.libro, 7.6) },
  'INSTITUTO TÉCNICO': { n: 'Instituto técnico tecnológico', s: insignia('#C26A00', P.engranaje, 8) },
  'UNIVERSIDAD': { n: 'Universidad', s: insignia('#12294A', P.birrete, 8.6) },
  'NORMAL (FORMACIÓN DE MAESTROS)': { n: 'Formación de maestros (ESFM)', s: insignia('#A0336B', P.lapiz, 8.6) },
  'ESCUELA MILITAR': { n: 'Escuela militar', s: insignia('#4B5320', P.estrella, 8.6) }
};
const SAL = {
  'HOSPITAL 2DO NIVEL': { n: 'Hospital de 2.º nivel', s: insignia('#B0231E', P.H, 9.4) },
  'CENTRO DE SALUD CON INTERNACIÓN': { n: 'Centro de salud con internación', s: circulo('#D73027', P.cruz, 7.6, '#8E1B1B') },
  'CENTRO DE SALUD AMBULATORIO': { n: 'Centro de salud ambulatorio', s: circulo('#D73027', P.cruz, 6.8) },
  'PUESTO DE SALUD': { n: 'Puesto de salud', s: `<circle r="5.8" fill="${B}" stroke="#D73027" stroke-width="2"/><g transform="scale(.9)">${P.cruzR}</g>` },
  'CENTRO PRIVADO / ONG': { n: 'Centro privado / ONG', s: circulo('#8E44AD', P.cruz, 6.6) },
  'FARMACIA': { n: 'Farmacia', s: insignia('#1E8B4C', P.cruz, 6.2) },
  'CONSULTORIO ODONTOLÓGICO': { n: 'Consultorio odontológico', s: circulo('#0E7C86', P.diente, 6.4) }
};
const ZONA = { 'Apta (≥ 35 m)': '#1E8B4C', 'Restringida (25–35 m)': '#C77C0E', 'No apta (< 25 m)': '#7A8594', 'Sin dimensiones': '#7A8594', 'Helipuerto': '#1F5AA6' };
const AGUA = {
  'Presa': `<path d="M-7-4H7L5 5H-5Z" fill="#1F78B4" stroke="${B}" stroke-width="1.3"/><path d="M-3.5 0Q-1.7-1.6 0 0T3.5 0" stroke="${B}" stroke-width="1.3" fill="none"/>`,
  'Azud / toma': `<path d="M0-6.5L6.5 5H-6.5Z" fill="#1F78B4" stroke="${B}" stroke-width="1.3"/><path d="M-2.6 2Q-1.3 .8 0 2T2.6 2" stroke="${B}" stroke-width="1.1" fill="none"/>`,
  'Tanque elevado': `<rect x="-5.5" y="-6.5" width="11" height="7" rx="1.5" fill="#1F78B4" stroke="${B}" stroke-width="1.3"/><path d="M-3.5.5L-4.5 6.5M3.5.5L4.5 6.5" stroke="#1F78B4" stroke-width="1.8"/>`,
  'Reservorio cubierto': `<rect x="-6.5" y="-4.5" width="13" height="9" rx="4.5" fill="#1F78B4" stroke="${B}" stroke-width="1.3"/>`,
  '_': `<path d="M0-8C4-2 6 1 6 3.5A6 6 0 0 1-6 3.5C-6 1-4-2 0-8Z" fill="#1F78B4" stroke="${B}" stroke-width="1.3"/>`
};
function apoyo(capa, f) {
  if (capa === 'comunidades') { const r = f[3] === 'Pueblo' ? 6.2 : f[3] === 'Comunidad' ? 4.4 : 3.3; return `<circle r="${r}" fill="${B}" stroke="#5B3A1E" stroke-width="1.8"/><circle r="${r * .42}" fill="#5B3A1E"/>`; }
  if (capa === 'zonas') { const c = ZONA[f[7]] || '#7A8594'; return `<circle r="7.6" fill="${c}" stroke="${B}" stroke-width="1.5"/><path d="M-3.2-4V4M3.2-4V4M-3.2 0H3.2" stroke="${B}" stroke-width="2" fill="none"/>`; }
  if (capa === 'puentes') return `<rect x="-8.5" y="-3.6" width="17" height="7.2" fill="${B}" fill-opacity=".9"/><path d="M-8-3.5h16M-8 3.5h16M-8-3.5l-3-3M8-3.5l3-3M-8 3.5l-3 3M8 3.5l3 3" stroke="#2B2B2B" stroke-width="1.8" fill="none"/>`;
  return AGUA[f[3]] || AGUA._;
}
const icono = (markup, tam = 18) => `<svg class="sim-ico" viewBox="-11 -11 22 22" width="${tam}" height="${tam}" aria-hidden="true">${markup}</svg>`;
window.EMTE_SIMBOLOS = { EDU, SAL, ZONA, AGUA, apoyo, icono };

/* ---------- estilos ---------- */
const css = document.createElement('style');
css.textContent = `
.dot.sim-dot{width:18px!important;height:18px!important;background:none!important;border:0!important;box-shadow:none!important;border-radius:0!important;display:inline-grid!important;place-items:center;flex:none}
.dot.sim-dot svg{display:block;overflow:visible;width:18px!important;height:18px!important}
.sim-card svg.sim-ico{width:20px!important;height:20px!important;flex:none;overflow:visible}
#education .sim,#health .sim{filter:drop-shadow(0 1px 1.2px rgba(0,0,0,.35))}
.sim-btn{position:absolute;right:16px;top:272px;z-index:8;display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid var(--borde,#D7DEE8);border-radius:6px;background:#fff;color:#12294A;font:600 11.5px var(--tipo-titulo,system-ui);letter-spacing:.06em;box-shadow:0 2px 8px rgba(11,29,51,.12);cursor:pointer}
.sim-btn:hover{background:#EEF2F8}
.sim-card{position:absolute;right:16px;top:312px;z-index:8;width:262px;max-height:calc(100% - 520px);min-height:120px;overflow:auto;background:#fff;border:1px solid #D7DEE8;border-radius:8px;box-shadow:0 10px 28px rgba(11,29,51,.2);font:12px var(--tipo-texto,system-ui);color:#14233A}
.sim-card[hidden]{display:none}
.sim-card h5{margin:0;padding:8px 12px 6px;font:700 10px var(--tipo-titulo,system-ui);letter-spacing:.14em;color:#5A6B80;text-transform:uppercase;border-top:1px solid #E3E8EF;background:#F8FAFC}
.sim-card h5:first-child{border-top:0}
.sim-card .fila{display:flex;align-items:center;gap:9px;padding:4px 12px}
.sim-card .fila span{flex:1}.sim-card .fila small{color:#8A93A5;font-variant-numeric:tabular-nums}
.sim-card .vacio{padding:12px;color:#5A6B80}
@media(max-width:750px){.sim-btn{top:auto;bottom:206px}.sim-card{top:auto;bottom:246px;max-height:45vh}}`;
document.head.append(css);

/* ---------- símbolos sobre el mapa ---------- */
const NS = 'http://www.w3.org/2000/svg', TAM = 1.15; // tamaño de los símbolos en pantalla
const conteo = { education: new Map(), health: new Map() };
function simbolizar(grupoId, tabla, feats) {
  const g = document.getElementById(grupoId); if (!g) return;
  const fs = feats(); const c = conteo[grupoId]; c.clear();
  [...g.children].forEach((m, i) => {
    const cat = fs[i]?.properties?.categoria || ''; c.set(cat, (c.get(cat) || 0) + 1);
    if (m.dataset.sim === cat) return;
    const def = tabla[cat]; if (!def) return;
    m.querySelectorAll(':scope > rect, :scope > path.health-symbol, :scope > .sim').forEach(n => n.remove());
    const s = document.createElementNS(NS, 'g'); s.setAttribute('class', 'sim'); s.setAttribute('transform', `scale(${TAM / scale})`); s.innerHTML = def.s;
    const t = document.createElementNS(NS, 'title'); t.textContent = (fs[i].properties.nombre || '') + ' · ' + def.n; s.append(t);
    m.append(s); m.dataset.sim = cat;
  });
  iconosLista(grupoId, tabla); leyenda();
}
function escalar() { const k = `scale(${TAM / scale})`; document.querySelectorAll('#education .sim, #health .sim').forEach(s => s.setAttribute('transform', k)); }
const feat = { education: () => (typeof educationFeatures !== 'undefined' ? educationFeatures : []), health: () => (typeof healthFeatures !== 'undefined' ? healthFeatures : []) };
const TABLAS = { education: EDU, health: SAL };
function preparar(id) {
  const g = document.getElementById(id); if (!g) return;
  const run = () => { if (g.children.length && feat[id]().length) simbolizar(id, TABLAS[id], feat[id]); };
  new MutationObserver(run).observe(g, { childList: true }); run();
}

/* ---------- íconos en «Capas del mapa» ---------- */
function ponerIcono(dot, markup) { if (!dot || dot.dataset.sim) return; dot.classList.add('sim-dot'); dot.innerHTML = icono(markup); dot.dataset.sim = '1'; }
function iconosLista(id, tabla) {
  const master = document.querySelector(`#layers input[onchange*="${id}"]`) || [...document.querySelectorAll('#layers label')].find(l => /Establecimientos de salud|Centros educativos/.test(l.textContent) && l.textContent.includes(id === 'health' ? 'salud' : 'educativos'))?.querySelector('input');
  const lab = master?.closest('label');
  if (lab) ponerIcono(lab.querySelector('.dot'), id === 'health' ? SAL['CENTRO DE SALUD AMBULATORIO'].s : EDU['ESCUELA / UNIDAD EDUCATIVA'].s);
  const menu = lab?.nextElementSibling; if (!menu) return;
  menu.querySelectorAll('label').forEach(row => { const name = row.children[2]?.textContent; if (tabla[name]) { ponerIcono(row.querySelector('.dot'), tabla[name].s); row.children[2].title = tabla[name].n; } });
}
function iconosApoyo() {
  const MAP = { 'Comunidades': apoyo('comunidades', [0, 0, 0, 'Comunidad']), 'Posibles zonas de aterrizaje': apoyo('zonas', [0, 0, 0, 0, 0, 0, 0, 'Apta (≥ 35 m)']), 'Puentes': apoyo('puentes', []), 'Fuentes y obras de agua': AGUA.Presa };
  document.querySelectorAll('#layers label').forEach(l => { for (const k in MAP) if (l.textContent.trim().startsWith(k)) ponerIcono(l.querySelector('.dot'), MAP[k]); });
}

/* ---------- leyenda «Simbología» sobre el mapa ---------- */
let btn, card, abierta = false;
try { abierta = localStorage.getItem('emte-simbologia') === '1'; } catch (e) {}
function leyenda() {
  if (!card) return;
  const secc = [];
  const visible = id => { const g = document.getElementById(id); return g && g.style.display !== 'none' && g.children.length; };
  const lista = (tabla, cnt, grupo) => Object.entries(tabla).filter(([k]) => cnt.get(k)).filter(([k]) => { const g = document.getElementById(grupo); return [...g.children].some(m => m.dataset.sim === k && m.style.display !== 'none'); }).map(([k, d]) => `<div class="fila">${icono(d.s, 20)}<span>${d.n}</span><small>${cnt.get(k)}</small></div>`).join('');
  if (visible('health')) { const l = lista(SAL, conteo.health, 'health'); if (l) secc.push('<h5>Salud</h5>' + l); }
  if (visible('education')) { const l = lista(EDU, conteo.education, 'education'); if (l) secc.push('<h5>Educación</h5>' + l); }
  const ap = document.getElementById('topo-apoyo');
  if (ap && ap.isConnected && ap.childElementCount) {
    const has = sel => [...document.querySelectorAll('#layers label')].some(l => l.textContent.trim().startsWith(sel) && l.querySelector('input')?.checked);
    let l = '';
    if (has('Comunidades')) l += ['Pueblo', 'Comunidad', 'Caserío'].map(t => `<div class="fila">${icono(apoyo('comunidades', [0, 0, 0, t]), 20)}<span>${t}</span></div>`).join('');
    if (has('Posibles zonas')) l += ['Apta (≥ 35 m)', 'Restringida (25–35 m)', 'No apta (< 25 m)'].map(t => `<div class="fila">${icono(apoyo('zonas', [0, 0, 0, 0, 0, 0, 0, t]), 20)}<span>Zona de aterrizaje: ${t.toLowerCase()}</span></div>`).join('');
    if (has('Puentes')) l += `<div class="fila">${icono(apoyo('puentes', []), 20)}<span>Puente</span></div>`;
    if (has('Fuentes y obras')) l += ['Presa', 'Azud / toma', 'Tanque elevado', 'Reservorio cubierto'].map(t => `<div class="fila">${icono(AGUA[t], 20)}<span>${t}</span></div>`).join('');
    if (l) secc.push('<h5>Apoyo al planeamiento</h5>' + l);
  }
  const mu = window.EMTE_LEYENDA_MUNICIPIOS ? window.EMTE_LEYENDA_MUNICIPIOS() : [];
  if (mu.length) secc.unshift('<h5>Límites territoriales</h5>' + mu.map(m => m.tipo === 'sim' ? `<div class="fila">${icono(m.s, 20)}<span>${m.nombre}</span></div>` : m.tipo === 'linea'
    ? `<div class="fila"><svg class="sim-ico" viewBox="-11 -11 22 22" width="20" height="20"><path d="M-10 0H10" stroke="#fff" stroke-width="5"/><path d="M-10 0H10" stroke="${m.color}" stroke-width="2.6"/></svg><span>${m.nombre}</span></div>`
    : `<div class="fila"><svg class="sim-ico" viewBox="-11 -11 22 22" width="20" height="20"><rect x="-9" y="-7" width="18" height="14" rx="2" fill="${m.color}" fill-opacity=".35" stroke="${m.color}" stroke-width="1.6" stroke-dasharray="4 2"/></svg><span>${m.nombre.replace('Municipio ', '')}</span></div>`).join(''));
  const vv = window.EMTE_VIAS ? window.EMTE_VIAS.leyenda() : [];
  if (vv.length) secc.push('<h5>Red vial</h5>' + vv.map(v => `<div class="fila">${icono(v.s, 20)}<span>${v.nombre}</span>${v.n ? `<small>${v.n.toLocaleString('es-BO')}</small>` : ''}</div>`).join(''));
  for (const [tit, fn] of [['Relieve', () => [...(window.EMTE_LEYENDA_CERROS ? window.EMTE_LEYENDA_CERROS() : []), ...(window.EMTE_LEYENDA_PENDIENTES ? window.EMTE_LEYENDA_PENDIENTES() : [])]], ['Cobertura de salud', () => window.EMTE_LEYENDA_COBERTURA ? window.EMTE_LEYENDA_COBERTURA() : []], ['Trabajo de campo', () => window.EMTE_LEYENDA_CAMPO ? window.EMTE_LEYENDA_CAMPO() : []]]) {
    const it = fn(); if (!it.length) continue;
    secc.push(`<h5>${tit}</h5>` + it.map(m => `<div class="fila">${m.tipo === 'sim' ? icono(m.s, 20) : `<svg class="sim-ico" viewBox="-11 -11 22 22" width="20" height="20"><rect x="-9" y="-7" width="18" height="14" rx="2" fill="${m.color}" fill-opacity=".6" stroke="${m.color}"/></svg>`}<span>${m.nombre}</span></div>`).join(''));
  }
  card.innerHTML = secc.join('') || '<p class="vacio">Enciende capas de salud, educación, vías o apoyo al planeamiento para ver su simbología.</p>';
}
window.EMTE_SIMB_REFRESCAR = () => leyenda();
function montarLeyenda() {
  const mapa = document.querySelector('.map'); if (!mapa) return;
  btn = document.createElement('button'); btn.type = 'button'; btn.className = 'sim-btn'; btn.innerHTML = '◧ SIMBOLOGÍA'; btn.setAttribute('aria-expanded', String(abierta));
  card = document.createElement('section'); card.className = 'sim-card'; card.hidden = !abierta; card.setAttribute('aria-label', 'Simbología del mapa');
  btn.onclick = () => { abierta = !abierta; card.hidden = !abierta; btn.setAttribute('aria-expanded', String(abierta)); try { localStorage.setItem('emte-simbologia', abierta ? '1' : '0'); } catch (e) {} leyenda(); };
  for (const t of ['pointerdown', 'click', 'dblclick', 'wheel']) { btn.addEventListener(t, e => e.stopPropagation()); card.addEventListener(t, e => e.stopPropagation()); }
  mapa.append(btn, card); leyenda();
  document.getElementById('layers')?.addEventListener('change', () => setTimeout(leyenda, 50));
}

document.addEventListener('DOMContentLoaded', () => {
  preparar('education'); preparar('health'); montarLeyenda(); iconosApoyo();
  // La lista de categorías se vuelve a dibujar al cambiar las capas: se reponen los íconos.
  const capas = document.getElementById('layers');
  if (capas) { let t = 0; new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { iconosLista('education', EDU); iconosLista('health', SAL); iconosApoyo(); }, 30); }).observe(capas, { childList: true, subtree: true }); }
  const zoomAnterior = zoom; zoom = function (f) { zoomAnterior(f); escalar(); };
});
})();
