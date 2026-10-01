-- Conversation state mutations are handled by authorized server-side APIs.

drop policy if exists conversation_participant_update on public.conversations;
revoke update on table public.conversations from authenticated;
