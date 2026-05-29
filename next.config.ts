import type { NextConfig } from "next";

// GitHub Pages 用の静的エクスポート設定。
// リポジトリ名 flight_log のサブパスで配信されるため basePath を指定する。
const isProd = process.env.NODE_ENV === "production";
const repo = "/flight_log";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: isProd ? repo : "",
  assetPrefix: isProd ? repo : "",
  trailingSlash: true,
};

export default nextConfig;
