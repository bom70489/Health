-- Service-only claim performs current-version authorization before atomic dedupe.
create function public.claim_reminder(p_kind text,p_record_id uuid,p_version integer,p_scheduled_at timestamptz,p_device_token_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare patient uuid; key text; inserted text; plan public.medication_plans; appointment public.appointments; device public.device_tokens; local_time timestamp;
begin
  if p_kind = 'appointment' then
    select * into appointment from public.appointments where id = p_record_id for share;
    if not found or appointment.version <> p_version or appointment.status <> 'scheduled' or not appointment.reminders_enabled
      or appointment.scheduled_at <> p_scheduled_at then return null; end if;
    if p_scheduled_at - interval '1 day' > now() or p_scheduled_at - interval '1 day' < now() - interval '5 minutes' then return null; end if;
    patient := appointment.patient_id;
  elsif p_kind = 'medication' then
    select * into plan from public.medication_plans where id = p_record_id for share;
    if not found or plan.version <> p_version or not plan.is_active or not plan.reminders_enabled then return null; end if;
    if p_scheduled_at > now() or p_scheduled_at < now() - interval '5 minutes' then return null; end if;
    local_time := p_scheduled_at at time zone plan.time_zone;
    if local_time::date < plan.start_date or (plan.end_date is not null and local_time::date > plan.end_date)
      or not (to_char(local_time,'HH24:MI') = any(plan.time_slots)) or date_part('second',local_time) <> 0
      or (plan.weekdays is not null and not (extract(dow from local_time)::integer = any(plan.weekdays))) then return null; end if;
    if exists(select 1 from public.dose_confirmations where medication_plan_id = p_record_id and medication_plan_version = p_version
      and scheduled_at = p_scheduled_at and corrected_at is null) then return null; end if;
    patient := plan.patient_id;
  else return null;
  end if;
  select * into device from public.device_tokens where id = p_device_token_id and user_id = patient for share;
  if not found then return null; end if;
  -- Stable installation identity survives token unlink/re-registration after logout.
  key := p_kind || ':' || p_record_id::text || ':' || p_version::text || ':' || to_char(p_scheduled_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') || ':' || device.device_id;
  insert into public.notification_deliveries(delivery_key,patient_id,kind,record_id,version,scheduled_at,device_token_id,device_id)
  values(key,patient,p_kind,p_record_id,p_version,p_scheduled_at,p_device_token_id,device.device_id)
  on conflict (delivery_key) do nothing returning delivery_key into inserted;
  return inserted;
end $$;
revoke all on function public.claim_reminder(text,uuid,integer,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.claim_reminder(text,uuid,integer,timestamptz,uuid) to service_role;
