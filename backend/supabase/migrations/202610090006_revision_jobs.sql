create function public.gs_begin_revision(p_decision_set_id uuid,p_source_version_id uuid,p_request_id text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare s decision_sets; r document_revisions; begin
 select * into s from decision_sets where id=p_decision_set_id; perform gs_require(s.project_id); perform 1 from projects where id=s.project_id for update;
 if length(trim(coalesce(p_request_id,'')))=0 then raise exception 'REQUEST_ID_REQUIRED'; end if;
 if not exists(select 1 from decision_items i cross join lateral jsonb_array_elements(i.snapshot->'sources') src where i.decision_set_id=s.id and i.decision='APPROVED' and src->>'document_version_id'=p_source_version_id::text) then raise exception 'SOURCE_NOT_APPROVED'; end if;
 if not exists(select 1 from document_versions where id=p_source_version_id and project_id=s.project_id and provenance='fixture' and upload_state='READY') then raise exception 'DEMO_SOURCE_UNSUPPORTED'; end if;
 select * into r from document_revisions where project_id=s.project_id and request_id=p_request_id and source_version_id=p_source_version_id for update;
 if r.id is not null then
 if r.decision_set_id<>s.id then raise exception 'REQUEST_ID_CONFLICT'; end if;
 if r.status in ('REQUESTED','GENERATING') and r.created_at<now()-interval '60 seconds' then update document_revisions set status='FAILED',unapplied='[{"reason":"Revision job timed out; regenerate with a new request."}]',row_version=row_version+1 where id=r.id returning * into r; end if;
 return to_jsonb(r); end if;
 insert into document_revisions(project_id,decision_set_id,request_id,source_version_id,status) values(s.project_id,s.id,p_request_id,p_source_version_id,'REQUESTED') returning * into r;
 perform gs_log(s.project_id,'document_revisions',r.id,'revision_requested',null,to_jsonb(r)); return to_jsonb(r);
end $$;
create function public.gs_finish_revision(p_revision_id uuid,p_status text,p_output_path text,p_changes jsonb,p_unapplied jsonb,p_checksum text default null,p_bytes bigint default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare r document_revisions; doc uuid; version uuid; begin
 select * into r from document_revisions where id=p_revision_id for update;
 if r.status not in ('REQUESTED','GENERATING') then return to_jsonb(r); end if;
 perform 1 from projects where id=r.project_id and archived_at is null for update; if not found then raise exception 'PROJECT_ARCHIVED'; end if;
 if p_status not in ('READY_FOR_REVIEW','PARTIAL','FAILED') then raise exception 'OUTPUT_INVALID'; end if;
 if p_output_path is not null then
 if split_part(p_output_path,'/',1)<>r.project_id::text or p_checksum !~ '^[a-f0-9]{64}$' then raise exception 'OUTPUT_INVALID'; end if;
 insert into documents(project_id,title,type) values(r.project_id,'Generated revision '||r.id,'SPEC') returning id into doc;
 insert into document_versions(project_id,document_id,filename,storage_path,checksum,bytes,mime,upload_state,provenance) values(r.project_id,doc,'revision-'||r.id||'.docx',p_output_path,p_checksum,p_bytes,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','READY','generated') returning id into version;
 update documents set current_version_id=version where id=doc;
 end if;
 update document_revisions set status=p_status,output_path=p_output_path,output_version_id=version,changes=p_changes,unapplied=p_unapplied,row_version=row_version+1 where id=r.id returning * into r;
 perform gs_log(r.project_id,'document_revisions',r.id,'revision_generated',null,to_jsonb(r)); return to_jsonb(r);
end $$;
revoke all on function public.gs_begin_revision(uuid,uuid,text),public.gs_finish_revision(uuid,text,text,jsonb,jsonb,text,bigint) from public,anon,authenticated;
grant execute on function public.gs_begin_revision(uuid,uuid,text) to authenticated;
grant execute on function public.gs_finish_revision(uuid,text,text,jsonb,jsonb,text,bigint) to service_role;
