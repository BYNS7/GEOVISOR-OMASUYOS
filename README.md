# Geovisor SIG · Provincia Omasuyos (Proyecto BYNS)

Réplica web del proyecto QGIS `BYNS.qgz`. El mapa es de acceso libre; las capas militares
(Defensa y frontera) y el formulario Survey piden contraseña.

* Los datos militares están **cifrados** (AES-256-GCM) en los archivos `data/p_*.bin`;
  sin la contraseña no se pueden leer.
* Funciona en computadora y celular (Chrome, Edge, Firefox, Safari actualizados).

## Funciones
Capas por grupos con leyenda y opacidad · fichas al pasar el cursor (igual que en QGIS) ·
clic para ver datos de cualquier capa · identificar · búsqueda por nombre · ir a coordenada
(geográfica o UTM 19 S) · coordenadas y altitud del cursor · tabla de atributos con filtro y
exportación CSV · medir distancia y área · ruta óptima (más rápida y más corta) · ruta a pie por
el terreno con perfil de elevación · cartas IGM 1:50.000 · sombreado del relieve · 4 mapas base ·
mi ubicación (GPS) · imprimir / PDF · invitar con código QR.

## Publicar en GitHub Pages
1. Abrir el repositorio `BYNS7/GEOVISOR-OMASUYOS` → **Add file → Upload files**.
2. Arrastrar **todo el contenido** de esta carpeta (index.html, css, js, img, data, README.md).
3. **Commit changes**. En 1–2 minutos queda en https://byns7.github.io/GEOVISOR-OMASUYOS/

Para invitar: botón **Invitar** del geovisor (QR, copiar enlace, WhatsApp).
La contraseña de las capas militares se entrega por separado.
