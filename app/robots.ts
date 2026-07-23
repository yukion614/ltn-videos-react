import type { MetadataRoute } from "next";

// 產生網域根目錄的 /robots.txt（App Router 的檔案慣例，不需建資料夾、不需路由）。
// Next 會在 build 時把這支的回傳值輸出成純文字 robots.txt。

export const dynamic = "force-static";

// 非正式環境（預覽／測試機）整站禁止索引。以 NEXT_PUBLIC_SITE_ENV 判斷，
// 未設定時視為正式站，避免正式部署忘了設變數就整站消失在搜尋結果。
const isProduction =
  (process.env.NEXT_PUBLIC_SITE_ENV ?? "production") === "production";

export default function robots(): MetadataRoute.Robots {
  if (!isProduction) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: [
      {
        // 社群預覽與 Google 自家的次要爬蟲：明確開放。
        // 分享到 FB 時要靠 facebookexternalhit 抓得到 OG 圖與標題。
        userAgent: [
          "Meta-ExternalAgent",
          "Meta-ExternalFetcher",
          "FacebookBot",
          "facebookexternalhit",
          "Google-Extended",
          "GoogleOther",
          "GoogleOther-Image",
          "GoogleOther-Video",
        ],
        allow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
      },
      {
        // AI 訓練資料爬蟲：整站禁止，與 news.ltn.com.tw 的既有政策一致。
        // 注意這組只能有 disallow，若同時給 allow: "/"，依 RFC 9309 同長度時
        // Allow 優先，等於整組失效。
        userAgent: [
          "GPTBot",
          "CCBot",
          "anthropic-ai",
          "ClaudeBot",
          "Applebot-Extended",
          "Bytespider",
          "AI2Bot",
          "Ai2Bot-Dolma",
          "cohere-ai",
          "cohere-training-data-crawler",
          "Diffbot",
          "img2dataset",
          "omgili",
          "omgilibot",
        ],
        disallow: "/",
      },
    ],
  };
}
