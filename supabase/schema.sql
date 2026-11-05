create extension if not exists pgcrypto;

create table if not exists public.vehicles (
  id text primary key,
  vehicle_number text not null unique,
  name text not null,
  vehicle_type text not null,
  registration_number text not null unique,
  driver_name text not null,
  status text not null check (status in ('moving', 'idle', 'warning', 'offline')),
  latitude double precision not null,
  longitude double precision not null,
  fuel_level integer not null check (fuel_level between 0 and 100),
  battery_level integer,
  ignition_on boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id text primary key,
  vehicle_id text not null references public.vehicles(id) on delete cascade,
  start_location text not null,
  end_location text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  distance_km double precision not null default 0,
  duration_minutes integer not null default 0,
  average_speed_kmh double precision not null default 0,
  max_speed_kmh double precision not null default 0,
  idle_minutes integer not null default 0,
  halt_count integer not null default 0,
  overspeed_events integer not null default 0,
  trip_status text not null check (trip_status in ('completed', 'in_progress', 'scheduled')),
  created_at timestamptz not null default now()
);

create table if not exists public.trip_points (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  recorded_at timestamptz not null,
  sequence_number integer not null check (sequence_number >= 1)
);

create index if not exists vehicles_status_idx on public.vehicles (status);
create index if not exists trips_vehicle_idx on public.trips (vehicle_id, start_time desc);
create index if not exists trip_points_trip_idx on public.trip_points (trip_id, sequence_number);

alter table public.vehicles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_points enable row level security;

create policy "Authenticated users can read all vehicles" on public.vehicles
for select to authenticated using (true);

create policy "Authenticated users can read all trips" on public.trips
for select to authenticated using (true);

create policy "Authenticated users can read all trip points" on public.trip_points
for select to authenticated using (true);

create policy "No anonymous access to vehicles" on public.vehicles
for all to anon using (false) with check (false);

create policy "No anonymous access to trips" on public.trips
for all to anon using (false) with check (false);

create policy "No anonymous access to trip points" on public.trip_points
for all to anon using (false) with check (false);
