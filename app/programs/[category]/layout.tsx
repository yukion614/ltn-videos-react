import type { ReactNode } from "react";

// output: export 下，[category] 是動態路由，必須用 generateStaticParams
// 列出要預先產生的分類頁。但 page.tsx 是 "use client" 無法匯出此函式，
// 因此放在同層的 server layout 來提供 category 參數。
//
// 分類頁不再逐一預生成，只產生一個 "_shell" 外殼頁：所有 /programs/{key}
// 都靠伺服器 fallback 導到 /programs/_shell（見 serve-static.mjs、nginx.conf），
// 分類頁會從網址讀 key 即時抓後端渲染，不必在 build 時依賴後端節目清單，
// 新增節目也不必重 build。
export async function generateStaticParams() {
  return [{ category: "_shell" }];
}

export default function CategoryLayout({ children }: { children: ReactNode }) {
  return children;
}
