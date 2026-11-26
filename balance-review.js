(() => {
 'use strict';
 const catalog=window.RIFT_BALANCE_CATALOG||[],releases=window.RIFT_BALANCE_CANDIDATES?.releases||[];
 const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 let current=new Map(),history=new Set(),epoch=0,publishing=false,readyBatch=[];
 const selectedGroups=new Set();let readyGroups=new Map();
 const groupId=changes=>changes.map(c=>c.id).join('|');
 let appliedChanges=new Set(),acknowledgedChanges=new Set();
 const normalize=s=>s.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'').replace(/judgement/g,'judgment');
 function contextMatches(target,row,release){const names=[row.context,release.labels?.contexts?.[row.context]].filter(Boolean).map(normalize);return [target.context,target.contextName].filter(Boolean).some(name=>names.includes(normalize(name)));}
 const completed=changes=>changes.every(c=>appliedChanges.has(c.id)||acknowledgedChanges.has(c.id));
 const fields={description:'Полное описание с актуальными числами',cooldown:'Перезарядка',cost:'Стоимость'};
 const kindNames={champion:'Чемпион',item:'Предмет',rune:'Руна'};
 const modes={classic:'Обычный режим','aaa-aram':'AAA ARAM',aram:'ARAM'};
 const rpc=async(name,args)=>{const r=await window.RiftAccount.client.rpc(name,args);if(r.error)throw r.error;return r.data;};
 function targets(row){return catalog.filter(c=>c.kind===row.kind&&(normalize(c.entity)===normalize(row.entity)||normalize(c.name)===normalize(row.entity)));}
 function propose(base,changes){
  const value={...base},unresolved=[];
  for(const change of changes){
   if(!change.before||!change.after){unresolved.push(change.text);continue;}
   const field=/^Cooldown$/i.test(change.field)?'cooldown':/^(Mana|Energy) Cost$/i.test(change.field)?'cost':'description';
   if(!value[field]){unresolved.push(change.text);continue;}
   const oldNumbers=change.before.match(/\d+(?:\.\d+)?/g)||[],newNumbers=change.after.match(/\d+(?:\.\d+)?/g)||[];
   if(!oldNumbers.length||oldNumbers.length!==newNumbers.length){unresolved.push(change.text);continue;}
   // A single number is replaced only on a line identifying the same statistic.
   const terms={'Attack Speed':/скорост[ьи] атаки/i,'Ability Power':/сил[аыуе]+ (?:умений|способностей)/i,'Health threshold required to trigger':/здоровь.*(?:выше|более|превышает)|(?:выше|более|превышает).*здоровь/i,'Max Health':/здоровь/i};
   const term=terms[change.field];
   const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   const pattern='(?<![\\d.,])'+oldNumbers.map(escape).join('\\s*%?\\s*(?:/|[–—-])\\s*')+'(?![\\d.,])';
   let re;try{re=new RegExp(pattern,'g');}catch{unresolved.push(change.text);continue;}
   const matches=[...value[field].matchAll(re)].filter(m=>{
    if(field!=='description'||oldNumbers.length>1)return true;
    const start=value[field].lastIndexOf('\n',m.index)+1,end=value[field].indexOf('\n',m.index);
    return term&&term.test(value[field].slice(start,end<0?undefined:end));
   });
   if(matches.length!==1){unresolved.push(change.text);continue;}
   const m=matches[0];let i=0;const replacement=m[0].replace(/\d+(?:[.,]\d+)?/g,()=>newNumbers[i++]);
   value[field]=value[field].slice(0,m.index)+replacement+value[field].slice(m.index+m[0].length);
  }
  return {value,unresolved};
 }
 function baseline(target){const saved=current.get(target.key);return saved?.value||{description:target.description,...(target.kind==='champion'?{cooldown:target.cooldown,cost:target.cost}:{})};}
 async function digest(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
 function groupsFor(release){const groups=new Map();for(const r of release.changes){const key=[r.mode,r.kind,r.entity,r.kind==='champion'?r.context:''].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}return [...groups.values()];}
 async function collectReady(release){
  const ready=[];if(!release)return ready;
  for(const changes of groupsFor(release)){
   const row=changes[0];if(row.mode!=='classic'||completed(changes))continue;
   const matches=targets(row).filter(t=>row.kind!=='champion'||contextMatches(t,row,release));
   if(matches.length!==1||matches[0].index==='base')continue;
   const target=matches[0],base=baseline(target),proposal=propose(base,changes);
   // Number substitution cannot approve changed mechanics, new conditions or units.
   const shape=s=>String(s).toLowerCase().replace(/\d+(?:[.,]\d+)?/g,'#').replace(/\s+/g,'');
   if(changes.some(c=>!c.before||!c.after||shape(c.before)!==shape(c.after))||proposal.unresolved.length||!proposal.value.description||JSON.stringify(base)===JSON.stringify(proposal.value))continue;
   const event=await digest(changes.map(c=>c.id).join('|')+'|'+target.key);if(history.has(event))continue;
   ready.push({target,base,value:proposal.value,event,changes,release,revision:current.get(target.key)?.revision??null});
  }
  // Two independent proposals for one target could overwrite each other.
  return ready.filter(r=>ready.filter(other=>other.target.key===r.target.key).length===1);
 }
 const bulk=el('button','Обновить выбранные (0)'),bulkInfo=el('p'),bulkResult=el('p');
 bulk.type='button';bulk.disabled=true;bulk.id='balance-publish-ready';bulkResult.setAttribute('role','status');
 $('balance-review-refresh').after(bulk,bulkInfo,bulkResult);
 const selectAllLabel=el('label'),selectAll=el('input');selectAll.type='checkbox';selectAll.id='balance-select-all';selectAllLabel.className='balance-select-all';selectAllLabel.append(selectAll,document.createTextNode('Выбрать все готовые'));bulkInfo.before(selectAllLabel);
 function updateSelection(){
  const count=readyBatch.filter(entry=>selectedGroups.has(groupId(entry.changes))).length;
  bulk.textContent=`Обновить выбранные (${count})`;bulk.disabled=publishing||!count;
  selectAll.disabled=publishing||!readyBatch.length;selectAll.checked=!!readyBatch.length&&count===readyBatch.length;selectAll.indeterminate=count>0&&count<readyBatch.length;
  document.querySelectorAll('.balance-row-select').forEach(box=>{const ready=readyGroups.has(box.dataset.group);box.disabled=publishing||!ready;box.checked=ready&&selectedGroups.has(box.dataset.group);box.title=ready?'Выбрать обновление':'Сначала подготовь и проверь точный текст изменения';const badge=box.parentElement.querySelector('.balance-selection-status');if(badge&&!badge.dataset.final){badge.textContent=ready?'Готово к обновлению':'Нужна проверка';badge.dataset.status='pending';}});
 }
 selectAll.onchange=()=>{if(publishing)return;for(const entry of readyBatch){const id=groupId(entry.changes);if(selectAll.checked)selectedGroups.add(id);else selectedGroups.delete(id);}updateSelection();};
 bulk.onclick=async()=>{
  const batch=readyBatch.filter(entry=>selectedGroups.has(groupId(entry.changes)));
  if(publishing||!batch.length)return;publishing=true;updateSelection();$('balance-review-refresh').disabled=true;
  const batchEpoch=epoch;let done=0,error='';
  try{for(const entry of batch){if(epoch!==batchEpoch)throw Error('Вход или список изменился.');bulkResult.textContent=`Публикуем ${done+1} из ${batch.length}…`;await rpc('balance_publish',{p_event:entry.event,p_key:entry.target.key,p_patch:entry.release.patch,p_source:entry.release.source,p_before:entry.base,p_after:entry.value,p_changes:entry.changes,p_expected:entry.revision});done++;}}
  catch{error=' Остальные не опубликованы: обнови список и повтори. Возможно, данные уже изменены другим администратором.';}
  finally{publishing=false;$('balance-review-refresh').disabled=false;if(epoch===batchEpoch){await refresh();bulkResult.textContent=`Опубликовано: ${done} из ${batch.length}.`+error;}else{readyBatch=[];bulk.disabled=true;bulkResult.textContent='Публикация остановлена: вход изменился.';}}
 };
 function card(release,changes){
  const row=changes[0],details=el('details'),summary=el('summary');details.className='balance-review-card';
   const matched=targets(row),caption=matched.find(t=>contextMatches(t,row,release))||matched[0];
   const labels=release.labels||{},entityName=labels.entities?.[row.entity]||caption?.name||row.entity,contextName=labels.contexts?.[row.context]||(caption&&normalize(caption.context)===normalize(row.context)?caption.contextName:row.context)||row.context;
   const title=`${entityName}${row.context&&row.kind==='champion'?' · '+contextName:''} · ${modes[row.mode]} · ${changes.length} изм.`;
   const choose=el('input');choose.type='checkbox';choose.className='balance-row-select';choose.dataset.group=groupId(changes);choose.disabled=true;choose.setAttribute('aria-label','Выбрать: '+title);choose.addEventListener('click',e=>e.stopPropagation());choose.addEventListener('keydown',e=>e.stopPropagation());choose.onchange=()=>{if(choose.checked)selectedGroups.add(choose.dataset.group);else selectedGroups.delete(choose.dataset.group);updateSelection();};
   const badge=el('small','Нужна проверка');badge.className='balance-selection-status';badge.dataset.status='pending';if(row.mode!=='classic'){badge.textContent='Отдельный режим';badge.dataset.final='true';badge.dataset.status='mode';}
   summary.append(choose,el('span',title),badge);details.append(summary);
  const body=el('div');body.className='balance-review-body';
  const source=el('a','Официальное описание ↗');source.href=release.source;source.target='_blank';source.rel='noopener noreferrer';body.append(source);
  const list=el('ul');for(const c of changes)list.append(el('li',labels.texts?.[c.text]||c.text));body.append(list);
  if(completed(changes)){const applied=changes.every(c=>appliedChanges.has(c.id));badge.textContent=applied?'Обновлено':'Принято к сведению';badge.dataset.final='true';badge.dataset.status='published';body.append(el('p',applied?'✓ Изменения опубликованы.':'✓ Проверено без изменения описаний навыков.'));details.append(body);return details;}
  const acknowledge=el('button','ОК, принять к сведению'),ackMessage=el('p');acknowledge.type='button';acknowledge.className='balance-acknowledge';
  acknowledge.onclick=async()=>{if(publishing)return;acknowledge.disabled=true;try{await rpc('balance_acknowledge',{p_event:await digest(groupId(changes)+'|ack'),p_changes:changes});await refresh();}catch{ackMessage.textContent='Не удалось сохранить отметку. Проверь подключение и SQL 030.';acknowledge.disabled=false;}};
  if(changes.some(c=>!c.before||!c.after)){body.append(el('p','Эта правка касается игровой механики. Можно принять её к сведению без записи в описание умения.'),acknowledge,ackMessage);details.append(body);return details;}
  if(row.mode!=='classic'){body.append(el('p','Изменения этого режима не применяются к обычным страницам чемпионов и предметов.'));details.append(body);return details;}
  const choices=targets(row),select=el('select');select.setAttribute('aria-label','Что обновить');
  let initial=choices.find(t=>contextMatches(t,row,release))||((row.kind!=='champion'||choices.length===1)?choices[0]:null);
  const placeholder=el('option','Выбери точное умение или запись');placeholder.value='';select.append(placeholder);
  for(const t of choices){const translatedContext=Object.entries(labels.contexts||{}).find(([key])=>normalize(key)===normalize(t.context))?.[1];const option=el('option',t.name+(t.context?' · '+(translatedContext||t.contextName||t.context):''));option.value=t.key;select.append(option);}
  if(!choices.length)body.append(el('p','Точная запись в каталоге не найдена. Это изменение требует добавления соответствующего поля; автоматически публиковать его нельзя.'));
  body.append(select);const editor=el('div');body.append(editor);
  async function render(){
   editor.replaceChildren();const target=choices.find(t=>t.key===select.value);if(!target)return;
   const base=baseline(target),proposal=propose(base,changes),event=await digest(changes.map(c=>c.id).join('|')+'|'+target.key);
   if(target.index==='base'){
    const labels={'Base Attack Damage':'Базовая сила атаки','Base Health':'Базовое здоровье','Health Growth':'Здоровье за уровень','Armor':'Броня','Base Armor':'Базовая броня','Magic Resist':'Сопротивление магии','Attack Speed':'Скорость атаки','Movement Speed':'Скорость передвижения'};
    const updated=changes.map(c=>c.after?(labels[c.field]||c.field)+': '+c.after:c.text).join('\n');
    proposal.value.description=base.description?base.description+'\n\nПатч '+release.patch+':\n'+updated:updated;
    proposal.unresolved=[];
   }
   if(select.value!==target.key)return;
   if(history.has(event)){badge.textContent='Обновлено';badge.dataset.final='true';badge.dataset.status='published';editor.append(el('p','✓ Это изменение уже опубликовано.'));return;}
   const previous=current.get(target.key),revision=previous?.revision??null;
   const old=el('details'),oldTitle=el('summary','Сейчас на сайте'),pre=el('pre',Object.entries(base).map(([k,v])=>fields[k]+':\n'+v).join('\n\n'));old.append(oldTitle,pre);editor.append(old);
   if(proposal.unresolved.length)editor.append(el('p','Нужна проверка: '+proposal.unresolved.length+' изменений не удалось однозначно подставить. Исправь полный текст ниже перед публикацией.'));
   const inputs={};for(const field of Object.keys(base)){const label=el('label',fields[field]),input=el('textarea');input.value=proposal.value[field];input.rows=field==='description'?10:2;input.maxLength=field==='description'?20000:500;inputs[field]=input;label.append(input);editor.append(label);}
   const checkLabel=el('label'),check=el('input');check.type='checkbox';checkLabel.className='balance-review-check';checkLabel.append(check,document.createTextNode('Проверил значения, полное описание и режим игры'));editor.append(checkLabel);
   let confirmedValue=null;
   const publish=el('button','Опубликовать изменение'),message=el('p');publish.type='button';publish.disabled=true;
   const resetConfirmation=()=>{confirmedValue=null;publish.textContent='Опубликовать изменение';message.textContent='';};
   function clearDraft(){const id=groupId(changes);selectedGroups.delete(id);readyGroups.delete(id);readyBatch=readyBatch.filter(entry=>groupId(entry.changes)!==id);updateSelection();}
   check.onchange=()=>{publish.disabled=!check.checked;resetConfirmation();if(!check.checked){clearDraft();return;}const value=Object.fromEntries(Object.entries(inputs).map(([k,n])=>[k,n.value.trim()]));if(release===releases[0]&&value.description&&JSON.stringify(value)!==JSON.stringify(base)&&!readyBatch.some(entry=>entry.target.key===target.key&&groupId(entry.changes)!==groupId(changes))){const entry={target,base,value,event,changes,release,revision};clearDraft();readyBatch.push(entry);readyGroups.set(groupId(changes),entry);updateSelection();}};
   for(const input of Object.values(inputs))input.addEventListener('input',()=>{check.checked=false;publish.disabled=true;resetConfirmation();clearDraft();});
   editor.append(publish,message);
   publish.onclick=async()=>{
    if(publishing)return;
    const value=Object.fromEntries(Object.entries(inputs).map(([k,n])=>[k,n.value.trim()]));
    if(!value.description||JSON.stringify(value)===JSON.stringify(base)){message.textContent='Сначала внеси новые значения в описание.';return;}
    if(confirmedValue!==JSON.stringify(value)){confirmedValue=JSON.stringify(value);publish.textContent='Да, обновить на сайте';message.textContent='Обновить '+target.name+' на всём сайте? Нажми ещё раз для подтверждения.';return;}
    publishing=true;bulk.disabled=true;publish.disabled=true;message.textContent='Публикуем…';
    try{await rpc('balance_publish',{p_event:event,p_key:target.key,p_patch:release.patch,p_source:release.source,p_before:base,p_after:value,p_changes:changes,p_expected:revision});publishing=false;await refresh();}
    catch(error){publishing=false;updateSelection();message.textContent='Не удалось опубликовать: '+(error.message||'ошибка подключения')+'. Если данные изменил другой администратор, обнови список.';publish.disabled=false;}
   };
  }
  select.onchange=render;if(initial)select.value=initial.key;render();details.append(body);return details;
 }
 async function refresh(){
  if(publishing)return;
  const n=++epoch;bulk.disabled=true;readyBatch=[];$('balance-review-status').textContent='Загружаем опубликованные изменения…';
  try{const [rows,events]=await Promise.all([rpc('balance_public'),rpc('balance_review_history')]);if(n!==epoch)return;current=new Map(rows.map(r=>[r.key,r]));history=new Set(events.map(r=>r.event_id));appliedChanges=new Set(events.filter(r=>r.kind!=='acknowledgement').flatMap(r=>r.change_ids||[]));acknowledgedChanges=new Set(events.filter(r=>r.kind==='acknowledgement').flatMap(r=>r.change_ids||[]));
   const list=$('balance-review-list');list.replaceChildren();
   for(const release of releases){const section=el('section'),heading=el('h2','Патч '+release.patch);section.append(heading);for(const rows of groupsFor(release))section.append(card(release,rows));list.append(section);}
   const ready=await collectReady(releases[0]);if(n!==epoch)return;readyBatch=ready;readyGroups=new Map(ready.map(entry=>[groupId(entry.changes),entry]));for(const id of selectedGroups)if(!readyGroups.has(id))selectedGroups.delete(id);updateSelection();bulkInfo.textContent=releases[0]?`Патч ${releases[0].patch}: готово ${ready.length}. Отметь нужные записи галочками. Для неготовых правок сначала требуется проверка текста.`:'Нет подготовленных обновлений.';
   $('balance-review-status').textContent=releases.length?'Последние официальные изменения. Обычный режим и ARAM разделены.':'Новых изменений пока нет.';
  }catch{readyBatch=[];bulk.disabled=true;$('balance-review-status').textContent='Не удалось подключить обновления. Проверь, применён ли SQL 029 в Supabase, и нажми «Обновить».';}
 }
 async function gate(){const a=window.RiftAccount;if(a?.loading)return;if(!a?.user){$('balance-review-gate').textContent='Войди в аккаунт администратора.';return;}try{if(await rpc('site_staff_role')!=='admin'){ $('balance-review-gate').textContent='Публиковать игровые данные может только администратор.';return;}$('balance-review-gate').hidden=true;$('balance-review-app').hidden=false;await refresh();}catch{$('balance-review-gate').textContent='Не удалось проверить доступ. Обнови страницу.';}}
 $('balance-review-refresh').onclick=refresh;window.addEventListener('rift-account-ready',()=>{epoch++;$('balance-review-app').hidden=true;gate();});gate();
})();
