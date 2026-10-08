-- Synthetic-data prototype. Roles and assignments are administered server-side.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('patient','doctor')),
  display_name text not null check (length(trim(display_name)) > 0),
  patient_number text unique, age integer check (age between 0 and 130),
  phone text, hospital_name text, department text, emergency_contact text, allergy_note text,
  created_at timestamptz not null default now()
);
create table public.doctor_patients (
  doctor_id uuid not null references public.profiles(id),
  patient_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (doctor_id,patient_id), check (doctor_id <> patient_id)
);

create function private.positive_number(value text) returns boolean
language sql immutable set search_path = '' as $$
  select case when value ~ '^[0-9]+(\.[0-9]+)?$' then value::numeric > 0 else false end
$$;
create function private.valid_slots(value text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(array_length(value,1) between 1 and 12,false)
    and not exists(select 1 from unnest(value) x where x is null or x !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    and (select count(*) = count(distinct x) from unnest(value) x)
$$;
create function private.valid_weekdays(value integer[]) returns boolean
language sql immutable set search_path = '' as $$
  select value is null or (coalesce(array_length(value,1) between 1 and 7,false)
    and not exists(select 1 from unnest(value) x where x is null or x not between 0 and 6)
    and (select count(*) = count(distinct x) from unnest(value) x))
$$;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id),
  doctor_id uuid not null references public.profiles(id),
  title text not null check (length(trim(title)) > 0),
  scheduled_at timestamptz not null check (isfinite(scheduled_at)),
  hospital_name text not null check (length(trim(hospital_name)) > 0),
  department text not null check (length(trim(department)) > 0),
  location_detail text, hospital_address text, hospital_phone text, preparation_note text,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','completed')),
  reminders_enabled boolean not null default true,
  version integer not null default 1 check (version > 0),
  acknowledged_version integer, acknowledged_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  last_updated_by uuid not null references public.profiles(id),
  check ((acknowledged_version is null and acknowledged_at is null)
      or (acknowledged_version = version and acknowledged_at is not null))
);
create table public.medication_plans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id),
  doctor_id uuid not null references public.profiles(id),
  medicine_name text not null check (length(trim(medicine_name)) > 0),
  strength_value text check (strength_value is null or private.positive_number(strength_value)),
  strength_unit text,
  amount_per_dose text not null check (private.positive_number(amount_per_dose)),
  amount_unit text not null check (length(trim(amount_unit)) > 0),
  meal_instruction text not null check (meal_instruction in ('before','after','with','none','per_doctor')),
  instructions text, note text,
  start_date date not null check (isfinite(start_date)), end_date date check (end_date is null or (isfinite(end_date) and end_date >= start_date)),
  time_slots text[] not null check (private.valid_slots(time_slots)),
  weekdays integer[] check (private.valid_weekdays(weekdays)),
  time_zone text not null default 'Asia/Bangkok' check (time_zone = 'Asia/Bangkok'),
  is_active boolean not null default true, reminders_enabled boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  last_updated_by uuid not null references public.profiles(id)
);
create table public.dose_confirmations (
  occurrence_key text primary key,
  medication_plan_id uuid not null references public.medication_plans(id),
  medication_plan_version integer not null check (medication_plan_version > 0),
  patient_id uuid not null references public.profiles(id),
  scheduled_at timestamptz not null check (isfinite(scheduled_at)), confirmed_at timestamptz not null default now(),
  corrected_at timestamptz,
  unique (medication_plan_id,medication_plan_version,scheduled_at)
);
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id),
  role text not null check (role in ('user','assistant')),
  text text not null check (length(trim(text)) between 1 and 10000),
  created_at timestamptz not null default now()
);
create table public.order_revisions (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('appointment','medication')),
  record_id uuid not null, patient_id uuid not null references public.profiles(id),
  version integer not null, payload jsonb not null,
  changed_by uuid not null references public.profiles(id), changed_at timestamptz not null default now(),
  unique (kind,record_id,version)
);
create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  device_id text not null check (length(device_id) between 1 and 200),
  last_seen_at timestamptz not null default now()
);
create table public.notification_deliveries (
  delivery_key text primary key, patient_id uuid not null references public.profiles(id),
  kind text not null check (kind in ('appointment','medication')),
  record_id uuid not null, version integer not null, scheduled_at timestamptz not null,
  device_token_id uuid references public.device_tokens(id) on delete set null,
  device_id text not null,
  status text not null default 'claimed' check (status in ('claimed','sent','error','stale')),
  attempted_at timestamptz not null default now(), receipt_id text, error_code text
);
create index on public.appointments(patient_id,scheduled_at);
create index on public.medication_plans(patient_id,is_active);
create index on public.dose_confirmations(patient_id,scheduled_at);
create index on public.chat_messages(patient_id,created_at);
create index on public.doctor_patients(patient_id);

-- Helpers never accept a role from the client and do not expose profile records.
create function private.is_doctor() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'doctor')
$$;
create function private.is_patient() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'patient')
$$;
create function private.manages_patient(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_doctor() and exists(select 1 from public.doctor_patients d
    join public.profiles p on p.id = d.patient_id and p.role = 'patient'
    where d.doctor_id = auth.uid() and d.patient_id = target)
$$;
create function private.can_read_patient(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (auth.uid() = target and private.is_patient()) or private.manages_patient(target)
$$;

alter table public.profiles enable row level security;
alter table public.doctor_patients enable row level security;
alter table public.appointments enable row level security;
alter table public.medication_plans enable row level security;
alter table public.dose_confirmations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.order_revisions enable row level security;
alter table public.device_tokens enable row level security;
alter table public.notification_deliveries enable row level security;
revoke all on public.profiles,public.doctor_patients,public.appointments,public.medication_plans,
  public.dose_confirmations,public.chat_messages,public.order_revisions,public.device_tokens,
  public.notification_deliveries from anon,authenticated;
grant select on public.profiles,public.doctor_patients,public.appointments,public.medication_plans,
  public.dose_confirmations,public.chat_messages,public.order_revisions,public.device_tokens,
  public.notification_deliveries to authenticated;
grant all on public.profiles,public.doctor_patients,public.appointments,public.medication_plans,
  public.dose_confirmations,public.chat_messages,public.order_revisions,public.device_tokens,
  public.notification_deliveries to service_role;
grant usage,select on sequence public.order_revisions_id_seq to service_role;
grant usage on schema private to authenticated,service_role;
grant execute on function private.is_doctor(),private.is_patient(),private.manages_patient(uuid),private.can_read_patient(uuid) to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (
  id = auth.uid() or private.manages_patient(id) or
  (private.is_patient() and role = 'doctor' and exists(select 1 from public.doctor_patients d where d.doctor_id = profiles.id and d.patient_id = auth.uid()))
);
create policy assignments_read on public.doctor_patients for select to authenticated using (doctor_id = auth.uid() or patient_id = auth.uid());
create policy appointments_read on public.appointments for select to authenticated using (private.can_read_patient(patient_id));
create policy medication_read on public.medication_plans for select to authenticated using (private.can_read_patient(patient_id));
create policy confirmations_read on public.dose_confirmations for select to authenticated using (private.can_read_patient(patient_id));
create policy chat_read on public.chat_messages for select to authenticated using (patient_id = auth.uid() and private.is_patient());
create policy revisions_read on public.order_revisions for select to authenticated using (private.can_read_patient(patient_id));
create policy tokens_read on public.device_tokens for select to authenticated using (user_id = auth.uid());
create policy deliveries_read on public.notification_deliveries for select to authenticated using (patient_id = auth.uid());

-- Defensive triggers also enforce provenance/version if a future write path is added.
create function private.guard_order() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.version <> 1 then raise exception 'Initial version must be 1'; end if;
    if not exists(select 1 from public.profiles where id = new.doctor_id and role = 'doctor') then raise exception 'Creator must be a doctor'; end if;
    if not exists(select 1 from public.profiles where id = new.patient_id and role = 'patient') then raise exception 'Owner must be a patient'; end if;
  else
    if new.doctor_id <> old.doctor_id or new.patient_id <> old.patient_id then raise exception 'Order provenance is immutable'; end if;
    if new.version < old.version or new.version > old.version + 1 then raise exception 'Invalid order version'; end if;
    -- Acknowledgment alone is the only permitted same-version appointment update.
    if new.version = old.version and
      ((to_jsonb(new) - 'acknowledged_at' - 'acknowledged_version') is distinct from (to_jsonb(old) - 'acknowledged_at' - 'acknowledged_version')) then
      raise exception 'Clinical edits must increment version';
    end if;
  end if;
  return new;
end $$;
create trigger appointments_guard before insert or update on public.appointments for each row execute function private.guard_order();
create trigger medications_guard before insert or update on public.medication_plans for each row execute function private.guard_order();
create function private.audit_order() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.version <> old.version then
    insert into public.order_revisions(kind,record_id,patient_id,version,payload,changed_by)
    values (case when tg_table_name = 'appointments' then 'appointment' else 'medication' end,
      new.id,new.patient_id,new.version,to_jsonb(new),new.last_updated_by);
  end if;
  return new;
end $$;
create trigger appointments_audit after insert or update on public.appointments for each row execute function private.audit_order();
create trigger medications_audit after insert or update on public.medication_plans for each row execute function private.audit_order();

create function public.save_appointment(p_input jsonb,p_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare target uuid := (p_input->>'patient_id')::uuid; existing public.appointments; saved uuid;
begin
  if not private.manages_patient(target) then raise exception 'Assigned doctor required' using errcode = '42501'; end if;
  if p_id is null then
    insert into public.appointments(patient_id,doctor_id,title,scheduled_at,hospital_name,department,location_detail,hospital_address,hospital_phone,preparation_note,status,reminders_enabled,last_updated_by)
    values (target,auth.uid(),p_input->>'title',(p_input->>'scheduled_at')::timestamptz,p_input->>'hospital_name',p_input->>'department',
      nullif(p_input->>'location_detail',''),nullif(p_input->>'hospital_address',''),nullif(p_input->>'hospital_phone',''),nullif(p_input->>'preparation_note',''),
      coalesce(p_input->>'status','scheduled'),coalesce((p_input->>'reminders_enabled')::boolean,true),auth.uid()) returning id into saved;
  else
    select * into existing from public.appointments where id = p_id for update;
    if not found or existing.patient_id <> target then raise exception 'Appointment unavailable' using errcode = '42501'; end if;
    update public.appointments set title = p_input->>'title',scheduled_at = (p_input->>'scheduled_at')::timestamptz,
      hospital_name = p_input->>'hospital_name',department = p_input->>'department',location_detail = nullif(p_input->>'location_detail',''),
      hospital_address = nullif(p_input->>'hospital_address',''),hospital_phone = nullif(p_input->>'hospital_phone',''),preparation_note = nullif(p_input->>'preparation_note',''),
      status = coalesce(p_input->>'status','scheduled'),reminders_enabled = coalesce((p_input->>'reminders_enabled')::boolean,true),
      version = existing.version + 1,acknowledged_version = null,acknowledged_at = null,updated_at = now(),last_updated_by = auth.uid()
    where id = p_id returning id into saved;
  end if;
  return saved;
end $$;
create function public.cancel_appointment(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare existing public.appointments;
begin
  select * into existing from public.appointments where id = p_id for update;
  if not found or not private.manages_patient(existing.patient_id) then raise exception 'Assigned doctor required' using errcode = '42501'; end if;
  if existing.status = 'cancelled' then return; end if;
  update public.appointments set status = 'cancelled',version = version + 1,acknowledged_at = null,acknowledged_version = null,updated_at = now(),last_updated_by = auth.uid() where id = p_id;
end $$;
create function public.save_medication(p_input jsonb,p_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare target uuid := (p_input->>'patient_id')::uuid; existing public.medication_plans; saved uuid;
  slots text[] := array(select jsonb_array_elements_text(p_input->'time_slots'));
  days integer[] := case when jsonb_typeof(p_input->'weekdays') = 'array' then array(select jsonb_array_elements_text(p_input->'weekdays')::integer) else null end;
begin
  if not private.manages_patient(target) then raise exception 'Assigned doctor required' using errcode = '42501'; end if;
  if p_id is null then
    insert into public.medication_plans(patient_id,doctor_id,medicine_name,strength_value,strength_unit,amount_per_dose,amount_unit,meal_instruction,instructions,note,start_date,end_date,time_slots,weekdays,time_zone,is_active,reminders_enabled,last_updated_by)
    values (target,auth.uid(),p_input->>'medicine_name',nullif(p_input->>'strength_value',''),nullif(p_input->>'strength_unit',''),p_input->>'amount_per_dose',p_input->>'amount_unit',p_input->>'meal_instruction',
      nullif(p_input->>'instructions',''),nullif(p_input->>'note',''),(p_input->>'start_date')::date,nullif(p_input->>'end_date','')::date,slots,days,
      coalesce(p_input->>'time_zone','Asia/Bangkok'),coalesce((p_input->>'is_active')::boolean,true),coalesce((p_input->>'reminders_enabled')::boolean,true),auth.uid()) returning id into saved;
  else
    select * into existing from public.medication_plans where id = p_id for update;
    if not found or existing.patient_id <> target then raise exception 'Medication unavailable' using errcode = '42501'; end if;
    update public.medication_plans set medicine_name = p_input->>'medicine_name',strength_value = nullif(p_input->>'strength_value',''),strength_unit = nullif(p_input->>'strength_unit',''),
      amount_per_dose = p_input->>'amount_per_dose',amount_unit = p_input->>'amount_unit',meal_instruction = p_input->>'meal_instruction',instructions = nullif(p_input->>'instructions',''),note = nullif(p_input->>'note',''),
      start_date = (p_input->>'start_date')::date,end_date = nullif(p_input->>'end_date','')::date,time_slots = slots,weekdays = days,time_zone = coalesce(p_input->>'time_zone','Asia/Bangkok'),
      is_active = coalesce((p_input->>'is_active')::boolean,true),reminders_enabled = coalesce((p_input->>'reminders_enabled')::boolean,true),version = existing.version + 1,updated_at = now(),last_updated_by = auth.uid()
    where id = p_id returning id into saved;
  end if;
  return saved;
end $$;
create function public.deactivate_medication(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare existing public.medication_plans;
begin
  select * into existing from public.medication_plans where id = p_id for update;
  if not found or not private.manages_patient(existing.patient_id) then raise exception 'Assigned doctor required' using errcode = '42501'; end if;
  if not existing.is_active then return; end if;
  update public.medication_plans set is_active = false,version = version + 1,updated_at = now(),last_updated_by = auth.uid() where id = p_id;
end $$;
create function public.confirm_dose(p_plan_id uuid,p_version integer,p_scheduled_at timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare plan public.medication_plans; local_time timestamp; key text;
begin
  select * into plan from public.medication_plans where id = p_plan_id for share;
  if not found or plan.patient_id <> auth.uid() or not private.is_patient() then raise exception 'Own patient schedule required' using errcode = '42501'; end if;
  if not plan.is_active or plan.version <> p_version then raise exception 'Schedule has changed; refresh first'; end if;
  if p_scheduled_at > now() + interval '15 minutes' then raise exception 'Cannot confirm a future dose more than 15 minutes early'; end if;
  local_time := p_scheduled_at at time zone plan.time_zone;
  if local_time::date < plan.start_date or (plan.end_date is not null and local_time::date > plan.end_date)
    or not (to_char(local_time,'HH24:MI') = any(plan.time_slots))
    or date_part('second',local_time) <> 0
    or (plan.weekdays is not null and not (extract(dow from local_time)::integer = any(plan.weekdays))) then raise exception 'Not a prescribed occurrence'; end if;
  key := p_plan_id::text || ':' || p_version::text || ':' || to_char(p_scheduled_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  insert into public.dose_confirmations(occurrence_key,medication_plan_id,medication_plan_version,patient_id,scheduled_at)
  values(key,p_plan_id,p_version,auth.uid(),p_scheduled_at)
  on conflict (occurrence_key) do update set corrected_at = null,confirmed_at = now()
    where dose_confirmations.corrected_at is not null;
end $$;
create function public.correct_dose(p_occurrence_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_patient() then raise exception 'Patient required' using errcode = '42501'; end if;
  update public.dose_confirmations set corrected_at = now() where occurrence_key = p_occurrence_key and patient_id = auth.uid() and corrected_at is null;
  if not found then raise exception 'Own active confirmation unavailable' using errcode = '42501'; end if;
end $$;
create function public.acknowledge_appointment(p_id uuid,p_version integer) returns void
language plpgsql security definer set search_path = '' as $$
declare existing public.appointments;
begin
  select * into existing from public.appointments where id = p_id for update;
  if not found or existing.patient_id <> auth.uid() or not private.is_patient() then raise exception 'Own appointment required' using errcode = '42501'; end if;
  if existing.version <> p_version or existing.status <> 'scheduled' then raise exception 'Appointment changed; refresh first'; end if;
  update public.appointments set acknowledged_version = version,acknowledged_at = now() where id = p_id;
end $$;
create function public.append_chat_message(p_id uuid,p_text text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_patient() then raise exception 'Patient required' using errcode = '42501'; end if;
  insert into public.chat_messages(id,patient_id,role,text) values(p_id,auth.uid(),'user',p_text);
end $$;
create function public.register_device_token(p_token text,p_device_id text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_patient() then raise exception 'Patient required' using errcode = '42501'; end if;
  if p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' then raise exception 'Invalid Expo push token'; end if;
  if exists(select 1 from public.device_tokens where expo_push_token = p_token and user_id <> auth.uid()) then raise exception 'Device belongs to another account; sign out first'; end if;
  insert into public.device_tokens(user_id,expo_push_token,device_id) values(auth.uid(),p_token,p_device_id)
  on conflict (expo_push_token) do update set device_id = excluded.device_id,last_seen_at = now() where device_tokens.user_id = auth.uid();
end $$;
create function public.unregister_device_tokens(p_device_id text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.device_tokens where user_id = auth.uid() and (p_device_id is null or device_id = p_device_id);
end $$;

revoke all on all functions in schema private from public,anon;
grant execute on function private.positive_number(text),private.valid_slots(text[]),private.valid_weekdays(integer[]) to service_role;
revoke all on function public.save_appointment(jsonb,uuid),public.cancel_appointment(uuid),public.save_medication(jsonb,uuid),public.deactivate_medication(uuid),public.confirm_dose(uuid,integer,timestamptz),public.correct_dose(text),public.acknowledge_appointment(uuid,integer),public.append_chat_message(uuid,text),public.register_device_token(text,text),public.unregister_device_tokens(text) from public,anon;
grant execute on function public.save_appointment(jsonb,uuid),public.cancel_appointment(uuid),public.save_medication(jsonb,uuid),public.deactivate_medication(uuid),public.confirm_dose(uuid,integer,timestamptz),public.correct_dose(text),public.acknowledge_appointment(uuid,integer),public.append_chat_message(uuid,text),public.register_device_token(text,text),public.unregister_device_tokens(text) to authenticated;
