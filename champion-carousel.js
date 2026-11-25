// One shared controller for the overview and matchup champion strips.
(()=>{'use strict';
function init(viewport,{track:trackSelector,group:groupSelector,root=viewport,pauseButton,speed=30}={}){
 if(!viewport||viewport.dataset.carouselReady)return;viewport.dataset.carouselReady='1';viewport.classList.add('rift-carousel');
 let track=trackSelector&&viewport.querySelector(trackSelector),group;
 if(track){group=track.querySelector(groupSelector);for(const node of [...track.children])if(node!==group)node.remove();}
 else{track=document.createElement('div');group=document.createElement('div');while(viewport.firstChild)group.append(viewport.firstChild);track.append(group);viewport.append(track);}
 if(!group)return;track.classList.add('rift-carousel-track');group.classList.add('rift-carousel-group');
 const clone=group.cloneNode(true);clone.removeAttribute('inert');clone.setAttribute('aria-hidden','true');clone.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));clone.querySelectorAll('a,button,[tabindex]').forEach(n=>n.tabIndex=-1);track.append(clone);
 viewport.querySelectorAll('img,a').forEach(n=>n.draggable=false);viewport.setAttribute('role','region');viewport.setAttribute('aria-label','Лента чемпионов: перетаскивай для прокрутки');viewport.tabIndex=0;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches,visible=true,offset=0,width=0,frame=0,last=0,drag=null,blockClickUntil=0,keyboardFocus=false;
 const normalize=n=>width?((n%width)+width)%width:0,paint=()=>{track.style.transform='translate3d('+(-offset)+'px,0,0)';};
 function measure(){width=group.getBoundingClientRect().width;offset=normalize(offset);viewport.scrollLeft=0;paint();sync();}
 function tick(now){frame=0;if(!canRun()){last=0;return;}if(last)offset=normalize(offset+Math.min(now-last,60)*speed/1000);last=now;paint();frame=requestAnimationFrame(tick);}
 function canRun(){return width>viewport.clientWidth&&!paused&&!drag&&!keyboardFocus&&visible&&!document.hidden&&viewport.isConnected;}
 function sync(){if(canRun()){if(!frame){last=0;frame=requestAnimationFrame(tick);}}else{if(frame)cancelAnimationFrame(frame);frame=0;last=0;}}
 function setPaused(value){paused=value;root.classList.toggle('is-paused',paused);if(pauseButton){pauseButton.textContent=paused?'▶':'Ⅱ';pauseButton.setAttribute('aria-pressed',String(paused));pauseButton.setAttribute('aria-label',paused?'Продолжить движение чемпионов':'Приостановить движение чемпионов');}sync();}
 pauseButton?.addEventListener('click',()=>setPaused(!paused));
 viewport.addEventListener('dragstart',e=>e.preventDefault());
 viewport.addEventListener('pointerdown',e=>{if(e.isPrimary===false||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,offset,moved:false};sync();});
 viewport.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved){if(Math.abs(dx)<6)return;if(e.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)){drag=null;sync();return;}drag.moved=true;viewport.classList.add('is-dragging');viewport.setPointerCapture?.(e.pointerId);}e.preventDefault();offset=normalize(drag.offset-dx);paint();},{passive:false});
 function release(e){if(!drag||drag.id!==e.pointerId)return;if(drag.moved)blockClickUntil=performance.now()+350;drag=null;viewport.classList.remove('is-dragging');if(viewport.hasPointerCapture?.(e.pointerId))viewport.releasePointerCapture(e.pointerId);sync();}
 window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
 viewport.addEventListener('click',e=>{if(performance.now()<blockClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 viewport.addEventListener('wheel',e=>{if(Math.abs(e.deltaX)>Math.abs(e.deltaY)){e.preventDefault();offset=normalize(offset+e.deltaX);paint();}},{passive:false});
 viewport.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();offset=normalize(offset+(e.key==='ArrowRight'?90:-90));paint();}});
 viewport.addEventListener('focusin',e=>{keyboardFocus=e.target.matches?.(':focus-visible')||false;if(keyboardFocus&&e.target!==viewport){const item=e.target.getBoundingClientRect(),box=viewport.getBoundingClientRect();if(item.left<box.left)offset=normalize(offset+item.left-box.left-6);else if(item.right>box.right)offset=normalize(offset+item.right-box.right+6);viewport.scrollLeft=0;paint();}sync();});
 viewport.addEventListener('focusout',e=>{if(!viewport.contains(e.relatedTarget)){keyboardFocus=false;sync();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){drag=null;viewport.classList.remove('is-dragging');}sync();});
 if('IntersectionObserver' in window){new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(viewport);}
 if('ResizeObserver' in window)new ResizeObserver(measure).observe(viewport);else window.addEventListener('resize',measure);
 reduced.addEventListener?.('change',e=>setPaused(e.matches));setPaused(paused);measure();
}
window.RiftChampionCarousel={init};
const overview=document.querySelector('.atlas-champion-window');if(overview)init(overview,{track:'.atlas-champion-track',group:'.atlas-champion-group',root:document.querySelector('.atlas-champion-strip'),pauseButton:document.querySelector('.atlas-champions-pause'),speed:32});
const matchup=document.querySelector('#mx-start-champions');if(matchup){const heading=document.querySelector('#mx-start .mx-start-heading'),pause=document.createElement('button');pause.type='button';pause.className='rift-carousel-pause';heading.append(pause);init(matchup,{root:matchup,pauseButton:pause,speed:30});}
})();
