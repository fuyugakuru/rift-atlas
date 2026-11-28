// Confirmation codes stay in memory only; a reload remembers just the pending email.
(()=>{'use strict';
window.createSignupCode=({root,client,message})=>{
 if(!root||!client)return null;
 const form=root.querySelector('#auth-form'),modes=root.querySelector('.account-modes'),panel=document.createElement('section');
 panel.className='auth-code-step';panel.hidden=true;panel.setAttribute('aria-labelledby','auth-code-title');
 panel.innerHTML='<p class="profile-kicker">ПОДТВЕРЖДЕНИЕ ПОЧТЫ</p><h3 id="auth-code-title">Введи код из письма</h3><p class="auth-code-address"></p><form class="auth-code-form"><label for="signup-code">Код подтверждения<input id="signup-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10" required></label><button type="submit" class="chip active">Подтвердить почту</button></form><p class="auth-code-status" role="status" aria-live="polite"></p><div class="auth-code-actions"><button type="button" class="account-text-button auth-code-resend">Отправить код повторно</button><button type="button" class="account-text-button auth-code-change">Изменить почту</button><button type="button" class="account-text-button auth-code-signin">Уже есть аккаунт? Войти</button></div>';
 form.after(panel);
 const input=panel.querySelector('input'),verify=panel.querySelector('button[type=submit]'),resend=panel.querySelector('.auth-code-resend'),status=panel.querySelector('.auth-code-status');
 let email='',until=0,timer,working=false,version=0;
 const storage='rift-pending-signup';
 const remember=()=>{try{if(email)sessionStorage.setItem(storage,JSON.stringify({email,at:Date.now()}));else sessionStorage.removeItem(storage);}catch{}};
 function tick(){const seconds=Math.max(0,Math.ceil((until-Date.now())/1000));resend.disabled=working||!!seconds;resend.textContent=seconds?'Отправить повторно через '+seconds+' с':'Отправить код повторно';if(!seconds&&timer){clearInterval(timer);timer=null;}}
 function cooldown(){until=Date.now()+60000;clearInterval(timer);timer=setInterval(tick,1000);tick();}
 function start(address,restore=false,sent=true){version++;email=address.trim();remember();panel.hidden=false;form.hidden=true;if(modes)modes.hidden=true;input.value='';status.textContent='Проверь входящие и папку «Спам». Введи код из последнего письма.';panel.querySelector('.auth-code-address').textContent='Письмо для '+email;if(sent)cooldown();else{until=0;tick();}if(!restore)input.focus();}
 function cancel(){version++;email='';remember();clearInterval(timer);timer=null;working=false;verify.disabled=false;input.value='';panel.hidden=true;form.hidden=false;if(modes)modes.hidden=false;}
 panel.querySelector('.auth-code-change').onclick=()=>{cancel();root.querySelector('#auth-email').focus();};
 panel.querySelector('.auth-code-signin').onclick=()=>{cancel();root.querySelector('[data-auth-mode="signin"]').click();};
 panel.querySelector('form').onsubmit=async event=>{event.preventDefault();if(working||!email)return;const token=input.value.trim();if(!/^\d{6,10}$/.test(token)){status.textContent='Введи цифровой код целиком, как в письме.';return;}working=true;verify.disabled=true;tick();const stamp=version;
  try{const{data,error}=await client.auth.verifyOtp({email,token,type:'email'});if(stamp!==version)return;if(error)throw error;if(!data?.session)throw Error('No session');cancel();message('Почта подтверждена. Добро пожаловать в Rift Atlas!');}
  catch(e){if(stamp===version){status.textContent=/expired|invalid|otp/i.test(e.message||'')?'Код неверный или устарел. Проверь последнее письмо или запроси новый код.':/rate|too many/i.test(e.message||'')?'Слишком много попыток. Подожди немного и попробуй снова.':'Не удалось подтвердить почту. Проверь соединение и попробуй снова.';input.focus();}}
  finally{if(stamp===version){working=false;verify.disabled=false;tick();}}
 };
 resend.onclick=async()=>{if(working||Date.now()<until||!email)return;working=true;tick();const stamp=version;
  try{const{error}=await client.auth.resend({type:'signup',email});if(stamp!==version)return;if(error)throw error;status.textContent='Если регистрация ожидает подтверждения, новый код отправлен. Используй последнее письмо.';remember();cooldown();}
  catch(e){if(stamp===version){status.textContent=/rate|too many|seconds/i.test(e.message||'')?'Письмо запрошено слишком недавно. Попробуй через минуту.':'Не удалось отправить письмо. Проверь соединение.';cooldown();}}
  finally{if(stamp===version){working=false;tick();}}
 };
 window.addEventListener('rift-account-ready',()=>{if(window.RiftAccount?.user)cancel();});window.addEventListener('pagehide',()=>clearInterval(timer));
 try{const saved=JSON.parse(sessionStorage.getItem(storage)||'null');if(saved&&typeof saved.email==='string'&&saved.email.length<=254&&Date.now()-saved.at>=0&&Date.now()-saved.at<3600000){root.querySelector('#auth-email').value=saved.email;start(saved.email,true);}else sessionStorage.removeItem(storage);}catch{}
 return {start,cancel};
};})();
