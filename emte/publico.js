/* Versión pública del Geovisor Omasuyos (GitHub Pages): sin servidor ni inicio de sesión.
   Muestra lo mismo que un INVITADO del geovisor local. No incluye el calco de planeamiento,
   las cartas IGM ni las unidades militares. Las consultas a /api/ se responden aquí. */
(() => {
  'use strict';
  window.EMTE_PUBLICO = true;
  document.documentElement.dataset.rol = 'invitado';
  const original = window.fetch.bind(window);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
  window.fetch = async function (url, opt = {}) {
    const u = typeof url === 'string' ? url : (url && url.url) || '';
    const ruta = u.startsWith('http') ? new URL(u).pathname : u;
    if (/^\/api\//.test(ruta)) {
      if (ruta.startsWith('/api/sesion')) return json({ rol: 'invitado', usuario: 'Versión pública', csrf: '' });
      if (ruta.startsWith('/api/salud/ediciones')) return json({});
      if (ruta.startsWith('/api/salud/historial')) return json([]);
      if (ruta.startsWith('/api/estado')) return json({ error: 'VERSIÓN PÚBLICA · CAPAS DESDE COPIAS GEOJSON' });
      if (ruta.startsWith('/api/red')) return json({ url: location.href });
      return json({ error: 'Función no disponible en la versión pública.' }, 404);
    }
    return original(url, opt);
  };
  const st = document.createElement('style');
  st.textContent = 'html[data-rol=invitado] .fs-act{display:none!important}.pub-tag{position:absolute;right:120px;top:10px;font:600 10px system-ui;letter-spacing:.12em;color:#e5e7ff;border:1px solid #ffffff44;border-radius:12px;padding:4px 10px;background:#ffffff14}';
  document.head.append(st);
  document.addEventListener('DOMContentLoaded', () => { const h = document.querySelector('header'); if (h) { const t = document.createElement('span'); t.className = 'pub-tag'; t.textContent = 'VERSIÓN PÚBLICA'; h.append(t); } });
})();
