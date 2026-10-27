// WGS84 / UTM zone 19S. Series for the transverse Mercator projection.
window.omasuyosUTM19=function(lon,lat){
 const rad=Math.PI/180,a=6378137,e2=0.0066943799901413165,k=.9996;
 const phi=lat*rad,L=(lon+69)*rad,ep=e2/(1-e2),sin=Math.sin(phi),cos=Math.cos(phi),tan=Math.tan(phi);
 const N=a/Math.sqrt(1-e2*sin*sin),T=tan*tan,C=ep*cos*cos,A=cos*L;
 const M=a*((1-e2/4-3*e2**2/64-5*e2**3/256)*phi-(3*e2/8+3*e2**2/32+45*e2**3/1024)*Math.sin(2*phi)+(15*e2**2/256+45*e2**3/1024)*Math.sin(4*phi)-(35*e2**3/3072)*Math.sin(6*phi));
 return [500000+k*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep)*A**5/120),10000000+k*(M+N*tan*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*ep)*A**6/720))];
};
window.omasuyosMedir=function(points){
 let length=0,area=0;
 for(let i=1;i<points.length;i++)length+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);
 if(points.length>=3){const [ox,oy]=points[0];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=(a[0]-ox)*(b[1]-oy)-(b[0]-ox)*(a[1]-oy);}}
 let crossed=false;
 const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
  if(j===i+1||(i===0&&j===points.length-1))continue;
  const a=points[i],b=points[(i+1)%points.length],c=points[j],d=points[(j+1)%points.length];
  if(orient(a,b,c)*orient(a,b,d)<=0&&orient(c,d,a)*orient(c,d,b)<=0&&Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<=Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))&&Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<=Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1])))crossed=true;
 }
 return {length,area:Math.abs(area)/2,crossed};
};
document.addEventListener('DOMContentLoaded',()=>{
 const ns='http://www.w3.org/2000/svg',scene=document.getElementById('scene'),drawing=document.createElementNS(ns,'g');drawing.id='measurement';drawing.style.pointerEvents='none';scene.append(drawing);
 const menu=document.createElement('details');menu.className='layer-menu';
 menu.innerHTML='<summary>Herramientas del mapa</summary><div style="padding:12px"><div style="display:grid;gap:6px"><button type="button" data-tool="distance">↔ Medir distancias</button><button type="button" data-tool="area">▱ Medir áreas</button><button type="button" data-tool="coords">⌖ Consultar coordenadas</button></div><p id="measurement-help" style="font-size:12px">Selecciona una herramienta.</p><output id="measurement-result" style="display:block;font-size:12px;white-space:pre-line;line-height:1.7" aria-live="polite"></output><div style="display:flex;gap:6px;margin-top:10px"><button type="button" id="measurement-finish">Terminar</button><button type="button" id="measurement-undo">Deshacer</button><button type="button" id="measurement-clear">Borrar</button></div><small style="display:block;margin-top:10px;font-size:10px">Mediciones planimétricas aproximadas en WGS84 / UTM 19S. No incluyen pendiente del terreno.</small></div>';
 const layers=document.querySelector('aside .layer-menu');layers.parentNode.insertBefore(menu,layers);
 let mode=null,points=[],finished=false;
 const help=menu.querySelector('#measurement-help'),result=menu.querySelector('#measurement-result'),finish=menu.querySelector('#measurement-finish'),undo=menu.querySelector('#measurement-undo');
 const fmt=(v,d=2)=>v.toLocaleString('es-BO',{minimumFractionDigits:d,maximumFractionDigits:d});
 function mapLabel(x,y,label){const g=document.createElementNS(ns,'g');g.setAttribute('transform',`translate(${x} ${y}) scale(${1/scale})`);const t=document.createElementNS(ns,'text');t.setAttribute('text-anchor','middle');t.setAttribute('y','-10');t.setAttribute('fill','#070774');t.setAttribute('stroke','white');t.setAttribute('stroke-width','4');t.setAttribute('paint-order','stroke');t.setAttribute('font-family','system-ui');t.setAttribute('font-size','14');t.setAttribute('font-weight','700');t.textContent=label;g.append(t);drawing.append(g)}
 function draw(){
  drawing.replaceChildren();
  if(points.length){const shape=document.createElementNS(ns,mode==='area'?'polygon':'polyline');shape.setAttribute('points',points.map(p=>p.map.join(',')).join(' '));shape.setAttribute('fill',mode==='area'?'#bd9a4b44':'none');shape.setAttribute('stroke','#070774');shape.setAttribute('stroke-width','3');shape.setAttribute('vector-effect','non-scaling-stroke');drawing.append(shape);
   for(const p of points){const group=document.createElementNS(ns,'g');group.setAttribute('transform',`translate(${p.map.join(' ')}) scale(${1/scale})`);const dot=document.createElementNS(ns,'circle');dot.setAttribute('r','4');dot.setAttribute('fill','#bd9a4b');dot.setAttribute('stroke','white');dot.setAttribute('stroke-width','1.5');group.append(dot);drawing.append(group);}}
  finish.disabled=!mode||mode==='coords'||finished||points.length<(mode==='area'?3:2);undo.disabled=!points.length||mode==='coords';if(mode==='area'&&omasuyosMedir(points.map(p=>p.utm)).crossed)finish.disabled=true;
  if(mode==='distance'&&points.length>=2){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=omasuyosMedir([a.utm,b.utm]).length;mapLabel((a.map[0]+b.map[0])/2,(a.map[1]+b.map[1])/2,d>=1000?fmt(d/1000)+' km':fmt(d)+' m')}}
  if(mode==='area'&&points.length>=3){const m=omasuyosMedir(points.map(p=>p.utm));if(!m.crossed)mapLabel(points.reduce((v,p)=>v+p.map[0],0)/points.length,points.reduce((v,p)=>v+p.map[1],0)/points.length,fmt(m.area)+' m² · '+fmt(m.area/10000,3)+' ha')}
  if(mode==='distance'){const m=omasuyosMedir(points.map(p=>p.utm));result.textContent='Distancia: '+(m.length>=1000?fmt(m.length/1000)+' km':fmt(m.length)+' m');}
  if(mode==='area'){const m=omasuyosMedir(points.map(p=>p.utm));result.textContent=points.length<3?'Marca al menos 3 vértices.':m.crossed?'Los lados se cruzan. Pulsa Deshacer y corrige los vértices.':'Área: '+fmt(m.area)+' m²\n'+fmt(m.area/10000,3)+' ha';}
 }
 function select(kind){mode=kind;finished=false;points=[];result.textContent='';drawing.replaceChildren();menu.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('chosen',b.dataset.tool===kind));help.textContent=kind==='coords'?'Haz clic en el mapa para consultar las coordenadas.':'Haz clic para añadir vértices. Arrastra para desplazarte; usa la rueda para acercarte. Pulsa Terminar al finalizar.';draw();}
 menu.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>select(b.dataset.tool));
 finish.onclick=()=>{finished=true;help.textContent='Medición terminada. Selecciona una herramienta para comenzar otra.';draw();menu.querySelectorAll('[data-tool]').forEach(b=>b.classList.remove('chosen'));};
 undo.onclick=()=>{finished=false;points.pop();draw();};
 menu.querySelector('#measurement-clear').onclick=()=>{mode=null;points=[];finished=false;drawing.replaceChildren();result.textContent='';help.textContent='Selecciona una herramienta.';menu.querySelectorAll('[data-tool]').forEach(b=>b.classList.remove('chosen'));draw();};
 svg.addEventListener('click',event=>{
  if(!mode||finished)return;
  event.preventDefault();event.stopImmediatePropagation();
  const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(scene.getScreenCTM().inverse()),K=65759.1401421867;
  const lon=((p.x-500)/K-1.199706713376768)*180/Math.PI,lat=Math.atan(Math.sinh((380-p.y)/K-.2830464015276702))*180/Math.PI;
  if(lon< -72||lon> -66||lat>=0||lat< -80){help.textContent='La consulta UTM 19S requiere una ubicación dentro de la zona 19 del hemisferio sur.';return;}
  const utm=omasuyosUTM19(lon,lat);
  if(mode==='coords'){points=[{map:[p.x,p.y],utm}];draw();result.textContent=`WGS84 · EPSG:4326\nLongitud: ${fmt(lon,6)}°\nLatitud: ${fmt(lat,6)}°\nUTM 19S · EPSG:32719\nEste: ${fmt(utm[0])} m\nNorte: ${fmt(utm[1])} m`;}
  else {const prev=points.at(-1);if(prev&&Math.hypot(utm[0]-prev.utm[0],utm[1]-prev.utm[1])<.001)return;points.push({map:[p.x,p.y],utm});draw();}
 },{capture:true});
 document.addEventListener('click',e=>{if(e.target.closest('.route-panel button')){mode=null;finished=true;menu.querySelectorAll('[data-tool]').forEach(b=>b.classList.remove('chosen'));finish.disabled=true;undo.disabled=true;}},{capture:true});
 new MutationObserver(()=>{if(points.length)draw();}).observe(scene,{attributes:true,attributeFilter:['transform']});draw();
});
