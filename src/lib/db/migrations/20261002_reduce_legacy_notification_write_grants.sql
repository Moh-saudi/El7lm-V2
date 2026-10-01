revoke delete on table public.interaction_notifications from authenticated;

revoke update on table public.player_notifications from authenticated;
grant update ("isRead") on table public.player_notifications to authenticated;
