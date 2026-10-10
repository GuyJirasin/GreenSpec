create function public.gs_check_edit(p_project_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$ begin perform gs_require(p_project_id); end $$;
revoke all on function public.gs_check_edit(uuid) from public,anon;
grant execute on function public.gs_check_edit(uuid) to authenticated;
create function public.gs_remove_member(p_project_id uuid,p_user_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$ declare r text; begin
 perform gs_require(p_project_id,true); perform 1 from projects where id=p_project_id for update;
 select role into r from project_members where project_id=p_project_id and user_id=p_user_id;
 if r='owner' and (select count(*) from project_members where project_id=p_project_id and role='owner')<=1 then raise exception 'LAST_OWNER'; end if;
 delete from project_members where project_id=p_project_id and user_id=p_user_id;
 perform gs_log(p_project_id,'members',p_user_id,'member_removed',jsonb_build_object('role',r),null);
end $$;
revoke all on function public.gs_remove_member(uuid,uuid) from public,anon;
grant execute on function public.gs_remove_member(uuid,uuid) to authenticated;
-- On resume, stale abandoned transfer records remain retryable; committed bytes stay retained.
create function public.gs_recover_jobs(p_project_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ declare jobs integer; uploads integer; begin
 perform gs_require(p_project_id); perform 1 from projects where id=p_project_id for update;
 update analysis_runs set status='FAILED',errors='[{"code":"JOB_FAILED","message":"Simulation job timed out after no heartbeat","retryable":true}]' where project_id=p_project_id and status in ('QUEUED','PROCESSING') and heartbeat_at<now()-interval '60 seconds'; get diagnostics jobs=row_count;
 update document_versions set upload_state='FAILED',failure_reason='Abandoned upload; retry with a new request.',row_version=row_version+1 where project_id=p_project_id and upload_state='UPLOADING' and created_at<now()-interval '10 minutes'; get diagnostics uploads=row_count;
 return jsonb_build_object('failed_jobs',jobs,'failed_uploads',uploads);
end $$;
revoke all on function public.gs_recover_jobs(uuid) from public,anon;
grant execute on function public.gs_recover_jobs(uuid) to authenticated;
-- Explicit worker privileges instead of relying on provider default privileges.
grant select,insert,update,delete on all tables in schema public to service_role;
revoke create on schema public from public,anon,authenticated;

