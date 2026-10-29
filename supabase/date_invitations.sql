-- Optional, separate Supabase project is recommended for KeepMemo invitations.
-- Run this in that project's SQL editor. The browser uses only the public anon
-- key; direct table access is blocked and all writes/reads go through RPCs.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.keepmemo_date_invitations (
  id uuid primary key,
  public_token_hash text not null unique,
  owner_token_hash text not null,
  recipient_name text not null default '',
  message text not null,
  date_options jsonb not null,
  activity_options jsonb not null,
  chosen_date text,
  chosen_activity text,
  recipient_note text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

alter table public.keepmemo_date_invitations enable row level security;
revoke all on public.keepmemo_date_invitations from anon, authenticated;

create or replace function public.keepmemo_create_date_invitation(
  p_invitation_id uuid,
  p_public_token text,
  p_owner_token text,
  p_invitation jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text := coalesce(p_invitation->>'recipient_name', '');
  v_message text := coalesce(p_invitation->>'message', '');
  v_dates jsonb := p_invitation->'date_options';
  v_activities jsonb := p_invitation->'activity_options';
begin
  if length(p_public_token) < 30 or length(p_owner_token) < 30 then
    raise exception 'Invalid invitation credentials';
  end if;
  if length(v_name) > 80 or length(v_message) < 1 or length(v_message) > 1000 then
    raise exception 'Invalid invitation text';
  end if;
  if coalesce(jsonb_typeof(v_dates), '') <> 'array' or jsonb_array_length(v_dates) < 1 or jsonb_array_length(v_dates) > 8
     or coalesce(jsonb_typeof(v_activities), '') <> 'array' or jsonb_array_length(v_activities) < 1 or jsonb_array_length(v_activities) > 8 then
    raise exception 'Invalid invitation choices';
  end if;
  if exists (select 1 from jsonb_array_elements_text(v_dates) as choices(value) where length(value) > 100)
     or exists (select 1 from jsonb_array_elements_text(v_activities) as choices(value) where length(value) > 100) then
    raise exception 'Invitation choices are too long';
  end if;

  insert into public.keepmemo_date_invitations (
    id, public_token_hash, owner_token_hash, recipient_name, message,
    date_options, activity_options
  ) values (
    p_invitation_id,
    encode(extensions.digest(p_public_token, 'sha256'), 'hex'),
    encode(extensions.digest(p_owner_token, 'sha256'), 'hex'),
    v_name, v_message, v_dates, v_activities
  ) on conflict (id) do nothing;

  if not exists (
    select 1 from public.keepmemo_date_invitations
    where id = p_invitation_id
      and owner_token_hash = encode(extensions.digest(p_owner_token, 'sha256'), 'hex')
  ) then
    raise exception 'Invitation could not be published';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.keepmemo_get_date_invitation(p_public_token text)
returns jsonb
language sql
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'id', id,
    'recipient_name', recipient_name,
    'message', message,
    'date_options', date_options,
    'activity_options', activity_options,
    'responded', responded_at is not null
  )
  from public.keepmemo_date_invitations
  where public_token_hash = encode(extensions.digest(p_public_token, 'sha256'), 'hex');
$$;

create or replace function public.keepmemo_submit_date_invitation(
  p_public_token text,
  p_chosen_date text,
  p_chosen_activity text,
  p_recipient_note text default ''
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_updated integer;
begin
  if length(coalesce(p_recipient_note, '')) > 500 then
    raise exception 'Note is too long';
  end if;
  select id into v_id
  from public.keepmemo_date_invitations
  where public_token_hash = encode(extensions.digest(p_public_token, 'sha256'), 'hex')
    and date_options ? p_chosen_date
    and activity_options ? p_chosen_activity;
  if v_id is null then
    raise exception 'Invitation or selected choices are invalid';
  end if;

  update public.keepmemo_date_invitations
  set chosen_date = p_chosen_date,
      chosen_activity = p_chosen_activity,
      recipient_note = nullif(trim(coalesce(p_recipient_note, '')), ''),
      responded_at = now()
  where id = v_id and responded_at is null;
  get diagnostics v_updated = row_count;
  return jsonb_build_object('ok', v_updated = 1, 'already_responded', v_updated = 0);
end;
$$;

create or replace function public.keepmemo_get_date_invitation_response(
  p_invitation_id uuid,
  p_owner_token text
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'responded_at', responded_at,
    'chosen_date', chosen_date,
    'chosen_activity', chosen_activity,
    'recipient_note', recipient_note
  ) into v_result
  from public.keepmemo_date_invitations
  where id = p_invitation_id
    and owner_token_hash = encode(extensions.digest(p_owner_token, 'sha256'), 'hex');
  return v_result;
end;
$$;

revoke all on function public.keepmemo_create_date_invitation(uuid, text, text, jsonb) from public;
revoke all on function public.keepmemo_get_date_invitation(text) from public;
revoke all on function public.keepmemo_submit_date_invitation(text, text, text, text) from public;
revoke all on function public.keepmemo_get_date_invitation_response(uuid, text) from public;
grant execute on function public.keepmemo_create_date_invitation(uuid, text, text, jsonb) to anon, authenticated;
grant execute on function public.keepmemo_get_date_invitation(text) to anon, authenticated;
grant execute on function public.keepmemo_submit_date_invitation(text, text, text, text) to anon, authenticated;
grant execute on function public.keepmemo_get_date_invitation_response(uuid, text) to anon, authenticated;
