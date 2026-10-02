revoke insert, update, delete on table public.support_conversations from authenticated;
revoke insert, update, delete on table public.support_messages from authenticated;

drop policy if exists support_owner_insert on public.support_conversations;
drop policy if exists support_owner_update on public.support_conversations;
drop policy if exists support_message_owner_insert on public.support_messages;
drop policy if exists support_message_owner_update on public.support_messages;
