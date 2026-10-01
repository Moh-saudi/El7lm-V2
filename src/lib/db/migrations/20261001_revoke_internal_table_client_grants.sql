-- Internal server-side tables should not be reachable through the client Data API.

revoke all privileges on table public.media_moderation from anon, authenticated;
revoke all privileges on table public.payment_targets from anon, authenticated;
revoke all privileges on table public.phone_accounts_index from anon, authenticated;
revoke all privileges on table public.subscriptions from anon, authenticated;
