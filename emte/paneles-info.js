// Contenido de las pestañas «Información geográfica», «Versión local» y «Fuentes de las capas».
// Datos verificados el 19/10/2026: INE Censo 2024 (resultados preliminares), capas del geovisor,
// Copernicus DEM GLO-90 (altitudes). Elaborado por el AL 1RO Luis Leandro Cruz Guarachi y el AL 3ER AM Brayan Yohasir Nina Suxo.
(function () {
'use strict';
const VERSION = '2.1', FECHA = '19/10/2026';
const fmt = n => Number(n).toLocaleString('es-BO').replace(/,/g, '.');
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- estilos ---------- */
const css = document.createElement('style');
css.textContent = `
#panel-general,#panel-local{width:min(600px,calc(100vw - 40px))!important}
#panel-sources{width:min(1000px,calc(100vw - 40px))!important}
#panel-general,#panel-local,#panel-sources{padding:0!important;overflow:auto!important;max-height:calc(100vh - 120px)!important}
.pi{font:13px/1.5 var(--tipo-texto,'Segoe UI',system-ui,sans-serif);color:#14233A}
.pi-cab{padding:22px 26px 16px;background:#0B1D33 url('assets/tema/curvas-nivel-oscuro.svg') center/cover;color:#fff;border-bottom:2px solid #B79A5B}
.pi-cab small{display:block;font:600 10.5px var(--tipo-titulo,system-ui);letter-spacing:.16em;color:#C8B27A;text-transform:uppercase}
.pi-cab h3{margin:4px 0 2px!important;font:700 21px var(--tipo-titulo,system-ui)!important;letter-spacing:.04em;color:#fff!important}
.pi .pi-cab p{margin:0;color:#C9D5E6!important;font-size:12.5px}
.pi-cuerpo{padding:18px 26px 22px}
.pi h4{margin:18px 0 8px;font:700 11px var(--tipo-titulo,system-ui);letter-spacing:.14em;text-transform:uppercase;color:#12294A;display:flex;align-items:center;gap:10px}
.pi h4:after{content:"";flex:1;height:1px;background:#D7DEE8}
.pi h4:first-child{margin-top:0}
.pi p{margin:0 0 6px;color:#3A4A60!important}
.pi-kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#D7DEE8;border:1px solid #D7DEE8;border-radius:6px;overflow:hidden}
.pi-kpi div{background:#fff;padding:10px 12px}
.pi-kpi b{display:block;font:700 17px var(--tipo-titulo,system-ui);color:#12294A;letter-spacing:.02em}
.pi-kpi span{font-size:10.5px;color:#5A6B80;letter-spacing:.04em;text-transform:uppercase}
.pi-tabla{width:100%;border-collapse:collapse;font-size:12px;border:1px solid #D7DEE8}
.pi-tabla th{background:#12294A;color:#fff;font:600 10.5px var(--tipo-titulo,system-ui);letter-spacing:.08em;text-transform:uppercase;text-align:left;padding:8px 10px;border-right:1px solid #1C3A66}
.pi-tabla td{padding:7px 10px;border-top:1px solid #E3E8EF;vertical-align:top;color:#14233A}
.pi-tabla tr:nth-child(even) td{background:#F6F8FB}
.pi-tabla td.n,.pi-tabla th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.pi-tabla tfoot td{font-weight:700;background:#EEF2F8!important;border-top:1.5px solid #12294A}
.pi-tabla td b{color:#12294A}
.pi-tabla .sub{display:block;color:#5A6B80;font-size:11px}
.pi-def{display:grid;grid-template-columns:150px 1fr;border:1px solid #D7DEE8;border-radius:6px;overflow:hidden}
.pi-def dt,.pi-def dd{margin:0;padding:7px 12px;border-top:1px solid #E3E8EF}
.pi-def dt:first-of-type,.pi-def dd:first-of-type{border-top:0}
.pi-def dt{background:#F4F6F9;font:600 10.5px var(--tipo-titulo,system-ui);letter-spacing:.08em;text-transform:uppercase;color:#5A6B80}
.pi-def dd{color:#14233A}
.pi-chip{display:inline-block;margin:0 4px 4px 0;padding:2px 8px;border:1px solid #D7DEE8;border-radius:4px;background:#F6F8FB;font:600 11px ui-monospace,Consolas,monospace;color:#12294A}
.pi-etq{display:inline-block;padding:1px 7px;border-radius:3px;font:600 9.5px var(--tipo-titulo,system-ui);letter-spacing:.08em;text-transform:uppercase;vertical-align:1px}
.pi-etq.res{background:#FBEAEA;color:#9B1C1C;border:1px solid #F0C8C8}
.pi-etq.ok{background:#E8F3EC;color:#17663A;border:1px solid #C3E2CD}
.pi-etq.inv{background:#EEF2F8;color:#12294A;border:1px solid #D7DEE8}
.pi-nota{margin-top:14px!important;padding:9px 12px;border-left:3px solid #B79A5B;background:#F8F6F0;font-size:11.5px!important;color:#5A5040!important}
.pi-firma{margin-top:16px;padding:14px 16px;border:1px solid #D7DEE8;border-radius:6px;background:#fff;display:flex;gap:14px;align-items:center}
.pi-firma img{width:46px;height:46px;object-fit:contain}
.pi-firma b{display:block;font:700 12.5px var(--tipo-titulo,system-ui);letter-spacing:.04em;color:#12294A}
.pi-firma span{display:block;font-size:11px;color:#5A6B80}
.pi ul{margin:0;padding-left:18px}.pi li{margin:2px 0;color:#3A4A60}
@media(max-width:700px){.pi-kpi{grid-template-columns:repeat(2,1fr)}.pi-def{grid-template-columns:1fr}.pi-def dt{border-top:1px solid #E3E8EF}.pi-tabla{font-size:11px}}`;
document.head.append(css);

/* ---------- datos ---------- */
const MUNICIPIOS = [ // población: INE, Censo 2024 (resultados preliminares, ago. 2024); servicios: capas del geovisor
  ['Achacachi (capital)', 47064, 39, 115],
  ['Ancoraimes', 16900, 9, 49],
  ['Santiago de Huata', 9258, 4, 30],
  ['Huarina', 8657, 4, 26],
  ['Chua Cocani', 7183, 2, 9],
  ['Huatajata', 5096, 2, 7]
];
const CARTAS = [['5845-I', 'Achacachi'], ['5846-III', 'Ancoraimes'], ['5845-III', 'Estrecho de Tiquina'], ['5845-II', 'Huarina'], ['5945-IV', 'Lago Khara Kkota'], ['5846-IV', 'Mina Matilde'], ['5845-IV', 'Santiago de Huata'], ['5846-II', 'Warisata']];
const EXT = { o: [-68.98923, -16.0], e: [-68.48703, -16.0], n: [-68.7, -15.75365], s: [-68.7, -16.25616] };

function general() {
  const tot = MUNICIPIOS.reduce((a, m) => [a[0] + m[1], a[1] + m[2], a[2] + m[3]], [0, 0, 0]);
  const T = window.EMTE_TOPO, utm = (lo, la) => { if (!T) return ''; const [E, N] = T.aUTM(la, lo, 19); return `${fmt(Math.round(E))} E · ${fmt(Math.round(N))} N`; };
  return `
  <div class="pi-cab"><small>Información geográfica</small><h3>Provincia Omasuyos</h3><p>Departamento de La Paz · Estado Plurinacional de Bolivia</p></div>
  <div class="pi-cuerpo">
    <div class="pi-kpi">
      <div><b>Achacachi</b><span>Capital</span></div>
      <div><b>${fmt(tot[0])}</b><span>Habitantes · Censo 2024</span></div>
      <div><b>6</b><span>Municipios</span></div>
      <div><b>2.065 km²</b><span>Superficie</span></div>
      <div><b>3.810 – 5.025 m</b><span>Altitud s.n.m.</span></div>
      <div><b>23/01/1826</b><span>Creación</span></div>
    </div>
    <h4>Ubicación</h4>
    <p>Altiplano norte del departamento de La Paz, en la orilla oriental del lago Titicaca. Limita al norte con las provincias Camacho, Muñecas y Larecaja; al este con Los Andes; al oeste y al sur con el lago Titicaca.</p>
    <h4>Municipios</h4>
    <table class="pi-tabla"><thead><tr><th>Municipio</th><th class="n">Población 2024</th><th class="n">Est. de salud</th><th class="n">Centros educativos</th></tr></thead>
    <tbody>${MUNICIPIOS.map(m => `<tr><td>${m[0]}</td><td class="n">${fmt(m[1])}</td><td class="n">${m[2]}</td><td class="n">${m[3]}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Total provincia</td><td class="n">${fmt(tot[0])}</td><td class="n">${tot[1]}</td><td class="n">${tot[2]}</td></tr></tfoot></table>
    <p class="pi-nota">La capa tiene 237 centros educativos: uno de ellos está fuera de los límites municipales del INE y no se cuenta por municipio.</p>
    <h4>Relieve e hidrografía</h4>
    <dl class="pi-def">
      <dt>Altitud</dt><dd>Desde 3.810 m (orillas del lago Titicaca) hasta 5.025 m; altitud media 4.045 m.</dd>
      <dt>Lago</dt><dd>Lago Titicaca (sitio Ramsar), en todo el borde oeste y sur de la provincia.</dd>
      <dt>Red de drenaje</dt><dd>76 ríos y 1.195 quebradas (1.612 km), entre ellos los ríos Corhuar Jahuira, Japa Jahuira, Morocollo y Keka.</dd>
      <dt>Cuerpos de agua</dt><dd>157, entre ellos las lagunas Cacha, Ajoyan, San Francisco y Totorani y el embalse de Murumamani.</dd>
    </dl>
    <h4>Red vial</h4>
    <dl class="pi-def">
      <dt>Red fundamental</dt><dd>Rutas Nacionales 2 y 16 (ABC), 101 km dentro de la provincia.</dd>
      <dt>Caminos principales</dt><dd>Achacachi – Sorata, Achacachi – Chachacomani, Achacachi – Tola Tola, doble vía Huarina – Achacachi.</dd>
      <dt>Total cartografiado</dt><dd>${fmt(2644)} km: 217 km asfaltados y ${fmt(2117)} km de tierra o ripio.</dd>
    </dl>
    <h4>Servicios</h4>
    <dl class="pi-def">
      <dt>Salud</dt><dd>60 establecimientos: 1 hospital de 2.º nivel, 7 centros con internación, 29 centros ambulatorios, 9 puestos de salud y 14 privados (farmacias, consultorios y un centro privado).</dd>
      <dt>Educación</dt><dd>237 centros: 221 unidades educativas, 6 centros de educación alternativa, institutos técnicos, una escuela de formación de maestros y sedes universitarias; ${fmt(14170)} estudiantes inscritos en 2025.</dd>
    </dl>
    <h4>Datos cartográficos</h4>
    <dl class="pi-def">
      <dt>Datum y proyección</dt><dd>WGS 84 · UTM zona 19 Sur (EPSG:32719)</dd>
      <dt>Extremo norte</dt><dd>15°45'13" S · ${utm(...EXT.n)}</dd>
      <dt>Extremo sur</dt><dd>16°15'22" S · ${utm(...EXT.s)}</dd>
      <dt>Extremo oeste</dt><dd>68°59'21" O · ${utm(...EXT.o)}</dd>
      <dt>Extremo este</dt><dd>68°29'13" O · ${utm(...EXT.e)}</dd>
      <dt>Cartas IGM 1:50.000</dt><dd>${CARTAS.map(c => `<span class="pi-chip" title="${esc(c[1])}">${c[0]}</span>`).join('')}<span class="sub" style="display:block;color:#5A6B80;font-size:11px">${CARTAS.map(c => c[1]).join(' · ')}</span></dd>
    </dl>
    <p class="pi-nota">Población: INE, Censo de Población y Vivienda 2024 (resultados preliminares). Superficie: división político-administrativa; el límite referencial cargado en el geovisor mide 1.458 km² de tierra firme. Altitudes calculadas con Copernicus DEM GLO-90 dentro de ese límite. Servicios y red vial: capas del geovisor al ${FECHA}.</p>
  </div>`;
}

function local(ses, estado) {
  const usuario = ses && ses.rol !== 'invitado', modo = estado == null ? 'Verificando…' : estado ? 'Con base de datos PostgreSQL / PostGIS' : 'Sin conexión (copias GeoJSON de las capas)';
  return `
  <div class="pi-cab"><small>Versión local</small><h3>Geovisor EMTE · Provincia Omasuyos</h3><p>Versión ${VERSION} · actualizado el ${FECHA}</p></div>
  <div class="pi-cuerpo">
    <h4>Estado</h4>
    <dl class="pi-def">
      <dt>Sesión</dt><dd>${esc(ses ? ses.usuario : '—')} ${ses ? (usuario ? '<span class="pi-etq ok">Usuario</span>' : '<span class="pi-etq inv">Invitado</span>') : ''}</dd>
      <dt>Modo de datos</dt><dd>${modo}</dd>
      <dt>Dirección local</dt><dd><code>http://127.0.0.1:5000</code> · desde otro equipo, por la red Tailscale de la EMTE</dd>
      <dt>Sistema</dt><dd>Servidor Flask (Python) · PostgreSQL / PostGIS · QGIS · navegador web</dd>
    </dl>
    <h4>Tipos de acceso</h4>
    <table class="pi-tabla"><thead><tr><th>Función</th><th>Invitado</th><th>Usuario</th></tr></thead><tbody>
      <tr><td>Tipo de mapa, capas del mapa y fichas</td><td>✔</td><td>✔</td></tr>
      <tr><td>Herramientas: medir, coordenadas UTM, cuadrícula, PDF</td><td>✔</td><td>✔</td></tr>
      <tr><td>Rutas por distancia</td><td>✔</td><td>✔</td></tr>
      <tr><td>Perfil y visibilidad, curvas de nivel, apoyo al planeamiento</td><td>✔</td><td>✔</td></tr>
      <tr><td>Unidades militares</td><td>—</td><td>✔</td></tr>
      <tr><td>Calco militar · Planeamiento</td><td>—</td><td>✔</td></tr>
      <tr><td>Cartas Omasuyos y cartas IGM de Bolivia</td><td>—</td><td>✔</td></tr>
      <tr><td>Actualizar fichas de salud (con contraseña de edición)</td><td>—</td><td>✔</td></tr>
    </tbody></table>
    <h4>Funciones de esta versión</h4>
    <ul>
      <li>Diseño institucional azul marino con curvas de nivel.</li>
      <li>Ficha de establecimientos de salud con actualización protegida por contraseña.</li>
      <li>Cartas Omasuyos y exploración de las 903 cartas IGM 1:50.000 con capa de divisiones.</li>
      <li>Coordenadas UTM del cursor, búsqueda por coordenadas, cuadrícula y zonas UTM.</li>
      <li>Mapa formal en PDF (A4 / A3) con marco, escala, norte, leyenda y clasificación.</li>
      <li>Acceso de invitado (solo consulta) y de usuario registrado.</li>
      <li>Perfil topográfico y visibilidad entre dos puntos; curvas de nivel cada 50 m; altitud del cursor.</li>
      <li>Capas de apoyo al planeamiento: comunidades, posibles zonas de aterrizaje, puentes y fuentes de agua.</li>
      <li>Ficha de centros educativos y capa de unidades militares (usuarios registrados).</li>
    </ul>
    <h4>Responsables</h4>
    <div class="pi-firma"><img src="assets/logos/emte.png" alt="">
      <div><span>Elaborado por</span><b>AL 1RO LUIS LEANDRO CRUZ GUARACHI</b><b>AL 3ER AM BRAYAN YOHASIR NINA SUXO</b>
      <span>Escuela Militar de Topografía del Ejército «Tcnl. Juan Ondarza Lara»</span></div></div>
  </div>`;
}

function fuentes(ses) {
  const usuario = ses && ses.rol !== 'invitado';
  const F = [ // [capa, fuente, gestión, método / precisión, elementos, solo usuarios]
    ['Límite provincial', 'GeoJSON proporcionado al proyecto', '—', 'Referencial, no oficial', '1 polígono', 0],
    ['Límites municipales', 'OpenStreetMap – relaciones administrativas de los 6 municipios · normas: Decreto 23/01/1826, Ley 24/11/1917, Ley 515 (1980), Ley 3098 (2005), Ley 4000 (2009), Leyes 33 y 034 (2010)', '1826 – 2010', 'Trazo referencial; colindancias según cada ley de creación', '6 municipios', 0],
    ['Vías', 'OpenStreetMap (© contribuyentes OSM, ODbL) vía Overpass API · Red Vial Fundamental, ABC (GeoBolivia)', '2024 – 2026', 'RVF verificada con el mapa oficial ABC; el resto según OSM', `${fmt(4394)} tramos · ${fmt(2644)} km`, 0],
    ['Ríos y quebradas', 'MMAyA – Plan Director de la Cuenca Katari y Lago Menor del Titicaca (GeoBolivia) · modelado con Copernicus DEM GLO-30 (ESA)', '—', 'Cauces modelados (umbral 1 km²): verificar con imagen', `${fmt(1288)} cauces · ${fmt(1612)} km`, 0],
    ['Cuerpos de agua', 'Cuerpos de agua en Bolivia, GeoBolivia (cód. 020P002200) · Sitios Ramsar 2020 (MMAyA) · OpenStreetMap', '2020 – 2026', 'Recortado a 6 km alrededor de la provincia', '157 polígonos', 0],
    ['Establecimientos de salud', 'SEDES La Paz – Rendición de Cuentas Inicial 2026, Red Rural N.º 4 · ubicación: Ministerio de Salud y Deportes, mapa oficial SUS · privados: OpenStreetMap', '2026', 'Coordenadas oficiales SUS; edificios verificados en OSM', '60 puntos', 0],
    ['Centros educativos', 'Ministerio de Educación – SIE, fichas técnicas de unidades educativas · VEAyE, lista de CEA y CEE de La Paz', '2025', 'Coordenadas oficiales del SIE', '237 puntos', 0],
    ['Población', 'INE – Censo de Población y Vivienda 2024', '2024', 'Resultados preliminares por municipio', '6 municipios', 0],
    ['Relieve, perfil y curvas de nivel', 'Copernicus DEM GLO-90, Agencia Espacial Europea (ESA)', '2010 – 2015', 'Resolución aprox. 90 m; curvas cada 50 m (maestras cada 250 m)', '322 curvas', 0],
    ['Apoyo al planeamiento', 'OpenStreetMap (© contribuyentes OSM, ODbL) vía Overpass API, consultado el 19/10/2026', '2026', 'Zonas de aterrizaje clasificadas por tamaño de la cancha: verificar en terreno', '193 comunidades · 370 canchas · 130 puentes · 34 puntos de agua', 0],
    ['Cuadrícula y zonas UTM', 'Generadas en QGIS (EPSG:32719, 32720 y 32721) · límite nacional de GeoBolivia', '2026', 'Líneas cada 10 km; zonas 19S, 20S y 21S', '619 líneas · 3 zonas', 0],
    ['Mapa base', 'OpenStreetMap · Esri World Imagery · Esri World Hillshade', 'En línea', 'Servicio de teselas (requiere internet)', '—', 0],
    ['Cartas topográficas', 'Instituto Geográfico Militar (IGM) Bolivia – cartas 1:50.000', '—', 'Georreferenciadas en UTM WGS 84', '903 hojas', 1],
    ['Divisiones del Ejército', 'Ejército de Bolivia – Jurisdicción de las GG.UU.CC.', '2024', 'Uso restringido', '12 jurisdicciones', 1],
    ['Unidades y puestos militares', 'Ejército de Bolivia – unidades 2018 con jurisdicción 2024; PP.MM.AA. (KMZ 2024)', '2018 – 2024', 'Uso restringido', '241 puntos', 1],
    ['Simbología del calco', 'Reglamento de simbología militar (PDF de referencia en Calco militar)', '—', 'Catálogo de símbolos por grupo', '—', 1]
  ].filter(f => usuario || !f[5]);
  return `
  <div class="pi-cab"><small>Fuentes de las capas</small><h3>Origen de los datos del geovisor</h3><p>Sistema de referencia WGS 84 · revisado el ${FECHA}</p></div>
  <div class="pi-cuerpo">
    <table class="pi-tabla"><thead><tr><th style="width:17%">Capa</th><th>Fuente</th><th style="width:9%">Gestión</th><th style="width:22%">Método / precisión</th><th class="n" style="width:13%">Elementos</th></tr></thead>
    <tbody>${F.map(f => `<tr><td><b>${f[0]}</b>${f[5] ? ' <span class="pi-etq res">Restringido</span>' : ''}</td><td>${f[1]}</td><td>${f[2]}</td><td>${f[3]}</td><td class="n">${f[4]}</td></tr>`).join('')}</tbody></table>
    <p class="pi-nota">Los datos de OpenStreetMap se usan bajo la licencia ODbL (© contribuyentes de OpenStreetMap). El límite provincial es referencial y no sustituye a la delimitación oficial.${usuario ? ' Las capas marcadas como restringidas son de uso institucional y no se muestran a invitados.' : ''}</p>
  </div>`;
}

/* En modo sin conexión el aviso del mapa explica el modo en lugar de mostrar un error de PostgreSQL. */
function sinConexion() {
  const fijar = () => { const l = document.querySelector('.map .legend'); if (l && /PostgreSQL|conectar/i.test(l.textContent)) l.textContent = 'Modo sin conexión · capas desde copias GeoJSON'; };
  fijar(); setTimeout(fijar, 1500); setTimeout(fijar, 4000);
}

/* ---------- colocación en las pestañas ---------- */
function poner(id, html) {
  const p = document.getElementById(id); if (!p) return false;
  let c = p.querySelector(':scope > .pi');
  if (!c) { [...p.children].forEach(n => { if (!n.classList.contains('institution-tab-close')) n.hidden = true, n.style.display = 'none'; }); c = document.createElement('div'); c.className = 'pi'; p.append(c); }
  c.innerHTML = html; return true;
}
let SES = null, ESTADO = null;
function pintar() { poner('panel-general', general()); poner('panel-local', local(SES, ESTADO)); poner('panel-sources', fuentes(SES)); }
function iniciar() {
  if (!document.getElementById('panel-general')) { setTimeout(iniciar, 100); return; }
  pintar();
  fetch('/api/sesion').then(r => r.ok ? r.json() : null).then(s => { SES = s; pintar(); }).catch(() => {});
  fetch('/api/estado').then(r => r.ok ? r.json() : Promise.reject()).then(e => { ESTADO = !!(e && e.postgis); pintar(); }).catch(() => { ESTADO = false; pintar(); sinConexion(); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(iniciar, 0)); else iniciar();
})();
