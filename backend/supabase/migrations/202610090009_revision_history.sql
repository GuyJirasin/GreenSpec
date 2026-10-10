create function public.gs_decision_equivalent(p_left uuid,p_right uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select not exists(select 1 from decision_items l where l.decision_set_id=p_left and l.decision='APPROVED' and not exists(select 1 from decision_items r where r.decision_set_id=p_right and r.decision='APPROVED' and l.snapshot-'id'-'review_reason'-'fixture_scenario_id'=r.snapshot-'id'-'review_reason'-'fixture_scenario_id'))
 and not exists(select 1 from decision_items r where r.decision_set_id=p_right and r.decision='APPROVED' and not exists(select 1 from decision_items l where l.decision_set_id=p_left and l.decision='APPROVED' and l.snapshot-'id'-'review_reason'-'fixture_scenario_id'=r.snapshot-'id'-'review_reason'-'fixture_scenario_id'))
$$;
revoke all on function public.gs_decision_equivalent(uuid,uuid) from public,anon,authenticated;
create function public.gs_revision_history_flag() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ declare latest uuid; begin
 select id into latest from decision_sets where project_id=new.project_id order by version_no desc limit 1;
 new.outdated:=not gs_decision_equivalent(new.decision_set_id,latest);return new;
end $$;
revoke all on function public.gs_revision_history_flag() from public,anon,authenticated;
create trigger revision_historical_flag before insert on public.document_revisions for each row execute function public.gs_revision_history_flag();
