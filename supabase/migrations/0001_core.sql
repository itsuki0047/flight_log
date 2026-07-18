-- コアスキーマ: 団体・ユーザー・機体・科目・発航方法・フライト
-- 適用方法: Supabaseダッシュボードの SQL Editor で
--           0001_core.sql → 0002_notices.sql の順に実行する。
-- 再実行しても安全（既存はスキップ／ポリシーは作り直し）。

/* ---------- 団体 ---------- */
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  default_departure_airports text[] not null default '{}',
  default_arrival_airports text[] not null default '{}',
  created_at timestamptz not null default now()
);

/* ---------- ユーザープロフィール (auth.users と1:1) ---------- */
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'instructor', 'operator', 'member')),
  organization_id uuid references public.organizations (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- サインアップ時にプロフィールを自動作成（招待コードで団体に紐付け）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, email, role, organization_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    'member',
    (select o.id from public.organizations o
      where o.invite_code = upper(coalesce(new.raw_user_meta_data ->> 'invite_code', ''))
      limit 1)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/* ---------- 機体 ---------- */
create table if not exists public.aircraft (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id),
  registration_number text not null,
  aircraft_type text not null,
  aircraft_category text not null default 'glider',
  aircraft_status text not null default 'active'
    check (aircraft_status in ('active', 'maintenance', 'grounded', 'retired')),
  is_visible boolean not null default true,
  display_order int,
  aircraft_memo text,
  aircraft_initial_airframe_time int not null default 0,
  aircraft_initial_flight_count int not null default 0,
  aircraft_initial_takeoff_count int not null default 0,
  aircraft_initial_landing_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/* ---------- 飛行科目・発航方法 ---------- */
create table if not exists public.flight_subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order int not null default 0,
  is_active boolean not null default true
);

create table if not exists public.launch_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order int not null default 0,
  is_active boolean not null default true
);

/* ---------- フライト ---------- */
create table if not exists public.flights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id),
  aircraft_id uuid not null references public.aircraft (id),
  pilot_id uuid not null references public.users (id),
  instructor_id uuid references public.users (id),
  copilot_name text,
  subject_id uuid references public.flight_subjects (id),
  launch_method_id uuid references public.launch_methods (id),
  flight_date date not null default (now() at time zone 'Asia/Tokyo')::date,
  departure_time timestamptz,          -- 未入力運用を許容するため null 可
  arrival_time timestamptz,
  flight_time int,                     -- 分
  departure_place text not null default '',
  arrival_place text not null default '',
  route text,
  landing_count int not null default 0,
  takeoff_count int not null default 1,
  pic_type text not null default 'Dual' check (pic_type in ('PIC', 'Dual', 'Solo')),
  flight_status text not null default 'launched'
    check (flight_status in ('draft', 'launched', 'landed', 'pending_approval', 'approved')),
  release_altitude int,
  max_altitude int,
  cross_country_time int,
  pic_time int,
  solo_time int,
  dual_instruction_time int,
  instruction_time int,
  other_flight_time int,
  supplementary_note text,
  flights_memo text,
  is_edited boolean not null default false,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flights_date_idx on public.flights (flight_date desc);
create index if not exists flights_pilot_idx on public.flights (pilot_id);
create index if not exists flights_aircraft_idx on public.flights (aircraft_id);
create index if not exists flights_status_idx on public.flights (flight_status);

/* ---------- 個人ログの記録簿設定（初期値・開始頁・締め日履歴） ---------- */
create table if not exists public.logbook_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  initials jsonb not null default '{}',
  start_page int not null default 1,
  start_row int not null default 1,
  cutoffs date[] not null default '{}',
  updated_at timestamptz not null default now()
);

/* ---------- RLS ---------- */
alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.aircraft enable row level security;
alter table public.flight_subjects enable row level security;
alter table public.launch_methods enable row level security;
alter table public.flights enable row level security;
alter table public.logbook_settings enable row level security;

-- 自分の権限を調べるヘルパー
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.users where id = auth.uid() $$;

-- 読み取り: ログインユーザー全員
drop policy if exists "org_select" on public.organizations;
create policy "org_select"
  on public.organizations for select to authenticated using (true);
drop policy if exists "users_select" on public.users;
create policy "users_select"
  on public.users for select to authenticated using (true);
drop policy if exists "aircraft_select" on public.aircraft;
create policy "aircraft_select"
  on public.aircraft for select to authenticated using (true);
drop policy if exists "subjects_select" on public.flight_subjects;
create policy "subjects_select"
  on public.flight_subjects for select to authenticated using (true);
drop policy if exists "launch_select" on public.launch_methods;
create policy "launch_select"
  on public.launch_methods for select to authenticated using (true);
drop policy if exists "flights_select" on public.flights;
create policy "flights_select"
  on public.flights for select to authenticated using (true);

-- ユーザー: 自分のプロフィールは更新可、権限変更は管理者のみ
drop policy if exists "users_update_self" on public.users;
create policy "users_update_self"
  on public.users for update to authenticated
  using (id = auth.uid() or public.my_role() = 'admin');

-- 機体・科目・発航方法の管理: 管理者/ピスト
drop policy if exists "aircraft_write" on public.aircraft;
create policy "aircraft_write"
  on public.aircraft for all to authenticated
  using (public.my_role() in ('admin', 'operator'))
  with check (public.my_role() in ('admin', 'operator'));
drop policy if exists "subjects_write" on public.flight_subjects;
create policy "subjects_write"
  on public.flight_subjects for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
drop policy if exists "launch_write" on public.launch_methods;
create policy "launch_write"
  on public.launch_methods for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- フライト: 作成・更新はログインユーザー全員（承認操作の権限チェックはアプリ側で実施）
drop policy if exists "flights_insert" on public.flights;
create policy "flights_insert"
  on public.flights for insert to authenticated with check (true);
drop policy if exists "flights_update" on public.flights;
create policy "flights_update"
  on public.flights for update to authenticated using (true);

-- 記録簿設定: 本人のみ
drop policy if exists "logbook_settings_own" on public.logbook_settings;
create policy "logbook_settings_own"
  on public.logbook_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

/* ---------- 初期データ ---------- */
insert into public.organizations (name, invite_code, default_departure_airports, default_arrival_airports)
values ('大学航空部', 'GLIDER01',
        array['大利根飛行場', '妻沼滑空場', '板倉滑空場'],
        array['大利根飛行場', '妻沼滑空場', '板倉滑空場'])
on conflict (invite_code) do nothing;

insert into public.flight_subjects (name, display_order) values
  ('基本操縦', 1), ('索道飛行', 2), ('野外飛行', 3), ('場周経路', 4), ('単独飛行', 5), ('技量審査', 6)
on conflict (name) do nothing;

insert into public.launch_methods (name, display_order) values
  ('ウィンチ曳航', 1), ('航空機曳航', 2), ('自力発航', 3)
on conflict (name) do nothing;
