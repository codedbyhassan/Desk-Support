-- Create function to setup new company with all required records
create or replace function public.setup_new_company(
  p_company_name text,
  p_user_id uuid,
  p_user_email text,
  p_user_full_name text,
  p_user_role text
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_company_id uuid;
  v_company_settings_id uuid;
  v_result jsonb;
begin
  -- Create company with default subscription plan
  insert into public.companies (
    name,
    subscription_plan,
    max_users,
    max_assets,
    status
  )
  values (
    p_company_name,
    'basic',
    10,
    100,
    'active'
  )
  returning id into v_company_id;

  -- Create company settings with defaults
  insert into public.company_settings (
    company_id,
    company_name,
    primary_color,
    secondary_color,
    accent_color,
    dark_primary_color,
    dark_secondary_color,
    dark_accent_color,
    default_theme,
    date_format,
    time_format,
    currency,
    timezone,
    enable_email_notifications,
    enable_push_notifications,
    enable_asset_qr_codes,
    enable_ticket_attachments
  )
  values (
    v_company_id,
    p_company_name,
    '#3b82f6',
    '#8b5cf6',
    '#10b981',
    '#60a5fa',
    '#a78bfa',
    '#34d399',
    'light',
    'MM/DD/YYYY',
    '12h',
    'USD',
    'UTC',
    true,
    true,
    true,
    true
  )
  returning id into v_company_settings_id;

  -- Create initial subscription
  insert into public.subscriptions (
    company_id,
    plan_type,
    status,
    billing_cycle,
    expires_at
  )
  values (
    v_company_id,
    'basic',
    'active',
    'monthly',
    timezone('utc', now()) + interval '30 days'
  );

  -- Create user profile
  insert into public.users (
    id,
    email,
    full_name,
    role,
    company_id
  )
  values (
    p_user_id,
    p_user_email,
    p_user_full_name,
    p_user_role,
    v_company_id
  );

  -- Create audit log entry
  insert into public.audit_logs (
    user_id,
    company_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    p_user_id,
    v_company_id,
    'company_created',
    'company',
    v_company_id,
    jsonb_build_object(
      'company_name', p_company_name,
      'created_by', p_user_full_name,
      'role', p_user_role
    )
  );

  -- Return company info
  v_result := jsonb_build_object(
    'company_id', v_company_id,
    'settings_id', v_company_settings_id,
    'company_name', p_company_name,
    'user_role', p_user_role
  );

  return v_result;
end;
$$;