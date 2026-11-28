// One champion per page. Videos are fetched only when the cover is visible.
(()=>{'use strict';const stage=document.querySelector('.character-profile .character-photo'),id=location.pathname.split('/').pop().replace(/\.html$/,'');
 const src=window.RIFT_CHAMPION_MOTION?.[id];if(!stage||!src||stage.dataset.motionReady)return;stage.dataset.motionReady='true';stage.classList.add('has-champion-motion');stage.closest('.character-profile').classList.add('has-motion-cover');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 stage.closest('.character-profile').classList.add('champion-hero-immersive');
 const videos=[document.createElement('video'),document.createElement('video')];for(const v of videos){v.className='champion-motion-video';v.muted=true;v.defaultMuted=true;v.playsInline=true;v.preload='none';v.setAttribute('muted','');v.setAttribute('playsinline','');v.setAttribute('aria-hidden','true');v.tabIndex=-1;stage.append(v);}
 let desired=!reduce.matches&&!navigator.connection?.saveData,visible=false,loaded=false,active=0,transitioning=false,failed=false,generation=0,timer,frame;
 function stop(){videos.forEach(v=>v.pause());if(frame){videos[active].cancelVideoFrameCallback?.(frame);frame=null;}}
 function watch(v){if(!v.requestVideoFrameCallback||frame)return;frame=v.requestVideoFrameCallback(()=>{frame=null;if(v!==videos[active]||!desired||!visible||document.hidden)return;boundary(v);watch(v);});}
 async function start(){if(!desired||!visible||document.hidden||failed)return;const turn=++generation;
  if(!loaded){for(const v of videos){v.src=src;v.preload='auto';v.load();}loaded=true;}
  const v=videos[active];try{await v.play();if(turn!==generation||!desired||!visible||document.hidden){v.pause();return;}v.classList.add('is-visible');stage.classList.add('is-animated');watch(v);}
  catch{if(turn===generation){desired=false;}}
 }
 async function crossfade(){if(transitioning||!desired||!visible||document.hidden)return;transitioning=true;const turn=generation,old=videos[active],nextIndex=1-active,next=videos[nextIndex];
  try{next.currentTime=0;await next.play();if(turn!==generation||!desired||!visible||document.hidden){next.pause();transitioning=false;return;}if(frame){old.cancelVideoFrameCallback?.(frame);frame=null;}active=nextIndex;next.classList.add('is-visible');old.classList.remove('is-visible');watch(next);timer=setTimeout(()=>{old.pause();old.currentTime=0;transitioning=false;},650);}
  catch{transitioning=false;}
 }
 function boundary(v){if(v===videos[active]&&Number.isFinite(v.duration)&&v.duration-v.currentTime<=Math.min(.8,v.duration/4))crossfade();}
 for(const v of videos){v.addEventListener('loadedmetadata',()=>{if(v.videoWidth&&v.videoHeight)stage.style.setProperty('--champion-motion-ratio',v.videoWidth+'/'+v.videoHeight);});v.addEventListener('timeupdate',()=>boundary(v));v.addEventListener('ended',()=>{if(v===videos[active])crossfade();});v.addEventListener('error',()=>{failed=true;desired=false;generation++;clearTimeout(timer);transitioning=false;stop();videos.forEach(x=>x.classList.remove('is-visible'));stage.classList.remove('is-animated');});}
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();else{generation++;stop();}},{threshold:.05}):null;
 if(observer)observer.observe(stage);else{visible=true;start();}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){generation++;stop();}else start();});reduce.addEventListener('change',()=>{if(reduce.matches){desired=false;generation++;stop();}});
 window.addEventListener('pagehide',()=>{generation++;clearTimeout(timer);stop();observer?.disconnect();});
 window.addEventListener('pageshow',event=>{if(event.persisted){if(observer)observer.observe(stage);else start();}});
})();
