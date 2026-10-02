create or replace function public.update_conversation_after_message(
  p_conversation_id text,
  p_sender_uid text,
  p_receiver_uid text,
  p_sender_name text,
  p_receiver_name text,
  p_sender_type text,
  p_receiver_type text,
  p_content text,
  p_sent_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_unread bigint;
begin
  select case
    when coalesce("unreadCount" ->> p_receiver_uid, '') ~ '^[0-9]+$'
      then ("unreadCount" ->> p_receiver_uid)::bigint
    else 0
  end
  into current_unread
  from public.conversations
  where id = p_conversation_id
    and participants @> jsonb_build_array(p_sender_uid, p_receiver_uid)
  for update;

  if not found then
    return false;
  end if;

  update public.conversations
  set
    "lastMessage" = p_content,
    "lastMessageTime" = p_sent_at,
    "lastSenderId" = p_sender_uid,
    "unreadCount" = jsonb_set(
      coalesce("unreadCount", '{}'::jsonb),
      array[p_receiver_uid],
      to_jsonb(current_unread + 1),
      true
    ),
    "participantNames" = coalesce("participantNames", '{}'::jsonb)
      || jsonb_build_object(
        p_sender_uid, p_sender_name,
        p_receiver_uid, p_receiver_name
      ),
    "participantTypes" = coalesce("participantTypes", '{}'::jsonb)
      || jsonb_build_object(
        p_sender_uid, p_sender_type,
        p_receiver_uid, p_receiver_type
      ),
    "updatedAt" = p_sent_at
  where id = p_conversation_id;

  return true;
end;
$$;

revoke all on function public.update_conversation_after_message(
  text, text, text, text, text, text, text, text, timestamptz
) from public;
revoke all on function public.update_conversation_after_message(
  text, text, text, text, text, text, text, text, timestamptz
) from anon;
revoke all on function public.update_conversation_after_message(
  text, text, text, text, text, text, text, text, timestamptz
) from authenticated;
grant execute on function public.update_conversation_after_message(
  text, text, text, text, text, text, text, text, timestamptz
) to service_role;
