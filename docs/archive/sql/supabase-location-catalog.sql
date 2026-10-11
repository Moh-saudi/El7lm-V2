-- Global location catalogue shared by web and mobile.
-- Import writes must use the service role. Client roles receive SELECT only.

create table if not exists public.location_countries (
  iso2 text primary key check (char_length(iso2) = 2),
  iso3 text unique,
  geoname_id bigint unique,
  name text not null,
  name_ar text,
  phone_code text,
  currency_code text,
  flag_emoji text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.location_regions (
  geoname_id bigint primary key,
  country_iso2 text not null references public.location_countries(iso2)
    on update cascade on delete cascade,
  admin1_code text not null,
  name text not null,
  name_ar text,
  updated_at timestamptz not null default now(),
  unique (country_iso2, admin1_code)
);

create table if not exists public.location_cities (
  geoname_id bigint primary key,
  country_iso2 text not null references public.location_countries(iso2)
    on update cascade on delete cascade,
  region_geoname_id bigint references public.location_regions(geoname_id)
    on update cascade on delete set null,
  admin1_code text,
  name text not null,
  name_ar text,
  ascii_name text,
  latitude double precision,
  longitude double precision,
  population bigint not null default 0,
  timezone text,
  updated_at timestamptz not null default now()
);

create index if not exists location_regions_country_idx
  on public.location_regions(country_iso2, name);
create index if not exists location_cities_country_population_idx
  on public.location_cities(country_iso2, population desc);
create index if not exists location_cities_region_population_idx
  on public.location_cities(region_geoname_id, population desc);
create index if not exists location_cities_country_name_idx
  on public.location_cities(country_iso2, lower(name));
create index if not exists location_cities_country_ascii_name_idx
  on public.location_cities(country_iso2, lower(ascii_name));

alter table public.location_countries enable row level security;
alter table public.location_regions enable row level security;
alter table public.location_cities enable row level security;

drop policy if exists "location countries are publicly readable"
  on public.location_countries;
create policy "location countries are publicly readable"
  on public.location_countries for select to anon, authenticated
  using (is_active = true);

drop policy if exists "location regions are publicly readable"
  on public.location_regions;
create policy "location regions are publicly readable"
  on public.location_regions for select to anon, authenticated
  using (true);

drop policy if exists "location cities are publicly readable"
  on public.location_cities;
create policy "location cities are publicly readable"
  on public.location_cities for select to anon, authenticated
  using (true);

grant select on public.location_countries to anon, authenticated;
grant select on public.location_regions to anon, authenticated;
grant select on public.location_cities to anon, authenticated;
revoke insert, update, delete on public.location_countries from anon, authenticated;
revoke insert, update, delete on public.location_regions from anon, authenticated;
revoke insert, update, delete on public.location_cities from anon, authenticated;

create or replace function public.search_location_cities(
  p_country_iso2 text,
  p_query text default '',
  p_region_geoname_id bigint default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns setof public.location_cities
language sql
stable
security invoker
set search_path = public
as $$
  select city.*
  from public.location_cities city
  where city.country_iso2 = upper(p_country_iso2)
    and (p_region_geoname_id is null
      or city.region_geoname_id = p_region_geoname_id)
    and (coalesce(trim(p_query), '') = ''
      or city.name ilike '%' || trim(p_query) || '%'
      or city.ascii_name ilike '%' || trim(p_query) || '%'
      or city.name_ar ilike '%' || trim(p_query) || '%')
  order by city.population desc, city.name
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.search_location_cities(text, text, bigint, integer, integer)
  to anon, authenticated;
