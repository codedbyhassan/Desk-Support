/* QR scan must first establish that the caller belongs to the QR's company, without assuming one primary company. */
create or replace function public.scan_attendance_qr(p_code text,p_latitude numeric default null,p_longitude numeric default null,p_metadata jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=public,private,pg_catalog as $$
declare v_user uuid:=auth.uid();v_qr public.qr_codes%rowtype;v_company uuid;v_log uuid;v_session public.attendance_sessions%rowtype;v_action text;v_restriction record;v_role text;v_parts text[];v_distance numeric;
begin
 if v_user is null then raise exception 'Unauthorized';end if;
 -- Membership is the authorization boundary. Only then is the QR code resolved.
 select q.* into v_qr from public.qr_codes q where q.code=trim(p_code) and exists(select 1 from public.company_memberships m where m.company_id=q.company_id and m.user_id=v_user and m.is_active=true) limit 1;
 if not found then raise exception 'QR code not found or not authorized';end if;v_company:=v_qr.company_id;
 if v_qr.status<>'active' or(v_qr.expires_at is not null and v_qr.expires_at<=now()) then raise exception 'QR code is inactive or expired';end if;
 for v_restriction in select restriction_type,value from public.qr_restrictions where qr_code_id=v_qr.id loop
  if v_restriction.restriction_type='role' then
   select role into v_role from public.company_memberships where company_id=v_company and user_id=v_user and is_active=true limit 1;if v_role is null or v_role<>v_restriction.value then raise exception 'QR role restriction failed';end if;
  elsif v_restriction.restriction_type='location' then
   if p_latitude is null or p_longitude is null then raise exception 'Location is required for this QR code';end if;v_parts:=regexp_split_to_array(trim(v_restriction.value),'\\s*,\\s*');if array_length(v_parts,1)<>3 then raise exception 'Invalid QR location restriction';end if;v_distance:=6371000*2*asin(sqrt(power(sin(radians(p_latitude::numeric-v_parts[1]::numeric)/2),2)+cos(radians(p_latitude))*cos(radians(v_parts[1]::numeric))*power(sin(radians(p_longitude::numeric-v_parts[2]::numeric)/2),2)));if v_distance>v_parts[3]::numeric then raise exception 'QR location restriction failed';end if;
  else raise exception 'Unsupported QR restriction type: %',v_restriction.restriction_type;end if;
 end loop;
 select * into v_session from public.attendance_sessions where company_id=v_company and user_id=v_user and type='work' and ended_at is null order by started_at desc limit 1;
 if found then update public.attendance_sessions set ended_at=now(),updated_at=now() where id=v_session.id returning * into v_session;v_action:='clock_out';else insert into public.attendance_sessions(company_id,user_id,started_at,type,source,qr_code_id,location,metadata) values(v_company,v_user,now(),'work','qr',v_qr.id,case when p_latitude is null or p_longitude is null then null else jsonb_build_object('latitude',p_latitude,'longitude',p_longitude) end,coalesce(p_metadata,'{}'::jsonb)) returning * into v_session;v_action:='clock_in';end if;
 insert into public.qr_scan_logs(qr_code_id,user_id,result,latitude,longitude,metadata) values(v_qr.id,v_user,'valid',p_latitude,p_longitude,coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('action',v_action,'attendance_session_id',v_session.id)) returning id into v_log;
 return jsonb_build_object('ok',true,'action',v_action,'company_id',v_company,'session',to_jsonb(v_session),'scan_id',v_log);
end;$$;
