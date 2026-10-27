document.addEventListener('DOMContentLoaded',()=>{
 const form=document.getElementById('inquiry-form');if(!form)return;
 const button=form.querySelector('[type="submit"]'),status=document.createElement('p');
 status.id='inquiry-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');form.appendChild(status);
 const storageKey='lexexpress-pending-inquiry-v1';let pending=null,busy=false;
 const readPending=()=>{try{return JSON.parse(sessionStorage.getItem(storageKey)||'null')}catch{return null}};
 const savePending=value=>{pending=value;try{if(value)sessionStorage.setItem(storageKey,JSON.stringify(value));else sessionStorage.removeItem(storageKey)}catch{}};
 async function requestId(payload){
  const bytes=new TextEncoder().encode(JSON.stringify(payload));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const fingerprint=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  const previous=pending||readPending();
  if(previous?.fingerprint===fingerprint&&/^[0-9a-f-]{36}$/i.test(previous.id))return previous.id;
  const id=crypto.randomUUID();savePending({id,fingerprint});return id;
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!form.reportValidity())return;busy=true;
  const fields=new FormData(form),payload=Object.fromEntries(['name','email','phone','service','details'].map(k=>[k,String(fields.get(k)||'').trim()]));payload.website=String(fields.get('website')||'');
  button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='Sending inquiry…';status.textContent='';status.dataset.state='pending';
  const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),12000);
  try{
   payload.request_id=await requestId(payload);
   const response=await fetch('https://hizfctuvxnllwljoxplu.supabase.co/functions/v1/submit-inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
   const result=await response.json().catch(()=>({error:'We could not confirm the response. Please retry this inquiry.'}));
   if(!response.ok||!result.ok)throw new Error(result.error||'We could not confirm your inquiry. Please retry.');
   form.reset();savePending(null);status.dataset.state='success';status.textContent='Thank you! Your inquiry has been received. LexExpress will follow up to review your request.'+(typeof result.reference==='string'?' Reference: '+result.reference:'');
  }catch(error){
   status.dataset.state='error';status.textContent=controller.signal.aborted||error.message==='Failed to fetch'?'We could not confirm delivery. Retry this inquiry, or call (612) 293-9883 for urgent service. Your entries are still here.':error.message||'Please try again, or email lexexpress612@gmail.com directly.';
  }finally{clearTimeout(deadline);busy=false;button.disabled=false;button.removeAttribute('aria-busy');button.textContent='Submit Service Inquiry →';}
 });
});
