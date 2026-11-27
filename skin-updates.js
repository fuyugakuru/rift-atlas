// Public skin additions and the administrator's publication queue.
(()=>{
 'use strict';
 const gallery=document.querySelector('.champion-skins'),host=document.getElementById('skin-update-panel');
 const champion=location.pathname.split('/').pop().replace(/\.html$/,'');
 const candidates=window.RIFT_SKIN_CANDIDATES||{skins:[]};
 const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 let busy=false,serial=0;
 async function rpc(client,name,args){const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data;}
 async function publicSkins(){if(!gallery)return;const client=window.RiftAccount?.publicClient;if(!client)return;
  try{const skins=await rpc(client,'skins_public',{p_champion:champion});gallery.dispatchEvent(new CustomEvent('rift-skins-add',{detail:skins}));}catch{/* The embedded, hand-maintained catalogue stays usable offline. */}
 }
 async function panel(){
  if(!host||busy)return;const generation=++serial,a=window.RiftAccount;host.hidden=true;host.replaceChildren();if(a?.loading||!a?.user)return;
  try{if(await rpc(a.client,'site_staff_role')!=='admin'||generation!==serial)return;
   const published=await rpc(a.publicClient||a.client,'skins_public',{});if(generation!==serial)return;
   const ids=new Set(published.map(s=>s.id)),pending=candidates.skins.filter(s=>!ids.has(s.id)&&!published.some(p=>p.champion===s.champion&&p.name.trim().toLowerCase()===s.name.trim().toLowerCase()));
   const heading=node('h2','Новые образы'),status=node('p',pending.length?'Найдено новых образов: '+pending.length:'Новых образов нет.'),all=node('button','Опубликовать выбранные'),list=node('div'),checks=[];
   host.append(heading,status,all,list);host.hidden=false;all.type='button';all.disabled=true;const refresh=node('button','Обновить список образов');refresh.type='button';refresh.onclick=panel;heading.after(refresh);
   if(candidates.errors?.length)host.append(node('p','Некоторые страницы Riot временно недоступны. Ранее найденные образы сохранены.'));
   const selectLabel=node('label'),select=node('input');select.type='checkbox';selectLabel.append(select,document.createTextNode(' Выбрать все'));all.before(selectLabel);
   const update=()=>{const count=checks.filter(x=>x.input.checked).length;all.textContent='Опубликовать выбранные ('+count+')';all.disabled=busy||!count;select.checked=checks.length>0&&count===checks.length;};
   for(const skin of pending){const label=node('label'),input=node('input'),image=node('img'),text=node('span',skin.championName+' · '+skin.name);input.type='checkbox';image.src=skin.image;image.alt='';image.loading='lazy';label.className='skin-update-row';label.append(input,image,text);list.append(label);checks.push({input,skin});input.onchange=update;}
   select.onchange=()=>{checks.forEach(x=>x.input.checked=select.checked);update();};
   all.onclick=async()=>{if(busy)return;busy=true;update();checks.forEach(x=>x.input.disabled=true);select.disabled=true;const chosen=checks.filter(x=>x.input.checked).map(x=>x.skin);let total=0;
    try{for(let i=0;i<chosen.length;i+=100){if(window.RiftAccount?.user?.id!==a.user.id)throw Error('Вход изменился');total+=await rpc(a.client,'skins_publish',{p_skins:chosen.slice(i,i+100)});}busy=false;await panel();const result=node('p','Опубликовано образов: '+total);result.setAttribute('role','status');host.prepend(result);}
    catch{busy=false;status.textContent='Не удалось завершить публикацию. Обнови список: уже опубликованные образы не добавятся повторно.';checks.forEach(x=>x.input.disabled=false);select.disabled=false;update();}
   };
  }catch{if(generation===serial){host.hidden=false;host.append(node('p','Не удалось загрузить образы. Проверь подключение и установку SQL 037.'),Object.assign(node('button','Повторить'),{onclick:panel}));}}
 }
 window.addEventListener('rift-account-client',publicSkins);window.addEventListener('rift-account-ready',panel);document.addEventListener('visibilitychange',()=>{if(!document.hidden)publicSkins();});publicSkins();panel();
})();
