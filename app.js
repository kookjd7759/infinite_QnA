const $ = s => document.querySelector(s);
const KEY = 'infinite-qa-v1';
const colors = ['#8da377','#d0ad77','#8caeb5','#ae96b5','#c38e89'];
const uid = () => crypto.randomUUID();
const seed = () => ({
 categories:[{id:'capitals',name:'나라와 수도',color:colors[1]}],
 questions:[{id:'c0',category:'capitals',q:'대한민국',a:'서울',mastered:false}],
 selected:['capitals'],stats:{correct:0,wrong:0},version:2
});
function updateLibrary(stored){
 if(stored.version===2)return stored;
 const removed=new Set(['english','knowledge']);
 stored.categories=stored.categories.filter(c=>!removed.has(c.id));
 stored.questions=stored.questions.filter(q=>!removed.has(q.category)&&(q.category!=='capitals'||q.q.trim()==='대한민국'));
 if(stored.categories.some(c=>c.id==='capitals')&&!stored.questions.some(q=>q.category==='capitals')){
   stored.questions.push({...seed().questions[0],id:uid()});
 }
 stored.version=2;
 localStorage.setItem(KEY,JSON.stringify(stored));
 return stored;
}
function validData(d){return d&&Array.isArray(d.categories)&&Array.isArray(d.questions)&&d.categories.every(c=>c&&typeof c.id==='string'&&typeof c.name==='string')&&new Set(d.categories.map(c=>c.id)).size===d.categories.length&&d.questions.every(q=>q&&typeof q.id==='string'&&typeof q.q==='string'&&q.q.trim()&&typeof q.a==='string'&&q.a.trim()&&d.categories.some(c=>c.id===q.category)&&typeof q.mastered==='boolean')&&new Set(d.questions.map(q=>q.id)).size===d.questions.length;}
let data;
try{const stored=JSON.parse(localStorage.getItem(KEY));data=validData(stored)?updateLibrary(stored):seed();}catch{data=seed();}
data.selected=Array.isArray(data.selected)?data.selected.filter(id=>data.categories.some(c=>c.id===id)):data.categories.map(c=>c.id);
data.stats=data.stats&&Number.isFinite(data.stats.correct)&&Number.isFinite(data.stats.wrong)?data.stats:{correct:0,wrong:0};
let view='study',filterCategory=null,current=null,revealed=false,editorMode=null,editId=null;
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = value => value.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
let missedOnly=false;
let studyMode='learn';
const matchesMode = question => question.mastered === (studyMode==='review');
const pool = () => data.questions.filter(q=>matchesMode(q)&&(!missedOnly||q.needsReview===true)&&view==="study" && q.category===filterCategory);
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2500);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(data));}catch{toast('저장 공간이 부족해요. 데이터를 백업해 주세요.');}}
function categoryName(id){return data.categories.find(c=>c.id===id)?.name||'';}
function progressMarkup(cards){
 const done=cards.filter(q=>q.mastered).length;
 return `<span class="deck-progress">외움 ${done} / ${cards.length}<progress value="${done}" max="${cards.length||1}" aria-label="암기 진행률"></progress></span>`;
}
function render(){
 $('.nav[data-view="study"]').classList.toggle('active',view==='study');$('.nav[data-view="library"]').classList.toggle('active',view==='library');
 const studying=view==='study', chosen=filterCategory!==null;
 $('#studyView').hidden=!studying||!chosen;
 $('#libraryView').hidden=studying||!chosen;
 $('#picker').hidden=chosen;
 $('#studyMode').hidden=!studying;
 $('#masterCurrent').textContent=studyMode==='review'?'↻ 안 외움으로 변경':'✓ 이 문제는 다 외웠어요';
 $('.backup-actions').hidden=studying;
 $('#manage').hidden=false;
 $('#manage').textContent=studying?'문제 보관함':'＋ 카테고리 추가';
 const title=studying?'반복 학습':'문제 보관함';
 $('#breadcrumb').textContent=title+(chosen?' / '+categoryName(filterCategory):'');
 $('#pageTitle').textContent=chosen?categoryName(filterCategory):title;
 $('#pageDescription').textContent=chosen?(studying?'답을 입력하고 Enter를 눌러 주세요.':'연필을 눌러 문제와 답을 수정하세요.'):(studying?'학습을 시작할 카테고리를 선택하세요.':'문제를 확인할 카테고리를 선택하세요.');
 $('#categories').innerHTML=data.categories.map(c=>`<button class="category-nav ${!studying&&filterCategory===c.id?'active':''}" data-category="${esc(c.id)}">${esc(c.name)}</button>`).join('');
 $('#picker').innerHTML=data.categories.map(c=>{
   const cards=data.questions.filter(q=>q.category===c.id);
   const remaining=cards.filter(matchesMode).length;
   const action=studying?(remaining?'학습 시작 →':'해당하는 문제가 없어요'):'보관함 열기 →';
   return `<button class="category-card" data-category="${esc(c.id)}" ${studying&&!remaining?'disabled':''}><strong>${esc(c.name)}</strong><small>${studying?(studyMode==='review'?'외움':'안 외움'):'전체'} ${studying?remaining:cards.length}개</small>${progressMarkup(cards)}<span>${action}</span></button>`;

 }).join('')||'카테고리를 추가해 주세요.';
 const deck=data.questions.filter(q=>q.category===filterCategory);
 $('#deckProgress').innerHTML=progressMarkup(deck);
 $('#missedCount').textContent=deck.filter(q=>matchesMode(q)&&q.needsReview===true).length;
 $('#missedOnly').checked=missedOnly;
 renderStats();renderLibrary();
}
function renderStats(){const {correct,wrong}=data.stats,total=correct+wrong;$('#answeredCount').textContent=total;$('#correctCount').textContent=correct;$('#wrongCount').textContent=wrong;$('#accuracy').textContent=total?Math.round(correct/total*100)+'%':'—';$('#accuracyBar').style.width=(total?correct/total*100:0)+'%';}
function nextQuestion(){if(view!=='study'||filterCategory===null)return;const available=pool();current=available.length?available[Math.floor(Math.random()*available.length)]:null;revealed=false;$('#answer').value='';$('#answer').disabled=!current;$('#submitAnswer').disabled=!current;$('#masterCurrent').disabled=!current;$('#feedback').textContent='';$('#feedback').className='';$('#submitAnswer').innerHTML='정답 확인 <span>↵</span>';$('#questionCategory').textContent=current?categoryName(current.category):'잠깐 쉬어가기';$('#questionNumber').textContent=current?'무작위 출제 · '+available.length+'개':'';$('#question').textContent=current?current.q:'학습할 문제가 없어요';$('#questionHint').textContent=current?'떠오르는 답을 아래에 입력해 주세요.':missedOnly?'오답만 연습을 끄면 이 모드의 문제 전체를 풀 수 있어요.':'학습 모드를 바꾸거나 보관함에서 암기 상태를 확인하세요.';if(current&&view==='study')$('#answer').focus();}
let editing=null;
function renderLibrary(){
 const search=normalize($('#search').value), status=$('#statusFilter').value;
 const list=data.questions.filter(q=>q.category===filterCategory&&normalize(q.q+' '+q.a).includes(search)&&(status==='all'||q.mastered===(status==='mastered')));
 $('#librarySummary').innerHTML=`문제 ${list.length}개　<button data-action="edit-category">카테고리 수정</button>`;
 const rows=list.map(q=>{
   const edit=q.id===editing;
   const question=edit?`<textarea aria-label="문제" name="q">${esc(q.q)}</textarea>`:esc(q.q);
   const answer=edit?`<textarea aria-label="답" name="a">${esc(q.a)}</textarea>`:esc(q.a.split('|').join(' / '));
   return `<tr data-id="${esc(q.id)}"><td>${question}</td><td>${answer}</td><td><button class="memory-state" data-action="mastery" aria-pressed="${q.mastered}" title="${q.mastered?'안 외움으로 변경':'외움으로 변경'}" ${editing!==null?'disabled':''}>${q.mastered?'✓ 외움':'안 외움'}</button></td><td><button data-action="${edit?'save':'edit'}" aria-label="${edit?'저장':'수정'}" title="${edit?'저장':'수정'}">${edit?'✓':'✎'}</button></td><td><button data-action="${edit?'cancel':'delete'}" aria-label="${edit?'취소':'삭제'}" title="${edit?'취소':'삭제'}">${edit?'×':'🗑'}</button></td></tr>`;
 }).join('');
 $('#questionList').innerHTML=rows?`<table><thead><tr><th>문제</th><th>답</th><th class="state-heading">암기 상태</th><th aria-label="수정"></th><th aria-label="삭제"></th></tr></thead><tbody>${rows}</tbody></table>`:'<p class="empty">표시할 문제가 없어요.</p>';
}
function setView(next,category=null){
 view=next; filterCategory=category; editing=null; current=null; missedOnly=false;
 $('#search').value=''; $('#statusFilter').value='all';
 render();
 if(view==='study'&&category!==null)nextQuestion();
}
function openEditor(mode,id=null){editorMode=mode;editId=id;$('#editorError').textContent='';const isCategory=mode==='category',item=isCategory?data.categories.find(c=>c.id===id):data.questions.find(q=>q.id===id);$('#editorTitle').textContent=(isCategory?'카테고리':'문제')+(id?' 수정':' 추가');$('#editorFields').innerHTML=isCategory?`<label>카테고리 이름<input name="name" required maxlength="50" value="${esc(item?.name||'')}" placeholder="예: 매일 쓰는 영어"></label>`:`<label>카테고리<select name="category" required>${data.categories.filter(c=>c.id===filterCategory).map(c=>`<option value="${esc(c.id)}" ${(item?.category||filterCategory||data.categories[0]?.id)===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label>문제<textarea name="q" required maxlength="1000" placeholder="예: serendipity">${esc(item?.q||'')}</textarea></label><label>정답<textarea name="a" required maxlength="1000" placeholder="예: 뜻밖의 행운 | 우연한 발견">${esc(item?.a||'')}</textarea></label><p style="font-size:11px;color:#8d9b84">여러 정답은 | 로 구분하세요. 대소문자는 구분하지 않아요.</p>`;$('#editor').showModal();}
$('#answerForm').addEventListener('submit',e=>{e.preventDefault();if(!current)return;if(revealed){nextQuestion();return;}const answer=$('#answer').value;if(!answer.trim()){ $('#answer').focus();return;}const correct=current.a.split('|').some(a=>normalize(a)===normalize(answer));current.needsReview=!correct;render();data.stats[correct?'correct':'wrong']++;revealed=true;$('#answer').disabled=true;$('#feedback').className=correct?'correct':'wrong';$('#feedback').textContent=correct?'✓ 정답이에요!':'✕ 오답이에요. 정답: '+current.a.split('|').join(' / ');$('#submitAnswer').innerHTML='다음 문제 <span>↵</span>';save();renderStats();$('#submitAnswer').focus();});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('#manage').onclick=()=>view==='study'?setView('library',filterCategory):openEditor('category');
for(const button of document.querySelectorAll('.back'))button.onclick=()=>setView(view);
for(const id of ['#categories','#picker']){
 $(id).onclick=e=>{
   const button=e.target.closest('[data-category]');
   if(button&&!button.disabled)setView(id==='#categories'?'library':view,button.dataset.category);
 };
}
$('#masterCurrent').onclick=()=>{if(!current)return;current.mastered=studyMode==='learn';save();render();nextQuestion();toast(studyMode==='learn'?'외움으로 표시했어요. 복습에서 풀 수 있어요.':'안 외움으로 표시했어요. 외우기에서 풀 수 있어요.');};
$('#studyMode').onchange=e=>{
 studyMode=e.target.value;
 missedOnly=false;
 render();
 nextQuestion();
};
$('#missedOnly').onchange=e=>{missedOnly=e.target.checked;nextQuestion();};
$('#resetSession').onclick=()=>{data.stats={correct:0,wrong:0};save();renderStats();toast('이번 학습 기록을 초기화했어요.');};
$('#search').oninput=renderLibrary;$('#statusFilter').onchange=renderLibrary;$('#addCategory').onclick=()=>openEditor('category');$('#addQuestion').onclick=()=>{if(!data.categories.length){toast('먼저 카테고리를 추가해 주세요.');openEditor('category');return;}openEditor('question');};
$('#closeEditor').onclick=()=>$('#editor').close();
$('#editorForm').onsubmit=e=>{e.preventDefault();const fields=new FormData(e.target);if(editorMode==='category'){const name=fields.get('name').trim();if(!name){$('#editorError').textContent='이름을 입력해 주세요.';return;}if(data.categories.some(c=>c.id!==editId&&normalize(c.name)===normalize(name))){$('#editorError').textContent='같은 이름의 카테고리가 있어요.';return;}if(editId)data.categories.find(c=>c.id===editId).name=name;else{const id=uid();data.categories.push({id,name,color:colors[data.categories.length%colors.length]});data.selected.push(id);}}else{const q=fields.get('q').trim(),a=fields.get('a').split('|').map(a=>a.trim()).filter(Boolean).join('|'),category=fields.get('category');if(!q||!a||!category){$('#editorError').textContent='카테고리, 문제와 정답을 모두 입력해 주세요.';return;}if(editId)Object.assign(data.questions.find(q=>q.id===editId),{q,a,category});else data.questions.push({id:uid(),q,a,category,mastered:false});}save();render();nextQuestion();$('#editor').close();toast('저장했어요.');};
$('#questionList').onclick=e=>{const button=e.target.closest('[data-action]'),row=e.target.closest('[data-id]');if(!button||!row)return;const q=data.questions.find(q=>q.id===row.dataset.id);const action=button.dataset.action;
 if(action==='mastery'){
   q.mastered=!q.mastered;save();render();toast(q.mastered?'외움 · 복습에서 출제해요.':'안 외움 · 외우기에서 출제해요.');return;
 }
 if(action==='edit'){
   editing=q.id;renderLibrary();$('#questionList textarea').focus();return;
 }
 if(action==='save'){
   const question=row.querySelector('[name=q]').value.trim();
   const answer=row.querySelector('[name=a]').value.split('|').map(v=>v.trim()).filter(Boolean).join('|');
   if(!question||!answer){toast('문제와 답을 모두 입력하세요.');return;}
   Object.assign(q,{q:question,a:answer});
 }
 if(action==='delete'){
   if(!confirm('“'+q.q+'” 문제를 삭제할까요?'))return;
   data.questions=data.questions.filter(item=>item.id!==q.id);
 }
 editing=null;save();render();
};
$('#deleteCategory').onclick=()=>handleCategoryAction('delete-category');
$('#librarySummary').onclick=e=>handleCategoryAction(e.target.dataset.action);
function handleCategoryAction(action){if(action==='edit-category')openEditor('category',filterCategory);if(action==='delete-category'){const category=data.categories.find(c=>c.id===filterCategory),count=data.questions.filter(q=>q.category===filterCategory).length;if(!confirm('“'+category.name+'” 카테고리와 포함된 문제 '+count+'개를 삭제할까요?'))return;data.questions=data.questions.filter(q=>q.category!==filterCategory);data.categories=data.categories.filter(c=>c.id!==filterCategory);data.selected=data.selected.filter(id=>id!==filterCategory);filterCategory=null;save();render();nextQuestion();}};
$('#exportData').onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='infinite-qa-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#importData').onclick=()=>$('#importFile').click();$('#importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!validData(parsed))throw Error();if(!confirm('현재 문제와 기록을 백업 파일의 데이터로 교체할까요?'))return;data={version:2,categories:parsed.categories,questions:parsed.questions,selected:Array.isArray(parsed.selected)?parsed.selected.filter(id=>parsed.categories.some(c=>c.id===id)):parsed.categories.map(c=>c.id),stats:parsed.stats&&Number.isFinite(parsed.stats.correct)&&Number.isFinite(parsed.stats.wrong)?parsed.stats:{correct:0,wrong:0}};filterCategory=null;save();render();nextQuestion();toast('백업을 불러왔어요.');}catch{toast('올바른 무한문답 백업 파일을 선택해 주세요.');}finally{e.target.value='';}};
render();
