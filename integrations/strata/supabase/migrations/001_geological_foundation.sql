-- Reference Supabase/PostGIS deployment schema. NOT applied to the Sites D1 runtime.
-- No external records are seeded. Activate a provider only after registry verification.
create extension if not exists postgis;
create table public.users(id uuid primary key references auth.users(id) on delete cascade, display_name text);
create table public.source_licences(id text primary key, name text not null, url text not null, attribution text not null, commercial_use text not null, redistribution text not null);
create table public.data_sources(id text primary key, provider text not null, dataset text not null, licence_id text references public.source_licences(id), authority char(1) check(authority in ('A','B','C','D','E')), approved boolean not null default false, metadata jsonb not null default '{}');
create table public.source_sync_status(source_id text primary key references public.data_sources(id), version text, publication_date text, retrieved_at timestamptz, last_success timestamptz, last_error text, checksum text);
create table public.minerals(id text primary key, standardized_name text not null, italian_name text, source_id text not null references public.data_sources(id), source_record_id text not null, raw_metadata jsonb not null);
create table public.mineral_properties(id uuid primary key default gen_random_uuid(), mineral_id text not null references public.minerals(id), property text not null, value jsonb not null, source_id text not null references public.data_sources(id), source_record_id text, references_json jsonb not null default '[]', retrieved_at timestamptz not null, unique(mineral_id,property,source_id));
create table public.mineral_images(id uuid primary key default gen_random_uuid(), mineral_id text references public.minerals(id), original_url text not null, author text not null, licence text not null, attribution text not null, source_id text not null references public.data_sources(id));
create table public.mineral_occurrences(id uuid primary key default gen_random_uuid(), mineral_id text references public.minerals(id), geom geometry(Geometry,4326) not null, occurrence_type text not null check(occurrence_type in ('documented','historical_documented','geological_potential','community_reported','inferred')), confidence text not null, commodity text, original_classification text, source_id text not null references public.data_sources(id), source_record_id text not null, source_reference text, source_date text, licence text not null, raw_metadata jsonb not null, retrieved_at timestamptz not null, unique(source_id,source_record_id,mineral_id));
create index mineral_occurrences_geom on public.mineral_occurrences using gist(geom);
create index mineral_occurrences_mineral on public.mineral_occurrences(mineral_id);
create table public.geological_units(id uuid primary key default gen_random_uuid(), name text, lithology text, age text, source_id text not null references public.data_sources(id), source_record_id text not null, licence text not null, references_json jsonb not null default '[]', raw_metadata jsonb not null, unique(source_id,source_record_id));
create table public.geological_geometries(id uuid primary key default gen_random_uuid(), unit_id uuid not null references public.geological_units(id), geom geometry(Geometry,4326) not null);
create index geological_geometries_geom on public.geological_geometries using gist(geom);
create table public.geological_structures(id uuid primary key default gen_random_uuid(), geom geometry(Geometry,4326) not null, classification text, source_id text not null references public.data_sources(id), source_record_id text not null, licence text not null, raw_metadata jsonb not null);
create index geological_structures_geom on public.geological_structures using gist(geom);
create table public.mines(id uuid primary key default gen_random_uuid(), name text, geom geometry(Geometry,4326) not null, occurrence_type text, activity_status text not null default 'unknown', status_date text, commodity text, access text not null default 'unknown', ownership text not null default 'unknown', collecting_permission text not null default 'unknown', protected_status text not null default 'unknown', routing_access text not null default 'unknown', safety text not null default 'unknown', source_id text not null references public.data_sources(id), source_record_id text not null, licence text not null, raw_metadata jsonb not null);
create index mines_geom on public.mines using gist(geom);
create table public.quarries (like public.mines including all);
create table public.geological_pois (like public.mines including all);
-- Retain all source evidence when reconciling; never overwrite conflicting classifications.
create table public.evidence_links(id uuid primary key default gen_random_uuid(), entity_type text not null, canonical_id uuid not null, source_id text not null references public.data_sources(id), source_record_id text not null, classification text, conflict boolean not null default false, raw_metadata jsonb not null);
create table public.saved_locations(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, geom geometry(Point,4326) not null, elevation double precision, elevation_source text, observed_at date, notes text, access_notes text, specimen_quality text, observed_abundance text, visibility text not null default 'private' check(visibility in ('private','shared','public')), obscure_coordinates boolean not null default true, created_at timestamptz not null default now());
create index saved_locations_user on public.saved_locations(user_id);
create index saved_locations_geom on public.saved_locations using gist(geom);
create table public.saved_location_minerals(location_id uuid references public.saved_locations(id) on delete cascade, mineral_id text references public.minerals(id), relationship text check(relationship in ('found','sought')), primary key(location_id,mineral_id,relationship));
create table public.user_photos(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, object_key text not null unique, content_type text not null, location_id uuid references public.saved_locations(id), created_at timestamptz not null default now());
create table public.collection_specimens(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, mineral_id text references public.minerals(id), identification_text text, location_id uuid references public.saved_locations(id), geom geometry(Point,4326), collection_date date, notes text, weight_g double precision check(weight_g>=0), dimensions_mm jsonb, host_rock text, associated_minerals jsonb, catalogue_number text, created_at timestamptz not null default now());
create index collection_specimens_user on public.collection_specimens(user_id);
create table public.community_reports(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, mineral_id text references public.minerals(id), geom geometry(Point,4326) not null, observed_at date, notes text, user_confidence text not null, moderation_status text not null default 'pending', authority char(1) not null default 'E' check(authority='E'), visibility text not null default 'private', obscure_coordinates boolean not null default true, created_at timestamptz not null default now());
create index community_reports_user on public.community_reports(user_id);
create table public.favorites(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, location_id uuid references public.saved_locations(id), source_id text references public.data_sources(id), source_record_id text);
create table public.user_settings(user_id uuid primary key references auth.users(id) on delete cascade, settings jsonb not null default '{}');
create table public.saved_parking_locations(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, geom geometry(Point,4326) not null, accuracy_m double precision, saved_at timestamptz not null default now());
-- No anonymous access to any personal geometry. Sharing needs a separate scrubbed projection.
do $$ declare t text; begin
 foreach t in array array['saved_locations','user_photos','collection_specimens','community_reports','favorites','user_settings','saved_parking_locations'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy owner_only on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',t);
 end loop;
end $$;
alter table public.users enable row level security;
create policy own_profile on public.users for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
alter table public.saved_location_minerals enable row level security;
create policy own_location_minerals on public.saved_location_minerals for all to authenticated using(exists(select 1 from public.saved_locations s where s.id=location_id and s.user_id=auth.uid())) with check(exists(select 1 from public.saved_locations s where s.id=location_id and s.user_id=auth.uid()));
-- All scientific tables are server-ingest-only by default. No accidental client writes.
do $$ declare t text; begin
 foreach t in array array['source_licences','data_sources','source_sync_status','minerals','mineral_properties','mineral_images','mineral_occurrences','geological_units','geological_geometries','geological_structures','mines','quarries','geological_pois','evidence_links'] loop
  execute format('alter table public.%I enable row level security',t);
 end loop;
end $$;
create or replace function public.occurrences_in_view(west double precision,south double precision,east double precision,north double precision,mineral_filter text default null)
returns setof public.mineral_occurrences language sql stable security invoker set search_path=public as $$
 select o.* from public.mineral_occurrences o join public.data_sources s on s.id=o.source_id where s.approved and o.geom && ST_MakeEnvelope(west,south,east,north,4326) and (mineral_filter is null or o.mineral_id=mineral_filter) limit 500
$$;
-- Invoke via a server-only service role after bbox validation; never expose service keys.
alter table public.quarries add foreign key(source_id) references public.data_sources(id);
alter table public.geological_pois add foreign key(source_id) references public.data_sources(id);
