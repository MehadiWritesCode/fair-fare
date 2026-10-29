-- বাহনের ধরন (enum, তাই জেনারেট করা টাইপে ঠিক মানগুলো আসবে)
create type public.vehicle_type as enum
  ('cng', 'bus', 'minibus', 'rickshaw', 'van', 'other');

-- সরকারি ভাড়ার নিয়ম। রেট বদলালে নতুন সারি যোগ হবে, পুরোনোটা মুছবে না।
create table public.fare_rules (
  id uuid primary key default gen_random_uuid(),
  vehicle_type public.vehicle_type not null
    check (vehicle_type in ('cng', 'bus', 'minibus')),
  area text not null,
  base_distance_km numeric not null default 0 check (base_distance_km >= 0),
  base_fare numeric not null default 0 check (base_fare >= 0),
  per_km_rate numeric not null check (per_km_rate >= 0),
  min_fare numeric not null default 0 check (min_fare >= 0),
  waiting_per_min numeric not null default 0 check (waiting_per_min >= 0),
  effective_from date not null,
  source_url text,
  notes text,
  created_at timestamptz not null default now()
);

create index fare_rules_lookup_idx
  on public.fare_rules (vehicle_type, area, effective_from desc);

-- ইউজারের ট্রিপ রিপোর্ট
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  vehicle_type public.vehicle_type not null,
  area text not null,
  from_lat double precision not null,
  from_lng double precision not null,
  to_lat double precision not null,
  to_lng double precision not null,
  distance_km numeric not null check (distance_km > 0 and distance_km < 200),
  asked_fare numeric check (asked_fare >= 0),
  paid_fare numeric not null check (paid_fare >= 0 and paid_fare < 100000),
  wait_minutes numeric not null default 0 check (wait_minutes >= 0),
  weather text,
  created_at timestamptz not null default now()
);

create index reports_user_idx on public.reports (user_id, created_at desc);
create index reports_vehicle_area_idx on public.reports (vehicle_type, area);

-- Row Level Security
alter table public.fare_rules enable row level security;
alter table public.reports enable row level security;

create policy "fare_rules readable by everyone"
  on public.fare_rules for select
  to anon, authenticated
  using (true);

create policy "users insert own reports"
  on public.reports for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users read own reports"
  on public.reports for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- শুরুর ডেটা। ডিপ্লয়ের আগে রেট গেজেট থেকে নিজে যাচাই করে নিও।
insert into public.fare_rules
  (vehicle_type, area, base_distance_km, base_fare, per_km_rate, min_fare,
   waiting_per_min, effective_from, source_url, notes)
values
  ('cng', 'dhaka_metro', 2, 40, 12, 40, 2, '2022-01-01',
   'https://www.tbsnews.net/node/1066706',
   'খবর থেকে নেওয়া। বর্তমান রেট গেজেট থেকে যাচাই করো।'),
  ('bus', 'dhaka_metro', 0, 0, 2.43, 10, 0, '2026-04-23',
   'https://en.prothomalo.com/amp/story/bangladesh/eal0sfls09',
   'এপ্রিল ২০২৬-এর রেট। সেপ্টেম্বর ২০২৬-এ আরও বৃদ্ধির গেজেট এসেছে, নতুন রেট যাচাই করে সারি যোগ করো।');
