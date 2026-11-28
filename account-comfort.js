// Shortcuts reuse the existing friends/builds/notification sections and requests.
(()=>{'use strict';const member=document.querySelector('#account-member');if(!member)return;
 const nav=document.createElement('nav');nav.className='account-shortcuts';nav.setAttribute('aria-label','Разделы профиля');
 for(const [href,title,caption,icon]of [['account.html?view=friends','Друзья','Заявки и поиск игроков','♧'],['account.html#profile-builds-title','Мои сборки','Созданные тобой','▦'],['account.html#saved-builds','Сохранённые','Сборки других игроков','☆']]){
  const link=document.createElement('a');link.href=href;const symbol=document.createElement('span');symbol.className='account-shortcut-icon';symbol.textContent=icon;symbol.setAttribute('aria-hidden','true');const text=document.createElement('span'),titleNode=document.createElement('strong'),small=document.createElement('small');titleNode.textContent=title;small.textContent=caption;text.append(titleNode,small);link.append(symbol,text);if(href.includes('view=friends')&&new URLSearchParams(location.search).get('view')==='friends')link.setAttribute('aria-current','page');nav.append(link);
 }
 const notices=document.createElement('button');notices.type='button';notices.innerHTML='<span class="account-shortcut-icon" aria-hidden="true">♧</span><span><strong>Уведомления <b hidden></b></strong><small>Заявки и отклики на сборки</small></span>';
 notices.querySelector('.account-shortcut-icon').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>';
 nav.querySelector('.account-shortcut-icon').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="7" r="3"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M16 4a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-3-5"/></svg>';
 notices.addEventListener('click',()=>window.dispatchEvent(new Event('rift-open-notifications')));nav.append(notices);member.querySelector('.profile-hero').after(nav);
 window.addEventListener('rift-notification-count',event=>{const badge=notices.querySelector('b'),count=Math.max(0,Number(event.detail)||0);badge.hidden=!count;badge.textContent=count>99?'99+':String(count);});
 // A hash target may be created by a deferred module after the page loads.
 const target=decodeURIComponent(location.hash.slice(1));if(['profile-builds-title','saved-builds'].includes(target)){
  let done=false;const jump=()=>{const node=document.getElementById(target);if(done||!node||!window.RiftAccount?.user||window.RiftAccount.loading)return;done=true;observer.disconnect();node.scrollIntoView({block:'start'});};
  const observer=new MutationObserver(jump);observer.observe(member,{childList:true,subtree:true});window.addEventListener('rift-account-ready',jump);jump();window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
 }
})();
