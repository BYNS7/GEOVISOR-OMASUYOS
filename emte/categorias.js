document.addEventListener('DOMContentLoaded',()=>{
 const definitions=[
  ['education',()=>educationFeatures,'categoria','Categorías educativas','#6A3D9A'],
  ['health',()=>healthFeatures,'categoria','Categorías de salud','#D73027'],
  ['rivers',()=>riverFeatures,'tipo','Tipos de cursos de agua','#3182BD'],
  ['water',()=>waterFeatures,'tipo','Tipos de cuerpos de agua','#5f92ad']
 ];
 for(const [id,features,field,title,color] of definitions){
  const group=document.getElementById(id),master=document.querySelector(`#layers input[onchange*="${id}"]`);
  if(!group||!master)continue;
  master.removeAttribute('onchange');const label=master.closest('label');
  const menu=document.createElement('details');menu.className='layer-group';menu.style='margin:0 8px 8px';
  const summary=document.createElement('summary');summary.textContent=title;menu.append(summary);label.after(menu);
  const list=document.createElement('div');menu.append(list);list.textContent='Cargando categorías…';
  let checks=[],selection=new Set(),initialized=false;
  function apply(){group.style.display='';[...group.children].forEach(el=>el.style.display=selection.has(el.dataset.category)?'':'none');const n=checks.filter(x=>x.checked).length;master.checked=checks.length>0&&n===checks.length;master.indeterminate=n>0&&n<checks.length}
  function render(){
   const counts=new Map();const fs=features();
   [...group.children].forEach((el,i)=>{const raw=fs[i]?.properties?.[field];const type=raw===null||raw===undefined||raw===''?'Sin clasificación':String(raw);el.dataset.category=type;counts.set(type,(counts.get(type)||0)+1)});
   if(!initialized){selection=new Set(master.checked?counts.keys():[]);initialized=true}
   list.replaceChildren();checks=[];
   for(const [type,total] of [...counts].sort((a,b)=>a[0].localeCompare(b[0],'es'))){
    const row=document.createElement('label');row.style='font-size:11px;padding:10px 8px';
    const input=document.createElement('input');input.type='checkbox';input.checked=selection.has(type);checks.push(input);
    const swatch=document.createElement('span');swatch.className='dot';swatch.style.setProperty('--c',color);
    const name=document.createElement('span');name.textContent=type;
    const count=document.createElement('span');count.textContent=total.toLocaleString('es-BO');count.style='margin-left:auto;color:#64737b;font-size:10px';
    row.append(input,swatch,name,count);list.append(row);
    input.addEventListener('change',()=>{if(input.checked)selection.add(type);else selection.delete(type);apply()});
   }
   if(!counts.size)list.textContent='Sin objetos cargados en esta capa.';
   apply();
  }
  master.addEventListener('change',()=>{const state=master.checked;checks.forEach(input=>{input.checked=state;const type=input.parentElement.children[2].textContent;if(state)selection.add(type);else selection.delete(type)});apply()});
  new MutationObserver(render).observe(group,{childList:true});if(group.children.length)render();
 }
 const bounds=document.querySelector('#layers input[onchange*="bounds"]');
 if(bounds){const detail=document.createElement('small');detail.style='display:block;padding:0 8px 12px;color:#64737b';detail.textContent='Provincia Omasuyos · límite provincial referencial (1 objeto)';bounds.closest('label').after(detail)}
});
