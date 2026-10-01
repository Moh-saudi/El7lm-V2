create or replace function public.insert_message_and_update_conversation(
  p_message jsonb,
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
  effective_message jsonb;
begin
  if coalesce(nullif(trim(p_message ->> 'id'), ''), '') = '' then
    raise exception 'message id is required';
  end if;

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

  effective_message :=
    coalesce(p_message, '{}'::jsonb)
    || jsonb_build_object(
      'conversationId', p_conversation_id,
      'senderId', p_sender_uid,
      'receiverId', p_receiver_uid,
      'senderName', p_sender_name,
      'receiverName', p_receiver_name,
      'senderType', p_sender_type,
      'receiverType', p_receiver_type,
      'receiverAccountType', p_receiver_type,
      'content', p_content,
      'message', p_content,
      'deliveryStatus', 'sent',
      'read', false,
      'isRead', false,
      'createdAt', p_sent_at,
      'updatedAt', p_sent_at,
      'timestamp', p_sent_at
    );

  insert into public.messages
  select *
  from jsonb_populate_record(null::public.messages, effective_message);

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

revoke all on function public.insert_message_and_update_conversation(
  jsonb, text, text, text, text, text, text, text, text, timestamptz
) from public;
revoke all on function public.insert_message_and_update_conversation(
  jsonb, text, text, text, text, text, text, text, text, timestamptz
) from anon;
revoke all on function public.insert_message_and_update_conversation(
  jsonb, text, text, text, text, text, text, text, text, timestamptz
) from authenticated;
grant execute on function public.insert_message_and_update_conversation(
  jsonb, text, text, text, text, text, text, text, text, timestamptz
) to service_role;

drop function if exists public.update_conversation_after_message(
  text, text, text, text, text, text, text, text, timestamptz
);
