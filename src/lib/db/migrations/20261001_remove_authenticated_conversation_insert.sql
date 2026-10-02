-- Conversation creation is authorized and persisted through server-side APIs.
-- Authenticated clients retain participant-scoped SELECT/UPDATE only.

drop policy if exists conversation_participant_insert on public.conversations;
revoke insert on table public.conversations from authenticated;
