-- 権限の再編: 「運航管理者(manager)」ロールを追加する。
--   admin   = 開発者（お知らせ管理・権限設定・団体名/招待コード）
--   manager = 運航管理者（よく使う離発着地・飛行科目の管理）
-- 適用方法: 0001〜0004 の後に SQL Editor で実行。再実行しても安全。

-- users.role の許可値に manager を追加
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('admin', 'manager', 'instructor', 'operator', 'member'));

-- 団体設定（よく使う離発着地など）の更新を運航管理者にも許可
drop policy if exists "org_update_admin" on public.organizations;
create policy "org_update_admin"
  on public.organizations for update
  to authenticated
  using (public.my_role() in ('admin', 'manager'))
  with check (public.my_role() in ('admin', 'manager'));

-- 飛行科目の管理（追加・名称変更・有効/無効）を運航管理者にも許可
drop policy if exists "subjects_write" on public.flight_subjects;
create policy "subjects_write"
  on public.flight_subjects for all
  to authenticated
  using (public.my_role() in ('admin', 'manager'))
  with check (public.my_role() in ('admin', 'manager'));
