// Approved full descriptions override old static copies, including build tooltips.
(() => {
  let records=[],busy=false,observer;
  const values=new Map(),patched=new WeakMap();
  const text=(node,value)=>{if(node&&node.dataset.balanceValue!==value){node.textContent=value;node.style.whiteSpace='pre-line';node.dataset.balanceValue=value;node.setAttribute('data-stat-description','');}};
  function draw(){
    for(const record of records){
      const value=record.value,key=record.key;
      if(key.startsWith('rune:')) {
        const id=key.slice(5);if(window.RIFT_RUNES?.runes[id])window.RIFT_RUNES.runes[id].description=value.description;
        for(const panel of document.querySelectorAll('[data-balance-rune]'))if(panel.dataset.balanceRune===id)text(panel.querySelector('p'),value.description);
      }
      const asset=window.RIFT_BUILD_CATALOG?.assets?.find(a=>a.id===key);
      if(asset)asset.description=value.description;
      for(const node of document.querySelectorAll('[data-detail-key]'))if(node.dataset.detailKey===key)text(node.querySelector('.asset-detail-description'),value.description);
      if(key.startsWith('item:')&&document.querySelector('.item-detail-english')?.textContent.trim()===key.slice(5)) {
        const stats=document.querySelector('.item-detail-stats'),effects=document.querySelector('.item-detail-effects');
        if(effects){let description=effects.querySelector('[data-balance-description]');if(!description){description=document.createElement('p');description.dataset.balanceDescription='';effects.replaceChildren();const h=document.createElement('h2');h.textContent='Характеристики и эффекты';effects.append(h,description);}text(description,value.description);if(stats)stats.hidden=true;}
      }
      const match=key.match(/^champion:([a-z0-9-]+):(\d|base)$/);
      if(match&&location.pathname.endsWith('/'+match[1]+'.html')) {
        if(match[2]==='base'){
          const profile=document.querySelector('.character-profile');if(profile){let box=document.getElementById('balance-base-stats');if(!box){box=document.createElement('section');box.id='balance-base-stats';box.className='panel';const h=document.createElement('h2');h.textContent='Изменения базовых характеристик';box.append(h,document.createElement('p'));profile.after(box);}text(box.querySelector('p'),value.description);}continue;
        }
        const panel=document.getElementById('ability-panel-'+match[2]);
        if(panel){text(panel.querySelector('.ability-description'),value.description);const parameters=panel.querySelectorAll('.ability-parameters span');for(const span of parameters){const label=span.querySelector('small')?.textContent||'';if(/Перезарядка/.test(label)&&value.cooldown!==undefined)text(span.querySelector('b'),value.cooldown+' с');if(/Стоимость/.test(label)&&value.cost!==undefined)text(span.querySelector('b'),value.cost);}}
      }
    }
  }
  async function load(){
    const client=window.RiftAccount?.client;if(!client||busy)return;busy=true;
    try{const {data,error}=await client.rpc('balance_public');if(error||!Array.isArray(data))return;records=data;for(const r of records)values.set(r.key,r);draw();
      if(!observer&&records.length){observer=new MutationObserver(()=>{observer.disconnect();draw();observer.observe(document.body,{childList:true,subtree:true});});observer.observe(document.body,{childList:true,subtree:true});}
      window.dispatchEvent(new CustomEvent('rift-balance-ready',{detail:records}));
    }catch{/* Keep the static page when the service is unavailable. */}finally{busy=false;}
  }
  window.addEventListener('rift-account-ready',load,{once:true});
  load();
})();
