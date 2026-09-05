/* Keep server-side ticket pagination compatible with the existing TicketWithHistory view model. */
create or replace function public.search_tickets(p_company_id uuid,p_cursor_created_at timestamptz default null,p_cursor_id uuid default null,p_limit integer default 50,p_status text default null,p_assignee_id uuid default null,p_asset_id uuid default null,p_team_id uuid default null,p_department_id uuid default null,p_priority text default null,p_search text default null,p_archived boolean default false,p_created_by uuid default null) returns jsonb language plpgsql security definer stable set search_path=public,private,pg_catalog as $$
declare v_items jsonb;v_has_more boolean;
begin
 if not exists(select 1 from public.company_memberships where company_id=p_company_id and user_id=auth.uid() and is_active=true) then raise exception 'Not authorized for company';end if;if p_limit<1 or p_limit>100 then raise exception 'Invalid page size';end if;
 with filtered as(
  select t.* from public.tickets t where t.company_id=p_company_id and((p_archived and t.archived_at is not null)or(not p_archived and t.archived_at is null))and(p_status is null or t.status::text=p_status)and(p_priority is null or t.priority::text=p_priority)and(p_department_id is null or t.department_id=p_department_id)and(p_team_id is null or t.team_id=p_team_id)and(p_created_by is null or t.created_by=p_created_by)and(p_assignee_id is null or exists(select 1 from public.ticket_assignments a where a.ticket_id=t.id and a.assignee_id=p_assignee_id and a.unassigned_at is null))and(p_asset_id is null or exists(select 1 from public.asset_tickets x where x.ticket_id=t.id and x.asset_id=p_asset_id))and(nullif(trim(p_search),'') is null or t.subject ilike '%'||trim(p_search)||'%' or coalesce(t.description,'') ilike '%'||trim(p_search)||'%' or t.ticket_number::text ilike '%'||trim(p_search)||'%')and(p_cursor_created_at is null or(t.created_at,t.id)<(p_cursor_created_at,p_cursor_id))order by t.created_at desc,t.id desc limit p_limit+1),bounded as(select*from filtered limit p_limit)
 select coalesce(jsonb_agg(to_jsonb(b)||jsonb_build_object(
  'title',b.subject,
  'category',(select to_jsonb(c) from public.ticket_categories c where c.id=b.category_id),
  'creator',(select to_jsonb(p) from public.profiles p where p.id=b.created_by),
  'requester',(select to_jsonb(p) from public.profiles p where p.id=b.requester_id),
  'assignment',(select to_jsonb(a)||jsonb_build_object('assignee',(select to_jsonb(p) from public.profiles p where p.id=a.assignee_id)) from public.ticket_assignments a where a.ticket_id=b.id and a.unassigned_at is null order by a.assigned_at desc limit 1),
  'status_history',coalesce((select jsonb_agg(to_jsonb(h) order by h.changed_at asc) from public.ticket_status_history h where h.ticket_id=b.id),'[]'::jsonb)
 ) order by b.created_at desc,b.id desc),'[]'::jsonb),(select count(*)from filtered)>p_limit into v_items,v_has_more from bounded b;
 return jsonb_build_object('items',v_items,'has_more',v_has_more,'next_cursor',case when v_has_more then jsonb_build_object('created_at',(select min(created_at)from bounded),'id',(select min(id)from bounded where created_at=(select min(created_at)from bounded)))else null end);
end;$$;
