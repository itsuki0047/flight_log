-- お知らせ（メンテナンス情報等）の配信用テーブル
-- 適用方法: 0001_core.sql を実行した後に SQL Editor で実行する。
-- （users テーブルと my_role() を参照するため 0001 が先）
-- 再実行しても安全。

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  -- info: お知らせ / maintenance: メンテナンス / warning: 注意
  kind text not null default 'info' check (kind in ('info', 'maintenance', 'warning')),
  published_at timestamptz not null default now(),
  -- 掲載期限（過ぎたら表示しない）。null なら無期限
  expires_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists notices_published_at_idx on public.notices (published_at desc);

-- RLS: 読み取りはログインユーザー全員、書き込みは管理者のみ
alter table public.notices enable row level security;

drop policy if exists "notices_select_authenticated" on public.notices;
create policy "notices_select_authenticated"
  on public.notices for select
  to authenticated
  using (true);

-- users テーブル（public.users: id = auth.users.id, role カラム）の管理者のみ投稿・削除可
drop policy if exists "notices_insert_admin" on public.notices;
create policy "notices_insert_admin"
  on public.notices for insert
  to authenticated
  with check (public.my_role() = 'admin');

drop policy if exists "notices_update_admin" on public.notices;
create policy "notices_update_admin"
  on public.notices for update
  to authenticated
  using (public.my_role() = 'admin');

drop policy if exists "notices_delete_admin" on public.notices;
create policy "notices_delete_admin"
  on public.notices for delete
  to authenticated
  using (public.my_role() = 'admin');

-- Realtime配信（開いている画面への即時反映）を有効化（既に追加済みならスキップ）
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notices'
  ) then
    alter publication supabase_realtime add table public.notices;
  end if;
end $$;
