-- Remove direct authenticated writes to notifications.
-- Notification creation now flows through authorized server-side endpoints.

drop policy if exists notifications_insert_sender on public.notifications;
revoke insert on table public.notifications from authenticated;
