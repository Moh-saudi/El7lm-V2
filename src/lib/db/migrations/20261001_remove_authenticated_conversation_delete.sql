-- Authenticated clients do not delete conversations directly.

revoke delete on table public.conversations from authenticated;
