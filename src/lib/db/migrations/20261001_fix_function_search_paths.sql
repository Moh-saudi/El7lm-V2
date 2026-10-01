-- Pin search_path for public functions flagged by the database security advisor.

alter function public.decrement_video_likes(text) set search_path = public, pg_temp;
alter function public.increment_video_likes(text) set search_path = public, pg_temp;
alter function public.increment_video_views(text) set search_path = public, pg_temp;
alter function public.validate_organization_referral_owner() set search_path = public, pg_temp;
