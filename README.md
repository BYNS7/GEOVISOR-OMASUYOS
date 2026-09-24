# Geovisor – Provincia Omasuyos (La Paz, Bolivia)

Geovisor web de la **red vial** y la **hidrografía** de la provincia Omasuyos.

## Contenido

| Capa | Elementos | Visible |
|---|---|---|
| Vías principales (Red Fundamental, Departamental, terciarias) | 340 | siempre |
| Caminos y calles locales | 3.742 | al acercarse (zoom ≥ 12) |
| Ríos y canales | 46 | siempre |
| Quebradas y acequias | 357 | al acercarse (zoom ≥ 12) |
| Lagos, lagunas y bofedales | 155 | siempre |

Herramientas: control de capas con leyenda, 3 mapas base (claro, satelital, OpenStreetMap),
buscador de vías/ríos/lagunas por nombre, buscador de lugares, medición de distancias,
mi ubicación, escala y minimapa. Clic sobre cualquier elemento para ver su ficha.

## Fuente de datos

© colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright), licencia ODbL.
Descarga del 23/09/2026, recortada al límite de la provincia Omasuyos (relación OSM 4496963).
Preparado en QGIS 3.44.

## Publicar en GitHub Pages

1. Subir **el contenido de esta carpeta** a la raíz de un repositorio público.
2. Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
3. El sitio queda en `https://USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`.

Los datos están en archivos `.js` (GeoJSON como variable), por lo que el geovisor
también funciona abriendo `index.html` con doble clic, sin servidor.
