// Rendimiento del mapa (agregado el 20-10-2026).
// 1) Oculta el detalle menor cuando la escala es chica: calles, caminos de herradura, senderos,
//    caminos vecinales y quebradas. Reaparecen al acercarse. Se puede desactivar en el panel.
// 2) Mientras el mapa se mueve, dibuja los trazos en modo rápido (clase «moviendo» en index.html).
document.addEventListener('DOMContentLoaded', () => {
  const svg = document.querySelector('.map svg'), scene = document.getElementById('scene');
  if (!svg || !scene) return;
  const K = 65759.1401421867, R = 6378137;
  // Escala numérica (1:N) a partir de la cual se oculta cada nivel de detalle.
  const NIVELES = [['lod-100', 100000], ['lod-150', 150000], ['lod-250', 250000]];

  const css = document.createElement('style');
  css.textContent = `
.map svg.moviendo #scene path{shape-rendering:optimizeSpeed}
.map svg.lod-100 #roads path:is([data-road-type="Calle"],[data-road-type="Camino de herradura / brecha"],[data-road-type="Sendero / peatonal"]){display:none}
.map svg.lod-150 #rivers path.rio-detalle{display:none}
.map svg.lod-250 #roads path[data-road-type="Camino vecinal"]{display:none}
.lod-opcion{display:flex;gap:8px;align-items:flex-start;font-size:12px;padding:10px 0;border-bottom:0;line-height:1.4}
.lod-opcion input{margin-top:2px;flex-shrink:0}
.lod-opcion small{display:block;color:#64737b;font-size:10px}`;
  document.head.append(css);

  let activo = true;
  try { activo = localStorage.getItem('geovisor-detalle-por-escala') !== 'no'; } catch (e) { }

  // Casilla en el panel, debajo del menú de capas.
  const capas = document.getElementById('layers');
  if (capas) {
    const fila = document.createElement('label'); fila.className = 'lod-opcion';
    const caja = document.createElement('input'); caja.type = 'checkbox'; caja.checked = activo;
    const txt = document.createElement('span');
    txt.innerHTML = 'Mostrar detalle según la escala<small>Calles, senderos, caminos vecinales y quebradas aparecen al acercarse (desde 1:100.000 a 1:250.000). Hace el mapa más fluido.</small>';
    fila.append(caja, txt);
    (capas.closest('details.layer-menu') || capas).after(fila);
    caja.addEventListener('change', () => {
      activo = caja.checked;
      try { localStorage.setItem('geovisor-detalle-por-escala', activo ? 'si' : 'no'); } catch (e) { }
      actualizar();
    });
  }

  function denominador() {
    const m = scene.getScreenCTM(), r = svg.getBoundingClientRect();
    if (!m || !r.width) return 0;
    const c = new DOMPoint(r.left + r.width / 2, r.top + r.height / 2).matrixTransform(m.inverse());
    const lat = Math.atan(Math.sinh((380 - c.y) / K - 0.2830464015276702));
    const mpp = R / K * Math.cos(lat) / Math.hypot(m.a, m.b);
    return mpp * 96 / 0.0254;
  }
  function actualizar() {
    const d = denominador();
    for (const [clase, limite] of NIVELES) svg.classList.toggle(clase, activo && d > limite);
  }
  let cuadro = 0;
  const programar = () => { if (!cuadro) cuadro = requestAnimationFrame(() => { cuadro = 0; actualizar(); }); };
  new MutationObserver(programar).observe(scene, { attributes: true, attributeFilter: ['transform'] });
  addEventListener('resize', programar);
  actualizar();
});
