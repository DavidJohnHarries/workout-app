const LS=k=>JSON.parse(localStorage.getItem(k)||'null'),SV=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const START=[['Dumbbell Bench Press','w'],['Dumbbell Row','w'],['Goblet Squat','w'],['Shoulder Press','w'],['Bicep Curl','w'],['Tricep Extension','w'],['Lunges','w'],['Romanian Deadlift','w'],['Push-ups','bw'],['Pull-ups','bw'],['Plank','t']];
let lib=LS('lib')||START.map(([n,t])=>({id:n,name:n,type:t}));SV('lib',lib);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const newSess=()=>({id:uid(),items:[],notes:''});
let last=LS('last')||{},hist=LS('hist')||[],sess=LS('sess')||newSess(),view='log',summary=null;
if(!sess.id)sess.id=uid();sess.items.forEach(i=>{if(!i.uid)i.uid=uid()});
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const save=()=>{SV('lib',lib);SV('last',last);SV('hist',hist);SV('sess',sess)};
const typeName={w:'Weighted',bw:'Bodyweight',t:'Timed'};
function defaults(ex){return last[ex.name]||(ex.type==='t'?{sets:3,secs:60}:ex.type==='bw'?{sets:3,reps:10,weight:0}:{sets:3,reps:10,weight:25})}
function fmtLine(it){const s=it.sets;
 if(it.type==='t')return `${it.name}: ${s} x ${it.secs}s`;
 if(it.type==='bw')return `${it.name}: ${s} x ${it.reps}`+(it.weight>0?` @ +${it.weight} lb`:' (bodyweight)');
 return `${it.name}: ${s} x ${it.reps} @ ${it.weight} lb`}
function fmtDate(d){return new Date(d).toLocaleDateString('en-US',{weekday:'short',year:'numeric',month:'short',day:'numeric'})}
function buildSummary(s){let t=`Workout - ${fmtDate(s.date)}\n\n`+s.items.map(i=>'- '+fmtLine(i)).join('\n');if(s.notes.trim())t+=`\n\nNotes: ${s.notes.trim()}`;return t}
function toast(m){const d=document.createElement('div');d.className='toast';d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),1500)}
function addToSess(id){const ex=lib.find(e=>e.id===id);if(!ex)return;sess.items.push({uid:uid(),name:ex.name,type:ex.type,...defaults(ex)});save();view='log';render()}
function fields(it){return it.type==='t'?[['sets','Sets',1],['secs','Secs',5]]:[['sets','Sets',1],['reps','Reps',1],['weight',it.type==='bw'?'+lb':'lb',5]]}
function render(){
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===view));
 const a=$('#app');
 if(summary){$('#title').textContent='Summary';a.innerHTML=`<div class="card"><pre id="sum">${esc(summary)}</pre>
 <button class="btn full" id="copy">Copy</button>${navigator.share?'<button class="btn sec full" id="share">Share…</button>':''}
 <button class="btn sec full" id="done">Done</button><button class="btn sec full" id="back">← Back (edit workout)</button></div>`;
 $('#copy').onclick=()=>{commit();copy(summary)};if($('#share'))$('#share').onclick=()=>{commit();navigator.share({text:summary}).catch(()=>{})};
 $('#done').onclick=()=>{commit();sess=newSess();summary=null;view='log';save();render()};
 $('#back').onclick=()=>{summary=null;view='log';render()};return}
 if(view==='log'){$('#title').textContent='Today · '+fmtDate(Date.now());
  let h=sess.items.map(it=>`<div class="card"><h3><span>${esc(it.name)}</span><button class="x" data-rm="${it.uid}">✕</button></h3>`+
   fields(it).map(([k,l,st])=>`<div class="row"><label>${l}</label><button class="step" data-u="${it.uid}" data-k="${k}" data-d="-${st}">−</button><input inputmode="decimal" data-u="${it.uid}" data-k="${k}" value="${it[k]??0}"><button class="step" data-u="${it.uid}" data-k="${k}" data-d="${st}">+</button></div>`).join('')+`</div>`).join('');
  h+=`<div class="muted" style="margin:10px 4px">Tap to add:</div>`+lib.map(e=>`<div class="ex" data-add="${esc(e.id)}"><span class="name">${esc(e.name)}<small>${typeName[e.type]}</small></span><span style="color:#22c55e;font-size:26px">+</span></div>`).join('');
  h+=`<div class="card"><textarea id="notes" placeholder="Notes (optional)">${esc(sess.notes)}</textarea></div>
  <button class="btn full" id="finish" ${sess.items.length?'':'disabled style="opacity:.4"'}>Finish workout</button>
  ${sess.items.length?'<button class="btn sec full" id="clear">Clear session</button>':''}`;
  a.innerHTML=h;
  a.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addToSess(b.dataset.add));
  a.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{sess.items=sess.items.filter(x=>x.uid!==b.dataset.rm);save();render()});
  // Steppers/inputs update state + the one input in place (no full re-render), so taps never land on a rebuilt/shifted DOM.
  const item=u=>sess.items.find(x=>x.uid===u);
  a.querySelectorAll('.step').forEach(b=>b.onclick=()=>{const it=item(b.dataset.u);if(!it)return;const k=b.dataset.k;
    it[k]=Math.max(0,Math.round(((+it[k]||0)+ +b.dataset.d)*10)/10);save();
    const inp=a.querySelector(`input[data-u="${b.dataset.u}"][data-k="${k}"]`);if(inp)inp.value=it[k]});
  a.querySelectorAll('.row input').forEach(n=>{n.onfocus=()=>n.select();n.oninput=()=>{const it=item(n.dataset.u);if(!it)return;const v=parseFloat(n.value);it[n.dataset.k]=isNaN(v)||v<0?0:v;save()};
    n.onblur=()=>{const it=item(n.dataset.u);if(it)n.value=it[n.dataset.k]}});
  $('#notes').oninput=e=>{sess.notes=e.target.value;save()};
  $('#finish').onclick=finish;if($('#clear'))$('#clear').onclick=()=>{if(confirm('Clear today\'s session?')){sess=newSess();save();render()}};
 }else if(view==='lib'){$('#title').textContent='Exercises';
  a.innerHTML=`<div class="card"><input type="text" id="nn" placeholder="New exercise name"><select id="nt" style="margin-top:8px"><option value="w">Weighted</option><option value="bw">Bodyweight</option><option value="t">Timed</option></select><button class="btn full" id="addex">Add exercise</button></div>`+
  lib.map(e=>`<div class="ex"><span class="name">${esc(e.name)}<small>${typeName[e.type]}</small></span><button class="x" data-del="${esc(e.id)}">🗑</button></div>`).join('');
  $('#addex').onclick=()=>{const n=$('#nn').value.trim();if(!n)return;if(lib.some(e=>e.name.toLowerCase()===n.toLowerCase()))return toast('Already exists');lib.push({id:n+'-'+Date.now(),name:n,type:$('#nt').value});save();render()};
  a.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const e=lib.find(x=>x.id===b.dataset.del);if(confirm(`Delete ${e.name}?`)){lib=lib.filter(x=>x!==e);save();render()}});
 }else{$('#title').textContent='History';
  a.innerHTML=hist.length?hist.map((s,i)=>`<div class="card"><pre>${esc(buildSummary(s))}</pre><button class="btn sec" data-c="${i}">Copy</button> <button class="btn danger" data-d="${i}">Delete</button></div>`).join(''):'<p class="muted">No workouts yet.</p>';
  a.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>copy(buildSummary(hist[b.dataset.c])));
  a.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{if(confirm('Delete this workout?')){hist.splice(+b.dataset.d,1);save();render()}});
 }}
function snapshot(){if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
 return {id:sess.id,date:sess.date||Date.now(),items:sess.items.map(({uid,...x})=>({...x})),notes:sess.notes}}
function finish(){const s=snapshot();sess.date=s.date;summary=buildSummary(s);save();window.scrollTo(0,0);render()}
// Save to history only when committed (Copy/Share/Done). Upsert by session id => no duplicates if he goes Back and finishes again.
function commit(){const s=snapshot();s.items.forEach(({name,type,...v})=>last[name]=v);
 const i=hist.findIndex(h=>h.id===s.id);if(i>=0)hist[i]=s;else hist.unshift(s);summary=buildSummary(s);save()}
function copy(t){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Copied')).catch(()=>{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('Copied')})}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{summary=null;view=b.dataset.v;render()});
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'});
