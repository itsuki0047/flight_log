-- フライトの削除（誤入力の取り消し）を管理者・教官に許可する。
-- 適用方法: 0001〜0003 の後に SQL Editor で実行。再実行しても安全。

drop policy if exists "flights_delete_staff" on public.flights;
create policy "flights_delete_staff"
  on public.flights for delete
  to authenticated
  using (public.my_role() in ('admin', 'instructor'));
