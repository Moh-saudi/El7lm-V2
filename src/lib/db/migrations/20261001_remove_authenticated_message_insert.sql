-- Remove direct authenticated writes to messages.
-- Message creation is authorized and persisted through /api/messages/send.

drop policy if exists messages_insert_sender on public.messages;
revoke insert on table public.messages from authenticated;
