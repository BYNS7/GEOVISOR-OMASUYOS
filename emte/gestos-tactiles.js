// Zoom con dos dedos (pellizco) en tabletas y celulares (agregado por BYNS7).
// Acerca y aleja anclado al punto medio entre los dedos y permite desplazar mientras se pellizca.
// Con un solo dedo se mantiene el arrastre original del geovisor.
document.addEventListener('DOMContentLoaded', () => {
  const svg = document.querySelector('.map svg');
  if (!svg || typeof zoom !== 'function') return;
  const dedos = new Map();
  let previo = null; // {d, pt} del último paso del pellizco

  const medio = () => { const [a, b] = [...dedos.values()]; return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 }; };
  const aVista = (x, y) => new DOMPoint(x, y).matrixTransform(svg.getScreenCTM().inverse());
  const cortar = () => { try { drag = null; mapDragged = true; } catch (e) { } };

  svg.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    dedos.set(e.pointerId, [e.clientX, e.clientY]);
    if (dedos.size === 2) {
      e.stopImmediatePropagation(); cortar();
      const m = medio(); previo = { d: m.d, pt: aVista(m.x, m.y) };
    }
  }, { capture: true });

  svg.addEventListener('pointermove', e => {
    if (!dedos.has(e.pointerId)) return;
    dedos.set(e.pointerId, [e.clientX, e.clientY]);
    if (dedos.size < 2 || !previo) return;
    e.stopImmediatePropagation(); e.preventDefault(); cortar();
    const m = medio(), pt = aVista(m.x, m.y);
    if (!m.d || !previo.d) return;
    const viejo = scale, nuevo = Math.max(.65, Math.min(480, viejo * m.d / previo.d));
    const wx = (previo.pt.x - 500 - panX) / viejo, wy = (previo.pt.y - 380 - panY) / viejo;
    scale = nuevo; panX = pt.x - 500 - wx * nuevo; panY = pt.y - 380 - wy * nuevo;
    if (typeof vistaEnCuadro === 'function') vistaEnCuadro(); else zoom(1);
    previo = { d: m.d, pt: aVista(m.x, m.y) };
  }, { capture: true, passive: false });

  const soltar = e => {
    if (!dedos.delete(e.pointerId)) return;
    if (dedos.size < 2) { if (previo) cortar(); previo = null; }
  };
  for (const t of ['pointerup', 'pointercancel', 'pointerleave']) svg.addEventListener(t, soltar, { capture: true });
});
