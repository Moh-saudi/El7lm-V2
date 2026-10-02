-- Prevent authenticated conversation participants from changing the participant list.
-- Server-side/service-role writes and admins remain allowed.

create or replace function private.guard_conversation_participants_immutable()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
begin
  if new.participants is distinct from old.participants
     and auth.uid() is not null
     and not private.is_admin()
  then
    raise exception 'Conversation participants cannot be changed by clients'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_conversation_participants_immutable on public.conversations;

create trigger guard_conversation_participants_immutable
before update of participants on public.conversations
for each row
execute function private.guard_conversation_participants_immutable();
