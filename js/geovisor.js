/* =========================================================
   Geovisor Provincia Omasuyos – Red vial e hidrografía
   Datos: © colaboradores de OpenStreetMap (ODbL) · 23/09/2026
   ========================================================= */
(function () {
  'use strict';

  // ---------- Mapa ----------
  var limite = L.geoJSON(json_limite_omasuyos);
  var extension = limite.getBounds();
  var map = L.map('map', {
    preferCanvas: true,               // rendimiento con miles de líneas
    minZoom: 9, maxZoom: 18,
    maxBounds: extension.pad(0.6),
    zoomControl: true
  }).fitBounds(extension);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');

  // ---------- Mapas base ----------
  var positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd',
    attribution: '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
  }).addTo(map);
  var satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, attribution: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics'
  });
  var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  // ---------- Estilos ----------
  var EST_LINEA = {
    // carreteras
    trunk: { color: '#C62828', weight: 4.5 }, trunk_link: { color: '#C62828', weight: 3 },
    secondary: { color: '#EF6C00', weight: 3.4 }, secondary_link: { color: '#EF6C00', weight: 2.4 },
    tertiary: { color: '#D4A017', weight: 2.6 }, tertiary_link: { color: '#D4A017', weight: 2 },
    unclassified: { color: '#6D6D6D', weight: 1.5 },
    track: { color: '#8C6D46', weight: 1.3, dashArray: '5 4' },
    residential: { color: '#9E9E9E', weight: 1.2 }, living_street: { color: '#9E9E9E', weight: 1.2 },
    service: { color: '#9E9E9E', weight: 1.1 }, road: { color: '#9E9E9E', weight: 1.1 },
    // hidrografía
    river: { color: '#1565C0', weight: 3 }, canal: { color: '#0097A7', weight: 2 },
    dam: { color: '#546E7A', weight: 3.8 }, weir: { color: '#546E7A', weight: 3 },
    stream: { color: '#64B5F6', weight: 1.4 },
    ditch: { color: '#4DD0E1', weight: 1.2, dashArray: '4 3' }, drain: { color: '#4DD0E1', weight: 1.2, dashArray: '4 3' }
  };
  var EST_POLI = {
    'LAGO / LAGUNA': ['#90CAF9', '#1565C0', 0.6], 'RESERVORIO': ['#90CAF9', '#1565C0', 0.6],
    'CUERPO DE AGUA': ['#90CAF9', '#1565C0', 0.6], 'CAUCE DE RÍO': ['#90CAF9', '#1565C0', 0.6],
    'ESTANQUE / QOCHA': ['#BBDEFB', '#42A5F5', 0.6], 'ESTANQUE ARTIFICIAL': ['#BBDEFB', '#42A5F5', 0.6],
    'LAGUNA DE OXIDACIÓN': ['#A1887F', '#6D4C41', 0.6],
    'BOFEDAL': ['#81C784', '#388E3C', 0.5], 'HUMEDAL': ['#81C784', '#388E3C', 0.5], 'PANTANO / TOTORAL': ['#81C784', '#388E3C', 0.5]
  };
  function estiloLinea(f) {
    var p = f.properties, s = EST_LINEA[p.cat] || { color: '#9E9E9E', weight: 1 };
    var dash = s.dashArray || (p.cat === 'stream' && p.intermit === 'SI' ? '4 3' : null);
    return { color: s.color, weight: s.weight, opacity: 0.95, dashArray: dash, lineCap: 'round', lineJoin: 'round' };
  }
  function estiloPoli(f) {
    var s = EST_POLI[f.properties.cat] || ['#90CAF9', '#1565C0', 0.6];
    return { fillColor: s[0], color: s[1], weight: 1, fillOpacity: s[2], opacity: 0.9 };
  }

  // ---------- Interacción: resaltar + popup ----------
  function interaccion(esPoli) {
    return function (feature, layer) {
      if (feature.properties.popup) layer.bindPopup(feature.properties.popup, { maxWidth: 340 });
      layer.on('mouseover', function (e) {
        var l = e.target;
        l._estiloOrig = l._estiloOrig || { weight: l.options.weight, color: l.options.color, fillOpacity: l.options.fillOpacity };
        l.setStyle(esPoli ? { weight: 3, color: '#FFD600', fillOpacity: 0.8 } : { weight: l.options.weight + 3, color: '#FFD600' });
        if (!esPoli) l.bringToFront();
      });
      layer.on('mouseout', function (e) { var l = e.target; if (l._estiloOrig) l.setStyle(l._estiloOrig); });
    };
  }

  // ---------- Capas ----------
  L.geoJSON(json_limite_omasuyos, {
    interactive: false,
    style: { color: '#8B0000', weight: 2.5, dashArray: '8 5', fill: false }
  }).addTo(map);

  var CAPAS = [
    { id: 'vias_principales', datos: json_vias_principales, nombre: 'Vías principales', poli: false, zoomMin: 0 },
    { id: 'caminos_locales', datos: json_caminos_locales, nombre: 'Caminos y calles locales', poli: false, zoomMin: 12 },
    { id: 'rios_canales', datos: json_rios_canales, nombre: 'Ríos y canales', poli: false, zoomMin: 0 },
    { id: 'quebradas_acequias', datos: json_quebradas_acequias, nombre: 'Quebradas y acequias', poli: false, zoomMin: 12 },
    { id: 'lagos_lagunas_bofedales', datos: json_lagos_lagunas_bofedales, nombre: 'Lagos, lagunas y bofedales', poli: true, zoomMin: 0 }
  ];
  var overlays = {}, todas = [];
  CAPAS.forEach(function (c) {
    c.geo = L.geoJSON(c.datos, { style: c.poli ? estiloPoli : estiloLinea, onEachFeature: interaccion(c.poli) });
    // Grupo contenedor: la capa real solo se dibuja desde su zoom mínimo
    c.grupo = L.layerGroup();
    c.grupo.on('add', function () { actualizar(c); });
    c.grupo.on('remove', function () { c.grupo.clearLayers(); });
    var ley = (window.LEYENDA && LEYENDA[c.id]) || [];
    var html = '<span class="capa-nombre">' + c.nombre + '</span>' +
      (c.zoomMin ? ' <span class="capa-nota">(visible al acercarse)</span>' : '') +
      '<div class="leyenda">' + ley.map(function (i) {
        return '<div><img src="' + i.img + '" alt="">' + i.label + '</div>';
      }).join('') + '</div>';
    overlays[html] = c.grupo;
    todas.push(c);
  });
  function actualizar(c) {
    if (!map.hasLayer(c.grupo)) return;
    var ver = map.getZoom() >= c.zoomMin;
    if (ver && !c.grupo.hasLayer(c.geo)) c.grupo.addLayer(c.geo);
    if (!ver && c.grupo.hasLayer(c.geo)) c.grupo.removeLayer(c.geo);
  }
  map.on('zoomend', function () {
    todas.forEach(actualizar);
    // mantener vías principales y ríos por encima de lo local
    [todas[2], todas[0]].forEach(function (c) { if (c.grupo.hasLayer(c.geo)) c.geo.bringToFront(); });
  });
  // orden de dibujo: polígonos abajo, vías principales arriba
  [4, 3, 2, 1, 0].forEach(function (i) { todas[i].grupo.addTo(map); });

  var movil = window.innerWidth < 700;
  L.control.layers(
    { 'Mapa claro (recomendado)': positron, 'Imagen satelital': satelite, 'OpenStreetMap': osm },
    overlays, { collapsed: movil, position: 'topright', sortLayers: false }
  ).addTo(map);

  // ---------- Escala ----------
  L.control.scale({ metric: true, imperial: false, position: 'bottomleft', maxWidth: 160 }).addTo(map);

  // ---------- Minimapa ----------
  if (!movil && L.Control.MiniMap) {
    new L.Control.MiniMap(L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd' }), {
      position: 'bottomright', toggleDisplay: true, zoomLevelOffset: -5, width: 160, height: 140,
      strings: { hideText: 'Ocultar minimapa', showText: 'Mostrar minimapa' }
    }).addTo(map);
  }

  // ---------- Botones propios (inicio, ubicación, medir) ----------
  function boton(titulo, svg, accion, pos) {
    var C = L.Control.extend({
      options: { position: pos || 'topleft' },
      onAdd: function () {
        var div = L.DomUtil.create('div', 'leaflet-bar btn-geo');
        var a = L.DomUtil.create('a', '', div);
        a.href = '#'; a.title = titulo; a.setAttribute('role', 'button'); a.innerHTML = svg;
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.on(a, 'click', function (e) { L.DomEvent.preventDefault(e); accion(a); });
        return div;
      }
    });
    return new C().addTo(map);
  }
  var SVG = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="#1f3b1f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };

  boton('Volver a toda la provincia', SVG('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'), function () { map.fitBounds(extension); });

  var marcaUbic = null;
  boton('Mi ubicación', SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'), function () {
    map.locate({ setView: true, maxZoom: 15, enableHighAccuracy: true });
  });
  map.on('locationfound', function (e) {
    if (marcaUbic) map.removeLayer(marcaUbic);
    marcaUbic = L.layerGroup([
      L.circle(e.latlng, { radius: e.accuracy, color: '#1976D2', weight: 1, fillOpacity: 0.12, interactive: false }),
      L.circleMarker(e.latlng, { radius: 7, color: '#fff', weight: 2, fillColor: '#1976D2', fillOpacity: 1 })
        .bindPopup('Usted está aquí (precisión ± ' + Math.round(e.accuracy) + ' m)')
    ]).addTo(map);
  });
  map.on('locationerror', function () { alert('No se pudo obtener su ubicación. Revise los permisos del navegador.'); });

  // Medir distancias
  var midiendo = false, puntos = [], lineaMed = null, etiquetas = L.layerGroup().addTo(map), aviso = null;
  function formato(m) { return m >= 1000 ? (m / 1000).toFixed(2).replace('.', ',') + ' km' : Math.round(m) + ' m'; }
  function limpiarMedida() { puntos = []; etiquetas.clearLayers(); if (lineaMed) { map.removeLayer(lineaMed); lineaMed = null; } }
  function clicMedida(e) {
    puntos.push(e.latlng);
    if (!lineaMed) lineaMed = L.polyline(puntos, { color: '#1f3b1f', weight: 3, dashArray: '6 4', interactive: false }).addTo(map);
    else lineaMed.setLatLngs(puntos);
    var total = 0; for (var i = 1; i < puntos.length; i++) total += map.distance(puntos[i - 1], puntos[i]);
    etiquetas.addLayer(L.circleMarker(e.latlng, { radius: 4, color: '#1f3b1f', fillColor: '#fff', fillOpacity: 1, weight: 2, interactive: false }));
    if (puntos.length > 1) etiquetas.addLayer(L.tooltip({ permanent: true, direction: 'right', className: 'medida-etq', offset: [8, 0] })
      .setLatLng(e.latlng).setContent(formato(total)));
  }
  var btnMed = boton('Medir distancia (clic en el mapa; vuelva a pulsar para terminar)',
    SVG('<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>'), function (a) {
      midiendo = !midiendo;
      a.classList.toggle('activo', midiendo);
      map.getContainer().style.cursor = midiendo ? 'crosshair' : '';
      if (midiendo) {
        limpiarMedida(); map.on('click', clicMedida); map.doubleClickZoom.disable();
        aviso = L.control({ position: 'bottomleft' });
        aviso.onAdd = function () { var d = L.DomUtil.create('div', 'aviso'); d.innerHTML = 'Haga clic en el mapa para medir. Pulse otra vez la regla para terminar.'; return d; };
        aviso.addTo(map);
      } else {
        map.off('click', clicMedida); map.doubleClickZoom.enable();
        if (aviso) { map.removeControl(aviso); aviso = null; }
        setTimeout(limpiarMedida, 4000);
      }
    });
  // mientras se mide no deben abrirse popups
  map.on('popupopen', function (e) { if (midiendo) map.closePopup(e.popup); });

  // ---------- Buscador de lugares (Nominatim, solo Bolivia) ----------
  if (L.Control.Geocoder) {
    L.Control.geocoder({
      position: 'topleft', placeholder: 'Buscar comunidad o lugar…', errorMessage: 'No se encontró el lugar',
      defaultMarkGeocode: true,
      geocoder: L.Control.Geocoder.nominatim({ geocodingQueryParams: { countrycodes: 'bo', 'accept-language': 'es' } })
    }).addTo(map);
  }

  // ---------- Buscador de vías, ríos y lagunas por nombre ----------
  var indice = {};
  todas.forEach(function (c) {
    c.geo.eachLayer(function (l) {
      var n = l.feature.properties.nombre;
      if (!n) return;
      (indice[n] = indice[n] || { capa: c, capas: [] }).capas.push(l);
    });
  });
  var Buscador = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function () {
      var d = L.DomUtil.create('div', 'buscador');
      d.innerHTML = '<input list="lista-nombres" placeholder="Buscar vía, río o laguna…" aria-label="Buscar por nombre">' +
        '<datalist id="lista-nombres">' + Object.keys(indice).sort().map(function (n) { return '<option value="' + n.replace(/"/g, '&quot;') + '">'; }).join('') + '</datalist>';
      L.DomEvent.disableClickPropagation(d); L.DomEvent.disableScrollPropagation(d);
      var inp = d.querySelector('input');
      function ir() {
        var r = indice[inp.value]; if (!r) return;
        if (!map.hasLayer(r.capa.grupo)) r.capa.grupo.addTo(map);
        var b = L.featureGroup(r.capas).getBounds();
        map.fitBounds(b, { maxZoom: 15, padding: [40, 40] });
        setTimeout(function () {
          actualizar(r.capa);
          r.capas.forEach(function (l) { l.fire('mouseover'); setTimeout(function () { l.fire('mouseout'); }, 2500); });
          r.capas[0].openPopup(b.getCenter());
        }, 400);
      }
      inp.addEventListener('change', ir);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ir(); });
      return d;
    }
  });
  new Buscador().addTo(map);

  map.attributionControl.addAttribution('Datos: &copy; colaboradores de OpenStreetMap (ODbL), 23/09/2026');
})();
