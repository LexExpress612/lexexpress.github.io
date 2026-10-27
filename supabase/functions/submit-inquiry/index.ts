import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const origins=new Set(['https://lexexpressllc.com','https://www.lexexpressllc.com','https://lexexpress612.github.io','https://lexexpress-github-io.lexexpress612.workers.dev']);
const services=new Set(['Air Cargo & Airport Logistics','Medical & Healthcare Logistics','Specialized Freight','Catering (Optional Add-On)','Other / Not Sure']);
const AIRTABLE_BASE='appXPWY7OqQTmdZNd',AIRTABLE_TABLE='tblz3RMTv0QuUgDZC';
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://lexexpressllc.com','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type, apikey, authorization',Vary:'Origin','Content-Type':'application/json','Cache-Control':'no-store'};
 const respond=(data:object,status:number)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return respond({error:'Method not allowed'},405);
 if(!origins.has(origin))return respond({error:'Origin not allowed'},403);
 if(Number(req.headers.get('content-length')||0)>12000)return respond({error:'Request too large'},413);
 let body:Record<string,unknown>;
 try{const raw=await req.text();if(new TextEncoder().encode(raw).length>12000)return respond({error:'Request too large'},413);body=JSON.parse(raw)}catch{return respond({error:'Invalid request'},400)}
 if(!body||typeof body!=='object'||Array.isArray(body))return respond({error:'Invalid request'},400);
 if(typeof body.website==='string'&&body.website.trim())return respond({ok:true},200);
 if(['name','email','phone','service','details'].some(k=>typeof body[k]!=='string'))return respond({error:'Please check all required fields.'},400);
 const [name,email,phone,service,details]=['name','email','phone','service','details'].map(k=>(body[k] as string).trim());
 if(name.length<2||name.length>160||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||phone.length<5||phone.length>50||!services.has(service)||details.length<10||details.length>4000)return respond({error:'Please check all required fields.'},400);
 const suppliedId=body.request_id;
 if(suppliedId!==undefined&&(typeof suppliedId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suppliedId)))return respond({error:'Invalid inquiry reference. Please reload and retry.'},400);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return respond({error:'Submission service unavailable. Please call (612) 293-9883.'},503);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const values={customer_name:name,email,phone,service_type:service,details};
 let data:{id:string}|null=null;
 try{
  const inserted=await db.from('customer_inquiries').insert({...values,...(suppliedId?{id:suppliedId}:{})}).select('id').single();data=inserted.data;
  if(inserted.error?.code==='23505'&&suppliedId){
   const existing=await db.from('customer_inquiries').select('id,customer_name,email,phone,service_type,details').eq('id',suppliedId).single();
   if(existing.error||!existing.data||Object.entries(values).some(([k,v])=>existing.data[k]!==v))return respond({error:'Inquiry reference conflict. Please reload and submit again.'},409);
   data={id:existing.data.id};
  }else if(inserted.error||!data){console.error('Inquiry insert failed',inserted.error?.code||'missing_receipt');return respond({error:'Could not save inquiry. Please try again.'},500)}
 }catch{console.error('Inquiry database unavailable');return respond({error:'Could not confirm inquiry. Please retry.'},503)}
 if(!data)return respond({error:'Could not confirm inquiry. Please retry.'},503);
 // A stable subject lets Airtable upsert repair an interrupted copy without a second record.
 const token=Deno.env.get('AIRTABLE_PAT');let operatorCopy='pending';
 if(!token)console.error('Airtable configuration missing',data.id);
 else{
  const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),6000);
  try{
   const response=await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({performUpsert:{fieldsToMergeOn:['Inquiry Subject']},records:[{fields:{'Inquiry Subject':'Website inquiry '+data.id,'Customer Name':name,'Email Address':email,'Phone Number':phone,'Service Type':'Other','Website Service Requested':service,'Inquiry Details':`Requested service: ${service}\n\n${details}`}}],typecast:false}),signal:controller.signal});
   const receipt=await response.json().catch(()=>null);
   if(response.ok&&receipt?.records?.length===1&&typeof receipt.records[0].id==='string'){operatorCopy='saved';console.log('Airtable synchronization succeeded',data.id)}
   else console.error('Airtable synchronization not verified',response.status,'Supabase inquiry:',data.id);
  }catch{console.error('Airtable connection interrupted; primary inquiry saved',data.id)}finally{clearTimeout(deadline)}
 }
 // Primary receipt is verified; this does not claim email delivery or a confirmed booking.
 return respond({ok:true,message:'Your inquiry has been received.',reference:data.id,operator_copy:operatorCopy},201);
});
