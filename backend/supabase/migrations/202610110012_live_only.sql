-- Disable all creation paths for example results without deleting historical records.
alter table public.analysis_runs alter column mode set default 'live';
revoke all on function public.gs_begin_analysis(uuid,text,text,uuid[],uuid,jsonb) from public,anon,authenticated,service_role;

create function public.gs_live_run_only() returns trigger language plpgsql as $$ begin
 if new.mode<>'live' then raise exception 'LIVE_ANALYSIS_REQUIRED';end if;
 return new;
end $$;
create trigger live_run_only before insert on public.analysis_runs for each row execute function public.gs_live_run_only();

create function public.gs_uploaded_source_only() returns trigger language plpgsql as $$ begin
 if new.fixture_id is not null or new.provenance='fixture' then
  if tg_op='INSERT' then raise exception 'LIVE_SOURCE_REQUIRED';end if;
  if new.fixture_id is distinct from old.fixture_id or new.provenance is distinct from old.provenance then raise exception 'LIVE_SOURCE_REQUIRED';end if;
 end if;
 return new;
end $$;
create trigger uploaded_source_only before insert or update on public.document_versions for each row execute function public.gs_uploaded_source_only();

create function public.gs_live_input_only() returns trigger language plpgsql as $$ begin
 if not exists(select 1 from public.analysis_runs r join public.document_versions v on v.id=new.document_version_id
  where r.id=new.run_id and r.mode='live' and v.project_id=r.project_id and v.upload_state='READY' and v.fixture_id is null and v.provenance<>'fixture')
 then raise exception 'LIVE_SOURCE_REQUIRED';end if;
 return new;
end $$;
create trigger live_input_only before insert on public.analysis_inputs for each row execute function public.gs_live_input_only();

create function public.gs_live_recommendation_only() returns trigger language plpgsql as $$ begin
 if not exists(select 1 from public.analysis_runs where id=new.run_id and mode='live') then raise exception 'LIVE_ANALYSIS_REQUIRED';end if;
 return new;
end $$;
create trigger live_recommendation_only before insert on public.recommendations for each row execute function public.gs_live_recommendation_only();

create function public.gs_live_snapshot_only() returns trigger language plpgsql as $$ begin
 if tg_table_name='decision_sets' then
  if new.summary_snapshot->>'generation_mode' is distinct from 'live' then raise exception 'LIVE_ANALYSIS_REQUIRED';end if;
 elsif new.snapshot->>'generation_mode' is distinct from 'live' then raise exception 'LIVE_ANALYSIS_REQUIRED';end if;
 return new;
end $$;
create trigger live_decision_only before insert on public.decision_sets for each row execute function public.gs_live_snapshot_only();
create trigger live_package_only before insert on public.packages for each row execute function public.gs_live_snapshot_only();

create function public.gs_recorded_actual_only() returns trigger language plpgsql as $$ begin
 if new.provenance is distinct from 'recorded' then raise exception 'RECORDED_EVIDENCE_REQUIRED';end if;
 return new;
end $$;
create trigger recorded_actual_only before insert or update on public.actual_results for each row execute function public.gs_recorded_actual_only();

-- No synthetic options are initialized. A/B must arrive from a validated live result;
-- unchanged locked choices are the only options copied from a parent round.
create or replace function public.gs_init_options() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ declare parent uuid; oldrec recommendations;begin
 select parent_run_id into parent from analysis_runs where id=new.run_id;
 if parent is not null then
  select * into oldrec from recommendations where run_id=parent and lineage_id=new.lineage_id and work_scope_key=new.work_scope_key limit 1;
  if oldrec.id is not null and oldrec.payload-'id'=new.payload-'id' and (exists(select 1 from reviews where recommendation_id=oldrec.id and locked and decision='APPROVED') or exists(select 1 from analysis_runs where id=parent and finalized)) then
   insert into recommendation_options(project_id,recommendation_id,option_key,payload,default_wording)
    select new.project_id,new.id,option_key,payload||jsonb_build_object('id',new.id),default_wording from recommendation_options where recommendation_id=oldrec.id;
  end if;
 end if;
 return new;
end $$;

-- Keep persistence atomic and validate the live envelope/options even when called
-- directly by a service worker. The existing function remains responsible for RLS,
-- source checks, run state and immutable option insertion.
alter function public.gs_finish_analysis(uuid,jsonb,jsonb) rename to gs_finish_analysis_live_persist;
revoke all on function public.gs_finish_analysis_live_persist(uuid,jsonb,jsonb) from public,anon,authenticated,service_role;
create function public.gs_finish_analysis(p_run_id uuid,p_result jsonb,p_options jsonb default '[]') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare r analysis_runs; rec jsonb; opt jsonb;begin
 select * into r from analysis_runs where id=p_run_id for update;
 if r.id is null then raise exception 'JOB_NOT_FOUND';end if;
 if r.mode<>'live' or p_result->>'generation_mode' is distinct from 'live' or p_result->>'run_id' is distinct from p_run_id::text or p_result->>'input_fingerprint' is distinct from r.input_fingerprint then raise exception 'OUTPUT_INVALID';end if;
 for rec in select value from jsonb_array_elements(p_result->'recommendations') loop
  if not exists(select 1 from jsonb_array_elements(p_options) o where o->>'option_key'='A' and (o->'payload')-'id'=rec-'id') then raise exception 'OUTPUT_INVALID';end if;
 end loop;
 for opt in select value from jsonb_array_elements(p_options) loop
  if not exists(select 1 from jsonb_array_elements(p_result->'recommendations') c where c->>'lineage_id'=opt->'payload'->>'lineage_id' and c->>'work_scope_key'=opt->'payload'->>'work_scope_key'
    and c->'impacts'->'baseline_cost_thb' is not distinct from opt->'payload'->'impacts'->'baseline_cost_thb'
    and c->'impacts'->'baseline_carbon_tco2e' is not distinct from opt->'payload'->'impacts'->'baseline_carbon_tco2e') then raise exception 'OUTPUT_INVALID';end if;
 end loop;
 return gs_finish_analysis_live_persist(p_run_id,p_result,p_options);
end $$;
revoke all on function public.gs_finish_analysis(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.gs_finish_analysis(uuid,jsonb,jsonb) to service_role;

-- Reopening preserves the selected live option and approved edited wording.
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
 insert into reviews(project_id,recommendation_id,decision,reason,reviewer_id,locked,selected_option,draft_wording) select s.project_id,newrec,decision,reason,auth.uid(),false,selected_option,draft_wording from reviews where recommendation_id=rec.id; end loop;
 update analysis_runs set result=jsonb_set(jsonb_set(result,'{run_id}',to_jsonb(nr.id::text)),'{recommendations}',coalesce((select jsonb_agg(payload) from recommendations where run_id=nr.id),'[]')) where id=nr.id returning * into nr;
 perform gs_log(s.project_id,'analysis_runs',nr.id,'reopened',to_jsonb(s),to_jsonb(nr)); insert into operation_receipts values(s.project_id,p_request_id,'reopen',auth.uid(),to_jsonb(nr)); return to_jsonb(nr);
end $$;

create function public.gs_live_revision_only() returns trigger language plpgsql as $$ begin
 if new.mode<>'live' then raise exception 'LIVE_ANALYSIS_REQUIRED';end if;return new;
end $$;
create trigger live_revision_only before insert on public.document_revisions for each row execute function public.gs_live_revision_only();
