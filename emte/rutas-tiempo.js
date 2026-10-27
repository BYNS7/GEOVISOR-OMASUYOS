/* Rutas con tiempo estimado (agregado por BYNS7).
   Calcula la ruta en el propio navegador sobre la capa de vías (funciona sin conexión y sin PostGIS):
   · Modo VEHÍCULO: usa carreteras, caminos y calles; evita caminos de herradura, sendas y tramos intransitables.
   · Modo A PIE: usa toda la red a 4,5 km/h.
   La velocidad depende de la clase de vía, la superficie y el estado (valores de referencia, no oficiales). */
document.addEventListener('DOMContentLoaded', () => {
'use strict';
const NS = 'http://www.w3.org/2000/svg', K = 65759.1401421867, OX = 1.199706713376768, OY = 0.2830464015276702, D2R = Math.PI / 180;
const VEL = { 'Carretera RVF': 70, 'Carretera principal (no RVF)': 50, 'Camino secundario': 40, 'Camino terciario': 30, 'Camino vecinal': 25, 'Calle': 20, 'Camino de herradura / brecha': 0, 'Sendero / peatonal': 0 };
const A_PIE = 4.5;
function velocidad(p, modo) {
  if (/intransitable/i.test(p.estado || '')) return 0;
  if (modo === 'pie') return A_PIE;
  let v = VEL[p.tipo_via]; if (!v) return 0;
  const s = String(p.superficie || ''), e = String(p.estado || '');
  if (/tierra|sin pavimentar/i.test(s) && v > 35) v = 35;
  if (/ripio/i.test(s) && v > 45) v = 45;
  if (/construcci/i.test(e)) v *= .6;
  else if (/muy malo|horrible/i.test(e)) v *= .4;
  else if (/malo/i.test(e)) v *= .6;
  else if (/regular/i.test(e)) v *= .8;
  return v;
}
const km = (a, b) => { const dl = (b[1] - a[1]) * D2R, dn = (b[0] - a[0]) * D2R, q = Math.sin(dl / 2) ** 2 + Math.cos(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.sin(dn / 2) ** 2; return 2 * 6371.0088 * Math.asin(Math.sqrt(q)); };
const llave = c => c[0].toFixed(6) + ',' + c[1].toFixed(6);

/* ---------- grafo ---------- */
let G = null;
function grafo() {
  if (G) return G;
  const id = new Map(), XY = [], ady = [];
  const nodo = c => { const k = llave(c); let i = id.get(k); if (i == null) { i = XY.length; id.set(k, i); XY.push([+c[0], +c[1]]); ady.push([]); } return i; };
  const abc = fi => /Carretera/i.test(roadFeatures[fi].properties.tipo_via || '') && /ABC/i.test(roadFeatures[fi].properties.observacion || '');
  roadFeatures.forEach((f, fi) => {
    const densa = abc(fi);
    for (const l of f.geometry.coordinates) for (let i = 1; i < l.length; i++) {
      let pts = [l[i - 1], l[i]];
      if (densa) { const L = km(l[i - 1], l[i]), n = Math.ceil(L / .04); pts = []; for (let k = 0; k <= n; k++) pts.push([l[i - 1][0] + (l[i][0] - l[i - 1][0]) * k / n, l[i - 1][1] + (l[i][1] - l[i - 1][1]) * k / n]); }
      for (let k = 1; k < pts.length; k++) { const a = nodo(pts[k - 1]), b = nodo(pts[k]); if (a === b) continue; const d = km(XY[a], XY[b]); ady[a].push([b, d, fi]); ady[b].push([a, d, fi]); }
    }
  });
  // celdas para buscar el nodo más cercano
  const celdas = new Map(), T = .01;
  XY.forEach((c, i) => { const k = Math.floor(c[0] / T) + ',' + Math.floor(c[1] / T); (celdas.get(k) || celdas.set(k, []).get(k)).push(i); });
  // La Red Vial Fundamental viene de la ABC y no comparte nodos con los caminos de OSM:
  // se unen sus vértices con el nodo de otra vía más cercano (hasta 60 m) y los extremos sueltos (hasta 25 m).
  const esRVF = abc;
  const rvf = new Uint8Array(XY.length); ady.forEach((l, i) => { if (l.some(([, , fi]) => esRVF(fi))) rvf[i] = 1; });
  const unir = (i, lim, cond) => {
    const c = XY[i], cx = Math.floor(c[0] / T), cy = Math.floor(c[1] / T); let best = -1, dm = lim;
    for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) for (const j of celdas.get(x + ',' + y) || []) {
      if (j === i || !cond(j)) continue; const d = km(c, XY[j]); if (d < dm) { dm = d; best = j; }
    }
    if (best >= 0 && !ady[i].some(([v]) => v === best)) { const fi = ady[best][0] ? ady[best][0][2] : ady[i][0][2]; ady[i].push([best, dm, fi]); ady[best].push([i, dm, fi]); return 1; }
    return 0;
  };
  let uniones = 0; const n0 = XY.length;
  for (let i = 0; i < n0; i++) if (!rvf[i]) uniones += unir(i, .04, j => rvf[j]);
  for (let i = 0; i < n0; i++) if (ady[i].length === 1) uniones += unir(i, .025, j => !ady[i].some(([v]) => v === j) && j !== ady[i][0][0]);
  G = { XY, ady, celdas, T, uniones };
  return G;
}
function cercano(pt, modo) {
  const { XY, ady, celdas, T } = grafo(); let best = -1, dm = Infinity;
  const cx = Math.floor(pt[0] / T), cy = Math.floor(pt[1] / T);
  for (let r = 0; r <= 3 && best < 0; r++) for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) {
    for (const i of celdas.get(x + ',' + y) || []) {
      if (!ady[i].some(([, , fi]) => velocidad(roadFeatures[fi].properties, modo) > 0)) continue;
      const d = km(pt, XY[i]); if (d < dm) { dm = d; best = i; }
    }
  }
  return best < 0 ? null : [best, dm];
}
function dijkstra(s, t, modo) {
  const { XY, ady } = grafo(), n = XY.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), pf = new Int32Array(n).fill(-1);
  const H = [[0, s]]; dist[s] = 0;
  const push = x => { H.push(x); let i = H.length - 1; while (i) { const p = (i - 1) >> 1; if (H[p][0] <= H[i][0]) break; [H[p], H[i]] = [H[i], H[p]]; i = p; } };
  const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === i) break; [H[m], H[i]] = [H[i], H[m]]; i = m; } } return top; };
  while (H.length) {
    const [d, u] = pop(); if (d > dist[u]) continue; if (u === t) break;
    for (const [v, L, fi] of ady[u]) { const vel = velocidad(roadFeatures[fi].properties, modo); if (!vel) continue; const nd = d + L / vel; if (nd < dist[v]) { dist[v] = nd; prev[v] = u; pf[v] = fi; push([nd, v]); } }
  }
  if (!isFinite(dist[t])) return null;
  const nodos = [], tramos = []; for (let v = t; v !== -1; v = prev[v]) { nodos.push(v); if (prev[v] !== -1) tramos.push([prev[v], v, pf[v]]); }
  return { horas: dist[t], nodos: nodos.reverse(), tramos: tramos.reverse() };
}

/* ---------- interfaz: se integra al panel «Ruta por distancia» existente ---------- */
const panel = document.querySelector('.route-panel'), btn = document.getElementById('calculate-route'), res = document.getElementById('route-result'), grupo = document.getElementById('route');
if (!panel || !btn || !res || !grupo) return;
const h2 = panel.querySelector('h2'); if (h2) h2.textContent = 'Ruta y tiempo estimado';
const css = document.createElement('style');
css.textContent = `.rt-modo{display:flex;gap:6px;margin:6px 0}.rt-modo button{flex:1;padding:6px 4px;border:1px solid #cfd6e6;border-radius:6px;background:#f4f6fb;color:#0b1f6b;font-weight:700;font-size:11px;cursor:pointer}
.rt-modo button.on{background:#0b1f6b;color:#fff;border-color:#0b1f6b}
.rt-res{margin-top:6px;border:1px solid #e1e4ee;border-radius:7px;overflow:hidden;font-size:11.5px}
.rt-res .rt-top{display:grid;grid-template-columns:1fr 1fr;background:#0b1f6b;color:#fff;text-align:center}
.rt-res .rt-top div{padding:6px}.rt-res .rt-top b{display:block;font-size:16px}
.rt-res .rt-top span{font-size:9.5px;letter-spacing:.06em;opacity:.85}
.rt-res table{width:100%;border-collapse:collapse}.rt-res td{padding:3px 7px;border-top:1px solid #eef0f5}.rt-res td:last-child{text-align:right;white-space:nowrap}
.rt-res p{margin:0;padding:5px 7px;font-size:10px;color:#6b7187;border-top:1px solid #eef0f5}`;
document.head.append(css);
let modo = 'vehiculo';
const sel = document.createElement('div'); sel.className = 'rt-modo';
sel.innerHTML = '<button type="button" data-m="vehiculo" class="on">🚙 Vehículo</button><button type="button" data-m="pie">🚶 A pie</button>';
sel.querySelectorAll('button').forEach(b => b.onclick = () => { modo = b.dataset.m; sel.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
btn.before(sel);
const small = panel.querySelector('small'); if (small) small.textContent = 'Tiempo estimado con velocidades de referencia por clase, superficie y estado de la vía. No considera tráfico, clima ni bloqueos.';

function puntosMarcados() {
  const out = {};
  grupo.querySelectorAll(':scope > g').forEach(g => {
    const t = g.querySelector('title')?.textContent || '', m = /translate\(([-\d.e]+)[ ,]+([-\d.e]+)\)/.exec(g.getAttribute('transform') || ''); if (!m) return;
    const x = +m[1], y = +m[2], lon = ((x - 500) / K - OX) / D2R, lat = (2 * Math.atan(Math.exp((380 - y) / K - OY)) - Math.PI / 2) / D2R;
    if (/Origen/i.test(t)) out.o = [lon, lat]; else if (/Destino/i.test(t)) out.d = [lon, lat];
  });
  return out;
}
const fmtT = hh => { const m = Math.round(hh * 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; };
const fmtK = k => k.toFixed(k < 10 ? 2 : 1).replace('.', ',') + ' km';
const aEsc = c => [500 + (c[0] * D2R + OX) * K, 380 - (Math.log(Math.tan(Math.PI / 4 + c[1] * D2R / 2)) + OY) * K];
function dibujar(r, o, d, a, b) {
  grupo.querySelectorAll('path.rt').forEach(p => p.remove());
  const { XY } = grafo();
  const linea = (coords, color, w, dash) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', 'rt'); p.setAttribute('d', 'M' + coords.map(c => aEsc(c).join(',')).join('L')); p.setAttribute('fill', 'none'); p.setAttribute('stroke', color); p.setAttribute('stroke-width', w); p.setAttribute('stroke-linejoin', 'round'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('vector-effect', 'non-scaling-stroke'); if (dash) p.setAttribute('stroke-dasharray', dash); grupo.prepend(p); };
  const coords = r.nodos.map(i => XY[i]);
  linea([o, XY[a]], '#1F51FF', 3, '4 4'); linea([XY[b], d], '#1F51FF', 3, '4 4');
  linea(coords, '#1F51FF', 5); linea(coords, '#fff', 9);
}
btn.onclick = () => {
  if (typeof roadFeatures === 'undefined' || !roadFeatures.length) { res.textContent = 'Las vías aún se están cargando.'; return; }
  const { o, d } = puntosMarcados(); if (!o || !d) { res.textContent = 'Marca el origen y el destino en el mapa.'; return; }
  res.textContent = 'Calculando…';
  setTimeout(() => {
    const a = cercano(o, modo), b = cercano(d, modo);
    if (!a || !b) { res.textContent = 'No hay una vía ' + (modo === 'pie' ? '' : 'vehicular ') + 'a menos de 3 km de uno de los puntos.'; return; }
    const r = dijkstra(a[0], b[0], modo);
    if (!r) { res.textContent = 'No se encontró una ruta conectada por la red' + (modo === 'pie' ? '.' : ' vehicular. Prueba el modo A PIE.'); return; }
    const por = new Map(); let total = 0; const { XY } = grafo();
    for (const [u, v, fi] of r.tramos) { const L = km(XY[u], XY[v]), k = roadFeatures[fi].properties.tipo_via; total += L; por.set(k, (por.get(k) || 0) + L); }
    const acceso = a[1] + b[1], tAcc = acceso / A_PIE, tTot = r.horas + tAcc;
    const filas = [...por].sort((x, y) => y[1] - x[1]).map(([k, L]) => `<tr><td>${k}</td><td>${fmtK(L)}</td></tr>`).join('');
    res.innerHTML = `<div class="rt-res"><div class="rt-top"><div><b>${fmtK(total)}</b><span>POR LA RED</span></div><div><b>${fmtT(tTot)}</b><span>TIEMPO ESTIMADO</span></div></div><table>${filas}${acceso > .02 ? `<tr><td>Acceso a pie hasta la vía</td><td>${fmtK(acceso)} · ${fmtT(tAcc)}</td></tr>` : ''}</table><p>Modo ${modo === 'pie' ? 'a pie (4,5 km/h)' : 'vehículo'} · velocidades de referencia · ${r.tramos.length} segmentos.</p></div>`;
    dibujar(r, o, d, a[0], b[0]);
    if (window.EMTE_EXPORTAR) { const cs = [o, ...r.nodos.map(i => XY[i]), d], caja = document.createElement('div'); caja.style.cssText = 'display:flex;gap:6px;margin-top:6px'; const bt = window.EMTE_EXPORTAR.botonGPS('⤓ Exportar ruta a GPS (GPX / KML)', () => ({ titulo: 'Ruta ' + (modo === 'pie' ? 'a pie' : 'vehiculo') + ' ' + fmtK(total), puntos: [{ nombre: 'Origen', lat: o[1], lon: o[0] }, { nombre: 'Destino', lat: d[1], lon: d[0] }], lineas: [{ nombre: 'Ruta ' + fmtK(total) + ' · ' + fmtT(tTot), desc: 'Geovisor Omasuyos · modo ' + modo, coords: cs, grupo: 'Ruta' }] })); bt.style.cssText = 'flex:1;padding:7px;border:1px solid #0b1f6b;border-radius:6px;background:#fff;color:#0b1f6b;font-weight:700;font-size:11px;cursor:pointer'; caja.append(bt); res.append(caja); }
  }, 20);
};
});
