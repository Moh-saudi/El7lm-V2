create or replace function public.mark_join_request_notification_read(p_notification_id text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed boolean := false;
begin
  update public.join_request_notifications
  set "isRead" = true
  where id::text = p_notification_id
    and (
      "playerId" = auth.uid()::text
      or "organizationId" = auth.uid()::text
    )
    and coalesce("isRead", false) = false;

  changed := found;
  return changed;
end;
$$;

revoke all on function public.mark_join_request_notification_read(text) from public;
revoke all on function public.mark_join_request_notification_read(text) from anon;
grant execute on function public.mark_join_request_notification_read(text) to authenticated;

revoke update on table public.join_request_notifications from authenticated;

drop policy if exists join_notification_participant_update on public.join_request_notifications;
