create function public.gs_list_members(p_project_id uuid) returns table(user_id uuid,role text,email text,display_name text) language plpgsql stable security definer set search_path=public,pg_temp as $$ begin
 if auth.uid() is null or gs_role(p_project_id) is null then raise exception 'UNAUTHORIZED'; end if;
 return query select m.user_id,m.role,u.email::text,coalesce(p.display_name,u.raw_user_meta_data->>'display_name','') from project_members m join auth.users u on u.id=m.user_id left join profiles p on p.id=u.id where m.project_id=p_project_id order by m.role,m.user_id;
end $$;
revoke all on function public.gs_list_members(uuid) from public,anon;
grant execute on function public.gs_list_members(uuid) to authenticated;
