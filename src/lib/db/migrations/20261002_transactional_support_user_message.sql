create or replace function public.insert_support_user_message(
  p_message_id text,
  p_notification_id text,
  p_conversation_id text,
  p_sender_uid text,
  p_sender_name text,
  p_sender_type text,
  p_message text,
  p_sent_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  conversation_row public.support_conversations%rowtype;
  preview_text text;
begin
  select *
  into conversation_row
  from public.support_conversations
  where id = p_conversation_id
    and "userId" = p_sender_uid
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
    p_sender_type,
    p_message,
    p_sent_at,
    false
  );

  update public.support_conversations
  set
    "lastMessage" = p_message,
    "lastMessageTime" = p_sent_at,
    "updatedAt" = p_sent_at,
    "unreadCount" = coalesce("unreadCount", 0) + 1,
    status = case when status = 'resolved' then 'open' else status end
  where id = p_conversation_id;

  preview_text := case
    when char_length(p_message) > 50 then left(p_message, 50) || '...'
    else p_message
  end;

  insert into public.notifications (
    id,
    "userId",
    title,
    body,
    message,
    type,
    "senderName",
    "senderId",
    "senderType",
    "conversationId",
    link,
    "isRead",
    "createdAt",
    "updatedAt",
    priority,
    category
  )
  values (
    p_notification_id,
    'system',
    'New support message',
    p_sender_name || ': ' || preview_text,
    p_sender_name || ': ' || preview_text,
    'support',
    p_sender_name,
    p_sender_uid,
    p_sender_type,
    p_conversation_id,
    '/dashboard/admin/support?conversation=' || p_conversation_id,
    false,
    p_sent_at,
    p_sent_at,
    coalesce(conversation_row.priority, 'medium'),
    coalesce(conversation_row.category, 'general')
  );

  return true;
end;
$$;

revoke all on function public.insert_support_user_message(
  text, text, text, text, text, text, text, timestamptz
) from public;
revoke all on function public.insert_support_user_message(
  text, text, text, text, text, text, text, timestamptz
) from anon;
revoke all on function public.insert_support_user_message(
  text, text, text, text, text, text, text, timestamptz
) from authenticated;
grant execute on function public.insert_support_user_message(
  text, text, text, text, text, text, text, timestamptz
) to service_role;
