/* Ficha del establecimiento de salud + formulario ACTUALIZAR DATOS.
   Datos base: capa de salud (PostGIS o copia GeoJSON).
   Datos complementarios: data/centros_salud_complemento.json (por id_salud).
   Actualizaciones hechas desde el geovisor: /api/salud/ediciones (servidor, salud_edicion.py);
   tienen prioridad sobre los demás datos. Guardar exige la CONTRASEÑA DE EDICIÓN. */
(function(){
 let extra={}, ediciones={};
 fetch('data/centros_salud_complemento.json').then(r=>r.ok?r.json():{}).then(d=>{extra=d||{}}).catch(()=>{});
 const cargarEdiciones=()=>fetch('/api/salud/ediciones',{cache:'no-store'}).then(r=>r.ok?r.json():{}).then(d=>{ediciones=d||{}}).catch(()=>{});
 cargarEdiciones();
 window.EMTE_SALUD_RECARGAR=cargarEdiciones;   // usado por el historial de cambios (ficha-modelo.js)

 // Campos de la ficha y del formulario (mismo orden).
 const SECC=[
  ['1. IDENTIFICACIÓN',[['nombre','NOMBRE DEL ESTABLECIMIENTO',{ancho:1}],['categoria','CATEGORÍA'],['tipo','TIPO'],['nivel','NIVEL DE ATENCIÓN',{op:['1ER NIVEL','2DO NIVEL','3ER NIVEL']}],
    ['subsector','SUBSECTOR'],['dependencia','DEPENDENCIA',{ancho:1}],['area_red','RED DE SALUD'],['codigo_snis','CÓDIGO SNIS']]],
  ['2. CAPACIDAD DE ATENCIÓN',[['emergencia','EMERGENCIA',{op:['SÍ','BÁSICA','NO']}],['internacion','INTERNACIÓN',{op:['SÍ','NO']}],
    ['horario','HORARIO',{lista:['24 HORAS','08:00 A 16:00','08:00 A 18:00','LUNES A VIERNES 08:00 A 18:00']}],['laboratorio','LABORATORIO',{op:['SÍ','BÁSICO','NO']}],
    ['especialidades','ESPECIALIDADES',{area:1}],['servicios','SERVICIOS',{area:1}],['atencion','ATENCIÓN'],['camas','CAMAS',{num:1}],
    ['quirofano','QUIRÓFANO'],['sala_partos','SALA DE PARTOS'],['personal','PERSONAL',{area:1}]]],
  ['3. UBICACIÓN Y ACCESO',[['_este','ESTE (UTM 19S)',{fijo:1}],['_norte','NORTE (UTM 19S)',{fijo:1}],['_latlon','LATITUD / LONGITUD',{fijo:1,ancho:1}],
    ['municipio','MUNICIPIO'],['comunidad','COMUNIDAD'],['direccion','DIRECCIÓN',{ancho:1}],['altitud','ALTITUD (M S.N.M.)'],['acceso','ACCESO',{area:1}]]],
  ['4. COMUNICACIÓN Y CONTACTO',[['telefono','TELÉFONO'],['responsable','RESPONSABLE'],['web','PÁGINA / FACEBOOK',{tal:1,ancho:1}],['correo','CORREO ELECTRÓNICO',{tal:1}]]],
  ['5. APOYO LOGÍSTICO',[['ambulancias_municipio','AMBULANCIAS (DEL MUNICIPIO)'],['ambulancias_propias','AMBULANCIAS PROPIAS'],['hospital_referencia','HOSPITAL DE REFERENCIA',{ancho:1}]]]
 ];

 const css=document.createElement('style');
 css.textContent=`
 .popup.ficha-salud{width:390px;max-height:74vh;padding:0 16px 16px}
 .popup.ficha-salud .fs-head{padding-right:44px}
 .popup.ficha-salud .fs-close{position:absolute!important;top:50%!important;right:8px!important;transform:translateY(-50%);z-index:3;width:30px;height:30px;border:1px solid #07077430;border-radius:50%;padding:0;background:#edf0fa;color:#070774;font-size:22px;line-height:1;cursor:pointer}
 .popup.ficha-salud .fs-close:hover{background:#070774;color:#fff}
 .fs-head{position:sticky;top:0;z-index:2;display:grid;grid-template-columns:58px 1fr 58px;align-items:center;gap:8px;margin:0 -16px 8px;padding:10px 12px;background:#fff;border-bottom:3px solid #0b1f6b}
 .fs-head img{width:58px;height:58px;object-fit:contain;display:block}
 .fs-head .fs-tit{text-align:center;line-height:1.2}
 .fs-head .fs-tit b{display:block;font-size:12.5px;color:#0b1f6b;letter-spacing:.4px}
 .fs-head .fs-tit small{display:block;font-size:9.5px;color:#7a6b40;letter-spacing:.8px;margin-top:2px}
 .popup.ficha-salud h3{margin:6px 0 2px;font-size:16px;color:#0b1f6b;text-align:center}
 .fs-cat{display:block;text-align:center;font-size:10.5px;color:#7a6b40;letter-spacing:.6px}
 .fs-foto{display:block;width:100%;max-height:200px;object-fit:cover;border-radius:7px;margin:8px 0 2px;background:#eef0f6}
 .fs-badges{display:flex;flex-wrap:wrap;justify-content:center;gap:5px;margin:8px 0 4px}
 .fs-b{font-size:10.5px;font-weight:700;padding:3px 7px;border-radius:12px;border:1px solid}
 .fs-si{background:#e5f5ea;color:#17703a;border-color:#9bd3ad}
 .fs-med{background:#fff4dc;color:#8a5a00;border-color:#f0cf7d}
 .fs-no{background:#f1f2f6;color:#8a90a5;border-color:#d8dbe5}
 .fs-blq{margin-top:10px;border:1px solid #e1e4ee;border-radius:7px;overflow:hidden}
 .fs-blq h4{margin:0;padding:5px 8px;font-size:11px;letter-spacing:.5px;background:#0b1f6b;color:#fff;text-transform:uppercase}
 .fs-row{display:grid;grid-template-columns:42% 58%;font-size:11.5px;border-top:1px solid #eef0f5}
 .fs-row:first-of-type{border-top:0}
 .fs-row b{padding:4px 8px;color:#0b1f6b;font-weight:600}
 .fs-row span{padding:4px 8px;word-break:break-word}
 .fs-vacio{color:#a3a8ba}
 .fs-src{font-size:9.5px;color:#7b8197;display:block}
 .fs-upd{margin:10px 0 0;font-size:10px;color:#6b7187;text-align:center;letter-spacing:.3px}
 .fs-act{display:block;width:100%;margin-top:12px;padding:9px;border:0;border-radius:7px;background:#c9a227;color:#0b1f6b;font-weight:800;font-size:12px;letter-spacing:1px;cursor:pointer}
 .fs-act:hover{background:#e0b630}
 /* ---- Formulario ---- */
 .fa-fondo{position:fixed;inset:0;z-index:4000;background:#0b123acc;display:flex;align-items:center;justify-content:center;padding:16px}
 .fa{width:min(820px,100%);max-height:94vh;display:flex;flex-direction:column;background:#f4f6fb;border-radius:12px;box-shadow:0 20px 60px #0008;overflow:hidden;text-transform:uppercase;margin:0}
 .fa-cab{display:grid;grid-template-columns:62px 1fr 62px 34px;gap:10px;align-items:center;padding:10px 14px;background:#fff;border-bottom:4px solid #0b1f6b}
 .fa-cab img{width:62px;height:62px;object-fit:contain}
 .fa-cab .t{text-align:center;line-height:1.25}
 .fa-cab .t b{display:block;color:#0b1f6b;font-size:14px;letter-spacing:.6px}
 .fa-cab .t span{display:block;color:#7a6b40;font-size:11px;letter-spacing:.8px;margin-top:3px}
 .fa-cab button{width:32px;height:32px;border-radius:50%;border:1px solid #07077430;background:#edf0fa;color:#070774;font-size:22px;line-height:1;cursor:pointer;padding:0}
 .fa-cuerpo{overflow:auto;padding:12px 16px 4px}
 .fa fieldset{border:1px solid #d9deeb;border-radius:9px;background:#fff;margin:0 0 12px;padding:0 0 10px;min-width:0}
 .fa legend{margin-left:10px;padding:3px 10px;border-radius:5px;background:#0b1f6b;color:#fff;font-size:11.5px;font-weight:700;letter-spacing:.8px}
 .fa .g{display:grid;grid-template-columns:1fr 1fr;gap:9px 14px;padding:8px 12px 0}
 .fa .g .w{grid-column:1/-1}
 .fa .g{align-items:start}
 .fa .g,.fa .g *{text-align:left!important}
 .fa label{align-items:stretch!important}
 .fa label{text-align:left!important;margin:0!important;padding:0!important;line-height:1.3}
 .fa input,.fa select,.fa textarea{margin:0!important;height:auto;min-height:34px}
 .fa fieldset+fieldset{margin-top:0}
 .fa label{display:flex;flex-direction:column;gap:3px;font-size:10.5px;font-weight:700;color:#0b1f6b;letter-spacing:.5px;min-width:0}
 .fa input,.fa select,.fa textarea{font:inherit;font-size:12.5px;font-weight:500;color:#1b2140;text-transform:uppercase;padding:7px 9px;border:1px solid #c9cfdf;border-radius:6px;background:#fbfcff;width:100%;box-sizing:border-box}
 .fa textarea{min-height:52px;resize:vertical}
 .fa input:focus,.fa select:focus,.fa textarea:focus{outline:none;border-color:#0b1f6b;box-shadow:0 0 0 3px #0b1f6b22;background:#fff}
 .fa input.tal{text-transform:none}
 .fa input[readonly]{background:#eef0f6;color:#6b7187}
 .fa .nota{font-size:9.5px;font-weight:500;color:#7b8197;letter-spacing:.3px}
 .fa .foto{display:grid;grid-template-columns:200px 1fr;gap:14px;align-items:center;padding:10px 12px 0}
 .fa .foto .prev{width:200px;height:130px;border-radius:8px;border:2px dashed #c9cfdf;background:#f6f7fb center/cover no-repeat;display:flex;align-items:center;justify-content:center;color:#a3a8ba;font-size:10px;text-align:center}
 .fa .foto .btns{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px}
 .fa .b2{padding:8px 12px;border-radius:6px;border:1px solid #0b1f6b;background:#fff;color:#0b1f6b;font-weight:700;font-size:11px;letter-spacing:.6px;cursor:pointer}
 .fa .b2:hover{background:#0b1f6b;color:#fff}
 .fa-pie{display:flex;align-items:center;gap:10px;padding:10px 16px;background:#fff;border-top:1px solid #d9deeb}
 .fa-pie .msg{flex:1;font-size:11px;font-weight:700;letter-spacing:.4px}
 .fa-pie .msg.err{color:#b3261e}.fa-pie .msg.ok{color:#17703a}
 .fa-pie .cancel{padding:9px 16px;border-radius:7px;border:1px solid #c9cfdf;background:#fff;color:#4a5068;font-weight:700;font-size:12px;letter-spacing:.6px;cursor:pointer}
 .fa-pie .guardar{padding:9px 18px;border-radius:7px;border:0;background:#0b1f6b;color:#fff;font-weight:800;font-size:12px;letter-spacing:.8px;cursor:pointer}
 .fa-pie .guardar[disabled]{opacity:.6;cursor:wait}
 @media(max-width:640px){.fa .g{grid-template-columns:1fr}.fa .foto{grid-template-columns:1fr}.fa-cab{grid-template-columns:44px 1fr 44px 34px}.fa-cab img{width:44px;height:44px}}`;
 document.head.append(css);

 const vacio=v=>v===null||v===undefined||v==='';
 const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!==undefined)e.textContent=txt;return e};

 function badge(label,val){
  const v=String(val||'').toLowerCase();
  const cls=v.startsWith('sí')||v.startsWith('si')||v==='24 horas'?'fs-si':v.startsWith('básic')||v.startsWith('basic')?'fs-med':'fs-no';
  const icon=cls==='fs-si'?'✔':cls==='fs-med'?'◐':'✖';
  return el('span','fs-b '+cls,icon+' '+label);
 }

 function bloque(titulo,filas){
  const b=el('div','fs-blq');b.append(el('h4',null,titulo));
  for(const [label,val,src] of filas){
   const r=el('div','fs-row');r.append(el('b',null,label));
   const s=el('span');
   if(vacio(val)){s.textContent='Sin dato';s.classList.add('fs-vacio')}
   else if(typeof val==='string'&&/^https?:\/\//.test(val)){const a=el('a',null,'Abrir enlace');a.href=val;a.target='_blank';a.rel='noopener';s.append(a)}
   else s.textContent=String(val);
   if(src&&!vacio(val))s.append(el('small','fs-src','Fuente: '+src));
   r.append(s);b.append(r);
  }
  return b;
 }

 // Valor final de un campo: actualización del geovisor > complemento > capa base.
 function valores(f){
  const p=f.properties||{}, x=extra[String(p.id_salud)]||{}, e=ediciones[String(p.id_salud)]||{};
  const fx=x.fuentes||{};
  const V=k=>(k in e)?e[k]:(!vacio(x[k])?x[k]:p[k]);
  const S=k=>(k in e)?null:(!vacio(x[k])?fx[k]:null);
  const n=v=>vacio(v)?v:Number(v).toLocaleString('es-BO',{maximumFractionDigits:6});
  const fijos={_este:vacio(p.este_origen)?null:Math.round(p.este_origen)+' m',_norte:vacio(p.norte_origen)?null:Math.round(p.norte_origen)+' m',
   _latlon:vacio(p.latitud_origen)?null:n(p.latitud_origen)+' , '+n(p.longitud_origen)};
  return {p,e,V,S,fijos};
 }

 window.selectHealth=function(f){
  const {e,V,S,fijos}=valores(f);
  const info=document.getElementById('info');info.replaceChildren();info.classList.add('ficha-salud');info.hidden=false;info.scrollTop=0;

  // Encabezado: logo del Ejército (izq.) · título (centro) · logo EMTE (der.) · cerrar
  const hd=el('div','fs-head');
  const l1=el('img');l1.src='assets/logos/ejercito_bolivia.png';l1.alt='Ejército de Bolivia';
  const l2=el('img');l2.src='assets/logos/emte.png';l2.alt='Escuela Militar de Topografía del Ejército';
  const tt=el('div','fs-tit');tt.append(el('b',null,'FICHA DE ESTABLECIMIENTO DE SALUD'),el('small',null,'GEOVISOR OMASUYOS · EMTE'));
  const cx=el('button','feature-close fs-close','×');cx.type='button';cx.title='Cerrar ficha';cx.setAttribute('aria-label','Cerrar ficha de información');
  cx.onclick=ev=>{ev.stopPropagation();info.hidden=true};
  hd.append(l1,tt,l2,cx);info.append(hd);

  info.append(el('h3',null,V('nombre')||'Establecimiento sin nombre'));
  if(V('categoria'))info.append(el('span','fs-cat',V('categoria')));
  if(e.foto){const im=el('img','fs-foto');im.src=e.foto;im.alt='Foto de '+(V('nombre')||'');im.onerror=()=>im.remove();info.append(im)}

  const em=String(V('emergencia')||''), hr=String(V('horario')||'');
  const bd=el('div','fs-badges');
  bd.append(badge('Emergencia'+(em&&!/^(no|sí|si)$/i.test(em)?' '+em.toLowerCase():''),em),
            badge('Internación',V('internacion')),
            badge(/24/.test(hr)?'24 horas':'No 24 h',/24/.test(hr)?'Sí':'No'),
            badge('Laboratorio',V('laboratorio')));
  info.append(bd);

  for(const [tit,campos] of SECC){
   info.append(bloque(tit,campos.map(([k,label])=>{
    const lab=label;
    if(k.startsWith('_'))return [lab,fijos[k]];
    const v=V(k);
    if(k==='hospital_referencia'&&vacio(v)&&!String(V('categoria')||'').toUpperCase().startsWith('HOSPITAL'))return [lab,'Hospital Achacachi (2do nivel)','red de salud de Omasuyos'];
    return [lab,v,S(k)];
   })));
  }
  if(e.actualizado)info.append(el('p','fs-upd','ÚLTIMA ACTUALIZACIÓN: '+e.actualizado+(e.actualizado_por?' · '+e.actualizado_por:'')));

  const act=el('button','fs-act','✎ ACTUALIZAR DATOS');act.type='button';
  act.onclick=()=>abrirFormulario(f);
  info.append(act);
 };

 // ---------- Formulario de actualización ----------
 async function token(){
  const r=await fetch('/api/sesion',{cache:'no-store'});
  if(!r.ok)throw new Error('TU SESIÓN TERMINÓ. VUELVE A INICIAR SESIÓN.');
  return (await r.json()).csrf;
 }

 // Reduce la foto en el navegador (máx. 1600 px y ~600 KB) antes de enviarla.
 async function comprimir(file){
  const bm=await createImageBitmap(file);
  let lado=1600, q=0.85, url='';
  for(let i=0;i<10;i++){
   const k=Math.min(1,lado/Math.max(bm.width,bm.height));
   const c=document.createElement('canvas');c.width=Math.round(bm.width*k);c.height=Math.round(bm.height*k);
   const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(bm,0,0,c.width,c.height);
   url=c.toDataURL('image/jpeg',q);
   if(url.length*0.75<600*1024)return url;
   if(q>0.6)q-=0.1;else lado=Math.round(lado*0.8);
  }
  return url;
 }

 function abrirFormulario(f){
  const {p,e,V,fijos}=valores(f);
  const fondo=el('div','fa-fondo');const fa=el('form','fa');fa.noValidate=true;fondo.append(fa);
  const esc=ev=>{if(ev.key==='Escape')cerrar()};
  const cerrar=()=>{fondo.remove();document.removeEventListener('keydown',esc)};
  document.addEventListener('keydown',esc);

  const cab=el('div','fa-cab');
  const i1=el('img');i1.src='assets/logos/ejercito_bolivia.png';i1.alt='Ejército de Bolivia';
  const i2=el('img');i2.src='assets/logos/emte.png';i2.alt='EMTE';
  const t=el('div','t');t.append(el('b',null,'ACTUALIZACIÓN DE DATOS · ESTABLECIMIENTO DE SALUD'),el('span',null,String(V('nombre')||'').toUpperCase()));
  const x=el('button',null,'×');x.type='button';x.title='Cerrar';x.onclick=cerrar;
  cab.append(i1,t,i2,x);fa.append(cab);

  const cuerpo=el('div','fa-cuerpo');fa.append(cuerpo);
  const inputs={};
  for(const [tit,campos] of SECC){
   const fs=el('fieldset');fs.append(el('legend',null,tit));const g=el('div','g');fs.append(g);
   for(const [k,label,o={}] of campos){
    const lb=el('label',o.ancho||o.area?'w':null);lb.append(document.createTextNode(label));
    let inp;
    const actual=k.startsWith('_')?fijos[k]:V(k);
    const val=vacio(actual)?'':String(actual);
    if(o.op){
     inp=el('select');inp.append(new Option('— SIN DATO —',''));
     const ops=[...o.op];const up=val.toUpperCase();if(up&&!ops.includes(up))ops.push(up);
     for(const v of ops)inp.append(new Option(v,v));inp.value=up;
    } else if(o.area){inp=el('textarea');inp.value=val.toUpperCase()}
    else{
     inp=el('input');inp.type=o.num?'number':'text';if(o.num){inp.min='0';inp.step='1'}
     inp.value=o.tal?val:val.toUpperCase();
     if(o.tal)inp.classList.add('tal');
     if(o.lista){const id='fa-l-'+k;const dl=el('datalist');dl.id=id;for(const v of o.lista)dl.append(new Option(v));lb.append(dl);inp.setAttribute('list',id)}
    }
    if(o.fijo){inp.readOnly=true;inp.tabIndex=-1}
    else inputs[k]={inp,orig:inp.value};
    lb.append(inp);
    if(o.fijo&&k==='_latlon')lb.append(el('span','nota','LA UBICACIÓN DEL PUNTO SE MODIFICA EN QGIS.'));
    if(k==='web')lb.append(el('span','nota','EL ENLACE SE GUARDA TAL CUAL (DISTINGUE MAYÚSCULAS).'));
    g.append(lb);
   }
   cuerpo.append(fs);
  }

  // 6. Imagen del centro de salud
  let fotoNueva=null, quitarFoto=false;
  const fsI=el('fieldset');fsI.append(el('legend',null,'6. IMAGEN DEL CENTRO DE SALUD'));
  const box=el('div','foto');const prev=el('div','prev','SIN IMAGEN');
  const pintar=u=>{prev.style.backgroundImage=u?'url("'+u+'")':'';prev.textContent=u?'':'SIN IMAGEN'};
  pintar(e.foto||'');
  const der=el('div');const btns=el('div','btns');
  const file=el('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.hidden=true;
  const bSel=el('button','b2',e.foto?'CAMBIAR IMAGEN':'AGREGAR IMAGEN');bSel.type='button';bSel.onclick=()=>file.click();
  const bQuit=el('button','b2','QUITAR IMAGEN');bQuit.type='button';bQuit.hidden=!e.foto;
  bQuit.onclick=()=>{fotoNueva=null;quitarFoto=!!e.foto;file.value='';pintar('');bQuit.hidden=true;bSel.textContent='AGREGAR IMAGEN'};
  btns.append(bSel,bQuit);
  der.append(btns,el('p','nota','FOTO DE LA FACHADA DONDE SE VEA EL NOMBRE DEL ESTABLECIMIENTO. JPG, PNG O WEBP; SE REDUCE AUTOMÁTICAMENTE.'));
  box.append(prev,der,file);fsI.append(box);cuerpo.append(fsI);

  // 7. Confirmación
  const fsC=el('fieldset');fsC.append(el('legend',null,'7. CONFIRMACIÓN'));
  const gc=el('div','g');
  const lPor=el('label');lPor.append('ACTUALIZADO POR (GRADO Y NOMBRE)');const iPor=el('input');iPor.type='text';iPor.maxLength=120;
  try{iPor.value=localStorage.getItem('fa_por')||''}catch(_){}
  lPor.append(iPor);
  const lClave=el('label');lClave.append('CONTRASEÑA DE EDICIÓN');const iClave=el('input');iClave.type='password';iClave.autocomplete='new-password';iClave.classList.add('tal');lClave.append(iClave);
  const lObs=el('label','w');lObs.append('OBSERVACIONES DE LA ACTUALIZACIÓN');const iObs=el('textarea');iObs.maxLength=300;lObs.append(iObs);
  gc.append(lPor,lClave,lObs);fsC.append(gc);cuerpo.append(fsC);

  const pie=el('div','fa-pie');const m=el('span','msg');
  const bC=el('button','cancel','CANCELAR');bC.type='button';bC.onclick=cerrar;
  const bG=el('button','guardar','GUARDAR CAMBIOS');bG.type='submit';
  pie.append(m,bC,bG);fa.append(pie);
  const msg=(t,err)=>{m.textContent=t;m.className='msg'+(t?(err?' err':' ok'):'')};

  file.onchange=async()=>{const fl=file.files[0];if(!fl)return;msg('PREPARANDO IMAGEN…');
   try{fotoNueva=await comprimir(fl);quitarFoto=false;pintar(fotoNueva);bQuit.hidden=false;bSel.textContent='CAMBIAR IMAGEN';msg('')}
   catch(_){msg('NO SE PUDO LEER LA IMAGEN.',true)}};

  fa.onsubmit=async ev=>{
   ev.preventDefault();
   const campos={};
   for(const [k,{inp,orig}] of Object.entries(inputs)){if(inp.value!==orig)campos[k]=inp.value}
   if(!Object.keys(campos).length&&!fotoNueva&&!quitarFoto){msg('NO HAY CAMBIOS PARA GUARDAR.',true);return}
   if(iPor.value.trim().length<3){msg('ESCRIBE QUIÉN REALIZA LA ACTUALIZACIÓN.',true);iPor.focus();return}
   if(!iClave.value){msg('ESCRIBE LA CONTRASEÑA DE EDICIÓN.',true);iClave.focus();return}
   bG.disabled=true;msg('GUARDANDO…');
   try{
    const csrf=await token();
    const r=await fetch('/api/salud/actualizar',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
     body:JSON.stringify({id_salud:p.id_salud,campos,foto:fotoNueva,quitar_foto:quitarFoto,actualizado_por:iPor.value,observacion:iObs.value,clave:iClave.value})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||('ERROR '+r.status));
    try{localStorage.setItem('fa_por',iPor.value.trim().toUpperCase())}catch(_){}
    iClave.value='';
    await cargarEdiciones();
    msg('✔ CAMBIOS GUARDADOS · BASE DE DATOS: '+d.base);
    setTimeout(()=>{cerrar();window.selectHealth(f)},1300);
   }catch(err){msg(String(err.message||err).toUpperCase(),true);bG.disabled=false}
  };
  document.body.append(fondo);
  const primero=Object.values(inputs)[0];if(primero)primero.inp.focus();
 }

 // Al mostrar otra ficha se quita el ancho especial.
 const info=document.getElementById('info');
 if(info)new MutationObserver(()=>{if(!info.querySelector('.fs-head'))info.classList.remove('ficha-salud')}).observe(info,{childList:true});
})();
