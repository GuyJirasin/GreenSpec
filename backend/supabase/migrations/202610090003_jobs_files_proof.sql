create function public.gs_reopen(p_decision_set_id uuid,p_request_id text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare s decision_sets; oldrun analysis_runs; nr analysis_runs; rec recommendations; newrec uuid; receipt jsonb; begin
 select * into s from decision_sets where id=p_decision_set_id; perform gs_require(s.project_id); perform 1 from projects where id=s.project_id for update;
 select result into receipt from operation_receipts where project_id=s.project_id and request_id=p_request_id and operation='reopen'; if receipt is not null then return receipt; end if;
 select * into oldrun from analysis_runs where id=s.run_id;
 insert into analysis_runs(project_id,parent_run_id,input_snapshot,input_fingerprint,mode,scenario,status,request_id,result,errors,warnings,stale) values(s.project_id,oldrun.id,oldrun.input_snapshot,oldrun.input_fingerprint,'simulated',oldrun.scenario,oldrun.status,p_request_id,oldrun.result,oldrun.errors,oldrun.warnings,oldrun.input_snapshot->'context'->>'description' is distinct from (select description from projects where id=s.project_id)) returning * into nr;
 insert into analysis_inputs select project_id,nr.id,document_version_id from analysis_inputs where run_id=oldrun.id;
 update analysis_runs set stale=true where id=nr.id and (oldrun.input_snapshot->'context'->>'name' is distinct from (select name from projects where id=s.project_id) or exists(select 1 from analysis_inputs ai join document_versions dv on dv.id=ai.document_version_id join documents d on d.id=dv.document_id where ai.run_id=nr.id and (d.current_version_id is distinct from dv.id or d.retired_at is not null or exists(select 1 from jsonb_array_elements(oldrun.input_snapshot->'document_versions') inp where inp->>'id'=dv.id::text and (inp->>'title' is distinct from d.title or inp->>'type' is distinct from d.type)))));
 for rec in select * from recommendations where run_id=oldrun.id loop
 newrec:=gen_random_uuid(); insert into recommendations(id,project_id,run_id,lineage_id,work_scope_key,payload) values(newrec,s.project_id,nr.id,rec.lineage_id,rec.work_scope_key,rec.payload||jsonb_build_object('id',newrec));
 insert into source_references(project_id,recommendation_id,document_version_id,exact_text,locator) select project_id,newrec,document_version_id,exact_text,locator from source_references where recommendation_id=rec.id;
 insert into reviews(project_id,recommendation_id,decision,reason,reviewer_id,locked) select s.project_id,newrec,decision,reason,auth.uid(),false from reviews where recommendation_id=rec.id; end loop;
 update analysis_runs set result=jsonb_set(jsonb_set(result,'{run_id}',to_jsonb(nr.id::text)),'{recommendations}',coalesce((select jsonb_agg(payload) from recommendations where run_id=nr.id),'[]')) where id=nr.id returning * into nr;
 perform gs_log(s.project_id,'analysis_runs',nr.id,'reopened',to_jsonb(s),to_jsonb(nr)); insert into operation_receipts values(s.project_id,p_request_id,'reopen',auth.uid(),to_jsonb(nr)); return to_jsonb(nr);
end $$;
create function public.gs_begin_analysis(p_project_id uuid,p_request_id text,p_scenario text,p_document_ids uuid[],p_parent_run_id uuid default null,p_feedback jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare p projects; r analysis_runs; inputs jsonb; snap jsonb; begin
 perform gs_require(p_project_id); select * into p from projects where id=p_project_id for update;
 select * into r from analysis_runs where project_id=p_project_id and request_id=p_request_id for update;
 if r.id is not null then
 if r.status in ('QUEUED','PROCESSING') and r.heartbeat_at<now()-interval '60 seconds' then update analysis_runs set status='FAILED',errors='[{"code":"JOB_FAILED","message":"Simulation job timed out","retryable":true}]' where id=r.id returning * into r; end if;
 if r.status='FAILED' and coalesce((r.errors->0->>'retryable')::boolean,false) and r.scenario<>'job-failure' then update analysis_runs set status='QUEUED',heartbeat_at=now() where id=r.id returning * into r; end if;
 return to_jsonb(r); end if;
 if length(trim(coalesce(p.description,'')))=0 or cardinality(p_document_ids)=0 then raise exception 'INPUT_INCOMPLETE'; end if;
 if exists(select 1 from unnest(p_document_ids) x where not exists(select 1 from document_versions v join documents d on d.id=v.document_id where v.id=x and v.project_id=p_project_id and v.upload_state='READY' and v.provenance='fixture' and v.fixture_id is not null and d.retired_at is null and length(trim(d.title))>0)) then raise exception 'DEMO_SOURCE_UNSUPPORTED'; end if;
 if p_parent_run_id is not null and not exists(select 1 from analysis_runs where id=p_parent_run_id and project_id=p_project_id and status in ('COMPLETED','PARTIAL') and not finalized) then raise exception 'ITERATION_PARENT_INVALID'; end if;
 if exists(select 1 from analysis_runs where project_id=p_project_id and status in ('QUEUED','PROCESSING')) then raise exception 'JOB_ACTIVE'; end if;
 select jsonb_agg(jsonb_build_object('id',v.id,'checksum',v.checksum,'fixture_id',v.fixture_id,'title',d.title,'type',d.type) order by v.id) into inputs from document_versions v join documents d on d.id=v.document_id where v.id=any(p_document_ids);
 snap:=jsonb_build_object('contract_version','1.0','project_id',p_project_id,'request_id',p_request_id,'operation',case when p_parent_run_id is null then 'initial' else 'iterate' end,'context',jsonb_build_object('name',p.name,'description',p.description),'document_versions',inputs,'generation_mode','simulated','fixture_scenario_id',p_scenario,'parent_run_id',p_parent_run_id,'feedback',p_feedback);
 insert into analysis_runs(project_id,parent_run_id,input_snapshot,input_fingerprint,scenario,request_id) values(p_project_id,p_parent_run_id,snap,md5(snap::text),p_scenario,p_request_id) returning * into r;
 insert into analysis_inputs select p_project_id,r.id,x from unnest(p_document_ids) x on conflict do nothing;
 perform gs_log(p_project_id,'analysis_runs',r.id,'queued',null,to_jsonb(r)); return to_jsonb(r);
end $$;
create function public.gs_finish_analysis(p_run_id uuid,p_result jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare r analysis_runs; rec jsonb; source jsonb; rid uuid; oldrec recommendations; oldreview reviews; begin
 select * into r from analysis_runs where id=p_run_id for update; if r.id is null then raise exception 'JOB_NOT_FOUND'; end if;
 if r.status not in ('QUEUED','PROCESSING') then return to_jsonb(r); end if;
 if exists(select 1 from projects where id=r.project_id and archived_at is not null) then raise exception 'PROJECT_ARCHIVED'; end if;
 if p_result->>'contract_version'<>'1.0' or p_result->>'generation_mode'<>'simulated' or p_result->>'run_id'<>p_run_id::text or p_result->>'status' not in ('completed','partial','failed') then raise exception 'OUTPUT_INVALID'; end if;
 for rec in select value from jsonb_array_elements(p_result->'recommendations') loop
 rid:=gen_random_uuid(); rec:=rec||jsonb_build_object('id',rid);
 insert into recommendations values(rid,r.project_id,r.id,rec->>'lineage_id',rec->>'work_scope_key',rec);
 for source in select value from jsonb_array_elements(rec->'sources') loop
 if not exists(select 1 from analysis_inputs where run_id=r.id and document_version_id=(source->>'document_version_id')::uuid) then raise exception 'OUTPUT_INVALID'; end if;
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
create function public.gs_begin_upload(p_project_id uuid,p_document_id uuid,p_filename text,p_mime text,p_bytes bigint,p_request_id text,p_package_id uuid default null,p_evidence_kind text default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare vid uuid:=gen_random_uuid(); path text; v jsonb; begin
 perform gs_require(p_project_id); perform 1 from projects where id=p_project_id for update;
 select result into v from operation_receipts where project_id=p_project_id and request_id=p_request_id and operation='begin_upload'; if v is not null then return v; end if;
 if p_bytes<=0 or p_bytes>26214400 then raise exception 'FILE_SIZE_INVALID'; end if;
 if p_package_id is null then
 if not exists(select 1 from documents where id=p_document_id and project_id=p_project_id and retired_at is null) then raise exception 'UNAUTHORIZED'; end if;
 if exists(select 1 from analysis_inputs ai join analysis_runs r on r.id=ai.run_id join document_versions dv on dv.id=ai.document_version_id where dv.document_id=p_document_id and r.status in ('QUEUED','PROCESSING')) then raise exception 'JOB_ACTIVE'; end if;
 if p_mime not in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') then raise exception 'FILE_FORMAT_UNSUPPORTED'; end if;
 path:=p_project_id||'/'||p_document_id||'/'||vid;
 insert into document_versions(id,project_id,document_id,version_no,filename,storage_path,bytes,mime) values(vid,p_project_id,p_document_id,(select coalesce(max(version_no),0)+1 from document_versions where document_id=p_document_id),p_filename,path,p_bytes,p_mime) returning to_jsonb(document_versions.*) into v;
 else
 if not exists(select 1 from packages where id=p_package_id and project_id=p_project_id and superseded_at is null) then raise exception 'UNAUTHORIZED'; end if;
 if p_mime not in ('application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') then raise exception 'FILE_FORMAT_UNSUPPORTED'; end if;
 path:=p_project_id||'/'||p_package_id||'/'||vid;
 insert into evidence_files(id,project_id,package_id,storage_path,filename,mime,kind,uploaded_by) values(vid,p_project_id,p_package_id,path,p_filename,p_mime,coalesce(p_evidence_kind,'implementation'),auth.uid()) returning to_jsonb(evidence_files.*) into v;
 end if;
 insert into operation_receipts values(p_project_id,p_request_id,'begin_upload',auth.uid(),v); perform gs_log(p_project_id,case when p_package_id is null then 'document_versions' else 'evidence_files' end,vid,'upload_started',null,v); return v;
end $$;
-- Only the server worker, after downloading bytes and checking SHA-256, commits READY.
create function public.gs_commit_upload(p_id uuid,p_checksum text,p_fixture_id text default null,p_extraction jsonb default '[]',p_evidence boolean default false) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare v jsonb; project uuid; doc uuid; begin
 if p_checksum !~ '^[a-f0-9]{64}$' then raise exception 'CHECKSUM_INVALID'; end if;
 if p_evidence then
 select project_id into project from evidence_files where id=p_id for update; perform 1 from projects where id=project and archived_at is null for update; if not found then raise exception 'PROJECT_ARCHIVED'; end if;
 update evidence_files set checksum=p_checksum,upload_state='READY',row_version=row_version+1 where id=p_id and upload_state<>'READY' returning to_jsonb(evidence_files.*) into v;
 if v is null then select to_jsonb(e) into v from evidence_files e where id=p_id; end if;
 else
 select project_id,document_id into project,doc from document_versions where id=p_id for update; perform 1 from projects where id=project and archived_at is null for update; if not found then raise exception 'PROJECT_ARCHIVED'; end if;
 if exists(select 1 from analysis_inputs ai join analysis_runs r on r.id=ai.run_id join document_versions dv on dv.id=ai.document_version_id where dv.document_id=doc and r.status in ('QUEUED','PROCESSING')) then raise exception 'JOB_ACTIVE'; end if;
 update document_versions set checksum=p_checksum,upload_state='READY',fixture_id=p_fixture_id,provenance=case when p_fixture_id is null then 'uploaded' else 'fixture' end,extraction=p_extraction,row_version=row_version+1 where id=p_id and upload_state<>'READY' returning to_jsonb(document_versions.*) into v;
 if v is null then select to_jsonb(d) into v from document_versions d where id=p_id; else
 update documents set current_version_id=p_id,row_version=row_version+1 where id=doc;
 update analysis_runs set stale=true where project_id=project and not finalized and status in ('COMPLETED','PARTIAL') and exists(select 1 from analysis_inputs ai join document_versions dv on dv.id=ai.document_version_id where ai.run_id=analysis_runs.id and dv.document_id=doc); end if;
 end if;
 perform gs_log(project,case when p_evidence then 'evidence_files' else 'document_versions' end,p_id,'upload_committed',null,v); return v;
end $$;
create function public.gs_fail_upload(p_id uuid,p_evidence boolean default false) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare p uuid; v jsonb; begin
 if p_evidence then select project_id into p from evidence_files where id=p_id; else select project_id into p from document_versions where id=p_id; end if; perform gs_require(p);
 if p_evidence then update evidence_files set upload_state='FAILED',row_version=row_version+1 where id=p_id and upload_state<>'READY' returning to_jsonb(evidence_files.*) into v;
 else update document_versions set upload_state='FAILED',failure_reason='Upload canceled or failed; retry with a new upload request.',row_version=row_version+1 where id=p_id and upload_state<>'READY' returning to_jsonb(document_versions.*) into v; end if; return v;
end $$;
create function public.gs_verify(p_package_id uuid,p_result text,p_notes text,p_evidence_ids uuid[]) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare p packages; v verifications; installed numeric; required numeric; begin
 select * into p from packages where id=p_package_id; perform gs_require(p.project_id); perform 1 from projects where id=p.project_id for update; perform 1 from packages where id=p.id and superseded_at is null for update; if not found then raise exception 'PACKAGE_SUPERSEDED'; end if;
 if p_result='PASS' then
 required:=(p.snapshot->'quantity'->>'value')::numeric; select coalesce(sum(quantity),0) into installed from implementation_entries e where package_id=p.id and kind='install' and not exists(select 1 from implementation_entries c where c.corrects_id=e.id);
 if required is null or installed<required then raise exception 'INSTALLATION_INCOMPLETE'; end if;
 if exists(select 1 from issues where package_id=p.id and blocks_verification and status<>'RESOLVED') then raise exception 'BLOCKING_ISSUE'; end if;
 if coalesce(cardinality(p_evidence_ids),0)=0 then raise exception 'EVIDENCE_REQUIRED'; end if;
 end if;
 if exists(select 1 from unnest(p_evidence_ids) x where not exists(select 1 from evidence_files where id=x and package_id=p.id and upload_state='READY')) then raise exception 'EVIDENCE_INVALID'; end if;
 insert into verifications(project_id,package_id,result,verifier_id,notes,provenance) values(p.project_id,p.id,p_result,auth.uid(),p_notes,case when exists(select 1 from evidence_files where id=any(p_evidence_ids) and provenance='simulated') then 'simulated' else 'recorded' end) returning * into v;
 insert into verification_evidence select p.project_id,v.id,x from unnest(p_evidence_ids) x on conflict do nothing;
 perform gs_refresh_package(p.id); perform gs_log(p.project_id,'verifications',v.id,'verification_recorded',null,to_jsonb(v)); perform gs_evaluate_notifications(p.project_id); return to_jsonb(v);
end $$;
create function public.gs_approve_revision(p_revision_id uuid,p_expected_version integer,p_exclusions jsonb default '[]') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare r document_revisions; begin
 select * into r from document_revisions where id=p_revision_id; perform gs_require(r.project_id); select * into r from document_revisions where id=p_revision_id for update;
 if r.row_version is distinct from p_expected_version then raise exception 'VERSION_CONFLICT' using detail=to_jsonb(r)::text; end if;
 if r.outdated or r.status not in ('READY_FOR_REVIEW','PARTIAL') then raise exception 'REVISION_NOT_APPROVABLE'; end if;
 if exists(select 1 from jsonb_array_elements(r.unapplied) u where not exists(select 1 from jsonb_array_elements(p_exclusions) e where e->>'recommendation_id'=u->>'recommendation_id' and length(trim(coalesce(e->>'reason','')))>0)) then raise exception 'EXCLUSION_REASON_REQUIRED'; end if;
 update document_revisions set status='APPROVED',exclusions=p_exclusions,approved_by=auth.uid(),approved_at=now(),row_version=row_version+1 where id=r.id returning * into r;
 perform gs_log(r.project_id,'document_revisions',r.id,'revision_approved',null,to_jsonb(r)); return to_jsonb(r);
end $$;
create function public.gs_mark_notification(p_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$ begin update notifications set read_at=now() where id=p_id and recipient_id=auth.uid() and gs_role(project_id) is not null; end $$;
create function public.gs_evaluate_notifications(p_project_id uuid default null) returns integer language plpgsql security definer set search_path=public,pg_temp as $$ declare row record; n integer:=0; day text:=to_char(now() at time zone 'Asia/Bangkok','YYYY-MM-DD'); begin
 if auth.uid() is not null and p_project_id is not null and gs_role(p_project_id) is null then raise exception 'UNAUTHORIZED'; end if;
 for row in
 select t.project_id,t.id target_id,'TASK_OVERDUE' kind,coalesce(t.assignee_id,p.owner_id,(select user_id from project_members where project_id=t.project_id and role='owner' order by user_id limit 1)) recipient from tasks t join packages p on p.id=t.package_id join projects pr on pr.id=t.project_id where t.status<>'DONE' and t.due_at<now() and p.superseded_at is null and pr.archived_at is null and (p_project_id is null or t.project_id=p_project_id) and (auth.uid() is null or gs_role(t.project_id) is not null)
 union all
 select pc.project_id,p.id,'DELIVERY_LATE',coalesce(p.owner_id,(select user_id from project_members where project_id=p.project_id and role='owner' order by user_id limit 1)) from procurements pc join packages p on p.id=pc.package_id join projects pr on pr.id=p.project_id where pc.expected_delivery_at<now() and pc.ordered_qty>(select coalesce(sum(quantity),0) from implementation_entries e where e.package_id=p.id and kind='delivery' and not exists(select 1 from implementation_entries c where c.corrects_id=e.id)) and p.superseded_at is null and pr.archived_at is null and (p_project_id is null or p.project_id=p_project_id) and (auth.uid() is null or gs_role(p.project_id) is not null)
 union all
 select p.project_id,p.id,'VERIFICATION_PENDING',coalesce(p.owner_id,(select user_id from project_members where project_id=p.project_id and role='owner' order by user_id limit 1)) from packages p join projects pr on pr.id=p.project_id where p.execution_status='INSTALLED' and (select max(occurred_at) from implementation_entries where package_id=p.id and kind='install')<now()-interval '1 day' and p.superseded_at is null and pr.archived_at is null and (p_project_id is null or p.project_id=p_project_id) and (auth.uid() is null or gs_role(p.project_id) is not null)
 union all
 select i.project_id,i.id,'BLOCKING_ISSUE',coalesce(i.owner_id,p.owner_id,(select user_id from project_members where project_id=p.project_id and role='owner' order by user_id limit 1)) from issues i join packages p on p.id=i.package_id join projects pr on pr.id=p.project_id where i.status<>'RESOLVED' and i.blocks_verification and i.created_at<now()-interval '1 day' and p.superseded_at is null and pr.archived_at is null and (p_project_id is null or i.project_id=p_project_id) and (auth.uid() is null or gs_role(i.project_id) is not null)
 loop
 if row.recipient is not null and exists(select 1 from project_members where project_id=row.project_id and user_id=row.recipient) then insert into notifications(project_id,recipient_id,kind,target_id,dedup_key) values(row.project_id,row.recipient,row.kind,row.target_id,row.kind||':'||row.target_id||':'||day) on conflict do nothing; if found then n:=n+1; end if; end if;
 end loop; return n;
end $$;
-- Only checked domain operations are exposed to authenticated users.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.gs_role(uuid),public.gs_create_project(text,text),public.gs_member(uuid,text,text,boolean),public.gs_archive(uuid,boolean,integer),public.gs_mutate(uuid,text,uuid,integer,jsonb,text),public.gs_finalize(uuid,integer,text,boolean,text),public.gs_handoff(uuid,uuid[],text,text),public.gs_reopen(uuid,text),public.gs_begin_analysis(uuid,text,text,uuid[],uuid,jsonb),public.gs_begin_upload(uuid,uuid,text,text,bigint,text,uuid,text),public.gs_fail_upload(uuid,boolean),public.gs_verify(uuid,text,text,uuid[]),public.gs_approve_revision(uuid,integer,jsonb),public.gs_mark_notification(uuid),public.gs_evaluate_notifications(uuid) to authenticated;
grant execute on function public.gs_finish_analysis(uuid,jsonb),public.gs_commit_upload(uuid,text,text,jsonb,boolean),public.gs_evaluate_notifications(uuid) to service_role;


