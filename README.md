This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## PDF出力

個人ログ・航空日誌は **PDF出力**（`@react-pdf/renderer` によるクライアントサイド生成）。
静的エクスポート(GitHub Pages)でもそのまま動く。

- 個人ログ: 紙の航空日誌（グライダー飛行記録簿）様式を再現（12フライト/ページ、
  頁小計・前頁までの合計・総合計を自動繰越、証明欄付き）— `lib/pdf/logbook.tsx`
- 航空日誌: 機体別の一覧形式
- 出力導線: 各画面の「PDF出力」ボタン、または PDF出力画面（設定＋プレビュー）
- 日本語フォント: `public/fonts/ZenKakuGothicNew-*.ttf` を埋め込み

旧 .numbers / .xlsx 出力の実装は `archive/numbers-export/` に退避（現在は未使用）。

## DB接続（Supabase）

データアクセスは `lib/db.ts`・認証は `lib/session.ts` に集約してあり、
**Supabase未接続の間は localStorage 永続のモックで全機能が動く**（テスト運用可）。

接続手順:
1. supabase.com でプロジェクト作成
2. SQL Editor で `supabase/migrations/0001_core.sql` → `0002_notices.sql` の順に実行
   （団体・科目・発航方法の初期データ投入まで行われる。招待コード初期値: `GLIDER01`）
3. `.env.local.example` を `.env.local` にコピーし、Project Settings > API の URL と anon key を設定
4. 新規登録画面からアカウント作成（招待コードで団体に紐付け）。
   最初のユーザーは SQL で `update users set role = 'admin' where email = '...';` として管理者化する

これだけで認証・機体・フライト・お知らせが実テーブルに切り替わる（コード変更不要）。
個人ログ・航空日誌は flights からの派生ビュー（`derivePersonalLogEntries` / `deriveAircraftLogEntries`）として生成する。

## お知らせ（メンテナンス情報）の配信

配信は `lib/notices.ts` のデータ層経由。設定 > お知らせ管理（管理者）から投稿・削除する。

- **Supabase未接続の間**: localStorage 保存のモック運用（この端末のみ）
- **Supabase接続後**: `supabase/migrations/0002_notices.sql` を SQL Editor で適用し、
  `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定すると
  自動で notices テーブルに切り替わる（コード変更不要）。
  読み取りは全ログインユーザー、書き込みは管理者のみ（RLS）。Realtimeで開いている画面にも即時反映。

注意: このプロジェクトは Desktop 配下にあり iCloud 同期対象。`node_modules` がクラウドに
退避される（dataless 化する）と `next dev`/`next build` が無出力のままハングする。
その場合は `rm -rf node_modules && npm ci` で復旧する。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
