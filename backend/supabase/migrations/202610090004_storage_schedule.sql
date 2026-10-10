insert into storage.buckets(id,name,public,file_size_limit) values('documents','documents',false,26214400),('evidence','evidence',false,26214400) on conflict(id) do nothing;
create function public.gs_storage_member(p_path text,p_edit boolean default false) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$ declare p uuid; r text; begin
 begin p:=split_part(p_path,'/',1)::uuid; exception when invalid_text_representation then return false; end;
 r:=gs_role(p); return r is not null and (not p_edit or (r in ('owner','editor') and exists(select 1 from projects where id=p and archived_at is null)));
end $$;
revoke all on function public.gs_storage_member(text,boolean) from public,anon;
grant execute on function public.gs_storage_member(text,boolean) to authenticated;
create policy gs_private_download on storage.objects for select to authenticated using(bucket_id in ('documents','evidence') and public.gs_storage_member(name));
create policy gs_registered_upload on storage.objects for insert to authenticated with check(public.gs_storage_member(name,true) and ((bucket_id='documents' and exists(select 1 from public.document_versions where storage_path=name and upload_state='UPLOADING')) or (bucket_id='evidence' and exists(select 1 from public.evidence_files where storage_path=name and upload_state='UPLOADING'))));
-- No UPDATE/DELETE grants/policies for clients: committed source/evidence bytes stay immutable.
-- Daily evaluator requires pg_cron in Supabase. Optional in isolated SQL test environments.
do $$ begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') then
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.schedule('greenspec-notifications','0 17 * * *','select public.gs_evaluate_notifications(null);');
 end if;
end $$;

