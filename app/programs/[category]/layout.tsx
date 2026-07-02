import type { ReactNode } from "react";
import { getPrograms } from "../../_lib/programMeta";

// output: export 下，[category] 是動態路由，必須用 generateStaticParams
// 列出要預先產生的分類頁。但 page.tsx 是 "use client" 無法匯出此函式，
// 因此放在同層的 server layout 來提供 category 參數。
//
// 分類清單改吃後端 /playlist-list/program（getPrograms），所以現有節目都會被預生成。
// 另外多產生一個 "_shell" 外殼頁：build 之後後端才新增的節目沒有對應檔案，
// 伺服器 fallback 會把 /programs/{新key} 導到 /programs/_shell（見 serve-static.mjs、
// nginx.conf），分類頁會從網址讀 key 即時抓後端渲染，不必重 build。
export async function generateStaticParams() {
  const programs = await getPrograms();
  return [...programs.map((p) => ({ category: p.key })), { category: "_shell" }];
}

export default function CategoryLayout({ children }: { children: ReactNode }) {
  return children;
}
