import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
export const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
export function json(body: unknown, status=200) { return new Response(JSON.stringify(body), {status,headers:{...cors,'Content-Type':'application/json'}}); }
export function error(e: any, request_id?: string) {
 const known=['UNAUTHORIZED','INPUT_INCOMPLETE','DEMO_SOURCE_UNSUPPORTED','OUTPUT_INVALID','VERSION_CONFLICT','UPLOAD_FAILED','JOB_FAILED','PROJECT_ARCHIVED','JOB_ACTIVE'];
 const raw=e?.code && !/^[0-9A-Z]{5}$/.test(e.code)?e.code:e?.message;
 const code=known.find(c=>String(raw).includes(c))??'JOB_FAILED';
 return json({code,message:code==='JOB_FAILED'?'The operation could not finish. Retry using the same request ID.':String(e?.message??code),retryable:e?.retryable??code==='JOB_FAILED',request_id,details:e?.details??[]},code==='UNAUTHORIZED'?403:code==='VERSION_CONFLICT'?409:400);
}
export async function clients(req:Request) {
 const url=Deno.env.get('SUPABASE_URL')!, key=Deno.env.get('SUPABASE_ANON_KEY')!, secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const authorization=req.headers.get('Authorization'); if(!authorization?.startsWith('Bearer ')) throw {code:'UNAUTHORIZED',message:'Sign in again.'};
 const user=createClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
 const {data,error}=await user.auth.getUser(); if(error||!data.user)throw {code:'UNAUTHORIZED',message:'Your session expired. Sign in again.'};
 const admin=createClient(url,secret,{auth:{persistSession:false}}); return {user,admin,actor:data.user};
}
export async function rpc(client:any,name:string,args:any){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
export async function sha256(bytes:Uint8Array){const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');}
export const decodeBase64=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
export function method(req:Request){return req.method==='OPTIONS'?new Response(null,{status:204,headers:cors}):req.method!=='POST'?json({code:'METHOD_NOT_ALLOWED'},405):null;}
