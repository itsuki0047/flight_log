-- 団体設定（団体名・よく使う離着陸場・招待コード）の更新を管理者に許可する。
-- 適用方法: 0001, 0002 の後に SQL Editor で実行。再実行しても安全。

drop policy if exists "org_update_admin" on public.organizations;
create policy "org_update_admin"
  on public.organizations for update
  to authenticated
  using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');
