revoke execute on function public.current_company_id_array() from public,anon;
grant execute on function public.current_company_id_array() to authenticated;
revoke execute on function public.current_company_ids_array() from public,anon;
grant execute on function public.current_company_ids_array() to authenticated;
revoke execute on function public.current_company_ids() from public,anon;
grant execute on function public.current_company_ids() to authenticated;
