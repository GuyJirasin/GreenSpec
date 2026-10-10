-- Feature 1 choices are separate from the immutable analysis payload.
alter table public.reviews add column selected_option text not null default 'A' check(selected_option in ('A','B'));
alter table public.reviews add column draft_wording text check(draft_wording is null or (length(trim(draft_wording)) between 1 and 10000));
create table public.recommendation_options(
 id uuid primary key default gen_random_uuid(), project_id uuid not null,
 recommendation_id uuid not null, option_key text not null check(option_key in ('A','B')),
 payload jsonb not null, default_wording text not null check(length(trim(default_wording))>0),
 unique(recommendation_id,option_key),
 foreign key(recommendation_id,project_id) references public.recommendations(id,project_id));
alter table public.recommendation_options enable row level security;
create policy member_read on public.recommendation_options for select to authenticated using(gs_role(project_id) is not null);
grant select on public.recommendation_options to authenticated;
grant select,insert on public.recommendation_options to service_role;
revoke insert,update,delete on public.recommendation_options from anon,authenticated;
create trigger options_immutable before update or delete on public.recommendation_options for each row execute function public.gs_immutable();
create function public.gs_default_wording(p_payload jsonb) returns text language sql immutable as $$ select (p_payload->>'proposed_material')||' for '||coalesce(p_payload->'quantity'->>'value','the approved quantity')||' '||(p_payload->'quantity'->>'unit')||'.' $$;
create function public.gs_init_options() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ declare parent uuid; oldrec recommendations; begin
 select parent_run_id into parent from analysis_runs where id=new.run_id;
 select * into oldrec from recommendations where run_id=parent and lineage_id=new.lineage_id and work_scope_key=new.work_scope_key and payload-'id'=new.payload-'id' limit 1;
 if oldrec.id is not null then
 insert into recommendation_options(project_id,recommendation_id,option_key,payload,default_wording) select new.project_id,new.id,option_key,payload||jsonb_build_object('id',new.id),default_wording from recommendation_options where recommendation_id=oldrec.id;
 end if;
 insert into recommendation_options(project_id,recommendation_id,option_key,payload,default_wording) values(new.project_id,new.id,'A',new.payload,gs_default_wording(new.payload)) on conflict do nothing;
 return new;
end $$;
create trigger initialize_options after insert on public.recommendations for each row execute function public.gs_init_options();
insert into recommendation_options(project_id,recommendation_id,option_key,payload,default_wording) select project_id,id,'A',payload,gs_default_wording(payload) from recommendations;
create function public.gs_carry_review_choice() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ declare c recommendations; parent uuid; oldv reviews; begin
 select * into c from recommendations where id=new.recommendation_id; select parent_run_id into parent from analysis_runs where id=c.run_id;
 select v.* into oldv from recommendations o join reviews v on v.recommendation_id=o.id where o.run_id=parent and o.lineage_id=c.lineage_id and o.work_scope_key=c.work_scope_key and o.payload-'id'=c.payload-'id' limit 1;
 if oldv.id is not null and exists(select 1 from recommendation_options where recommendation_id=c.id and option_key=oldv.selected_option) then new.selected_option:=oldv.selected_option;new.draft_wording:=oldv.draft_wording;end if;return new;
end $$;
create trigger carry_review_choice before insert on public.reviews for each row execute function public.gs_carry_review_choice();
create function public.gs_review_payload(p_recommendation uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(o.payload,c.payload)||jsonb_build_object('selected_option',v.selected_option,'final_wording',coalesce(v.draft_wording,o.default_wording,gs_default_wording(c.payload)),'wording_edited',v.draft_wording is not null,'estimate_note',case when v.draft_wording is not null then 'User wording has not been used to recalculate the estimates.' else null end) from recommendations c join reviews v on v.recommendation_id=c.id left join recommendation_options o on o.recommendation_id=c.id and o.option_key=v.selected_option where c.id=p_recommendation
$$;
create function public.gs_review_change(p_review_id uuid,p_expected_version integer,p_selected_option text,p_draft_wording text,p_request_id text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare v reviews; c recommendations; r analysis_runs; receipt jsonb; wording text; before_data jsonb; begin
 select * into v from reviews where id=p_review_id;perform gs_require(v.project_id);perform 1 from projects where id=v.project_id for update;
 if length(trim(coalesce(p_request_id,'')))=0 then raise exception 'REQUEST_ID_REQUIRED';end if;
 select result into receipt from operation_receipts where project_id=v.project_id and operation='review_change' and request_id=p_request_id;if receipt is not null then return receipt;end if;
 select * into v from reviews where id=p_review_id for update;if v.row_version is distinct from p_expected_version then raise exception 'VERSION_CONFLICT' using detail=to_jsonb(v)::text;end if;
 select * into c from recommendations where id=v.recommendation_id;select * into r from analysis_runs where id=c.run_id;
 if r.finalized or exists(select 1 from analysis_runs where parent_run_id=r.id and status in ('QUEUED','PROCESSING')) then raise exception 'REVIEW_FROZEN';end if;
 if v.locked then raise exception 'REVIEW_LOCKED';end if;
 if p_selected_option is null or not exists(select 1 from recommendation_options where recommendation_id=c.id and option_key=p_selected_option) then raise exception 'OPTION_UNAVAILABLE';end if;
 wording:=case when p_draft_wording is null then null else trim(p_draft_wording) end;
 if wording is not null and (length(wording)=0 or length(wording)>10000) then raise exception 'WORDING_INVALID';end if;
 before_data:=to_jsonb(v);
 if v.selected_option is distinct from p_selected_option or v.draft_wording is distinct from wording then
 update reviews set selected_option=p_selected_option,draft_wording=wording,decision='UNREVIEWED',reason='',reviewer_id=auth.uid(),row_version=row_version+1 where id=v.id returning * into v;
 update analysis_runs set review_epoch=review_epoch+1 where id=r.id;
 perform gs_log(v.project_id,'reviews',v.id,'choice_changed',before_data,to_jsonb(v));end if;
 receipt:=to_jsonb(v);insert into operation_receipts values(v.project_id,p_request_id,'review_change',auth.uid(),receipt);return receipt;
end $$;
-- Prevent changing locked decisions through the generic review endpoint. Unlock first.
create function public.gs_review_lock_guard() returns trigger language plpgsql as $$ begin
 if old.locked and (new.decision is distinct from old.decision or new.reason is distinct from old.reason or new.selected_option is distinct from old.selected_option or new.draft_wording is distinct from old.draft_wording) then raise exception 'REVIEW_LOCKED';end if;return new;
end $$;
create trigger review_lock_guard before update on public.reviews for each row execute function public.gs_review_lock_guard();
alter function public.gs_finish_analysis(uuid,jsonb) rename to gs_finish_analysis_legacy;
create function public.gs_finish_analysis(p_run_id uuid,p_result jsonb,p_options jsonb default '[]') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare result jsonb; c recommendations; opt jsonb; begin
 result:=gs_finish_analysis_legacy(p_run_id,p_result);
 if exists(select 1 from analysis_runs where id=p_run_id and finalized) then return result;end if;
 for c in select * from recommendations where run_id=p_run_id loop
 for opt in select value from jsonb_array_elements(p_options) where value->'payload'->>'lineage_id'=c.lineage_id and value->'payload'->>'work_scope_key'=c.work_scope_key loop
 if opt->>'option_key' not in ('A','B') or opt->'payload'->'sources' is distinct from c.payload->'sources' or opt->'payload'->'quantity' is distinct from c.payload->'quantity' then raise exception 'OUTPUT_INVALID';end if;
 insert into recommendation_options(project_id,recommendation_id,option_key,payload,default_wording) values(c.project_id,c.id,opt->>'option_key',(opt->'payload')||jsonb_build_object('id',c.id),opt->>'default_wording') on conflict do nothing;
 end loop;end loop;return result;
end $$;
revoke all on function public.gs_default_wording(jsonb),public.gs_init_options(),public.gs_carry_review_choice(),public.gs_review_payload(uuid),public.gs_review_lock_guard(),public.gs_finish_analysis_legacy(uuid,jsonb),public.gs_finish_analysis(uuid,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.gs_review_change(uuid,integer,text,text,text) from public,anon;
grant execute on function public.gs_review_change(uuid,integer,text,text,text) to authenticated;
grant execute on function public.gs_finish_analysis(uuid,jsonb,jsonb) to service_role;

create function public.gs_snapshot_compare(p jsonb) returns jsonb language sql immutable as $$ select case when coalesce((p->>'wording_edited')::boolean,false)=false and coalesce(p->>'selected_option','A')='A' then p-'id'-'review_reason'-'fixture_scenario_id'-'selected_option'-'final_wording'-'wording_edited'-'estimate_note' else p-'id'-'review_reason'-'fixture_scenario_id'-'estimate_note' end $$;
revoke all on function public.gs_snapshot_compare(jsonb) from public,anon,authenticated;
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
 select jsonb_build_object('generation_mode','simulated','approved',count(*) filter(where v.decision='APPROVED'),'rejected',count(*) filter(where v.decision='REJECTED'),'total',count(*),'cost_saving_thb',sum((gs_review_payload(c.id)->'impacts'->>'cost_saving_thb')::numeric) filter(where v.decision='APPROVED'),'carbon_reduction_tco2e',sum((gs_review_payload(c.id)->'impacts'->>'carbon_reduction_tco2e')::numeric) filter(where v.decision='APPROVED'),'cost_known',count(*) filter(where v.decision='APPROVED' and gs_review_payload(c.id)->'impacts'->>'cost_saving_thb' is not null),'carbon_known',count(*) filter(where v.decision='APPROVED' and gs_review_payload(c.id)->'impacts'->>'carbon_reduction_tco2e' is not null),'omission_reason',p_omission_reason,'source_omissions',case when p_omit_errors then r.errors else '[]'::jsonb end,'warnings',r.warnings) into summary from recommendations c join reviews v on v.recommendation_id=c.id where c.run_id=p_run_id;
 insert into decision_sets(project_id,run_id,version_no,finalized_by,summary_snapshot) values(r.project_id,r.id,(select coalesce(max(version_no),0)+1 from decision_sets where project_id=r.project_id),auth.uid(),summary) returning * into s;
 insert into decision_items(project_id,decision_set_id,recommendation_id,decision,snapshot,lineage_id,work_scope_key) select r.project_id,s.id,c.id,v.decision,gs_review_payload(c.id)||jsonb_build_object('generation_mode','simulated','fixture_scenario_id',r.scenario,'review_reason',v.reason),c.lineage_id,c.work_scope_key from recommendations c join reviews v on v.recommendation_id=c.id where c.run_id=r.id;
 update analysis_runs set finalized=true where id=r.id;
 update document_revisions dr set outdated=true where dr.project_id=r.project_id and dr.decision_set_id<>s.id and (
 exists(select 1 from decision_items ni where ni.decision_set_id=s.id and ni.decision='APPROVED' and not exists(select 1 from decision_items oi where oi.decision_set_id=dr.decision_set_id and oi.decision='APPROVED' and gs_snapshot_compare(oi.snapshot)=gs_snapshot_compare(ni.snapshot)))
 or exists(select 1 from decision_items oi where oi.decision_set_id=dr.decision_set_id and oi.decision='APPROVED' and not exists(select 1 from decision_items ni where ni.decision_set_id=s.id and ni.decision='APPROVED' and gs_snapshot_compare(oi.snapshot)=gs_snapshot_compare(ni.snapshot))));
 perform gs_log(r.project_id,'decision_sets',s.id,'finalized',null,to_jsonb(s)); insert into operation_receipts values(r.project_id,p_request_id,'finalize',auth.uid(),to_jsonb(s)); return to_jsonb(s);
end $$;
create or replace function public.gs_handoff(p_decision_set_id uuid,p_item_ids uuid[],p_request_id text,p_replace_reason text default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare s decision_sets; item decision_items; oldp packages; np packages; receipt jsonb; outp jsonb:='[]'; blocked boolean:=false; begin
 select * into s from decision_sets where id=p_decision_set_id; perform gs_require(s.project_id); perform 1 from projects where id=s.project_id for update;
 select result into receipt from operation_receipts where project_id=s.project_id and request_id=p_request_id and operation='handoff'; if receipt is not null then return receipt; end if;
 if exists(select 1 from unnest(p_item_ids) x where not exists(select 1 from decision_items where id=x and decision_set_id=s.id and decision='APPROVED')) then raise exception 'HANDOFF_APPROVED_ONLY'; end if;
 -- Preflight every item; changed started package issues are committed as an explicit blocked result.
 for item in select * from decision_items where id=any(p_item_ids) loop
 if exists(select 1 from packages where origin_decision_item_id=item.id) then continue; end if;
 select * into oldp from packages where project_id=s.project_id and scope_key=item.work_scope_key and superseded_at is null for update;
 if oldp.id is not null and gs_snapshot_compare(oldp.snapshot)<>gs_snapshot_compare(item.snapshot) then
 if gs_package_started(oldp.id) then blocked:=true; if not exists(select 1 from issues where package_id=oldp.id and requires_feature1_review and status<>'RESOLVED') then
 insert into issues(project_id,package_id,title,description,severity,blocks_verification,owner_id,requires_feature1_review) values(s.project_id,oldp.id,'Changed finalized decision requires review','New decisions differ from started execution; explicit replacement is blocked.','high',true,oldp.owner_id,true);
 perform gs_refresh_package(oldp.id); perform gs_evaluate_notifications(s.project_id); perform gs_log(s.project_id,'packages',oldp.id,'handoff_blocked',to_jsonb(oldp),to_jsonb(item)); end if;
 elsif length(trim(coalesce(p_replace_reason,'')))=0 then raise exception 'REPLACEMENT_REASON_REQUIRED'; end if; end if;
 end loop;
 if blocked then return jsonb_build_object('code','EXECUTION_STARTED','message','Changed items require Feature 1 review; no packages created','retryable',false,'packages','[]'::jsonb); end if;
 for item in select * from decision_items where id=any(p_item_ids) loop
 select * into oldp from packages where origin_decision_item_id=item.id;
 if oldp.id is not null then outp:=outp||jsonb_build_array(to_jsonb(oldp)); continue; end if;
 select * into oldp from packages where project_id=s.project_id and scope_key=item.work_scope_key and superseded_at is null;
 if oldp.id is not null and gs_snapshot_compare(oldp.snapshot)=gs_snapshot_compare(item.snapshot) then outp:=outp||jsonb_build_array(to_jsonb(oldp)); continue; end if;
 if oldp.id is not null then update packages set superseded_at=now(),execution_status='SUPERSEDED',row_version=row_version+1 where id=oldp.id; perform gs_log(s.project_id,'packages',oldp.id,'superseded',to_jsonb(oldp),jsonb_build_object('reason',p_replace_reason)); end if;
 insert into packages(project_id,origin_decision_item_id,lineage_id,scope_key,snapshot,owner_id) values(s.project_id,item.id,item.lineage_id,item.work_scope_key,item.snapshot,auth.uid()) returning * into np;
 perform gs_log(s.project_id,'packages',np.id,'handed_off',null,to_jsonb(np)); outp:=outp||jsonb_build_array(to_jsonb(np)); end loop;
 receipt:=jsonb_build_object('packages',outp); insert into operation_receipts values(s.project_id,p_request_id,'handoff',auth.uid(),receipt); return receipt;
end $$;
create or replace function public.gs_decision_equivalent(p_left uuid,p_right uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select not exists(select 1 from decision_items l where l.decision_set_id=p_left and l.decision='APPROVED' and not exists(select 1 from decision_items r where r.decision_set_id=p_right and r.decision='APPROVED' and gs_snapshot_compare(l.snapshot)=gs_snapshot_compare(r.snapshot)))
 and not exists(select 1 from decision_items r where r.decision_set_id=p_right and r.decision='APPROVED' and not exists(select 1 from decision_items l where l.decision_set_id=p_left and l.decision='APPROVED' and gs_snapshot_compare(l.snapshot)=gs_snapshot_compare(r.snapshot)))
$$;

revoke all on function public.gs_finish_analysis_legacy(uuid,jsonb) from service_role;


