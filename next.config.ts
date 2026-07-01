import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// 為什麼用 phase 分流：
// output:"export"（純靜態匯出）會整個停用 rewrites()，連 `next dev` 也一樣，
// 導致同源代理 /hls/* 沒有東西在服務、HLS 影片播不出來。
// 因此：
//   - 開發（next dev）：不啟用 export，改掛 /hls 代理，影片才能播。
//   - 正式（next build）：啟用 export 產生靜態站；靜態站的 /hls 代理
//     交給 scripts/serve-static.mjs 或前段 CDN（CloudFront 等）轉發到
//     https://video.ltn.com.tw/media/* 並補上 CORS 標頭。
export default function config(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  if (isDev) {
    return {
      images: {
        unoptimized: true, // 已全面改用原生 <img>
      },
      async rewrites() {
        return [
          {
            source: "/hls/:path*",
            destination: "https://video.ltn.com.tw/media/:path*",
          },
        ];
      },
    };
  }

  return {
    output: "export", // 純靜態匯出（測試機無 Node 伺服器）
    trailingSlash: true, // 內頁產生資料夾結構，方便靜態部署
    images: {
      unoptimized: true, // 靜態匯出沒有影像最佳化伺服器；已全面改用原生 <img>
    },
  };
}
