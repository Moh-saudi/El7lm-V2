-- Restrict SECURITY DEFINER organization-join RPCs to signed-in/server roles only.

revoke all on function public.approve_organization_join(text) from public, anon;
revoke all on function public.reject_organization_join(text) from public, anon;
revoke all on function public.release_player_from_organization(text) from public, anon;
revoke all on function public.request_organization_join(text) from public, anon;

grant execute on function public.approve_organization_join(text) to authenticated, service_role;
grant execute on function public.reject_organization_join(text) to authenticated, service_role;
grant execute on function public.release_player_from_organization(text) to authenticated, service_role;
grant execute on function public.request_organization_join(text) to authenticated, service_role;
