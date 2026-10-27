document.addEventListener('DOMContentLoaded',()=>{
 // Minimapa. Rendimiento (20-10-2026): el dibujo del territorio queda quieto en su propio SVG y
 // solo se mueve el recuadro dorado, que va en otro SVG encima; así el minimapa no se vuelve a
 // pintar entero en cada movimiento. No copia el detalle menor (calles, senderos, quebradas)
 // ni las capas de herramientas, y solo se reconstruye cuando cambian las capas de datos.
 const map=document.querySelector('.map'),scene=document.getElementById('scene'),main=scene.ownerSVGElement,ns='http://www.w3.org/2000/svg';
 const box=document.createElement('div');box.className='overview';box.setAttribute('role','img');box.setAttribute('aria-label','Minimapa del territorio completo; el recuadro dorado indica la vista actual');
 const title=document.createElement('div');title.className='overview-title';title.textContent='VISTA GENERAL · OMASUYOS';box.append(title);
 const mini=document.createElementNS(ns,'svg');mini.setAttribute('viewBox','0 0 1000 760');mini.style.pointerEvents='none';
 const shapes=document.createElementNS(ns,'g');mini.append(shapes);
 const capaMarco=document.createElementNS(ns,'svg');capaMarco.setAttribute('viewBox','0 0 1000 760');capaMarco.style.cssText='position:absolute;inset:0;pointer-events:none;will-change:transform';
 const frame=document.createElementNS(ns,'rect');frame.setAttribute('fill','#b2840520');frame.setAttribute('stroke','#b28405');frame.setAttribute('stroke-width','2');frame.setAttribute('vector-effect','non-scaling-stroke');capaMarco.append(frame);
 box.append(mini,capaMarco);map.append(box);
 const IGNORAR=/^(basemap|measurement|route|topo-|cc-)/;
 const DETALLE=new Set(['#666666','#8C8C8C','#9C755F','#777777']); // calles, vecinales, herradura y senderos
 const fuera=n=>{for(let e=n;e&&e!==scene;e=e.parentNode)if(e.id&&IGNORAR.test(e.id))return true;return false};
 let pending=false,rebuild=true;
 function reconstruir(){
  shapes.replaceChildren();
  for(const child of scene.children){if(child.id&&IGNORAR.test(child.id))continue;const copy=child.cloneNode(true);copy.removeAttribute('id');
   copy.querySelectorAll('.rio-detalle').forEach(e=>e.remove());
   if(child.id==='roads')copy.querySelectorAll('path').forEach(e=>{if(DETALLE.has(e.getAttribute('stroke')))e.remove()});
   copy.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));copy.querySelectorAll('[onclick]').forEach(e=>e.removeAttribute('onclick'));shapes.append(copy)}
  try{const b=shapes.getBBox();if(b.width&&b.height){const pad=Math.max(b.width,b.height)*.05,vb=`${b.x-pad} ${b.y-pad} ${b.width+pad*2} ${b.height+pad*2}`;mini.setAttribute('viewBox',vb);capaMarco.setAttribute('viewBox',vb)}}catch(e){}
 }
 function draw(){pending=false;if(rebuild){rebuild=false;reconstruir()}
  const matrix=scene.getScreenCTM(),r=main.getBoundingClientRect();if(!matrix||!r.width)return;const inverse=matrix.inverse(),a=new DOMPoint(r.left,r.top).matrixTransform(inverse),b=new DOMPoint(r.right,r.bottom).matrixTransform(inverse);frame.setAttribute('x',a.x);frame.setAttribute('y',a.y);frame.setAttribute('width',Math.max(0,b.x-a.x));frame.setAttribute('height',Math.max(0,b.y-a.y));}
 function schedule(){if(!pending){pending=true;requestAnimationFrame(draw)}}
 new MutationObserver(records=>{let mover=false;for(const r of records){if(r.target===scene&&r.type==='attributes'){mover=true;continue}if(fuera(r.target))continue;if(r.type==='childList'){if(r.target===scene&&[...r.addedNodes,...r.removedNodes].every(n=>IGNORAR.test(n.id||'')))continue;rebuild=true;mover=true}}if(mover)schedule()}).observe(scene,{attributes:true,attributeFilter:['transform'],childList:true,subtree:true});
 window.addEventListener('resize',schedule);schedule();
});
