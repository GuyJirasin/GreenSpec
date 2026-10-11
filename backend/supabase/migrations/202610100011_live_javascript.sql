-- JavaScript live concrete analysis; additive workflow support, no user data deletion.
alter table public.analysis_runs drop constraint analysis_runs_mode_check;
alter table public.analysis_runs add constraint analysis_runs_mode_check check(mode in ('simulated','live'));
create or replace function public.gs_begin_live_analysis(p_project_id uuid,p_request_id text,p_scenario text,p_document_ids uuid[],p_parent_run_id uuid default null,p_feedback jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare p projects; r analysis_runs; inputs jsonb; snap jsonb; begin
 perform gs_require(p_project_id); select * into p from projects where id=p_project_id for update;
 select * into r from analysis_runs where project_id=p_project_id and request_id=p_request_id for update;
 if r.id is not null then
 if r.mode<>'live' then raise exception 'REQUEST_ID_CONFLICT'; end if;
 if r.status in ('QUEUED','PROCESSING') and r.heartbeat_at<now()-interval '60 seconds' then update analysis_runs set status='FAILED',errors='[{"code":"JOB_FAILED","message":"Live AI job timed out","retryable":true}]' where id=r.id returning * into r; end if;
 if r.status='FAILED' and coalesce((r.errors->0->>'retryable')::boolean,false) and r.scenario<>'job-failure' then update analysis_runs set status='QUEUED',heartbeat_at=now() where id=r.id returning * into r; end if;
 return to_jsonb(r); end if;
 if coalesce(cardinality(p_document_ids),0)=0 then raise exception 'INPUT_INCOMPLETE'; end if;
 if exists(select 1 from unnest(p_document_ids) x where not exists(select 1 from document_versions v join documents d on d.id=v.document_id where v.id=x and v.project_id=p_project_id and v.upload_state='READY' and jsonb_array_length(v.extraction)>0 and d.retired_at is null and length(trim(d.title))>0)) then raise exception 'DEMO_SOURCE_UNSUPPORTED'; end if;
 if p_parent_run_id is not null and not exists(select 1 from analysis_runs where id=p_parent_run_id and project_id=p_project_id and mode='live' and status in ('COMPLETED','PARTIAL') and not finalized) then raise exception 'ITERATION_PARENT_INVALID'; end if;
 if exists(select 1 from analysis_runs where project_id=p_project_id and status in ('QUEUED','PROCESSING')) then raise exception 'JOB_ACTIVE'; end if;
 select jsonb_agg(jsonb_build_object('id',v.id,'checksum',v.checksum,'fixture_id',v.fixture_id,'title',d.title,'type',d.type) order by v.id) into inputs from document_versions v join documents d on d.id=v.document_id where v.id=any(p_document_ids);
 snap:=jsonb_build_object('contract_version','1.0','project_id',p_project_id,'request_id',p_request_id,'operation',case when p_parent_run_id is null then 'initial' else 'iterate' end,'context',jsonb_build_object('name',p.name,'description',p.description),'document_versions',inputs,'generation_mode','live','fixture_scenario_id',null,'parent_run_id',p_parent_run_id,'feedback',p_feedback);
 insert into analysis_runs(project_id,parent_run_id,input_snapshot,input_fingerprint,mode,scenario,request_id) values(p_project_id,p_parent_run_id,snap,md5(snap::text),'live','live',p_request_id) returning * into r;
 insert into analysis_inputs select p_project_id,r.id,x from unnest(p_document_ids) x on conflict do nothing;
 perform gs_log(p_project_id,'analysis_runs',r.id,'queued',null,to_jsonb(r)); return to_jsonb(r);
end $$;
create or replace function public.gs_finish_analysis_legacy(p_run_id uuid,p_result jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare r analysis_runs; rec jsonb; source jsonb; rid uuid; oldrec recommendations; oldreview reviews; begin
 select * into r from analysis_runs where id=p_run_id for update; if r.id is null then raise exception 'JOB_NOT_FOUND'; end if;
 if r.status not in ('QUEUED','PROCESSING') then return to_jsonb(r); end if;
 if exists(select 1 from projects where id=r.project_id and archived_at is not null) then raise exception 'PROJECT_ARCHIVED'; end if;
 if p_result->>'contract_version'<>'1.0' or p_result->>'generation_mode' is distinct from r.mode or p_result->>'run_id'<>p_run_id::text or p_result->>'status' not in ('completed','partial','failed') then raise exception 'OUTPUT_INVALID'; end if;
 for rec in select value from jsonb_array_elements(p_result->'recommendations') loop
 rid:=gen_random_uuid(); rec:=rec||jsonb_build_object('id',rid);
 insert into recommendations values(rid,r.project_id,r.id,rec->>'lineage_id',rec->>'work_scope_key',rec);
 for source in select value from jsonb_array_elements(rec->'sources') loop
 if not exists(select 1 from analysis_inputs where run_id=r.id and document_version_id=(source->>'document_version_id')::uuid) then raise exception 'OUTPUT_INVALID'; end if;
 if r.mode='live' and not exists(select 1 from document_versions dv cross join lateral jsonb_array_elements(dv.extraction) seg where dv.id=(source->>'document_version_id')::uuid and seg->>'exact_text'=source->>'exact_text' and seg->'locator'=source->'locator') then raise exception 'OUTPUT_INVALID';end if;
 insert into source_references(project_id,recommendation_id,document_version_id,exact_text,locator) values(r.project_id,rid,(source->>'document_version_id')::uuid,source->>'exact_text',source->'locator'); end loop;
 oldrec:=null; oldreview:=null;
 if r.parent_run_id is not null then select * into oldrec from recommendations where run_id=r.parent_run_id and lineage_id=rec->>'lineage_id' and work_scope_key=rec->>'work_scope_key' limit 1; select * into oldreview from reviews where recommendation_id=oldrec.id; end if;
 insert into reviews(project_id,recommendation_id,decision,reason,reviewer_id,locked) values(r.project_id,rid,case when oldreview.locked and oldreview.decision='APPROVED' and oldrec.payload-'id'=rec-'id' then 'APPROVED' else 'UNREVIEWED' end,case when oldreview.locked and oldrec.payload-'id'=rec-'id' then oldreview.reason else '' end,oldreview.reviewer_id,coalesce(oldreview.locked and oldreview.decision='APPROVED' and oldrec.payload-'id'=rec-'id',false));
 end loop;
 p_result:=jsonb_set(p_result,'{recommendations}',coalesce((select jsonb_agg(payload order by work_scope_key,id) from recommendations where run_id=r.id),'[]'));
 p_result:=jsonb_set(p_result,'{input_fingerprint}',to_jsonb(r.input_fingerprint));
 update analysis_runs set status=upper(p_result->>'status'),result=p_result,warnings=p_result->'warnings',errors=p_result->'errors',heartbeat_at=now() where id=r.id returning * into r;
 perform gs_log(r.project_id,'analysis_runs',r.id,'job_completed',null,jsonb_build_object('status',r.status)); return to_jsonb(r);
end $$;
create or replace function public.gs_finalize(p_run_id uuid,p_review_epoch integer,p_request_id text,p_omit_errors boolean default false,p_omission_reason text default '') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare r analysis_runs; s decision_sets; receipt jsonb; summary jsonb; begin
 select * into r from analysis_runs where id=p_run_id; perform gs_require(r.project_id); perform 1 from projects where id=r.project_id for update;
 select result into receipt from operation_receipts where project_id=r.project_id and request_id=p_request_id and operation='finalize'; if receipt is not null then return receipt; end if;
 select * into r from analysis_runs where id=p_run_id for update;
 if r.review_epoch is distinct from p_review_epoch then raise exception 'VERSION_CONFLICT' using detail=to_jsonb(r)::text; end if;
 if r.finalized then select to_jsonb(d) into receipt from decision_sets d where run_id=p_run_id; return receipt; end if;
 if r.stale then raise exception 'INPUT_STALE'; end if;
 if r.status not in ('COMPLETED','PARTIAL') then raise exception 'ANALYSIS_NOT_READY'; end if;
 if r.status='PARTIAL' and (not p_omit_errors or length(trim(p_omission_reason))=0) then raise exception 'SOURCE_OMISSION_REQUIRED'; end if;
 if exists(select 1 from recommendations c left join reviews v on v.recommendation_id=c.id where c.run_id=p_run_id and coalesce(v.decision,'UNREVIEWED')='UNREVIEWED') then raise exception 'UNRESOLVED_REVIEW'; end if;
 if exists(select 1 from recommendations c join reviews v on v.recommendation_id=c.id where c.run_id=p_run_id and v.decision='APPROVED' group by c.work_scope_key having count(*)>1) then raise exception 'SCOPE_OVERLAP'; end if;
 select jsonb_build_object('generation_mode',r.mode,'approved',count(*) filter(where v.decision='APPROVED'),'rejected',count(*) filter(where v.decision='REJECTED'),'total',count(*),'cost_saving_thb',sum((gs_review_payload(c.id)->'impacts'->>'cost_saving_thb')::numeric) filter(where v.decision='APPROVED'),'carbon_reduction_tco2e',sum((gs_review_payload(c.id)->'impacts'->>'carbon_reduction_tco2e')::numeric) filter(where v.decision='APPROVED'),'cost_known',count(*) filter(where v.decision='APPROVED' and gs_review_payload(c.id)->'impacts'->>'cost_saving_thb' is not null),'carbon_known',count(*) filter(where v.decision='APPROVED' and gs_review_payload(c.id)->'impacts'->>'carbon_reduction_tco2e' is not null),'omission_reason',p_omission_reason,'source_omissions',case when p_omit_errors then r.errors else '[]'::jsonb end,'warnings',r.warnings) into summary from recommendations c join reviews v on v.recommendation_id=c.id where c.run_id=p_run_id;
 insert into decision_sets(project_id,run_id,version_no,finalized_by,summary_snapshot) values(r.project_id,r.id,(select coalesce(max(version_no),0)+1 from decision_sets where project_id=r.project_id),auth.uid(),summary) returning * into s;
 insert into decision_items(project_id,decision_set_id,recommendation_id,decision,snapshot,lineage_id,work_scope_key) select r.project_id,s.id,c.id,v.decision,gs_review_payload(c.id)||jsonb_build_object('generation_mode',r.mode,'fixture_scenario_id',r.scenario,'review_reason',v.reason),c.lineage_id,c.work_scope_key from recommendations c join reviews v on v.recommendation_id=c.id where c.run_id=r.id;
 update analysis_runs set finalized=true where id=r.id;
 update document_revisions dr set outdated=true where dr.project_id=r.project_id and dr.decision_set_id<>s.id and (
 exists(select 1 from decision_items ni where ni.decision_set_id=s.id and ni.decision='APPROVED' and not exists(select 1 from decision_items oi where oi.decision_set_id=dr.decision_set_id and oi.decision='APPROVED' and gs_snapshot_compare(oi.snapshot)=gs_snapshot_compare(ni.snapshot)))
 or exists(select 1 from decision_items oi where oi.decision_set_id=dr.decision_set_id and oi.decision='APPROVED' and not exists(select 1 from decision_items ni where ni.decision_set_id=s.id and ni.decision='APPROVED' and gs_snapshot_compare(oi.snapshot)=gs_snapshot_compare(ni.snapshot))));
 perform gs_log(r.project_id,'decision_sets',s.id,'finalized',null,to_jsonb(s)); insert into operation_receipts values(r.project_id,p_request_id,'finalize',auth.uid(),to_jsonb(s)); return to_jsonb(s);
end $$;
create or replace function public.gs_reopen(p_decision_set_id uuid,p_request_id text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare s decision_sets; oldrun analysis_runs; nr analysis_runs; rec recommendations; newrec uuid; receipt jsonb; begin
 select * into s from decision_sets where id=p_decision_set_id; perform gs_require(s.project_id); perform 1 from projects where id=s.project_id for update;
 select result into receipt from operation_receipts where project_id=s.project_id and request_id=p_request_id and operation='reopen'; if receipt is not null then return receipt; end if;
 select * into oldrun from analysis_runs where id=s.run_id;
 insert into analysis_runs(project_id,parent_run_id,input_snapshot,input_fingerprint,mode,scenario,status,request_id,result,errors,warnings,stale) values(s.project_id,oldrun.id,oldrun.input_snapshot,oldrun.input_fingerprint,oldrun.mode,oldrun.scenario,oldrun.status,p_request_id,oldrun.result,oldrun.errors,oldrun.warnings,oldrun.input_snapshot->'context'->>'description' is distinct from (select description from projects where id=s.project_id)) returning * into nr;
 insert into analysis_inputs select project_id,nr.id,document_version_id from analysis_inputs where run_id=oldrun.id;
 update analysis_runs set stale=true where id=nr.id and (oldrun.input_snapshot->'context'->>'name' is distinct from (select name from projects where id=s.project_id) or exists(select 1 from analysis_inputs ai join document_versions dv on dv.id=ai.document_version_id join documents d on d.id=dv.document_id where ai.run_id=nr.id and (d.current_version_id is distinct from dv.id or d.retired_at is not null or exists(select 1 from jsonb_array_elements(oldrun.input_snapshot->'document_versions') inp where inp->>'id'=dv.id::text and (inp->>'title' is distinct from d.title or inp->>'type' is distinct from d.type)))));
 for rec in select * from recommendations where run_id=oldrun.id loop
 newrec:=gen_random_uuid(); insert into recommendations(id,project_id,run_id,lineage_id,work_scope_key,payload) values(newrec,s.project_id,nr.id,rec.lineage_id,rec.work_scope_key,rec.payload||jsonb_build_object('id',newrec));
 insert into source_references(project_id,recommendation_id,document_version_id,exact_text,locator) select project_id,newrec,document_version_id,exact_text,locator from source_references where recommendation_id=rec.id;
 insert into reviews(project_id,recommendation_id,decision,reason,reviewer_id,locked) select s.project_id,newrec,decision,reason,auth.uid(),false from reviews where recommendation_id=rec.id; end loop;
 update analysis_runs set result=jsonb_set(jsonb_set(result,'{run_id}',to_jsonb(nr.id::text)),'{recommendations}',coalesce((select jsonb_agg(payload) from recommendations where run_id=nr.id),'[]')) where id=nr.id returning * into nr;
 perform gs_log(s.project_id,'analysis_runs',nr.id,'reopened',to_jsonb(s),to_jsonb(nr)); insert into operation_receipts values(s.project_id,p_request_id,'reopen',auth.uid(),to_jsonb(nr)); return to_jsonb(nr);
end $$;
create or replace function public.gs_begin_revision(p_decision_set_id uuid,p_source_version_id uuid,p_request_id text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare s decision_sets; r document_revisions; begin
 select * into s from decision_sets where id=p_decision_set_id; perform gs_require(s.project_id); perform 1 from projects where id=s.project_id for update;
 if length(trim(coalesce(p_request_id,'')))=0 then raise exception 'REQUEST_ID_REQUIRED'; end if;
 if not exists(select 1 from decision_items i cross join lateral jsonb_array_elements(i.snapshot->'sources') src where i.decision_set_id=s.id and i.decision='APPROVED' and src->>'document_version_id'=p_source_version_id::text) then raise exception 'SOURCE_NOT_APPROVED'; end if;
 if not exists(select 1 from document_versions where id=p_source_version_id and project_id=s.project_id and jsonb_array_length(extraction)>0 and upload_state='READY') then raise exception 'DEMO_SOURCE_UNSUPPORTED'; end if;
 select * into r from document_revisions where project_id=s.project_id and request_id=p_request_id and source_version_id=p_source_version_id for update;
 if r.id is not null then
 if r.decision_set_id<>s.id then raise exception 'REQUEST_ID_CONFLICT'; end if;
 if r.status in ('REQUESTED','GENERATING') and r.created_at<now()-interval '60 seconds' then update document_revisions set status='FAILED',unapplied='[{"reason":"Revision job timed out; regenerate with a new request."}]',row_version=row_version+1 where id=r.id returning * into r; end if;
 return to_jsonb(r); end if;
 insert into document_revisions(project_id,decision_set_id,request_id,source_version_id,status,mode) values(s.project_id,s.id,p_request_id,p_source_version_id,'REQUESTED',coalesce(s.summary_snapshot->>'generation_mode','simulated')) returning * into r;
 perform gs_log(s.project_id,'document_revisions',r.id,'revision_requested',null,to_jsonb(r)); return to_jsonb(r);
end $$;
create or replace function public.gs_init_options() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ declare parent uuid; oldrec recommendations; begin
 select parent_run_id into parent from analysis_runs where id=new.run_id;
 select * into oldrec from recommendations where run_id=parent and lineage_id=new.lineage_id and work_scope_key=new.work_scope_key and payload-'id'=new.payload-'id' limit 1;
 if oldrec.id is not null then
 insert into recommendation_options(project_id,recommendation_id,option_key,payload,default_wording) select new.project_id,new.id,option_key,payload||jsonb_build_object('id',new.id),default_wording from recommendation_options where recommendation_id=oldrec.id;
 end if;
 if (select mode from analysis_runs where id=new.run_id)='live' then return new;end if;
 insert into recommendation_options(project_id,recommendation_id,option_key,payload,default_wording) values(new.project_id,new.id,'A',new.payload,gs_default_wording(new.payload)) on conflict do nothing;
 return new;
end $$;
create function public.gs_set_extraction(p_id uuid,p_checksum text,p_extraction jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare v document_versions; begin
 select * into v from document_versions where id=p_id for update;
 if v.id is null or v.upload_state<>'READY' or v.checksum is distinct from p_checksum or jsonb_typeof(p_extraction)<>'array' or jsonb_array_length(p_extraction)=0 then raise exception 'OUTPUT_INVALID';end if;
 if jsonb_array_length(v.extraction)>0 then if v.extraction is distinct from p_extraction then raise exception 'OUTPUT_INVALID';end if;return to_jsonb(v);end if;
 if exists(select 1 from analysis_inputs where document_version_id=p_id) then raise exception 'JOB_ACTIVE';end if;
 update document_versions set extraction=p_extraction,row_version=row_version+1 where id=p_id returning * into v;return to_jsonb(v);
end $$;
revoke all on function public.gs_begin_live_analysis(uuid,text,text,uuid[],uuid,jsonb),public.gs_set_extraction(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.gs_begin_live_analysis(uuid,text,text,uuid[],uuid,jsonb) to authenticated;
grant execute on function public.gs_set_extraction(uuid,text,jsonb) to service_role;


-- READY file bytes and metadata remain immutable. Only first extraction may be
-- attached before any run references this exact version; API clients cannot UPDATE.
create or replace function public.gs_ready_version_immutable() returns trigger language plpgsql as $$ begin
 if old.upload_state='READY' then
  if tg_op='UPDATE' and jsonb_array_length(old.extraction)=0 and jsonb_typeof(new.extraction)='array' and jsonb_array_length(new.extraction)>0
   and (to_jsonb(old)-'extraction'-'row_version')=(to_jsonb(new)-'extraction'-'row_version')
   and new.row_version=old.row_version+1 and not exists(select 1 from public.analysis_inputs where document_version_id=old.id) then return new;end if;
  raise exception 'IMMUTABLE_SOURCE';
 end if;
 return new;
end $$;
