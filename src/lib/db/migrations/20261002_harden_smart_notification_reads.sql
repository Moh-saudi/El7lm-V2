create or replace function public.mark_smart_notification_read(p_notification_id text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed boolean := false;
begin
  update public.smart_notifications
  set "isRead" = true
  where id::text = p_notification_id
    and "userId" = auth.uid()::text
    and coalesce("isRead", false) = false;

  changed := found;
  return changed;
end;
$$;

revoke all on function public.mark_smart_notification_read(text) from public;
revoke all on function public.mark_smart_notification_read(text) from anon;
grant execute on function public.mark_smart_notification_read(text) to authenticated;

create or replace function public.mark_all_smart_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected integer := 0;
begin
  update public.smart_notifications
  set "isRead" = true
  where "userId" = auth.uid()::text
    and coalesce("isRead", false) = false;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.mark_all_smart_notifications_read() from public;
revoke all on function public.mark_all_smart_notifications_read() from anon;
grant execute on function public.mark_all_smart_notifications_read() to authenticated;

revoke insert, update, delete on table public.smart_notifications from authenticated;

drop policy if exists smart_owner_insert on public.smart_notifications;
drop policy if exists smart_owner_update on public.smart_notifications;
drop policy if exists smart_owner_delete on public.smart_notifications;
