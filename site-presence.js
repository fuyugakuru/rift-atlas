// Online presence: reuse the last confirmed public count while reconnecting.
(() => {
  'use strict';
  const client=window.RiftAccount?.client,topbar=document.querySelector('.topbar');
  if(!client||!topbar||document.querySelector('.site-online'))return;
  const badge=document.createElement('span');badge.className='site-online';
  badge.innerHTML='<i aria-hidden="true"></i><span class="site-online-label">Онлайн</span><b>—</b>';
  badge.title='Примерное число посетителей. ≈ — последнее подтверждённое значение, соединение обновляется.';
  const link=topbar.querySelector('[data-account-link]');if(link)link.before(badge);else(topbar.querySelector('div')||topbar).append(badge);
  const value=badge.querySelector('b'),storageKey='rift-online-visitor-v1';
  const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname)||location.protocol==='file:';
  const room=local?'rift-atlas-online-preview-v1':'rift-atlas-online-v1',cacheKey=room+':count',ttl=45000;
  const valid=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id);
  let visitorId;try{visitorId=localStorage.getItem(storageKey);if(!valid(visitorId)){visitorId=crypto.randomUUID();localStorage.setItem(storageKey,visitorId);}visitorId=localStorage.getItem(storageKey)||visitorId;}catch{visitorId=crypto.randomUUID();}
  let channel=null,epoch=0,tracked=false,retryTimer,expiryTimer,retries=0,active=true;
  function unavailable(){badge.classList.remove('is-connected','is-cached');value.textContent='—';badge.setAttribute('aria-label','Счётчик онлайн временно недоступен');}
  function showCached(){
    clearTimeout(expiryTimer);if(!navigator.onLine){unavailable();return;}
    try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null'),age=Date.now()-cached?.at;
      if(!Number.isInteger(cached?.count)||cached.count<1||cached.count>10000000||age<0||age>=ttl){unavailable();return;}
      value.textContent='≈'+cached.count.toLocaleString('ru-RU');badge.classList.remove('is-connected');badge.classList.add('is-cached');badge.setAttribute('aria-label','Онлайн около '+cached.count+', последнее значение; обновляем соединение');
      expiryTimer=setTimeout(()=>{if(!tracked)unavailable();},ttl-age);
    }catch{unavailable();}
  }
  function render(current){if(current!==channel||!tracked)return;const state=current.presenceState();if(!state[visitorId]?.length)return;
    const count=Object.values(state).filter(entries=>Array.isArray(entries)&&entries.length>0).length;
    clearTimeout(expiryTimer);value.textContent=count.toLocaleString('ru-RU');badge.classList.remove('is-cached');badge.classList.add('is-connected');badge.setAttribute('aria-label','Сейчас на сайте: '+count);
    try{localStorage.setItem(cacheKey,JSON.stringify({count,at:Date.now()}));}catch{}
  }
  function disconnect(){clearTimeout(retryTimer);clearTimeout(expiryTimer);const old=channel;epoch++;channel=null;tracked=false;if(old)client.removeChannel(old).catch(()=>{});}
  function reconnect(){disconnect();showCached();if(active&&navigator.onLine){const delay=Math.min(15000,1000*2**Math.min(retries++,4));retryTimer=setTimeout(connect,delay);}}
  function connect(){if(channel||!active||!navigator.onLine)return;showCached();const turn=++epoch;tracked=false;
    const current=client.channel(room,{config:{presence:{key:visitorId},broadcast:{self:false}}});channel=current;
    current.on('presence',{event:'sync'},()=>render(current)).subscribe(async status=>{
      if(turn!==epoch||current!==channel)return;
      if(status==='SUBSCRIBED'){try{const result=await current.track({v:1});if(turn!==epoch||current!==channel)return;if(result==='ok'){tracked=true;retries=0;render(current);}else reconnect();}catch{if(turn===epoch)reconnect();}}
      else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status))reconnect();
    });
  }
  window.addEventListener('pagehide',()=>{active=false;disconnect();});
  window.addEventListener('pageshow',()=>{active=true;connect();});
  window.addEventListener('offline',()=>{disconnect();unavailable();});window.addEventListener('online',connect);
  window.addEventListener('storage',event=>{if(event.key===cacheKey&&!tracked)showCached();if(event.key!==storageKey)return;let canonical=event.newValue;try{canonical=localStorage.getItem(storageKey)||canonical;}catch{}if(valid(canonical)&&canonical!==visitorId){visitorId=canonical;disconnect();connect();}});
  showCached();connect();
})();
