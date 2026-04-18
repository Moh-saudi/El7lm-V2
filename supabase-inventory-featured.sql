alter table if exists public.inventory
add column if not exists featured boolean default false;

update public.inventory
set featured = false
where featured is null;
