create function public.gs_create_project(p_name text,p_description text default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare p projects; begin
 if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
 insert into projects(name,description,created_by) values(p_name,p_description,auth.uid()) returning * into p;
 insert into project_members values(p.id,auth.uid(),'owner');
 perform gs_log(p.id,'projects',p.id,'created',null,to_jsonb(p)); return to_jsonb(p);
end $$;
create function public.gs_member(p_project_id uuid,p_email text,p_role text,p_remove boolean default false) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare u uuid; oldrole text; begin
 perform gs_require(p_project_id,true); perform 1 from projects where id=p_project_id for update;
 select id into u from auth.users where lower(email)=lower(trim(p_email)); if u is null then raise exception 'USER_NOT_REGISTERED'; end if;
 if p_role not in ('owner','editor','viewer') then raise exception 'INPUT_INCOMPLETE'; end if;
 select role into oldrole from project_members where project_id=p_project_id and user_id=u;
 if oldrole='owner' and (p_remove or p_role<>'owner') and (select count(*) from project_members where project_id=p_project_id and role='owner')<=1 then raise exception 'LAST_OWNER'; end if;
 if p_remove then delete from project_members where project_id=p_project_id and user_id=u;
 else insert into project_members values(p_project_id,u,p_role) on conflict(project_id,user_id) do update set role=excluded.role; end if;
 perform gs_log(p_project_id,'members',u,'membership_changed',jsonb_build_object('role',oldrole),jsonb_build_object('role',p_role,'removed',p_remove));
 return jsonb_build_object('user_id',u,'role',p_role,'removed',p_remove);
end $$;
create function public.gs_archive(p_project_id uuid,p_archived boolean,p_expected_version integer) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare p projects; begin
 if coalesce(gs_role(p_project_id),'')<>'owner' or auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
 select * into p from projects where id=p_project_id for update; if p.row_version is distinct from p_expected_version then raise exception 'VERSION_CONFLICT' using detail=to_jsonb(p)::text; end if;
 if exists(select 1 from analysis_runs where project_id=p_project_id and status in ('QUEUED','PROCESSING')) then raise exception 'JOB_ACTIVE'; end if;
 update projects set archived_at=case when p_archived then now() else null end,row_version=row_version+1,updated_at=now() where id=p_project_id returning * into p;
 perform gs_log(p_project_id,'projects',p_project_id,'archive_changed',null,to_jsonb(p)); return to_jsonb(p);
end $$;
create function public.gs_refresh_package(p_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$ declare p packages; q numeric; d numeric; i numeric; v text; newstatus text; begin
 select * into p from packages where id=p_id for update; if p.superseded_at is not null then return; end if;
 q:=(p.snapshot->'quantity'->>'value')::numeric;
 select coalesce(sum(quantity) filter(where kind='delivery'),0),coalesce(sum(quantity) filter(where kind='install'),0) into d,i from implementation_entries e where package_id=p_id and not exists(select 1 from implementation_entries c where c.corrects_id=e.id);
 select result into v from verifications where package_id=p_id order by verified_at desc,id desc limit 1;
 newstatus:=case when q is not null and i>=q and v='PASS' and not exists(select 1 from issues where package_id=p_id and blocks_verification and status<>'RESOLVED') then 'COMPLETE' when q is not null and i>=q then 'INSTALLED' when q is not null and d>=q then 'DELIVERED' when exists(select 1 from procurements where package_id=p_id and status<>'APPROVED') then 'PROCUREMENT' else 'APPROVED' end;
 if newstatus<>p.execution_status or coalesce(v,'PENDING')<>p.verification_status then
 update packages set execution_status=newstatus,verification_status=coalesce(v,'PENDING'),row_version=row_version+1 where id=p_id;
 perform gs_log(p.project_id,'packages',p_id,'execution_derived',jsonb_build_object('execution_status',p.execution_status,'verification_status',p.verification_status),jsonb_build_object('execution_status',newstatus,'verification_status',coalesce(v,'PENDING'))); end if;
end $$;
create function public.gs_mutate(p_project_id uuid,p_kind text,p_id uuid,p_expected_version integer,p_data jsonb,p_request_id text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare allowed text[]; before_data jsonb; after_data jsonb; receipt jsonb; data jsonb; keys text; vals text; setters text; k text; v_id uuid:=coalesce(p_id,gen_random_uuid()); pkg uuid; total numeric; delivered numeric; installed numeric; required numeric; unit_expected text; parent_record jsonb; runid uuid;
begin
 perform gs_require(p_project_id); perform 1 from projects where id=p_project_id for update;
 if p_request_id is null or length(p_request_id)<1 then raise exception 'REQUEST_ID_REQUIRED'; end if;
 select result into receipt from operation_receipts where project_id=p_project_id and request_id=p_request_id and operation='mutate:'||p_kind;
 if receipt is not null then return receipt; end if;
 allowed:=case p_kind
 when 'projects' then array['name','description'] when 'documents' then array['title','type','retired_at']
 when 'reviews' then array['decision','reason','locked'] when 'feedback' then array['run_id','recommendation_id','text']
 when 'packages' then array['owner_id'] when 'tasks' then array['package_id','title','assignee_id','due_at','status','priority']
 when 'milestones' then array['package_id','title','assignee_id','due_at','status','priority']
 when 'procurements' then array['package_id','supplier_name','po_reference','ordered_qty','unit','variance_reason','expected_delivery_at','status']
 when 'implementation_entries' then array['package_id','kind','quantity','unit','occurred_at','notes','corrects_id']
 when 'issues' then array['package_id','title','description','severity','blocks_verification','owner_id','status','resolution','requires_feature1_review']
 when 'actual_results' then array['package_id','metric','total_value','unit','source_description','methodology','provenance','evidence_id']
 when 'comments' then array['target_kind','target_id','text'] else null end;
 if allowed is null then raise exception 'UNSUPPORTED_OPERATION'; end if;
 if exists(select 1 from jsonb_object_keys(p_data) x where not x=any(allowed)) then raise exception 'FIELD_NOT_MUTABLE'; end if;
 if p_id is not null then execute format('select to_jsonb(t) from public.%I t where id=$1 and %s for update',p_kind,case when p_kind='projects' then 'id=$2' else 'project_id=$2' end) into before_data using v_id,p_project_id;
 if before_data is null then raise exception 'UNAUTHORIZED'; end if;
 if (before_data->>'row_version')::integer is distinct from p_expected_version then raise exception 'VERSION_CONFLICT' using detail=before_data::text; end if;
 else if p_kind in ('projects','reviews','packages') then raise exception 'USE_DOMAIN_OPERATION'; end if; end if;
 data:=coalesce(before_data,'{}')||p_data;
 pkg:=(data->>'package_id')::uuid;
 if pkg is not null then select to_jsonb(p) into parent_record from packages p where p.id=pkg and p.project_id=p_project_id and p.superseded_at is null for update; if parent_record is null then raise exception 'UNAUTHORIZED'; end if; end if;
 if data->>'assignee_id' is not null and coalesce(gs_member_role(p_project_id,(data->>'assignee_id')::uuid),'') not in ('owner','editor') then raise exception 'ASSIGNEE_NOT_EDITOR'; end if;
 if data->>'owner_id' is not null and coalesce(gs_member_role(p_project_id,(data->>'owner_id')::uuid),'') not in ('owner','editor') then raise exception 'OWNER_NOT_EDITOR'; end if;
 if p_kind='projects' and exists(select 1 from analysis_runs where project_id=p_project_id and status in ('QUEUED','PROCESSING')) then raise exception 'JOB_ACTIVE'; end if;
 if p_kind='documents' and exists(select 1 from analysis_inputs ai join analysis_runs r on r.id=ai.run_id join document_versions dv on dv.id=ai.document_version_id where dv.document_id=v_id and r.status in ('QUEUED','PROCESSING')) then raise exception 'JOB_ACTIVE'; end if;
 if p_kind='reviews' then
 select r.run_id into runid from recommendations r where r.id=(data->>'recommendation_id')::uuid and r.project_id=p_project_id;
 if exists(select 1 from analysis_runs where id=runid and finalized) or exists(select 1 from analysis_runs where parent_run_id=runid and status in ('QUEUED','PROCESSING')) then raise exception 'REVIEW_FROZEN'; end if;
 if coalesce((data->>'locked')::boolean,false) and data->>'decision'<>'APPROVED' then raise exception 'LOCK_REQUIRES_APPROVAL'; end if;
 p_data:=p_data||jsonb_build_object('reviewer_id',auth.uid()); update analysis_runs set review_epoch=review_epoch+1 where id=runid;
 end if;
 if p_kind in ('tasks','milestones') then p_data:=p_data||jsonb_build_object('completed_at',case when data->>'status'='DONE' then now() else null end); end if;
 if p_kind='issues' then if data->>'status'='RESOLVED' and length(trim(coalesce(data->>'resolution','')))=0 then raise exception 'RESOLUTION_REQUIRED'; end if; if data->>'severity'='critical' then p_data:=p_data||'{"blocks_verification":true}'; end if; end if;
 if p_kind='procurements' then
 if data->>'status'<>'APPROVED' and (parent_record->>'owner_id' is null or coalesce((data->>'ordered_qty')::numeric,0)<=0) then raise exception 'PROCUREMENT_OWNER_QUANTITY_REQUIRED'; end if;
 if (data->>'unit') is distinct from parent_record->'snapshot'->'quantity'->>'unit' then raise exception 'UNIT_MISMATCH'; end if;
 if (data->>'ordered_qty')::numeric is distinct from (parent_record->'snapshot'->'quantity'->>'value')::numeric and length(trim(coalesce(data->>'variance_reason','')))=0 then raise exception 'VARIANCE_REASON_REQUIRED'; end if;
 if data->>'status' in ('SUPPLIER_SELECTED','PO_ISSUED','SHIPPING','DELIVERED','ACCEPTED') and length(trim(coalesce(data->>'supplier_name','')))=0 then raise exception 'SUPPLIER_REQUIRED'; end if;
 if data->>'status' in ('PO_ISSUED','SHIPPING','DELIVERED','ACCEPTED') and length(trim(coalesce(data->>'po_reference','')))=0 then raise exception 'PO_REQUIRED'; end if;
 if data->>'status' in ('SHIPPING','DELIVERED','ACCEPTED') and data->>'expected_delivery_at' is null then raise exception 'DELIVERY_DATE_REQUIRED'; end if;
 select coalesce(sum(quantity),0) into delivered from implementation_entries e where package_id=pkg and kind='delivery' and not exists(select 1 from implementation_entries c where c.corrects_id=e.id);
 if data->>'status' in ('DELIVERED','ACCEPTED') and delivered<coalesce((data->>'ordered_qty')::numeric,1e99) then raise exception 'DELIVERY_INCOMPLETE'; end if;
 if data->>'status'='ACCEPTED' then p_data:=p_data||jsonb_build_object('accepted_at',now(),'accepted_by',auth.uid()); end if;
 end if;
 if p_kind='implementation_entries' then
 if p_id is not null then raise exception 'APPEND_CORRECTION_REQUIRED'; end if;
 unit_expected:=parent_record->'snapshot'->'quantity'->>'unit'; required:=(parent_record->'snapshot'->'quantity'->>'value')::numeric;
 if data->>'unit'<>unit_expected then raise exception 'UNIT_MISMATCH'; end if;
 if data->>'corrects_id' is not null and not exists(select 1 from implementation_entries where id=(data->>'corrects_id')::uuid and package_id=pkg and kind=data->>'kind') then raise exception 'CORRECTION_TARGET_INVALID'; end if;
 if data->>'corrects_id' is not null and length(trim(coalesce(data->>'notes','')))=0 then raise exception 'CORRECTION_REASON_REQUIRED'; end if;
 select coalesce(sum(quantity) filter(where kind='delivery'),0),coalesce(sum(quantity) filter(where kind='install'),0) into delivered,installed from implementation_entries e where package_id=pkg and not exists(select 1 from implementation_entries c where c.corrects_id=e.id) and (data->>'corrects_id' is null or e.id<>(data->>'corrects_id')::uuid);
 if data->>'kind'='install' then installed:=installed+(data->>'quantity')::numeric; else delivered:=delivered+(data->>'quantity')::numeric; end if;
 if installed>delivered then raise exception 'INSTALLATION_EXCEEDS_DELIVERY'; end if;
 if delivered>required and length(trim(coalesce(data->>'notes','')))=0 then raise exception 'OVERDELIVERY_REASON_REQUIRED'; end if;
 end if;
 if p_kind='actual_results' then
 if length(trim(coalesce(data->>'source_description','')))=0 or length(trim(coalesce(data->>'methodology','')))=0 then raise exception 'ACTUAL_METHOD_SOURCE_REQUIRED'; end if;
 if data->>'evidence_id' is not null and not exists(select 1 from evidence_files where id=(data->>'evidence_id')::uuid and package_id=pkg and upload_state='READY') then raise exception 'EVIDENCE_INVALID'; end if;
 end if;
 if p_kind='comments' then
 if data->>'target_kind' not in ('packages','tasks','issues','verifications') then raise exception 'COMMENT_TARGET_INVALID'; end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1 and project_id=$2',data->>'target_kind') into parent_record using (data->>'target_id')::uuid,p_project_id; if parent_record is null then raise exception 'UNAUTHORIZED'; end if;
 end if;
 if p_kind='feedback' and data->>'recommendation_id' is not null and not exists(select 1 from recommendations where id=(data->>'recommendation_id')::uuid and run_id=(data->>'run_id')::uuid) then raise exception 'FEEDBACK_TARGET_INVALID'; end if;
 if p_id is null then
 p_data:=p_data||jsonb_build_object('id',v_id,'project_id',p_project_id);
 if p_kind='feedback' then p_data:=p_data||jsonb_build_object('author_id',auth.uid()); end if;
 if p_kind in ('comments','implementation_entries') then p_data:=p_data||jsonb_build_object('actor_id',auth.uid()); end if;
 if p_kind='actual_results' then p_data:=p_data||jsonb_build_object('recorded_by',auth.uid()); end if;
 select string_agg(format('%I',key),','),string_agg(format('(jsonb_populate_record(null::public.%I,$1)).%I',p_kind,key),',') into keys,vals from jsonb_object_keys(p_data) key;
 execute format('insert into public.%I (%s) select %s returning to_jsonb(%I.*)',p_kind,keys,vals,p_kind) into after_data using p_data;
 else
 select string_agg(format('%I=(jsonb_populate_record(null::public.%I,$1)).%I',key,p_kind,key),',') into setters from jsonb_object_keys(p_data) key;
 if setters is null then raise exception 'EMPTY_MUTATION'; end if;
 execute format('update public.%I set %s,row_version=row_version+1 where id=$2 returning to_jsonb(%I.*)',p_kind,setters,p_kind) into after_data using p_data,v_id;
 end if;
 if p_kind='projects' and (before_data->>'name' is distinct from after_data->>'name' or before_data->>'description' is distinct from after_data->>'description') then update analysis_runs set stale=true where project_id=p_project_id and not finalized and status in ('COMPLETED','PARTIAL'); end if;
 if p_kind='documents' and before_data is not null and (before_data->>'title' is distinct from after_data->>'title' or before_data->>'type' is distinct from after_data->>'type' or before_data->>'retired_at' is distinct from after_data->>'retired_at') then update analysis_runs set stale=true where project_id=p_project_id and not finalized and status in ('COMPLETED','PARTIAL') and exists(select 1 from analysis_inputs ai join document_versions dv on dv.id=ai.document_version_id where ai.run_id=analysis_runs.id and dv.document_id=v_id); end if;
 if pkg is not null then perform gs_refresh_package(pkg); end if;
 perform gs_log(p_project_id,p_kind,v_id,case when p_id is null then 'created' else 'updated' end,before_data,after_data);
 insert into operation_receipts values(p_project_id,p_request_id,'mutate:'||p_kind,auth.uid(),after_data);
 perform gs_evaluate_notifications(p_project_id); return after_data;
end $$;
create function public.gs_member_role(p_project uuid,p_user uuid) returns text language sql stable security definer set search_path=public,pg_temp as $$ select role from project_members where project_id=p_project and user_id=p_user $$;
create function public.gs_finalize(p_run_id uuid,p_review_epoch integer,p_request_id text,p_omit_errors boolean default false,p_omission_reason text default '') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare r analysis_runs; s decision_sets; receipt jsonb; summary jsonb; begin
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
 select jsonb_build_object('generation_mode','simulated','approved',count(*) filter(where v.decision='APPROVED'),'rejected',count(*) filter(where v.decision='REJECTED'),'total',count(*),'cost_saving_thb',sum((c.payload->'impacts'->>'cost_saving_thb')::numeric) filter(where v.decision='APPROVED'),'carbon_reduction_tco2e',sum((c.payload->'impacts'->>'carbon_reduction_tco2e')::numeric) filter(where v.decision='APPROVED'),'cost_known',count(*) filter(where v.decision='APPROVED' and c.payload->'impacts'->>'cost_saving_thb' is not null),'carbon_known',count(*) filter(where v.decision='APPROVED' and c.payload->'impacts'->>'carbon_reduction_tco2e' is not null),'omission_reason',p_omission_reason,'source_omissions',case when p_omit_errors then r.errors else '[]'::jsonb end,'warnings',r.warnings) into summary from recommendations c join reviews v on v.recommendation_id=c.id where c.run_id=p_run_id;
 insert into decision_sets(project_id,run_id,version_no,finalized_by,summary_snapshot) values(r.project_id,r.id,(select coalesce(max(version_no),0)+1 from decision_sets where project_id=r.project_id),auth.uid(),summary) returning * into s;
 insert into decision_items(project_id,decision_set_id,recommendation_id,decision,snapshot,lineage_id,work_scope_key) select r.project_id,s.id,c.id,v.decision,c.payload||jsonb_build_object('generation_mode','simulated','fixture_scenario_id',r.scenario,'review_reason',v.reason),c.lineage_id,c.work_scope_key from recommendations c join reviews v on v.recommendation_id=c.id where c.run_id=r.id;
 update analysis_runs set finalized=true where id=r.id;
 update document_revisions dr set outdated=true where dr.project_id=r.project_id and dr.decision_set_id<>s.id and (
 exists(select 1 from decision_items ni where ni.decision_set_id=s.id and ni.decision='APPROVED' and not exists(select 1 from decision_items oi where oi.decision_set_id=dr.decision_set_id and oi.decision='APPROVED' and oi.snapshot-'id'-'review_reason'-'fixture_scenario_id'=ni.snapshot-'id'-'review_reason'-'fixture_scenario_id'))
 or exists(select 1 from decision_items oi where oi.decision_set_id=dr.decision_set_id and oi.decision='APPROVED' and not exists(select 1 from decision_items ni where ni.decision_set_id=s.id and ni.decision='APPROVED' and oi.snapshot-'id'-'review_reason'-'fixture_scenario_id'=ni.snapshot-'id'-'review_reason'-'fixture_scenario_id')));
 perform gs_log(r.project_id,'decision_sets',s.id,'finalized',null,to_jsonb(s)); insert into operation_receipts values(r.project_id,p_request_id,'finalize',auth.uid(),to_jsonb(s)); return to_jsonb(s);
end $$;
create function public.gs_package_started(p_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from tasks where package_id=p_id) or exists(select 1 from milestones where package_id=p_id) or exists(select 1 from procurements where package_id=p_id) or exists(select 1 from implementation_entries where package_id=p_id) or exists(select 1 from issues where package_id=p_id) or exists(select 1 from evidence_files where package_id=p_id) or exists(select 1 from actual_results where package_id=p_id) or exists(select 1 from verifications where package_id=p_id) or exists(select 1 from comments where target_kind='packages' and target_id=p_id) $$;
create function public.gs_handoff(p_decision_set_id uuid,p_item_ids uuid[],p_request_id text,p_replace_reason text default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare s decision_sets; item decision_items; oldp packages; np packages; receipt jsonb; outp jsonb:='[]'; blocked boolean:=false; begin
 select * into s from decision_sets where id=p_decision_set_id; perform gs_require(s.project_id); perform 1 from projects where id=s.project_id for update;
 select result into receipt from operation_receipts where project_id=s.project_id and request_id=p_request_id and operation='handoff'; if receipt is not null then return receipt; end if;
 if exists(select 1 from unnest(p_item_ids) x where not exists(select 1 from decision_items where id=x and decision_set_id=s.id and decision='APPROVED')) then raise exception 'HANDOFF_APPROVED_ONLY'; end if;
 -- Preflight every item; changed started package issues are committed as an explicit blocked result.
 for item in select * from decision_items where id=any(p_item_ids) loop
 if exists(select 1 from packages where origin_decision_item_id=item.id) then continue; end if;
 select * into oldp from packages where project_id=s.project_id and scope_key=item.work_scope_key and superseded_at is null for update;
 if oldp.id is not null and (oldp.snapshot - 'id' - 'review_reason' - 'fixture_scenario_id')<>(item.snapshot - 'id' - 'review_reason' - 'fixture_scenario_id') then
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
 if oldp.id is not null and (oldp.snapshot - 'id' - 'review_reason' - 'fixture_scenario_id')=(item.snapshot - 'id' - 'review_reason' - 'fixture_scenario_id') then outp:=outp||jsonb_build_array(to_jsonb(oldp)); continue; end if;
 if oldp.id is not null then update packages set superseded_at=now(),execution_status='SUPERSEDED',row_version=row_version+1 where id=oldp.id; perform gs_log(s.project_id,'packages',oldp.id,'superseded',to_jsonb(oldp),jsonb_build_object('reason',p_replace_reason)); end if;
 insert into packages(project_id,origin_decision_item_id,lineage_id,scope_key,snapshot,owner_id) values(s.project_id,item.id,item.lineage_id,item.work_scope_key,item.snapshot,auth.uid()) returning * into np;
 perform gs_log(s.project_id,'packages',np.id,'handed_off',null,to_jsonb(np)); outp:=outp||jsonb_build_array(to_jsonb(np)); end loop;
 receipt:=jsonb_build_object('packages',outp); insert into operation_receipts values(s.project_id,p_request_id,'handoff',auth.uid(),receipt); return receipt;
end $$;





