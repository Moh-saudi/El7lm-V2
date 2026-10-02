-- Keep conversation access limited to participants (and admins via admin_full_access).
-- These legacy permissive policies effectively bypassed participant ownership.
drop policy if exists "users_all_insert_conversations" on public.conversations;
drop policy if exists "users_all_select_conversations" on public.conversations;
drop policy if exists "users_all_update_conversations" on public.conversations;
