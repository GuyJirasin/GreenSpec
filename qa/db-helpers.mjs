import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const migrations=process.env.GREEN_SPEC_MIGRATIONS || resolve(root,'backend/supabase/migrations');
const owner='00000000-0000-4000-8000-000000000001',editor='00000000-0000-4000-8000-000000000002',viewer='00000000-0000-4000-8000-000000000003',outsider='00000000-0000-4000-8000-000000000004';
export {setup,as,scalar,project,mutate,seedRun,owner,editor,viewer,outsider};
let key=0;
async function setup(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner uuid,metadata jsonb);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
 grant usage on schema storage to anon,authenticated,service_role;grant select,insert,update,delete on storage.objects to authenticated;
 insert into auth.users(id,email) values('${owner}','owner@example.test'),('${editor}','editor@example.test'),('${viewer}','viewer@example.test'),('${outsider}','outsider@example.test');`);
 for(const f of readdirSync(migrations).filter(f=>f.endsWith('.sql')).sort()){
  // PGlite lacks pgcrypto; migrations use core gen_random_uuid, not cryptographic extension functions.
  const sql=readFileSync(resolve(migrations,f),'utf8').replace(/create extension if not exists pgcrypto;/gi,'');
  try{await db.exec(sql)}catch(e){throw new Error(`Migration ${f}: ${e.message}`,{cause:e});}
 }
 return db;
}
async function as(db,user,fn){await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);`);try{return await fn()}finally{await db.exec('reset role');}}
async function scalar(db,sql,args=[]){return (await db.query(sql,args)).rows[0]?.value;}
async function project(db){return as(db,owner,()=>scalar(db,'select gs_create_project($1,$2) value',['Test project','Test context']));}
async function mutate(db,p,kind,data,record=null,request=`qa-${++key}`){return scalar(db,'select gs_mutate($1,$2,$3,$4,$5,$6) value',[p,kind,record?.id??null,record?.row_version??null,JSON.stringify(data),request]);}
async function seedRun(db,p,{status='COMPLETED',scope='structure/concrete',review='UNREVIEWED',parent=null,material='Low carbon concrete'}={}){
 const run=await scalar(db,"insert into analysis_runs(project_id,parent_run_id,input_snapshot,input_fingerprint,scenario,status,request_id) values($1,$2,'{}','fingerprint','success',$3,$4) returning id value",[p,parent,status,`run-${++key}`]);
 const id=crypto.randomUUID();const payload={id,lineage_id:'concrete',work_scope_key:scope,original_material:'Conventional concrete',proposed_material:material,rationale:'Fixture',quantity:{value:10,unit:'m3'},sources:[],methodology:{source:'fixture',version:'1',basis:'simulated'},impacts:{baseline_cost_thb:100,selected_cost_thb:90,cost_saving_thb:10,baseline_carbon_tco2e:20,selected_carbon_tco2e:10,carbon_reduction_tco2e:10},missing_data_reasons:[],uncertainty_notes:[]};
 await db.query('insert into recommendations(id,project_id,run_id,lineage_id,work_scope_key,payload) values($1,$2,$3,$4,$5,$6)',[id,p,run,'concrete',scope,JSON.stringify(payload)]);
 const r=await scalar(db,'insert into reviews(project_id,recommendation_id,decision) values($1,$2,$3) returning to_jsonb(reviews.*) value',[p,id,review]);
 return {run,id,review:r,payload};
}
