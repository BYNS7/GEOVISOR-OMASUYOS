// Sources are explicit: a failed database read never passes as a live layer.
const sourcePanel=document.createElement('div');
sourcePanel.id='sources'; sourcePanel.style='font-size:11px;line-height:1.7';
const sourceTitle=document.createElement('h2'); sourceTitle.textContent='Fuentes de las capas';
document.querySelector('aside').append(sourceTitle,sourcePanel);
const originalFetch=window.fetch.bind(window);
window.fetch=async function(url,options){
 const m=typeof url==='string' && url.match(/^data\/(.+)\.geojson$/);
 if(!m)return originalFetch(url,options);
 const line=document.createElement('p');line.style='font-size:11px';
 const name=m[1].replaceAll('_',' ');line.textContent=name+': consultando…';sourcePanel.append(line);
 try{
  const r=await originalFetch('/api/capas/'+encodeURIComponent(m[1]));
  if(r.ok){line.textContent=name+': PostGIS';return r}
 }catch(e){}
 line.textContent=name+': copia GeoJSON (tabla no disponible)';
 return originalFetch(url,options);
};
document.addEventListener('DOMContentLoaded',()=>{
 // Road filters reflect actual tipo_via values and affect only map visibility.
 const roadGroup=document.getElementById('roads');
 const master=document.querySelector('#layers input[onchange*="roads"]');
 const roadMenu=master.closest('details');
 const children=document.createElement('div');children.style='padding:0 8px 8px';roadMenu.append(children);
 const families=[
  ['Carreteras',['Carretera RVF','Carretera principal (no RVF)']],
  ['Caminos',['Camino secundario','Camino terciario','Camino vecinal']],
  ['Vías urbanas',['Calle']],
  ['Herradura y senderos',['Camino de herradura / brecha','Sendero / peatonal']]
 ];
 const selected=new Set(Object.keys(roadStyles));let roadInputs=[];
 master.removeAttribute('onchange');
 const label=master.closest('label');label.lastChild.textContent='Todas las vías';
 function applyRoadFilters(){
  roadGroup.style.display='';
  [...roadGroup.children].forEach(path=>{path.style.display=selected.has(path.dataset.roadType)?'':'none'});
  const checked=roadInputs.filter(x=>x.checked).length;
  master.checked=roadInputs.length>0&&checked===roadInputs.length;
  master.indeterminate=checked>0&&checked<roadInputs.length;
 }
 function renderRoadFilters(){
  const counts=new Map();
  [...roadGroup.children].forEach((path,i)=>{const type=roadFeatures[i]?.properties?.tipo_via||'Sin clasificación';path.dataset.roadType=type;counts.set(type,(counts.get(type)||0)+1)});
  children.replaceChildren();roadInputs=[];
  const known=new Set(families.flatMap(x=>x[1]));
  const unknown=[...counts.keys()].filter(x=>!known.has(x));
  for(const type of unknown)selected.add(type);
  for(const [title,types] of [...families,...(unknown.length?[['Otras categorías',unknown]]:[])]){
   const details=document.createElement('details');details.className='layer-group';
   const summary=document.createElement('summary');summary.textContent=title;details.append(summary);
   for(const type of types){
    const row=document.createElement('label');row.style='font-size:11px;align-items:center';
    const input=document.createElement('input');input.type='checkbox';input.checked=selected.has(type);input.disabled=!counts.has(type);roadInputs.push(input);
    const swatch=document.createElement('span');swatch.style='width:20px;flex-shrink:0;border-top:3px '+(roadStyles[type]?.[2]?'dashed':'solid')+' '+(roadStyles[type]?.[0]||'#888');
    const text=document.createElement('span');text.textContent=type;
    const count=document.createElement('span');count.textContent=(counts.get(type)||0).toLocaleString('es-BO');count.style='margin-left:auto;color:#64737b;font-size:10px';
    row.append(input,swatch,text,count);details.append(row);
    input.addEventListener('change',()=>{if(input.checked)selected.add(type);else selected.delete(type);applyRoadFilters()});
   }
   children.append(details);
  }
  applyRoadFilters();
 }
 master.addEventListener('change',()=>{const all=master.checked;roadInputs.forEach(input=>{input.checked=all;const type=input.parentElement.children[2].textContent;if(all)selected.add(type);else selected.delete(type)});applyRoadFilters()});
 const roadObserver=new MutationObserver(renderRoadFilters);roadObserver.observe(roadGroup,{childList:true});
 if(roadGroup.children.length)renderRoadFilters();else children.textContent='Cargando categorías…';
 const ns='http://www.w3.org/2000/svg';
 const panel=document.createElement('section');panel.className='route-panel';
 panel.innerHTML='<h2>Ruta por distancia</h2><div class="route-buttons"><button id="pick-origin">Origen</button><button id="pick-destination">Destino</button></div><p id="route-points">Marca el origen y el destino en el mapa.</p><button id="calculate-route">Calcular ruta</button> <button id="clear-route">Limpiar</button><p id="route-result" role="status" aria-live="polite"></p><small>Red preliminar bidireccional. No verifica transitabilidad ni acceso.</small>';
 document.querySelector('aside').insertBefore(panel,sourceTitle);
 const group=document.createElementNS(ns,'g');group.id='route';group.style.pointerEvents='none';document.getElementById('scene').append(group);
 let mode=null,origin=null,destination=null,busy=false,version=0;
 const result=document.getElementById('route-result');
 function update(){document.getElementById('pick-origin').classList.toggle('chosen',mode==='origen');document.getElementById('pick-destination').classList.toggle('chosen',mode==='destino');svg.style.cursor=mode?'crosshair':'grab';document.getElementById('route-points').textContent='Origen: '+(origin?'marcado':'pendiente')+' · Destino: '+(destination?'marcado':'pendiente');document.getElementById('calculate-route').disabled=busy||!origin||!destination;}
 function dot(xy,color){
  const p=roadPoint(xy),anchor=document.createElementNS(ns,'g'),symbol=document.createElementNS(ns,'g');
  anchor.setAttribute('transform',`translate(${p[0]} ${p[1]})`);
  symbol.classList.add('route-dot');symbol.setAttribute('transform',`scale(${1/scale})`);
  const origin=color==='#13734c';
  const title=document.createElementNS(ns,'title');title.textContent=origin?'Origen GPS':'Destino GPS';anchor.append(title);
  function shape(tag,attrs){const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);symbol.append(el);return el}
  shape('ellipse',{cx:0,cy:2,rx:10,ry:3,fill:'#182d38',opacity:'.18'});
  // The pin tip is exactly on the selected geographic coordinate.
  shape('path',{d:'M0 0C-4-7-15-17-15-29A15 15 0 0 1 15-29C15-17 4-7 0 0Z',fill:color,stroke:'white','stroke-width':2.5,'stroke-linejoin':'round'});
  shape('path',{d:'M-10-30A10 10 0 0 1 0-40',fill:'none',stroke:'white','stroke-width':2,'stroke-linecap':'round',opacity:'.35'});
  shape('circle',{cx:0,cy:-29,r:8,fill:'none',stroke:'white','stroke-width':1.6});
  shape('path',{d:'M0-40V-35M0-23V-18M-11-29H-6M6-29H11',fill:'none',stroke:'white','stroke-width':1.6,'stroke-linecap':'round'});
  shape('path',{d:'M0-33L3-29L0-25L-3-29Z',fill:'white'});
  shape('rect',{x:-9,y:-57,width:18,height:13,rx:4,fill:'white',stroke:color,'stroke-width':1});
  const label=shape('text',{x:0,y:-47,'text-anchor':'middle','font-family':'system-ui,sans-serif','font-size':9,'font-weight':800,fill:color});label.textContent=origin?'O':'D';
  anchor.append(symbol);group.append(anchor);
 }
 function markers(){group.replaceChildren();if(origin)dot(origin,'#13734c');if(destination)dot(destination,'#b42330')}
 const previousZoom=zoom;zoom=function(f){previousZoom(f);document.querySelectorAll('.route-dot').forEach(c=>c.setAttribute('transform',`scale(${1/scale})`))};
 document.getElementById('pick-origin').onclick=()=>{mode='origen';update()};
 document.getElementById('pick-destination').onclick=()=>{mode='destino';update()};
 document.getElementById('clear-route').onclick=()=>{version++;origin=destination=mode=null;group.replaceChildren();result.textContent='';update()};
 // Pointerup remembers drag status before the existing click suppression resets it.
 let dragged=false;svg.addEventListener('pointerup',()=>{dragged=mapDragged});
 svg.addEventListener('click',e=>{
  if(!mode||dragged){dragged=false;return}
  e.stopImmediatePropagation();
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(document.getElementById('scene').getScreenCTM().inverse());
  const x=(p.x-500)/65759.1401421867-1.199706713376768;
  const y=(380-p.y)/65759.1401421867-0.2830464015276702;
  const xy=[x*180/Math.PI,(2*Math.atan(Math.exp(y))-Math.PI/2)*180/Math.PI];
  version++;if(mode==='origen')origin=xy;else destination=xy;
  mode=null;result.textContent='';markers();update();
 },{capture:true});
 document.getElementById('calculate-route').onclick=async()=>{
  if(busy||!origin||!destination)return;
  busy=true;const requestVersion=version;update();result.textContent='Calculando…';
  try{
   const r=await originalFetch('/api/ruta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origen:origin,destino:destination})});
   const d=await r.json();if(requestVersion!==version)return;
   if(!r.ok)throw Error(d.error||'No se pudo calcular la ruta.');
   group.replaceChildren();
   for(const f of d.features){const path=document.createElementNS(ns,'path');path.setAttribute('d','M'+f.geometry.coordinates.map(c=>roadPoint(c).join(',')).join(' L'));path.setAttribute('fill','none');path.setAttribute('stroke','#1F51FF');path.setAttribute('stroke-width','5');path.setAttribute('vector-effect','non-scaling-stroke');group.append(path)}
   dot(d.origen_nodo,'#13734c');dot(d.destino_nodo,'#b42330');
   result.textContent=(d.distancia_m/1000).toLocaleString('es-BO',{maximumFractionDigits:2})+' km por la red. Ajuste a la vía: origen '+Math.round(d.ajuste_origen_m)+' m; destino '+Math.round(d.ajuste_destino_m)+' m. No incluye esos accesos.';
  }catch(e){if(requestVersion===version)result.textContent=e.message}
  finally{busy=false;update()}
 };
 originalFetch('/api/estado').then(r=>r.json()).then(d=>{document.querySelector('.legend').textContent=d.error||'POSTGIS CONECTADO · RUTAS DE PRUEBA';}).catch(()=>{document.querySelector('.legend').textContent='No se pudo conectar con el servicio local.'});
 update();
});
