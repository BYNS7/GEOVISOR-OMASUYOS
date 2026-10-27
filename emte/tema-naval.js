/* Tema «Azul marino · curvas de nivel»: unifica la paleta de todos los módulos del geovisor.
   Los módulos traen sus colores escritos (índigo #070774 y dorado #b28405). Aquí se reemplazan
   en sus hojas de estilo por el azul marino y el latón del tema, sin tocar los colores del mapa
   ni de los símbolos militares. Se carga al final de index.html. */
(function(){
 const CAMBIOS=[
  [/#070774/gi,'#12294A'],[/#151592/gi,'#1C3A66'],[/#19198b/gi,'#1C3A66'],[/#0b1f6b/gi,'#12294A'],[/#13308f/gi,'#1C3A66'],
  [/#b28405/gi,'#B79A5B'],[/#b89a55/gi,'#B79A5B'],[/#bd9a4b/gi,'#B79A5B'],[/#c9a227/gi,'#B79A5B'],[/#e0b630/gi,'#C8AE72'],
  [/#dbc58a/gi,'#D9C79B'],[/#cfb77b/gi,'#D9C79B'],[/#edf0fa/gi,'#EEF2F8']
 ];
 const VIEJOS=['#070774','#b28405','#bd9a4b','#0b1f6b'];
 const cambiar=t=>CAMBIOS.reduce((s,[r,v])=>s.replace(r,v),t);
 function estilo(st){ if(st.dataset.tema)return; const t=st.textContent; const n=cambiar(t); if(n!==t)st.textContent=n; st.dataset.tema='1'; }
 function atributos(raiz){
  if(!raiz.querySelectorAll)return;
  const sel=VIEJOS.flatMap(c=>[`[fill="${c}"]`,`[stroke="${c}"]`,`[style*="${c.slice(1)}"]`]).join(',');
  const lista=raiz.matches&&raiz.matches(sel)?[raiz,...raiz.querySelectorAll(sel)]:raiz.querySelectorAll(sel);
  for(const el of lista){
   for(const a of ['fill','stroke','style']){const v=el.getAttribute(a); if(v){const n=cambiar(v); if(n!==v)el.setAttribute(a,n);}}
  }
 }
 // La hoja del tema debe quedar después de los estilos que agregan los módulos.
 function alFinal(){const l=document.getElementById('tema-naval-css'); if(l&&document.head&&document.head.lastElementChild!==l)document.head.append(l);}
 function todo(){ alFinal(); document.querySelectorAll('style').forEach(estilo); atributos(document.body||document.documentElement); }
 new MutationObserver(ms=>{
  for(const m of ms) for(const n of m.addedNodes){
   if(n.nodeType!==1)continue;
   if(n instanceof SVGElement&&n.tagName.toLowerCase()!=='svg')continue;   // el dibujo del mapa no se toca
   if(n.tagName==='STYLE'){estilo(n);alFinal();} else { n.querySelectorAll&&n.querySelectorAll('style').forEach(estilo); atributos(n); }
  }
 }).observe(document.documentElement,{childList:true,subtree:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(todo,0)); else todo();
 window.addEventListener('load',todo);
})();
