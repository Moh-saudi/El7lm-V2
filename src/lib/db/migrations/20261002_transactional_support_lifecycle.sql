create or replace function public.create_support_conversation_with_welcome(
  p_conversation_id text,
  p_user_id text,
  p_user_name text,
  p_user_type text,
  p_status text,
  p_priority text,
  p_category text,
  p_welcome_message_id text,
  p_welcome_message text,
  p_created_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  insert into public.support_conversations (
    id,
    "userId",
    "userName",
    "userType",
    status,
    priority,
    category,
    "lastMessage",
    "lastMessageTime",
    "unreadCount",
    "createdAt",
    "updatedAt"
  )
  values (
    p_conversation_id,
    p_user_id,
    p_user_name,
    p_user_type,
    p_status,
    p_priority,
    p_category,
    '',
    p_created_at,
    0,
    p_created_at,
    p_created_at
  );

  insert into public.support_messages (
    id,
    "conversationId",
    "senderId",
    "senderName",
    "senderType",
    message,
    "timestamp",
    "isRead"
  )
  values (
    p_welcome_message_id,
    p_conversation_id,
    'system',
    'Support',
    'system',
    p_welcome_message,
    p_created_at,
    true
  );

  return true;
end;
$$;

revoke all on function public.create_support_conversation_with_welcome(
  text, text, text, text, text, text, text, text, text, timestamptz
) from public;
revoke all on function public.create_support_conversation_with_welcome(
  text, text, text, text, text, text, text, text, text, timestamptz
) from anon;
revoke all on function public.create_support_conversation_with_welcome(
  text, text, text, text, text, text, text, text, text, timestamptz
) from authenticated;
grant execute on function public.create_support_conversation_with_welcome(
  text, text, text, text, text, text, text, text, text, timestamptz
) to service_role;

create or replace function public.insert_support_admin_message(
  p_message_id text,
  p_conversation_id text,
  p_sender_uid text,
  p_sender_name text,
  p_message text,
  p_sent_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_status text;
begin
  select status
  into current_status
  from public.support_conversations
  where id = p_conversation_id
  for update;

  if not found then
    return false;
  end if;

  insert into public.support_messages (
    id,
    "conversationId",
    "senderId",
    "senderName",
    "senderType",
    message,
    "timestamp",
    "isRead"
  )
  values (
    p_message_id,
    p_conversation_id,
    p_sender_uid,
    p_sender_name,
    'admin',
    p_message,
    p_sent_at,
    false
  );

  update public.support_conversations
  set
    "lastMessage" = p_message,
    "lastMessageTime" = p_sent_at,
    "updatedAt" = p_sent_at,
    status = case when current_status = 'open' then 'in_progress' else current_status end
  where id = p_conversation_id;

  return true;
end;
$$;

revoke all on function public.insert_support_admin_message(
  text, text, text, text, text, timestamptz
) from public;
revoke all on function public.insert_support_admin_message(
  text, text, text, text, text, timestamptz
) from anon;
revoke all on function public.insert_support_admin_message(
  text, text, text, text, text, timestamptz
) from authenticated;
grant execute on function public.insert_support_admin_message(
  text, text, text, text, text, timestamptz
) to service_role;
