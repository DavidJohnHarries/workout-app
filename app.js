const LS=k=>JSON.parse(localStorage.getItem(k)||'null'),SV=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const START=[['Dumbbell Bench Press','w'],['Dumbbell Row','w'],['Goblet Squat','w'],['Shoulder Press','w'],['Bicep Curl','w'],['Tricep Extension','w'],['Lunges','w'],['Romanian Deadlift','w'],['Push-ups','bw'],['Pull-ups','bw'],['Plank','t']];
let lib=LS('lib')||START.map(([n,t])=>({id:n,name:n,type:t}));SV('lib',lib);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>ymd(new Date());
const toD=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(s,n)=>{const d=toD(s);d.setDate(d.getDate()+n);return ymd(d)};
const pretty=s=>toD(s).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
const MAXBACK=30;
let formGroup=null;let last=LS('last')||{},hist=LS('hist')||[],days=LS('days')||{},sess=null,lastToday=null,view='log',summary=null,editing=null;
// ---- Migration from v1 (single 'sess', history keyed by timestamp)
hist.forEach(h=>{if(!h.day)h.day=ymd(new Date(h.date||Date.now()))});
(()=>{const old=LS('sess');if(old){const t=today();if(!days[t]&&(old.items&&old.items.length||old.notes))days[t]={date:t,items:old.items||[],notes:old.notes||''};localStorage.removeItem('sess')}})();
Object.values(days).forEach(d=>d.items.forEach(i=>{if(!i.uid)i.uid=uid()}));
const completed=d=>hist.some(h=>h.day===d);
function getDay(d){if(!days[d])days[d]={date:d,items:[],notes:''};return days[d]}
function goTo(d){sess=getDay(d);save()}
function ensureDay(){const t=today();if(lastToday!==t||!sess){lastToday=t;goTo(t);return true}return false}
var drag=null;
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const save=()=>{SV('lib',lib);SV('last',last);SV('hist',hist);SV('days',days)};
const typeName={w:'Weighted',bw:'Bodyweight',t:'Timed'};
const GROUPS=['A','B','C','misc'];lib.forEach(e=>{if(!GROUPS.includes(e.group))e.group='misc'});SV('lib',lib);
const gdot=(g,extra='')=>`<span class="gdot g-${g||'misc'}${extra}" aria-label="Group ${g||'misc'}">${g&&g!=='misc'?g:''}</span>`;
function typeDef(t){return t==='t'?{sets:3,secs:60}:t==='bw'?{sets:3,reps:10,weight:0}:{sets:3,reps:10,weight:25}}
// Last-used: most recent history entry before the selected date (by name or former names), else most recent overall.
function defaults(ex){const names=[ex.name,...(ex.aliases||[])],cur=sess?sess.date:today();let v=null;
 const prior=hist.filter(h=>h.day<cur).sort((a,b)=>a.day<b.day?1:-1);
 for(const h of prior){const it=h.items.find(i=>names.includes(i.name));if(it){const {name,type,...x}=it;v=x;break}}
 if(!v)v=last[ex.name];return {...typeDef(ex.type),...(v||{})}}
function fmtLine(it){const s=it.sets;
 if(it.type==='t')return `${it.name}: ${s} x ${it.secs}s`;
 if(it.type==='bw')return `${it.name}: ${s} x ${it.reps}`+(it.weight>0?` @ +${it.weight} lb`:' (bodyweight)');
 return `${it.name}: ${s} x ${it.reps} @ ${it.weight} lb`}
function fmtDate(d){return new Date(d).toLocaleDateString('en-US',{weekday:'short',year:'numeric',month:'short',day:'numeric'})}
function buildSummary(s){let t=`Workout - ${fmtDate(s.day?toD(s.day):s.date)}\n\n`+s.items.map(i=>'- '+fmtLine(i)).join('\n');if(s.notes.trim())t+=`\n\nNotes: ${s.notes.trim()}`;return t}
function toast(m){const d=document.createElement('div');d.className='toast';d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),1500)}
function addToSess(id,el){const ex=lib.find(e=>e.id===id);if(!ex)return;
 if(sess.items.some(i=>i.name===ex.name)){if(el){el.classList.remove('nudge');void el.offsetWidth;el.classList.add('nudge')}return}
 const y=window.scrollY;sess.items.push({uid:uid(),name:ex.name,type:ex.type,...defaults(ex)});save();view='log';render();
 window.scrollTo(0,y);requestAnimationFrame(()=>window.scrollTo(0,y))}
function shortVals(it){if(it.type==='t')return `${it.sets}x${it.secs}s`;
 if(it.type==='bw')return `${it.sets}x${it.reps} `+(it.weight>0?`+${it.weight} lb`:'bodyweight');return `${it.sets}x${it.reps} ${it.weight} lb`}
function updVal(it){document.querySelectorAll('.ex [data-val]').forEach(n=>{if(n.dataset.val===it.name)n.textContent=shortVals(it)})}
function fields(it){return it.type==='t'?[['sets','Sets',1],['secs','Secs',5]]:[['sets','Sets',1],['reps','Reps',1],['weight',it.type==='bw'?'+lb':'lb',5]]}
function render(){endDrag();
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===view));
 const a=$('#app');
 if(summary){$('#title').textContent='Summary';a.innerHTML=`<div class="card"><pre id="sum">${esc(summary)}</pre>
 <button class="btn full" id="copy">Copy</button>${navigator.share?'<button class="btn sec full" id="share">Share…</button>':''}
 <button class="btn sec full" id="done">Done</button><button class="btn sec full" id="back">← Back (edit workout)</button></div>`;
 $('#copy').onclick=()=>{commit();copy(summary)};if($('#share'))$('#share').onclick=()=>{commit();navigator.share({text:summary}).catch(()=>{})};
 $('#done').onclick=()=>{commit();if(sess.date!==today())goTo(today());summary=null;view='log';save();render();scrollTo(0,0)};
 $('#back').onclick=()=>{summary=null;view='log';render()};return}
 if(view==='log'){const t=today(),isT=sess.date===t,minD=addDays(t,-MAXBACK);$('#title').textContent='Log';
  const c0=completed(sess.date),stt=`<span class="stat ${c0?'ok':'no'}">${c0?'Sent ✓':'Not sent'}</span>`;
  const bar=`<div class="datebar${isT?'':' past'}"><button class="dnav" id="dprev" ${sess.date<=minD?'disabled':''} aria-label="Previous day">‹</button><span class="dlabel">${isT?'Today · ':''}${pretty(sess.date)}</span><button class="dnav" id="dnext" ${isT?'disabled':''} aria-label="Next day">›</button></div>`+
   (isT?(c0?`<div class="todayban">Today ${stt}<span class="muted"> · finishing again updates it</span></div>`:''):`<div class="pastban"><span>Past day: ${pretty(sess.date)}</span>${stt}</div>`);
  const cards=sess.items.map(it=>`<div class="card" id="card-${it.uid}"><h3><span>${esc(it.name)}</span><button class="x" data-rm="${it.uid}">✕</button></h3>`+
   fields(it).map(([k,l,st])=>`<div class="row"><label>${l}</label><button class="step" data-u="${it.uid}" data-k="${k}" data-d="-${st}">−</button><input inputmode="decimal" data-u="${it.uid}" data-k="${k}" value="${it[k]??0}"><button class="step" data-u="${it.uid}" data-k="${k}" data-d="${st}">+</button></div>`).join('')+`</div>`).join('');
  let h=bar+`<div class="muted" style="margin:10px 4px">Tap to add:</div>`+lib.map(e=>{const it=sess.items.find(i=>i.name===e.name);return it?
    `<div class="ex sel" data-add="${esc(e.id)}">${gdot(e.group)}<span class="name">${esc(e.name)}<small><span class="vlink" data-val="${esc(e.name)}" data-go="${it.uid}">${shortVals(it)}</span></small></span><button class="mark unsel" data-unsel="${it.uid}" aria-label="Remove from session">✓</button></div>`:
    `<div class="ex" data-add="${esc(e.id)}">${gdot(e.group)}<span class="name">${esc(e.name)}<small>${typeName[e.type]}</small></span><span class="mark">+</span></div>`}).join('');
  h+=`<button class="btn full${isT?'':' pastbtn'}" id="finish" style="margin-top:12px${sess.items.length?'':';opacity:.4'}" ${sess.items.length?'':'disabled'}>${isT?'Finish workout':'Finish '+pretty(sess.date).replace(',','')}</button>`;
  h+=(sess.items.length?`<div class="muted" style="margin:14px 4px 0">${isT?'Today\'s session:':pretty(sess.date)+' session:'}</div>`:'')+cards;
  h+=`<div class="card"><textarea id="notes" placeholder="Notes (optional)">${esc(sess.notes)}</textarea></div>`;
  a.innerHTML=h;
  const removeItem=u=>{const y=scrollY;sess.items=sess.items.filter(x=>x.uid!==u);save();render();scrollTo(0,y);requestAnimationFrame(()=>scrollTo(0,y))};
  a.querySelectorAll('[data-add]').forEach(b=>b.onclick=e=>{e.preventDefault();
    const un=e.target.closest('[data-unsel]');if(un){e.stopPropagation();return removeItem(un.dataset.unsel)}
    const go=e.target.closest('[data-go]');if(go){const c=document.getElementById('card-'+go.dataset.go);if(c){c.scrollIntoView({behavior:'smooth',block:'center'});c.classList.remove('flash');void c.offsetWidth;c.classList.add('flash')}return}
    addToSess(b.dataset.add,b)});
  a.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>removeItem(b.dataset.rm));
  // Steppers/inputs update state + the one input in place (no full re-render), so taps never land on a rebuilt/shifted DOM.
  const item=u=>sess.items.find(x=>x.uid===u);
  a.querySelectorAll('.step').forEach(b=>b.onclick=()=>{const it=item(b.dataset.u);if(!it)return;const k=b.dataset.k;
    it[k]=Math.max(0,Math.round(((+it[k]||0)+ +b.dataset.d)*10)/10);save();
    const inp=a.querySelector(`input[data-u="${b.dataset.u}"][data-k="${k}"]`);if(inp)inp.value=it[k];updVal(it)});
  a.querySelectorAll('.row input').forEach(n=>{n.onfocus=()=>n.select();n.oninput=()=>{const it=item(n.dataset.u);if(!it)return;const v=parseFloat(n.value);it[n.dataset.k]=isNaN(v)||v<0?0:v;save();updVal(it)};
    n.onblur=()=>{const it=item(n.dataset.u);if(it)n.value=it[n.dataset.k]}});
  $('#notes').oninput=e=>{sess.notes=e.target.value;save()};
  $('#finish').onclick=finish;
  const nav=d=>{if(document.activeElement)document.activeElement.blur();goTo(d);render();scrollTo(0,0)};
  $('#dprev').onclick=()=>{if(sess.date>minD)nav(addDays(sess.date,-1))};$('#dnext').onclick=()=>{if(sess.date<t)nav(addDays(sess.date,1))};
 }else if(view==='lib'){$('#title').textContent='Exercises';
  const ed=editing?lib.find(e=>e.id===editing):null;if(formGroup==null)formGroup=ed?ed.group||'misc':'misc';const opt=v=>(ed?ed.type:'w')===v?' selected':'';
  a.innerHTML=`<div class="card"><h3>${ed?'Edit exercise':'Add exercise'}</h3><div class="grow"><button type="button" id="gbtn" class="gbtn" aria-label="Group (tap to change)">${gdot(formGroup)}</button><input type="text" id="nn" placeholder="${ed?'Name':'New exercise name'}" value="${esc(ed?ed.name:'')}"></div><select id="nt" style="margin-top:8px"><option value="w"${opt('w')}>Weighted</option><option value="bw"${opt('bw')}>Bodyweight</option><option value="t"${opt('t')}>Timed</option></select><button class="btn full" id="addex">${ed?'Save changes':'Add exercise'}</button>${ed?'<button class="btn sec full" id="edcancel">Cancel</button>':''}</div>`+
  '<div id="libl">'+lib.map(e=>`<div class="ex lr" data-id="${esc(e.id)}"><span class="handle" aria-label="Drag to reorder">☰</span>${gdot(e.group)}<span class="name">${esc(e.name)}<small>${typeName[e.type]}</small></span><button class="ed" data-edit="${esc(e.id)}" aria-label="Edit">✎</button><button class="x" data-del="${esc(e.id)}">🗑</button></div>`).join('')+'</div>';
  setupReorder($('#libl'));
  $('#addex').onclick=()=>{const n=$('#nn').value.trim(),ty=$('#nt').value;if(!n)return;if(lib.some(e=>e!==ed&&e.name.toLowerCase()===n.toLowerCase()))return toast('Already exists');
   if(ed){renameEx(ed,n,ty);ed.group=formGroup}else lib.push({id:n+'-'+Date.now(),name:n,type:ty,group:formGroup});editing=null;formGroup=null;save();render();toast(ed?'Saved':'Added')};
  if(ed)$('#edcancel').onclick=()=>{editing=null;formGroup=null;render()};
  $('#gbtn').onclick=()=>{formGroup=GROUPS[(GROUPS.indexOf(formGroup)+1)%4];$('#gbtn').innerHTML=gdot(formGroup)};
  a.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing=b.dataset.edit;formGroup=null;render();scrollTo(0,0)});
  a.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const e=lib.find(x=>x.id===b.dataset.del);if(confirm(`Delete ${e.name}?`)){lib=lib.filter(x=>x!==e);save();render()}});
 }else{$('#title').textContent='History';
  a.innerHTML=hist.length?hist.map((s,i)=>`<div class="card"><pre>${esc(buildSummary(s))}</pre><button class="btn sec" data-c="${i}">Copy</button> <button class="btn danger" data-d="${i}">Delete</button></div>`).join(''):'<p class="muted">No workouts yet.</p>';
  a.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>copy(buildSummary(hist[b.dataset.c])));
  a.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{if(confirm('Delete this workout?')){hist.splice(+b.dataset.d,1);save();render()}});
 }}
function snapshot(){if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
 return {id:'d-'+sess.date,day:sess.date,date:toD(sess.date).getTime(),items:sess.items.map(({uid,...x})=>({...x})),notes:sess.notes}}
function finish(){const s=snapshot();summary=buildSummary(s);save();window.scrollTo(0,0);render()}
// Save to history only when committed (Copy/Share/Done). Upsert by session id => no duplicates if he goes Back and finishes again.
function commit(){const s=snapshot();const newer=hist.some(h=>h.day>s.day);if(!newer)s.items.forEach(({name,type,...v})=>last[name]=v);
 const i=hist.findIndex(h=>h.day===s.day);if(i>=0)hist[i]=s;else hist.unshift(s);hist.sort((a,b)=>a.day<b.day?1:a.day>b.day?-1:0);summary=buildSummary(s);save()}
function copy(t){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Copied')).catch(()=>{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('Copied')})}
// Rename/retype: keeps last-used values (moved to the new name; former names remembered for history lookups).
// Past history entries are untouched; per-date sessions (working copies) follow the new name/type.
function renameEx(ex,n,ty){const old=ex.name;
 if(n!==old){if(last[old]&&!last[n])last[n]=last[old];delete last[old];ex.aliases=[...new Set([...(ex.aliases||[]),old])].filter(x=>x!==n)}
 Object.values(days).forEach(d=>{d.items.forEach(i=>{if(i.name===old){i.name=n;if(i.type!==ty){Object.assign(i,{...typeDef(ty),...i,type:ty})}}})});
 ex.name=n;ex.type=ty}
function checkDay(){if(ensureDay())render()}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!summary&&!drag)checkDay()});
window.addEventListener('focus',()=>{if(!summary&&!drag)checkDay()});
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{summary=null;editing=null;formGroup=null;view=b.dataset.v;render()});
ensureDay();render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'});

// ---- Reordering. The dragged row is NEVER detached/re-inserted (that drops iOS pointer capture);
// only its siblings are moved around it. Cleanup always runs (up/cancel/lostcapture/touchend/blur/hidden/render).
document.addEventListener('touchmove',e=>{if(drag&&e.cancelable)e.preventDefault()},{passive:false});
function syncLibFromDom(list){const ids=[...list.children].map(n=>n.dataset.id);lib=ids.map(id=>lib.find(e=>e.id===id)).filter(Boolean);save()}
function endDrag(){if(!drag)return;const d=drag;drag=null;
 try{d.h.releasePointerCapture&&d.h.hasPointerCapture&&d.h.hasPointerCapture(d.id)&&d.h.releasePointerCapture(d.id)}catch(_){}
 d.row.classList.remove('dragging');d.row.style.transform='';if(d.list.isConnected)syncLibFromDom(d.list)}
function dragMove(e){if(!drag||(e.pointerId!=null&&e.pointerId!==drag.id))return;if(e.cancelable)e.preventDefault();
 const {row,list}=drag;row.style.transform='';const y=e.clientY;let sib;
 while((sib=row.previousElementSibling)&&y<sib.getBoundingClientRect().top+sib.offsetHeight/2)list.insertBefore(sib,row.nextElementSibling); // move sibling below row
 while((sib=row.nextElementSibling)&&y>sib.getBoundingClientRect().top+sib.offsetHeight/2)list.insertBefore(sib,row);                       // move sibling above row
 const r=row.getBoundingClientRect();row.style.transform=`translateY(${y-(r.top+r.height/2)}px)`;
 if(y<60)scrollBy(0,-8);else if(y>innerHeight-110)scrollBy(0,8)}
document.addEventListener('pointermove',dragMove,{passive:false});
['pointerup','pointercancel','touchend','touchcancel'].forEach(t=>document.addEventListener(t,e=>{if(drag&&(e.pointerId==null||e.pointerId===drag.id))endDrag()}));
window.addEventListener('blur',endDrag);document.addEventListener('visibilitychange',()=>{if(document.hidden)endDrag()});
function setupReorder(list){
 list.querySelectorAll('.handle').forEach(h=>{
  h.addEventListener('pointerdown',e=>{if(drag)endDrag();e.preventDefault();const row=h.closest('.lr');drag={row,list,h,id:e.pointerId};row.classList.add('dragging');
   try{h.setPointerCapture(e.pointerId)}catch(_){}});
  h.addEventListener('lostpointercapture',e=>{if(drag&&e.pointerId===drag.id)endDrag()})})}
