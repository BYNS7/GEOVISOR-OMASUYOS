document.addEventListener('DOMContentLoaded',()=>{
 const aside=document.querySelector('main>aside'),map=document.querySelector('.map');aside.id='panel-filtros';
 const style=document.createElement('style');style.textContent='main>aside[hidden]{display:none}.sidebar-toggle{position:absolute;left:12px;top:12px;z-index:12;display:flex;align-items:center;gap:7px;padding:9px 11px;border:1px solid #b28405;border-radius:9px;background:#070774;color:white;font:600 11px system-ui;box-shadow:0 3px 12px #0003}.sidebar-toggle svg{width:17px!important;height:17px!important;cursor:pointer!important}.sidebar-toggle:hover{background:#19198b}.sidebar-toggle:focus-visible{outline:3px solid #b28405;outline-offset:3px}.map .search{top:58px}.map .suggestions{top:112px}.map .legend{top:122px}';document.head.append(style);
 const button=document.createElement('button');button.type='button';button.className='sidebar-toggle';button.setAttribute('aria-controls','panel-filtros');button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg><span></span>';map.append(button);
 let hidden=true; // al ingresar, el panel lateral empieza cerrado
 function apply(){aside.hidden=hidden;button.setAttribute('aria-expanded',String(!hidden));button.querySelector('span').textContent=hidden?'Mostrar panel':'Ocultar panel';button.setAttribute('aria-label',hidden?'Mostrar panel de filtros y herramientas':'Ocultar panel de filtros y herramientas');requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')))}
 button.addEventListener('click',()=>{hidden=!hidden;try{localStorage.setItem('emte-panel-hidden',String(hidden))}catch(e){}apply()});apply();
});
// Al ingresar no se abre ninguna ficha por sí sola: la ficha de información aparece cuando el usuario elige algo en el mapa.
document.addEventListener('DOMContentLoaded',()=>{
 const info=document.getElementById('info');if(!info)return;let usuario=false;
 const marca=()=>{usuario=true};['pointerdown','keydown','touchstart'].forEach(t=>document.addEventListener(t,marca,{capture:true,once:true}));
 const cerrar=()=>{if(!usuario)info.hidden=true};cerrar();
 new MutationObserver(()=>setTimeout(cerrar,0)).observe(info,{childList:true,attributes:true,attributeFilter:['hidden']});
});
