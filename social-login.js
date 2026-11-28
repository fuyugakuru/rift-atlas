// Providers are enabled only after their server-side application is configured.
(()=>{'use strict';const host=document.querySelector('#account-guest'),account=window.RiftAccount;if(!host||!account?.client)return;
 const box=document.createElement('div');box.className='social-login';box.innerHTML='<div class="social-login-buttons"><button type="button" class="social-login-google" disabled><span aria-hidden="true">G</span>Продолжить с Google</button></div><p class="social-login-status" role="status" aria-live="polite">Проверяем способы входа…</p><div class="social-login-divider">или по почте</div>';
 host.querySelector('.account-modes').before(box);const status=box.querySelector('.social-login-status'),google=box.querySelector('.social-login-google');let running=false,googleReady=false;


 const redirect=new URL('account.html',location.href);redirect.search='';redirect.hash='';
 google.onclick=async()=>{if(running||!googleReady)return;running=true;google.disabled=true;status.textContent='Открываем Google…';
  try{const{error}=await account.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect.href,scopes:'openid email profile',queryParams:{prompt:'select_account'}}});if(error)throw error;}
  catch{running=false;google.disabled=false;status.textContent='Не удалось открыть Google. Попробуй ещё раз или войди по почте.';}
 };
 async function availability(){try{
  const response=await fetch('https://njguxarmxshnwxipxlxl.supabase.co/auth/v1/settings',{headers:{apikey:'sb_publishable_FApJoCwZo2y8aPCiB641uQ_BLvBBWKM'},signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('Settings unavailable');const settings=await response.json();googleReady=settings.external?.google===true;google.disabled=!googleReady;status.textContent=googleReady?'':'Вход через Google настраивается. Пока можно войти по почте.';
 }catch{status.textContent='Не удалось проверить способы входа. Можно войти по почте.';}}
 const params=new URLSearchParams(location.search),fragment=new URLSearchParams(location.hash.slice(1));
 if(params.has('error')||fragment.has('error')){status.textContent='Вход через внешний аккаунт отменён или не завершён. Попробуй снова.';for(const key of ['error','error_code','error_description'])params.delete(key);history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+(fragment.has('error')?'':location.hash));}
 availability();
})();
